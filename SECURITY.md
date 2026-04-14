# Security Policy - Endless Path

## Reporting a Vulnerability
If you discover a security vulnerability within Endless Path, please report it privately to our security team.

## Supported Versions
Only the latest version of Endless Path is supported for security updates.

## Security Measures
- **Authentication**: All API requests require a valid Firebase ID Token.
- **Authorization**: Role-based access control (RBAC) is enforced at the API and database levels.
- **Input Validation**: All incoming data is validated using Zod schemas.
- **Security Headers**: Helmet is used to set secure HTTP headers.
- **Rate Limiting**: API requests are limited to prevent DoS attacks.
- **Payment Security**: Razorpay handles all sensitive payment data; no card details are stored.
- **Encryption**: All data in transit is encrypted via HTTPS (TLS 1.2+).
- **Logging**: Structured logging is implemented, ensuring no sensitive data (PII or secrets) is logged.
