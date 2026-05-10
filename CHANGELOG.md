# Changelog

## [1.0.0] - 2026-05-10
### Initial Release
- Voucher creation and management
- Role-based access (Admin / Employee)
- Excel import and export
- Firebase Firestore integration
- Multi-ledger sheet support

## [1.1.0] - 2026-05-10
### Security & Stability Enhancements
- Migrated access keys to environment variables.
- Implemented atomic voucher numbering via Firestore transactions.
- Added session timeout auto-logout (30 minutes).
- Fixed "Voucher Not Found" bug and missing UID parameters.
- Added delete confirmation dialogs for all destructive actions.

### Features
- Added "Mark as Void" functionality for vouchers.
- Added single sheet Excel export.
- Implemented duplicate detection for Excel imports.
- Added visual "DUP" badges for duplicate voucher numbers.
- Added sticky totals row to the voucher ledger.
- Added last updated timestamp and auto-refresh (10 mins).
