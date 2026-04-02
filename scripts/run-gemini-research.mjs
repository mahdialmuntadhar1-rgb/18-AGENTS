#!/usr/bin/env node
/**
 * Gemini Research Agent CLI
 * 
 * Commands:
 *   node run-gemini-research.mjs search <category> <city> [limit]
 *   node run-gemini-research.mjs verify <business-id>
 *   node run-gemini-research.mjs verify-all [limit]
 *   node run-gemini-research.mjs cross-ref <business-name> <city>
 * 
 * Examples:
 *   node run-gemini-research.mjs search restaurants "Baghdad" 20
 *   node run-gemini-research.mjs verify 550e8400-e29b-41d4-a716-446655440000
 *   node run-gemini-research.mjs verify-all 10
 */

import { GeminiResearchGovernor } from '../server/governors/gemini-research-governor.js';
import dotenv from 'dotenv';

dotenv.config();

const GEMINI_API_KEY = process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  console.error('❌ Missing VITE_GEMINI_API_KEY in .env');
  console.log('Get a key from: https://makersuite.google.com/app/apikey');
  process.exit(1);
}

const governor = new GeminiResearchGovernor(GEMINI_API_KEY);

const [,, command, ...args] = process.argv;

async function main() {
  switch (command) {
    case 'search': {
      const [category, city, limit = 10] = args;
      if (!category || !city) {
        console.error('Usage: search <category> <city> [limit]');
        process.exit(1);
      }
      
      console.log(`🔍 Searching for ${category} in ${city}...`);
      const businesses = await governor.search({ category, city, limit: parseInt(limit) });
      
      console.log(`\n📊 Found ${businesses.length} businesses:\n`);
      businesses.forEach((b, i) => {
        console.log(`${i + 1}. ${b.name}`);
        console.log(`   Address: ${b.address || 'N/A'}`);
        console.log(`   Phone: ${b.phone || 'N/A'}`);
        console.log(`   Description: ${b.description || 'N/A'}`);
        console.log();
      });
      break;
    }

    case 'verify': {
      const [businessId] = args;
      if (!businessId) {
        console.error('Usage: verify <business-id>');
        process.exit(1);
      }
      
      console.log(`🔍 Verifying business ${businessId}...`);
      const result = await governor.verifyBusiness(businessId);
      
      console.log('\n📋 Verification Result:');
      console.log(`   Is Real: ${result.isReal ? '✅ Yes' : '❌ No'}`);
      console.log(`   Status: ${result.updates.verification_status}`);
      console.log(`   Confidence: ${result.updates.confidence_score}`);
      console.log(`   Updates:`, result.updates);
      break;
    }

    case 'verify-all': {
      const [limit = 10] = args;
      console.log(`🔍 Running verification on up to ${limit} pending businesses...`);
      const results = await governor.runVerificationJob(parseInt(limit));
      
      console.log('\n📈 Verification Results:');
      console.log(`   ✅ Verified: ${results.verified}`);
      console.log(`   ❌ Rejected: ${results.rejected}`);
      console.log(`   ⚠️  Uncertain: ${results.uncertain}`);
      console.log(`   ❌ Errors: ${results.errors}`);
      break;
    }

    case 'cross-ref': {
      const [businessName, city] = args;
      if (!businessName || !city) {
        console.error('Usage: cross-ref <business-name> <city>');
        process.exit(1);
      }
      
      console.log(`🔍 Cross-referencing "${businessName}" in ${city}...`);
      const result = await governor.crossReference(businessName, city);
      console.log('\n📋 Cross-Reference Result:');
      console.log(result);
      break;
    }

    default:
      console.log('🚀 Gemini Research Agent CLI\n');
      console.log('Commands:');
      console.log('  search <category> <city> [limit]   - Research businesses in a city');
      console.log('  verify <business-id>               - Verify a specific business');
      console.log('  verify-all [limit]                 - Verify all pending businesses');
      console.log('  cross-ref <name> <city>            - Cross-reference a business\n');
      console.log('Examples:');
      console.log('  node run-gemini-research.mjs search restaurants "Baghdad" 20');
      console.log('  node run-gemini-research.mjs verify-all 10');
      process.exit(1);
  }
}

main().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
