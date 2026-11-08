#!/usr/bin/env node

/**
 * OAuth2 Flow Test Script
 * 
 * Tests the complete OAuth2 flow:
 * 1. Create a credential with clientId and clientSecret
 * 2. Generate OAuth2 authorization URL
 * 3. User authorizes in browser
 * 4. Callback receives code and exchanges for tokens
 * 5. Tokens are stored in credential
 */

const axios = require('axios');
const readline = require('readline');

const API_URL = process.env.API_URL || 'http://localhost:3001';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// Test configuration
const TEST_CONFIG = {
  provider: 'slack',
  // You'll need to create a Slack app at https://api.slack.com/apps
  // and get these values
  clientId: process.env.SLACK_CLIENT_ID || 'YOUR_SLACK_CLIENT_ID',
  clientSecret: process.env.SLACK_CLIENT_SECRET || 'YOUR_SLACK_CLIENT_SECRET',
};

let authToken = '';
let credentialId = '';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function ask(question) {
  return new Promise(resolve => rl.question(question, resolve));
}

async function login() {
  console.log('\n🔐 Step 1: Login');
  console.log('================');
  
  const email = await ask('Email: ');
  const password = await ask('Password: ');
  
  try {
    const response = await axios.post(`${API_URL}/api/auth/login`, {
      email,
      password,
    });
    
    authToken = response.data.data.token;
    console.log('✅ Login successful');
    return true;
  } catch (error) {
    console.error('❌ Login failed:', error.response?.data?.error || error.message);
    return false;
  }
}

async function createCredential() {
  console.log('\n📝 Step 2: Create OAuth2 Credential');
  console.log('====================================');
  
  if (TEST_CONFIG.clientId === 'YOUR_SLACK_CLIENT_ID') {
    console.log('\n⚠️  You need to set up a Slack app first:');
    console.log('1. Go to https://api.slack.com/apps');
    console.log('2. Create a new app');
    console.log('3. Get Client ID and Client Secret from "OAuth & Permissions"');
    console.log('4. Add redirect URL: http://localhost:3001/api/oauth2/callback');
    console.log('5. Set environment variables:');
    console.log('   export SLACK_CLIENT_ID="your_client_id"');
    console.log('   export SLACK_CLIENT_SECRET="your_client_secret"');
    console.log('\nOr update TEST_CONFIG in this script.');
    process.exit(1);
  }
  
  try {
    const response = await axios.post(
      `${API_URL}/api/credentials`,
      {
        name: 'Test Slack OAuth2',
        type: 'oauth2',
        description: 'Testing OAuth2 flow',
        data: {
          clientId: TEST_CONFIG.clientId,
          clientSecret: TEST_CONFIG.clientSecret,
          provider: TEST_CONFIG.provider,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      }
    );
    
    credentialId = response.data.data.id;
    console.log('✅ Credential created:', credentialId);
    return true;
  } catch (error) {
    console.error('❌ Failed to create credential:', error.response?.data?.error || error.message);
    return false;
  }
}

async function getAuthUrl() {
  console.log('\n🔗 Step 3: Generate Authorization URL');
  console.log('======================================');
  
  try {
    const response = await axios.get(
      `${API_URL}/api/oauth2/auth`,
      {
        params: {
          credentialId,
          provider: TEST_CONFIG.provider,
        },
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      }
    );
    
    const authUrl = response.data.data.authUrl;
    console.log('✅ Authorization URL generated');
    console.log('\n📱 Open this URL in your browser to authorize:');
    console.log('==============================================');
    console.log(authUrl);
    console.log('==============================================\n');
    
    console.log('After authorizing, you will be redirected to:');
    console.log(`${FRONTEND_URL}/credentials/${credentialId}?oauth=success`);
    console.log('\nThe OAuth2 flow is complete when tokens are stored.');
    
    return true;
  } catch (error) {
    console.error('❌ Failed to generate auth URL:', error.response?.data?.error || error.message);
    return false;
  }
}

async function checkCredential() {
  console.log('\n🔍 Step 4: Check Credential Status');
  console.log('===================================');
  
  await ask('\nPress Enter after you have authorized in the browser...');
  
  try {
    const response = await axios.get(
      `${API_URL}/api/credentials/${credentialId}`,
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      }
    );
    
    const credential = response.data.data;
    const hasAccessToken = credential.dataKeys.includes('accessToken');
    
    if (hasAccessToken) {
      console.log('✅ OAuth2 flow completed successfully!');
      console.log('✅ Access token is stored');
      if (credential.dataKeys.includes('refreshToken')) {
        console.log('✅ Refresh token is stored');
      }
      return true;
    } else {
      console.log('⚠️  Credential exists but no access token yet');
      console.log('Make sure you completed the authorization in the browser');
      return false;
    }
  } catch (error) {
    console.error('❌ Failed to check credential:', error.response?.data?.error || error.message);
    return false;
  }
}

async function testRefresh() {
  console.log('\n🔄 Step 5: Test Token Refresh (Optional)');
  console.log('=========================================');
  
  const shouldRefresh = await ask('Test token refresh? (y/n): ');
  
  if (shouldRefresh.toLowerCase() !== 'y') {
    console.log('Skipping token refresh test');
    return true;
  }
  
  try {
    const response = await axios.post(
      `${API_URL}/api/oauth2/refresh`,
      {
        credentialId,
      },
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      }
    );
    
    console.log('✅ Token refreshed successfully');
    return true;
  } catch (error) {
    console.error('❌ Token refresh failed:', error.response?.data?.error || error.message);
    return false;
  }
}

async function main() {
  console.log('🚀 OAuth2 Flow Test Script');
  console.log('===========================\n');
  console.log(`API URL: ${API_URL}`);
  console.log(`Provider: ${TEST_CONFIG.provider}`);
  console.log('');
  
  // Step 1: Login
  const loginSuccess = await login();
  if (!loginSuccess) {
    console.log('\n❌ Test failed at login step');
    rl.close();
    process.exit(1);
  }
  
  // Step 2: Create credential
  const createSuccess = await createCredential();
  if (!createSuccess) {
    console.log('\n❌ Test failed at credential creation step');
    rl.close();
    process.exit(1);
  }
  
  // Step 3: Get auth URL
  const authUrlSuccess = await getAuthUrl();
  if (!authUrlSuccess) {
    console.log('\n❌ Test failed at auth URL generation step');
    rl.close();
    process.exit(1);
  }
  
  // Step 4: Check credential after authorization
  const checkSuccess = await checkCredential();
  if (!checkSuccess) {
    console.log('\n⚠️  OAuth2 flow may not be complete');
  }
  
  // Step 5: Test refresh (optional)
  if (checkSuccess) {
    await testRefresh();
  }
  
  console.log('\n✨ OAuth2 test complete!');
  console.log(`\nCredential ID: ${credentialId}`);
  console.log('You can now use this credential in your workflows.\n');
  
  rl.close();
}

main().catch(error => {
  console.error('\n💥 Unexpected error:', error);
  rl.close();
  process.exit(1);
});
