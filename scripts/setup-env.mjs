#!/usr/bin/env node
/**
 * Environment Setup Script for 18-AGENTS
 * 
 * This script helps you set up the required environment variables.
 * Run: node scripts/setup-env.mjs
 */

import fs from 'node:fs';
import readline from 'node:readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const prompt = (question) => new Promise((resolve) => {
  rl.question(question, (answer) => resolve(answer.trim()));
});

const REQUIRED_VARS = [
  { key: 'VITE_SUPABASE_URL', description: 'Supabase project URL (found in Supabase Dashboard > Settings > API)' },
  { key: 'VITE_SUPABASE_ANON_KEY', description: 'Supabase anon/public key (found in Supabase Dashboard > Settings > API)' },
  { key: 'SUPABASE_URL', description: 'Same as VITE_SUPABASE_URL (for server-side)' },
  { key: 'SUPABASE_SERVICE_ROLE_KEY', description: 'Supabase service role key (found in Supabase Dashboard > Settings > API, keep secret!)' },
  { key: 'VITE_GEMINI_API_KEY', description: 'Google Gemini API key (get from https://makersuite.google.com/app/apikey)' },
  { key: 'GOOGLE_PLACES_API_KEY', description: 'Google Places API key (get from https://console.cloud.google.com/apis/credentials)' }
];

async function setup() {
  console.log('🔧 18-AGENTS Environment Setup\n');
  console.log('This script will help you set up the required environment variables.\n');
  console.log('You can find these values in:');
  console.log('  - Supabase Dashboard: https://app.supabase.com/project/_/settings/api');
  console.log('  - Google AI Studio: https://makersuite.google.com/app/apikey');
  console.log('  - Google Cloud Console: https://console.cloud.google.com/apis/credentials\n');

  const envVars = {};

  for (const { key, description } of REQUIRED_VARS) {
    const value = await prompt(`${key}:\n  ${description}\n  Enter value: `);
    if (value) {
      envVars[key] = value;
    }
  }

  rl.close();

  const envContent = Object.entries(envVars)
    .map(([key, value]) => `${key}=${value}`)
    .join('\n') + '\n';

  const envPath = '.env';
  
  if (fs.existsSync(envPath)) {
    const backupPath = `.env.backup.${Date.now()}`;
    fs.copyFileSync(envPath, backupPath);
    console.log(`\n📦 Backed up existing .env to ${backupPath}`);
    
    // Merge with existing
    const existing = fs.readFileSync(envPath, 'utf8');
    const existingVars = parseEnv(existing);
    const merged = { ...existingVars, ...envVars };
    const mergedContent = Object.entries(merged)
      .map(([key, value]) => `${key}=${value}`)
      .join('\n') + '\n';
    fs.writeFileSync(envPath, mergedContent);
  } else {
    fs.writeFileSync(envPath, envContent);
  }

  console.log('\n✅ Environment variables saved to .env');
  console.log('\n⚠️  IMPORTANT: Never commit .env to git!');
  console.log('   It is already in .gitignore, but double-check.');
  console.log('\n🚀 You can now run: npm run dev');
}

function parseEnv(content) {
  const vars = {};
  for (const line of content.split('\n')) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (match) {
      vars[match[1]] = match[2];
    }
  }
  return vars;
}

setup().catch(console.error);
