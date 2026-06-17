/* ---------- almacenamiento (funciona en artifact, en tu hosting, o solo en memoria) ---------- */
const Store = {
  async get(k){
    try{ if(window.storage){ const r=await window.storage.get(k); return r?r.value:null; } }catch(e){}
    try{ return localStorage.getItem(k); }catch(e){ return null; }
  },
  async set(k,v){
    try{ if(window.storage){ await window.storage.set(k,v); return; } }catch(e){}
    try{ localStorage.setItem(k,v); }catch(e){}
  }
};
const SAVE_KEY = "trivia_preguntas_v1";

/* ---------- estado ---------- */
let pool=[];        // preguntas normalizadas {q, options:[{text,correct}], explain}
let queue=[];       // orden de la corrida actual
let idx=0, score=0, streak=0, best=0, correctCount=0, wrong=[];
let mode="study", answered=false;

/* ---------- utilidades ---------- */
const $=id=>document.getElementById(id);
const show=el=>el.classList.remove("hidden");
const hide=el=>el.classList.add("hidden");
function shuffle(a){a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.random()*(i+1)|0;[a[i],a[j]]=[a[j],a[i]];}return a;}

/* ---------- parseo ---------- */
function parse(raw){
  const t=raw.trim();
  if(!t) throw new Error("No hay preguntas que cargar.");
  if(t[0]==="["||t[0]==="{") return parseJSON(t);
  return parseText(t);
}
function parseJSON(t){
  let data=JSON.parse(t);
  if(!Array.isArray(data)) data=[data];
  return data.map((o,i)=>{
    if(!o.q||!Array.isArray(o.options)) throw new Error("Pregunta "+(i+1)+": faltan 'q' u 'options'.");
    const c=Number(o.correct);
    if(isNaN(c)||c<0||c>=o.options.length) throw new Error("Pregunta "+(i+1)+": 'correct' inválido.");
    return {q:String(o.q), explain:o.explain?String(o.explain):"",
      options:o.options.map((x,j)=>({text:String(x),correct:j===c}))};
  });
}
function parseText(t){
  const blocks=t.split(/\n\s*\n/).map(b=>b.trim()).filter(Boolean);
  const optRe=/^\s*([a-zA-Z]|\d+)\s*[\).:\-]\s+(.*)$/;   // a)  A.  1)  - texto
  const out=[];
  blocks.forEach((b,bi)=>{
    const lines=b.split("\n").map(l=>l.trimEnd());
    let q="", explain="", opts=[];
    for(let line of lines){
      const l=line.trim();
      if(!l) continue;
      if(l[0]===">"){ explain=l.slice(1).trim(); continue; }
      const m=l.match(optRe);
      if(m && q){                       // ya hay pregunta -> esto es una alternativa
        let txt=m[2].trim();
        let correct=false;
        if(/\s*\*+$/.test(txt)||/^\*/.test(txt)){ correct=true; txt=txt.replace(/^\*+\s*/,"").replace(/\s*\*+$/,"").trim(); }
        if(/\[(x|X|✓)\]\s*$/.test(txt)){ correct=true; txt=txt.replace(/\[(x|X|✓)\]\s*$/,"").trim(); }
        opts.push({text:txt,correct});
      } else if(!q){
        q=l.replace(/^\s*\d+\s*[\).:\-]\s*/,"").trim();  // quita numeración inicial
      } else {
        q+=" "+l;                       // pregunta de varias líneas
      }
    }
    if(!q) return;
    if(opts.length<2) throw new Error("La pregunta "+(bi+1)+' ("'+q.slice(0,30)+'…") necesita al menos 2 alternativas.');
    if(!opts.some(o=>o.correct)) throw new Error('La pregunta '+(bi+1)+' ("'+q.slice(0,30)+'…") no tiene la correcta marcada con *.');
    out.push({q,explain,options:opts});
  });
  if(!out.length) throw new Error("No pude reconocer ninguna pregunta. Revisa el formato.");
  return out;
}

