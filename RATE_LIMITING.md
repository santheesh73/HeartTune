# HeartWave API Rate Limiting

HeartWave protects API traffic in `middleware.ts` before Next.js rewrites `/api/:path*` to the JioSaavn origin. The implementation is Edge Runtime compatible and uses Upstash Redis through its REST API, so no Node-only Redis client is required.

## Request Flow

1. Browser requests `/api/...`, auth-related app paths, or other protected paths.
2. `middleware.ts` calls `enforceRateLimit`.
3. Bot and suspicious request checks run first.
4. Burst, global, and route-specific sliding-window limits are checked in Upstash Redis.
5. Allowed requests continue to Supabase session refresh and then to the Next rewrite.
6. Blocked requests return `403` or `429` before reaching the upstream API.

Current app notes:

- Search, album, playlist, and song metadata requests go through `/api` and are protected.
- Supabase Auth calls made directly from `@supabase/supabase-js` go to Supabase, not HeartWave. Supabase dashboard protections should still be enabled for login/signup abuse. The middleware includes `/auth/*` and `/api/auth/*` policies for future first-party auth routes.
- Actual audio file downloads are fetched from resolved third-party URLs in the browser. The middleware limits stream metadata/token requests at `/api/songs`, but true file-level enforcement requires proxying or signed streaming through a first-party backend.

## Limits

Global limits:

| Role | Limit |
| --- | --- |
| Anonymous | 100 requests / 15 minutes |
| Authenticated | 500 requests / 15 minutes |
| Premium | 2000 requests / 15 minutes |
| Admin | Unlimited |

Route limits:

| Category | Limit |
| --- | --- |
| Burst | 60 requests / minute |
| Search | 30 searches / minute |
| Autocomplete | 20 requests / minute |
| Suggestions | 20 requests / minute |
| Login | 5 attempts / 15 minutes |
| Signup | 3 attempts / hour |
| Password reset | 3 requests / hour |
| Email verification | 5 requests / hour |
| Downloads | 20 downloads / hour |
| Streaming metadata | 100 requests / hour |

## Environment Variables

Set these in Vercel project settings:

```bash
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
RATE_LIMIT_REDIS_PREFIX=heartwave:rate-limit
RATE_LIMIT_FAIL_CLOSED=false
```

Do not expose Upstash values with `NEXT_PUBLIC_`.

`RATE_LIMIT_FAIL_CLOSED=false` keeps the app available if Redis has an outage. For stricter production security, set it to `true`; requests are blocked when Redis cannot be reached.

## Headers And Responses

Allowed API responses include:

- `X-RateLimit-Limit`
- `X-RateLimit-Remaining`
- `X-RateLimit-Reset`

Exceeded limits return:

- HTTP `429`
- `Retry-After`
- JSON body with `error`, `reason`, `retryAfter`, and `reset`

Suspicious automation returns HTTP `403`.

## Bot And Abuse Detection

The middleware scores requests using:

- Missing or known abusive user agents
- Headless browser signatures
- Suspicious fetch metadata
- Unexpected API accept headers
- Missing language headers on search traffic
- IP/user fingerprint burst limits

Known search engine crawlers are allowed through bot scoring, but still remain subject to normal rate limits unless granted admin identity.

## Monitoring

Violations are written to Vercel logs as structured JSON with event type, timestamp, IP, fingerprint, route, role, and reason. These logs can be routed to Sentry or a SIEM from Vercel Log Drains.

Recommended production alerts:

- High count of `rate_limit_exceeded` events from a single IP.
- Any `request_blocked` event with high bot score.
- Redis storage failures.
- Spikes on `/api/search/songs` and `/api/songs`.

## Testing

Run:

```bash
npm run test
npm run lint
npm run build
```

The included tests validate that the required quotas, environment variables, and middleware ordering remain in place.

## Troubleshooting

- Button/search requests blocked too quickly: inspect `X-RateLimit-Remaining` and confirm whether traffic is anonymous or authenticated.
- Limits not applying locally: Upstash variables may be missing. Missing Redis fails open unless `RATE_LIMIT_FAIL_CLOSED=true` in production.
- Auth limits not firing: current Supabase Auth calls are direct to Supabase. Enable Supabase rate limits and bot protection, or move auth through first-party API routes.
- Download scraping still possible: proxy audio streaming through a signed first-party endpoint. Browser-side direct third-party URLs cannot be fully protected by middleware.

