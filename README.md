# otphaven - Secure 2FA Vault

otphaven is a standalone, mobile-first web application designed for securely storing and generating TOTP (2FA) codes. It runs entirely in your browser, ensuring your secrets never leave your device unless you explicitly sync or back them up.

## 🚀 Key Features

- **Local-first Security:** Data is encrypted using AES-256 (PBKDF2) with your master PIN.
- **Offline Generation:** TOTP codes are generated purely on the client side.
- **Continuous Real-Time P2P Sync:** Sync your vault across devices wirelessly using PeerJS (WebRTC). The connection stays alive in the background — changes on one device appear on the other instantly, even while navigating away from the sync screen.
- **Automatic Reconnection:** If a connection drops, the client peer automatically reconnects using exponential backoff without requiring a new pairing code.
- **QR Scanning:** Easily add accounts by scanning QR codes with your camera.
- **Batch QR Import:** Import multiple QR code images at once — imported accounts are automatically synced to connected peers.
- **Responsive Design:** Optimized for mobile but fully functional on desktop.
- **Privacy Oriented:** No backend required for core functionality.

## 🛠️ Tech Stack

- **Framework:** React 18
- **Bundler:** Vite
- **Styling:** Tailwind CSS
- **Icons:** Lucide React
- **Animations:** Framer Motion
- **Encryption:** Crypto-JS
- **TOTP Logic:** OTPAuth

## 🚀 Deploy Your Instance (Recommended)

**Fork this repository** and deploy to Vercel/Netlify/Cloudflare for free. This gives you control over updates.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/donnimsipa/otphaven)
[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/donnimsipa/otphaven)
[![Deploy to Cloudflare Pages](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/donnimsipa/otphaven)

## 💻 Local Development

**Prerequisites:** [Bun](https://bun.sh/) (recommended, faster) or [Node.js](https://nodejs.org/)

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/yourusername/otphaven.git
    cd otphaven
    ```

2.  **Install dependencies:**
    ```bash
    bun install
    # or
    npm install
    ```

3.  **Run the development server:**
    ```bash
    bun run dev
    # or
    npm run dev
    ```

4.  **Open your browser:**
    Navigate to `http://localhost:3000` to view the app.

## 🐳 Docker Deployment

You can run otphaven using Docker with two variants:

### Standard Version (with PIN protection)
```bash
docker pull ghcr.io/donnimsipa/otphaven:latest
docker run -d -p 8080:80 --name otphaven ghcr.io/donnimsipa/otphaven:latest
```

### No-PIN Version (auto-unlock, requires external auth)
```bash
docker pull ghcr.io/donnimsipa/otphaven:latest-nopin
docker run -d -p 8080:80 --name otphaven ghcr.io/donnimsipa/otphaven:latest-nopin
```

**Or build locally:**

1.  **Build the image:**
    ```bash
    # Standard version
    docker build -t otphaven .
    
    # No-PIN version
    docker build --build-arg VITE_DISABLE_PIN=true -t otphaven:nopin .
    ```

2.  **Run the container:**
    ```bash
    docker run -d -p 8080:80 --name otphaven otphaven
    ```

3.  **Access the app:**
    Open your browser and go to `http://localhost:8080`.

## ⚙️ Advanced Configuration

otphaven supports environment variables for specialized deployments:

- `VITE_DISABLE_PIN`: Set to `true` to disable the internal PIN lock screen. 
    - **⚠️ WARNING:** When this is enabled, your vault is protected by a static internal key. You **MUST** manage authentication and access security yourself using external tools like Auth0, Authelia, Cloudflare Access, or a reverse proxy with OIDC. Failure to do so will leave your 2FA codes exposed to anyone who can access the URL.
- `VITE_BASE_PATH`: Set this if you are deploying to a sub-folder (e.g., `/my-app/`).
- `VITE_LOGIN_MESSAGE`: Set a custom message to be displayed on the PIN/Lock screen.

## 🌐 Manual Nginx Deployment

If you want to deploy to a manual Nginx server:

1.  **Build the project:** `bun run build`.
2.  **Copy the `dist/` folder** to your server.
3.  **Configure Nginx** to serve the `index.html` for all routes (see `nginx.conf` in this repo for a reference).

## 🔄 P2P Sync

otphaven supports continuous real-time synchronization between two devices using WebRTC (PeerJS). No server or account is required.

### How It Works

1. Open **Settings → Sync Method → P2P Sync** on both devices.
2. On the first device (Host), tap **Generate Room Code**.
3. On the second device (Client), enter the 4-digit code and tap connect.
4. Both devices perform an **automatic initial full-vault merge**.
5. From that point on, all changes (add, edit, delete accounts, import, settings) are transmitted as **incremental delta updates** in real time — even when the P2P screen is not visible.

### Sync Behaviour

| Event | Sync Method |
|---|---|
| Initial connection | Full vault exchange (both directions) |
| Add / Edit / Delete account | Incremental delta update |
| Batch QR import | Per-account delta update |
| Restore from backup | Full vault push |
| Settings change | Full vault push |

### Connection Lifecycle

- The P2P connection **stays alive in the background** while you use the app normally.
- If the connection drops, the **client automatically reconnects** using exponential backoff (3 s → 6 s → 12 s … up to 30 s, max 5 attempts).
- The host remains in listening mode and accepts the reconnecting client without requiring a new code.
- The connection is destroyed only when the vault is locked, the user logs out, or the browser tab is closed.

### Conflict Resolution

Conflicts are resolved using **last-write-wins** based on the `updatedAt` timestamp stored on each account. If a remote change is older than the local copy, the local version is pushed back to the sender to reconcile state. The same change ID is never processed twice, preventing infinite sync loops.

## 🛡️ Security Disclaimer

**Master PIN:** Always remember your master PIN. If you forget it, there is no "password reset" because your data is encrypted locally with that PIN. Your data is stored in your browser's `localStorage`. Clearing your browser data will delete your vault unless you have a backup.

**No-PIN Mode:** If you enable `VITE_DISABLE_PIN`, you are responsible for the security of the application layer. Ensure you have robust authentication (like Auth0, Okta, or Authelia) in front of the application.

## 📝 Changelog

See [CHANGELOG.md](CHANGELOG.md) for a detailed history of changes and releases.

Releases are automatically created when the version in `package.json` is updated and pushed to the `master` branch.

## 🤝 Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines on how to contribute to this project.

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.
