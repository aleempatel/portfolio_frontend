/* Admin panel: add / update / delete everything on the portfolio. Talks to the backend with a JWT. */
const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const lsGet = (k) => { try { return localStorage.getItem(k) || ''; } catch (e) { return ''; } };
const lsSet = (k, v) => { try { v ? localStorage.setItem(k, v) : localStorage.removeItem(k); } catch (e) { /* storage blocked */ } };

// The backend URL can only be changed when the panel runs locally (localhost / file://).
// On the live site it is fixed to APP_CONFIG.API_BASE, so the login password can never be
// redirected to another server, and any stale value saved in the browser is cleared.
const IS_LOCAL = ['localhost', '127.0.0.1', '[::1]', ''].includes(location.hostname);
const CFG_BASE = (window.APP_CONFIG && APP_CONFIG.API_BASE) || '';
if (!IS_LOCAL) lsSet('apiBase', '');
let BASE = ((IS_LOCAL && lsGet('apiBase')) || CFG_BASE).replace(/\/+$/, '');
let TOKEN = lsGet('adminToken');
const S = { profile: {}, skills: [], projects: [], education: [], courses: [], experience: [] };
const MAX_IMAGES = 50;
let tab = 'hero';

/* ---------- helpers ---------- */
function toast(msg, bad) {
  let t = $('.toast');
  if (!t) { t = document.createElement('div'); t.className = 'toast'; document.body.appendChild(t); }
  t.textContent = msg; t.className = 'toast show' + (bad ? ' bad' : '');
  clearTimeout(t._t); t._t = setTimeout(() => t.classList.remove('show'), 3400);
}

async function api(path, { method = 'GET', body, form } = {}) {
  const headers = {}; let payload;
  if (TOKEN) headers.Authorization = 'Bearer ' + TOKEN;
  if (form) payload = form; else if (body !== undefined) { headers['Content-Type'] = 'application/json'; payload = JSON.stringify(body); }
  let res;
  try { res = await fetch(BASE + '/api' + path, { method, headers, body: payload }); }
  catch (e) { throw new Error('Cannot reach the backend at ' + BASE + '. Is it running?'); }
  let j = {}; try { j = await res.json(); } catch (e) { /* non-JSON */ }
  if (res.status === 401 && /session expired|no token/i.test(j.message || '')) { logout(); throw new Error(j.message); }   // only a dead/missing token logs out (a wrong current password does not)
  if (!res.ok || j.success === false) throw new Error(j.message || 'Request failed (' + res.status + ')');
  return j;
}
async function reload(key, path) { S[key] = (await api(path)).data; }
async function loadAll() {
  const [profile, skills, projects, education, courses, experience] = await Promise.all(['/profile', '/skills', '/projects', '/education', '/courses', '/experience'].map((p) => api(p).then((j) => j.data)));
  Object.assign(S, { profile: profile || {}, skills, projects, education, courses, experience });
}

/* ---------- reusable UI: list editor, forms, modal ---------- */
function listEditor(values, ph) {
  const wrap = document.createElement('div'); wrap.className = 'le';
  const rows = document.createElement('div'); rows.className = 'le'; wrap.appendChild(rows);
  const add = (v) => {
    const r = document.createElement('div'); r.className = 'le-row';
    r.innerHTML = '<input value="' + esc(v) + '" placeholder="' + esc(ph || 'Type here') + '"><button type="button" class="ib" data-a="up" title="Move up">\u2191</button><button type="button" class="ib" data-a="dn" title="Move down">\u2193</button><button type="button" class="ib danger" data-a="rm" title="Delete">\u2715</button>';
    rows.appendChild(r); return r;
  };
  (values || []).forEach(add);
  rows.addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return; const r = b.parentElement;
    if (b.dataset.a === 'rm') r.remove();
    if (b.dataset.a === 'up' && r.previousElementSibling) rows.insertBefore(r, r.previousElementSibling);
    if (b.dataset.a === 'dn' && r.nextElementSibling) rows.insertBefore(r.nextElementSibling, r);
  });
  const btn = document.createElement('button'); btn.type = 'button'; btn.className = 'btn sm'; btn.textContent = '+ Add';
  btn.onclick = () => add('').querySelector('input').focus();
  wrap.appendChild(btn);
  wrap.get = () => Array.from(rows.querySelectorAll('input')).map((i) => i.value.trim()).filter(Boolean);
  return wrap;
}

