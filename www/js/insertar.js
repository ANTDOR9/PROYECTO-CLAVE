/* ============================================================
   insertar.js — Pantalla Insertar
   Destino (curso/evaluación) + botones de ayuda + vista previa
   en vivo (usa parse) + guardado enlazado a la evaluación.
   ============================================================ */

const COLORS = ['#7b5be6', '#2aa897', '#f6a93b', '#e8632a', '#46a85a', '#566076'];
let colorSel = COLORS[0];
let parsed = [];   // preguntas detectadas en este momento

/* ---- atajos a los elementos ---- */
const selCurso = $('#selCurso');
const selEval  = $('#selEval');
const addEvalBtn = $('#addEval');
const ta = $('#ta');

/* ---- paleta de colores para crear curso ---- */
const swWrap = $('#swatches');
COLORS.forEach((c, i) => {
  const s = document.createElement('div');
  s.className = 'sw' + (i === 0 ? ' sel' : '');
  s.style.background = c;
  s.onclick = () => {
    colorSel = c;
    $$('.sw', swWrap).forEach(x => x.classList.remove('sel'));
    s.classList.add('sel');
  };
  swWrap.appendChild(s);
});

/* ---- cargar cursos y evaluaciones en los selectores ---- */
async function loadCursos(selId) {
  const cursos = await DB.listCursos();
  selCurso.innerHTML = '<option value="">— elige curso —</option>' +
    cursos.map(c => `<option value="${c.id}">${esc(c.nombre)}</option>`).join('');
  if (selId) selCurso.value = selId;
  await loadEvals();
}
async function loadEvals(selId) {
  const cid = selCurso.value;
  if (!cid) {
    selEval.innerHTML = '<option value="">— elige curso primero —</option>';
    selEval.disabled = true; addEvalBtn.disabled = true;
    return updateSave();
  }
  const evs = await DB.listEvaluaciones(cid);
  const opts = await Promise.all(evs.map(async e =>
    `<option value="${e.id}">${esc(e.nombre)} (${await DB.countPreguntas(e.id)})</option>`));
  selEval.innerHTML = '<option value="">— elige evaluación —</option>' + opts.join('');
  selEval.disabled = false; addEvalBtn.disabled = false;
  if (selId) selEval.value = selId;
  updateSave();
}
selCurso.onchange = () => loadEvals();
selEval.onchange = updateSave;

/* ---- crear curso ---- */
$('#addCurso').onclick = () => $('#formCurso').classList.toggle('show');
$('#crearCurso').onclick = async () => {
  const nombre = $('#cursoNombre').value.trim();
  if (!nombre) return toast('Ponle nombre al curso');
  const id = await DB.addCurso({ nombre, color: colorSel });
  $('#cursoNombre').value = '';
  $('#formCurso').classList.remove('show');
  await loadCursos(id);
  toast('Curso creado');
};

/* ---- crear evaluación ---- */
$('#addEval').onclick = () => $('#formEval').classList.toggle('show');
$('#crearEval').onclick = async () => {
  if (!selCurso.value) return toast('Elige un curso primero');
  const nombre = $('#evalNombre').value.trim();
  if (!nombre) return toast('Ponle nombre a la evaluación');
  const id = await DB.addEvaluacion({
    cursoId: Number(selCurso.value),
    nombre,
    tipo: $('#evalTipo').value,
  });
  $('#evalNombre').value = '';
  $('#formEval').classList.remove('show');
  await loadEvals(id);
  toast('Evaluación creada');
};

/* ---- botones de ayuda ---- */
$('#bPaste').onclick = async () => {
  try {
    const t = await navigator.clipboard.readText();
    ta.value = ta.value ? ta.value + '\n\n' + t : t;
    render(); toast('Texto pegado');
  } catch {
    toast('El navegador bloqueó el pegado. Usa Ctrl+V (en el celular funciona).');
  }
};
$('#bAll').onclick = () => { ta.focus(); ta.select(); };
$('#bClear').onclick = () => {
  if (!ta.value || confirm('¿Borrar todo el texto?')) { ta.value = ''; render(); }
};

