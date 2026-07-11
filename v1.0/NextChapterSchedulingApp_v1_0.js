/* ==========================================================
   DATA MODEL
   Workshops are entered by staff each month. Nothing here is
   ever sent to a server -- everything lives in this browser's
   localStorage, so no personal data leaves the device. That is
   what keeps V1 outside HIPAA's technical requirements: there
   is no PHI, and nothing is transmitted or stored remotely.
   ========================================================== */

const STORAGE_KEY = 'rehabScheduler.workshops.v1';
const CATEGORIES = ['Life Skills', 'Job Readiness', 'Health & Wellness', 'Social & Recreation', 'Community Outing', 'Creative Arts'];
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
const TIMES = ['Morning', 'Afternoon', 'Evening'];

function loadWorkshops() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return sampleWorkshops();
    return JSON.parse(raw);
  } catch (e) {
    return sampleWorkshops();
  }
}
function saveWorkshops(list) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}
function sampleWorkshops() {
  // Placeholder starter content so the app isn't empty on first load.
  // Staff should replace this via the "Staff: edit this month's list" screen.
  return [
    { id: cryptoId(), title: 'Grocery Budgeting Basics', category: 'Life Skills', day: 'Mon', time: 'Morning', date: '', location: 'Room 2', notes: '' },
    { id: cryptoId(), title: 'Mock Job Interviews', category: 'Job Readiness', day: 'Tue', time: 'Afternoon', date: '', location: 'Room 4', notes: '' },
    { id: cryptoId(), title: 'Walking Group', category: 'Health & Wellness', day: 'Wed', time: 'Morning', date: '', location: 'Front lawn', notes: '' },
    { id: cryptoId(), title: 'Board Game Afternoon', category: 'Social & Recreation', day: 'Thu', time: 'Afternoon', date: '', location: 'Lounge', notes: '' },
    { id: cryptoId(), title: 'Trip to the Botanic Gardens', category: 'Community Outing', day: 'Fri', time: 'Morning', date: '', location: 'Meet at front desk', notes: 'Van seats limited to 10' },
    { id: cryptoId(), title: 'Watercolor Painting', category: 'Creative Arts', day: 'Wed', time: 'Afternoon', date: '', location: 'Art room', notes: '' }
  ];
}
function cryptoId() {
  return 'w_' + Math.random().toString(36).slice(2, 10);
}

/* ==========================================================
   STUDENT QUESTIONS
   Placeholder set of 6 questions -- replace QUESTIONS below
   with the exact questions your program already uses. Each
   question just needs an id, prompt, type, and (for choice
   types) options that match a workshop field so matching works.
   ========================================================== */
const QUESTIONS = [
  { id: 'categories', prompt: 'What kinds of activities are you interested in this month?', hint: 'Choose as many as you like.', type: 'multi', options: CATEGORIES },
  { id: 'days', prompt: 'Which days work best for you?', hint: 'Choose as many as you like.', type: 'multi', options: DAYS },
  { id: 'time', prompt: 'What time of day works best?', type: 'multi', options: TIMES },
  { id: 'transport', prompt: 'How will you get to activities?', type: 'single', options: ['I have my own transportation', 'I will use the program van', 'Someone drives me', 'I need help arranging transportation'] },
  { id: 'count', prompt: 'How many activities would you like to sign up for this month?', type: 'single', options: ['1-2', '3-4', '5 or more'] },
  { id: 'accommodations', prompt: 'Is there anything we should know to help you take part comfortably?', hint: 'Optional. For example: needs a quiet space, uses a mobility aid, prefers smaller groups.', type: 'text' }
];

/* ==========================================================
   APP STATE + ROUTER
   ========================================================== */
const state = {
  mode: 'student', // 'student' | 'staff'
  step: 0,
  answers: {},
  workshops: loadWorkshops(),
  results: []
};

const root = document.getElementById('app-root');

function render() {
  root.innerHTML = '';
  const nav = renderModeSwitch();
  root.appendChild(nav);
  if (state.mode === 'student') {
    root.appendChild(renderStudentFlow());
  } else {
    root.appendChild(renderStaffFlow());
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
      state.mode = btn.dataset.mode;
      state.step = 0;
      render();
    });
  });
  return nav;
}

