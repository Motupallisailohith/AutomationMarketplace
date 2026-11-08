const crypto = require('crypto');

const ALGORITHM = 'aes-256-ctr';
// Ensure key is 32 bytes
let ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'n8n_default_secret_key_change_me_123';
if (ENCRYPTION_KEY.length < 32) {
    ENCRYPTION_KEY = ENCRYPTION_KEY.padEnd(32, '0');
} else if (ENCRYPTION_KEY.length > 32) {
    ENCRYPTION_KEY = ENCRYPTION_KEY.substring(0, 32);
}

function encrypt(text) {
    // Basic type checking
    if (typeof text !== 'string') {
        text = JSON.stringify(text);
    }

    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY), iv);
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);

    // Return format: IV:EncryptedData
    return iv.toString('hex') + ':' + encrypted.toString('hex');
}

function decrypt(text) {
    if (!text) return null;

    try {
        const textParts = text.split(':');
        // Simple validation of format
        if (textParts.length < 2) return null;

        const iv = Buffer.from(textParts.shift(), 'hex');
        const encryptedText = Buffer.from(textParts.join(':'), 'hex');
        const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY), iv);
        let decrypted = decipher.update(encryptedText);
        decrypted = Buffer.concat([decrypted, decipher.final()]);
        return decrypted.toString();
    } catch (e) {
        console.error('Decryption failed:', e.message);
        throw new Error('Failed to decrypt credentials');
    }
}

module.exports = { encrypt, decrypt };
