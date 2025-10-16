# Checklist Modul: NLU (OpenAI Chat Completions)

Rujukan: [design/algorithms/followup_engine.md](../../design/algorithms/followup_engine.md), [overview_integration.md](../../overview_integration.md)

## Tugas

- [x] Instal SDK `openai`; set `.env` OPENAI_KEY dan OPENAI_MODEL (default `gpt-4o-mini`).
- [x] Implement `nluService`: panggil OpenAI Chat Completions, normalisasi hasil ke skema `symptoms`, hitung S_s.
- [x] Tambahkan fallback heuristik + logging telemetri untuk kegagalan API.
- [x] Simpan hasil ke DB: symptoms table terhubung ke case_id.
- [x] Terapkan aturan coding: tanpa komentar, camelCase, modul ringkas.

## Verifikasi

- [x] Input teks contoh mengembalikan entitas yang benar (uji manual via `nluService.extractSymptoms` pada prompt batuk/dyspnea; heuristik fallback bekerja saat key OpenAI kosong).
- [x] Nilai S_s konsisten dengan bobot desain (S_s = 0.30 fever + 0.20 cough>3 hari + 0.35 dyspnea + 0.15 komorbid; divalidasi pada kasus "demam 39, batuk 4 hari, sesak, ada asma" → 1.0).
- [ ] Unit test untuk parsing dan normalisasi.

## Catatan

- Parser baru menyimpan confidence, rationale, missingFields, dan rekomendasi permintaan foto ke `symptoms.raw_text.analysis` serta memperbarui `cases.triage_metadata.lastSymptomExtraction` dan `dataCompleteness`.
- Tambahkan test suite spesifik untuk modul ini (pending) agar checklist verifikasi lengkap.

## Target

- Target selesai: ...
