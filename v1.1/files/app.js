/* ==========================================================
   CONFIG — paste your deployed Apps Script Web App URL here.
   Leave blank to run in local-only demo mode (each browser has
   its own copy of the class list, no Doc/Sheet export, no shared
   staff password enforcement).
   ========================================================== */
const CONFIG = {
  APPS_SCRIPT_URL: ''https://script.google.com/macros/s/AKfycbxUxtFkaymZ6c8DwDwQQRvE29UfBFg1TprOUJwX_YqhhnNPNke03e_3O6FI7sQGYA2Mrw/exec'
};

const STORAGE_KEY = 'rehabScheduler.workshops.v2';
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
const DAY_NAMES = { Mon: 'Monday', Tue: 'Tuesday', Wed: 'Wednesday', Thu: 'Thursday', Fri: 'Friday' };
const FORMATS = ['Online', 'Hybrid', 'In-Person Only'];
const INTENSITIES = ['Gentle', 'Moderate', 'Active'];
const TAG_OPTIONS = ['Gentle movement', 'Art', 'Nature & animals', 'Cooking', 'Socializing', 'Volunteering', 'Learning new skills', 'Music', 'Employment', 'Education (HS/college)'];

/* ==========================================================
   BACKEND HELPERS
   ========================================================== */
function backendConfigured() { return !!CONFIG.APPS_SCRIPT_URL; }

async function fetchClassesFromBackend() {
  if (!backendConfigured()) return null;
  try {
    const res = await fetch(CONFIG.APPS_SCRIPT_URL + '?action=classes');
    const data = await res.json();
    if (data.ok) return data.classes;
  } catch (e) { /* fall through to local */ }
  return null;
}

async function saveClassesToBackend(classes, password) {
  if (!backendConfigured()) return { ok: false, error: 'No backend configured.' };
  try {
    const res = await fetch(CONFIG.APPS_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' }, // avoids CORS preflight on Apps Script
      body: JSON.stringify({ action: 'saveClasses', classes, password })
    });
    return await res.json();
  } catch (e) { return { ok: false, error: String(e) }; }
}

async function verifyStaffPassword(password) {
  if (!backendConfigured()) return true; // local demo mode: no real gate possible
  try {
    const res = await fetch(CONFIG.APPS_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'verifyPassword', password })
    });
    const data = await res.json();
    return !!data.ok;
  } catch (e) { return false; }
}

async function createExportOnBackend(payload) {
  if (!backendConfigured()) return { ok: false, error: 'No backend configured.' };
  try {
    const res = await fetch(CONFIG.APPS_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(Object.assign({ action: 'createExport' }, payload))
    });
    return await res.json();
  } catch (e) { return { ok: false, error: String(e) }; }
}

async function lookUpSavedCode(code) {
  if (!backendConfigured()) return null;
  try {
    const res = await fetch(CONFIG.APPS_SCRIPT_URL + '?action=getSchedule&code=' + encodeURIComponent(code));
    const data = await res.json();
    return data.ok ? data : null;
  } catch (e) { return null; }
}

/* ==========================================================
   LOCAL CACHE (fallback + offline convenience)
   ========================================================== */
function loadLocalWorkshops() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : sampleWorkshops();
  } catch (e) { return sampleWorkshops(); }
}
function saveLocalWorkshops(list) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(list)); } catch (e) {}
}
function sampleWorkshops() {
  return [
    { id: cryptoId(), title: 'Qi Gong', tags: ['Gentle movement'], day: 'Tue', startTime: '9:15 AM', endTime: '9:55 AM', format: 'In-Person Only', intensity: 'Gentle', location: 'Rm 126', instructor: 'Jessica', notes: 'Meditation in motion.', skipDates: '', canceled: false },
    { id: cryptoId(), title: 'Open Art Studio', tags: ['Art'], day: 'Mon', startTime: '9:30 AM', endTime: '11:30 AM', format: 'In-Person Only', intensity: 'Moderate', location: 'Art Studio', instructor: 'Kiara', notes: '', skipDates: '', canceled: false },
    { id: cryptoId(), title: 'Chess Club', tags: ['Socializing', 'Learning new skills'], day: 'Thu', startTime: '2:00 PM', endTime: '3:00 PM', format: 'In-Person Only', intensity: 'Gentle', location: "Sally's Café", instructor: 'Keith', notes: 'Braille boards available.', skipDates: '', canceled: false }
  ];
}

/* ==========================================================
   STUDENT QUESTIONS
   ========================================================== */
const QUESTIONS = [
  { id: 'daysPerWeek', title: 'How many days would you like to attend?', render: 'choice', type: 'single',
    options: ['1 day', '2 days', '3 days', '4 days', '5 days'],
    hint: 'If some of those could be half-days, mention it in the notes near the end.' },
  { id: 'preferredTimes', title: 'What times of day work best?', render: 'choice', type: 'single',
    options: ['Mornings', 'Afternoons', 'All Day'] },
  { id: 'blackouts', title: "Are there days or times you're NOT available?", render: 'blackout',
    hint: 'Add as many as you need. Leave this empty if you\'re open all week.' },
  { id: 'mobility', title: 'Do you have any energy or mobility needs we should match activities to?', render: 'choice', type: 'multi',
    options: ['Gentle activities only', 'Light walking only', 'Need seated breaks', 'No lifting over 15 lbs', 'Uses a mobility aid', 'No physical limitations'] },
  { id: 'priorities', title: 'Rank what matters most to you this month', render: 'rank',
    hint: 'Use the up and down buttons. The top item is most important to you.', options: TAG_OPTIONS.slice() },
  { id: 'avoid', title: 'Anything you want to avoid?', render: 'text',
    hint: 'Optional. Physical limitations, sensory needs, anything that helps staff pick well for you.' },
  { id: 'exclusions', title: 'Any topics to skip entirely?', render: 'tags',
    hint: 'These will be left out completely. Example: clay masks, poetry.' }
];