/* ---------------- STUDENT FLOW ---------------- */
function renderStudentFlow() {
  const wrap = document.createElement('div');
  const totalSteps = QUESTIONS.length + 1; // + results step

  if (state.step < QUESTIONS.length) {
    wrap.appendChild(renderProgress(state.step, totalSteps, 'Question ' + (state.step + 1) + ' of ' + QUESTIONS.length));
    wrap.appendChild(renderQuestionCard(QUESTIONS[state.step]));
  } else {
    wrap.appendChild(renderProgress(totalSteps - 1, totalSteps, 'Your schedule'));
    wrap.appendChild(renderResultsCard());
  }
  return wrap;
}

function renderProgress(current, total, label) {
  const container = document.createElement('div');
  const ul = document.createElement('ul');
  ul.className = 'progress';
  ul.setAttribute('role', 'presentation');
  for (let i = 0; i < total; i++) {
    const li = document.createElement('li');
    if (i < current) li.className = 'done';
    else if (i === current) li.className = 'current';
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
  card.setAttribute('aria-labelledby', 'q-title');

  const fs = document.createElement('fieldset');
  const legend = document.createElement('legend');
  legend.id = 'q-title';
  legend.textContent = q.prompt;
  fs.appendChild(legend);

  if (q.hint) {
    const hint = document.createElement('p');
    hint.className = 'hint';
    hint.textContent = q.hint;
    fs.appendChild(hint);
  }

  if (q.type === 'text') {
    const ta = document.createElement('textarea');
    ta.id = 'answer-text';
    ta.setAttribute('aria-label', q.prompt);
    ta.value = state.answers[q.id] || '';
    ta.addEventListener('input', () => { state.answers[q.id] = ta.value; });
    fs.appendChild(ta);
  } else {
    const grid = document.createElement('div');
    grid.className = 'choice-grid';
    const inputType = q.type === 'multi' ? 'checkbox' : 'radio';
    const current = state.answers[q.id] || (q.type === 'multi' ? [] : null);

    q.options.forEach((opt, idx) => {
      const row = document.createElement('div');
      const isSelected = q.type === 'multi' ? current.includes(opt) : current === opt;
      row.className = 'choice' + (isSelected ? ' selected' : '');
      const inputId = q.id + '-' + idx;

      const input = document.createElement('input');
      input.type = inputType;
      input.name = q.id;
      input.id = inputId;
      input.value = opt;
      input.checked = isSelected;
      input.addEventListener('change', () => {
        if (q.type === 'multi') {
          const list = new Set(state.answers[q.id] || []);
          if (input.checked) list.add(opt); else list.delete(opt);
          state.answers[q.id] = Array.from(list);
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
    fs.appendChild(grid);
  }

  card.appendChild(fs);
  card.appendChild(renderStudentNav(q));
  return card;
}

function renderStudentNav(q) {
  const row = document.createElement('div');
  row.className = 'btn-row';

  const back = document.createElement('button');
  back.className = 'btn secondary';
  back.textContent = 'Back';
  back.disabled = state.step === 0;
  back.addEventListener('click', () => { state.step = Math.max(0, state.step - 1); render(); });

  const next = document.createElement('button');
  next.className = 'btn primary';
  const isLast = state.step === QUESTIONS.length - 1;
  next.textContent = isLast ? 'See my schedule' : 'Next';
  next.addEventListener('click', () => {
    if (isLast) {
      state.results = matchWorkshops();
    }
    state.step += 1;
    render();
    root.querySelector('h2, legend')?.focus?.();
  });

  row.appendChild(back);
  row.appendChild(next);
  return row;
}

function matchWorkshops() {
  const a = state.answers;
  const wantedCats = a.categories || [];
  const wantedDays = a.days || [];
  const wantedTimes = a.time || [];
  const desiredCount = a.count === '1-2' ? 2 : a.count === '3-4' ? 4 : 8;

  const scored = state.workshops.map(w => {
    let score = 0;
    if (wantedCats.length === 0 || wantedCats.includes(w.category)) score += 2;
    if (wantedDays.length === 0 || wantedDays.includes(w.day)) score += 2;
    if (wantedTimes.length === 0 || wantedTimes.includes(w.time)) score += 1;
    return { w, score };
  }).filter(x => x.score > 0)
    .sort((x, y) => y.score - x.score)
    .slice(0, desiredCount)
    .map(x => x.w);

  return scored;
}

function renderResultsCard() {
  const card = document.createElement('section');
  card.className = 'card';

  const h2 = document.createElement('h2');
  h2.tabIndex = -1;
  h2.style.color = 'var(--primary-dark)';
  h2.textContent = 'Your suggested schedule';
  card.appendChild(h2);

  if (state.results.length === 0) {
    const banner = document.createElement('p');
    banner.className = 'banner info';
    banner.textContent = "We couldn't find a close match this month. A staff member can help you pick activities in person.";
    card.appendChild(banner);
  } else {
    const p = document.createElement('p');
    p.className = 'hint';
    p.textContent = 'Check off activities as you commit to them. Print this page or save it as a PDF to keep for your records.';
    card.appendChild(p);

    state.results.forEach((w, i) => {
      const item = document.createElement('div');
      item.className = 'result-item';
      const cbId = 'r-' + i;
      item.innerHTML = `
        <input type="checkbox" id="${cbId}">
        <div>
          <label for="${cbId}" class="r-title">${escapeHtml(w.title)}</label>
          <div class="r-meta">${escapeHtml(w.category)} &middot; ${escapeHtml(w.day)} ${escapeHtml(w.time)}${w.location ? ' &middot; ' + escapeHtml(w.location) : ''}</div>
          ${w.notes ? `<div class="r-meta">${escapeHtml(w.notes)}</div>` : ''}
        </div>
      `;
      card.appendChild(item);
    });
  }

  const row = document.createElement('div');
  row.className = 'btn-row';

  const back = document.createElement('button');
  back.className = 'btn secondary no-print';
  back.textContent = 'Back to questions';
  back.addEventListener('click', () => { state.step = QUESTIONS.length - 1; render(); });

  const startOver = document.createElement('button');
  startOver.className = 'btn secondary no-print';
  startOver.textContent = 'Start over';
  startOver.addEventListener('click', () => { state.step = 0; state.answers = {}; state.results = []; render(); });

  const printBtn = document.createElement('button');
  printBtn.className = 'btn primary no-print';
  printBtn.textContent = 'Print / save as PDF';
  printBtn.addEventListener('click', () => window.print());

  row.appendChild(back);
  row.appendChild(startOver);
  row.appendChild(printBtn);
  card.appendChild(row);

  return card;
}

/* ---------------- STAFF FLOW ---------------- */
function renderStaffFlow() {
  const wrap = document.createElement('div');

  const banner = document.createElement('p');
  banner.className = 'banner info';
  banner.textContent = "This list is stored only in this browser (localStorage), not on a server. If several front-desk computers need the same list, update it on each one, or export/import the JSON file below.";
  wrap.appendChild(banner);

  const card = document.createElement('section');
  card.className = 'card';
  const h2 = document.createElement('h2');
  h2.textContent = "This month's activities";
  h2.style.color = 'var(--primary-dark)';
  card.appendChild(h2);

  const table = document.createElement('table');
  table.className = 'admin-table';
  table.innerHTML = `<thead><tr>
      <th scope="col">Title</th><th scope="col">Category</th><th scope="col">Day</th>
      <th scope="col">Time</th><th scope="col">Location</th><th scope="col">Notes</th><th scope="col">Remove</th>
    </tr></thead>`;
  const tbody = document.createElement('tbody');

  state.workshops.forEach((w, idx) => {
    const tr = document.createElement('tr');

    tr.appendChild(makeInputCell(w, idx, 'title', 'text', 'Activity title'));
    tr.appendChild(makeSelectCell(w, idx, 'category', CATEGORIES));
    tr.appendChild(makeSelectCell(w, idx, 'day', DAYS));
    tr.appendChild(makeSelectCell(w, idx, 'time', TIMES));
    tr.appendChild(makeInputCell(w, idx, 'location', 'text', 'Location'));
    tr.appendChild(makeInputCell(w, idx, 'notes', 'text', 'Notes'));

    const removeTd = document.createElement('td');
    const removeBtn = document.createElement('button');
    removeBtn.className = 'pill-btn';
    removeBtn.textContent = 'Remove';
    removeBtn.setAttribute('aria-label', 'Remove ' + (w.title || 'this activity'));
    removeBtn.addEventListener('click', () => {
      state.workshops.splice(idx, 1);
      saveWorkshops(state.workshops);
      render();
    });
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
    state.workshops.push({ id: cryptoId(), title: '', category: CATEGORIES[0], day: DAYS[0], time: TIMES[0], date: '', location: '', notes: '' });
    saveWorkshops(state.workshops);
    render();
  });
  card.appendChild(addBtn);

  wrap.appendChild(card);
  wrap.appendChild(renderImportExportCard());
  return wrap;
}

function makeInputCell(w, idx, field, type, placeholder) {
  const td = document.createElement('td');
  const input = document.createElement('input');
  input.type = type;
  input.value = w[field] || '';
  input.placeholder = placeholder;
  input.setAttribute('aria-label', placeholder + ' for row ' + (idx + 1));
  input.addEventListener('input', () => {
    state.workshops[idx][field] = input.value;
    saveWorkshops(state.workshops);
  });
  td.appendChild(input);
  return td;
}
function makeSelectCell(w, idx, field, options) {
  const td = document.createElement('td');
  const select = document.createElement('select');
  select.setAttribute('aria-label', field + ' for row ' + (idx + 1));
  options.forEach(opt => {
    const o = document.createElement('option');
    o.value = opt;
    o.textContent = opt;
    if (w[field] === opt) o.selected = true;
    select.appendChild(o);
  });
  select.addEventListener('change', () => {
    state.workshops[idx][field] = select.value;
    saveWorkshops(state.workshops);
  });
  td.appendChild(select);
  return td;
}

function renderImportExportCard() {
  const card = document.createElement('section');
  card.className = 'card';
  const h2 = document.createElement('h2');
  h2.textContent = 'Back up or transfer this list';
  h2.style.color = 'var(--primary-dark)';
  card.appendChild(h2);
  const p = document.createElement('p');
  p.className = 'hint';
  p.textContent = "Export this month's list as a file, or import a file exported from another computer.";
  card.appendChild(p);

  const row = document.createElement('div');
  row.className = 'btn-row';

  const exportBtn = document.createElement('button');
  exportBtn.className = 'btn secondary';
  exportBtn.textContent = 'Export list (.json)';
  exportBtn.addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(state.workshops, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'activities-' + new Date().toISOString().slice(0, 10) + '.json';
    a.click();
    URL.revokeObjectURL(url);
  });

  const importLabel = document.createElement('label');
  importLabel.className = 'btn primary';
  importLabel.style.display = 'inline-flex';
  importLabel.style.alignItems = 'center';
  importLabel.textContent = 'Import list (.json)';
  const importInput = document.createElement('input');
  importInput.type = 'file';
  importInput.accept = 'application/json';
  importInput.style.position = 'absolute';
  importInput.style.width = '1px';
  importInput.style.height = '1px';
  importInput.style.overflow = 'hidden';
  importInput.style.clip = 'rect(0,0,0,0)';
  importInput.addEventListener('change', async () => {
    const file = importInput.files[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed)) {
        state.workshops = parsed;
        saveWorkshops(state.workshops);
        render();
      }
    } catch (e) {
      alert('That file could not be read as an activity list.');
    }
  });
  importLabel.appendChild(importInput);

  row.appendChild(exportBtn);
  row.appendChild(importLabel);
  card.appendChild(row);
  return card;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str == null ? '' : String(str);
  return div.innerHTML;
}

render();