function formEl(fields, values) {
  values = values || {};
  const el = document.createElement('div'); el.className = 'fgrid'; const g = {}; const inputs = {};
  fields.forEach((f) => {
    const w = document.createElement('div'); w.className = 'fld' + (f.wide || f.type === 'tags' || f.type === 'textarea' ? ' wide' : '');
    w.innerHTML = '<span class="lb">' + esc(f.label) + (f.req ? ' *' : '') + '</span>'; const v = values[f.k];
    if (f.type === 'tags') { const le = listEditor(v, f.ph); w.appendChild(le); g[f.k] = () => le.get(); }
    else if (f.type === 'textarea') {
      const t = document.createElement('textarea'); t.rows = f.rows || 4; t.value = v || ''; w.appendChild(t); inputs[f.k] = t; g[f.k] = () => t.value.trim();
    } else if (f.type === 'check') {
      const c = document.createElement('input'); c.type = 'checkbox'; c.checked = !!v; w.appendChild(c); g[f.k] = () => c.checked;
    } else {
      const i = document.createElement('input'); i.type = f.type || 'text'; i.value = v == null ? (f.def == null ? '' : f.def) : v;
      if (f.ph) i.placeholder = f.ph;
      if (f.type === 'number') { i.min = f.min == null ? '' : f.min; i.max = f.max == null ? '' : f.max; }
      if (f.options) { const dl = document.createElement('datalist'); dl.id = 'dl-' + f.k; dl.innerHTML = f.options.map((o) => '<option value="' + esc(o) + '">').join(''); i.setAttribute('list', dl.id); w.appendChild(dl); }
      w.appendChild(i); inputs[f.k] = i;
      g[f.k] = () => f.type === 'number' ? (i.value === '' ? 0 : Number(i.value)) : i.value.trim();
    }
    if (f.hint) { const h = document.createElement('span'); h.className = 'fh'; h.textContent = f.hint; w.appendChild(h); }
    el.appendChild(w);
  });
  return {
    el,
    get() { const o = {}; fields.forEach((f) => { o[f.k] = g[f.k](); }); return o; },
    validate() {
      for (const f of fields) if (f.req && !String(g[f.k]() || '').trim()) { if (inputs[f.k]) inputs[f.k].focus(); return f.label + ' is required.'; }
      return '';
    }
  };
}

function openModal(title, content, onClose) {
  const ov = document.createElement('div'); ov.className = 'ov';
  ov.innerHTML = '<div class="mdl"><div class="mh"><b>' + esc(title) + '</b><button class="x" aria-label="Close">\u2715</button></div><div class="mb"></div></div>';
  $('.mb', ov).appendChild(content); document.body.appendChild(ov);
  const close = () => { ov.remove(); if (onClose) onClose(); };
  $('.x', ov).onclick = close; ov.addEventListener('mousedown', (e) => { if (e.target === ov) close(); });
  return { close, ov };
}
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { const o = document.querySelectorAll('.ov'); if (o.length) o[o.length - 1].querySelector('.x').click(); } });

function itemForm({ title, endpoint, fields, item, refresh }) {
  const f = formEl(fields, item), box = document.createElement('div'); box.appendChild(f.el);
  const bar = document.createElement('div'); bar.className = 'bar';
  bar.innerHTML = '<button class="btn p" data-a="save">' + (item ? 'Save changes' : 'Add') + '</button><button class="btn" data-a="cancel">Cancel</button>';
  box.appendChild(bar); const m = openModal(title, box);
  bar.onclick = async (e) => {
    const a = e.target.dataset.a; if (!a) return; if (a === 'cancel') return m.close();
    const err = f.validate(); if (err) return toast(err, true);
    e.target.disabled = true;
    try { await api(item ? endpoint + '/' + item._id : endpoint, { method: item ? 'PUT' : 'POST', body: f.get() }); toast(item ? 'Updated.' : 'Added.'); m.close(); await refresh(); }
    catch (er) { toast(er.message, true); e.target.disabled = false; }
  };
}
async function removeItem(endpoint, id, label, refresh) {
  if (!confirm('Delete ' + label + '? This cannot be undone.')) return;
  try { await api(endpoint + '/' + id, { method: 'DELETE' }); toast('Deleted.'); await refresh(); } catch (e) { toast(e.message, true); }
}
const find = (list, id) => list.find((x) => x._id === id);
const main = () => $('#main');
async function saveProfile(data) { const j = await api('/profile', { method: 'PUT', body: data }); S.profile = j.data; toast('Saved.'); }
function saveBar(label, fn) {
  const bar = document.createElement('div'); bar.className = 'bar';
  bar.innerHTML = '<button class="btn p">' + label + '</button>'; const b = $('button', bar);
  b.onclick = async () => { b.disabled = true; try { await fn(); } catch (e) { toast(e.message, true); } b.disabled = false; };
  return bar;
}
function head(t, hint, btn) { return '<div class="top"><h2>' + t + '</h2>' + (btn || '') + '</div>' + (hint ? '<p class="hint">' + hint + '</p>' : ''); }

