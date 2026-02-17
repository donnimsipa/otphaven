import * as OTPAuth from 'otpauth';
import { TOTPAccount } from '../types';

export const generateToken = (account: TOTPAccount, periodOffset = 0): { token: string; period: number; timeLeft: number } | null => {
  if (!account.secret) return null;

  try {
    const totp = new OTPAuth.TOTP({
        issuer: account.issuer,
        label: account.label,
        algorithm: account.algorithm || 'SHA1',
        digits: account.digits || 6,
        period: account.period || 30,
        secret: OTPAuth.Secret.fromBase32(account.secret),
    });

    // Calculate time for generation
    const period = account.period || 30;
    const now = Date.now();
    const timestamp = now + (periodOffset * period * 1000);

    const token = totp.generate({ timestamp });
    const timeLeft = period - (Math.floor(now / 1000) % period);

    return { token, period, timeLeft };
  } catch (e) {
    console.error("TOTP Generation failed", e);
    return null;
  }
};

export const parseMigrationUrl = (url: string): TOTPAccount | null => {
  try {
    // Basic otpauth:// parsing
    const uri = new URL(url);
    if (uri.protocol !== 'otpauth:') return null;
    
    const params = uri.searchParams;
    const pathParts = uri.pathname.split(':');
    
    // Label handling
    let label = decodeURIComponent(uri.pathname.replace(/^\/\//, ''));
    let issuer = params.get('issuer') || '';

    if (label.includes(':')) {
        const parts = label.split(':');
        issuer = parts[0];
        label = parts[1];
    }

    const secret = params.get('secret');
    if (!secret) return null;

    return {
      id: crypto.randomUUID(),
      secret: secret,
      issuer: issuer || 'Unknown',
      label: label || 'Account',
      algorithm: params.get('algorithm') || 'SHA1',
      digits: parseInt(params.get('digits') || '6', 10),
      period: parseInt(params.get('period') || '30', 10),
    };
  } catch (e) {
    console.error("Failed to parse URI", e);
    return null;
  }
};
