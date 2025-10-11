# Checklist Modul: NLU (Copilot Studio/LUIS)

Rujukan: [design/algorithms/followup_engine.md](../../design/algorithms/followup_engine.md), [overview_integration.md](../../overview_integration.md)

## Tugas

- [ ] Instal `@azure/ai-text-analytics`; set `.env` AI_TEXT_ENDPOINT, AI_TEXT_KEY.
- [ ] Implement nluService: panggil SDK, normalisasi entitas ke skema symptoms, hitung S_s.
- [ ] Tangani error dan retry; logging latency dan error codes.
- [ ] Simpan hasil ke DB: symptoms table terhubung ke case_id.
- [ ] Terapkan aturan coding: tanpa komentar, camelCase, modul ringkas.

## Verifikasi

- [ ] Input teks contoh mengembalikan entitas yang benar.
- [ ] Nilai S_s konsisten dengan bobot desain.
- [ ] Unit test untuk parsing dan normalisasi.

## Catatan

- ...

## Target

- Target selesai: ...
