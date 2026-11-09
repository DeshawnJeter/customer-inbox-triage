// Allowed values and record version. Single source of truth for the UI and the classifier.
export const CATEGORIES = [
  'Billing Issue',
  'Technical Problem',
  'Feature Request',
  'General Inquiry',
]

export const URGENCY_LEVELS = ['High', 'Medium', 'Low']

export const SCHEMA_VERSION = 2

// Longest message accepted by the app and by the server route.
export const MAX_LENGTH = 5000
