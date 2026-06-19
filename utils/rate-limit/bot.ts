import { SUSPICIOUS_SCORE_BLOCK_THRESHOLD } from './config'

const BAD_BOT_PATTERNS = [
  /ahrefs/i,
  /archive\.org_bot/i,
  /bytespider/i,
  /crawler/i,
  /curl/i,
  /dataforseo/i,
  /go-http-client/i,
  /headlesschrome/i,
  /httpclient/i,
  /libwww-perl/i,
  /mj12bot/i,
  /nikto/i,
  /nmap/i,
  /python-requests/i,
  /scrapy/i,
  /semrush/i,
  /sqlmap/i,
  /wget/i,
  /zgrab/i,
]

const ALLOWED_BOT_PATTERNS = [
  /googlebot/i,
  /bingbot/i,
  /duckduckbot/i,
  /slurp/i,
]

export interface BotAssessment {
  blocked: boolean
  score: number
  reasons: string[]
}

export function assessRequest(headers: Headers, pathname: string): BotAssessment {
  const userAgent = headers.get('user-agent') || ''
  const accept = headers.get('accept') || ''
  const acceptLanguage = headers.get('accept-language') || ''
  const secFetchSite = headers.get('sec-fetch-site') || ''
  const secFetchMode = headers.get('sec-fetch-mode') || ''
  const reasons: string[] = []
  let score = 0

  if (ALLOWED_BOT_PATTERNS.some((pattern) => pattern.test(userAgent))) {
    return { blocked: false, score: 0, reasons: [] }
  }

  if (!userAgent) {
    score += 35
    reasons.push('missing_user_agent')
  }

  if (BAD_BOT_PATTERNS.some((pattern) => pattern.test(userAgent))) {
    score += 80
    reasons.push('known_bad_bot_user_agent')
  }

  if (/HeadlessChrome|PhantomJS|Playwright|Puppeteer|Selenium/i.test(userAgent)) {
    score += 60
    reasons.push('headless_browser')
  }

  if (pathname.startsWith('/api') && !accept.includes('application/json') && !accept.includes('*/*')) {
    score += 15
    reasons.push('unexpected_api_accept_header')
  }

  if (!acceptLanguage && pathname.startsWith('/api/search')) {
    score += 10
    reasons.push('missing_accept_language_on_search')
  }

  if (secFetchSite === 'cross-site' && secFetchMode !== 'cors') {
    score += 25
    reasons.push('suspicious_fetch_metadata')
  }

  return {
    blocked: score >= SUSPICIOUS_SCORE_BLOCK_THRESHOLD,
    score,
    reasons,
  }
}

