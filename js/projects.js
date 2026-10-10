/* Projects: Full Deck gallery + stacked scroll cards.
   DECKS is overwritten from the backend (/api/projects) when available; this list is the offline fallback. */
// project decks: replace {s:''} with an image path/URL for each slide
let DECKS=[
{t:'End-to-End Machine Learning Pipeline',slides:[{s:'',c:'Data cleaning'},{s:'',c:'Feature engineering'},{s:'',c:'Model training'},{s:'',c:'Cloud deployment'}]},
{t:'Interactive Data Visualization Dashboard',slides:[{s:'',c:'Dashboard overview'},{s:'',c:'3D data clusters'},{s:'',c:'Custom shaders'},{s:'',c:'Business metrics'}]},
{t:'Cloud & Automation Architecture',slides:[{s:'',c:'Architecture diagram'},{s:'',c:'Azure VM setup'},{s:'',c:'Automation scripts'},{s:'',c:'Deployment'}]}];
const dk=document.getElementById('deck'),trk=dk.querySelector('.trk'),dts=dk.querySelector('.dots2'),dT=dk.querySelector('h3'),dC=dk.querySelector('small'),dD=dk.querySelector('.dkd');
const PIC='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="9" cy="10" r="1.8"/><path d="m21 16-5-5-9 9"/></svg>';let cur=0,n=0,lock=0;
function mark(){const sl=[...trk.children],c=trk.scrollLeft+trk.clientWidth/2;let b=0,bd=1e9;sl.forEach((x,k)=>{const d=Math.abs(x.offsetLeft+x.offsetWidth/2-c);if(d<bd){bd=d;b=k}});cur=b;sl.forEach((x,k)=>x.classList.toggle('on',k===b));[...dts.children].forEach((x,k)=>x.classList.toggle('on',k===b));dC.textContent=(b+1)+' / '+n}
function go(k){k=Math.max(0,Math.min(n-1,k));const x=trk.children[k];trk.scrollTo({left:x.offsetLeft+x.offsetWidth/2-trk.clientWidth/2,behavior:'smooth'})}
function openDeck(i){const d=DECKS[i];if(!d||!d.slides.length)return;n=d.slides.length;dT.textContent=d.t;dD.textContent=d.d||'';
trk.innerHTML=d.slides.map((x,k)=>`<div class="sl"><div class="sli">${x.s?`<img src="${esc(x.s)}" alt="${esc((x.c?x.c+' \u2013 ':'')+d.t)}" width="1280" height="720" loading="lazy" decoding="async">`:PIC}</div><div class="sc"><span>${esc(x.c||d.t)}</span><span>${k+1} / ${n}</span></div></div>`).join('');
dts.innerHTML=d.slides.map((_,k)=>`<i data-k="${k}"></i>`).join('');
dk.classList.add('open');document.body.style.overflow='hidden';trk.style.scrollBehavior='auto';trk.scrollLeft=0;requestAnimationFrame(()=>{trk.style.scrollBehavior='';mark()})}
function closeDeck(){dk.classList.remove('open');document.body.style.overflow=''}
document.addEventListener('click',e=>{const b=e.target.closest('.pv,.shot');if(b&&!b.disabled)openDeck(+b.dataset.deck)});
trk.addEventListener('scroll',()=>requestAnimationFrame(mark),{passive:true});
trk.addEventListener('click',e=>{const x=e.target.closest('.sl');if(x)go([...trk.children].indexOf(x))});
trk.addEventListener('wheel',e=>{e.preventDefault();const t=Date.now();if(t-lock<550)return;lock=t;go(cur+((e.deltaY||e.deltaX)>0?1:-1))},{passive:false});
dts.onclick=e=>e.target.dataset.k!=null&&go(+e.target.dataset.k);
dk.querySelector('.pr').onclick=()=>go(cur-1);dk.querySelector('.nx').onclick=()=>go(cur+1);dk.querySelector('.cl').onclick=closeDeck;
addEventListener('keydown',e=>{if(!dk.classList.contains('open'))return;if(e.key==='Escape')closeDeck();if(e.key==='ArrowRight')go(cur+1);if(e.key==='ArrowLeft')go(cur-1)});
// stacked project cards: previous card scales down & dims as next slides over it
let cards=[],raf=0;
function initStack(){cards=[...document.querySelectorAll('.proj')];cards.forEach(c=>{if(!c._d){const d=document.createElement('span');d.className='dm';c.appendChild(d);c._d=d;c._s=1;c._o=0}c._ts=1;c._to=0});calc()}
function calc(){const H=innerHeight;cards.forEach((c,i)=>{const nx=cards[i+1];if(!nx||getComputedStyle(c).position!=='sticky'){c._ts=1;c._to=0;return}const top=90+(i+1)*26,p=Math.min(1,Math.max(0,(H-nx.getBoundingClientRect().top)/(H-top)));c._ts=1-p*.06;c._to=p*.45});if(!raf)raf=requestAnimationFrame(tick)}
function tick(){let busy=0;cards.forEach(c=>{c._s+=(c._ts-c._s)*.3;c._o+=(c._to-c._o)*.3;if(Math.abs(c._ts-c._s)>.0005||Math.abs(c._to-c._o)>.002)busy=1;else{c._s=c._ts;c._o=c._to}c.style.transform=c._s===1?'':`translate3d(0,0,0) scale(${c._s})`;c._d.style.opacity=c._o});raf=busy?requestAnimationFrame(tick):0}
addEventListener('scroll',calc,{passive:true});addEventListener('resize',calc);initStack();
