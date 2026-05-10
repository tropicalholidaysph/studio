# Tropical Holidays - Secure Ledger

Professional internal voucher management and financial ledger system for Tropical Holidays. This application streamlines the payment voucher workflow with real-time synchronization and secure multi-role access.

## System Overview

The Tropical Holidays Secure Ledger is designed for high-efficiency financial tracking. It allows staff to manage payment vouchers across different ledger sheets with automated processing and robust security.

### Core Features
- **Voucher Management:** Create, view, edit, and search payment vouchers with automated sequential numbering.
- **Multi-Ledger Sheets:** Organize vouchers into separate tabs powered by Firebase Firestore.
- **Excel Integration:** Support for bulk importing from and exporting to formatted Excel workbooks.
- **Automated Processing:** Real-time conversion of numerical amounts to professional text representations.
- **Modern UI:** Responsive, high-performance interface with dark mode support.

## Access Control

The system uses a two-tiered role-based access control (RBAC) model:

- **Admin:** Full system access, including ledger management (creating/renaming/deleting sheets), data imports, and record deletion.
- **Employee:** Operational access to create, view, edit, and export data. Restricted from administrative and destructive actions.

## Deployment Guide

### Firebase App Hosting (Recommended)

1. **Repository Setup:**
   - Create a private repository on [GitHub](https://github.com).
   - Push the project source code to your repository.
2. **Firebase Configuration:**
   - Navigate to the [Firebase Console](https://console.firebase.google.com/).
   - Select **App Hosting** from the build menu.
   - Connect your GitHub repository and follow the wizard to set up the build pipeline.
3. **Environment Variables:**
   - Ensure all necessary Firebase configuration variables are set in the App Hosting settings.

### Vercel Deployment

1. **Import Project:**
   - Go to [Vercel](https://vercel.com) and import your GitHub repository.
2. **Environment Configuration:**
   - During the setup, add your Firebase environment variables (found in `src/firebase/config.ts`) to the **Environment Variables** section in the Vercel dashboard.
3. **Deploy:**
   - Click deploy. Vercel will automatically detect the Next.js framework and build your application.

---
© 2026 Tropical Holidays. Confidential and Proprietary.
