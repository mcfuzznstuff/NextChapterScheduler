# FAQ — NextChapter Schedule Builder (v1.0)

Last Update 8/30/2026: Classes are parsed from the monthly newsletter text that staff update in a separate process. **Nothing** in the app is ever sent anywhere (to the internet, an AI or otherwise) or a server -- everything lives in the users' browser's localStorage, so no personal data leaves the device.

## What this version does
- Combines **two source documents after the user pastes them into the application**: the Daily Class Schedule
  and the Outings & Workshops flyer, into one schedule
- Builds a real **week-by-week monthly view** with actual calendar dates —
  not just "every Monday," but "Monday, July 6," "Monday, July 13," etc.
- Lets a student mark activities they always want included ("Always
  include"), or topics to skip entirely ("Hard exclusions")
- Matches by priority ranking, mobility/energy needs, and day/time
  availability, with up to two activities per morning or afternoon slot
- Every printed/exported schedule is generated fresh from that student's
  own answers — nothing is stored or shared with anyone else

## 💫 For students

> **Do I need an account or to sign in?**

No. Nothing to create, nothing to log into.

> **Can staff help me fill this out?**

Yes — any staff member or counselor can sit with you and go through the
same questions together, on your own laptop. Mobile devices like phones and tables can be used but are not recommended to be used to with this application.

> **I don't have a device — can I still get a schedule?**

Yes. A staff member can run the whole thing for you and print it at the
end. You're also welcome to NextChapter's Computer Lab.

>**How do I keep my schedule?**

Two ways: **Print / save as PDF** (opens a clean printable version in a
new tab), or **Open in Google Doc** (opens a text box wher you can copy your schedule to an automatically opened
blank Google Doc to paste it into — you'll need a Google account for that
one specifically).

>**Why didn't the activity I wanted show up on my schedule?**

A few possible reasons: it may have been filtered out by something you
selected (a "not available" time, a "skip entirely" topic, or a preferred
time of day that doesn't match when it's offered), or something else
scored as a better match for that same slot. If something important
seems to be missing, use "Always include" and try again, or ask staff to
check the activities list with you. You can always edit the Google Doc to just add that class, outing, or work shop also, this app did the buld of the work for you. 

>**What if none of my answers produce a good schedule?**

The app will say so plainly and suggest asking staff — they can build
one with you in person. You can also navigate back to the questions and try again, the answers stay persistent so long as the browser tab stays open.

## For staff

>**How do I load this month's activities?**

Two separate paste boxes under "This Month's Activities" — one for the
Daily Class Schedule, one for the Outings & Workshops document. Copy the
full text from each source, paste it in, click "Read pasted text," then
check the table underneath and fix anything that looks off. Both boxes
add to the same combined list rather than replacing each other, so paste
both, once each.

>**How good is the automatic reading, really?**

Good, but not perfect — treat it as a fast first draft, not a final
answer. Always skim the table after reading each document in. Common
things worth double-checking: activities with unusual time formats, and
anything with a long, unusually-formatted description. ** The format of the table is a know issue to be addressed in future iterations. Thanks for your patience. **

> **Does the activities list stay the same on every computer?**

No — this version saves only to the browser it was entered on. If more
than one computer is used to manage activities, the list needs to be
entered on each one, or exported/copied over. For now, keeping the number system in place makes the most sense until and Enterprise backend can be constructed.

>**Is there a password on the activities screen?**

Not yet — that's the next planned piece (see Roadmap below). Right now,
anyone who opens the link can edit the list of classes, outing, and workshops.

> **What does "Always include" actually do?**

If a student types a topic there, any matching activity wins its time
slot outright over anything else offered at the same time — a visible
"You asked for this" badge confirms the match. It's meant for a specific
favorite, not a broad category (e.g. "Chess Club" works better than
"games").

## 💫 Known limitations (soft-launch honesty)

- The Google Doc export is a plain-text paste — readable, but not
  formatted (no bold headings yet). That improves once the backend
  (below) is built.
  - If students export to their a Google Doc and format into a live checklist format, now not only can they have a print copy, but essentially they can have a LIVE copy of their daily COMPLETE shedule! Add emoji's to generate interest and modernization, fun, whimsy, and let's be honest a little accessibility for folks of low to no reading capability. 💪🏋️‍♀️📚🌟🎨
- Time-of-day preference currently applies to outings the same way it
  applies to regular classes, which can filter out a great one-off event
  if a student's general preference doesn't match its timing.
- No shared sync yet — see above in Staff Section.

> ## Roadmap — coming next

A shared Google Sheet + Apps Script backend, which unlocks:
- The activities list staying in sync across every device automatically
- A real staff password (checked server-side, not just hidden in the page)
- One-click, properly-formatted Google Doc/Sheet creation (fixing the
  readability note above)
- A fun, memorable return code (emoji + words, e.g. "🦊 Bold-Otter-42") so
  a student can find a previously-generated schedule again without any
  login or personal information involved

## 💫 Technical / accessibility

> **Is this HIPAA compliant?**

Nothing is collected, transmitted, or stored outside the browser it's
used in — no name, no identifying information, nothing sent to a server.
There's no PHI in this system, which is what keeps it outside HIPAA's
technical requirements.

> **Is this accessible (WCAG 2.2)?**

Built with that as a first-class goal throughout — plain, low-vision-
friendly typography, keyboard-operable controls, one question per screen,
large touch targets. At this time of this writing the app is passing SW Bits, Ltd.'s POUR Method.

> **Who do I contact about an issue?**

info@sw-bits.com

> **Where's the source / who maintains this?**

[Source code location](https://github.com/mcfuzznstuff/NextChapterScheduler/tree/main) / [SW Bits, Ltd. is the maintainer](https://www.sw-bits.com)