/* ---------- arranque de partida ---------- */
function startGame(){
  let qs=pool.map(p=>({q:p.q,explain:p.explain,
    options: $("shuffleA").checked ? shuffle(p.options) : p.options.slice()}));
  queue = $("shuffleQ").checked ? shuffle(qs) : qs;
  idx=0;score=0;streak=0;best=0;correctCount=0;wrong=[];
  hide($("start"));hide($("end"));show($("quiz"));
  render();
}
function render(){
  answered=false;
  const item=queue[idx];
  $("count").textContent=(idx+1)+" / "+queue.length;
  $("score").textContent=score+" pts";
  $("streak").textContent="racha "+streak;
  $("streak").classList.toggle("hot",streak>=3);
  $("progress").style.width=(idx/queue.length*100)+"%";
  $("qnum").textContent="Pregunta "+(idx+1);
  $("qtext").textContent=item.q;
  const ans=$("answers"); ans.innerHTML="";
  const keys=["A","B","C","D","E","F"];
  item.options.forEach((o,i)=>{
    const b=document.createElement("button");
    b.className="answer";
    b.innerHTML='<span class="key">'+keys[i]+'</span><span>'+escapeHTML(o.text)+'</span>';
    b.onclick=()=>choose(i);
    ans.appendChild(b);
  });
  const ex=$("explain"); ex.className="explain"; ex.innerHTML="";
  hide($("next"));
}
function choose(i){
  if(answered) return;
  answered=true;
  const item=queue[idx];
  const btns=$("answers").querySelectorAll(".answer");
  const correctIdx=item.options.findIndex(o=>o.correct);
  const ok=item.options[i].correct;
  btns.forEach(b=>b.disabled=true);

  if(ok){ correctCount++; streak++; best=Math.max(best,streak); score+=10+Math.max(0,(streak-1)*2); }
  else { streak=0; wrong.push({q:item.q, your:item.options[i].text, correct:item.options[correctIdx].text, explain:item.explain}); }

  if(mode==="study"){
    btns[correctIdx].classList.add("correct");
    if(!ok) btns[i].classList.add("wrong");
    if(item.explain){
      $("explain").innerHTML="<b>"+(ok?"Correcto":"La respuesta era "+escapeHTML(item.options[correctIdx].text))+".</b> "+escapeHTML(item.explain);
      $("explain").classList.add("show");
    } else if(!ok){
      $("explain").innerHTML="<b>La respuesta era "+escapeHTML(item.options[correctIdx].text)+".</b>";
      $("explain").classList.add("show");
    }
  }
  $("score").textContent=score+" pts";
  $("streak").textContent="racha "+streak;
  $("streak").classList.toggle("hot",streak>=3);
  show($("next"));
  $("next").focus();
}
function nextQ(){
  if(!answered) return;
  idx++;
  if(idx>=queue.length) finish();
  else render();
}
function finish(){
  hide($("quiz"));show($("end"));
  $("progress").style.width="100%";
  const total=queue.length, pct=Math.round(correctCount/total*100);
  $("pct").textContent=pct+"%";
  $("nok").textContent=correctCount;
  $("nbad").textContent=total-correctCount;
  $("best").textContent=best;
  $("verdict").textContent = pct===100?"Perfecto. Dominaste el set."
    : pct>=80?"Muy bien. Casi lo tienes."
    : pct>=50?"Vas bien, repasa las falladas."
    : "A repasar — vuelve a intentarlo.";
  const rev=$("review");
  if(wrong.length){
    show($("retryWrong"));
    rev.innerHTML="<h3>Para repasar ("+wrong.length+")</h3>"+wrong.map(w=>
      '<div class="rev-item"><div class="rev-q">'+escapeHTML(w.q)+'</div>'+
      '<div class="rev-line"><span class="lab">tú</span><span class="bad">'+escapeHTML(w.your)+'</span></div>'+
      '<div class="rev-line"><span class="lab">ok</span><span class="good">'+escapeHTML(w.correct)+'</span></div>'+
      (w.explain?'<div class="rev-line" style="color:var(--muted);margin-top:6px">'+escapeHTML(w.explain)+'</div>':'')+
      '</div>').join("");
  } else { hide($("retryWrong")); rev.innerHTML=""; }
}
function escapeHTML(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}