/* ---------- tabs ---------- */
const TABS = [['hero', 'Hero section'], ['about', 'About section'], ['skills', 'Skills'], ['projects', 'Projects'], ['experience', 'Experience'], ['education', 'Education'], ['certs', 'Certifications'], ['contact', 'Contact'], ['resume', 'Resume'], ['settings', 'Settings']];

function tabHero() {
  main().innerHTML = head('Hero section', 'Everything at the top of the site: name, the running (typing) skills under the name, intro text, chips and the scrolling word strip.');
  const f = formEl([
    { k: 'name', label: 'Name', req: 1, hint: 'The last word is highlighted in colour.' },
    { k: 'title', label: 'Title', hint: 'Browser tab title; also used if there are no running skills.' },
    { k: 'bio', label: 'Hero intro text', type: 'textarea', rows: 3 },
    { k: 'roles', label: 'Running skills under the name (typing animation)', type: 'tags', ph: 'e.g. Data Scientist' },
    { k: 'heroChips', label: 'Hero chips (small badges below the buttons)', type: 'tags', ph: 'e.g. neural_engine.active()' },
    { k: 'marquee', label: 'Scrolling marquee words', type: 'tags', ph: 'e.g. Python' }
  ], S.profile);
  const card = document.createElement('div'); card.className = 'card'; card.appendChild(f.el);
  card.appendChild(saveBar('Save hero section', async () => { const e = f.validate(); if (e) throw new Error(e); await saveProfile(f.get()); }));
  main().appendChild(card);
}

function tabAbout() {
  const p = S.profile, has = !!p.profilePicture;
  main().innerHTML = head('About section', 'Edited separately from the hero: profile picture, About text (blank line = new paragraph) and the tag pills.') +
    '<div class="card"><h3>Profile picture</h3><div class="pp"><div class="ppimg">' + (has ? '<img src="' + esc(p.profilePicture) + '" alt="Profile">' : 'No picture') + '</div><div class="acts">' +
    '<input type="file" id="picFile" accept="image/jpeg,image/png,image/webp,image/gif" hidden><button class="btn p" id="picUp">' + (has ? 'Replace picture' : 'Upload picture') + '</button>' +
    (has ? '<button class="btn danger" id="picDel">Delete picture</button>' : '') + '</div></div><p class="hint" style="margin-top:12px">JPG, PNG, WEBP or GIF, up to 5 MB.</p></div>';
  $('#picUp').onclick = () => $('#picFile').click();
  $('#picFile').onchange = async (e) => {
    const file = e.target.files[0]; if (!file) return;
    if (file.size > 5 * 1024 * 1024) return toast('Picture must be 5 MB or smaller.', true);
    const fd = new FormData(); fd.append('picture', file); $('#picUp').disabled = true; $('#picUp').textContent = 'Uploading...';
    try { S.profile = (await api('/profile/picture', { method: 'POST', form: fd })).data; toast('Picture updated.'); } catch (er) { toast(er.message, true); }
    tabAbout();
  };
  if (has) $('#picDel').onclick = async () => {
    if (!confirm('Delete the profile picture?')) return;
    try { S.profile = (await api('/profile/picture', { method: 'DELETE' })).data; toast('Picture deleted.'); tabAbout(); } catch (er) { toast(er.message, true); }
  };
  const f = formEl([
    { k: 'aboutBio', label: 'About text', type: 'textarea', rows: 7 },
    { k: 'aboutTags', label: 'About tags (pills under the text)', type: 'tags', ph: 'e.g. Deep Learning' }
  ], p);
  const card = document.createElement('div'); card.className = 'card'; card.appendChild(f.el);
  card.appendChild(saveBar('Save about section', async () => saveProfile(f.get()))); main().appendChild(card);
}

