export interface TOTPAccount {
  id: string;
  secret?: string;
  password?: string;
  issuer: string;
  label: string;
  algorithm?: string;
  digits?: number;
  period?: number;
  icon?: string;
  category?: string;
  updatedAt?: number;
}

export type ThemeOption = 'system' | 'light' | 'dark';

export interface AppSettings {
  theme: ThemeOption;
  syncMethod: 'offline' | 'nostr' | 's3';
  autoReveal: boolean;
  showNextCode: boolean;
  autoLockDuration: number; // in seconds, 0 to disable
  s3Config?: {
    endpoint: string;
    accessKey: string;
    secretKey: string;
    bucket: string;
    region: string;
  };
  nostrConfig?: {
    relays: string[];
    publicKey?: string;
  };
}

export interface DecryptedVault {
  accounts: TOTPAccount[];
  settings: AppSettings;
}

export interface VaultState {
  isLocked: boolean;
  hasVault: boolean;
  data: DecryptedVault | null;
}