/* ---------- ejemplos ---------- */
const SAMPLE=`1. ¿Qué tipo de JOIN devuelve solo las filas con coincidencia en ambas tablas?
a) LEFT JOIN
b) INNER JOIN *
c) FULL OUTER JOIN
d) CROSS JOIN
> El INNER JOIN solo conserva las filas donde la condición se cumple en las dos tablas.

2. La complejidad de la búsqueda binaria en un arreglo ordenado es:
a) O(n)
b) O(n log n)
c) O(log n) *
d) O(1)
> En cada paso descarta la mitad de los elementos, por eso es logarítmica.

3. En Scrum, ¿quién es responsable de maximizar el valor del producto?
a) Scrum Master
b) Product Owner *
c) El equipo de desarrollo
d) El stakeholder
> El Product Owner gestiona y prioriza el Product Backlog para maximizar el valor.

4. ¿Qué principio de POO permite que un método se comporte distinto según el objeto?
a) Encapsulamiento
b) Herencia
c) Polimorfismo *
d) Abstracción
> El polimorfismo permite que la misma operación tenga comportamientos distintos.

5. El código HTTP 404 significa:
a) Acceso no autorizado
b) Recurso no encontrado *
c) Error interno del servidor
d) Petición correcta
> 404 indica que el recurso solicitado no existe en el servidor.

6. ¿Qué comando crea una nueva rama en Git y cambia a ella?
a) git branch nombre
b) git checkout -b nombre *
c) git merge nombre
d) git clone nombre
> "checkout -b" crea la rama y mueve el HEAD hacia ella en un solo paso.`;

/* ---------- eventos ---------- */
$("load").onclick=async()=>{
  $("err").textContent="";
  try{
    pool=parse($("input").value);
    await Store.set(SAVE_KEY,$("input").value.trim());
    startGame();
  }catch(e){ $("err").textContent=e.message; }
};
$("sample").onclick=()=>{ $("input").value=SAMPLE; $("err").textContent=""; };
$("resume").onclick=async()=>{
  const saved=await Store.get(SAVE_KEY);
  if(saved){ $("input").value=saved; try{ pool=parse(saved); startGame(); }catch(e){ $("err").textContent=e.message; } }
};
$("next").onclick=nextQ;
$("again").onclick=startGame;
$("back").onclick=()=>{ hide($("end")); show($("start")); };
$("retryWrong").onclick=()=>{
  pool=wrong.map(w=>({q:w.q,explain:w.explain,
    options:[{text:w.correct,correct:true},{text:w.your,correct:false}]}));
  // recupera las alternativas completas desde queue por enunciado
  pool=wrong.map(w=>{
    const orig=queue.find(it=>it.q===w.q);
    return {q:w.q,explain:w.explain,options:orig?orig.options.map(o=>({text:o.text,correct:o.correct})):
      [{text:w.correct,correct:true},{text:w.your,correct:false}]};
  });
  startGame();
};
document.querySelectorAll("#mode button").forEach(b=>b.onclick=()=>{
  document.querySelectorAll("#mode button").forEach(x=>x.classList.remove("on"));
  b.classList.add("on"); mode=b.dataset.mode;
});

/* teclado */
document.addEventListener("keydown",e=>{
  if($("quiz").classList.contains("hidden")) return;
  if((e.key==="Enter"||e.key===" ")&&answered){ e.preventDefault(); nextQ(); return; }
  if(!answered){
    let n=-1;
    if(/^[1-6]$/.test(e.key)) n=+e.key-1;
    else if(/^[a-fA-F]$/.test(e.key)) n="abcdef".indexOf(e.key.toLowerCase());
    const btns=$("answers").querySelectorAll(".answer");
    if(n>=0&&n<btns.length){ e.preventDefault(); choose(n); }
  }
});

/* al abrir: detecta entorno y ofrece continuar si hay set guardado */
(async()=>{
  $("env-tag").textContent = window.storage ? "guardado activo" : "";
  const saved=await Store.get(SAVE_KEY);
  if(saved) show($("resume"));
})();