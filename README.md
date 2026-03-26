# Iraq Compass Data Verification Dashboard

Internal tool to clean, verify, and approve 70,000+ Iraqi business records.

## Setup Instructions for Replit

1. **Create a new Replit** using the "React" template.
2. **Upload all files** from this repository to your Replit.
3. **Configure Environment Variables**:
   - Go to the **Secrets** tab in Replit.
   - Add `VITE_SUPABASE_URL` with your Supabase project URL.
   - Add `VITE_SUPABASE_ANON_KEY` with your Supabase anon key.
4. **Install Dependencies**:
   - Replit should automatically detect `package.json` and install dependencies.
   - If not, run `npm install` in the Shell.
5. **Run the App**:
   - Click the **Run** button at the top.
   - The dashboard will be available in the Webview.

## Supabase Schema

Before running the app, ensure you have executed the SQL schema provided in the `Step 1` response in your Supabase SQL Editor.

## Features

- **Overview**: Real-time metrics of raw vs verified data.
- **Review Table**: Batch approve or reject businesses based on verification scores.
- **Data Cleaner**: Repair encoding issues (mojibake) in Arabic/Kurdish text.
- **Task Manager**: Launch automated agent tasks for data enrichment.
- **Export**: Generate clean JSON files ready for the public directory.

## Language Support

- Full RTL support for Arabic and Kurdish.
- Trilingual data fields (AR, KU, EN).
- Dir="rtl" implemented on relevant UI components.
