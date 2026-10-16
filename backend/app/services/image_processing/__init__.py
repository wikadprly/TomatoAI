"""Tahap pemrosesan citra.

Setiap file mewakili satu tahap berurutan pada pipeline:

1. `preprocessing.py`  - baca file, ubah ke RGB, resize, perbaiki kualitas
2. `color_space.py`    - konversi RGB ke HSV (mengembalikan np.ndarray)
3. `thresholding.py`   - thresholding kanal HSV untuk memisahkan tomat
4. `masking.py`        - bersihkan hasil thresholding menjadi mask biner
5. `morphology.py`     - opening/closing untuk menghilangkan noise
6. `segmentation.py`   - segmentasi objek tomat dari latar belakang
7. `color_analysis.py` - analisis warna hasil segmentasi (isi `ColorAnalysis`)

Semua fungsi sudah terisi. Fungsi mask/HSV/morfologi mengembalikan
``np.ndarray`` (bukan PIL Image) karena PIL tidak memiliki mode HSV.
"""