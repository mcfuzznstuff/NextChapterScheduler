### NextChapter Scheduler Web App

[Link to the app.](https://mcfuzznstuff.github.io/NextChapterScheduler/)

_NOTE: This application was built with the assistance of AI, specifically Claude Sonnet 5 and ChatGPT various models over the course of several months of testing and iterating prompts. As the human Product Owner (PO) of the project, consider Claude the Software Engineer and ChatGPT a fellow PO to bounce ideas off of while also testing it's ability to do this process without the use of an application. I've also used Gemini to QA the prompts to narrow the questions; Claude and myself have also run some QA, so there has been a bit of initial hardening. If you run into any issues or would like the access to the chat logs for each, please email info@sw-bits.com. Thank you._

## 📝 PURPOSE

A web application that assists in the complex matrix scheduling of hundreds of students across classes, outings, and workshops.

## ✅ GOALS

- [x] Can a mini web app be built by Claud to tackle this classic scheduling problem?
- [x] Student builds personalized, anonymous schedule, either on their own or _through an appointment_ with Education Counselor (EC), that incorporates the Class Schedule (CS) Google Doc and the Outing & Workshops (OW) PDF.
- [x] Student can print created schedule, on their own or with help of member of staff!
- [ ] Staff, front desk, inputs schedule into their electronic health records (EHR) system.
- [ ] A complete adopted and incorporated system that manages First Come First Served (FCFS) signups for classes while allowing students to get a usable tool for the month in minutes. 

> - [ ] Staff can reproduce the schedules if lost. This requires at a very minimum a pair of Google Sheets or similar backend to manage the signup timings and other coding system matrix so as to not create mass amounts of duplication. This is a v1.2 at the very least because of that.

## ✅ CHALLENGES

**BLIND CHALLENGES GOING IN/ BLACK BOX**

- How well does Claude code?
- How much of it's code will I need to review?
- Is it going to require a backend?
- Can I host this as an embedded web app onto an existing Google Site or Wordpress page?

**CHALLENGES DURING DEVELOPMENT**

- PROBLEM: Finding the right, low tech or low effort, way to not only track changes via git but also do live testing in a browser without an Integrated Development Environment (IDE).

> SOLUTION: Ask Github's CoPilot AI assistant to slowly walk me step by step on how to reconnect my computer to the proper account, then repository, then exchange files.

- PROBLEM: Printing the completed schedule. I'm not the software engineer I once was; thought I could copy Claude's code and make some "minor" edits to get the app to work, turns out I broke the window.print() function that allows Students to print their schedules. 

> SOLUTION: This took several hours of my effort before returning the code back to Claude and it letting me know my poor git skills broke it's clean code. 😅

- PROBLEM: Depends on perception, but for this effort I'm not spending any money out of pocket, which means also not signing up for any enterprise trials if possible.

> SOLUTION: Mostly doable, for the first two goals, completely capable, but for any database management through Google at least an non-enterprise account was needed to use AppScripts without a fee, and the opposite is true to host the site on GitHub pages. Both of those were top solution provided by Clause to get this app live and testing, what I have done, once Claude resolve the afore mentioned the window.print() function, is that I've just been copy and pasting the code directly from each result into a Google Site Embed, then testing each flow, making notes along the way to return to Claude.

**CHALLENGES DURING DEPLOYMENT (PEOPLE SIDE)**
- PROBLEM: Privacy & Data Handling that meets WCAG 2.2 HIPAA-compliant code with an AI agent.

> SOLUTION: Because I defined these standards up front, Claude has been doing an excellent job of at least by [The POUR Method](https://youtu.be/x1GqgMlkWIs?si=mgGNd0niReB-KKZG) standards meeting WGAC2.2. But we will explicitly be adding a Privacy Policy for this app with its own link. The language is as follows:

- Privacy & Data Handling

This application does not collect or transmit personally identifiable information, health information, registration information, or individual student schedules. User-entered information is processed locally in the user's browser and is not transmitted to an application server or external API.

### 🛑 KNOWN BUGS AND WORKAROUNDS

- Using this app on mobile can be done if you're highly proficient with it's features, but please, NextChapter staff are not experts in this we recommend using a Desktop to complete this scheduling.
- We're aware that once the two documents have been pasted the resulting table is nearly un readable, this is a bug for later iteration of the application that perhaps you won't even have to interact with. 🙂

### ⭐️ UNIQUE ADVANTAGE FOR "ADVANCED" USERS ⭐️

- If students export to their a Google Doc and format into a live checklist format, not can they have a print copy, but essentially they can have a LIVE copy of their dialy COMPLETE CS/OW shedule! Again, add emoji's to add interest and modernization, fun, whimsy, and let's be honest a little accessibility for folks of low to no reading capability. 💪🏋️‍♀️📚🌟🎨

### 🏁 ROADMAP AS OF V1.0 🏁

This is a basic roadmap, to see a live roadmap, check out the Milestones and Issues within the project.

**NOW**
>Students can print their schedule either from app or Google Doc.

**NEXT**
>Staff can track signup via mini Google Sheet like database, this will have a distinct workflow for staff to export the HIPPA sheet to a format they can use within the EHR system.

**LATER**
>A fully adopted and incorporated system that overtakes any manual paper system in place currently.
