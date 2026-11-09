// Server-side route that holds the Groq key. The browser never sees it.
import Groq from 'groq-sdk'
import { MODEL, TIMEOUT_MS, SYSTEM_PROMPT, parseClassification } from '../src/triage/classify/prompt.js'
import { MAX_LENGTH } from '../src/triage/schema.js'

const MAX_BODY_BYTES = 16 * 1024
const ROUTE = '/api/classify'

function send(res, status, body) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json')
  res.setHeader('Cache-Control', 'no-store')
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.end(JSON.stringify(body))
}

function readBody(req) {
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
  let client = null
  const getClient = () => {
    const apiKey = env.GROQ_API_KEY || process.env.GROQ_API_KEY
    if (!apiKey) return null
    if (!client) client = new Groq({ apiKey, timeout: TIMEOUT_MS, maxRetries: 1 })
    return client
  }

  return async function handler(req, res, next) {
    if (req.url?.split('?')[0] !== ROUTE) return next()
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
