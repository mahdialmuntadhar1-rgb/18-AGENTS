#!/usr/bin/env node
/**
 * Update Scraper Categories to match HUMUS 15 categories
 * Reads all records from iraqi_businesses and updates their category field
 */
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const SCRAPER_URL = process.env.SCRAPER_SUPABASE_URL || 'https://mxxaxhrtccomkazpvthn.supabase.co';
const SCRAPER_KEY = process.env.SCRAPER_SUPABASE_KEY;

if (!SCRAPER_KEY) {
  console.error('❌ SCRAPER_SUPABASE_KEY required in .env');
  process.exit(1);
}

const scraperDB = createClient(SCRAPER_URL, SCRAPER_KEY);

// HUMUS 15 Categories mapping
const CATEGORY_MAP = {
  // 1. Dining & Cuisine
  'restaurant': 'food_drink',
  'restaurants': 'food_drink',
  'dining': 'food_drink',
  'food': 'food_drink',
  'cuisine': 'food_drink',
  
  // 2. Coffee & Cafes (separate from restaurants)
  'cafe': 'cafe',
  'cafes': 'cafe',
  'coffee': 'cafe',
  'coffee shop': 'cafe',
  'tea house': 'cafe',
  
  // 3. Shopping & Retail
  'shop': 'shopping',
  'retail': 'shopping',
  'store': 'shopping',
  'market': 'shopping',
  'mall': 'shopping',
  'shopping': 'shopping',
  'clothing': 'shopping',
  'electronics': 'shopping',
  'furniture': 'shopping',
  'pharmacy': 'shopping',
  'pharmacies': 'shopping',
  
  // 4. Entertainment & Events
  'entertainment': 'events_entertainment',
  'event': 'events_entertainment',
  'cinema': 'events_entertainment',
  'theater': 'events_entertainment',
  'sports': 'events_entertainment',
  'gaming': 'events_entertainment',
  'nightlife': 'events_entertainment',
  
  // 5. Accommodation & Stays
  'hotel': 'hotels_stays',
  'hotels': 'hotels_stays',
  'motel': 'hotels_stays',
  'stay': 'hotels_stays',
  'accommodation': 'hotels_stays',
  'guest house': 'hotels_stays',
  'hostel': 'hotels_stays',
  
  // 6. Culture & Heritage
  'tourism': 'culture_heritage',
  'attraction': 'culture_heritage',
  'museum': 'culture_heritage',
  'heritage': 'culture_heritage',
  'culture': 'culture_heritage',
  'mosque': 'culture_heritage',
  'church': 'culture_heritage',
  'temple': 'culture_heritage',
  'historical': 'culture_heritage',
  'landmark': 'culture_heritage',
  'religious': 'culture_heritage',
  
  // 7. Business & Services
  'bank': 'business_services',
  'finance': 'business_services',
  'financial': 'business_services',
  'office': 'business_services',
  'service': 'business_services',
  'consulting': 'business_services',
  'business': 'business_services',
  'legal': 'business_services',
  
  // 8. Health & Wellness (general)
  'healthcare': 'health_wellness',
  'health': 'health_wellness',
  'wellness': 'health_wellness',
  'medical': 'health_wellness',
  'gym': 'health_wellness',
  'fitness': 'health_wellness',
  'spa': 'health_wellness',
  
  // 9. Transport & Mobility
  'gas station': 'transport_mobility',
  'fuel': 'transport_mobility',
  'gas': 'transport_mobility',
  'car repair': 'transport_mobility',
  'mechanic': 'transport_mobility',
  'automotive': 'transport_mobility',
  'transport': 'transport_mobility',
  'bus': 'transport_mobility',
  'taxi': 'transport_mobility',
  'vehicle': 'transport_mobility',
  
  // 10. Public & Essential
  'government': 'public_essential',
  'public': 'public_essential',
  'essential': 'public_essential',
  'police': 'public_essential',
  'fire': 'public_essential',
  'post office': 'public_essential',
  'emergency': 'public_essential',
  
  // 11. Education
  'education': 'education',
  'school': 'education',
  'university': 'education',
  'college': 'education',
  'academy': 'education',
  'training': 'education',
  
  // 12. Doctors (specific)
  'doctor': 'doctors',
  'doctors': 'doctors',
  'physician': 'doctors',
  'dr': 'doctors',
  'dr.': 'doctors',
  
  // 13. Lawyers (specific)
  'lawyer': 'lawyers',
  'lawyers': 'lawyers',
  'attorney': 'lawyers',
  'law firm': 'lawyers',
  
  // 14. Clinics (specific)
  'clinic': 'clinics',
  'clinics': 'clinics',
  'medical clinic': 'clinics',
  'dental clinic': 'clinics',
  
  // 15. Hospitals (specific)
  'hospital': 'hospitals',
  'hospitals': 'hospitals',
  'medical center': 'hospitals',
  'infirmary': 'hospitals',
};

