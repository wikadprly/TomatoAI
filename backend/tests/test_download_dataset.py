"""Test untuk scripts/download_dataset.py (Fase 1 - Tim 2).

Bagian yang diuji adalah pemeriksaan prasyarat (kaggle CLI + kaggle.json)
karena pesan error yang jelas di titik ini yang paling sering menyelamatkan
pengguna. Pemanggilan subprocess ke kaggle CLI sengaja tipis dan tidak di-mock.
"""

from scripts.download_dataset import periksa_prasyarat


def test_prasyarat_melaporkan_cli_dan_token_yang_belum_ada(tmp_path):
    masalah = periksa_prasyarat(
        env={"KAGGLE_CONFIG_DIR": str(tmp_path)},
        which=lambda nama: None,
    )

    assert len(masalah) == 2
    assert any("kaggle" in m and ("CLI" in m or "pip install" in m) for m in masalah)
    assert any("kaggle.json" in m for m in masalah)


def test_prasyarat_lolos_bila_cli_dan_token_tersedia(tmp_path):
    (tmp_path / "kaggle.json").write_text('{"username": "x", "key": "y"}')

    masalah = periksa_prasyarat(
        env={"KAGGLE_CONFIG_DIR": str(tmp_path)},
        which=lambda nama: "/usr/bin/kaggle",
    )

    assert masalah == []
