// localStorage adapter for analysis history. Old records are migrated on read.
const KEY = 'triageHistory'
const CAP = 500

function migrate(record) {
  return { classifier: 'unknown', schemaVersion: 1, ...record }
}

export function loadHistory() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || '[]')
    return raw.map(migrate).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
  } catch {
    return []
  }
}

export function appendRecord(record) {
  const next = [...loadHistory(), record].slice(-CAP)
  try {
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    // Storage full or blocked: the result still shows on screen, it just is not saved.
  }
  return next
}

export function clearHistory() {
  localStorage.setItem(KEY, '[]')
}
