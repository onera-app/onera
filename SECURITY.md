# Security Policy

Security is a top priority for Onera. As an end-to-end encrypted AI chat application, we take every report of a potential vulnerability seriously and are committed to addressing issues promptly.

## Reporting a Vulnerability

If you discover a security vulnerability in Onera, please report it responsibly.

**Email:** security@onera.chat

**Do NOT open public GitHub issues for security vulnerabilities.** Public disclosure of a vulnerability before a fix is available puts all users at risk.

### What to Include

- A clear description of the vulnerability
- Steps to reproduce the issue
- An assessment of the potential impact
- A suggested fix, if you have one

### Response Timeline

- **Acknowledgment:** Within 48 hours of your report
- **Status update:** Within 7 days, including an initial assessment and expected timeline for a fix

## Scope

### In Scope

- E2EE implementation (`@onera/crypto` package)
- Authentication and session management
- Key derivation and storage
- Server-side API security
- WebAuthn implementation
- Private inference enclave security

### Out of Scope

- Third-party services (Clerk, LLM providers)
- Social engineering attacks
- Denial of service attacks
- Vulnerabilities in dependencies (please report these upstream to the respective maintainers)

## Disclosure Policy

Onera follows a coordinated disclosure model with a **90-day timeline**. After a vulnerability is reported:

1. We will work to verify and develop a fix within the disclosure window.
2. We aim to release fixes before any public disclosure.
3. Once a fix is released, we will publish an advisory detailing the vulnerability and the remediation.

We will credit reporters in security advisories unless they prefer to remain anonymous.

## Supported Versions

Only the latest release of Onera is supported with security updates. We strongly recommend that all users run the most recent version.
