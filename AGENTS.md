# otphaven Project Context

## 1. Project Overview
**Name:** otphaven
**Description:** A standalone, mobile-first web application for securely storing and generating TOTP (2FA) codes.
**Type:** Client-side Single Page Application (SPA).
**Deployment:** Runs directly in the browser (no backend required for basic functionality).

## 2. Technical Stack & Constraints (CRITICAL)
This project is built as a React SPA using **Vite**.

*   **Framework:** React 18+ (via `esm.sh` or local installation).
*   **Module System:** ES Modules, with Vite as the development server and bundler.
*   **Entry Point:** `index.html` loads `index.tsx` as a module.

*   **Framework:** React 18+ (via `esm.sh`).
*   **Styling:** Tailwind CSS (via CDN script, configured in `index.html`).
*   **Icons:** Lucide React.
*   **Animations:** Framer Motion.
*   **Logic Libraries:** 
    *   `otpauth` (TOTP generation).
    *   `crypto-js` (AES Encryption).
    *   `html5-qrcode` (QR Scanning).
    *   `peerjs` (WebRTC P2P Sync).
*   **Module System:** ES Modules loaded via `<script type="importmap">` in `index.html`.

## 3. Project Structure
The project root is treated as the source. Do not create a `src/` folder.

*   `index.html`: Entry point, Import Maps, Tailwind Config.
*   `index.tsx`: React Root render.
*   `App.tsx`: Main Controller, Router (State-based), and Global State.
*   `types.ts`: TypeScript interfaces/Global types.
*   `CHANGELOG.md`: Version history and release notes (Keep a Changelog format).
*   `CONTRIBUTING.md`: Contribution guidelines for developers.
*   `services/`:
    *   `cryptoService.ts`: AES encryption/decryption logic (Local Vault & Backups).
    *   `totpService.ts`: Logic for generating tokens and parsing `otpauth://` URIs.
    *   `p2pService.ts`: PeerJS wrapper for Host/Join logic.
*   `components/`:
    *   `TOTPCard.tsx`: Display component for individual accounts (Timer, Actions).
    *   `Scanner.tsx`: QR Code scanner modal.
    *   `Settings.tsx`: App configuration, Theme, and Import/Export.
    *   `P2PSync.tsx`: UI for Host/Join P2P rooms.

## 4. Data Architecture (`types.ts`)

```typescript
export interface TOTPAccount {
  id: string;
  secret?: string;       // Base32 secret
  password?: string;     // Static password (optional)
  issuer: string;        // Service name (e.g., Google)
  label: string;         // Account name (e.g., email)
  algorithm?: string;    // SHA1, SHA256, etc.
  digits?: number;       // Usually 6
  period?: number;       // Usually 30
  icon?: string;
  category?: string;     // Work, Personal, etc.
}

export interface AppSettings {
  theme: 'system' | 'light' | 'dark';
  syncMethod: 'offline' | 'nostr' | 's3';
  autoReveal: boolean;   // Auto-unmask codes
  showNextCode: boolean; // Show next period's code
  autoLockDuration: number; // Idle timeout in seconds
  s3Config?: { ... };    // S3 Backup config
  nostrConfig?: { ... }; // Nostr Sync config
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
```

## 5. Security Model
1.  **Storage:** `localStorage` key `otphaven_vault`.
2.  **Encryption:** 
    *   The entire JSON vault (`DecryptedVault`) is stringified and encrypted using **AES** (via `crypto-js`).
    *   The **User PIN** acts as the encryption key (PBKDF2 derivation).
    *   No data is stored in plain text.
3.  **Backups:**
    *   **Raw Export:** Unsafe JSON export.
    *   **Encrypted Export:** AES Encrypted string requiring a separate password to decrypt/restore.
4.  **Auto-Lock:** App clears sensitive state after user inactivity (disabled in No-PIN mode).
5.  **No-PIN Mode (`VITE_DISABLE_PIN`):**
    *   Skips the PIN screen and auto-unlocks using a static internal key.
    *   Designed for deployments behind external auth providers (Auth0, etc.).
    *   Disables auto-lock and manual logout.

## 6. Current Feature Set
*   **Authentication:** PIN creation and login (Unlock).
*   **Dashboard:** 
    *   Responsive Grid Layout (Desktop) / List Layout (Mobile).
    *   Grouped by Category.
    *   Search/Filter.
*   **TOTP:** Real-time 30s countdown, linear progress bar, "Show Next Code".
*   **CRUD:**
    *   **Create:** Scan QR Code (camera), Batch Import QR Images (multiple files), or Manual Entry.
    *   **Read:** View codes (masked/unmasked), Copy actions.
    *   **Update:** Edit Account details.
    *   **Delete:** Remove account.
*   **Sync:**
    *   **P2P Sync:** Wireless vault transfer between devices using PeerJS (WebRTC).
*   **Settings:**
    *   Dark Mode/Light Mode toggles.
    *   Security toggles (Auto-reveal, Auto-lock duration).
    *   Backup & Restore (Encrypted/Raw/QR Codes ZIP).
*   **Help:** User guide modal.

### Export QR Codes Feature
The QR export feature allows users to export all accounts as individual QR code images in a ZIP file:
*   **Usage:** Click "Backup" in Settings, then select "Export as QR Codes (ZIP)".
*   **Processing:** Each account with a secret is converted to an `otpauth://` URI and generated as a QR code PNG image.
*   **File Format:** All QR codes are packaged into a single ZIP file for easy download.
*   **Filename:** Each QR code is named with the format `{number}_{issuer}_{label}.png`.
*   **Use Case:** Useful for migrating to other authenticator apps or printing physical backup codes.

### Batch QR Import Feature
The batch import feature allows users to import multiple QR code images simultaneously:
*   **Usage:** Click "Import QR Images" button on the Add Account screen.
*   **File Selection:** Select multiple image files containing QR codes.
*   **Processing:** Each image is scanned using `html5-qrcode` library.
*   **Auto-save:** Valid accounts are automatically added to the vault.
*   **Summary:** Displays success/failure count after processing.
*   **Auto-close:** Returns to home screen after completion.
*   **Error Handling:** Individual file failures don't stop the batch process.

## 7. Development Guidelines for AI
When asked to modify the code:
1.  **Always** provide the full XML block `<changes>...</changes>` for file updates.
2.  **Maintain** the `importmap` style imports. Do not add `import ... from 'react'` assuming it is installed locally via npm. Use the module names defined in `index.html`.
3.  **Style:** Use Tailwind CSS utility classes. Mobile-first design is a priority, but ensure desktop responsiveness.
4.  **State:** Keep complex state in `App.tsx` and pass down handlers/data to components.
5.  **Security:** Never log secrets or passwords to the console.
6.  **Changelog:** When making significant changes, update `CHANGELOG.md` following the [Keep a Changelog](https://keepachangelog.com/) format. Use categories: Added, Changed, Deprecated, Removed, Fixed, Security.

## 8. Future Roadmap (Context for Requests)
*   **S3 Sync:** Implementing actual S3 upload/download logic in `cryptoService` (UI exists, logic pending).
*   **Nostr Sync:** Decentralized storage using NIP-04/NIP-44 encrypted events (UI exists, logic pending).
