# How Credentials Are Stored and Checked

## 📦 Database Storage

### CredentialsEntity Table Schema (from n8n)

```sql
CREATE TABLE credentials_entity (
  id VARCHAR PRIMARY KEY,
  name VARCHAR(128) NOT NULL,
  type VARCHAR(128) NOT NULL,
  data TEXT NOT NULL,              -- ⚠️ ENCRYPTED BASE64 STRING
  isManaged BOOLEAN DEFAULT false,
  isGlobal BOOLEAN DEFAULT false,
  isResolvable BOOLEAN DEFAULT false,
  resolvableAllowFallback BOOLEAN DEFAULT false,
  resolverId VARCHAR NULL,
  createdAt TIMESTAMP,
  updatedAt TIMESTAMP
);
```

**Key Points:**
- `data` column stores **ENCRYPTED Base64 string**, NOT plain JSON
- Each credential gets encrypted with the instance's `ENCRYPTION_KEY`
- Salt is randomly generated per encryption and embedded in the Base64 string

### SharedCredentials Table (for permissions)

```sql
CREATE TABLE shared_credentials (
  credentialsId VARCHAR,
  projectId VARCHAR,
  role VARCHAR,                     -- 'credential:owner' or 'credential:user'
  createdAt TIMESTAMP,
  updatedAt TIMESTAMP,
  PRIMARY KEY (credentialsId, projectId)
);
```

## 🔐 Encryption Process

### 1. Creating/Saving Credentials

```typescript
// User input (plain JSON)
const credentialData = {
  username: "admin",
  password: "secret123",
  host: "api.example.com"
};

// Step 1: Create Credentials instance
const credentials = new Credentials(
  { id: "abc123", name: "My API Creds" },
  "httpBasicAuth"
);

// Step 2: Encrypt data using Cipher
credentials.setData(credentialData);
// Internally calls: cipher.encrypt(credentialData)

// Step 3: Get encrypted data for database
const encrypted = credentials.getDataToSave();
// Returns: {
//   id: "abc123",
//   name: "My API Creds",
//   type: "httpBasicAuth",
//   data: "U2FsdGVkX1+...base64string..."  // ← ENCRYPTED
// }

// Step 4: Save to database
await credentialsRepository.save(encrypted);
```

### 2. Encryption Algorithm (Cipher class)

```typescript
encrypt(data: object): string {
  // 1. Generate random 8-byte salt
  const salt = randomBytes(8);
  
  // 2. Derive key and IV from ENCRYPTION_KEY + salt using MD5
  const [key, iv] = this.getKeyAndIv(salt);
  //    key = MD5(MD5(password + salt) + password + salt)  (32 bytes)
  //    iv  = MD5(hash2 + password + salt)                 (16 bytes)
  
  // 3. Encrypt using AES-256-CBC
  const cipher = createCipheriv('aes-256-cbc', key, iv);
  const encrypted = cipher.update(JSON.stringify(data));
  
  // 4. Concatenate: MAGIC_BYTES (8) + salt (8) + encrypted + final
  const result = Buffer.concat([
    Buffer.from('53616c7465645f5f', 'hex'),  // "Salted__" in hex
    salt,
    encrypted,
    cipher.final()
  ]);
  
  // 5. Encode as Base64
  return result.toString('base64');
  // Example: "U2FsdGVkX1+abc123xyz789...=="
}
```

### 3. What Gets Stored in Database

```
credentials_entity table:
┌─────────┬─────────────────┬────────────────┬───────────────────────────────────┐
│   id    │      name       │      type      │              data                 │
├─────────┼─────────────────┼────────────────┼───────────────────────────────────┤
│ abc123  │ My API Creds    │ httpBasicAuth  │ U2FsdGVkX1+ZXRzIGlzIGVuY3J5cH... │
│ xyz789  │ OAuth2 Google   │ oauth2         │ U2FsdGVkX1+dGVkIGFuZCBzYWZlI... │
└─────────┴─────────────────┴────────────────┴───────────────────────────────────┘
```

The `data` column contains:
```
U2FsdGVkX1+abc123...    (Base64 encoded)
    ↓ Decode Base64
[53 61 6C 74 65 64 5F 5F] [XX XX XX XX XX XX XX XX] [encrypted data...]
        "Salted__"              8-byte salt           AES-encrypted JSON
```

## ✅ Checking/Validating Credentials

### 1. Retrieving and Decrypting

```typescript
// Step 1: Get from database
const credential = await credentialsRepository.findOne({ 
  where: { id: "abc123" } 
});

// credential.data = "U2FsdGVkX1+abc123..." (encrypted Base64 string)

// Step 2: Create Credentials instance from entity
const coreCredential = createCredentialsFromCredentialsEntity(credential);

// Step 3: Decrypt
const decryptedData = coreCredential.getData();
// Returns: {
//   username: "admin",
//   password: "secret123",
//   host: "api.example.com"
// }
```

