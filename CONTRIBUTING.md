# Contributing to Sahara

Thank you for your interest in contributing to Sahara! We welcome contributions from the community to help make disaster relief more transparent and efficient.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [How to Contribute](#how-to-contribute)
- [Development Workflow](#development-workflow)
- [Pull Request Process](#pull-request-process)
- [Coding Standards](#coding-standards)
- [Testing Guidelines](#testing-guidelines)
- [Reporting Bugs](#reporting-bugs)
- [Suggesting Enhancements](#suggesting-enhancements)

## Code of Conduct

This project and everyone participating in it is governed by our [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code. Please report unacceptable behavior to the project maintainers.

## Getting Started

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/sahara.git
   cd sahara
   ```
3. **Set up the development environment** by following the [SETUP.md](SETUP.md) guide
4. **Create a new branch** for your feature or bug fix:
   ```bash
   git checkout -b feature/your-feature-name
   ```

## How to Contribute

### Types of Contributions

We welcome various types of contributions:

- **Bug fixes**: Fix issues in the codebase
- **New features**: Add new functionality to the platform
- **Documentation**: Improve or add documentation
- **Tests**: Add or improve test coverage
- **UI/UX improvements**: Enhance the user interface and experience
- **Performance optimizations**: Improve code efficiency
- **Security enhancements**: Strengthen security measures

## Development Workflow

1. **Make your changes** in your feature branch
2. **Test your changes** thoroughly:
   - Run the Anchor tests: `anchor test`
   - Test the frontend locally
   - Ensure all existing tests pass
3. **Commit your changes** with clear, descriptive commit messages:
   ```bash
   git commit -m "feat: add beneficiary search functionality"
   ```
4. **Push to your fork**:
   ```bash
   git push origin feature/your-feature-name
   ```
5. **Open a Pull Request** on GitHub

### Commit Message Convention

We follow conventional commit messages:

- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `style:` - Code style changes (formatting, etc.)
- `refactor:` - Code refactoring
- `test:` - Adding or updating tests
- `chore:` - Maintenance tasks

Example: `feat: add multi-signature verification for beneficiaries`

## Pull Request Process

1. **Ensure your PR**:

   - Has a clear title and description
   - References any related issues (e.g., "Fixes #123")
   - Includes tests for new functionality
   - Updates documentation if needed
   - Passes all existing tests

2. **PR Review**:

   - Maintainers will review your PR
   - Address any feedback or requested changes
   - Once approved, your PR will be merged

3. **After Merge**:
   - Delete your feature branch
   - Pull the latest changes from main

## Coding Standards

### Rust (Anchor Program)

- Follow Rust naming conventions
- Use `cargo fmt` to format code
- Run `cargo clippy` to catch common mistakes
- Add comments for complex logic
- Write unit tests for new functions

### TypeScript/React (Frontend)

- Use TypeScript for type safety
- Follow React best practices and hooks patterns
- Use functional components
- Keep components small and focused
- Add JSDoc comments for complex functions
- Use meaningful variable and function names

### General Guidelines

- Write clean, readable code
- Keep functions small and focused
- Avoid code duplication
- Handle errors appropriately
- Add comments for complex logic
- Update documentation when needed

## Testing Guidelines

### Anchor Program Tests

- Write integration tests in `sahara-core/tests/`
- Test all instruction handlers
- Test edge cases and error conditions
- Ensure tests are deterministic

### Frontend Testing

- Test critical user flows
- Test component rendering
- Test error handling
- Use meaningful test descriptions

## Reporting Bugs

When reporting bugs, please include:

1. **Clear title** describing the issue
2. **Steps to reproduce** the bug
3. **Expected behavior** vs actual behavior
4. **Environment details**:
   - OS and version
   - Node.js version
   - Rust/Anchor version
   - Browser (for frontend issues)
5. **Screenshots or logs** if applicable
6. **Possible solution** if you have one

Use the GitHub issue tracker to report bugs.

## Suggesting Enhancements

We welcome feature suggestions! When suggesting enhancements:

1. **Check existing issues** to avoid duplicates
2. **Provide a clear description** of the feature
3. **Explain the use case** and benefits
4. **Consider implementation** if possible
5. **Be open to discussion** and feedback

## Development Setup

For detailed setup instructions, see [SETUP.md](SETUP.md).

### Quick Setup

```bash
# Install dependencies
cd sahara-core && anchor build
cd ../frontend && npm install

# Run tests
cd ../sahara-core && anchor test

# Start development
cd ../frontend && npm run dev
```

## Questions?

If you have questions about contributing:

- Check the [README.md](README.md) for project overview
- Review [SETUP.md](SETUP.md) for setup help
- Open a GitHub issue for specific questions
- Reach out to maintainers

## Recognition

Contributors will be recognized in our project documentation. Thank you for helping make disaster relief more transparent and efficient!

---

**Thank you for contributing to Sahara!** 🙏

Every contribution, no matter how small, helps us build a better platform for disaster relief.
