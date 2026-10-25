# Security policy

## Supported versions

The latest `main` branch is supported for security fixes.

## Reporting a vulnerability

Please use GitHub's private vulnerability reporting or open a minimal issue that does not disclose exploit details. Do not include secrets, personal data, or production credentials.

## Design controls

- No endpoint exposes arbitrary shell execution or unrestricted filesystem access.
- Supplied code is parsed or analyzed; it is not executed.
- Inputs are size-limited and validated; errors do not leak secrets.
- Optional provider credentials are read from environment variables and never returned.
- CORS defaults to local development origins.
- SQLite history is local and user-clearable.

## Deployment notes

This MVP has no built-in authentication or rate limiting. Put it behind an authenticated gateway, enforce TLS, restrict CORS, and add rate limits before exposing it to untrusted networks.

## Out of scope

The deterministic analysis is decision support. It does not provide legal, medical, financial, or compliance certification.
