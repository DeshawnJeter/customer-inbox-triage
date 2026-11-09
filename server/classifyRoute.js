// Server-side route that holds the Groq key. The browser never sees it.
import { createHash, timingSafeEqual } from 'node:crypto'
import Groq from 'groq-sdk'
import { MODEL, TIMEOUT_MS, SYSTEM_PROMPT, parseClassification } from '../src/triage/classify/prompt.js'
import { MAX_LENGTH } from '../src/triage/schema.js'

const MAX_BODY_BYTES = 16 * 1024
const ROUTE = '/api/classify'
const RATE_WINDOW_MS = 60 * 1000
const RATE_MAX_REQUESTS = 20

// Compare two strings in constant time. Hashing first makes the lengths match.
function safeEqual(a, b) {
  const ha = createHash('sha256').update(a).digest()
  const hb = createHash('sha256').update(b).digest()
  return timingSafeEqual(ha, hb) && a.length === b.length
}

// Returns true when the request carries valid Basic credentials.
function isAuthorized(req, username, password) {
  const header = req.headers.authorization || ''
  if (!header.startsWith('Basic ')) return false
  const decoded = Buffer.from(header.slice(6), 'base64').toString('utf8')
  const sep = decoded.indexOf(':')
  if (sep < 0) return false
  const user = decoded.slice(0, sep)
  const pass = decoded.slice(sep + 1)
  // Check both fields in full so timing does not reveal which one was wrong.
  const userOk = safeEqual(user, username)
  const passOk = safeEqual(pass, password)
  return userOk && passOk
}

// Fixed-window counter per client address. Memory is bounded by pruning old entries.
function createRateLimiter(limit, windowMs) {
  const hits = new Map()
  return function allow(key, now = Date.now()) {
    for (const [k, v] of hits) {
      if (now - v.start >= windowMs) hits.delete(k)
    }
    const entry = hits.get(key)
    if (!entry) {
      hits.set(key, { start: now, count: 1 })
      return true
    }
    entry.count += 1
    return entry.count <= limit
  }
}

function send(res, status, body) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json')
  res.setHeader('Cache-Control', 'no-store')
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.end(JSON.stringify(body))
}

function readBody(req) {
  // Vercel parses JSON bodies before the handler runs and sets req.body.
  if (req.body !== undefined) {
    return Promise.resolve(typeof req.body === 'string' ? req.body : JSON.stringify(req.body))
  }
  return new Promise((resolve, reject) => {
    let size = 0
    const chunks = []
    let tooLarge = false
    req.on('data', (chunk) => {
      if (tooLarge) return
      size += chunk.length
      if (size > MAX_BODY_BYTES) {
        tooLarge = true
        chunks.length = 0
        reject(Object.assign(new Error('too_large'), { status: 413 }))
        return
      }
      chunks.push(chunk)
    })
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    req.on('error', reject)
  })
}

export function createClassifyHandler(env) {
  const username = env.TRIAGE_USERNAME || process.env.TRIAGE_USERNAME || ''
  const password = env.TRIAGE_PASSWORD || process.env.TRIAGE_PASSWORD || ''
  const allow = createRateLimiter(RATE_MAX_REQUESTS, RATE_WINDOW_MS)
  let client = null
  const getClient = () => {
    const apiKey = env.GROQ_API_KEY || process.env.GROQ_API_KEY
    if (!apiKey) return null
    if (!client) client = new Groq({ apiKey, timeout: TIMEOUT_MS, maxRetries: 1 })
    return client
  }

  return async function handler(req, res, next) {
    if (req.url?.split('?')[0] !== ROUTE) return next()

    // Fail closed: without credentials configured, the route does nothing.
    if (!username || !password) return send(res, 503, { error: 'auth_not_configured' })

    const clientKey = req.socket?.remoteAddress || 'unknown'
    if (!allow(clientKey)) {
      res.setHeader('Retry-After', String(RATE_WINDOW_MS / 1000))
      return send(res, 429, { error: 'rate_limited' })
    }

    if (!isAuthorized(req, username, password)) {
      res.setHeader('WWW-Authenticate', 'Basic realm="Customer Inbox Triage", charset="UTF-8"')
      return send(res, 401, { error: 'unauthorized' })
    }

    if (req.method !== 'POST') return send(res, 405, { error: 'method_not_allowed' })

    let payload
    try {
      payload = JSON.parse(await readBody(req))
    } catch (err) {
      if (err.status === 413) {
        // Reply first, then close the connection so the client stops sending.
        res.setHeader('Connection', 'close')
        res.once('finish', () => req.socket.destroy())
        return send(res, 413, { error: 'too_large' })
      }
      return send(res, 400, { error: 'invalid_request' })
    }

    const message = typeof payload?.message === 'string' ? payload.message.trim() : ''
    if (!message || message.length > MAX_LENGTH) return send(res, 400, { error: 'invalid_message' })

    const groq = getClient()
    if (!groq) return send(res, 503, { error: 'not_configured' })

    try {
      const response = await groq.chat.completions.create({
        model: MODEL,
        temperature: 0,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: message },
        ],
      })
      const raw = response?.choices?.[0]?.message?.content ?? ''
      return send(res, 200, parseClassification(raw))
    } catch (err) {
      // Log the error type only. Never log the message or the key.
      console.warn(`[classify] ${err?.constructor?.name ?? 'Error'}: ${err?.status ?? 'no status'}`)
      const invalid = String(err?.message ?? '').startsWith('invalid_')
      return send(res, 502, { error: invalid ? 'invalid_reply' : 'upstream_failed' })
    }
  }
}