function tabSkills() {
  const groups = new Map();
  S.skills.forEach((s) => { const c = (s.category || '').trim() || 'Other'; if (!groups.has(c)) groups.set(c, []); groups.get(c).push(s); });
  main().innerHTML = head('Skills', 'Skills are grouped by <b>category</b> on the website (for example <i>Programming</i> \u2192 C++, Python). Use the same category name to put skills in the same box.', '<button class="btn p" data-a="add">+ Add skill</button>') +
    (groups.size ? Array.from(groups).map(([c, list]) => '<div class="card"><h3>' + esc(c) + ' <small>(' + list.length + ')</small></h3>' +
      list.map((s) => '<div class="row"><div><b>' + esc(s.name) + '</b> <small>level ' + (s.proficiency == null ? '-' : s.proficiency + '%') + ' \u00b7 order ' + (s.order || 0) + '</small></div><div class="acts"><button class="btn sm" data-a="edit" data-id="' + s._id + '">Edit</button><button class="btn sm danger" data-a="del" data-id="' + s._id + '">Delete</button></div></div>').join('') + '</div>').join('')
      : '<div class="card empty">No skills yet. Click "Add skill".</div>');
  const cats = Array.from(new Set(S.skills.map((s) => (s.category || '').trim()).filter(Boolean)));
  const refresh = async () => { await reload('skills', '/skills'); tabSkills(); };
  const fields = [{ k: 'name', label: 'Skill', req: 1, ph: 'e.g. Python' }, { k: 'category', label: 'Category', options: cats, ph: 'e.g. Programming' },
    { k: 'proficiency', label: 'Level % (0-100) - shown as the bar on the site', type: 'number', min: 0, max: 100, def: 80 }, { k: 'order', label: 'Order (smaller = first)', type: 'number', def: 0 }];
  main().onclick = (e) => {
    const b = e.target.closest('button[data-a]'); if (!b) return; const item = find(S.skills, b.dataset.id);
    if (b.dataset.a === 'add') itemForm({ title: 'Add skill', endpoint: '/skills', fields, refresh });
    if (b.dataset.a === 'edit') itemForm({ title: 'Edit skill', endpoint: '/skills', fields, item, refresh });
    if (b.dataset.a === 'del') removeItem('/skills', item._id, '"' + item.name + '"', refresh);
  };
}

function tabProjects() {
  main().innerHTML = head('Projects', 'Each project: description, technologies, GitHub and live site links, and up to ' + MAX_IMAGES + ' pictures (shown in the Full Deck gallery).', '<button class="btn p" data-a="add">+ Add project</button>') +
    (S.projects.length ? '<div class="pgrid">' + S.projects.map((p) => {
      const n = (p.images || []).length, cover = p.imageUrl || (p.images || [])[0];
      return '<div class="card pcard"><div class="th">' + (cover ? '<img src="' + esc(cover) + '" alt="">' : 'No images') + '</div><div class="bd"><b>' + esc(p.title) + '</b>' +
        '<small>' + (p.category ? esc(p.category) + ' \u00b7 ' : '') + n + ' / ' + MAX_IMAGES + ' images \u00b7 order ' + (p.order || 0) + '</small>' +
        '<div class="acts"><button class="btn sm" data-a="edit" data-id="' + p._id + '">Edit</button><button class="btn sm danger" data-a="del" data-id="' + p._id + '">Delete</button></div></div></div>';
    }).join('') + '</div>' : '<div class="card empty">No projects yet. Click "Add project".</div>');
  const refresh = async () => { await reload('projects', '/projects'); if (tab === 'projects') tabProjects(); };
  main().onclick = (e) => {
    const b = e.target.closest('button[data-a]'); if (!b) return; const item = find(S.projects, b.dataset.id);
    if (b.dataset.a === 'add') projectForm(null, refresh);
    if (b.dataset.a === 'edit') projectForm(item, refresh);
    if (b.dataset.a === 'del') removeItem('/projects', item._id, '"' + item.title + '" and all its images', refresh);
  };
}

