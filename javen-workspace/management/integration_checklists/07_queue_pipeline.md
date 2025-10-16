# 07 - Orkestrasi Workflow Tanpa Message Bus

Rujukan: [overview_integration.md](../../overview_integration.md)

## Tugas

- [x] Definisikan kontrak idempoten untuk `chatService`, `nluService`, `visionService`, dan `triageService` agar pemanggilan ulang tidak menggandakan data (PRISM: gunakan `cases.triage_metadata.dataCompleteness`, merge markers/gejala dengan timestamp terbaru).
- [x] Tambahkan penanda proses di DB (kolom `cases.triage_metadata`) untuk melacak komponen yang sudah selesai.
- [ ] Implementasikan mekanisme retry dan backoff sederhana (mis. tabel `pending_jobs` atau BullMQ + Redis lokal) untuk pekerjaan tertunda tanpa mengandalkan message bus eksternal.
- [ ] Pastikan notifikasi dokter/pasien dipicu langsung dari backend setelah triage final, dan catat pada `chat_messages` atau log audit.
- [ ] Dokumentasikan pola locking/transaction yang digunakan sehingga tim dev mengetahui cara menghindari race condition.

## Verifikasi

- [ ] Pesan inbound (teks/foto) menghasilkan entri `symptoms`/`images` dan pembaruan kasus tanpa duplikasi.
- [ ] Retry manual (memanggil ulang endpoint) tidak menggandakan data atau menyebabkan race condition.
- [ ] Mekanisme pending job terpantau dan dapat dikosongkan.

## Catatan

- Arsitektur resmi tidak lagi memakai message bus eksternal; semua orkestrasi dilakukan di proses backend. Checklist ini memastikan guardrail idempoten dan retry tetap terdokumentasi.
- `cases.triage_metadata` sekarang menyimpan `lastSymptomExtraction`, `lastVisionAnalysis`, dan `dataCompleteness` untuk membantu deduplikasi; pending: dokumentasikan strategi retry + pekerja latar ringan.
