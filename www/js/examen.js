/* ============================================================
   examen.js — Examen personalizado
   Marcas las evaluaciones que quieras (de uno o varios cursos),
   o "todo el curso", y arma un examen mezclando todas sus
   preguntas barajadas. Reusa el motor del quiz.
   ============================================================ */

let seleccionadas = new Set();   // ids de evaluaciones marcadas

/* junta las preguntas de varias evaluaciones en un solo arreglo */
async function preguntasDe(ids) {
  let todas = [];
  for (const id of ids) todas = todas.concat(await DB.getPreguntas(id));
  return todas;
}

/* dibuja la lista de cursos con sus casillas */
async function renderExamen() {
  seleccionadas = new Set();
  const cont = $('#examen-list');
  const data = await cargarArbol();   // viene de cursos.js

  // solo cursos con evaluaciones que tengan al menos 1 pregunta
  const cursos = data
    .map(c => ({ ...c, evals: c.evals.filter(e => e.count > 0) }))
    .filter(c => c.evals.length);

  if (!cursos.length) {
    cont.innerHTML = `<div class="empty">Aún no hay preguntas para armar un examen.<br>Agrégalas desde <b>Insertar</b>.</div>`;
    actualizarConteo();
    return;
  }

  cont.innerHTML = cursos.map(c => `
    <div class="curso-card">
      <div class="curso-head">
        <span class="curso-dot" style="background:${esc(c.color)}"></span>
        <span class="curso-name">${esc(c.nombre)}</span>
        <button class="todo-curso" data-curso="${c.id}">Todo el curso</button>
      </div>
      ${c.evals.map(e => `
        <button class="examen-eval" data-eval="${e.id}" data-count="${e.count}">
          <span class="check"></span>
          <div class="eval-info"><span class="eval-name">${esc(e.nombre)}</span><span class="eval-type">${esc(e.tipo)}</span></div>
          <span class="eval-count mono">${e.count}</span>
        </button>`).join('')}
    </div>`).join('');

  // marcar / desmarcar una evaluación
  $$('.examen-eval', cont).forEach(b => b.onclick = () => {
    const id = Number(b.dataset.eval);
    if (seleccionadas.has(id)) seleccionadas.delete(id);
    else seleccionadas.add(id);
    b.classList.toggle('sel');
    sincronizarTodoCurso();
    actualizarConteo();
  });

  // botón "todo el curso": marca o desmarca todas las de ese curso
  $$('.todo-curso', cont).forEach(btn => btn.onclick = () => {
    const card = btn.closest('.curso-card');
    const filas = $$('.examen-eval', card);
    const todasSel = filas.every(f => f.classList.contains('sel'));
    filas.forEach(f => {
      const id = Number(f.dataset.eval);
      if (todasSel) { seleccionadas.delete(id); f.classList.remove('sel'); }
      else          { seleccionadas.add(id);   f.classList.add('sel'); }
    });
    sincronizarTodoCurso();
    actualizarConteo();
  });

  actualizarConteo();
}

/* marca el botón "todo el curso" como activo si todas sus filas están seleccionadas */
function sincronizarTodoCurso() {
  $$('#examen-list .curso-card').forEach(card => {
    const filas = $$('.examen-eval', card);
    const btn = $('.todo-curso', card);
    if (!btn) return;
    const todas = filas.length && filas.every(f => f.classList.contains('sel'));
    btn.classList.toggle('active', todas);
    btn.textContent = todas ? 'Quitar todo' : 'Todo el curso';
  });
}

/* suma las preguntas seleccionadas y actualiza la barra de abajo */
function actualizarConteo() {
  let total = 0;
  $$('#examen-list .examen-eval.sel').forEach(f => total += Number(f.dataset.count));
  const ev = seleccionadas.size === 1 ? '1 evaluación' : `${seleccionadas.size} evaluaciones`;
  $('#examen-count').textContent = total ? `${total} pregunta${total !== 1 ? 's' : ''} · ${ev}` : '0 preguntas';
  const start = $('#examen-start');
  start.disabled = total === 0;
  start.textContent = total ? `Empezar examen (${total})` : 'Empezar examen';
}

/* arrancar el examen mezclado */
$('#examen-start').onclick = async () => {
  if (!seleccionadas.size) return;
  const ids = [...seleccionadas];
  const recargar = () => preguntasDe(ids);   // para que "Repetir" vuelva a mezclar
  go('quiz', { preguntas: await recargar(), recargar });
};

/* registrar la pantalla */
SCREENS.examen = { enter() { renderExamen(); } };