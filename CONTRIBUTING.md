# Contributing to Endless Path

## Code Quality Standards
- **TypeScript**: All code must be written in TypeScript with strict type checking.
- **Clean Architecture**: Follow the established separation of concerns (frontend/backend/payment).
- **Modularity**: Create reusable components and utility functions.
- **Testing**: Include unit and integration tests for new features.
- **Documentation**: Update README and other relevant documentation for any changes.

## Development Workflow
1. Create a feature branch.
2. Implement changes following the standards.
3. Run linting and tests.
4. Submit a pull request for review.

## Security First
- Never log sensitive data (PII, secrets, tokens).
- Always validate inputs using Zod schemas.
- Ensure all API requests are authenticated and authorized.
- Follow PCI-DSS standards for payment-related changes.
