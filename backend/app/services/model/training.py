"""Training dan fine-tuning MobileNetV2.

Implementasi two-stage training:
1. Stage 1: Freeze backbone, train classifier head only
2. Stage 2: Unfreeze top layers of backbone, fine-tune with low LR

Menggunakan class weighting untuk handle imbalance (distribusi ~1:3:1).
Menyimpan model best ke settings.MODEL_PATH (.keras format).
"""

from pathlib import Path
from typing import Any, Dict, Tuple

from app.core.config import settings
from app.services.model.dataset import build_datasets, class_counts


def _hitung_class_weight(train_dataset) -> Dict[int, float]:
    """Hitung class weight berdasarkan distribusi training set.

    Menggunakan sklearn.utils.class_weight.compute_class_weight
    dengan strategy='balanced' (invers proporsi frekuensi).
    """
    from sklearn.utils.class_weight import compute_class_weight
    import numpy as np

    classes = train_dataset.classes
    class_indices = np.unique(classes)
    weights = compute_class_weight(
        class_weight="balanced",
        classes=class_indices,
        y=classes,
    )
    return dict(zip(class_indices, weights))


def _build_model(num_classes: int = 3, image_size: int = 224) -> Any:
    """Bangun model MobileNetV2 + custom head.

    Args:
        num_classes: Jumlah kelas output (default 3: mentah, setengah_matang, matang)
        image_size: Ukuran input (default 224 per settings)

    Returns:
        Model Keras yang sudah dikompilasi.
    """
    from tensorflow.keras import Model, layers
    from tensorflow.keras.applications import MobileNetV2
    from tensorflow.keras.optimizers import Adam

    # Base model: MobileNetV2 pretrained ImageNet, tanpa top classifier
    base = MobileNetV2(
        weights="imagenet",
        include_top=False,
        input_shape=(image_size, image_size, 3),
    )

    # Freeze backbone untuk stage 1
    base.trainable = False

    # Custom head
    x = base.output
    x = layers.GlobalAveragePooling2D(name="gap")(x)
    x = layers.Dropout(0.2, name="dropout")(x)
    outputs = layers.Dense(
        num_classes,
        activation="softmax",
        name="predictions",
    )(x)

    model = Model(inputs=base.input, outputs=x, name="mobilenetv2_tomat")

    # Compile dengan Adam dan categorical_crossentropy
    model.compile(
        optimizer=Adam(learning_rate=1e-3),
        loss="categorical_crossentropy",
        metrics=["accuracy"],
    )
    return model


def _unfreeze_top_layers(model: Any, n_layers: int = 30) -> None:
    """Unfreeze top N layers of backbone untuk fine-tuning.

    Args:
        model: Model yang sudah dibangun
        n_layers: Jumlah layer dari belakang yang di-unfreeze
    """
    # Cari base model (layer pertama biasanya base MobileNetV2)
    base = model.layers[0]
    if hasattr(base, "layers"):
        # Unfreeze top n_layers
        for layer in base.layers[-n_layers:]:
            layer.trainable = True
        # Pastikan BatchNorm tetap dalam inference mode (best practice)
        for layer in base.layers:
            if isinstance(layer, type) and "BatchNormalization" in layer.__class__.__name__:
                layer.trainable = False