function projectForm(proj, refresh) {
  let cur = proj;
  const f = formEl([
    { k: 'title', label: 'Project title', req: 1 }, { k: 'category', label: 'Category (optional)', ph: 'e.g. Machine Learning' },
    { k: 'description', label: 'Short description (shown on the project card)', type: 'textarea', rows: 3 },
    { k: 'longDescription', label: 'Detailed description (shown in the Full Deck gallery)', type: 'textarea', rows: 4 },
    { k: 'technologies', label: 'What was used (technologies)', type: 'tags', ph: 'e.g. Python' },
    { k: 'githubUrl', label: 'GitHub URL', type: 'url', ph: 'https://github.com/...' }, { k: 'liveUrl', label: 'Live site URL', type: 'url', ph: 'https://...' },
    { k: 'order', label: 'Order (smaller = first)', type: 'number', def: 0 }, { k: 'featured', label: 'Featured', type: 'check' }
  ], proj || {});
  const box = document.createElement('div'); box.appendChild(f.el);
  const bar = document.createElement('div'); bar.className = 'bar';
  bar.innerHTML = '<button class="btn p" data-a="save">' + (proj ? 'Save changes' : 'Create project') + '</button><button class="btn" data-a="close">Close</button>';
  box.appendChild(bar);
  const imgBox = document.createElement('div'); imgBox.className = 'card'; imgBox.style.marginTop = '22px'; box.appendChild(imgBox);
  let m;
  function drawImages() {
    if (!cur) { imgBox.innerHTML = '<h3>Pictures</h3><p class="hint">Save the project first, then you can add up to ' + MAX_IMAGES + ' pictures.</p>'; return; }
    const imgs = cur.images || [];
    imgBox.innerHTML = '<h3>Pictures <small>(' + imgs.length + ' / ' + MAX_IMAGES + ')</small></h3><input type="file" id="imgFiles" accept="image/jpeg,image/png,image/webp,image/gif" multiple hidden>' +
      '<div class="acts"><button class="btn sm p" id="imgUp"' + (imgs.length >= MAX_IMAGES ? ' disabled' : '') + '>+ Add pictures</button><small id="imgMsg">JPG, PNG, WEBP or GIF, up to 8 MB each.</small></div>' +
      '<div class="imgs">' + imgs.map((u, i) => '<div class="im"><img src="' + esc(u) + '" alt=""><em>' + (i + 1) + '</em><button data-i="' + i + '" title="Delete picture">\u2715</button></div>').join('') + '</div>';
    $('#imgUp', imgBox).onclick = () => $('#imgFiles', imgBox).click();
    $('#imgFiles', imgBox).onchange = async (e) => {
      const files = Array.from(e.target.files); if (!files.length) return;
      if (imgs.length + files.length > MAX_IMAGES) return toast('A project can have at most ' + MAX_IMAGES + ' pictures (you can add ' + (MAX_IMAGES - imgs.length) + ' more).', true);
      const big = files.find((x) => x.size > 8 * 1024 * 1024); if (big) return toast('"' + big.name + '" is larger than 8 MB.', true);
      $('#imgUp', imgBox).disabled = true;
      try {
        for (let i = 0; i < files.length; i += 8) {
          $('#imgMsg', imgBox).textContent = 'Uploading ' + Math.min(i + 8, files.length) + ' / ' + files.length + '...';
          const fd = new FormData(); files.slice(i, i + 8).forEach((x) => fd.append('images', x));
          cur = (await api('/projects/' + cur._id + '/images', { method: 'POST', form: fd })).data;
        }
        toast('Pictures uploaded.');
      } catch (er) { toast(er.message, true); }
      drawImages();
    };
    imgBox.querySelectorAll('.im button').forEach((b) => { b.onclick = async () => {
      if (!confirm('Delete picture ' + (Number(b.dataset.i) + 1) + '?')) return;
      try { cur = (await api('/projects/' + cur._id + '/images/' + b.dataset.i, { method: 'DELETE' })).data; toast('Picture deleted.'); } catch (er) { toast(er.message, true); }
      drawImages();
    }; });
  }
  drawImages();
  m = openModal(proj ? 'Edit project' : 'Add project', box, refresh);
  bar.onclick = async (e) => {
    const a = e.target.dataset.a; if (!a) return; if (a === 'close') return m.close();
    const err = f.validate(); if (err) return toast(err, true);
    e.target.disabled = true;
    try {
      if (cur) cur = (await api('/projects/' + cur._id, { method: 'PUT', body: f.get() })).data;
      else { cur = (await api('/projects', { method: 'POST', body: f.get() })).data; e.target.textContent = 'Save changes'; toast('Project created. You can add pictures now.'); drawImages(); e.target.disabled = false; return; }
      toast('Project saved.');
    } catch (er) { toast(er.message, true); }
    e.target.disabled = false;
  };
}

