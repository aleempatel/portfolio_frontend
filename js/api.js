/* Thin client for the portfolio backend (see backend README). Responses look like { success, data, message }. */
let API_BASE = (window.APP_CONFIG && window.APP_CONFIG.API_BASE) || '';
try { API_BASE = localStorage.getItem('apiBase') || API_BASE; } catch (e) { /* storage blocked */ }
API_BASE = API_BASE.replace(/\/+$/, '');

async function request(path, opts) {
  let res;
  try { res = await fetch(API_BASE + '/api' + path, opts); }
  catch (e) { const er = new Error('Cannot reach the server.'); er.network = true; throw er; }   // offline / backend down
  let j = {};
  try { j = await res.json(); } catch (e) { /* non-JSON body */ }
  if (!res.ok || j.success === false) throw new Error(j.message || 'Request failed (' + res.status + ')');
  return j;
}

const Api = {
  get: (path) => request(path).then((j) => j.data),
  contact: (payload) => request('/contact', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
  }),
  resumeView: API_BASE + '/api/profile/resume/view',
  resumeDownload: API_BASE + '/api/profile/resume/download'
};
