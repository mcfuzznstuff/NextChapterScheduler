# This Month's Schedule Builder — V1

A small, no-build web app that lets students build a personalized activity
checklist from this month's workshops/outings, and lets staff update the
list each month. No server, no accounts, no data leaves the browser.

## What's in here
- `index.html` — page shell
- `styles.css` — all styling (Atkinson Hyperlegible font, chosen because it
  was designed specifically for readability for people with low vision —
  a real accessibility choice, not decoration)
- `app.js` — everything else: question flow, matching, staff editor

## Running it locally
No build tools needed. Either:
- Double-click `index.html`, or
- From this folder, run `python3 -m http.server 8000` and open
  `http://localhost:8000`

## Hosting it for real (GitHub Pages)
1. Create a new GitHub repo, add these three files.
2. Repo Settings → Pages → Deploy from branch → `main` / root.
3. Your app is live at `https://<username>.github.io/<repo>/`.

This is safe to host on plain GitHub Pages **as long as V1 stays anonymous**
(see HIPAA note below) — nothing is transmitted, so there's nothing to
secure in transit or at rest.

## Customizing for your program

**Replace the placeholder questions.** Open `app.js`, find the `QUESTIONS`
array near the top, and swap in your actual 6-7 questions. Each needs:
- `type: 'single'` (pick one), `'multi'` (pick any), or `'text'` (free text)
- `options` (for single/multi) — keep these matched to the workshop fields
  below so matching keeps working

**Categories, days, times** are defined in the `CATEGORIES`, `DAYS`, `TIMES`
constants near the top of `app.js`. Edit those lists to match your program.

**Loading the monthly newsletter.** There's no PDF/Word auto-import in V1 —
staff use the "Staff: edit this month's list" screen to enter each
activity (title, category, day, time, location, notes). For ~10-20
activities a month this is usually a 5-10 minute task, and it's much more
reliable than trying to auto-parse a PDF that changes layout every month.
Staff can export the list as a `.json` file at the end of each month as a
backup, and import it on another computer if front desk uses more than one.

## Accessibility (WCAG 2.2)
- All interactive controls are real `<button>`/`<input>`/`<label>` elements,
  keyboard-operable, with visible focus rings that are never removed
- One question per screen to reduce cognitive load; a progress indicator
  shows where the student is and how much is left
- Large touch targets (44px+ minimum) throughout
- Color is never the only signal (selected choices get a border + checkmark
  input state, not just a color change)
- Respects `prefers-reduced-motion`
- Print stylesheet produces a clean checklist for students who want a
  paper copy
- Recommend running an automated pass (axe DevTools or Lighthouse) plus a
  manual screen-reader pass (VoiceOver on Mac is built in) before rollout,
  and ideally a quick usability check with a few students directly

## HIPAA — what V1 does and doesn't solve
V1 collects no name, no identifier, and stores answers only in memory
during the session (results live on the results screen, not localStorage).
Nothing is transmitted to a server. That means there's no PHI in this
system, so most of HIPAA's technical safeguard requirements (encryption in
transit, access controls, audit logging, BAAs with a host) don't apply —
there's nothing to protect because nothing identifiable is captured or
stored. This is a deliberate design choice, not an oversight: **keep it
this way for as long as anonymity works for your workflow.**

## Roadmap

**V1.1 — waitlist / signup numbers for front desk**
Goal: students see "you're #4 for the pottery workshop," front desk sees
a live queue, without adding names to the app. Suggested approach:
- Each workshop gets a running signup counter, incremented when a student
  confirms a selection
- Store just the counters (workshop ID → count, and issued position
  numbers) in a Google Sheet via a small Google Apps Script Web App acting
  as a lightweight API — no server to maintain, fits your existing Google
  Workspace, and keeps the data non-identifying (numbers only, no names)
- Front desk matches numbers to actual students the way they already do
  today (sign-in sheet, intake system, etc.) — that mapping stays outside
  this app entirely

**V1.2 — counselors see full submissions**
Only take this step if you actually need a counselor to see *which*
student gave *which* answers. At that point this becomes a real PHI
system and needs: a HIPAA-eligible host with a signed BAA (Google
Workspace can qualify if configured correctly), encryption in transit
(HTTPS, which you'd already have) and at rest, authenticated staff login,
role-based access (front desk vs. counselor vs. admin), and audit logging
of who viewed what. Worth scoping as its own project with your compliance
officer before building, rather than backing into it.
