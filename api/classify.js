// Vercel serverless entry point for POST /api/classify.
// Credentials and the Groq key come from Vercel environment variables.
import { createClassifyHandler } from '../server/classifyRoute.js'

const handler = createClassifyHandler({
  GROQ_API_KEY: process.env.GROQ_API_KEY,
  TRIAGE_USERNAME: process.env.TRIAGE_USERNAME,
  TRIAGE_PASSWORD: process.env.TRIAGE_PASSWORD,
})

export default function classify(req, res) {
  return handler(req, res, () => {
    res.statusCode = 404
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ error: 'not_found' }))
  })
}