/* ==========================================================
   STATE + INIT
   ========================================================== */
const state = {
  mode: 'student',
  step: 0,
  answers: { blackouts: [], priorities: TAG_OPTIONS.slice(), exclusions: [] },
  workshops: loadLocalWorkshops(),
  results: [],
  staffUnlocked: false,
  staffPassword: '',
  loadingBackend: backendConfigured(),
  backendError: false
};

const root = document.getElementById('app-root');
render();

if (backendConfigured()) {
  fetchClassesFromBackend().then(list => {
    state.loadingBackend = false;
    if (list) { state.workshops = list; saveLocalWorkshops(list); }
    else { state.backendError = true; }
    render();
  });
}

function render() {
  root.innerHTML = '';
  root.appendChild(renderModeSwitch());
  if (state.loadingBackend) {
    const p = document.createElement('p');
    p.className = 'banner info';
    p.textContent = "Loading this month's activities…";
    root.appendChild(p);
  }
  if (!backendConfigured()) {
    const p = document.createElement('p');
    p.className = 'banner info';
    p.textContent = 'Running in local demo mode: the class list only lives in this browser, and Google Doc/Sheet export is unavailable until a backend is configured. See README.md.';
    root.appendChild(p);
  } else if (state.backendError) {
    const p = document.createElement('p');
    p.className = 'banner danger';
    p.textContent = "Could not reach the shared class list right now. Showing the last copy saved on this device.";
    root.appendChild(p);
  }
  root.appendChild(state.mode === 'student' ? renderStudentFlow() : renderStaffFlow());
  if (state.mode === 'staff' && state.showPasswordModal) {
    root.appendChild(renderPasswordModal());
  }
}

function renderModeSwitch() {
  const nav = document.createElement('nav');
  nav.className = 'mode-switch no-print';
  nav.setAttribute('aria-label', 'Choose who is using this app');
  nav.innerHTML = `
    <button aria-current="${state.mode === 'student'}" data-mode="student">I'm a student</button>
    <button aria-current="${state.mode === 'staff'}" data-mode="staff">Staff: edit this month's list</button>
  `;
  nav.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.dataset.mode === 'staff' && !state.staffUnlocked) {
        state.showPasswordModal = true;
        state.mode = 'staff';
        render();
        return;
      }
      state.mode = btn.dataset.mode;
      state.step = 0;
      render();
    });
  });
  return nav;
}

/* ==========================================================
   STAFF PASSWORD MODAL
   ========================================================== */
function renderPasswordModal() {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-labelledby', 'pw-title');

  const box = document.createElement('div');
  box.className = 'modal-box';
  box.innerHTML = `
    <h2 id="pw-title">Staff access</h2>
    <p class="hint">Enter the shared staff password to edit this month's activities.</p>
    <label class="field-label" for="pw-input">Password</label>
    <input type="password" id="pw-input" autocomplete="current-password">
    <p class="modal-error" id="pw-error" role="alert" aria-live="assertive"></p>
  `;
  const row = document.createElement('div');
  row.className = 'btn-row';
  const cancel = document.createElement('button');
  cancel.className = 'btn secondary';
  cancel.textContent = 'Cancel';
  cancel.addEventListener('click', () => { state.showPasswordModal = false; state.mode = 'student'; render(); });

  const submit = document.createElement('button');
  submit.className = 'btn primary';
  submit.textContent = 'Unlock';
  submit.addEventListener('click', async () => {
    const input = document.getElementById('pw-input');
    submit.disabled = true;
    submit.textContent = 'Checking…';
    const ok = await verifyStaffPassword(input.value);
    if (ok) {
      state.staffUnlocked = true;
      state.staffPassword = input.value;
      state.showPasswordModal = false;
      render();
    } else {
      document.getElementById('pw-error').textContent = 'That password is not correct.';
      submit.disabled = false;
      submit.textContent = 'Unlock';
    }
  });

  row.appendChild(cancel);
  row.appendChild(submit);
  box.appendChild(row);
  overlay.appendChild(box);

  setTimeout(() => document.getElementById('pw-input')?.focus(), 0);
  overlay.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { state.showPasswordModal = false; state.mode = 'student'; render(); }
    if (e.key === 'Enter' && e.target.id === 'pw-input') { e.preventDefault(); submit.click(); }
  });
  return overlay;
}

/* ==========================================================
   STUDENT FLOW
   ========================================================== */
function renderStudentFlow() {
  const wrap = document.createElement('div');
  const total = QUESTIONS.length + 1;

  const hasCode = document.createElement('details');
  hasCode.className = 'card no-print';
  hasCode.innerHTML = `<summary style="cursor:pointer;font-weight:700;color:var(--primary-dark)">Have a code from a previous visit?</summary>`;
  const codeRow = document.createElement('div');
  codeRow.style.marginTop = '12px';
  codeRow.innerHTML = `<label class="field-label" for="return-code">Enter your code</label>
    <input type="text" id="return-code" placeholder="e.g. 🦊 Bold-Otter-42">`;
  const lookupBtn = document.createElement('button');
  lookupBtn.className = 'btn secondary';
  lookupBtn.style.marginTop = '10px';
  lookupBtn.textContent = 'Find my schedule';
  lookupBtn.addEventListener('click', async () => {
    const val = document.getElementById('return-code').value.trim();
    if (!val) return;
    lookupBtn.textContent = 'Looking…';
    const result = await lookUpSavedCode(val);
    if (result) {
      const links = [];
      if (result.docUrl) links.push(`<a href="${result.docUrl}" target="_blank" rel="noopener">Open your Google Doc</a>`);
      if (result.sheetUrl) links.push(`<a href="${result.sheetUrl}" target="_blank" rel="noopener">Open your Google Sheet</a>`);
      codeRow.insertAdjacentHTML('beforeend', `<p class="banner success">${links.join(' &middot; ') || 'Found it, but no links were saved.'}</p>`);
    } else {
      codeRow.insertAdjacentHTML('beforeend', `<p class="banner danger">Couldn't find that code. Double-check it and try again.</p>`);
    }
    lookupBtn.textContent = 'Find my schedule';
  });
  codeRow.appendChild(lookupBtn);
  hasCode.appendChild(codeRow);
  if (backendConfigured()) wrap.appendChild(hasCode);

  if (state.step < QUESTIONS.length) {
    wrap.appendChild(renderProgress(state.step, total, 'Question ' + (state.step + 1) + ' of ' + QUESTIONS.length));
    wrap.appendChild(renderQuestionCard(QUESTIONS[state.step]));
  } else {
    wrap.appendChild(renderProgress(total - 1, total, 'Your schedule'));
    wrap.appendChild(renderResultsCard());
  }
  return wrap;
}

