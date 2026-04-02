#!/usr/bin/env node
/**
 * CSV Import Script for Business Data
 * Maps user CSV fields to Supabase schema and imports with validation
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'fs';
import { parse } from 'csv-parse/sync';
import dotenv from 'dotenv';

dotenv.config();

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Field mapping from user CSV to Supabase schema
const FIELD_MAP = {
  'id': null, // Auto-generated UUID
  'created_at': 'created_at',
  'name': 'business_name',
  'phone': 'phone',
  'category': 'category',
  'city': 'city',
  'address': 'address',
  'status': 'verification_status',
  'social media': 'facebook_url', // or can be mapped to a social_media_json field
};

// Category normalization map
const CATEGORY_MAP = {
  'fuel': 'gas_station',
  'furnitu': 'furniture',
  'clothe': 'clothing',
  'cafe': 'cafes',
  'restaur': 'restaurants',
  'mosque': 'religious',
  'school': 'education',
  'electronics': 'electronics',
  'pharmacy': 'pharmacies',
  'bus_stat': 'transportation',
};

function normalizeCategory(rawCategory) {
  if (!rawCategory) return 'other';
  const lower = rawCategory.toLowerCase().trim();
  
  // Check for partial matches in our map
  for (const [key, value] of Object.entries(CATEGORY_MAP)) {
    if (lower.includes(key)) return value;
  }
  
  return lower;
}

function cleanPhone(phone) {
  if (!phone) return null;
  // Remove non-numeric characters except +
  const cleaned = phone.toString().replace(/[^\d+]/g, '');
  return cleaned || null;
}

function cleanStatus(status) {
  if (!status) return 'pending';
  const lower = status.toLowerCase().trim();
  if (lower.includes('verif')) return 'verified';
  if (lower.includes('pend')) return 'pending';
  if (lower.includes('approv')) return 'approved';
  if (lower.includes('reject')) return 'rejected';
  return 'pending';
}

async function importCSV(filePath) {
  console.log(`📁 Reading CSV file: ${filePath}`);
  
  if (!existsSync(filePath)) {
    console.error(`❌ File not found: ${filePath}`);
    process.exit(1);
  }

  const content = readFileSync(filePath, 'utf-8');
  
  // Parse CSV
  const records = parse(content, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });

  console.log(`📊 Found ${records.length} records to import`);
  
  // Show first record for debugging
  if (records.length > 0) {
    console.log('\n🔍 Sample record (first row):');
    console.log(records[0]);
    console.log();
  }

  let imported = 0;
  let errors = 0;
  let skipped = 0;

  for (const record of records) {
    // Map fields
    const businessData = {
      business_name: record.name || record.business_name || 'Unknown',
      category: normalizeCategory(record.category),
      city: record.city || 'Unknown',
      address: record.address || null,
      phone: cleanPhone(record.phone),
      verification_status: cleanStatus(record.status),
      // Metadata
      source_name: 'csv_import',
      created_by_agent: 'manual_import',
      country: 'Iraq',
      scraped_at: record.created_at || new Date().toISOString(),
    };

    // Skip if no meaningful data
    if (!businessData.business_name || businessData.business_name === 'Unknown') {
      console.log(`⚠️  Skipping row ${imported + errors + skipped + 1}: No business name`);
      skipped++;
      continue;
    }

    // Insert into Supabase
    const { data, error } = await supabase
      .from('businesses')
      .upsert(businessData, { 
        onConflict: 'business_name,address,city',
        ignoreDuplicates: false 
      });

    if (error) {
      console.error(`❌ Error importing "${businessData.business_name}":`, error.message);
      errors++;
    } else {
      imported++;
      if (imported % 10 === 0) {
        console.log(`✅ Imported ${imported}/${records.length}...`);
      }
    }
  }

  console.log('\n📈 Import Summary:');
  console.log(`   ✅ Imported: ${imported}`);
  console.log(`   ❌ Errors: ${errors}`);
  console.log(`   ⚠️  Skipped: ${skipped}`);
  console.log(`   📊 Total: ${records.length}`);

  // Verify import by counting
  const { count, error: countError } = await supabase
    .from('businesses')
    .select('*', { count: 'exact', head: true });

  if (!countError) {
    console.log(`\n📁 Total businesses in database: ${count}`);
  }
}

// Main execution
const filePath = process.argv[2] || 'businesses.csv';

if (!filePath) {
  console.log('Usage: node import-csv.mjs <path-to-csv-file>');
  console.log('Example: node import-csv.mjs ./my-businesses.csv');
  process.exit(1);
}

console.log('🚀 Business CSV Import Tool\n');
importCSV(filePath).catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
