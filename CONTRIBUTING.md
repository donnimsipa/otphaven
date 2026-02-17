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
4. Test P2P sync between devices
5. Test import/export features
6. Verify encryption/decryption works correctly

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