function tabCrud(key, path, title, hint, fields, rowHtml, addLabel) {
  main().innerHTML = head(title, hint, '<button class="btn p" data-a="add">+ ' + addLabel + '</button>') +
    (S[key].length ? '<div class="card">' + S[key].map((x) => '<div class="row"><div>' + rowHtml(x) + '</div><div class="acts"><button class="btn sm" data-a="edit" data-id="' + x._id + '">Edit</button><button class="btn sm danger" data-a="del" data-id="' + x._id + '">Delete</button></div></div>').join('') + '</div>'
      : '<div class="card empty">Nothing here yet. Click "' + addLabel + '".</div>');
  const refresh = async () => { await reload(key, path); if (tab === (key === 'courses' ? 'certs' : key)) tabCrud(key, path, title, hint, fields, rowHtml, addLabel); };
  main().onclick = (e) => {
    const b = e.target.closest('button[data-a]'); if (!b) return; const item = find(S[key], b.dataset.id);
    if (b.dataset.a === 'add') itemForm({ title: addLabel, endpoint: path, fields, refresh });
    if (b.dataset.a === 'edit') itemForm({ title: 'Edit', endpoint: path, fields, item, refresh });
    if (b.dataset.a === 'del') removeItem(path, item._id, 'this item', refresh);
  };
}
const tabExperience = () => tabCrud('experience', '/experience', 'Experience', 'The Experience section appears on the site only while at least one entry exists. Delete all entries and it disappears again.', [
  { k: 'jobTitle', label: 'Job title', req: 1, ph: 'e.g. Data Analyst' }, { k: 'company', label: 'Company', req: 1 },
  { k: 'employmentType', label: 'Type', ph: 'e.g. Full-time, Internship, Freelance' }, { k: 'location', label: 'Location' },
  { k: 'startDate', label: 'Start', ph: 'e.g. Jan 2024' }, { k: 'endDate', label: 'End', ph: 'e.g. Dec 2024 (empty if current)' },
  { k: 'current', label: 'I currently work here', type: 'check' },
  { k: 'description', label: 'Description', type: 'textarea', rows: 3 },
  { k: 'responsibilities', label: 'Responsibilities', type: 'tags', ph: 'One responsibility' },
  { k: 'technologies', label: 'Technologies', type: 'tags', ph: 'e.g. Python' },
  { k: 'order', label: 'Order (smaller = first)', type: 'number', def: 0 }
], (x) => '<b>' + esc(x.jobTitle) + '</b><br><small>' + esc([x.company, [x.startDate, x.current ? 'Present' : x.endDate].filter(Boolean).join(' - ')].filter(Boolean).join(' \u00b7 ')) + '</small>', 'Add experience');
const tabEducation = () => tabCrud('education', '/education', 'Education', 'Leave "End" empty for something you are still studying (shown as "In progress").', [
  { k: 'degree', label: 'Degree / program', req: 1, ph: 'e.g. BS Data Science' }, { k: 'institution', label: 'Institution', req: 1 },
  { k: 'location', label: 'Location' }, { k: 'grade', label: 'Grade / CGPA' }, { k: 'startDate', label: 'Start', ph: 'e.g. 2023' }, { k: 'endDate', label: 'End', ph: 'e.g. 2027 (empty = in progress)' },
  { k: 'description', label: 'Description', type: 'textarea', rows: 3 }, { k: 'order', label: 'Order (smaller = first)', type: 'number', def: 0 }
], (x) => '<b>' + esc(x.degree) + '</b><br><small>' + esc([x.institution, [x.startDate, x.endDate || 'Present'].filter(Boolean).join(' - ')].filter(Boolean).join(' \u00b7 ')) + '</small>', 'Add education');
const tabCerts = () => tabCrud('courses', '/courses', 'Certifications', 'Each certification can link to its certificate (opens in a new tab on the site).', [
  { k: 'title', label: 'Certification title', req: 1, ph: 'e.g. Google Data Analyst' }, { k: 'provider', label: 'Provider', ph: 'e.g. Coursera' },
  { k: 'date', label: 'Date', ph: 'e.g. 2025' }, { k: 'certificateUrl', label: 'Certificate URL', type: 'url', ph: 'https://...' },
  { k: 'description', label: 'Description', type: 'textarea', rows: 3 }, { k: 'order', label: 'Order (smaller = first)', type: 'number', def: 0 }
], (x) => '<b>' + esc(x.title) + '</b><br><small>' + esc([x.provider, x.date].filter(Boolean).join(' \u00b7 ')) + (x.certificateUrl ? ' \u00b7 has link' : '') + '</small>', 'Add certification');

function tabContact() {
  main().innerHTML = head('Contact', 'Shown in the contact section. <b>The email below also receives every message sent from the contact form</b> (with the sender\'s name in the subject).');
  const f = formEl([
    { k: 'email', label: 'Email', type: 'email', hint: 'On the site this opens Gmail compose.' }, { k: 'phone', label: 'Phone', hint: 'Several numbers: separate with commas.' },
    { k: 'github', label: 'GitHub', ph: 'https://github.com/username' }, { k: 'linkedin', label: 'LinkedIn', ph: 'https://linkedin.com/in/...' },
    { k: 'location', label: 'Location (optional)' }, { k: 'twitter', label: 'Twitter / X (optional)' }, { k: 'website', label: 'Website (optional)' }
  ], S.profile);
  const card = document.createElement('div'); card.className = 'card'; card.appendChild(f.el);
  card.appendChild(saveBar('Save contact details', async () => saveProfile(f.get()))); main().appendChild(card);
}

