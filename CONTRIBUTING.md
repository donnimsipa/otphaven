# Contributing to otphaven

Thank you for your interest in contributing to otphaven! We welcome contributions from the community.

## 🤝 How to Contribute

### Reporting Bugs

If you find a bug, please open an issue with:
- A clear, descriptive title
- Steps to reproduce the issue
- Expected vs actual behavior
- Browser and OS information
- Screenshots if applicable

### Suggesting Features

Feature requests are welcome! Please:
- Check if the feature has already been requested
- Clearly describe the feature and its use case
- Explain why it would be useful to most users

### Pull Requests

1. **Fork the repository** and create your branch from `master`
2. **Install dependencies:**
   ```bash
   bun install
   # or
   npm install
   ```

3. **Make your changes:**
   - Follow the existing code style
   - Write clear, descriptive commit messages
   - Test your changes thoroughly

4. **Update documentation:**
   - Update `README.md` if you change functionality
   - Update `AGENTS.md` if you change architecture
   - Update `CHANGELOG.md` following [Keep a Changelog](https://keepachangelog.com/) format

5. **Test your changes:**
   ```bash
   bun run dev
   # or
   npm run dev
   ```

6. **Submit your pull request:**
   - Provide a clear description of the changes
   - Reference any related issues
   - Ensure all checks pass

## 📋 Development Guidelines

### Code Style

- **TypeScript:** Use TypeScript for type safety
- **React:** Functional components with hooks
- **Styling:** Tailwind CSS utility classes (mobile-first)
- **Imports:** Use the importmap style defined in `index.html`
- **Formatting:** Keep code clean and readable

### Project Structure

- **No `src/` folder:** All source files are in the project root
- **Components:** Place reusable UI in `components/`
- **Services:** Place business logic in `services/`
- **Types:** Define interfaces in `types.ts`

### P2P Sync Architecture

The P2P synchronization system follows a strict ownership model:

- **`P2PService` (`services/p2pService.ts`)** — stateless WebRTC wrapper. Handles connection lifecycle, ACK delivery, retries, and reconnection. Must not hold any React state.
- **`App.tsx`** — sole owner of the `P2PService` instance. Instantiates on vault unlock, destroys on vault lock/logout/unload. All P2P state (status, logs, room code) lives here.
- **`P2PSync.tsx` (`components/P2PSync.tsx`)** — pure presentational component. Receives all state and handlers via props. Has **no** `useEffect` cleanup that destroys the connection.

**Key invariants to preserve:**
- Never call `p2pService.destroy()` from `P2PSync`'s unmount.
- Incoming delta updates must **not** be re-broadcast; only explicit local changes (`handleSaveAccount`, `deleteAccount`, `handleBatchImageImport`, etc.) should call `sendAccountChange`.
- The empty-delta `DELTA_UPDATE` message is the sync probe. Do not repurpose or filter it.

### Commit Messages

Follow conventional commits format:

```
feat: add batch QR import feature
fix: resolve iOS Safari compatibility issue
docs: update deployment instructions
chore: update dependencies
security: improve encryption key derivation
```

### Security Considerations

- **Never log secrets** or passwords to console
- **Test encryption/decryption** thoroughly
- **Consider mobile browsers** (Safari, Firefox iOS)
- **Validate user input** before processing
- **Document security implications** of changes

## 🧪 Testing

Before submitting:

1. Test on multiple browsers (Chrome, Firefox, Safari)
2. Test on mobile devices (iOS and Android)
3. Test offline functionality
4. Test import/export features
5. Verify encryption/decryption works correctly

### P2P Sync Testing Checklist

When modifying anything related to `p2pService.ts`, `App.tsx` P2P state, or `P2PSync.tsx`:

- [ ] Pair two browser tabs (or devices) and verify the initial vault merge happens automatically
- [ ] Add an account on one peer while the P2P screen is **not** visible; verify it appears on the other peer
- [ ] Edit and delete accounts; verify changes sync bidirectionally
- [ ] Batch-import QR images; verify each account appears on the peer
- [ ] Change a setting; verify the setting syncs to the peer
- [ ] Close the connection on one side; verify the client reconnects automatically without a new code
- [ ] Navigate away from the P2P screen mid-session; verify the connection **does not** drop
- [ ] Lock the vault; verify the P2P connection is destroyed and state is cleared
- [ ] Add accounts on both peers simultaneously while offline, then reconnect; verify both sides converge correctly without duplicates or loops

## 📝 Changelog Updates

When making changes, update `CHANGELOG.md`:

- Add entry under `[Unreleased]` section
- Use appropriate category: Added, Changed, Fixed, Security, etc.
- Write user-focused descriptions
- Move to versioned section when releasing

Example:
```markdown
## [Unreleased]

### Added
- Batch QR code import from multiple image files

### Fixed
- QR scanner compatibility on iOS Safari
```

### Releasing a New Version

Releases are automated via GitHub Actions:

1. Update version in `package.json`:
   ```bash
   # Manually edit package.json or use npm version
   npm version patch  # 1.1.7 -> 1.1.8
   npm version minor  # 1.1.7 -> 1.2.0
   npm version major  # 1.1.7 -> 2.0.0
   ```

2. Update `CHANGELOG.md`:
   - Move `[Unreleased]` items to new version section
   - Add release date
   - Update version links at bottom

3. Update service worker cache version in `sw.js`:
   ```javascript
   const CACHE_NAME = 'otphaven-v1.1.8';
   ```

4. Commit and push to `master`:
   ```bash
   git add package.json CHANGELOG.md sw.js
   git commit -m "chore: release v1.1.8"
   git push origin master
   ```

5. GitHub Actions will automatically:
   - Create git tag (e.g., `v1.1.8`)
   - Create GitHub Release with changelog notes
   - Trigger Docker image builds
   - Deploy to GitHub Pages

No need to manually run `git tag` or `git push --tags`!

## 🔒 Security Issues

If you discover a security vulnerability:

1. **DO NOT** open a public issue
2. Email the maintainer directly (check package.json for contact)
3. Provide detailed information about the vulnerability
4. Allow time for a fix before public disclosure

## 📄 License

By contributing, you agree that your contributions will be licensed under the MIT License.

## ❓ Questions?

Feel free to open an issue for questions or join discussions in the repository.

Thank you for contributing to otphaven! 🎉
