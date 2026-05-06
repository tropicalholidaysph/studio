# Tropical Holidays - Secure Ledger V2.0

Digital Payment Voucher System for Tropical Holidays.

## Deployment Guide (Free Hosting)

### Option A: Firebase App Hosting (Recommended)
1. **Download Code:** Download the project files from Firebase Studio.
2. **Push to GitHub:**
   - Create a private repo on [GitHub](https://github.com).
   - Use [GitHub Desktop](https://desktop.github.com/) to upload your files.
3. **Connect to Firebase:**
   - Go to [Firebase Console](https://console.firebase.google.com/).
   - Select **App Hosting** from the sidebar.
   - Connect your GitHub repo.
4. **Environment Variables:**
   - Add any keys (like `GEMINI_API_KEY`) in the App Hosting settings.

### Option B: Vercel (Fastest for Next.js)
1. Push your code to GitHub.
2. Go to [Vercel.com](https://vercel.com) and sign in with GitHub.
3. Import your repository.
4. Add environment variables from your `src/firebase/config.ts` during setup.

## Features
- **Sequential Voucher Numbering:** Automatically calculates the next number based on the selected ledger sheet.
- **Excel Synchronization:** Import and Export full workbooks with multiple sheets.
- **Visual Vouchers:** Professional, printable vouchers with automated "Amount to Words" conversion.
- **Security:** Anonymous session protection and secure ledger isolation.
