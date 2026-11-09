# Customer Inbox Triage

## Overview

Customer Inbox Triage is a browser-based tool that gives support messages a first pass: a category, an urgency level, a recommended next step, and a short explanation. The category comes from a language model. Urgency and the next step come from deterministic code, so they do not change between runs or with the time of day.

## Problem Statement

Support teams spend time reading and sorting incoming messages by hand. This tool gives each message a consistent first-pass classification so the team can prioritize and route work faster.

## Tech Stack

- **Frontend:** React, Vite, Tailwind CSS, React Router
- **AI:** Groq API, model `openai/gpt-oss-20b`, called from a server route
- **Storage:** Browser `localStorage`
- **Runtime:** Vite dev server or preview server. The Groq key stays on the server.

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

3. Start the development server:

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
3. **Classify.** The browser posts the message to `/api/classify`. The server route sends it to the model with the allowed categories, asks for JSON output at temperature 0, and checks the reply for a known category. The key never leaves the server.
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

- **Every result shows "Keyword fallback used".** Check that `GROQ_API_KEY` is set in `.env.local` and that you restarted `npm run dev` after adding it. Calling `/api/classify` directly returns 503 with `not_configured` when the key is missing, and 502 when Groq fails or returns an unexpected reply. The server log shows the error type only.
- **Browser keeps asking for a password.** Check that `TRIAGE_USERNAME` and `TRIAGE_PASSWORD` are set and that you restarted the server after setting them. A 503 with `auth_not_configured` means they are missing.
- **Results stop with an error after many requests.** The route allows 20 requests per minute per address. Wait a minute, or raise the limit in `server/classifyRoute.js`.
- **Blank page on load.** Make sure the dev server was restarted after the key was added. The app itself no longer requires a key to render.
- **Results look different from earlier runs.** The category comes from the model, which can change when the provider updates it. Urgency and the next step do not.

## Deploying to Vercel (free Hobby plan)

The app deploys as a static Vite site, and `api/classify.js` runs as a Vercel serverless function at `/api/classify`.

The Hobby plan is free. Do not add a paid plan or a trial. Hobby use is limited to non-commercial projects.

1. Install the CLI and log in in your browser:

   ```bash
   npx vercel login
   ```

2. Create the project from this folder:

   ```bash
   npx vercel link
   ```

3. Add the three secrets. Each command prompts for the value, so they are not stored in Git or shown in shell history:

   ```bash
   npx vercel env add GROQ_API_KEY production
   npx vercel env add TRIAGE_USERNAME production
   npx vercel env add TRIAGE_PASSWORD production
   ```

4. Deploy to production:

   ```bash
   npx vercel --prod
   ```

Vercel gives every deployment HTTPS. The site itself is public, but the classification route requires the username and password, and the site holds no customer data.

### Limits on the free plan

- **Rate limit is per instance.** The 20-requests-per-minute limit is held in memory. Vercel can run several instances, and each keeps its own count, so the real limit is higher than 20. For a strict limit, add a Vercel Firewall rate-limit rule in the project dashboard, or a shared store.
- **Function time and usage caps** apply to Hobby. Check the usage page in the dashboard.

## Security

- **API key on the server.** The Groq key is read from `GROQ_API_KEY` in the Vite config and used only by `server/classifyRoute.js`. It is not bundled into the browser code. A check of the production build found no key material.
- **Access control.** `POST /api/classify` requires HTTP Basic credentials set in `TRIAGE_USERNAME` and `TRIAGE_PASSWORD`. The browser shows a login prompt the first time. The comparison is constant-time. If either variable is missing, the route returns 503 and does nothing.
- **Rate limit.** Each client address gets 20 requests per minute. Requests over the limit get 429 with a `Retry-After` header.
- **Input limits.** The route rejects empty messages, messages over 5,000 characters, and request bodies over 16 KB (413).
- **Responses.** The route sends no-store caching headers and `X-Content-Type-Options: nosniff`. Error responses carry a code, never upstream error text or the key.
- **Logging.** The server logs the error type only, never the message text or the key.
- **Dependencies.** `npm audit --omit=dev` reports 0 vulnerabilities.

### Hosting rules

- **Do not expose `npm run dev` to a network.** It is a development server. Bind it to localhost only, which is the default.
- For other people to use the tool, serve the built app and the route from a server behind HTTPS (for example, a reverse proxy in front of `npm run preview` or an equivalent Node server). Set `TRIAGE_USERNAME`, `TRIAGE_PASSWORD`, and `GROQ_API_KEY` as server environment variables, not in files committed to Git.
- The rate limit counts the address the connection comes from. Behind a reverse proxy, every user shares the proxy address, so the limit must be applied at the proxy or the proxy address must be trusted explicitly.
- Basic credentials are sent with every request. Use HTTPS, or anyone on the network can read them.
- Messages and results are stored in each user's browser `localStorage`. They contain customer data, so clear the history on shared machines.

