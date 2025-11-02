/**
 * Test AnythingLLM API Connection
 * 
 * Valida configuração antes de iniciar sync
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from project root
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const ANYTHINGLLM_URL = process.env.ANYTHINGLLM_URL || 'http://localhost:3001';
const ANYTHINGLLM_API_KEY = process.env.ANYTHINGLLM_API_KEY;
const WORKSPACE_SLUG = process.env.ANYTHINGLLM_WORKSPACE_SLUG || 'tradingsystem-docs';

console.log('');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('🧪 Testing AnythingLLM API Connection');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('');
console.log(`URL: ${ANYTHINGLLM_URL}`);
console.log(`API Key: ${ANYTHINGLLM_API_KEY ? '✅ Set' : '❌ Not set'}`);
console.log(`Workspace: ${WORKSPACE_SLUG}`);
console.log('');

async function testConnection() {
  try {
    // Test 1: Ping
    console.log('1️⃣  Testing server ping...');
    const pingResponse = await fetch(`${ANYTHINGLLM_URL}/api/ping`, {
      timeout: 5000,
    });
    
    if (!pingResponse.ok) {
      throw new Error(`Ping failed: ${pingResponse.status}`);
    }
    console.log('   ✅ Server is reachable');
    console.log('');
    
    // Test 2: API Authentication
    console.log('2️⃣  Testing API authentication...');
    const authResponse = await fetch(`${ANYTHINGLLM_URL}/api/v1/workspaces`, {
      headers: {
        'Authorization': `Bearer ${ANYTHINGLLM_API_KEY}`,
      },
      timeout: 5000,
    });
    
    if (!authResponse.ok) {
      const error = await authResponse.text();
      throw new Error(`Auth failed (${authResponse.status}): ${error}`);
    }
    
    const workspaces = await authResponse.json();
    console.log('   ✅ API Key is valid');
    console.log(`   📊 Found ${workspaces.workspaces?.length || 0} workspace(s)`);
    console.log('');
    
    // Test 3: Workspace exists
    console.log('3️⃣  Checking workspace...');
    const workspaceExists = workspaces.workspaces?.some(
      w => w.slug === WORKSPACE_SLUG
    );
    
    if (workspaceExists) {
      console.log(`   ✅ Workspace "${WORKSPACE_SLUG}" exists`);
    } else {
      console.log(`   ⚠️  Workspace "${WORKSPACE_SLUG}" not found`);
      console.log('');
      console.log('   Available workspaces:');
      workspaces.workspaces?.forEach(w => {
        console.log(`     • ${w.slug} (${w.name})`);
      });
      console.log('');
      console.log('   Create the workspace in AnythingLLM or update WORKSPACE_SLUG in .env');
    }
    console.log('');
    
    // Success
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ ALL TESTS PASSED!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');
    console.log('You can now run:');
    console.log('  npm start');
    console.log('');
    
  } catch (error) {
    console.log('');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('❌ TEST FAILED');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');
    console.log('Error:', error.message);
    console.log('');
    console.log('Troubleshooting:');
    console.log('  1. Make sure AnythingLLM is running:');
    console.log('     docker ps | grep anythingllm');
    console.log('');
    console.log('  2. Check API key in .env:');
    console.log('     grep ANYTHINGLLM_API_KEY ../../.env');
    console.log('');
    console.log('  3. Create workspace "tradingsystem-docs" in AnythingLLM');
    console.log('');
    process.exit(1);
  }
}

testConnection();