function renderProgress(current, total, label) {
  const container = document.createElement('div');
  const ul = document.createElement('ul');
  ul.className = 'progress';
  for (let i = 0; i < total; i++) {
    const li = document.createElement('li');
    li.className = i < current ? 'done' : (i === current ? 'current' : '');
    ul.appendChild(li);
  }
  const p = document.createElement('p');
  p.className = 'progress-label';
  p.textContent = label;
  container.appendChild(ul);
  container.appendChild(p);
  return container;
}

function renderQuestionCard(q) {
  const card = document.createElement('section');
  card.className = 'card';
  const fs = document.createElement('fieldset');
  const legend = document.createElement('legend');
  legend.id = 'q-title';
  legend.textContent = q.title;
  fs.appendChild(legend);
  if (q.hint) {
    const hint = document.createElement('p');
    hint.className = 'hint';
    hint.textContent = q.hint;
    fs.appendChild(hint);
  }

  if (q.render === 'choice') fs.appendChild(renderChoiceInput(q));
  else if (q.render === 'text') fs.appendChild(renderTextInput(q));
  else if (q.render === 'blackout') fs.appendChild(renderBlackoutInput(q));
  else if (q.render === 'rank') fs.appendChild(renderRankInput(q));
  else if (q.render === 'tags') fs.appendChild(renderTagsInput(q));

  card.appendChild(fs);
  card.appendChild(renderStudentNav());
  return card;
}

function renderChoiceInput(q) {
  const grid = document.createElement('div');
  grid.className = 'choice-grid';
  const inputType = q.type === 'multi' ? 'checkbox' : 'radio';
  const current = state.answers[q.id] || (q.type === 'multi' ? [] : null);
  q.options.forEach((opt, idx) => {
    const row = document.createElement('div');
    const selected = q.type === 'multi' ? current.includes(opt) : current === opt;
    row.className = 'choice' + (selected ? ' selected' : '');
    const inputId = q.id + '-' + idx;
    const input = document.createElement('input');
    input.type = inputType;
    input.name = q.id;
    input.id = inputId;
    input.checked = selected;
    input.addEventListener('change', () => {
      if (q.type === 'multi') {
        const set = new Set(state.answers[q.id] || []);
        input.checked ? set.add(opt) : set.delete(opt);
        state.answers[q.id] = Array.from(set);
      } else {
        state.answers[q.id] = opt;
      }
      render();
      document.getElementById(inputId)?.focus();
    });
    const label = document.createElement('label');
    label.htmlFor = inputId;
    label.textContent = opt;
    row.appendChild(input);
    row.appendChild(label);
    grid.appendChild(row);
  });
  return grid;
}

function renderTextInput(q) {
  const ta = document.createElement('textarea');
  ta.setAttribute('aria-label', q.title);
  ta.value = state.answers[q.id] || '';
  ta.addEventListener('input', () => { state.answers[q.id] = ta.value; });
  return ta;
}

function renderBlackoutInput(q) {
  const wrap = document.createElement('div');
  const list = state.answers.blackouts || [];

  list.forEach((b, idx) => {
    const row = document.createElement('div');
    row.className = 'repeater-row';

    const daySel = document.createElement('select');
    daySel.setAttribute('aria-label', 'Day not available, row ' + (idx + 1));
    DAYS.forEach(d => { const o = document.createElement('option'); o.value = d; o.textContent = DAY_NAMES[d]; if (b.day === d) o.selected = true; daySel.appendChild(o); });
    daySel.addEventListener('change', () => { b.day = daySel.value; });

    const startInput = document.createElement('input');
    startInput.type = 'text';
    startInput.placeholder = 'Start (e.g. 2 PM)';
    startInput.value = b.start || '';
    startInput.setAttribute('aria-label', 'Not available starting at, row ' + (idx + 1));
    startInput.addEventListener('input', () => { b.start = startInput.value; });

    const endInput = document.createElement('input');
    endInput.type = 'text';
    endInput.placeholder = 'End (e.g. 5 PM)';
    endInput.value = b.end || '';
    endInput.setAttribute('aria-label', 'Not available until, row ' + (idx + 1));
    endInput.addEventListener('input', () => { b.end = endInput.value; });

    const removeBtn = document.createElement('button');
    removeBtn.className = 'pill-btn';
    removeBtn.type = 'button';
    removeBtn.textContent = 'Remove';
    removeBtn.setAttribute('aria-label', 'Remove this unavailable time');
    removeBtn.addEventListener('click', () => { list.splice(idx, 1); render(); });

    row.appendChild(daySel);
    row.appendChild(startInput);
    row.appendChild(endInput);
    row.appendChild(removeBtn);
    wrap.appendChild(row);
  });

  const addBtn = document.createElement('button');
  addBtn.className = 'btn secondary';
  addBtn.type = 'button';
  addBtn.textContent = '+ Add a day/time';
  addBtn.addEventListener('click', () => { list.push({ day: 'Mon', start: '', end: '' }); state.answers.blackouts = list; render(); });
  wrap.appendChild(addBtn);
  return wrap;
}

