/* Renders the whole site from the backend.
   If the API is unreachable (or the database is still empty) the static HTML stays as the fallback. */
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const safeUrl = (u) => {
  u = String(u || '').trim();
  if (!u) return '';
  if (/^(https?:|mailto:|tel:)/i.test(u)) return u;
  if (/^[\w-]+(\.[\w-]+)+(\/|$|\?|#)/.test(u)) return 'https://' + u;
  return '';
};
const bare = (u) => String(u || '').replace(/^https?:\/\//i, '').replace(/\/$/, '');
const q1 = (s) => document.querySelector(s);
const show = (el, on) => { if (el) el.style.display = on ? '' : 'none'; };
const pad2 = (n) => String(n).padStart(2, '0');
const gmailCompose = (to, su, body) => 'https://mail.google.com/mail/?view=cm&fs=1&to=' + encodeURIComponent(to) +
  (su ? '&su=' + encodeURIComponent(su) : '') + (body ? '&body=' + encodeURIComponent(body) : '');
const navLink = (id, on) => show(q1('.links a[href="#' + id + '"]'), on);
const svgI = (p) => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + p + '</svg>';
const svgF = (p) => '<svg viewBox="0 0 24 24" fill="currentColor">' + p + '</svg>';
const IC = {
  chip: svgI('<path d="M9 3H5a2 2 0 0 0-2 2v4M15 3h4a2 2 0 0 1 2 2v4M9 21H5a2 2 0 0 1-2-2v-4M15 21h4a2 2 0 0 0 2-2v-4"/><rect x="8" y="8" width="8" height="8" rx="1.5"/>'),
  cloud: svgI('<path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/>'),
  globe: svgI('<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>'),
  chart: svgI('<path d="M3 3v18h18"/><path d="M7 15v3M12 10v8M17 6v12"/>'),
  net: svgI('<circle cx="6" cy="6" r="2.2"/><circle cx="18" cy="6" r="2.2"/><circle cx="12" cy="18" r="2.2"/><path d="M8 7l3 9M16 7l-3 9M8.2 6h7.6"/>'),
  code: svgI('<path d="m16 18 6-6-6-6M8 6l-6 6 6 6"/>'),
  ext: svgI('<path d="M15 3h6v6M10 14 21 3M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>'),
  mail: svgI('<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>'),
  phone: svgI('<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z"/>'),
  pin: svgI('<path d="M12 21s-7-6.2-7-11a7 7 0 1 1 14 0c0 4.8-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/>'),
  x: svgI('<path d="M4 4l16 16M20 4 4 20"/>'),
  gh: svgF('<path d="M12 .5a11.5 11.5 0 0 0-3.64 22.41c.58.1.79-.25.79-.56v-2c-3.2.7-3.88-1.37-3.88-1.37-.52-1.33-1.28-1.69-1.28-1.69-1.05-.71.08-.7.08-.7 1.15.08 1.76 1.19 1.76 1.19 1.03 1.76 2.7 1.25 3.35.96.1-.75.4-1.25.73-1.54-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.28 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.78 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.83 1.19 3.09 0 4.42-2.69 5.39-5.25 5.68.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 12 .5z"/>'),
  li: svgF('<path d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5zM3 9.75h4v11H3zm7 0h3.8v1.5h.06c.53-1 1.83-2.06 3.77-2.06 4.03 0 4.77 2.65 4.77 6.1v5.46h-4v-4.84c0-1.16-.02-2.64-1.61-2.64-1.61 0-1.86 1.26-1.86 2.56v4.92h-4z"/>')
};
const CAT_ICONS = [IC.chip, IC.cloud, IC.globe, IC.chart, IC.net, IC.code];

function renderHero(p) {
  const name = (p.name || '').trim(), parts = name.split(/\s+/).filter(Boolean);
  if (parts.length) {
    const last = parts.length > 1 ? parts[parts.length - 1] : '', first = parts.length > 1 ? parts.slice(0, -1).join(' ') : '';
    q1('#heroName').innerHTML = first ? esc(first) + ' <span class="grad">' + esc(last) + '</span>' : '<span class="grad">' + esc(parts[0]) + '</span>';
    q1('.logo').innerHTML = esc(parts[0]) + '<b>.</b>ds';
    q1('#footName').textContent = 'All rights reserved to ' + name;
    q1('#hvFile').textContent = parts[0].toLowerCase() + '.py';
    document.title = name + (p.title ? ' \u2014 ' + p.title : '');
  }
  const roles = (p.roles || []).filter(Boolean), list = roles.length ? roles : (p.title ? [p.title] : []);
  const role = q1('.role');
  if (list.length) { window.ROLES = list; q1('#typed').textContent = list.join(' | '); show(role, true); }
  else { window.ROLES_OFF = true; show(role, false); }
  const lead = q1('#heroBio');
  if (p.bio) { lead.textContent = p.bio; show(lead, true); } else show(lead, false);
  const chips = (p.heroChips || []).filter(Boolean), box = q1('#heroChips');
  box.innerHTML = chips.map((c) => '<span class="chip"><i></i>' + esc(c) + '</span>').join('');
  show(box, chips.length > 0);
  const m = (p.marquee || []).filter(Boolean), mq = q1('.mq');
  show(mq, m.length > 0);
  if (m.length) {
    let half = m.slice(); while (half.length < 8) half = half.concat(m);
    q1('#mqTrack').innerHTML = half.concat(half).map((w) => '<span>' + esc(w) + '</span>').join('');
  }
}

function renderAbout(p) {
  const tags = (p.aboutTags || []).filter(Boolean);
  const has = !!(p.aboutBio || p.profilePicture || tags.length);
  show(q1('#about'), has); navLink('about', has);
  if (!has) return;
  const ph = q1('#aboutPhoto');
  if (p.profilePicture) ph.innerHTML = '<img src="' + esc(p.profilePicture) + '" alt="' + esc(p.name ? 'Portrait of ' + p.name : 'Profile picture') + '" width="380" height="475" loading="lazy" decoding="async">';
  else ph.textContent = (p.name || '').split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || '\u2022';
  q1('#aboutText').innerHTML = String(p.aboutBio || '').split(/\n+/).map((t) => t.trim()).filter(Boolean).map((t) => '<p>' + esc(t) + '</p>').join('');
  const box = q1('#aboutTags');
  box.innerHTML = tags.map((t) => '<a href="#skills">' + esc(t) + '</a>').join('');
  show(box, tags.length > 0);
}

/* One skill: name + percentage + progress bar. The level (0-100) is set per skill in the admin panel. */
function skillRow(s) {
  const raw = s.proficiency, n = (raw === null || raw === undefined || raw === '') ? NaN : Number(raw);
  if (!isFinite(n)) return '<li>' + esc(s.name) + '</li>';   // no level saved: plain name, no bar
  const pct = Math.max(0, Math.min(100, Math.round(n)));
  return '<li class="sk"><div class="skh"><span>' + esc(s.name) + '</span><b>' + pct + '%</b></div>' +
    '<div class="bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + pct + '" aria-label="' + esc(s.name) + ' proficiency"><i style="--w:' + pct + '%"></i></div></li>';
}

function renderSkills(list) {
  show(q1('#skills'), list.length > 0); navLink('skills', list.length > 0);
  const groups = new Map();
  list.forEach((s) => { const c = (s.category || '').trim() || 'Other'; if (!groups.has(c)) groups.set(c, []); groups.get(c).push(s); });
  let i = 0;
  q1('#skillGrid').innerHTML = Array.from(groups).map(([c, names]) =>
    '<div class="tilt rv"><div class="ico">' + CAT_ICONS[i++ % CAT_ICONS.length] + '</div><h3>' + esc(c) + '</h3><ul>' +
    names.map(skillRow).join('') + '</ul></div>').join('');
  if (list.length) {
    /* the hero code card is narrow: use short skill names so a long one (e.g. "Microsoft Office Suite") never gets cut off */
    const short = list.filter((s) => String(s.name).length <= 12), pick = (short.length ? short : list).slice(0, 3);
    const top = pick.map((s) => { const n = String(s.name); return '<span class="st">"' + esc(n.length > 12 ? n.slice(0, 11) + '\u2026' : n) + '"</span>'; }).join(', ');
    q1('#hvCode').innerHTML = '<span class="kw">class</span> <span class="fnm">DataScientist</span>:\n    skills = [' + top + ']\n\n    <span class="kw">def</span> <span class="fnm">solve</span>(self, data):\n        data = clean(data)\n        model = train(data)\n        <span class="kw">return</span> deploy(model)<b class="cur"></b>';
  }
  return groups.size;
}

function renderProjects(list) {
  show(q1('#projects'), list.length > 0); navLink('projects', list.length > 0);
  DECKS = list.map((p) => {
    const imgs = (p.images && p.images.length) ? p.images : (p.imageUrl ? [p.imageUrl] : []);
    return { t: p.title, d: p.longDescription || '', slides: imgs.map((u) => ({ s: u, c: '' })) };
  });
  q1('#projList').innerHTML = list.map((p, i) => {
    const imgs = DECKS[i].slides, cover = p.imageUrl || (imgs[0] && imgs[0].s) || '';
    const code = safeUrl(p.githubUrl), live = safeUrl(p.liveUrl);
    const btns = (code ? '<a class="btn" href="' + esc(code) + '" target="_blank" rel="noopener">' + IC.code + ' View Code</a>' : '') +
      (live ? '<a class="btn p" href="' + esc(live) + '" target="_blank" rel="noopener">' + IC.ext + ' Live Site</a>' : '');
    return '<article class="proj" style="--i:' + Math.min(i, 6) + '"><div><span class="num">' + pad2(i + 1) + ' / ' + pad2(list.length) + '</span>' +
      (p.category ? '<span class="pcat">' + esc(p.category) + '</span>' : '') +
      '<h3>' + esc(p.title) + '</h3>' +
      (p.description ? '<p class="sub" style="margin-bottom:22px">' + esc(p.description) + '</p>' : '') +
      '<div class="tags">' + (p.technologies || []).filter(Boolean).map((t) => '<a href="#skills">' + esc(t) + '</a>').join('') + '</div>' +
      (btns ? '<div class="pact"><div class="pbtn">' + btns + '</div></div>' : '') + '</div>' +
      '<div class="rcol"><div class="pic"><button class="shot" data-deck="' + i + '" type="button"' + (imgs.length ? '' : ' disabled') + ' aria-label="Open project images">' +
      (cover ? '<img src="' + esc(cover) + '" alt="' + esc(p.title + ' \u2013 project preview') + '" width="800" height="500" loading="lazy" decoding="async">' : PIC + '<span>No images yet</span>') + '</button>' +
      (imgs.length ? '<button class="pv" data-deck="' + i + '" type="button">' + PIC + '<b>Full Deck</b><small>' + imgs.length + (imgs.length === 1 ? ' image' : ' images') + ' &middot; click to explore</small></button>' : '') +
      '</div></div></article>';
  }).join('');
  initStack();
}

function renderExperience(list) {
  const on = list.length > 0;
  show(q1('#experience'), on); navLink('experience', on);
  /* keep the alternating section backgrounds even when Experience appears / disappears */
  const edu = q1('#education'), crt = q1('#certs');
  if (edu) edu.style.background = on ? '' : 'var(--bg2)';
  if (crt) crt.style.background = on ? 'var(--bg2)' : '';
  q1('#expList').innerHTML = list.map((x) => {
    const end = (x.endDate || '').trim();
    const range = [x.startDate, x.current || !end ? 'Present' : end].filter(Boolean).join(' \u2013 ');
    const badge = x.current ? '<span class="badge">Current</span>' : (range ? '<span class="badge d">' + esc(range) + '</span>' : '');
    const meta = [x.company, x.employmentType, x.location, x.current ? range : ''].filter(Boolean).map(esc).join(' \u00b7 ');
    const resp = (x.responsibilities || []).filter(Boolean);
    const tech = (x.technologies || []).filter(Boolean);
    return '<div class="it rv">' + badge + '<h3>' + esc(x.jobTitle) + '</h3><p>' + meta + '</p>' +
      (x.description ? '<p>' + esc(x.description) + '</p>' : '') +
      (resp.length ? '<ul class="xp-list">' + resp.map((r) => '<li>' + esc(r) + '</li>').join('') + '</ul>' : '') +
      (tech.length ? '<div class="tags">' + tech.map((t) => '<a href="#skills">' + esc(t) + '</a>').join('') + '</div>' : '') + '</div>';
  }).join('');
}

function renderEducation(list) {
  show(q1('#education'), list.length > 0); navLink('education', list.length > 0);
  q1('#eduList').innerHTML = list.map((e) => {
    const end = (e.endDate || '').trim(), ongoing = !end || /present|progress|ongoing|current/i.test(end);
    const range = [e.startDate, ongoing ? 'Present' : end].filter(Boolean).join(' \u2013 ');
    const badge = ongoing ? '<span class="badge">In progress</span>' : (range ? '<span class="badge d">' + esc(range) + '</span>' : '');
    const meta = [e.institution, e.location, e.grade].filter(Boolean).map(esc).join(' \u00b7 ');
    return '<div class="it rv">' + badge + '<h3>' + esc(e.degree) + '</h3><p>' + meta + '</p>' + (e.description ? '<p>' + esc(e.description) + '</p>' : '') + '</div>';
  }).join('');
}

function renderCerts(list) {
  show(q1('#certs'), list.length > 0); navLink('certs', list.length > 0);
  q1('#certList').innerHTML = list.map((c, i) => {
    const url = safeUrl(c.certificateUrl);
    const sub = [c.provider, c.date].filter(Boolean).map(esc).join(' \u00b7 ');
    const inner = '<div class="ico">' + CAT_ICONS[i % CAT_ICONS.length] + '</div><div><small>' + sub + '</small><h4>' + esc(c.title) + '</h4>' +
      (c.description ? '<div class="cd">' + esc(c.description) + '</div>' : '') + '</div>' + (url ? IC.ext.replace('<svg', '<svg class="cx"') : '');
    return url ? '<a class="cert rv" href="' + esc(url) + '" target="_blank" rel="noopener">' + inner + '</a>' : '<div class="cert rv">' + inner + '</div>';
  }).join('');
}

function renderContact(p) {
  const rows = [];
  if (p.email) rows.push(['Email', p.email, gmailCompose(p.email), IC.mail]);   // opens Gmail compose, not the mail app
  if (safeUrl(p.github)) rows.push(['GitHub', bare(p.github), safeUrl(p.github), IC.gh]);
  if (p.phone) rows.push(['Phone', p.phone, 'tel:' + String(p.phone).split(/[,/;]/)[0].replace(/[^\d+]/g, ''), IC.phone]);
  if (safeUrl(p.linkedin)) rows.push(['LinkedIn', bare(p.linkedin), safeUrl(p.linkedin), IC.li]);
  if (p.location) rows.push(['Location', p.location, '', IC.pin]);
  if (safeUrl(p.twitter)) rows.push(['Twitter / X', bare(p.twitter), safeUrl(p.twitter), IC.x]);
  if (safeUrl(p.website)) rows.push(['Website', bare(p.website), safeUrl(p.website), IC.globe]);
  q1('#clist').innerHTML = rows.map(([l, t, h, i]) => {
    const inner = '<span class="ci">' + i + '</span><span><small>' + esc(l) + '</small><b>' + esc(t) + '</b></span>';
    return h ? '<a class="crow" href="' + esc(h) + '"' + (/^https?:/.test(h) ? ' target="_blank" rel="noopener"' : '') + '>' + inner + '</a>' : '<div class="crow">' + inner + '</div>';
  }).join('');
}

function renderStats(c) {
  document.querySelectorAll('.stats [data-k]').forEach((el) => {
    el.dataset.n = c[el.dataset.k] || 0; el.dataset.s = ''; el._cd = 0; el.textContent = '0';
  });
  show(q1('.stats'), Object.values(c).some(Boolean));
}

/* Paints every section from already-loaded data. Used by loadSite() in the browser AND by the backend's
   `npm run prerender` script (server-side render), so both always produce the same HTML. */
function renderAll(d) {
  const p = d.profile || {}, skills = d.skills || [], projects = d.projects || [], edu = d.education || [], courses = d.courses || [], exp = d.experience || [];
  window.SITE = { profile: p };
  if (!(p.name || skills.length || projects.length)) return false;   // empty database: keep the static design content
  renderHero(p); renderAbout(p);
  const domains = renderSkills(skills);
  renderProjects(projects); renderExperience(exp); renderEducation(edu); renderCerts(courses); renderContact(p);
  renderStats({ projects: projects.length, certs: courses.length, domains: domains, tech: skills.length });
  return true;
}

async function loadSite() {
  try {
    const [profile, skills, projects, education, courses, experience] = await Promise.all([
      Api.get('/profile'), Api.get('/skills'), Api.get('/projects'), Api.get('/education'), Api.get('/courses'),
      Api.get('/experience').catch(() => [])
    ]);
    const ok = renderAll({ profile, skills, projects, education, courses, experience });
    if (ok && window.UIRefresh) UIRefresh();
    return ok;
  } catch (e) { return false; }   // API offline: static fallback stays
}
