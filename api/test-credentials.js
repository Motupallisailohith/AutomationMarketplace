/**
 * Test script to verify credentials storage and retrieval
 * Run with: node test-credentials.js
 */

const axios = require('axios');

const API_URL = 'http://localhost:3000/api';

// Test credentials data
const testCredential = {
  name: 'My Test API Key',
  type: 'httpHeaderAuth',
  data: {
    name: 'X-API-Key',
    value: 'super-secret-api-key-12345',
  },
};

async function testCredentialsStorage() {
  console.log('🧪 Testing Credentials Storage\n');

  try {
    // Step 1: Login to get auth token
    console.log('1️⃣  Logging in...');
    const loginResponse = await axios.post(`${API_URL}/auth/login`, {
      email: 'sailohith1439@gmail.com',
      password: 'your-password', // Update with your actual password
    });

    const token = loginResponse.data.token;
    console.log('✅ Logged in successfully\n');

    // Setup axios with auth header
    const api = axios.create({
      baseURL: API_URL,
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    // Step 2: Create a credential
    console.log('2️⃣  Creating test credential...');
    const createResponse = await api.post('/credentials', testCredential);
    const credentialId = createResponse.data.data.id;
    console.log('✅ Credential created:', {
      id: credentialId,
      name: createResponse.data.data.name,
      type: createResponse.data.data.type,
    });
    console.log('');

    // Step 3: Retrieve the credential (without decryption)
    console.log('3️⃣  Retrieving credential (encrypted)...');
    const getResponse = await api.get(`/credentials/${credentialId}`);
    console.log('✅ Credential retrieved:', {
      id: getResponse.data.data.id,
      name: getResponse.data.data.name,
      dataIsEncrypted: typeof getResponse.data.data.data === 'string',
    });
    console.log('');

    // Step 4: Retrieve with decryption
    console.log('4️⃣  Retrieving credential (decrypted)...');
    const getDecryptedResponse = await api.get(`/credentials/${credentialId}?decrypt=true`);
    console.log('✅ Credential decrypted:', {
      id: getDecryptedResponse.data.data.id,
      name: getDecryptedResponse.data.data.name,
      decryptedData: getDecryptedResponse.data.data.decryptedData,
    });
    console.log('');

    // Step 5: List all credentials
    console.log('5️⃣  Listing all credentials...');
    const listResponse = await api.get('/credentials');
    console.log('✅ Found credentials:', listResponse.data.data.length);
    listResponse.data.data.forEach((cred, idx) => {
      console.log(`   ${idx + 1}. ${cred.name} (${cred.type})`);
    });
    console.log('');

    // Step 6: Update credential
    console.log('6️⃣  Updating credential...');
    const updateResponse = await api.patch(`/credentials/${credentialId}`, {
      name: 'Updated Test API Key',
      data: {
        name: 'X-API-Key',
        value: 'updated-secret-key-67890',
      },
    });
    console.log('✅ Credential updated:', {
      id: updateResponse.data.data.id,
      name: updateResponse.data.data.name,
    });
    console.log('');

    // Step 7: Delete credential
    console.log('7️⃣  Deleting credential...');
    await api.delete(`/credentials/${credentialId}`);
    console.log('✅ Credential deleted\n');

    console.log('🎉 All tests passed! Credentials storage is working correctly.\n');

  } catch (error) {
    console.error('❌ Test failed:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
    });
    process.exit(1);
  }
}

// Run the test
testCredentialsStorage();