def train(
    data_dir=None,
    image_size: int = None,
    batch_size: int = 32,
    epochs_stage1: int = 5,
    epochs_stage2: int = 10,
    n_unfreeze: int = 30,
) -> Any:
    """Jalankan training / fine-tuning MobileNetV2 two-stage.

    Args:
        data_dir: Folder dataset. Kalau None, pakai settings.DATASET_DIR.
        image_size: Ukuran input. Kalau None, pakai settings.IMAGE_SIZE.
        batch_size: Batch size per step.
        epochs_stage1: Epoch untuk stage 1 (classifier only).
        epochs_stage2: Epoch untuk stage 2 (fine-tune backbone).
        n_unfreeze: Jumlah layer backbone yang di-unfreeze di stage 2.

    Returns:
        History object gabungan (stage1 + stage2) berisi loss & accuracy.
    """
    from tensorflow.keras.callbacks import (
        EarlyStopping,
        ReduceLROnPlateau,
        ModelCheckpoint,
    )
    import numpy as np

    # Default dari settings
    if image_size is None:
        image_size = settings.IMAGE_SIZE

    # Build datasets
    train_ds, val_ds, test_ds = build_datasets(
        data_dir=data_dir,
        image_size=image_size,
        batch_size=batch_size,
    )

    # Class weighting untuk imbalance handling
    class_weight = _hitung_class_weight(train_ds)
    print(f"Class weights: {class_weight}")

    # Verifikasi urutan kelas konsisten dengan settings.CLASS_NAMES
    train_class_indices = train_ds.class_indices
    expected = {name: i for i, name in enumerate(settings.CLASS_NAMES)}
    if train_class_indices != expected:
        raise ValueError(
            f"Urutan kelas dataset ({train_class_indices}) "
            f"tidak cocok dengan settings.CLASS_NAMES ({expected}). "
            "Pastikan nama folder di datasets/train/ sesuai CLASS_NAMES."
        )

    # Build model
    model = _build_model(num_classes=len(settings.CLASS_NAMES), image_size=image_size)
    model.summary()

    # Callbacks umum
    callbacks = [
        EarlyStopping(
            monitor="val_loss",
            patience=5,
            restore_best_weights=True,
            verbose=1,
        ),
        ReduceLROnPlateau(
            monitor="val_loss",
            factor=0.2,
            patience=3,
            min_lr=1e-7,
            verbose=1,
        ),
        ModelCheckpoint(
            filepath=str(settings.MODEL_PATH),
            monitor="val_accuracy",
            mode="max",
            save_best_only=True,
            save_weights_only=False,
            verbose=1,
        ),
    ]

    # ===== STAGE 1: Train classifier head only =====
    print(f"\n{'='*60}")
    print(f"STAGE 1: Training classifier head ({epochs_stage1} epochs)")
    print(f"{'='*60}")

    history1 = model.fit(
        train_ds,
        validation_data=val_ds,
        epochs=epochs_stage1,
        class_weight=class_weight,
        callbacks=callbacks,
        verbose=1,
    )

    # ===== STAGE 2: Fine-tune backbone =====
    print(f"\n{'='*60}")
    print(f"STAGE 2: Fine-tuning backbone ({epochs_stage2} epochs)")
    print(f"{'='*60}")

    # Unfreeze top layers
    _unfreeze_top_layers(model, n_layers=n_unfreeze)

    # Recompile dengan learning rate lebih kecil
    from tensorflow.keras.optimizers import Adam
    model.compile(
        optimizer=Adam(learning_rate=1e-5),  # LR kecil untuk fine-tuning
        loss="categorical_crossentropy",
        metrics=["accuracy"],
    )

    history2 = model.fit(
        train_ds,
        validation_data=val_ds,
        epochs=epochs_stage1 + epochs_stage2,
        initial_epoch=epochs_stage1,
        class_weight=class_weight,
        callbacks=callbacks,
        verbose=1,
    )

    # Gabungkan history
    combined_history = {}
    for key in history1.history:
        combined_history[key] = history1.history[key] + history2.history[key]

    # Evaluasi final di test set
    print(f"\n{'='*60}")
    print("EVALUASI FINAL DI TEST SET")
    print(f"{'='*60}")
    test_loss, test_acc = model.evaluate(test_ds, verbose=1)
    print(f"Test Loss: {test_loss:.4f}, Test Accuracy: {test_acc:.4f}")

    # Simpan model final (best sudah disave oleh ModelCheckpoint)
    # Tapi pastikan ada file final
    save_model(model)

    # Return combined history object yang mirip Keras History
    class CombinedHistory:
        def __init__(self, history_dict):
            self.history = history_dict
            self.epoch = list(range(len(next(iter(history_dict.values())))))

    return CombinedHistory(combined_history)


def save_model(model: Any, path: Path | str | None = None) -> str:
    """Simpan bobot model ke disk dalam format .keras.

    Args:
        model: Model Keras yang akan disimpan.
        path: Lokasi simpan. Kalau None, pakai settings.MODEL_PATH.

    Returns:
        Path file bobot yang tersimpan.
    """
    if path is None:
        path = settings.MODEL_PATH
    else:
        path = Path(path)

    # Pastikan folder ada
    path.parent.mkdir(parents=True, exist_ok=True)

    # Simpan format .keras (native Keras 3)
    model.save(str(path))
    print(f"Model disimpan ke: {path}")
    return str(path)


def load_trained_model(path: Path | str | None = None) -> Any:
    """Muat model yang sudah dilatih untuk inferensi.

    Args:
        path: Lokasi file model. Kalau None, pakai settings.MODEL_PATH.

    Returns:
        Model Keras siap inferensi.
    """
    from tensorflow.keras.models import load_model

    if path is None:
        path = settings.MODEL_PATH
    else:
        path = Path(path)

    if not Path(path).exists():
        raise FileNotFoundError(f"Model tidak ditemukan di: {path}")

    model = load_model(str(path))
    print(f"Model dimuat dari: {path}")
    return model