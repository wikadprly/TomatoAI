"""Tahap pemrosesan citra - SATUAN KERJA TIM 1.

Setiap file mewakili satu tahap berurutan pada pipeline:

1. `preprocessing.py`  - baca file, ubah ke RGB, resize, perbaiki kualitas
2. `color_space.py`    - konversi RGB ke HSV
3. `thresholding.py`   - thresholding kanal HSV untuk memisahkan tomat
4. `masking.py`        - bersihkan hasil thresholding menjadi mask biner
5. `morphology.py`     - opening/closing untuk menghilangkan noise
6. `segmentation.py`   - segmentasi objek tomat dari latar belakang
7. `color_analysis.py` - analisis warna hasil segmentasi (isi `ColorAnalysis`)

Semua fungsi masih kosong dan sengaja `raise NotImplementedError`.
Jangan menghapus fungsi ini, tapi isi badan parameternya.
"""