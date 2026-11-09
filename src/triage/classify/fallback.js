// Keyword rules used only when the LLM path fails. Word boundaries stop
// "download" matching "down" and "whatever" matching "what".
const RULES = [
  {
    category: 'Billing Issue',
    pattern: /\b(bill|billing|invoice|payment|charged?|refund|subscription|credit card)\b/i,
  },
  {
    category: 'Technical Problem',
    pattern: /\b(bug|error|broken|crash(es|ed)?|not working|down|outage|server|slow|loading|issue|problem|database|connection)\b/i,
  },
  {
    category: 'Feature Request',
    pattern: /\b(feature|suggestion|suggest|wish|enhancement|would be great|would like to see|please add|could you add)\b/i,
  },
  {
    category: 'General Inquiry',
    pattern: /(\?|\b(how|what|when|where|question|can i)\b)/i,
  },
]

/** @returns {{category: string, reason: string, confidence: 'low'}} */
export function classifyWithRules(message) {
  const rule = RULES.find((r) => r.pattern.test(message))
  if (rule) {
    return {
      category: rule.category,
      reason: `Matched keywords for ${rule.category.toLowerCase()}.`,
      confidence: 'low',
    }
  }
  return {
    category: 'General Inquiry',
    reason: 'No keyword matched, so the message is flagged for manual review.',
    confidence: 'low',
  }
}