function tabResume() {
  const has = !!S.profile.resumeUrl;
  main().innerHTML = head('Resume', 'Visitors first see the resume in a PDF viewer and then press <b>Download</b>. PDF is best (DOC / DOCX can only be downloaded). Max 10 MB.') +
    '<div class="card"><h3>' + (has ? 'A resume is uploaded' : 'No resume uploaded yet') + '</h3><div class="acts"><input type="file" id="rFile" accept=".pdf,.doc,.docx,application/pdf" hidden><button class="btn p" id="rUp">' + (has ? 'Replace resume' : 'Upload resume') + '</button>' +
    (has ? '<a class="btn" href="' + esc(BASE) + '/api/profile/resume/download">Download</a><button class="btn danger" id="rDel">Delete resume</button>' : '') + '</div>' +
    (has ? '<iframe class="pdf" id="rPrev" title="Resume preview"></iframe>' : '') + '</div>';
  if (has) $('#rPrev').src = BASE + '/api/profile/resume/view?t=' + Date.now();
  $('#rUp').onclick = () => $('#rFile').click();
  $('#rFile').onchange = async (e) => {
    const file = e.target.files[0]; if (!file) return;
    if (file.size > 10 * 1024 * 1024) return toast('Resume must be 10 MB or smaller.', true);
    const fd = new FormData(); fd.append('resume', file); $('#rUp').disabled = true; $('#rUp').textContent = 'Uploading...';
    try { S.profile = (await api('/profile/resume', { method: 'POST', form: fd })).data; toast('Resume updated.'); } catch (er) { toast(er.message, true); }
    tabResume();
  };
  if (has) $('#rDel').onclick = async () => {
    if (!confirm('Delete the resume?')) return;
    try { S.profile = (await api('/profile/resume', { method: 'DELETE' })).data; toast('Resume deleted.'); tabResume(); } catch (er) { toast(er.message, true); }
  };
}

const SAMPLE = {
  profile: {
    name: 'Aleem Patel', title: 'Data Scientist | Data Analyst', roles: ['Data Scientist', 'Data Analyst', 'AI & Machine Learning', 'Cloud Computing'],
    bio: 'Turning complex datasets into actionable insights through AI, Machine Learning, and Cloud Computing.',
    aboutBio: 'I am currently pursuing my BS in Data Science. I bridge the gap between raw data and strategic decision-making.\n\nMy expertise spans building scalable machine learning models, managing cloud infrastructure, and creating interactive data visualizations that tell compelling stories.',
    heroChips: ['neural_engine.active()', 'model.optimized', 'Cloud \u00b7 Azure', 'Python \u00b7 SQL'],
    marquee: ['Machine Learning', 'Predictive Modeling', 'Python', 'SQL', 'Azure', 'Linux', 'Tailwind CSS', 'Three.js'],
    aboutTags: ['Predictive Analytics', 'Deep Learning', 'Data Architecture', 'MLOps'],
    email: 'aleempatel4829@gmail.com', phone: '0371-3227369, 0311-8108232', github: 'https://github.com/aleempatel', linkedin: 'https://www.linkedin.com/in/aleem-rizwan/'
  },
  skills: [['Data & AI', ['Machine Learning', 'Predictive Modeling', 'SQL', 'Python', 'Power BI', 'Excel', 'MongoDB']],
    ['Cloud & Deployments', ['Cloud Computing', 'Virtual Machine Configuration (Azure)', 'Linux Operations']],
    ['Web & Interactive', ['Full Stack Development', 'Tailwind CSS', 'WebGL', 'Three.js']]],
  projects: [
    { title: 'End-to-End Machine Learning Pipeline', description: 'Data cleaning, feature engineering, and model deployment on cloud infrastructure.', technologies: ['Python', 'Scikit-learn', 'SQL', 'Azure'] },
    { title: 'Interactive Data Visualization Dashboard', description: 'Custom shaders and WebGL render complex 3D data clusters and business metrics in the browser.', technologies: ['WebGL', 'Three.js', 'GLSL', 'Tailwind CSS'] },
    { title: 'Cloud & Automation Architecture', description: 'Configuration and deployment of scalable virtual environments for data processing.', technologies: ['Azure VMs', 'Linux', 'Automation', 'Cloud'] }],
  education: [{ degree: 'BS Data Science', institution: 'Virtual University of Pakistan', description: 'Foundation in statistics, programming, databases, and data visualization.' }],
  courses: [{ title: 'Google Data Analyst', provider: 'Coursera' }, { title: 'Advanced Machine Learning', provider: 'IBM SkillsBuild' }, { title: 'AI with Python', provider: 'DigiSkills' }, { title: 'Cloud Computing', provider: 'DigiSkills' }]
};
async function importSample() {
  if (!confirm('Fill in the sample content? Only EMPTY parts are filled; nothing you already added is overwritten.')) return;
  const p = S.profile, upd = {};
  Object.keys(SAMPLE.profile).forEach((k) => { const v = p[k]; if (!v || (Array.isArray(v) && !v.length)) upd[k] = SAMPLE.profile[k]; });
  if (Object.keys(upd).length) await saveProfile(upd);
  if (!S.skills.length) { let o = 0; for (const [category, names] of SAMPLE.skills) for (const name of names) await api('/skills', { method: 'POST', body: { name, category, order: o++ } }); }
  if (!S.projects.length) { let o = 0; for (const x of SAMPLE.projects) await api('/projects', { method: 'POST', body: Object.assign({ githubUrl: 'https://github.com/aleempatel', order: o++ }, x) }); }
  if (!S.education.length) for (const x of SAMPLE.education) await api('/education', { method: 'POST', body: x });
  if (!S.courses.length) { let o = 0; for (const x of SAMPLE.courses) await api('/courses', { method: 'POST', body: Object.assign({ order: o++ }, x) }); }
  await loadAll(); toast('Sample content added. Now edit it to match you.');
}

