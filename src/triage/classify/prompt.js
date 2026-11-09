// Model settings and prompt shared by the server route. No browser-only code here.
import { CATEGORIES } from '../schema'

export const MODEL = 'openai/gpt-oss-20b'
export const TIMEOUT_MS = 8000

export const SYSTEM_PROMPT = `You classify customer support messages.
Reply with only a JSON object with these keys:
- "category": exactly one of ${JSON.stringify(CATEGORIES)}
- "reason": one or two sentences explaining the choice
- "confidence": "high", "medium" or "low"
Do not add any text outside the JSON object.`

/**
 * Validate a parsed model reply.
 * @returns {{category: string, reason: string, confidence: string}} or throws
 */
export function parseClassification(raw) {
  let parsed
  try {
    parsed = JSON.parse(raw)
  } catch {
    throw new Error('invalid_json')
  }
  if (!CATEGORIES.includes(parsed?.category)) throw new Error('invalid_category')
  if (typeof parsed.reason !== 'string' || !parsed.reason.trim()) throw new Error('invalid_reason')
  return {
    category: parsed.category,
    reason: parsed.reason.trim(),
    confidence: ['high', 'medium', 'low'].includes(parsed.confidence) ? parsed.confidence : 'low',
  }
}