function renderRankInput(q) {
  const wrap = document.createElement('ol');
  wrap.className = 'rank-list';
  wrap.setAttribute('aria-label', q.title);
  const order = state.answers.priorities;

  order.forEach((item, idx) => {
    const li = document.createElement('li');
    li.className = 'rank-item';
    const num = document.createElement('span');
    num.className = 'rank-num';
    num.textContent = String(idx + 1);
    const label = document.createElement('span');
    label.className = 'rank-label';
    label.textContent = item;
    const btns = document.createElement('div');
    btns.className = 'rank-btns';

    const up = document.createElement('button');
    up.type = 'button';
    up.className = 'rank-move';
    up.setAttribute('aria-label', 'Move ' + item + ' up in priority');
    up.textContent = '▲';
    up.disabled = idx === 0;
    up.addEventListener('click', () => { [order[idx - 1], order[idx]] = [order[idx], order[idx - 1]]; render(); document.getElementById('rank-btn-' + (idx - 1))?.focus(); });

    const down = document.createElement('button');
    down.type = 'button';
    down.className = 'rank-move';
    down.setAttribute('aria-label', 'Move ' + item + ' down in priority');
    down.textContent = '▼';
    down.disabled = idx === order.length - 1;
    down.addEventListener('click', () => { [order[idx + 1], order[idx]] = [order[idx], order[idx + 1]]; render(); document.getElementById('rank-btn-' + (idx + 1))?.focus(); });

    up.id = 'rank-btn-' + idx;
    btns.appendChild(up);
    btns.appendChild(down);
    li.appendChild(num);
    li.appendChild(label);
    li.appendChild(btns);
    wrap.appendChild(li);
  });
  return wrap;
}

function renderTagsInput(q) {
  const wrap = document.createElement('div');
  const tags = state.answers.exclusions || [];

  const chipRow = document.createElement('div');
  chipRow.className = 'tag-chip-row';
  tags.forEach((tag, idx) => {
    const chip = document.createElement('span');
    chip.className = 'tag-chip';
    chip.textContent = tag;
    const rm = document.createElement('button');
    rm.type = 'button';
    rm.setAttribute('aria-label', 'Remove exclusion: ' + tag);
    rm.textContent = '×';
    rm.addEventListener('click', () => { tags.splice(idx, 1); render(); });
    chip.appendChild(rm);
    chipRow.appendChild(chip);
  });
  wrap.appendChild(chipRow);

  const inputRow = document.createElement('div');
  inputRow.className = 'repeater-row';
  const input = document.createElement('input');
  input.type = 'text';
  input.placeholder = 'Type a topic and press Add';
  input.setAttribute('aria-label', 'Topic to exclude entirely');
  const addBtn = document.createElement('button');
  addBtn.type = 'button';
  addBtn.className = 'btn secondary';
  addBtn.textContent = 'Add';
  const addTag = () => {
    const val = input.value.trim();
    if (val) { tags.push(val); state.answers.exclusions = tags; input.value = ''; render(); }
  };
  addBtn.addEventListener('click', addTag);
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } });
  inputRow.appendChild(input);
  inputRow.appendChild(addBtn);
  wrap.appendChild(inputRow);
  return wrap;
}

function renderStudentNav() {
  const row = document.createElement('div');
  row.className = 'btn-row';
  const back = document.createElement('button');
  back.className = 'btn secondary';
  back.type = 'button';
  back.textContent = 'Back';
  back.disabled = state.step === 0;
  back.addEventListener('click', () => { state.step = Math.max(0, state.step - 1); render(); });

  const next = document.createElement('button');
  next.className = 'btn primary';
  next.type = 'button';
  const isLast = state.step === QUESTIONS.length - 1;
  next.textContent = isLast ? 'See my schedule' : 'Next';
  next.addEventListener('click', () => {
    if (isLast) state.results = buildWeeklySchedule();
    state.step += 1;
    render();
  });
  row.appendChild(back);
  row.appendChild(next);
  return row;
}

/* ==========================================================
   MATCHING
   ========================================================== */