const PROMPT_TRANSCRIBIR =
`Transcribe TODAS las preguntas de la(s) imagen(es) a este formato EXACTO, sin añadir nada más (ni intro, ni comentarios, ni bloques de código):

1. Enunciado de la pregunta
a) Alternativa
b) Alternativa
c) Alternativa
d) Alternativa
> Explicación breve (opcional)

Reglas:
- Marca con un * al final de la línea la alternativa correcta. Si hay MÁS DE UNA correcta, marca TODAS con *.
- Si la pregunta muestra o menciona una imagen, agrega una línea [imagen] justo debajo del enunciado.
- Separa cada pregunta con una línea en blanco.
- Respeta el texto tal como aparece. Si no se ve la correcta, no marques ninguna.`;

$('#bPrompt').onclick = async () => {
  try { await navigator.clipboard.writeText(PROMPT_TRANSCRIBIR); toast('Prompt copiado'); }
  catch { toast('No se pudo copiar; selecciónalo a mano.'); }
};

/* ---- vista previa en vivo ---- */
function render() {
  const { questions, errors } = parse(ta.value);
  parsed = questions;
  const preview = $('#preview');
  preview.innerHTML = '';

  errors.forEach(e => {
    const d = document.createElement('div');
    d.className = 'errline';
    d.textContent = '⚠ ' + e;
    preview.appendChild(d);
  });

  const letras = ['a', 'b', 'c', 'd', 'e', 'f'];
  questions.forEach((q, i) => {
    const opts = q.opciones.map((o, j) =>
      `<div class="opt ${q.correctas.includes(j) ? 'correct' : 'bad'}">${letras[j]}) ${esc(o)}</div>`).join('');
    const tags = [];
    if (q.correctas.length > 1) tags.push('<span class="tag">multi-respuesta</span>');
    if (q.imagen) tags.push('<span class="tag img">necesita imagen</span>');
    if (q.explicacion) tags.push('<span class="tag">con explicación</span>');
    const card = document.createElement('div');
    card.className = 'q';
    card.innerHTML = `<div class="qt"><span class="qn">${i + 1}</span><span>${esc(q.enunciado)}</span></div>${opts}` +
                     (tags.length ? `<div class="meta">${tags.join('')}</div>` : '');
    preview.appendChild(card);
  });

  const n = questions.length;
  $('#pill').textContent = n + (n === 1 ? ' pregunta' : ' preguntas');
  $('#pill').className = 'pill ' + (n > 0 ? 'ok' : 'err');
  $('#hint').textContent = errors.length ? `· ${errors.length} aviso(s)` : (n ? '· listas para guardar' : '');
  updateSave();
}

function updateSave() {
  const n = parsed.length, dest = selEval.value;
  const bSave = $('#bSave');
  bSave.disabled = !(n > 0 && dest);
  bSave.textContent = n ? `Guardar ${n} pregunta${n > 1 ? 's' : ''}` : 'Guardar preguntas';
  const line = $('#totalLine');
  if (!dest) line.textContent = 'Elige una evaluación para guardar.';
  else if (!n) line.textContent = 'Pega preguntas para guardar.';
  else line.textContent = '';
}

/* ---- guardar (enlazado a la evaluación elegida) ---- */
$('#bSave').onclick = async () => {
  if (!parsed.length || !selEval.value) return;
  try {
    await DB.addPreguntas(parsed, selEval.value);
    const total = await DB.countPreguntas(selEval.value);
    ta.value = '';
    render();
    await loadEvals(selEval.value);
    toast(`Guardadas. Esta evaluación ya tiene ${total} preguntas.`);
  } catch (e) {
    toast('Error al guardar: ' + e.message);
  }
};

ta.addEventListener('input', render);

/* registrar la pantalla: al entrar, refresca los selectores */
SCREENS.insertar = {
  async enter() {
    await loadCursos(selCurso.value || undefined);
    render();
  }
};