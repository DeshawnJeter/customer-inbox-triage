// Category + urgency -> next step. Copy lives here so it can change in one place.
const ACTIONS = {
  'Billing Issue': {
    High: 'Escalate to the billing team today.',
    default: 'Send the billing portal link.',
  },
  'Technical Problem': {
    High: 'Escalate to engineering on-call now.',
    default: 'Send troubleshooting steps and a browser restart guide.',
  },
  'Feature Request': {
    default: 'Log it in the product backlog and thank the customer.',
  },
  'General Inquiry': {
    default: 'Send the FAQ link.',
  },
}

/**
 * @param {string} category
 * @param {string} urgency
 * @returns {string}
 */
export function getRecommendedAction(category, urgency) {
  const row = ACTIONS[category]
  if (!row) return 'Review manually.'
  if (urgency === 'High' && row.High) return row.High
  return row.default
}