function timeToMinutes(str) {
  if (!str) return null;
  const m = String(str).trim().match(/(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?/i);
  if (!m) return null;
  let hour = parseInt(m[1], 10);
  const min = m[2] ? parseInt(m[2], 10) : 0;
  const meridiem = m[3] ? m[3].toUpperCase() : null;
  if (meridiem === 'PM' && hour !== 12) hour += 12;
  if (meridiem === 'AM' && hour === 12) hour = 0;
  return hour * 60 + min;
}
function isMorning(startTime) {
  const t = timeToMinutes(startTime);
  return t !== null && t < 12 * 60;
}
function rangesOverlap(aStart, aEnd, bStart, bEnd) {
  return aStart < bEnd && bStart < aEnd;
}

function matchWorkshops() {
  const a = state.answers;
  const exclusions = (a.exclusions || []).map(t => t.toLowerCase());
  const priorityWeight = {};
  (a.priorities || []).forEach((tag, idx) => { priorityWeight[tag] = (a.priorities.length - idx); });

  let pool = state.workshops.filter(w => !w.canceled);

  // hard exclusions -- keyword match against title + notes
  pool = pool.filter(w => {
    const hay = (w.title + ' ' + (w.notes || '')).toLowerCase();
    return !exclusions.some(ex => ex && hay.includes(ex));
  });

  // blackout conflicts
  const blackouts = (a.blackouts || []).filter(b => b.start && b.end);
  pool = pool.filter(w => {
    const ws = timeToMinutes(w.startTime), we = timeToMinutes(w.endTime);
    if (ws === null || we === null) return true;
    return !blackouts.some(b => {
      if (b.day !== w.day) return false;
      const bs = timeToMinutes(b.start), be = timeToMinutes(b.end);
      if (bs === null || be === null) return true;
      return rangesOverlap(ws, we, bs, be);
    });
  });

  // mobility filter
  const mobility = a.mobility || [];
  if (mobility.includes('Gentle activities only')) {
    pool = pool.filter(w => w.intensity !== 'Active' && w.intensity !== 'Moderate');
  } else if (mobility.includes('Light walking only')) {
    pool = pool.filter(w => w.intensity !== 'Active');
  }

  // preferred time
  if (a.preferredTimes === 'Mornings') pool = pool.filter(w => isMorning(w.startTime));
  else if (a.preferredTimes === 'Afternoons') pool = pool.filter(w => !isMorning(w.startTime));

  // score by priority tags
  const scored = pool.map(w => {
    const tags = w.tags || [];
    let score = tags.reduce((sum, t) => sum + (priorityWeight[t] || 0), 0);
    if (score === 0) score = 1; // keep as a fallback option, ranked lowest
    return { w, score };
  }).sort((x, y) => y.score - x.score);

  const dayTarget = { '1 day': 1, '2 days': 2, '3 days': 3, '4 days': 4, '5 days': 5 }[a.daysPerWeek] || 3;
  const chosenByDay = {};
  const chosen = [];
  for (const { w } of scored) {
    const dayCount = Object.keys(chosenByDay).length;
    const alreadyOnDay = (chosenByDay[w.day] || 0);
    if (alreadyOnDay >= 2) continue; // cap 2 per day to keep it manageable
    if (!chosenByDay[w.day] && dayCount >= dayTarget) continue; // don't add new days past target
    chosenByDay[w.day] = alreadyOnDay + 1;
    chosen.push(w);
    if (chosen.length >= dayTarget * 2) break;
  }
  return chosen.sort((x, y) => DAYS.indexOf(x.day) - DAYS.indexOf(y.day) || (timeToMinutes(x.startTime) || 0) - (timeToMinutes(y.startTime) || 0));
}

/* ---- build a dated, weekly-repeating schedule for the current month ---- */
function buildWeeklySchedule() {
  const matched = matchWorkshops();
  const weeks = getWeeksInCurrentMonth();
  return weeks.map((week, i) => ({
    label: `WEEK ${i + 1} (${formatDate(week.start)} – ${formatDate(week.end)})`,
    items: matched
      .map(w => {
        const date = week.dates[DAYS.indexOf(w.day)];
        if (!date) return null;
        const dateStr = formatDate(date);
        const skip = (w.skipDates || '').split(',').map(s => s.trim()).filter(Boolean);
        if (skip.includes(shortDate(date))) return null;
        return {
          day: DAY_NAMES[w.day], date: dateStr, start: w.startTime, end: w.endTime,
          title: w.title, formatLoc: `${w.format || 'Online'}${w.location ? ', ' + w.location : ''}`,
          note: w.notes || ''
        };
      })
      .filter(Boolean)
  })).filter(w => w.items.length > 0);
}

function getWeeksInCurrentMonth() {
  const now = new Date();
  const year = now.getFullYear(), month = now.getMonth();
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const weeks = [];
  let cursor = new Date(first);
  // rewind to Monday of the first week
  const dow = cursor.getDay();
  const diffToMon = dow === 0 ? -6 : 1 - dow;
  cursor.setDate(cursor.getDate() + diffToMon);
  while (cursor <= last) {
    const dates = [];
    for (let i = 0; i < 5; i++) { dates.push(new Date(cursor)); cursor.setDate(cursor.getDate() + 1); }
    cursor.setDate(cursor.getDate() + 2); // skip weekend
    if (dates.some(d => d.getMonth() === month)) {
      weeks.push({ start: dates[0], end: dates[4], dates });
    }
  }
  return weeks;
}
function formatDate(d) { return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); }
function shortDate(d) { return `${d.getMonth() + 1}/${d.getDate()}`; }

/* ==========================================================
   RESULTS + EXPORT
   ========================================================== */
function renderResultsCard() {
  const card = document.createElement('section');
  card.className = 'card';
  const h2 = document.createElement('h2');
  h2.style.color = 'var(--primary-dark)';
  h2.textContent = 'Your suggested schedule';
  card.appendChild(h2);

  const weeks = state.results;
  if (!weeks.length) {
    const banner = document.createElement('p');
    banner.className = 'banner info';
    banner.textContent = "We couldn't find a close match this month. A staff member can help you pick activities in person.";
    card.appendChild(banner);
  } else {
    weeks.forEach(week => {
      const h3 = document.createElement('h3');
      h3.textContent = week.label;
      h3.style.color = 'var(--primary-dark)';
      card.appendChild(h3);
      week.items.forEach((item, i) => {
        const div = document.createElement('div');
        div.className = 'result-item';
        const cbId = week.label + '-' + i;
        div.innerHTML = `
          <input type="checkbox" id="${escapeHtml(cbId)}">
          <div>
            <label for="${escapeHtml(cbId)}" class="r-title">${escapeHtml(item.title)}</label>
            <div class="r-meta">${escapeHtml(item.day)}, ${escapeHtml(item.date)} &middot; ${escapeHtml(item.start)}–${escapeHtml(item.end)} &middot; ${escapeHtml(item.formatLoc)}</div>
            ${item.note ? `<div class="r-meta">${escapeHtml(item.note)}</div>` : ''}
          </div>`;
        card.appendChild(div);
      });
    });
  }

  card.appendChild(renderExportControls());

  const row = document.createElement('div');
  row.className = 'btn-row no-print';
  const back = document.createElement('button');
  back.className = 'btn secondary';
  back.textContent = 'Back to questions';
  back.addEventListener('click', () => { state.step = QUESTIONS.length - 1; render(); });
  const startOver = document.createElement('button');
  startOver.className = 'btn secondary';
  startOver.textContent = 'Start over';
  startOver.addEventListener('click', () => {
    state.step = 0;
    state.answers = { blackouts: [], priorities: TAG_OPTIONS.slice(), exclusions: [] };
    state.results = [];
    render();
  });
  row.appendChild(back);
  row.appendChild(startOver);
  card.appendChild(row);
  return card;
}

