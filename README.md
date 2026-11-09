# Customer Inbox Triage

## Overview

Customer Inbox Triage is a browser-based tool that gives support messages a first pass: a category, an urgency level, a recommended next step, and a short explanation. The category comes from a language model. Urgency and the next step come from deterministic code, so they do not change between runs or with the time of day.

## Problem Statement

Support teams spend time reading and sorting incoming messages by hand. This tool gives each message a consistent first-pass classification so the team can prioritize and route work faster.

## Tech Stack

- **Frontend:** React, Vite, Tailwind CSS, React Router
- **AI:** Groq API, model `openai/gpt-oss-20b`
- **Storage:** Browser `localStorage`
- **Runtime:** Browser only, intended for local development

## Setup

### Prerequisites

- Node.js 20.19 or later (required by Vite 7)
- npm
- A Groq API key from https://console.groq.com/keys

### Installation

1. Clone the repository and open it:

   ```bash
   git clone https://github.com/DeshawnJeter/customer-inbox-triage.git
   cd customer-inbox-triage
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Add your Groq API key. Copy the example file, then set the key in the copy:

   ```bash
   cp .env.example .env.local
   ```

   In `.env.local`:

   ```
   VITE_GROQ_API_KEY=your-groq-api-key
   ```

   `.env.local` is ignored by Git. Never commit a real key.

4. Start the development server:

   ```bash
   npm run dev
   ```

   Open http://localhost:5173.

### Other scripts

| Command | Purpose |
| --- | --- |
| `npm run build` | Production build into `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run lint` | Run ESLint |

## How It Works

1. **Paste.** The user enters a message on the Analyze page.
2. **Validate.** Empty messages are rejected with a message. Messages over 5,000 characters are rejected.
3. **Classify.** The app sends the message to the model with the allowed categories. The request asks for JSON output at temperature 0. The reply must be valid JSON with a known category.
4. **Fall back if needed.** If the API call fails, times out, or returns an invalid reply, a keyword classifier chooses the category. The result shows a "Keyword fallback used" notice and records the reason.
5. **Score urgency.** A rule-based scorer reads the message text only. Severity words such as "down", "outage", or "lost" raise urgency. Polite or positive wording lowers it.
6. **Recommend.** A policy table maps category and urgency to a next step.
7. **Save.** The result is saved to `localStorage` with its classifier, model, and schema version. The History and Dashboard pages read from it.

### Categories

- Billing Issue
- Technical Problem
- Feature Request
- General Inquiry

### Project layout

```
src/
  triage/
    orchestrator.js     triage(message): the single entry point
    schema.js           allowed categories and record version
    urgency.js          deterministic urgency rules
    policy.js           category + urgency -> next step
    classify/
      llm.js            Groq request, JSON parsing, validation
      fallback.js       keyword rules used when the model fails
  store/
    historyStore.js     localStorage read, append, migrate, clear
  pages/                Home, Analyze, History, Dashboard
  components/           navigation
```

## Example Messages

Use these to see the flow end to end. Also try the messages in `sample-messages.json`.

**Production issue**
```
Our production server is down
```

**Customer feedback**
```
Hi there! I just wanted to say thank you for your amazing customer service. I've been using your product for three years now and I'm really happy with it. Keep up the great work!
```

**Feature request**
```
I would love to see a dark mode option in the app. It would be much easier on my eyes during night time usage.
```

**Payment issue**
```
I tried to update my payment method but the page keeps loading forever. Is this a known issue?
```

**Billing question**
```
Can I upgrade my subscription to the pro plan?
```

**Technical support**
```
The dashboard won't load when I try to access it. I've tried refreshing but it keeps timing out.
```

## Troubleshooting

- **Every result shows "Keyword fallback used".** Check that `VITE_GROQ_API_KEY` is set in `.env.local` and that you restarted `npm run dev` after adding it. Also check the browser console for a 401 (bad key) or 404 (model no longer available) response.
- **Blank page on load.** Make sure the dev server was restarted after the key was added. The app itself no longer requires a key to render.
- **Results look different from earlier runs.** The category comes from the model, which can change when the provider updates it. Urgency and the next step do not.

## Security Note

The app calls Groq from the browser (`dangerouslyAllowBrowser: true`), and Vite exposes any `VITE_` variable in the built bundle. That makes the key visible to anyone who can open the page. This setup is for local development and assessment only. For any real deployment, move the model call to a backend route and keep the key on the server.

## Models and Limits

The model name is set in `src/triage/classify/llm.js`. Groq changes which models it serves over time, so check its model list if requests start returning 404. Check https://console.groq.com for current free-tier limits before relying on them.

## License

This project is for educational purposes only.
