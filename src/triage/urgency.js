// Rule-based urgency. Depends only on the message text, never on the clock or date,
// so the same message always gets the same urgency.

const SEVERITY = /\b(down|outage|lost|crash(ed|es)?|urgent|asap|critical|emergency|data loss|broken|not working|cannot|can't access)\b/i
const POLITE = /\b(thank you|thanks|thank|please|appreciate|kindly)\b/i
const POSITIVE = /\b(happy|love|great|excellent|wonderful|nice|enjoy|professional|clean|positive|incredibly helpful)\b/i

/**
 * @param {string} message
 * @returns {'High' | 'Medium' | 'Low'}
 */
export function calculateUrgency(message) {
  const text = message.trim()
  let score = 50

  const isPositive = POLITE.test(text) || POSITIVE.test(text)
  const exclamations = (text.match(/!/g) || []).length

  if (SEVERITY.test(text)) score += 30
  // Exclamation marks signal urgency only when the message is not already polite or positive.
  if (!isPositive) score += Math.min(exclamations, 2) * 15
  if (POLITE.test(text)) score -= 25
  if (POSITIVE.test(text)) score -= 20
  if (text.includes('?') && !SEVERITY.test(text)) score -= 10

  if (score >= 70) return 'High'
  if (score <= 30) return 'Low'
  return 'Medium'
}
