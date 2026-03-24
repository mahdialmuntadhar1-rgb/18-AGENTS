import { createClient } from '@supabase/supabase-js';

// Fallbacks keep production working when host build env injection is misconfigured.
const SUPABASE_URL =
  (import.meta.env.VITE_SUPABASE_URL as string | undefined) ??
  'https://mxxaxhrtccomkazpvthn.supabase.co';
const SUPABASE_ANON =
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im14eGF4aHJ0Y2NvbWthenB2dGhuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMyMjQ5OTEsImV4cCI6MjA4ODgwMDk5MX0.RGhIU3C4WUCc6YBXktmXRXLT_wdrEbErKcd9VsFuE-8';

if (!SUPABASE_URL || !SUPABASE_ANON) {
  throw new Error(
    'Missing Supabase environment variables. ' +
    'Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your deployment environment.'
  );
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);