function scheduleToText(weeks) {
  return weeks.map(week => {
    const lines = week.items.map(it => `- ${it.day}, ${it.date} | ${it.start}–${it.end} | ${it.title} (${it.formatLoc})${it.note ? ' — ' + it.note : ''}`);
    return `${week.label}\n${lines.join('\n')}`;
  }).join('\n\n');
}

function renderExportControls() {
  const wrap = document.createElement('div');
  wrap.className = 'card no-print';
  wrap.style.background = 'var(--paper)';
  const h3 = document.createElement('h3');
  h3.textContent = 'Save or share this schedule';
  h3.style.color = 'var(--primary-dark)';
  wrap.appendChild(h3);

  const p = document.createElement('p');
  p.className = 'hint';
  p.textContent = backendConfigured()
    ? 'Create a live Google Doc or Sheet, or print this page. You\'ll get a fun code to find it again later.'
    : 'Print this page, or copy the text below to paste into your own document.';
  wrap.appendChild(p);

  const row = document.createElement('div');
  row.className = 'btn-row';

  const printBtn = document.createElement('button');
  printBtn.className = 'btn secondary';
  printBtn.type = 'button';
  printBtn.textContent = 'Print this page';
  printBtn.addEventListener('click', () => {
    try { window.print(); } catch (e) { alert('Use your browser\'s Print option (Ctrl/Cmd+P) to print this page.'); }
  });
  row.appendChild(printBtn);

  const copyBtn = document.createElement('button');
  copyBtn.className = 'btn secondary';
  copyBtn.type = 'button';
  copyBtn.textContent = 'Copy schedule as text';
  copyBtn.addEventListener('click', async () => {
    const text = scheduleToText(state.results);
    try {
      await navigator.clipboard.writeText(text);
      copyBtn.textContent = 'Copied!';
    } catch (e) {
      copyBtn.textContent = 'Could not copy — select and copy manually';
    }
    setTimeout(() => { copyBtn.textContent = 'Copy schedule as text'; }, 2500);
  });
  row.appendChild(copyBtn);

  if (backendConfigured()) {
    const docBtn = document.createElement('button');
    docBtn.className = 'btn primary';
    docBtn.type = 'button';
    docBtn.textContent = 'Create my Google Doc';
    docBtn.addEventListener('click', () => runExport({ wantDoc: true }, docBtn, 'Doc'));
    row.appendChild(docBtn);

    const sheetBtn = document.createElement('button');
    sheetBtn.className = 'btn primary';
    sheetBtn.type = 'button';
    sheetBtn.textContent = 'Create my Google Sheet';
    sheetBtn.addEventListener('click', () => runExport({ wantSheet: true }, sheetBtn, 'Sheet'));
    row.appendChild(sheetBtn);
  }

  wrap.appendChild(row);
  wrap.appendChild(document.createElement('div')).id = 'export-result';
  return wrap;
}

async function runExport(opts, btn, label) {
  btn.disabled = true;
  const original = btn.textContent;
  btn.textContent = 'Creating…';
  const result = await createExportOnBackend(Object.assign({ weeks: state.results }, opts));
  btn.disabled = false;
  btn.textContent = original;
  const target = document.getElementById('export-result');
  if (result.ok) {
    const url = opts.wantDoc ? result.docUrl : result.sheetUrl;
    target.innerHTML = `<p class="banner success">Your ${label} is ready: <a href="${url}" target="_blank" rel="noopener">Open it</a>.<br>Your code to find it again: <strong>${escapeHtml(result.code)}</strong> — write it down!</p>`;
  } else {
    target.innerHTML = `<p class="banner danger">Couldn't create that right now (${escapeHtml(result.error || 'unknown error')}). Try the print or copy option instead.</p>`;
  }
}

/* ==========================================================
   STAFF FLOW
   ========================================================== */
function renderStaffFlow() {
  const wrap = document.createElement('div');
  if (!state.staffUnlocked) {
    const p = document.createElement('p');
    p.className = 'banner info';
    p.textContent = 'Enter the staff password to edit this month\'s activities.';
    wrap.appendChild(p);
    return wrap;
  }

  const banner = document.createElement('p');
  banner.className = 'banner info';
  banner.textContent = backendConfigured()
    ? 'Changes save to the shared list — every student sees the update.'
    : 'No shared backend configured — changes only apply to this browser. See README.md.';
  wrap.appendChild(banner);

  wrap.appendChild(renderPasteParseCard());
  wrap.appendChild(renderStaffTableCard());
  return wrap;
}

function renderPasteParseCard() {
  const card = document.createElement('section');
  card.className = 'card';
  const h2 = document.createElement('h2');
  h2.style.color = 'var(--primary-dark)';
  h2.textContent = "Paste this month's newsletter (optional shortcut)";
  card.appendChild(h2);
  const p = document.createElement('p');
  p.className = 'hint';
  p.textContent = 'Best-effort only — always review the parsed rows below before saving. This will not catch everything.';
  card.appendChild(p);

  const ta = document.createElement('textarea');
  ta.style.minHeight = '160px';
  ta.setAttribute('aria-label', 'Paste newsletter text here');
  card.appendChild(ta);

  const parseBtn = document.createElement('button');
  parseBtn.className = 'btn secondary';
  parseBtn.style.marginTop = '12px';
  parseBtn.textContent = 'Parse and add to list below';
  parseBtn.addEventListener('click', () => {
    const parsed = parseNewsletterText(ta.value);
    state.workshops = state.workshops.concat(parsed);
    persistWorkshops();
    render();
  });
  card.appendChild(parseBtn);
  return card;
}

