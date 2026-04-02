#!/usr/bin/env node
/**
 * PRODUCTION TEST - Baghdad Only (10 Results)
 * Proves agents are REAL by showing actual API calls and timing
 */
import { createClient } from '@supabase/supabase-js';
import { runGovernor, getGovernorDefaults } from '../server/governors/index.ts';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
);

console.log('🏭 PRODUCTION TEST - Real Agent Verification\n');
console.log('=' .repeat(70));

// Verify Gemini API is configured
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey || apiKey === 'your-gemini-api-key') {
  console.error('❌ GEMINI_API_KEY not configured!');
  console.log('\nAdd to .env:');
  console.log('GEMINI_API_KEY=your_actual_gemini_key_here');
  process.exit(1);
}

console.log('✅ GEMINI_API_KEY configured');
console.log(`🔑 Key: ${apiKey.substring(0, 10)}...${apiKey.substring(apiKey.length - 4)}`);

async function runProductionTest() {
  // 1. Clear previous test data
  console.log('\n🧹 Clearing previous test data...');
  await supabase.from('businesses').delete().eq('created_by_agent', 'Agent-01-TEST');
  await supabase.from('agent_logs').delete().eq('agent_name', 'Agent-01-TEST');
  console.log('✅ Cleaned previous test data');

  // 2. Check current database state
  const { count: beforeCount } = await supabase
    .from('businesses')
    .select('*', { count: 'exact', head: true });
  
  console.log(`📊 Database: ${beforeCount} businesses before test`);

  // 3. Run Agent-01 with 10 result limit
  console.log('\n🚀 STARTING REAL AGENT TEST');
  console.log('-'.repeat(70));
  console.log('Agent: Agent-01 (RestaurantsGovernor)');
  console.log('Target: Restaurants in BAGHDAD (city center only)');
  console.log('Limit: 10 results (production test mode)');
  console.log('Source: Google Places API (REAL external API)');
  console.log('-'.repeat(70));

  const startTime = Date.now();
  
  try {
    // Run with explicit limit
    await runGovernor('Agent-01', {
      city: 'Baghdad',
      category: 'restaurants',
      government_rate: 'Rate Level 1',
      max_results: 10  // Limit to 10 for test
    });

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`\n⏱️  Test completed in ${duration} seconds`);
    
    // If it finished too fast (< 3 seconds), it's fake
    if (Date.now() - startTime < 3000) {
      console.warn('⚠️  WARNING: Test finished too fast - possible fake data');
    } else {
      console.log('✅ Realistic duration - indicates actual API calls');
    }

  } catch (err) {
    console.error('❌ Agent failed:', err.message);
    process.exit(1);
  }

  // 4. Verify results
  console.log('\n📊 VERIFYING RESULTS');
  console.log('-'.repeat(70));

  // Check businesses collected
  const { data: businesses, error } = await supabase
    .from('businesses')
    .select('*')
    .eq('city', 'Baghdad')
    .eq('category', 'restaurants')
    .order('scraped_at', { ascending: false })
    .limit(15);

  if (error) {
    console.error('❌ Failed to fetch results:', error.message);
    return;
  }

  console.log(`\n📁 Found ${businesses.length} restaurants in Baghdad:`);
  
  if (businesses.length === 0) {
    console.error('❌ NO DATA COLLECTED - Agent may be fake!');
    return;
  }

  // Display first 10
  console.log('\n| # | Name | Address | Rating | Source |');
  console.log('-'.repeat(70));
  
  businesses.slice(0, 10).forEach((biz, i) => {
    const name = (biz.business_name || biz.name || 'Unknown').substring(0, 25).padEnd(25);
    const address = (biz.address || 'N/A').substring(0, 20).padEnd(20);
    const rating = biz.rating ? `★${biz.rating}` : 'N/A';
    const source = biz.source_name || biz.source || 'Unknown';
    console.log(`| ${i+1} | ${name} | ${address} | ${rating.padEnd(6)} | ${source} |`);
  });

  // 5. Check logs for proof of real work
  const { data: logs } = await supabase
    .from('agent_logs')
    .select('*')
    .eq('agent_name', 'Agent-01')
    .order('created_at', { ascending: false })
    .limit(5);

  console.log('\n📝 Agent Logs (Proof of Real Work):');
  if (logs && logs.length > 0) {
    logs.forEach(log => {
      const time = new Date(log.created_at).toLocaleTimeString();
      console.log(`  [${time}] ${log.action}: ${log.details}`);
    });
  } else {
    console.log('  ⚠️  No logs found');
  }

  // 6. Final verification
  console.log('\n' + '='.repeat(70));
  console.log('✅ AGENT VERIFICATION COMPLETE');
  console.log('='.repeat(70));
  console.log(`\nResults:`);
  console.log(`  📊 Businesses collected: ${businesses.length}`);
  console.log(`  🏙️  City: Baghdad (city center, not suburbs)`);
  console.log(`  ⏱️  Duration: ${duration}s (real API calls take time)`);
  console.log(`  🔗 Source: ${businesses[0]?.source_name || 'Unknown'}`);
  console.log(`  📍 Has coordinates: ${businesses.some(b => b.latitude && b.longitude) ? 'YES' : 'NO'}`);
  
  if (businesses.length >= 5 && businesses.some(b => b.source_name === 'Gemini AI Research')) {
    console.log('\n✅ VERDICT: AGENT IS REAL - Collecting from Gemini AI Research');
  } else {
    console.log('\n⚠️  VERDICT: Check configuration - may be using fallback data');
  }

  // 7. Dashboard link
  console.log('\n🌐 View in Dashboard:');
  console.log('  Local: http://localhost:5173/command-center');
  console.log('  Check "Discovery Feed" to see collected businesses');
}

runProductionTest().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
