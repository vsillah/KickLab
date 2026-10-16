/* ---------- quiz bank ---------- */
const QUIZ={
  fight:[
    {q:'Same punch, but padding doubles the contact time. The force becomes…',o:['Half as big','Twice as big','The same'],a:0,why:'F = p/Δt. Same p, double Δt, half the force.'},
    {q:'Your fist hits the dummy with 2,000 N. How hard does the dummy push on your fist?',o:['0 N','1,000 N','2,000 N'],a:2,why:"Newton's 3rd law: forces come in equal and opposite pairs."},
    {q:'You double your fist speed. Kinetic energy becomes…',o:['2× bigger','4× bigger','The same'],a:1,why:'KE = ½mv². Double v, square it: 4×.'},
    {q:'Same force, but the contact area is 5× bigger. The pressure…',o:['Drops to one fifth','Goes up 5×','Stays the same'],a:0,why:'P = F/A. Bigger A, smaller P.'}],
  race:[
    {q:'A heavier car takes the same corner on the same tires. Its top safe speed is…',o:['Higher','Lower','The same'],a:2,why:'v_max = √(μgR). Mass cancels out.'},
    {q:'You turn the steering wheel more. The turn radius gets…',o:['Smaller (tighter turn)','Bigger (wider turn)','It stays the same'],a:0,why:'R = L/tan δ. Bigger δ, bigger tan δ, smaller R.'},
    {q:'You double your speed in a turn. The grip you need becomes…',o:['2×','4×','The same'],a:1,why:'a = v²/R. Speed is squared.'},
    {q:'A car with a longer wheelbase L needs, for the same corner…',o:['More steering angle','Less steering angle','The same angle'],a:0,why:'δ = atan(L/R). Bigger L, bigger δ.'}],
  kick:[
    {q:'At the very top of the ball\'s flight, vy is…',o:['Zero','At its biggest','Equal to vx'],a:0,why:'It is switching from going up to coming down.'},
    {q:'Ignoring air, what happens to vx while the ball flies?',o:['Stays the same','Shrinks','Grows'],a:0,why:'Gravity only pulls down, so nothing changes the horizontal part.'},
    {q:'Same kick on the Moon (g = 1.62 instead of 9.81). The highest point is about…',o:['6× higher','Half as high','The same'],a:0,why:'h = vy²/(2g). g is 6× smaller, so h is 6× bigger.'},
    {q:'A ball arrives at 10 m/s and you head it straight back at 10 m/s. |Δv| is…',o:['0 m/s','10 m/s','20 m/s'],a:2,why:'Direction flips: +10 to −10 is a change of 20.'}]
};

/* ---------- notebook ---------- */
const INTRO={
  fight:{title:'Fight Lab',big:'',sub:'Throw a punch and this notebook fills in step by step with your real numbers.',
    steps:[{h:'Momentum',p:'How much push a moving thing carries.',eq:'p = m · v'},{h:'Impulse',p:'Force times contact time equals the change in momentum.',eq:'F · Δt = Δp   →   F = Δp / Δt'},{h:'Pressure',p:'The same force on a smaller area hurts more.',eq:'P = F / A'},{h:"Newton's 3rd law",p:'Whatever your fist does to the dummy, the dummy does right back.',eq:'F(fist on dummy) = − F(dummy on fist)'}],
    idea:'Drag Δt from 6 ms (bare fist) to 15 ms (glove) and watch the force on the chart drop by more than half. Nothing else changed.',quiz:QUIZ.fight},
  race:{title:'Race Lab',big:'',sub:'Steer through the corner yourself. The math console shows the steering geometry and grip in real time.',
    steps:[{h:'Steering ratio',p:'Turning the wheel 15° turns the front tires 1°.',eq:'δ = θ_wheel ÷ 15'},{h:'Turn radius (bicycle model)',p:'How tight the car turns for a given tire angle.',eq:'R_turn = L ÷ tan δ'},{h:'Grip needed',p:'Sideways acceleration to follow that curve.',eq:'a = v² ÷ R'},{h:'Grip available',p:'What the tires can give before sliding.',eq:'a_max = μ · g'},{h:'Corner speed limit',p:'Set them equal.',eq:'v_max = √(μ · g · R)'}],
    idea:'Look at the wheel on the stage. The yellow marker is the angle the math says this corner needs. Match it and you carve the turn.',quiz:QUIZ.race},
  kick:{title:'Kick Lab',big:'',sub:'Pick v and θ, check the math, then kick. Change gravity to play on the Moon or Jupiter.',
    steps:[{h:'Split the velocity',p:'An angled kick is a sideways part and an upward part.',eq:'vx = v·cos θ&emsp;&emsp;vy = v·sin θ'},{h:'Flight path',p:'Sideways stays steady. Up gets pulled down by gravity.',eq:'x = vx·t&emsp;&emsp;y = h₀ + vy·t − ½·g·t²'},{h:'Highest point',p:'Where vy hits zero.',eq:'h_max = vy² / (2g)'},{h:'Kick force',p:'Big change in speed in a tiny time.',eq:'F = m · Δv / Δt'}],
    idea:'Two checks decide every free kick: above 1.85 m at 9.15 m, below 2.44 m at 21 m. Get both green in the math console before you kick.',quiz:QUIZ.kick}
};
function notebook(d){$('#nbTitle').textContent=d.title;$('#nbBig').textContent=d.big||'';$('#nbSub').textContent=d.sub;
  $('#steps').innerHTML=d.steps.map(s=>`<li><div><h3>${s.h}</h3><p>${s.p}</p><div class="eq">${s.eq}</div></div></li>`).join('');
  $('#idea').innerHTML=`<span class="tag">Big idea</span><p>${d.idea}</p>`;renderQuiz(d.quiz);}
let lastQ=-1;
function renderQuiz(pool){let i;do{i=Math.floor(Math.random()*pool.length);}while(pool.length>1&&i===lastQ);lastQ=i;const q=pool[i];
  const box=$('#quiz');box.innerHTML=`<span class="tag">Quick check</span><p>${q.q}</p><div class="q"></div><p class="fb" aria-live="polite"></p>`;
  const wrap=box.querySelector('.q'),fb=box.querySelector('.fb');
  q.o.forEach((o,k)=>{const b=document.createElement('button');b.type='button';b.textContent=o;b.addEventListener('click',()=>{
    wrap.querySelectorAll('button').forEach((x,j)=>{x.disabled=true;if(j===q.a)x.classList.add('right');});if(k!==q.a)b.classList.add('wrong');
    fb.textContent=(k===q.a?'Right. ':'Not quite. ')+q.why;});wrap.appendChild(b);});}

