# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.1.9] - 2026-02-22

### Added
- Auto-release GitHub Actions workflow for automatic tagging and releases
- PostCSS configuration for production-ready Tailwind CSS
- Tailwind config file with custom theme
- Dedicated styles.css for Tailwind directives

### Changed
- Migrated from Tailwind CDN to PostCSS plugin for production builds
- Updated service worker to cache compiled CSS instead of CDN
- Improved build performance with proper Tailwind purging

### Fixed
- Removed Tailwind CDN warning in production builds
- Better CSS optimization and smaller bundle size

## [1.1.8] - 2026-02-22

### Changed
- Improved offline PWA capability with comprehensive service worker caching
- Updated service worker to cache all esm.sh dependencies (React, libraries)
- Enhanced fetch handler to cache CDN resources (Tailwind, Google Fonts)
- Replaced external CDN icons with embedded SVG data URIs in manifest
- Added cache cleanup on service worker activation
- Added offline fallback for better resilience

### Fixed
- PWA now fully functional offline after initial online visit
- Service worker cache version updated to match app version
- Manifest icons no longer require network requests

## [1.1.7] - 2026-02-17

### Added
- QR code generation functionality for exporting accounts
- ZIP file handling for packaging multiple QR codes
- Export accounts as QR code images in ZIP format
- Dependencies: `qrcode` (^1.5.4) and `jszip` (^3.10.1)

### Fixed
- QR code import compatibility issues on Firefox iOS
- Multiple QR code import handling on iOS devices

### Changed
- Enhanced export feature with better file handling
- Improved cross-browser compatibility for import/export operations

## [1.1.6] - 2026-02-17

### Changed
- Enhanced export feature with improved user experience

## [1.1.5] - 2026-02-17

### Fixed
- Multiple QR code import issues on iOS Safari
- Improved reliability of batch import on mobile devices

## [1.1.4] - 2026-02-17

### Added
- Batch QR code image import functionality
- Support for importing multiple QR code images simultaneously
- Auto-save feature for imported accounts
- Import summary with success/failure count
- Cloudflare Workers deployment configuration (`wrangler.toml`)

### Changed
- Improved Scanner component for better batch processing
- Enhanced Settings UI for import/export operations
- Updated documentation with Cloudflare Workers deployment guide

### Fixed
- Cloudflare Workers deployment compatibility issues

## [1.1.3] - 2026-02-17

### Changed
- Improved No-PIN mode auto-unlock flow
- Enhanced security messaging for No-PIN deployments
- Better user guidance for authentication requirements

### Security
- Clarified security implications of No-PIN mode
- Added warnings about external authentication requirements

## [1.1.2] - 2026-02-17

### Added
- No-PIN Docker variant (`latest-nopin` tag)
- Deployment buttons for Vercel, Netlify, and Cloudflare Pages
- Docker build support for No-PIN mode via `VITE_DISABLE_PIN` build arg

### Changed
- Enhanced Docker deployment documentation
- Improved README with deployment options
- Updated GitHub Actions workflow for multi-variant Docker builds

### Fixed
- Newline rendering in custom login message

## [1.1.1] - 2026-02-17

### Fixed
- Custom login message now properly renders newlines
- Improved text formatting on PIN/Lock screen

## [1.1.0] - 2026-02-17

### Added
- No-PIN mode for deployments behind external authentication
- Custom login message support via `VITE_LOGIN_MESSAGE` environment variable
- Auto-unlock functionality when PIN is disabled
- Configuration option to skip PIN screen entirely

### Changed
- PIN screen now supports custom messaging
- Auto-lock behavior disabled in No-PIN mode
- Manual logout disabled when PIN protection is off

### Security
- Added `VITE_DISABLE_PIN` environment variable for specialized deployments
- Static internal key used for vault encryption in No-PIN mode
- Documentation emphasizes need for external authentication when PIN is disabled

## [1.0.0] - 2026-02-17

### Added
- Initial release of otphaven
- PIN-based authentication system
- AES-256 encryption with PBKDF2 key derivation
- TOTP code generation with real-time 30-second countdown
- QR code scanning for adding accounts
- Manual account entry
- Responsive dashboard with grid (desktop) and list (mobile) layouts
- Category-based account grouping
- Search and filter functionality
- P2P sync via WebRTC (PeerJS)
- Dark mode and light mode themes
- Auto-reveal toggle for TOTP codes
- Show next code feature
- Auto-lock with configurable duration
- Encrypted backup and restore
- Raw JSON export/import
- Copy to clipboard functionality
- Account CRUD operations (Create, Read, Update, Delete)
- Service Worker for offline functionality
- Progressive Web App (PWA) support
- Docker deployment support
- Nginx configuration for production deployment
- GitHub Actions CI/CD workflows
- Vite-based build system
- TypeScript support
- Tailwind CSS styling
- Lucide React icons
- Framer Motion animations

### Security
- Client-side encryption using Crypto-JS
- No backend required for core functionality
- Data stored in browser localStorage
- Secrets never leave device unless explicitly synced

[unreleased]: https://github.com/donnimsipa/otphaven/compare/v1.1.9...HEAD
[1.1.9]: https://github.com/donnimsipa/otphaven/compare/v1.1.8...v1.1.9
[1.1.8]: https://github.com/donnimsipa/otphaven/compare/v1.1.7...v1.1.8
[1.1.7]: https://github.com/donnimsipa/otphaven/compare/v1.1.6...v1.1.7
[1.1.6]: https://github.com/donnimsipa/otphaven/compare/v1.1.5...v1.1.6
[1.1.5]: https://github.com/donnimsipa/otphaven/compare/v1.1.4...v1.1.5
[1.1.4]: https://github.com/donnimsipa/otphaven/compare/v1.1.3...v1.1.4
[1.1.3]: https://github.com/donnimsipa/otphaven/compare/v1.1.2...v1.1.3
[1.1.2]: https://github.com/donnimsipa/otphaven/compare/v1.1.1...v1.1.2
[1.1.1]: https://github.com/donnimsipa/otphaven/compare/v1.1.0...v1.1.1
[1.1.0]: https://github.com/donnimsipa/otphaven/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/donnimsipa/otphaven/releases/tag/v1.0.0
