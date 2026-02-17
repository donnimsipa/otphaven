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

## 💻 Local Development

**Prerequisites:** [Node.js](https://nodejs.org/) and [Bun](https://bun.sh/) (optional, but recommended).

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

## � Docker Deployment

You can also run otphaven using Docker.

1.  **Build the image:**
    ```bash
    docker build -t otphaven .
    ```

2.  **Run the container:**
    ```bash
    docker run -d -p 8080:80 --name otphaven otphaven
    ```

3.  **Access the app:**
    Open your browser and go to `http://localhost:8080`.

## 🌐 Manual Nginx Deployment

If you want to deploy to a manual Nginx server:

1.  **Build the project:** `bun run build`.
2.  **Copy the `dist/` folder** to your server.
3.  **Configure Nginx** to serve the `index.html` for all routes (see `nginx.conf` in this repo for a reference).


## �🔒 Security Disclaimer

Always remember your master PIN. If you forget it, there is no "password reset" because your data is encrypted locally with that PIN. Your data is stored in your browser's `localStorage`. Clearing your browser data will delete your vault unless you have a backup.

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.
