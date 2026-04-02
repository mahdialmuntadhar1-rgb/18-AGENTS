#!/usr/bin/env node
/**
 * Test Script for 18-AGENTS Data Collection
 * Runs all agents and displays results
 */
import { createClient } from '@supabase/supabase-js';
import { runGovernor, getGovernorDefaults } from '../server/governors/index.js';
import dotenv from 'dotenv';

dotenv.config();

// Initialize Supabase
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// All 18 agents
const AGENTS = [
  'Agent-01', 'Agent-02', 'Agent-03', 'Agent-04', 'Agent-05',
  'Agent-06', 'Agent-07', 'Agent-08', 'Agent-09', 'Agent-10',
  'Agent-11', 'Agent-12', 'Agent-13', 'Agent-14', 'Agent-15',
  'Agent-16', 'Agent-17', 'Agent-18'
];

async function testDataCollection() {
  console.log('🚀 Testing 18-AGENTS Data Collection\n');
  console.log('=' .repeat(60));

  // 1. Check Supabase connection
  console.log('\n📡 Checking Supabase connection...');
  try {
    const { data: count, error } = await supabase
      .from('businesses')
      .select('*', { count: 'exact', head: true });
    
    if (error) throw error;
    console.log(`✅ Supabase connected - ${count || 0} businesses in database\n`);
  } catch (err) {
    console.error('❌ Supabase connection failed:', err.message);
    return;
  }

  // 2. Show agent configuration
  console.log('📋 Agent Configuration:');
  console.log('-'.repeat(60));
  console.log('| Agent     | Category      | City           | Rate       |');
  console.log('-'.repeat(60));
  
  for (const agentName of AGENTS) {
    const defaults = getGovernorDefaults(agentName);
    console.log(`| ${agentName.padEnd(9)} | ${defaults.category.padEnd(13)} | ${defaults.city.padEnd(14)} | ${defaults.governmentRate.padEnd(10)} |`);
  }
  console.log('-'.repeat(60));

  // 3. Test run first 3 agents (quick test)
  console.log('\n🧪 Running Quick Test (First 3 agents)...\n');
  const testAgents = AGENTS.slice(0, 3);
  
  for (const agentName of testAgents) {
    console.log(`\n▶️  Testing ${agentName}...`);
    const defaults = getGovernorDefaults(agentName);
    console.log(`   Target: ${defaults.category} in ${defaults.city}`);
    
    try {
      const startTime = Date.now();
      await runGovernor(agentName, {
        city: defaults.city,
        category: defaults.category,
        government_rate: defaults.governmentRate
      });
      const duration = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(`   ✅ Completed in ${duration}s`);
    } catch (err) {
      console.error(`   ❌ Error: ${err.message}`);
    }
  }

  // 4. Show results
  console.log('\n📊 Test Results:');
  console.log('='.repeat(60));
  
  // Count by category
  const { data: byCategory, error: catError } = await supabase
    .from('businesses')
    .select('category, count')
    .group('category');

  if (!catError && byCategory) {
    console.log('\nBy Category:');
    byCategory.forEach(row => {
      console.log(`  ${row.category}: ${row.count} businesses`);
    });
  }

  // Count by city
  const { data: byCity, error: cityError } = await supabase
    .from('businesses')
    .select('city, count')
    .group('city');

  if (!cityError && byCity) {
    console.log('\nBy City:');
    byCity.forEach(row => {
      console.log(`  ${row.city}: ${row.count} businesses`);
    });
  }

  // Total count
  const { count: total, error: totalError } = await supabase
    .from('businesses')
    .select('*', { count: 'exact', head: true });

  if (!totalError) {
    console.log(`\n📁 Total businesses in database: ${total}`);
  }

  // Recent logs
  const { data: logs, error: logsError } = await supabase
    .from('agent_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5);

  if (!logsError && logs && logs.length > 0) {
    console.log('\n📝 Recent Agent Logs:');
    logs.forEach(log => {
      const time = new Date(log.created_at).toLocaleTimeString();
      console.log(`  [${time}] ${log.agent_name}: ${log.action} - ${log.details}`);
    });
  }

  console.log('\n✅ Test complete!');
  console.log('\nNext steps:');
  console.log('  1. Check Supabase dashboard for collected data');
  console.log('  2. Run all agents: npm run test:agents:full');
  console.log('  3. Start web UI: npm run dev');
}

// Run full collection on all 18 agents
async function runFullCollection() {
  console.log('🚀 Running Full Collection on All 18 Agents\n');
  console.log('This will take several minutes...\n');

  let successCount = 0;
  let failCount = 0;

  for (const agentName of AGENTS) {
    console.log(`\n▶️  ${agentName}...`);
    const defaults = getGovernorDefaults(agentName);
    
    try {
      const startTime = Date.now();
      await runGovernor(agentName, {
        city: defaults.city,
        category: defaults.category,
        government_rate: defaults.governmentRate
      });
      const duration = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(`   ✅ Done in ${duration}s`);
      successCount++;
    } catch (err) {
      console.error(`   ❌ Failed: ${err.message}`);
      failCount++;
    }

    // Small delay between agents
    await new Promise(r => setTimeout(r, 1000));
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 Full Collection Complete');
  console.log(`   ✅ Success: ${successCount}/${AGENTS.length}`);
  console.log(`   ❌ Failed: ${failCount}/${AGENTS.length}`);
  
  // Final count
  const { count } = await supabase
    .from('businesses')
    .select('*', { count: 'exact', head: true });
  
  console.log(`📁 Total businesses in database: ${count}`);
}

// Main execution
const command = process.argv[2];

if (command === 'full') {
  runFullCollection().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
} else {
  testDataCollection().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
}