function tabSettings() {
  main().innerHTML = head('Settings') +
    (IS_LOCAL ? '<div class="card"><h3>Backend URL (local only)</h3><div class="fld"><span class="lb">API base URL (no /api)</span><input id="sApi" value="' + esc(BASE) + '"></div><div class="bar"><button class="btn p" id="sApiSave">Save URL</button></div></div>' : '') +
    '<div class="card"><h3>Change password</h3><div class="fgrid"><div class="fld"><span class="lb">Current password</span><input id="pc" type="password" autocomplete="current-password"></div><div class="fld"><span class="lb">New password (min 6)</span><input id="pn" type="password" autocomplete="new-password"></div></div><div class="bar"><button class="btn p" id="pSave">Update password</button></div></div>' +
    '<div class="card"><h3>Sample content</h3><p class="hint">First time? Fill the empty parts of the site with the default portfolio content, then edit it. Existing content is never overwritten.</p><button class="btn" id="sample">Add sample content</button></div>';
  if (IS_LOCAL) $('#sApiSave').onclick = () => { BASE = $('#sApi').value.trim().replace(/\/+$/, ''); lsSet('apiBase', BASE); toast('Backend URL saved.'); };
  $('#pSave').onclick = async () => {
    try { await api('/auth/change-password', { method: 'PUT', body: { currentPassword: $('#pc').value, newPassword: $('#pn').value } }); toast('Password updated.'); $('#pc').value = ''; $('#pn').value = ''; } catch (e) { toast(e.message, true); }
  };
  $('#sample').onclick = async () => { try { await importSample(); } catch (e) { toast(e.message, true); } };
}

const RENDER = { hero: tabHero, about: tabAbout, skills: tabSkills, projects: tabProjects, experience: tabExperience, education: tabEducation, certs: tabCerts, contact: tabContact, resume: tabResume, settings: tabSettings };
function go(t) {
  tab = t; main().onclick = null;
  document.querySelectorAll('#side button').forEach((b) => b.classList.toggle('on', b.dataset.t === t));
  RENDER[t]();
}

/* ---------- login / logout ---------- */
async function enter() {
  $('#login').hidden = true; $('#app').hidden = false;
  $('#side').innerHTML = TABS.map(([k, l]) => '<button data-t="' + k + '">' + l + '</button>').join('');
  $('#side').onclick = (e) => { const b = e.target.closest('button'); if (b) go(b.dataset.t); };
  main().innerHTML = '<p class="hint">Loading...</p>';
  try { await loadAll(); go(tab); } catch (e) { toast(e.message, true); }
}
function logout() { TOKEN = ''; lsSet('adminToken', ''); $('#app').hidden = true; $('#login').hidden = false; }
if (IS_LOCAL) $('#lapi').value = BASE; else { const box = $('#apiBox'); if (box) box.remove(); }
$('#loginForm').addEventListener('submit', async (e) => {
  e.preventDefault(); const err = $('#lerr'), btn = $('button[type=submit]', e.target); err.textContent = '';
  if (IS_LOCAL) { BASE = $('#lapi').value.trim().replace(/\/+$/, ''); lsSet('apiBase', BASE); }
  btn.disabled = true;
  try {
    const j = await api('/auth/login', { method: 'POST', body: { username: $('#lu').value.trim(), password: $('#lp').value } });
    TOKEN = j.token; lsSet('adminToken', TOKEN); $('#lp').value = ''; await enter();
  } catch (er) { err.textContent = er.message; }
  btn.disabled = false;
});
$('#logoutBtn').onclick = () => { api('/auth/logout', { method: 'POST' }).catch(() => {}); logout(); };
if (TOKEN) enter();
