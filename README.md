# otphaven - Secure 2FA Vault

otphaven is a standalone, mobile-first web application designed for securely storing and generating TOTP (2FA) codes. It runs entirely in your browser, ensuring your secrets never leave your device unless you explicitly sync or back them up.

## 🚀 Key Features

- **Local-first Security:** Data is encrypted using AES-256 (PBKDF2) with your master PIN.
- **Offline Generation:** TOTP codes are generated purely on the client side.
- **P2P Sync:** Sync your vault across devices wirelessly using PeerJS (WebRTC).
- **QR Scanning:** Easily add accounts by scanning QR codes.
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

## � Deploy Your Instance (Recommended)

**Fork this repository** and deploy to Vercel/Netlify for free. This gives you control over updates.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/donnimsipa/otphaven/tree/latest)
[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/donnimsipa/otphaven&branch=latest)

## 💻 Local Development

**Prerequisites:** [Bun](https://bun.sh/) (recommended, faster) or [Node.js](https://nodejs.org/)

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/donnimsipa/otphaven.git
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


## 🛡️ Security Disclaimer

**Master PIN:** Always remember your master PIN. If you forget it, there is no "password reset" because your data is encrypted locally with that PIN. Your data is stored in your browser's `localStorage`. Clearing your browser data will delete your vault unless you have a backup.

**No-PIN Mode:** If you enable `VITE_DISABLE_PIN`, you are responsible for the security of the application layer. Ensure you have robust authentication (like Auth0, Okta, or Authelia) in front of the application.

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.
