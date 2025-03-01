# Contributing to WCAG Scanner

First off, thank you for considering contributing to WCAG Scanner! It's people like you that make this tool valuable for the community. This document provides guidelines and steps for contributing.

## Code of Conduct

By participating in this project, you are expected to uphold our [Code of Conduct](CODE_OF_CONDUCT.md). Please report unacceptable behavior to [sinhaparth555@gmail.com](mailto:sinhaparth555@gmail.com).

## How Can I Contribute?

### Reporting Bugs

This section guides you through submitting a bug report. Following these guidelines helps maintainers understand your report, reproduce the issue, and fix it.

Before creating bug reports, please check [the issue list](https://github.com/sinhaparth5/wcag-scanner/issues) as you might find out that you don't need to create one.

When you are creating a bug report, please include as many details as possible:

* **Use a clear and descriptive title** for the issue
* **Describe the exact steps to reproduce the problem** with as much detail as possible
* **Provide specific examples** to demonstrate the steps
* **Describe the behavior you observed** and what you expected to see
* **Include screenshots or animated GIFs** if possible
* **If relevant, include code that demonstrates the issue**
* **Include details about your environment** (OS, browser, Node.js version, etc.)

### Suggesting Enhancements

This section guides you through submitting an enhancement suggestion, including completely new features and minor improvements to existing functionality.

* **Use a clear and descriptive title** for the issue
* **Provide a step-by-step description of the suggested enhancement** with as much detail as possible
* **Provide specific examples to demonstrate the steps** or point to similar features in other applications
* **Describe the current behavior** and **explain which behavior you expected to see instead**
* **Explain why this enhancement would be useful** to most WCAG Scanner users

### Pull Requests

The process described here has several goals:

- Fix problems that are important to users
- Enable a sustainable system for maintainers to review contributions
- Maintain quality standards

Please follow these steps to submit a pull request:

1. **Fork the repository** and create your branch from `main`.
2. **Install development dependencies** with `npm install`.
3. **Make your changes** following the coding style.
4. **Add tests** for any new functionality.
5. **Ensure the test suite passes** with `npm test`.
6. **Make sure your code lints** with `npm run lint`.
7. **Update documentation** if necessary.
8. **Submit your pull request!**

## Development Environment Setup

### Prerequisites

- Node.js (version >= 16.0.0)
- npm or yarn

### Setup Steps

1. Fork the repository
2. Clone your fork:
   ```bash
   git clone https://github.com/sinhaparth5/wcag-scanner.git
   cd wcag-scanner
   ```
3. Install dependencies
   ```bash
   npm install
   ```
4. Create a branch for your changes
   ```bash
   git switch -c feature-branch
   ```
5. Make your changes and write tests
6. Run Tests
   ```bash
   npm test
   ```
7. Run linting
   ```bash
   npm run lint
   ```

## Coding Standards
### TypeScript Style Guide
We follow the [Airbnb TypeScript Style Guide](https://github.com/airbnb/javascript) with some modifications defined in our `eslintrc.config.js` file.

Key points:
 - Use 2 spaces for indentation
 - Use single quotes for strings
 - Use camelCase for variables and functions
 - Use PascalCase for classes and interfaces
 - Add proper JSDoc comments for all public APIs
 - Maximum line length is 100 characters

### Testing

 - All new features should have accompanying tests
 - Aim for high test coverage
 - Both unit and integration tests are appreciated

### Documentation

 - Document all public APIs using JSDoc comments
 - Update README.md if necessary
 - Update any relevant documentation in /docs folder
 - Document complex algorithms and workflows

### Accessibility Standards
As this is an accessibility tool, we hold ourselves to high standards:

1. All new UI components must meet WCAG 2.1 AA standards at minimum
2. Follow semantic HTML practices
3. Test with screen readers when applicable
4. Ensure keyboard navigability

### Git Commit Messages

 - Use the present tense ("Add feature" not "Added feature")
 - Use the imperative mood ("Move cursor to..." not "Moves cursor to...")
 - Limit the first line to 72 characters or less
 - Reference issues and pull requests liberally after the first line
 - Consider starting the commit message with an applicable emoji:

   - 🚀 :rocket: when adding features
   - 🐛 :bug: when fixing bugs
   - 📝 :memo: when adding documentation
   - 🎨 :art: when improving code structure
   - ⚡️ :zap: when improving performance
   - 🧪 :test_tube: when adding tests



### Review Process
The project maintainers will review your pull request. They might suggest changes, improvements, or alternatives.

Some things that will increase the chance that your pull request is accepted:

- Write tests
- Follow style guidelines
- Write good commit messages
- Add documentation

### Community
Join the conversation about WCAG Scanner:

- GitHub Discussions
- Stack Overflow

### Recognition
Contributors are recognized in our README.md and in release notes. We appreciate the time and effort you put into improving this project!

***

Thank you for reading through our contribution guidelines. We're excited to see what you build and how you can help improve accessibility on the web through WCAG Scanner!
