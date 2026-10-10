/* Hero particle network */
// particle network background
(function(){const cv=document.getElementById('bg'),cx=cv.getContext('2d');let w,h,P=[];
function rs(){w=cv.width=cv.offsetWidth;h=cv.height=cv.offsetHeight;P=Array.from({length:Math.min(70,w/18)},()=>({x:Math.random()*w,y:Math.random()*h,vx:(Math.random()-.5)*.4,vy:(Math.random()-.5)*.4}))}
function f(){if(scrollY>innerHeight){requestAnimationFrame(f);return}cx.clearRect(0,0,w,h);P.forEach((p,i)=>{p.x+=p.vx;p.y+=p.vy;if(p.x<0||p.x>w)p.vx*=-1;if(p.y<0||p.y>h)p.vy*=-1;cx.fillStyle='rgba(166,107,255,.8)';cx.beginPath();cx.arc(p.x,p.y,1.8,0,7);cx.fill();for(let j=i+1;j<P.length;j++){const q=P[j],d=Math.hypot(p.x-q.x,p.y-q.y);if(d<130){cx.strokeStyle=`rgba(79,209,255,${.18*(1-d/130)})`;cx.beginPath();cx.moveTo(p.x,p.y);cx.lineTo(q.x,q.y);cx.stroke()}}});requestAnimationFrame(f)}
addEventListener('resize',rs);rs();f()})();
