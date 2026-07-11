# NextChapter Schedule Builder — V1.2

A small, no-build web app for students to build a personalized activity
checklist, and for staff to maintain one shared monthly class list —
backed by a free Google Apps Script + Google Sheet, no server to run.

## What's in here
- `index.html`, `styles.css`, `app.js` — the app itself
- `apps-script/Code.gs` — the backend you deploy to your own Google account

## Part 1 — Deploy the backend (~10 minutes, one time)

1. Go to [sheets.google.com](https://sheets.google.com), create a new blank spreadsheet, name it something like "NextChapter Schedule Data."
2. In that sheet: **Extensions → Apps Script**. Delete the placeholder code and paste in the full contents of `apps-script/Code.gs`.
3. In the Apps Script editor: **Project Settings** (gear icon, left sidebar)
   → scroll to **Script Properties** → **Add script property**:
   - Property: `STAFF_PASSWORD`
   - Value: whatever password your staff will share (e.g. `NextChapter2026!`)
4. Back in the editor: **Deploy → New deployment** → gear icon → **Web app**.
   - Execute as: **Me**
   - Who has access: **Anyone**
   - Click **Deploy**, authorize the permissions it asks for (this is your
     own script running under your own Google account — that's expected).
5. Copy the **Web app URL** it gives you (ends in `/exec`).
6. Open `app.js` in this folder, find `const CONFIG = { APPS_SCRIPT_URL` }at the very top, and paste the URL in between the quotes.

The two sheet tabs (`Classes`, `SavedSchedules`) are created automatically the first time the app writes to them — you don't need to make them by hand.

**To change the staff password later:** edit the `STAFF_PASSWORD` script
property (step 3) — no redeploy needed.

## Part 2 — Host the app

Push `index.html`, `styles.css`, and `app.js` (with your URL pasted in) to
a GitHub repo, then **Settings → Pages → Deploy from branch**. Your app is
live at `https://<username>.github.io/<repo>/`.

Because the class list itself is public information (nobody's personal data — just the newsletter), it's fine for this repo and site to be public.

## Part 3 — Staff: loading each month's classes

Two ways, and you'll likely use both together:

**Paste and parse (fast, imperfect).** Copy the text of the newsletter and
paste it into the box at the top of the staff screen, then click "Parse and
add to list below." It does a best-effort job of splitting it into rows —
expect it to miss or mangle some entries, especially ones that don't follow
the usual `*9-10 AM | Class Name (INFO) | Instructor | Location` pattern.
Always review every row it adds.

**Edit the table directly.** Whether from the parser or from scratch, every
row is editable: title, tags (hold Ctrl/Cmd to pick more than one), day,
start/end time, format, intensity, location, notes, and skip dates (for
"no class 7/20" type exceptions — enter as `7/20, 7/27`).

Click **Save for all students** when you're done. That writes to the shared
Google Sheet, so every student sees the update immediately, on any device.

## Part 4 — What students see

One question per screen, matching the 7 you provided: days per week,
preferred time of day, blackout times (add as many as needed), mobility/
energy needs, a rank-ordered list of priorities (up/down buttons, no
dragging required), things to avoid (free text, shown to the student but
not auto-filtered), and hard exclusions (typed topics, filtered out
completely).

The matching logic: hard exclusions and blackout conflicts remove classes
entirely; mobility needs filter out anything tagged too intense; preferred
time of day filters morning/afternoon; everything left is scored by how
well its tags match the student's priority ranking, then spread across the
number of days they asked for (max 2 activities per day) across every week
remaining in the current month.

## Part 5 — Saving and exporting

- **Print this page** — browser print dialog.
- **Copy schedule as text** — works everywhere, no backend needed.
- **Create my Google Doc / Google Sheet** (only appears once the backend is
  configured) — the backend generates a real Doc (clean checklist layout,
  matching your WEEK 1 / WEEK 2 format) or Sheet (same layout plus a real
  clickable "Attended?" checkbox column — handy as a standing attendance
  record). Both are shared as "anyone with the link can edit," so the
  student's own checklist stays editable by them.
- Either way, the student gets a **fun return code** (e.g. "🦊
  Bold-Otter-42") tied to that Doc/Sheet. They can punch that code into the
  "Have a code from a previous visit?" box on the home screen any time to
  get the links back — no login, nothing identifying stored, just a code.

## HIPAA note
Nothing in this system ever collects a name or other identifier. The class list is public information; saved-schedule codes are random and mean
nothing outside this app. Because of that, there's no PHI here and no BAA is required for this setup. If you ever add a feature where a counselor
needs to see *which specific student* gave *which* answers, that crosses into PHI and needs a different, access-controlled setup — worth scoping as its own project rather than adding on top of this one.

## Accessibility (WCAG 2.2)
Same commitments as V1: keyboard-operable controls with visible focus,
one question per screen, 44px+ touch targets, no color-only signaling,
`prefers-reduced-motion` respected, print stylesheet. The priority ranking
uses up/down buttons rather than drag-and-drop specifically so it doesn't
require fine motor control. Run an automated check (axe or Lighthouse) and
a manual screen-reader pass before rollout, and ideally test with a couple
of actual students.

## Known limitations / good next passes
- The newsletter parser is heuristic — it will misread irregular lines.
  There's no way around occasional manual cleanup with source text this
  varied; the table exists specifically so staff can fix it in under a
  minute per row.
- "Skip entirely" exclusions and category tags are keyword/tag based, not
  true language understanding — review a new month's tags after parsing.
- The Doc/Sheet sharing setting (anyone with the link can edit) trades a
  little bit of security for zero friction; fine given there's no PHI, but
  worth being deliberate about if your program's policies require more.
- "Print" depends on the browser's print dialog and can behave differently
  across browsers/devices — the copy-as-text and Google export options are
  more reliable fallbacks.
