/* ============================================================
   cursos.js — Dos pantallas con el mismo código:
     · modo 'manage' -> "Mis cursos": ver y borrar
     · modo 'study'  -> "Estudiar": elegir una evaluación y jugar
   ============================================================ */

/* trae cursos con sus evaluaciones y el conteo de cada una */
async function cargarArbol() {
  const cursos = await DB.listCursos();
  const data = [];
  for (const c of cursos) {
    const evs = await DB.listEvaluaciones(c.id);
    const evals = [];
    for (const e of evs) evals.push({ ...e, count: await DB.countPreguntas(e.id) });
    data.push({ ...c, evals });
  }
  return data;
}

async function renderCursos(mode) {
  const cont = mode === 'study' ? $('#estudiar-list') : $('#cursos-list');
  const data = await cargarArbol();
  const total = data.reduce((s, c) => s + c.evals.reduce((a, e) => a + e.count, 0), 0);

  /* estados vacíos */
  if (mode === 'manage' && data.length === 0) {
    cont.innerHTML = `<div class="empty">Aún no tienes cursos.<br>
      Toca <b>Insertar</b> para crear el primero y pegar preguntas.
      <br><br><button class="save" data-add style="max-width:220px;margin:14px auto 0">Ir a Insertar</button></div>`;
    wire(cont, mode);
    return;
  }
  if (mode === 'study' && total === 0) {
    cont.innerHTML = `<div class="empty">Aún no hay preguntas para estudiar.<br>
      Agrégalas desde <b>Insertar</b>.
      <br><br><button class="save" data-add style="max-width:220px;margin:14px auto 0">Ir a Insertar</button></div>`;
    wire(cont, mode);
    return;
  }

  /* listado */
  cont.innerHTML = data
    .filter(c => mode === 'manage' || c.evals.length)   // en estudiar, oculta cursos sin evaluaciones
    .map(c => `
      <div class="curso-card">
        <div class="curso-head">
          <span class="curso-dot" style="background:${esc(c.color)}"></span>
          <span class="curso-name">${esc(c.nombre)}</span>
          ${mode === 'manage' ? `<button class="icon-btn danger" data-del-curso="${c.id}" title="Borrar curso">×</button>` : ''}
        </div>
        ${c.evals.length ? c.evals.map(e => fila(e, mode)).join('')
          : `<p class="muted" style="font-size:12.5px;margin:2px 0 0">Sin evaluaciones todavía.</p>`}
        ${mode === 'manage' ? `<button class="add-eval-link" data-add>+ Agregar preguntas</button>` : ''}
      </div>`).join('');

  wire(cont, mode);
}

/* una fila de evaluación, distinta según el modo */
function fila(e, mode) {
  if (mode === 'study') {
    return `<button class="eval-row eval-play" data-play="${e.id}" ${e.count ? '' : 'disabled'}>
        <div class="eval-info"><span class="eval-name">${esc(e.nombre)}</span><span class="eval-type">${esc(e.tipo)}</span></div>
        <span class="eval-count mono">${e.count}</span>
      </button>`;
  }
  return `<div class="eval-row">
      <div class="eval-info"><span class="eval-name">${esc(e.nombre)}</span><span class="eval-type">${esc(e.tipo)}</span></div>
      <span class="eval-count mono">${e.count}</span>
      <button class="icon-btn danger" data-del-eval="${e.id}" title="Borrar evaluación">×</button>
    </div>`;
}

/* conecta los botones después de dibujar */
function wire(cont, mode) {
  $$('[data-add]', cont).forEach(b => b.onclick = () => go('insertar'));

  $$('[data-del-curso]', cont).forEach(b => b.onclick = async () => {
    if (!confirm('¿Borrar este curso con todas sus evaluaciones y preguntas?')) return;
    await DB.deleteCurso(b.dataset.delCurso);
    toast('Curso borrado');
    renderCursos(mode);
  });

  $$('[data-del-eval]', cont).forEach(b => b.onclick = async () => {
    if (!confirm('¿Borrar esta evaluación y sus preguntas?')) return;
    await DB.deleteEvaluacion(b.dataset.delEval);
    toast('Evaluación borrada');
    renderCursos(mode);
  });

  $$('[data-play]', cont).forEach(b => b.onclick = () => go('quiz', Number(b.dataset.play)));
}

/* registrar las dos pantallas */
SCREENS.cursos   = { enter() { renderCursos('manage'); } };
SCREENS.estudiar = { enter() { renderCursos('study'); } };