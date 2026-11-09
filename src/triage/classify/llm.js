import { MODEL, parseClassification } from './prompt'

// The browser never calls Groq directly. It calls the app's own route, and the
// server attaches the key. See server/classifyRoute.js.
const ENDPOINT = '/api/classify'
const CLIENT_TIMEOUT_MS = 10000

export { MODEL }

/**
 * Ask the server to classify a message. Throws on any problem, so the
 * orchestrator can fall back to keyword rules.
 * @returns {Promise<{category: string, reason: string, confidence: string}>}
 */
export async function classifyWithLLM(message) {
  let response
  try {
    response = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message }),
      signal: AbortSignal.timeout(CLIENT_TIMEOUT_MS),
    })
  } catch {
    throw new Error('upstream_failed')
  }

  if (response.status === 503) throw new Error('missing_api_key')
  if (!response.ok) throw new Error('upstream_failed')

  let data
  try {
    data = await response.json()
  } catch {
    throw new Error('invalid_json')
  }
  return parseClassification(JSON.stringify(data))
}
