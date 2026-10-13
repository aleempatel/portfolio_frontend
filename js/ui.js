/* UI behaviours: reveal, tilt, nav, theme switch, counters, smooth scroll, cursor glow */
// scroll reveal
const io=new IntersectionObserver(e=>e.forEach(x=>{if(x.isIntersecting){x.target.classList.add('on');io.unobserve(x.target)}}),{threshold:.12});
// progress bar, back-to-top
const pg=document.getElementById('pg'),tp=document.getElementById('top');
addEventListener('scroll',()=>{const m=document.documentElement.scrollHeight-innerHeight;pg.style.width=(m>0?scrollY/m*100:0)+'%';tp.classList.toggle('show',scrollY>600)},{passive:true});
// active nav link
const nl=[...document.querySelectorAll('.links a')];
const so=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting)nl.forEach(a=>a.classList.toggle('act',a.getAttribute('href')==='#'+e.target.id))}),{rootMargin:'-45% 0px -50% 0px'});
nl.forEach(a=>{const t=document.querySelector(a.getAttribute('href'));t&&so.observe(t)});
// mobile menu
const lk=document.querySelector('.links');
document.getElementById('bg2').onclick=()=>lk.classList.toggle('open');
nl.forEach(a=>a.addEventListener('click',()=>lk.classList.remove('open')));
// theme toggle
/* the site opens in the LIGHT theme (data-theme="light" is set on <html>); the switch toggles light <-> dark */
const th=document.getElementById('th'),tc=document.querySelector('meta[name="theme-color"]'),
  sync=()=>{const light=document.documentElement.dataset.theme!=='dark';th.setAttribute('aria-checked',light);if(tc)tc.setAttribute('content',light?'#f6f3ff':'#08050e')};
th.onclick=()=>{const r=document.documentElement;r.dataset.theme=r.dataset.theme==='dark'?'light':'dark';try{localStorage.setItem('theme',r.dataset.theme)}catch(e){}sync()};sync();
// counters
const co=new IntersectionObserver(es=>es.forEach(e=>{if(!e.isIntersecting)return;co.unobserve(e.target);const el=e.target,n=+el.dataset.n,s=el.dataset.s||'';let t0;const st=ts=>{t0=t0||ts;const p=Math.min(1,(ts-t0)/1200);el.textContent=Math.round(n*(1-Math.pow(1-p,3)))+(p===1?s:'');p<1&&requestAnimationFrame(st)};requestAnimationFrame(st)}),{threshold:.6});
// (re)bind effects for any new elements - called again after the API renders content
function UIRefresh(){
document.querySelectorAll('.rv').forEach(el=>{if(!el._rv){el._rv=1;io.observe(el)}});
document.querySelectorAll('.tilt').forEach(c=>{if(c._t)return;c._t=1;
c.addEventListener('mousemove',e=>{const r=c.getBoundingClientRect(),x=(e.clientX-r.left)/r.width-.5,y=(e.clientY-r.top)/r.height-.5;c.style.transform=`perspective(800px) rotateY(${x*12}deg) rotateX(${-y*12}deg) translateY(-4px)`});
c.addEventListener('mouseleave',()=>c.style.transform='')});
document.querySelectorAll('.tilt,.cert').forEach(c=>{if(c._sp)return;c._sp=1;c.addEventListener('mousemove',e=>{const r=c.getBoundingClientRect();c.style.setProperty('--mx',(e.clientX-r.left)+'px');c.style.setProperty('--my',(e.clientY-r.top)+'px')})});
document.querySelectorAll('[data-n]').forEach(el=>{if(!el._cd){el._cd=1;co.observe(el)}});
}
window.UIRefresh=UIRefresh;UIRefresh();
// buttery smooth scrolling (inertia) for mouse wheel + anchor links
(function(){if(matchMedia('(pointer:coarse)').matches||matchMedia('(prefers-reduced-motion:reduce)').matches)return;
let target=scrollY,cur=scrollY,run=false,last=0;const deck=document.getElementById('deck'),max=()=>document.documentElement.scrollHeight-innerHeight,clamp=v=>Math.max(0,Math.min(max(),v));
function tick(t){const dt=Math.min(64,t-last||16);last=t;cur+=(target-cur)*(1-Math.exp(-dt/165));if(Math.abs(target-cur)<.12){cur=target;run=false}scrollTo(0,cur);if(run)requestAnimationFrame(tick);else last=0}
function start(){if(!run){run=true;last=0;requestAnimationFrame(tick)}}
addEventListener('wheel',e=>{if(e.ctrlKey||document.querySelector('.dk.open,.rm.open')||e.target.closest('textarea'))return;e.preventDefault();if(!run)target=cur=scrollY;let d=e.deltaY;if(e.deltaMode===1)d*=32;else if(e.deltaMode===2)d*=innerHeight;target=clamp(target+d);start()},{passive:false});
addEventListener('scroll',()=>{if(!run)target=cur=scrollY},{passive:true});
document.addEventListener('click',e=>{const a=e.target.closest('a[href^="#"]'),h=a&&a.getAttribute('href');if(!h||h==='#')return;const el=document.querySelector(h);if(!el)return;e.preventDefault();if(!run)cur=scrollY;target=clamp(el.getBoundingClientRect().top+scrollY-70);start()});
addEventListener('resize',()=>{target=clamp(target)})})();
// cursor glow + hero card parallax
if(matchMedia('(pointer:fine)').matches){const g=document.createElement('div');g.id='cg';document.body.appendChild(g);const hv=document.querySelector('.hv');
addEventListener('mousemove',e=>{g.style.transform=`translate(${e.clientX-210}px,${e.clientY-210}px)`;const x=e.clientX/innerWidth-.5,y=e.clientY/innerHeight-.5;hv.style.transform=`translateY(-50%) perspective(900px) rotateY(${-x*10}deg) rotateX(${y*8}deg)`})}

// typing role: types character by character, holds, deletes, then the next phrase.
// The phrases come from the backend (window.ROLES, set by render.js); siteReady resolves once the API answered.
window.siteReady=new Promise(r=>{window.siteReadyRes=r});
(function(){const el=document.getElementById('typed');if(!el||matchMedia('(prefers-reduced-motion:reduce)').matches)return;
const DEF=['Data Scientist','Data Analyst','AI & Machine Learning','Cloud Computing'],wait=ms=>new Promise(r=>setTimeout(r,ms));
let p=0;
(async function loop(){await Promise.race([window.siteReady,wait(3000)]);if(window.ROLES_OFF)return;el.textContent='';
for(;;){const R=window.ROLES&&window.ROLES.length?window.ROLES:DEF,t=R[p%R.length];p++;
for(let i=1;i<=t.length;i++){el.textContent=t.slice(0,i);await wait(85)}
await wait(1500);
for(let i=t.length-1;i>=0;i--){el.textContent=t.slice(0,i);await wait(45)}
await wait(400)}})()})();
