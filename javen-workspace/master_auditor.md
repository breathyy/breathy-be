# Prompt Audit Keselarasan Context

Gunakan prompt ini untuk menugaskan agen AI melakukan audit keselarasan antara dokumen konteks tertinggi dan seluruh dokumen turunan di proyek Breathy.

## Tujuan

Agen AI harus memeriksa apakah panduan dan visi yang ditetapkan dalam berkas pada direktori `javen-workspace/context/` dipatuhi oleh dokumen turunan berikut:

- Berkas overview (mis. `overview_management.md`, `overview_design.md`, dll.).
- Seluruh berkas di dalam folder `design/` dan `management/` beserta subfoldernya.
- Berkas dalam `prompts/` yang menjadi pedoman pembuatan kode atau pengelolaan proyek.

## Instruksi

1) Baca panduan konteks
	- Buka dan pahami isi berkas dalam direktori `/context`.
	- Catat prinsip‑prinsip, batasan, dan struktur hierarki yang dijelaskan (sumber kebenaran utama).

2) Periksa berkas overview
	- Baca berkas overview di tiap tingkat (`overview_management.md`, `overview_design.md`, dll.). Verifikasi bahwa:
	  - Struktur folder yang dijelaskan sesuai dengan hierarki pada konteks.
	  - Prinsip/aturan umum (penggunaan checklist, pemisahan modul, alur integrasi) mengikuti ketentuan di konteks.
	  - Tidak ada kontradiksi atau instruksi yang melanggar panduan konteks.

3) Audit dokumen turunan (design/ dan management/)
	- Pastikan isi file mengikuti garis besar dan aturan di berkas overview dan dokumen konteks.
	- Periksa konsistensi penamaan, struktur subbab, dan penggunaan terminologi.
	- Verifikasi bahwa setiap modul atau checklist yang disebut di overview benar‑benar ada dan terisi sesuai petunjuk.
	- Catat bagian yang hilang, tugas yang belum terdokumentasi, atau penjelasan yang menyimpang dari panduan.

4) Periksa prompt (prompts/)
	- Pastikan setiap prompt mengacu pada dokumen relevan (context, overview, dan modul terkait).
	- Periksa kepatuhan pada pedoman penulisan (instruksi jelas, menyebut file output, dan referensi ke checklist).
	- Pastikan tidak ada instruksi yang bertentangan dengan konteks atau overview.

5) Laporan hasil
	- Ringkasan kepatuhan: file mana yang sudah sesuai dengan konteks, mana yang perlu revisi.
	- Daftar ketidakcocokan dengan rincian lokasi (nama file dan—bila praktis—baris) serta saran perbaikan.
	- Rekomendasi umum untuk menyelaraskan dokumen turunan dengan pedoman konteks.

## Keluaran yang Diharapkan

- Hasil audit berupa laporan di `management/meeting_notes/context_audit.md` yang berisi temuan dan rekomendasi. Laporan ini menjadi acuan perbaikan/penyempurnaan dokumen yang belum sesuai.

## Catatan Pelaksanaan

- Utamakan konsistensi visi dan integritas dokumentasi proyek.
- Gunakan terminologi dan struktur penamaan yang seragam di seluruh berkas.