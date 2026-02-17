import CryptoJS from 'crypto-js';
import { DecryptedVault } from '../types';

const VAULT_KEY = 'otphaven_vault';

// Encryption Constants
const KDF_ITERATIONS = 10000;
const KEY_SIZE = 256 / 32;
const SALT_SIZE = 128 / 8;
const IV_SIZE = 128 / 8;

interface EncryptedPayload {
  v: number; // version
  s: string; // salt (hex)
  iv: string; // iv (hex)
  ct: string; // ciphertext (base64)
}

// --- Internal Helper: Key Derivation ---
const deriveKey = (password: string, salt: CryptoJS.lib.WordArray) => {
  return CryptoJS.PBKDF2(password, salt, {
    keySize: KEY_SIZE,
    iterations: KDF_ITERATIONS
  });
};

export const saveVault = (data: DecryptedVault, pin: string): void => {
  const json = JSON.stringify(data);

  // Generate random salt and IV
  const salt = CryptoJS.lib.WordArray.random(SALT_SIZE);
  const iv = CryptoJS.lib.WordArray.random(IV_SIZE);

  // Derive strong key
  const key = deriveKey(pin, salt);

  // Encrypt
  const encrypted = CryptoJS.AES.encrypt(json, key, { iv: iv });

  // Construct payload
  const payload: EncryptedPayload = {
    v: 2,
    s: salt.toString(),
    iv: iv.toString(),
    ct: encrypted.ciphertext.toString(CryptoJS.enc.Base64)
  };

  localStorage.setItem(VAULT_KEY, JSON.stringify(payload));
};

export const loadVault = (pin: string): DecryptedVault | null => {
  const rawData = localStorage.getItem(VAULT_KEY);
  if (!rawData) return null;

  try {
    // Try to parse as JSON (Version 2 - Strong Enc)
    // If it fails, it might be Version 1 (Legacy string)
    let payload: EncryptedPayload;

    try {
      payload = JSON.parse(rawData);
    } catch (e) {
      // Fallback to Legacy (Version 1 - Weak KDF)
      console.warn("Detected legacy vault format. Migrating on next save.");
      const bytesLegacy = CryptoJS.AES.decrypt(rawData, pin);
      const decryptedLegacy = bytesLegacy.toString(CryptoJS.enc.Utf8);
      if (!decryptedLegacy) throw new Error("Invalid PIN");
      return JSON.parse(decryptedLegacy);
    }

    if (payload.v === 2) {
      const salt = CryptoJS.enc.Hex.parse(payload.s);
      const iv = CryptoJS.enc.Hex.parse(payload.iv);
      const key = deriveKey(pin, salt);

      const cipherParams = CryptoJS.lib.CipherParams.create({
        ciphertext: CryptoJS.enc.Base64.parse(payload.ct)
      });

      const bytes = CryptoJS.AES.decrypt(cipherParams, key, { iv: iv });
      const decrypted = bytes.toString(CryptoJS.enc.Utf8);

      if (!decrypted) throw new Error("Invalid PIN");
      return JSON.parse(decrypted);
    } else {
      throw new Error("Unknown vault version");
    }

  } catch (e) {
    throw new Error("Invalid PIN or corrupted data");
  }
};

export const vaultExists = (): boolean => {
  return !!localStorage.getItem(VAULT_KEY);
};

export const clearVault = (): void => {
  localStorage.removeItem(VAULT_KEY);
};

// --- Storage Utils ---

export const getStorageUsage = () => {
  let totalBytes = 0;
  // Iterate all keys to account for other overhead if multiple apps (though usually scoped)
  // For this app, mostly VAULT_KEY matters.
  for (let key in localStorage) {
    if (localStorage.hasOwnProperty(key)) {
      const value = localStorage[key];
      // Javascript strings are UTF-16 (2 bytes per char)
      totalBytes += (key.length + value.length) * 2;
    }
  }

  // Common browser limit is ~5MB chars or 10MB bytes. 
  // Safest estimation is 5MB total capacity.
  const LIMIT_BYTES = 5 * 1024 * 1024;

  return {
    usedBytes: totalBytes,
    limitBytes: LIMIT_BYTES,
    percent: (totalBytes / LIMIT_BYTES) * 100,
    formatted: `${(totalBytes / 1024).toFixed(2)} KB / ${(LIMIT_BYTES / 1024 / 1024).toFixed(1)} MB`
  };
};


// --- Backup Utilities (Also upgraded to Strong Enc) ---

export const encryptBackup = (data: DecryptedVault, password: string): string => {
  const json = JSON.stringify(data);
  const salt = CryptoJS.lib.WordArray.random(SALT_SIZE);
  const iv = CryptoJS.lib.WordArray.random(IV_SIZE);
  const key = deriveKey(password, salt);

  const encrypted = CryptoJS.AES.encrypt(json, key, { iv: iv });

  const payload: EncryptedPayload = {
    v: 2,
    s: salt.toString(),
    iv: iv.toString(),
    ct: encrypted.ciphertext.toString(CryptoJS.enc.Base64)
  };

  // Return base64 string of the payload object to keep it as a single string file
  return btoa(JSON.stringify(payload));
};

export const decryptBackup = (ciphertext: string, password: string): DecryptedVault => {
  try {
    // Try parsing payload (Base64 -> JSON)
    const jsonStr = atob(ciphertext);
    const payload: EncryptedPayload = JSON.parse(jsonStr);

    if (payload.v === 2) {
      const salt = CryptoJS.enc.Hex.parse(payload.s);
      const iv = CryptoJS.enc.Hex.parse(payload.iv);
      const key = deriveKey(password, salt);

      const cipherParams = CryptoJS.lib.CipherParams.create({
        ciphertext: CryptoJS.enc.Base64.parse(payload.ct)
      });

      const bytes = CryptoJS.AES.decrypt(cipherParams, key, { iv: iv });
      const decrypted = bytes.toString(CryptoJS.enc.Utf8);
      if (!decrypted) throw new Error("Invalid Password");
      return JSON.parse(decrypted);
    }
  } catch (e) {
    // Fallback for legacy backups (Raw string AES)
    try {
      const bytes = CryptoJS.AES.decrypt(ciphertext, password);
      const decrypted = bytes.toString(CryptoJS.enc.Utf8);
      if (!decrypted) throw new Error("Invalid Password");
      return JSON.parse(decrypted);
    } catch (legacyErr) {
      throw new Error("Invalid Password or corrupted file");
    }
  }
  throw new Error("Unknown backup format");
};