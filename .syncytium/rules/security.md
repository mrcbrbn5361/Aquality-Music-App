---
id: security
title: Security & Safe Coding
description: 'Security rules, secrets handling, and sanitization'
alwaysApply: true
globs: []
tags:
  - security
  - compliance
---
## Security Guidelines
- Never commit secrets, API keys, tokens, or credentials into source control.
- Validate all incoming user input and payloads against strong schemas.
- Prevent injection attacks (SQL, command execution, XSS, template injection).
- All Google OAuth responses must use `escapeHtml()` to prevent reflected XSS.
- Port 9863 REST API must reject unauthorized external web origins with HTTP 403 Forbidden.
- State-mutating endpoints on Port 9863 require valid Bearer token authentication matching `crypto.randomBytes(32)` secret.
- Keep auth secrets and tokens strictly inside Electron Main process; never expose to Renderer.