function renderStaffTableCard() {
  const card = document.createElement('section');
  card.className = 'card';
  const h2 = document.createElement('h2');
  h2.style.color = 'var(--primary-dark)';
  h2.textContent = "This month's activities";
  card.appendChild(h2);

  const table = document.createElement('table');
  table.className = 'admin-table';
  table.innerHTML = `<thead><tr>
    <th scope="col">Title</th><th scope="col">Tags</th><th scope="col">Day</th><th scope="col">Start</th>
    <th scope="col">End</th><th scope="col">Format</th><th scope="col">Intensity</th><th scope="col">Location</th>
    <th scope="col">Notes</th><th scope="col">Skip dates</th><th scope="col">Canceled</th><th scope="col">Remove</th>
  </tr></thead>`;
  const tbody = document.createElement('tbody');

  state.workshops.forEach((w, idx) => {
    const tr = document.createElement('tr');
    tr.appendChild(textCell(w, idx, 'title', 'Activity title'));
    tr.appendChild(tagsCell(w, idx));
    tr.appendChild(selectCell(w, idx, 'day', DAYS));
    tr.appendChild(textCell(w, idx, 'startTime', 'e.g. 9 AM'));
    tr.appendChild(textCell(w, idx, 'endTime', 'e.g. 10 AM'));
    tr.appendChild(selectCell(w, idx, 'format', FORMATS));
    tr.appendChild(selectCell(w, idx, 'intensity', INTENSITIES));
    tr.appendChild(textCell(w, idx, 'location', 'Location'));
    tr.appendChild(textCell(w, idx, 'notes', 'Notes'));
    tr.appendChild(textCell(w, idx, 'skipDates', 'e.g. 7/20, 7/27'));
    tr.appendChild(checkboxCell(w, idx, 'canceled'));
    const removeTd = document.createElement('td');
    const removeBtn = document.createElement('button');
    removeBtn.className = 'pill-btn';
    removeBtn.textContent = 'Remove';
    removeBtn.setAttribute('aria-label', 'Remove ' + (w.title || 'this activity'));
    removeBtn.addEventListener('click', () => { state.workshops.splice(idx, 1); persistWorkshops(); render(); });
    removeTd.appendChild(removeBtn);
    tr.appendChild(removeTd);
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  card.appendChild(table);

  const addBtn = document.createElement('button');
  addBtn.className = 'btn secondary';
  addBtn.style.marginTop = '16px';
  addBtn.textContent = '+ Add an activity';
  addBtn.addEventListener('click', () => {
    state.workshops.push({ id: cryptoId(), title: '', tags: [], day: 'Mon', startTime: '', endTime: '', format: 'In-Person Only', intensity: 'Moderate', location: '', instructor: '', notes: '', skipDates: '', canceled: false });
    persistWorkshops();
    render();
  });
  card.appendChild(addBtn);

  const saveRow = document.createElement('div');
  saveRow.className = 'btn-row';
  const saveBtn = document.createElement('button');
  saveBtn.className = 'btn primary';
  saveBtn.textContent = backendConfigured() ? 'Save for all students' : 'Save (this browser only)';
  saveBtn.addEventListener('click', async () => {
    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving…';
    saveLocalWorkshops(state.workshops);
    if (backendConfigured()) {
      const result = await saveClassesToBackend(state.workshops, state.staffPassword);
      saveBtn.textContent = result.ok ? 'Saved for all students ✓' : 'Save failed — try again';
    } else {
      saveBtn.textContent = 'Saved to this browser ✓';
    }
    saveBtn.disabled = false;
    setTimeout(() => { saveBtn.textContent = backendConfigured() ? 'Save for all students' : 'Save (this browser only)'; }, 2500);
  });
  saveRow.appendChild(saveBtn);
  card.appendChild(saveRow);
  return card;
}

function persistWorkshops() { saveLocalWorkshops(state.workshops); }

function textCell(w, idx, field, placeholder) {
  const td = document.createElement('td');
  const input = document.createElement('input');
  input.type = 'text';
  input.value = w[field] || '';
  input.placeholder = placeholder;
  input.setAttribute('aria-label', placeholder + ', row ' + (idx + 1));
  input.addEventListener('input', () => { state.workshops[idx][field] = input.value; persistWorkshops(); });
  td.appendChild(input);
  return td;
}
function selectCell(w, idx, field, options) {
  const td = document.createElement('td');
  const select = document.createElement('select');
  select.setAttribute('aria-label', field + ', row ' + (idx + 1));
  options.forEach(opt => { const o = document.createElement('option'); o.value = opt; o.textContent = opt; if (w[field] === opt) o.selected = true; select.appendChild(o); });
  select.addEventListener('change', () => { state.workshops[idx][field] = select.value; persistWorkshops(); });
  td.appendChild(select);
  return td;
}
function checkboxCell(w, idx, field) {
  const td = document.createElement('td');
  const input = document.createElement('input');
  input.type = 'checkbox';
  input.checked = !!w[field];
  input.setAttribute('aria-label', field + ', row ' + (idx + 1));
  input.addEventListener('change', () => { state.workshops[idx][field] = input.checked; persistWorkshops(); });
  td.appendChild(input);
  return td;
}
function tagsCell(w, idx) {
  const td = document.createElement('td');
  const select = document.createElement('select');
  select.multiple = true;
  select.size = 3;
  select.setAttribute('aria-label', 'Tags, row ' + (idx + 1));
  TAG_OPTIONS.forEach(opt => {
    const o = document.createElement('option');
    o.value = opt; o.textContent = opt;
    if ((w.tags || []).includes(opt)) o.selected = true;
    select.appendChild(o);
  });
  select.addEventListener('change', () => {
    state.workshops[idx].tags = Array.from(select.selectedOptions).map(o => o.value);
    persistWorkshops();
  });
  td.appendChild(select);
  return td;
}

/* ==========================================================
   NEWSLETTER PARSER (best-effort)
   ========================================================== */
const TAG_KEYWORDS = {
  'Gentle movement': ['yoga', 'qi gong', 'tai chi', 'walk', 'stretch', 'chair'],
  'Art': ['art', 'paint', 'craft', 'photo', 'draw', 'sculpt', 'felting', 'stitch'],
  'Nature & animals': ['animal', 'garden', 'outdoor', 'pickleball', 'bowling'],
  'Cooking': ['cook', 'nutrition', 'protein', 'culinary', 'recipe'],
  'Socializing': ['social', 'chat', 'bingo', 'dance', 'game', 'trivia', 'club', 'ice cream', 'movie'],
  'Volunteering': ['volunteer'],
  'Learning new skills': ['computer', 'typing', 'lab', 'skills', 'money', 'tech'],
  'Music': ['music', 'harmonica', 'piano', 'playlist', 'sing', 'karaoke'],
  'Employment': ['job', 'interview', 'resume', 'employment', 'office', 'career'],
  'Education (HS/college)': ['ged', 'math', 'reading', 'study', 'tutoring', 'school', 'college', 'writing']
};
const INTENSITY_KEYWORDS = {
  Gentle: ['gentle', 'chair', 'seated', 'qi gong', 'tai chi', 'meditation', 'mindfulness'],
  Active: ['fitness', 'resistance', 'weight', 'bowling', 'pickleball', 'workout']
};
const DAY_HEADER_RE = /^(MONDAY|TUESDAY|WEDNESDAY|THURSDAY|FRIDAY)\s*$/i;
const ENTRY_RANGE_RE = /^([*#]?)\s*(\d{1,2}(?::\d{2})?\s*(?:AM|PM)?)\s*[-–]\s*(\d{1,2}(?::\d{2})?\s*(?:AM|PM))\s*\|\s*(.+)$/i;
const ENTRY_SINGLE_RE = /^([*#]?)\s*(\d{1,2}(?::\d{2})?\s*(?:AM|PM))\s*\|\s*(.+)$/i;
const DAY_ABBR = { MONDAY: 'Mon', TUESDAY: 'Tue', WEDNESDAY: 'Wed', THURSDAY: 'Thu', FRIDAY: 'Fri' };

function guessTags(title) {
  const t = title.toLowerCase();
  return Object.keys(TAG_KEYWORDS).filter(tag => TAG_KEYWORDS[tag].some(k => t.includes(k)));
}
function guessIntensity(title) {
  const t = title.toLowerCase();
  if (INTENSITY_KEYWORDS.Active.some(k => t.includes(k))) return 'Active';
  if (INTENSITY_KEYWORDS.Gentle.some(k => t.includes(k))) return 'Gentle';
  return 'Moderate';
}
function inferStartMeridiem(startRaw, endRaw) {
  if (/AM|PM/i.test(startRaw)) return startRaw;
  const m = endRaw.match(/AM|PM/i);
  return m ? (startRaw.trim() + ' ' + m[0].toUpperCase()) : startRaw;
}

function parseNewsletterText(text) {
  const lines = text.split('\n').map(l => l.trim());
  const out = [];
  let currentDay = null;
  let currentEntry = null;

  function flush() {
    if (!currentEntry) return;
    const desc = currentEntry.descLines.join(' ').trim();
    const skipMatch = desc.match(/no class[^.]*?((\d{1,2}\/\d{1,2}[,\s&]*)+)/i) || desc.match(/((\d{1,2}\/\d{1,2}[,\s&]*)+)no class/i);
    const skipDates = skipMatch ? skipMatch[1].replace(/&/g, ',').split(/[,\s]+/).filter(s => /\d\/\d/.test(s)).join(', ') : '';
    out.push({
      id: cryptoId(),
      title: currentEntry.title,
      tags: guessTags(currentEntry.title),
      day: currentDay,
      startTime: currentEntry.start,
      endTime: currentEntry.end,
      format: currentEntry.symbol === '*' ? 'In-Person Only' : currentEntry.symbol === '#' ? 'Hybrid' : 'Online',
      intensity: guessIntensity(currentEntry.title),
      location: currentEntry.location,
      instructor: currentEntry.instructor,
      notes: desc.slice(0, 200),
      skipDates,
      canceled: false
    });
    currentEntry = null;
  }

  for (const line of lines) {
    if (!line) continue;
    const dayMatch = line.match(DAY_HEADER_RE);
    if (dayMatch) { flush(); currentDay = DAY_ABBR[dayMatch[1].toUpperCase()]; continue; }
    if (!currentDay) continue;
    if (/^\*{2,3}Reminder/i.test(line) || /contact the front desk/i.test(line)) continue;

    const rangeMatch = line.match(ENTRY_RANGE_RE);
    const singleMatch = !rangeMatch && line.match(ENTRY_SINGLE_RE);

    if (rangeMatch || singleMatch) {
      flush();
      const symbol = (rangeMatch || singleMatch)[1];
      let start, end, rest;
      if (rangeMatch) {
        start = inferStartMeridiem(rangeMatch[2], rangeMatch[3]);
        end = rangeMatch[3];
        rest = rangeMatch[4];
      } else {
        start = singleMatch[2];
        end = start; // unknown duration, default same as start; staff should adjust
        rest = singleMatch[3];
      }
      const fields = rest.split('|').map(f => f.trim());
      const title = (fields[0] || '').replace(/\(INFO\)/i, '').trim();
      const instructor = fields[1] || '';
      const location = fields[2] || fields[1] || '';
      currentEntry = { symbol, start, end, title, instructor, location, descLines: [] };
    } else if (currentEntry) {
      currentEntry.descLines.push(line);
    }
  }
  flush();
  return out;
}

function cryptoId() { return 'w_' + Math.random().toString(36).slice(2, 10); }
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str == null ? '' : String(str);
  return div.innerHTML;
}
