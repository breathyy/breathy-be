# 07 - Worker Pipeline dengan Azure Service Bus (opsional)

Rujukan: [overview_integration.md](../../overview_integration.md)

## Tugas

- [ ] Provision namespace + queue: ingest-queue, ai-queue, notification-queue.
- [ ] Implement `messagingService` producer/consumer.
- [ ] `ingestWorker`: konsumsi teks/gambar → panggil NLU/Vision → kirim ke ai-queue.
- [ ] `triageWorker`: hitung skor gabungan dan update cases.status → kirim notifikasi.
- [ ] `notifyWorker`: kirim pesan ke user/dokter via ACS/email.
- [ ] Jika tanpa bus (default MVP): dokumentasikan adaptasi synchronous/event loop sesuai `overview_integration.md` bagian "Catatan Alternatif: Tanpa Azure Service Bus" dan pastikan dependency ASB tidak dipasang.

## Verifikasi

- [ ] Aliran end-to-end dari inbound ke notifikasi berjalan.

## Catatan

- ...
