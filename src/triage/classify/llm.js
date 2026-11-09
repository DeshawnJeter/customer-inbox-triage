import Groq from 'groq-sdk'
import { CATEGORIES } from '../schema'

export const MODEL = 'openai/gpt-oss-20b'
const TIMEOUT_MS = 8000

let client = null

// The client is created on first use, never at import time, so a missing key
// cannot blank the whole app.
function getClient() {
  const apiKey = import.meta.env.VITE_GROQ_API_KEY
  if (!apiKey) return null
  if (!client) {
    // dangerouslyAllowBrowser is for this assessment only. See Phase 4 in the design doc.
    client = new Groq({ apiKey, dangerouslyAllowBrowser: true, timeout: TIMEOUT_MS, maxRetries: 1 })
  }
  return client
}

const SYSTEM_PROMPT = `You classify customer support messages.
Reply with only a JSON object with these keys:
- "category": exactly one of ${JSON.stringify(CATEGORIES)}
- "reason": one or two sentences explaining the choice
- "confidence": "high", "medium" or "low"
Do not add any text outside the JSON object.`

/**
 * Ask the model for a category. Throws on any problem, so the orchestrator can fall back.
 * @returns {Promise<{category: string, reason: string, confidence: string}>}
 */
export async function classifyWithLLM(message) {
  const groq = getClient()
  if (!groq) throw new Error('missing_api_key')

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
  let parsed
  try {
    parsed = JSON.parse(raw)
  } catch {
    throw new Error('invalid_json')
  }
  if (!CATEGORIES.includes(parsed.category)) throw new Error('invalid_category')
  if (typeof parsed.reason !== 'string' || !parsed.reason.trim()) throw new Error('invalid_reason')

  return {
    category: parsed.category,
    reason: parsed.reason.trim(),
    confidence: ['high', 'medium', 'low'].includes(parsed.confidence) ? parsed.confidence : 'low',
  }
}
