/* ============================================================
   quiz.js — El juego + la pantalla de resultados
   Soporta respuesta unica y multi-respuesta, da feedback,
   muestra la explicacion y al final calcula tu nota (0-20).

   Puede arrancar de dos formas:
     - desde una evaluacion:  go('quiz', evaluacionId)
     - desde una mezcla:      go('quiz', { preguntas, recargar })
   ============================================================ */

let Q = null;   // partida actual: { list, idx, score, wrong, recargar }

/* baraja un array (copia) */
function shuffle(a) {
  a = a.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* baraja las alternativas de una pregunta y reubica las correctas */
function prepararPregunta(q) {
  const orden = shuffle(q.opciones.map((_, i) => i));
  const opciones = orden.map(i => q.opciones[i]);
  const correctas = [];
  orden.forEach((origIdx, newIdx) => { if (q.correctas.includes(origIdx)) correctas.push(newIdx); });
  return { ...q, opciones, correctas };
}

/* arranca una partida con un arreglo de preguntas.
   recargar() es una funcion que devuelve preguntas frescas (para "Repetir"). */
function iniciarQuiz(preguntas, recargar) {
  if (!preguntas || !preguntas.length) { toast('No hay preguntas para estudiar'); back(); return; }
  Q = {
    list: shuffle(preguntas).map(prepararPregunta),
    idx: 0, score: 0, wrong: [],
    recargar,
  };
  mostrarPregunta();
}

/* atajo: arrancar desde una sola evaluacion */
async function startQuiz(evalId) {
  iniciarQuiz(await DB.getPreguntas(evalId), () => DB.getPreguntas(evalId));
}

/* dibuja la pregunta actual y maneja la respuesta */
function mostrarPregunta() {
  const q = Q.list[Q.idx];
  const total = Q.list.length;

  $('#quizProgress').textContent = `${Q.idx + 1} / ${total}`;
  $('#quizBar').style.width = `${(Q.idx / total) * 100}%`;
  $('#quizImg').hidden = !q.imagen;
  $('#quizQuestion').textContent = q.enunciado;

  const multi = q.correctas.length > 1;
  const cont  = $('#quizOptions');
  cont.innerHTML = q.opciones.map((o, j) =>
    `<button class="qopt" data-i="${j}"><span class="mark"></span><span>${esc(o)}</span></button>`).join('');

  const explain = $('#quizExplain');
  explain.hidden = true; explain.textContent = '';
  const check = $('#quizCheck'), next = $('#quizNext');
  next.hidden = true;
  check.hidden = !multi;
  if (multi) check.textContent = 'Comprobar';

  let answered = false;

  $$('.qopt', cont).forEach(btn => btn.onclick = () => {
    if (answered) return;
    Sonido.click();
    if (multi) {
      btn.classList.toggle('sel');
      btn.querySelector('.mark').textContent = btn.classList.contains('sel') ? '\u2713' : '';
    } else {
      responder([Number(btn.dataset.i)]);
    }
  });

  check.onclick = () => {
    if (answered) return;
    const sel = $$('.qopt.sel', cont).map(b => Number(b.dataset.i));
    if (!sel.length) return toast('Marca al menos una');
    responder(sel);
  };

  function responder(sel) {
    answered = true;
    const correcto = sel.slice().sort().join(',') === q.correctas.slice().sort().join(',');
    correcto ? Sonido.acierto() : Sonido.error();

    $$('.qopt', cont).forEach(b => {
      const i = Number(b.dataset.i);
      const mark = b.querySelector('.mark');
      b.disabled = true; b.classList.remove('sel');
      if (q.correctas.includes(i)) { b.classList.add('correct'); mark.textContent = '\u2713'; }
      else if (sel.includes(i))    { b.classList.add('wrong');   mark.textContent = '\u2715'; }
      else                         { mark.textContent = ''; }
    });

    if (q.explicacion) { explain.textContent = q.explicacion; explain.hidden = false; }
    if (correcto) Q.score++; else Q.wrong.push(q);

    check.hidden = true;
    next.hidden = false;
    next.textContent = (Q.idx === total - 1) ? 'Ver resultado' : 'Siguiente';
    $('#quizBar').style.width = `${((Q.idx + 1) / total) * 100}%`;
  }

  next.onclick = () => {
    Q.idx++;
    if (Q.idx >= total) finish();
    else mostrarPregunta();
  };
}

/* termina la partida y muestra resultados */
function finish() {
  renderResult();
  if (navStack[navStack.length - 1] === 'quiz') navStack.pop();
  go('result');
}

function renderResult() {
  const total = Q.list.length;
  const score = Q.score;
  const nota = Math.round((score / total) * 20);

  $('#resNota').textContent = nota;
  $('#resScore').textContent = `${score} de ${total} correctas \u00b7 nota ${nota}/20`;

  const detail = $('#resDetail');
  if (Q.wrong.length) {
    detail.innerHTML = `<p class="muted" style="margin:0 0 6px">Para repasar (${Q.wrong.length}):</p>` +
      Q.wrong.map(q =>
        `<div class="q"><div class="qt"><span>${esc(q.enunciado)}</span></div>` +
        q.correctas.map(ci => `<div class="opt correct">${esc(q.opciones[ci])}</div>`).join('') +
        (q.explicacion ? `<div class="meta"><span class="tag">${esc(q.explicacion)}</span></div>` : '') +
        `</div>`).join('');
  } else {
    detail.innerHTML = `<div class="empty" style="padding:14px">\u00a1Perfecto, todas correctas!</div>`;
  }
}

/* botones de la pantalla de resultados (fijos, se enlazan una vez) */
$('#resRetry').onclick = async () => {
  if (!Q || !Q.recargar) return;
  const recargar = Q.recargar;
  const fresh = await recargar();
  navStack.pop();                 // quita 'result'
  go('quiz', { preguntas: fresh, recargar });
};
$('#resMenu').onclick = () => {
  navStack.length = 1;            // deja solo 'menu'
  go('menu');
};

/* registrar pantallas */
SCREENS.quiz = {
  enter(payload) {
    if (payload == null) return;
    if (typeof payload === 'number') startQuiz(payload);            // desde una evaluacion
    else if (payload.preguntas) iniciarQuiz(payload.preguntas, payload.recargar); // desde una mezcla
  }
};
SCREENS.result = { enter() {} };