### 2. Decryption Algorithm (Cipher class)

```typescript
decrypt(encryptedBase64: string): string {
  // 1. Decode Base64
  const input = Buffer.from(encryptedBase64, 'base64');
  
  // 2. Extract salt from bytes 8-16
  const salt = input.subarray(8, 16);
  
  // 3. Derive same key and IV from salt
  const [key, iv] = this.getKeyAndIv(salt);
  
  // 4. Extract encrypted content (skip magic bytes + salt)
  const contents = input.subarray(16);
  
  // 5. Decrypt using AES-256-CBC
  const decipher = createDecipheriv('aes-256-cbc', key, iv);
  const decrypted = Buffer.concat([
    decipher.update(contents),
    decipher.final()
  ]);
  
  // 6. Return as UTF-8 string (JSON)
  return decrypted.toString('utf-8');
  // Returns: '{"username":"admin","password":"secret123",...}'
}
```

### 3. Permission Checking (via SharedCredentials)

```typescript
// Check if user has access to credential
const shared = await sharedCredentialsRepository.findOne({
  where: {
    credentialsId: "abc123",
    projectId: user.projectId
  }
});

if (!shared) {
  throw new ForbiddenError("No access to this credential");
}

// Check role permissions
if (shared.role === 'credential:owner') {
  // Can read, update, delete, share
} else if (shared.role === 'credential:user') {
  // Can only read and use in workflows
}
```

## 🔍 Validation Flow

### When Creating Credentials

1. **Input validation** - Check required fields (name, type, data)
2. **Encryption** - Encrypt data using Cipher
3. **Transaction** - Save credential + SharedCredentials atomically
4. **Return** - Return credential ID (data stays encrypted in DB)

### When Using Credentials in Workflow

1. **Permission check** - Verify user/workflow has access via SharedCredentials
2. **Retrieve** - Get encrypted credential from database
3. **Decrypt** - Decrypt only when needed for node execution
4. **Memory-only** - Decrypted data never persisted to disk
5. **Cleanup** - Decrypted data cleared after use

### When Updating Credentials

1. **Retrieve existing** - Get current encrypted credential
2. **Decrypt current** - Decrypt to get existing values
3. **Unredact** - Replace blanked values (`__n8n_BLANK_VALUE__`) with existing values
4. **Merge** - Combine new data with unredacted data
5. **Re-encrypt** - Encrypt merged data with **new salt**
6. **Update** - Save new encrypted data

## 🛡️ Security Features

### ✅ What's Protected

- **Encryption at rest** - All credential data encrypted in database
- **Unique salts** - Each encryption uses random salt (prevents rainbow tables)
- **Strong algorithm** - AES-256-CBC with MD5 key derivation
- **No plaintext** - Decrypted data only exists in memory during use
- **Project isolation** - SharedCredentials enforces access control

### ⚠️ Important Notes

1. **ENCRYPTION_KEY is critical** - Without it, credentials cannot be decrypted
   - Store in environment variable
   - Never commit to git
   - Backup securely

2. **Changing ENCRYPTION_KEY** - Will make all existing credentials unreadable
   - Need migration process to re-encrypt

3. **Salt is embedded** - Each encrypted string contains its own salt
   - No separate IV storage needed
   - Enables credential migration between instances

## 📊 Example Flow Diagram

```
User Input → Credentials.setData() → Cipher.encrypt()
              ↓                         ↓
         JSON object            [Magic|Salt|Encrypted]
              ↓                         ↓
    {"user":"admin"}           Base64: "U2FsdGVkX1+..."
              ↓                         ↓
              └──────────────┬──────────┘
                             ↓
                    Save to Database
                    (credentials_entity.data)
                             ↓
                    Retrieve from DB
                             ↓
              ┌──────────────┴──────────┐
              ↓                         ↓
    createCredentialsFromEntity()  Cipher.decrypt()
              ↓                         ↓
         Credentials            Extract salt, derive key
         instance                      ↓
              ↓                   AES decrypt
         getData()                     ↓
              ↓                   JSON string
              └──────────────┬──────────┘
                             ↓
                      Parse JSON
                             ↓
                   {"user":"admin"}
```

## 🧪 Testing Credentials

```bash
# Run test script
node api/test-credentials.js

# This will:
# 1. Login as test user
# 2. Create credential with encrypted data
# 3. Retrieve and decrypt credential
# 4. Update credential (re-encrypt with new salt)
# 5. Delete credential
```

## 🔗 Related Files

- **Encryption**: `api/src/encryption/cipher.ts`
- **Credentials class**: `api/src/classes/Credentials.ts`
- **Service**: `api/src/services/credentials.service.ts`
- **Routes**: `api/src/routes/credentials.ts`
- **Helper**: `api/src/helpers/credentials-helper.ts`
