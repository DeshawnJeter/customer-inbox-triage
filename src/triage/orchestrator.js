import { MAX_LENGTH, SCHEMA_VERSION } from './schema'
import { MODEL, classifyWithLLM } from './classify/llm'
import { classifyWithRules } from './classify/fallback'
import { calculateUrgency } from './urgency'
import { getRecommendedAction } from './policy'

export class TriageError extends Error {
  constructor(code, message) {
    super(message)
    this.code = code
  }
}

// Short, user-readable reasons for the fallback badge. Never include raw error text.
function describeFailure(err) {
  switch (err?.message) {
    case 'missing_api_key': return 'no API key is configured'
    case 'invalid_json':
    case 'invalid_category':
    case 'invalid_reason': return 'the model reply was not in the expected format'
    default: return 'the AI service did not respond'
  }
}

/**
 * The only public entry point for analysis.
 * @param {string} message
 * @returns {Promise<object>} a history record (see schemaVersion 2)
 */
export async function triage(message) {
  const text = (message ?? '').trim()
  if (!text) throw new TriageError('empty', 'Please enter a message to analyze.')
  if (text.length > MAX_LENGTH) {
    throw new TriageError('too_long', `Messages must be ${MAX_LENGTH} characters or fewer.`)
  }

  let classification
  let classifier
  let model = null
  let failure = null

  try {
    classification = await classifyWithLLM(text)
    classifier = 'llm'
    model = MODEL
  } catch (err) {
    failure = describeFailure(err)
    classification = classifyWithRules(text)
    classifier = 'fallback'
  }

  const urgency = calculateUrgency(text)
  const reasoning = classifier === 'llm'
    ? classification.reason
    : `${classification.reason} The AI classifier was not used because ${failure}.`

  return {
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    message: text,
    category: classification.category,
    urgency,
    recommendedAction: getRecommendedAction(classification.category, urgency),
    reasoning,
    classifier,
    model,
    schemaVersion: SCHEMA_VERSION,
  }
}
