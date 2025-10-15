# 09 - Observabilitas & Logging

Rujukan: [overview_integration.md](../../overview_integration.md)

## Tugas

- [ ] Integrasi Application Insights (SDK Node.js) dan konfigurasi connection string.
- [ ] Struktur log: request/response ringkas, error dengan correlation ID.
- [ ] Dashboard latensi dan error rate; alert dasar.

## Verifikasi

- [ ] Telemetri masuk; dashboard menampilkan metrik.

## Catatan

- Application Insights SDK telah di-wire lewat `services/appInsightsService.js`; menunggu `APPINSIGHTS_CONNECTION_STRING` untuk verifikasi telemetri.
