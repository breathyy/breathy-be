# Prompt: Integrate Application Insights

Rujukan: [../../overview_integration.md](../../overview_integration.md), [../../design/architecture_overview.md](../../design/architecture_overview.md)

Tujuan: Tambahkan telemetry dengan Application Insights untuk API dan services.

Keluaran yang diharapkan:
- services/appInsightsService.js: setup defaultClient dan helper trace/metric.
- wiring minimal di app.js untuk request tracking.

Batasan:
- Tanpa komentar, camelCase, modul ringkas. Inisialisasi dari APPINSIGHTS_CONNECTION_STRING; sampling aktif.
