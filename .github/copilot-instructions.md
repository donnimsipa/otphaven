# otphaven Development Guidelines

## Technical Stack
- **Framework**: React 18+ (Vite)
- **Runtime/Package Manager**: Bun
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Animations**: Framer Motion
- **Encryption**: AES-256 (via Crypto-JS)
- **TOTP**: otpauth

## Core Principles
1. **Local-First & Privacy**: All sensitive data (secrets, tokens) must stay in `localStorage`. Never implement features that send raw secrets to any backend.
2. **Security**: Ensure encryption/decryption logic is robust. Master PIN is the only key.
3. **Mobile-First Design**: The UI must be perfect on small screens but scale elegantly to desktop.
4. **Performance**: Use Bun's speed and Vite's HMR. Keep the bundle size small.

## Code Style
1. **Components**: Use functional components with hooks.
2. **UI/UX**: Prioritize premium aesthetics (glassmorphism, smooth animations, harmonious color palettes).
3. **Tailwind**: Use utility classes for all styling. Use the brand colors defined in `index.html`.
4. **Self-Documenting**: Write clean code with meaningful names. Add comments only for complex encryption or sync logic.

## Deployment
- **Docker**: Project includes a multi-stage Dockerfile using Nginx for production.
- **GitHub Workflow**: Automated CI/CD for Docker images (GHCR) and GitHub Pages exists in `.github/workflows/`.
