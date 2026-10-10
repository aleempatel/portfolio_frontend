/* App glue: contact form, resume viewer, and loading the site content from the backend. */
function toast(msg) {
  let t = document.querySelector('.toast');
  if (!t) { t = document.createElement('div'); t.className = 'toast'; document.body.appendChild(t); }
  t.textContent = msg; t.classList.add('show');
  clearTimeout(t._t); t._t = setTimeout(() => t.classList.remove('show'), 3200);
}

/* 1) Contact form -> POST /api/contact. The backend emails the message to the address saved in the
      admin panel, with the visitor's name in the sender name + subject, and their email as Reply-To. */
const form = document.getElementById('cf'), fst = document.getElementById('fst');
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = form.querySelector('button[type=submit]'), v = (id) => document.getElementById(id).value.trim();
  const payload = { name: v('fn'), email: v('fe'), subject: v('fs'), message: v('fm') };
  btn.disabled = true; btn.textContent = 'Transmitting...'; fst.className = 'fst'; fst.textContent = '';
  try {
    await Api.contact(payload);
    form.reset(); fst.className = 'fst ok'; fst.textContent = 'Message sent. I will get back to you soon.';
  } catch (err) {
    fst.className = 'fst err';
    if (err.network) {   // server unreachable: offer Gmail compose with everything pre-filled
      const to = (window.SITE && SITE.profile && SITE.profile.email) || 'aleempatel4829@gmail.com';
      const link = gmailCompose(to, payload.subject, payload.message + '\n\n- ' + payload.name + ' (' + payload.email + ')');
      fst.innerHTML = 'Server unreachable. <a href="' + esc(link) + '" target="_blank" rel="noopener" style="text-decoration:underline">Open Gmail compose instead</a>';
    } else fst.textContent = err.message;
  } finally { btn.disabled = false; btn.textContent = 'Transmit Message'; }
});

/* 2) Resume: opens in a PDF viewer first; the Download button inside the viewer does the download. */
const rm = document.getElementById('resumeModal'), rf = document.getElementById('rFrame');
function openResume() {
  if (!(window.SITE && SITE.profile && SITE.profile.resumeUrl)) { toast('Resume is not available yet.'); return; }
  rf.src = Api.resumeView;
  document.getElementById('rDl').href = Api.resumeDownload;
  document.getElementById('rOpen').href = Api.resumeView;
  rm.classList.add('open'); document.body.style.overflow = 'hidden';
}
function closeResume() { rm.classList.remove('open'); rf.src = 'about:blank'; document.body.style.overflow = ''; }
document.querySelectorAll('[data-resume]').forEach((a) => a.addEventListener('click', (e) => { e.preventDefault(); openResume(); }));
document.getElementById('rClose').addEventListener('click', closeResume);
addEventListener('keydown', (e) => { if (e.key === 'Escape' && rm.classList.contains('open')) closeResume(); });

/* 3) Everything else (hero, about, skills, projects, education, certifications, contact) comes from the API. */
loadSite().finally(() => window.siteReadyRes && window.siteReadyRes());