function normalizeCategory(raw) {
  if (!raw) return 'other';
  const lower = raw.toLowerCase().trim();
  
  for (const [key, value] of Object.entries(CATEGORY_MAP)) {
    if (lower.includes(key)) return value;
  }
  
  return 'other';
}

async function getAllRecords() {
  const { data, error } = await scraperDB
    .from('iraqi_businesses')
    .select('id, category, name');
  
  if (error) {
    console.error('❌ Error fetching records:', error.message);
    return [];
  }
  return data || [];
}

async function updateCategory(id, newCategory) {
  const { error } = await scraperDB
    .from('iraqi_businesses')
    .update({ category: newCategory })
    .eq('id', id);
  
  if (error) {
    console.error(`   ❌ Failed to update ${id}:`, error.message);
    return false;
  }
  return true;
}

async function runMigration() {
  console.log('🔄 CATEGORY MIGRATION: Scraper → HUMUS 15 Categories\n');
  
  const records = await getAllRecords();
  console.log(`📊 Found ${records.length} records in iraqi_businesses\n`);
  
  const stats = {
    updated: 0,
    skipped: 0,
    failed: 0,
    byCategory: {}
  };
  
  for (const record of records) {
    const oldCategory = record.category || 'other';
    const newCategory = normalizeCategory(oldCategory);
    
    // Count by new category
    stats.byCategory[newCategory] = (stats.byCategory[newCategory] || 0) + 1;
    
    if (oldCategory === newCategory) {
      stats.skipped++;
      continue;
    }
    
    const success = await updateCategory(record.id, newCategory);
    if (success) {
      stats.updated++;
      console.log(`   ✅ ${record.name || 'Unknown'}: "${oldCategory}" → "${newCategory}"`);
    } else {
      stats.failed++;
    }
  }
  
  console.log('\n📈 MIGRATION COMPLETE');
  console.log(`   ✅ Updated: ${stats.updated}`);
  console.log(`   ⏭️  Skipped (already correct): ${stats.skipped}`);
  console.log(`   ❌ Failed: ${stats.failed}`);
  
  console.log('\n📊 Records by HUMUS Category:');
  for (const [cat, count] of Object.entries(stats.byCategory).sort((a, b) => b[1] - a[1])) {
    console.log(`   ${cat}: ${count}`);
  }
}

const args = process.argv.slice(2);

if (args.includes('--help')) {
  console.log(`
Usage: node update-scraper-categories.mjs

Updates all iraqi_businesses records to use HUMUS 15 categories:
1. food_drink (Dining & Cuisine)
2. cafe (Coffee & Cafes)
3. shopping (Shopping & Retail)
4. events_entertainment (Entertainment & Events)
5. hotels_stays (Accommodation & Stays)
6. culture_heritage (Culture & Heritage)
7. business_services (Business & Services)
8. health_wellness (Health & Wellness)
9. transport_mobility (Transport & Mobility)
10. public_essential (Public & Essential)
11. education (Education)
12. doctors (Doctors)
13. lawyers (Lawyers)
14. clinics (Clinics)
15. hospitals (Hospitals)
16. other (Unknown/Uncategorized)
`);
  process.exit(0);
}

runMigration().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
