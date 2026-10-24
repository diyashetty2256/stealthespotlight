# Authorcraft: Steal the Spotlight

A real-time event scoring website for live talent shows. Features admin control, judge scoring, audience display, and live leaderboard management.

## Architecture

- Frontend: React + Vite + TypeScript + Tailwind CSS
- Backend: Node.js + Express + Socket.IO
- Database: PostgreSQL
- Authentication: Express Session with secure cookies

## Features

### Admin Dashboard
- Participant management (add, edit, delete, reorder)
- Judge management (add, remove, reset a judge's password)
- Select current performer
- Open voting with 10-second countdown
- Manual close voting
- View scores, averages, and private leaderboard
- Publish final results
- Move to next participant

### Judge Interface
- View current participant
- Submit score (0-10) while voting is open
- See countdown and voting status
- One score per participant

### Audience Display
- Theatrical stage view for projection (16:9)
- Live countdown during voting
- Voting status display
- Final winners reveal
- Hidden private data (scores, leaderboard)

## Quick Start

1. Install dependencies:
   `ash
   npm install
   `

2. Set up environment variables:
   `ash
   cp .env.example .env
   # Update with your PostgreSQL credentials
   `

3. Initialize database:
   `ash
   npm run migrate
   `

4. Start development servers:
   `ash
   npm run dev
   `

5. Access the interfaces:
   - Admin: http://localhost:5173/admin/login
   - Judge: http://localhost:5173/judge
   - Audience: http://localhost:5173/audience
   - Home: http://localhost:5173/

## Development

- Client: http://localhost:5173
- Server: http://localhost:3001
- Socket.IO: ws://localhost:3001

## Adding more judges

The show ships with one judge account (`judge`). To add more:

1. Sign in at http://localhost:5173/admin/login
2. Scroll to **Judges' Panel** at the bottom of the dashboard
3. Click **+ Add Judge**, fill in a username / display name / password
   (the **Generate** button creates a random password you can copy)
4. Copy the credentials shown in the green panel and hand them to the judge —
   they sign in at http://localhost:5173/judge

Rules the server enforces:

- Usernames are lowercase, 3-32 characters (letters, numbers, `.`, `-`, `_`)
- Passwords must be at least 8 characters
- Judges can only be added or removed while voting is **closed**, so every
  judge scores exactly the same rounds
- A judge who already has scores on record cannot be removed (it would change
  the averages). Use **Reset Password** instead
- Judges appear on the leaderboard as *missing* if they do not score a
  performer before voting closes

## Testing

### Automated

With the server running on port 3001 and the database seeded:

```bash
npm test
```

This runs `docs/test-workflow.ps1`, which exercises the API end to end:
auth, access control, data-leak checks on the public state, the voting
lifecycle, score validation, auto-close on the deadline, missing-score
marking, admin corrections, the publish gate, reset, the audit trail,
participant reordering and multi-judge management.

### Manual browser check

Run `npm run dev`, then open these in separate windows:

| Window | URL | What to check |
| --- | --- | --- |
| Admin | http://localhost:5173/admin/login | `admin` / `admin-spotlight-2026` |
| Judge | http://localhost:5173/judge | `judge` / `judge-spotlight-2026` |
| Audience | http://localhost:5173/audience | no login needed |

1. **Add judges** — in the admin window, add two more judges in the Judges'
   Panel and copy the credentials.
2. **Sign in as judge 2** — open a second browser profile (or a private
   window) at `/judge` and sign in with the new credentials. Both judge
   windows should now be live.
3. **Put someone on stage** — in the admin window, click **Set Active** on a
   participant. The audience window and both judge windows should show the
   name immediately.
4. **Open voting** — click **Open Voting**. The audience window should start
   a 10-second countdown, and both judge windows should show the score pad.
5. **Score from both judges** — submit a score in each judge window. The
   second submission should be rejected with *"You have already submitted a
   score for this participant."* once you try to change it.
6. **Check privacy** — the audience window must never show scores, averages
   or the leaderboard. Only the admin window shows them.
7. **Auto-close** — wait for the countdown to hit zero. The audience window
   should show *Voting Closed*, and the admin leaderboard should list any
   judge who did not score as *missing*.
8. **Correct a score** — in the admin window, click **Correct** on a judge's
   score, change it, and give a reason. The judge's window updates to show
   the corrected score and a *"Corrected by admin"* note.
9. **Publish** — click **Publish Final Results**. The audience window shows a
   link to the results, and http://localhost:5173/results reveals the winner.
10. **Reset** — click **Reset All Scores** to clear everything and start over.

## Notes

- The leaderboard, individual scores, and averages are only visible to authenticated admins.
- All voting logic and deadlines are enforced on the server.
- Audience display shows no private scoring data until results are published.
- Change the seeded passwords before a real event: `POST /api/auth/change-password`.

## Deploying (Render, free tier)

1. Push this repo to GitHub (it already contains `render.yaml`).
2. In Render choose **New > Blueprint**, select this repo and click **Apply**.
   Render creates the web service and a Postgres database, and generates
   `SESSION_SECRET`, `SEED_ADMIN_PASSWORD` and `SEED_JUDGE_PASSWORD` for you.
3. When the deploy finishes, open the service URL. Read the generated admin
   and judge passwords under the service's **Environment** tab and sign in at
   `/admin/login` and `/judge`.

The server serves the built client from the same origin, so cookies and
Socket.IO work with no extra configuration. Note: Render's free Postgres
expires after 30 days, so use a paid plan for anything long-lived.
