# KİRVE AI — Cloudflare edge protection (optional but recommended)

Cloudflare is an additional edge layer, not a substitute for the app's own session, CSRF, and rate-limit controls. Keep the origin protected too; the default `*.onrender.com` host can otherwise be reachable separately from a proxied custom hostname.

## DNS and TLS

1. Add a custom domain to the Render service first and complete Render's domain/TLS verification.
2. In Cloudflare DNS, create the CNAME record using the exact target Render shows for the custom domain. Enable the orange-cloud proxy only after the Render custom domain is active.
3. In Cloudflare SSL/TLS, set **Full (strict)**. Do not use Flexible mode.
4. Keep the Render service HTTPS and the app's `NODE_ENV=production`; production sessions use the `__Host-` cookie prefix and `Secure` flag.
5. Do not cache `/`, `/login`, `/api/*`, or `/health/*`. The app deliberately marks authenticated API data as `no-store`.

## WAF managed rules

Enable Cloudflare's managed WAF ruleset for the zone. Start in Log/Simulate mode if available, review false positives, then enable blocking. Do not challenge or block the `/health/ready` endpoint used by Render health checks.

## Suggested rate limiting rules

Cloudflare plans and dashboard labels can vary. Create separate rate-limit rules with `ip.src` as the counting characteristic:

- Login: expression `(http.request.method eq "POST" and http.request.uri.path eq "/api/login")`; 10 requests per 900 seconds; Block for 900 seconds.
- Chat: expression `(http.request.method eq "POST" and http.request.uri.path eq "/api/chat")`; 30 requests per 60 seconds; Block for 60 seconds.
- File uploads: expression `(http.request.method eq "POST" and http.request.uri.path matches "^/api/chats/.+/files$")`; 12 requests per 60 seconds; Block for 60 seconds.

The application independently limits login attempts and API operations. Cloudflare rate counters are approximate and can take a few seconds to enforce; do not rely on them as the only protection.

## Origin bypass note

A proxied custom domain does not automatically make the `onrender.com` origin private. Keep application authentication and rate limits enabled even behind Cloudflare. If you later add a Cloudflare Worker or a verified origin-header scheme, configure it carefully and never put a shared origin secret in browser JavaScript.
