/* ============================================================
   menu.js — Pantalla de inicio (los mosaicos)
   Arma los mosaicos desde una lista y conecta cada uno con su
   destino. El grande ("Estudiar") voltea mostrando tu banco.
   ============================================================ */

/* íconos (trazos SVG simples) */
const ICONS = {
  play:   '<path d="M8 5v14l11-7z"/>',
  target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1"/>',
  plus:  '<path d="M12 5v14M5 12h14"/>',
  stack: '<path d="M12 3l9 5-9 5-9-5 9-5zM3 13l9 5 9-5M3 17l9 5 9-5"/>',
  spark: '<path d="M12 3l1.8 4.8L19 9l-4.8 1.8L12 16l-2.2-5.2L4 9l5.2-1.2z"/>',
  chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  save:  '<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2zM7 3v6h8M7 21v-7h10v7"/>',
  gear:  '<path d="M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM19 12a7 7 0 0 0-.1-1l2-1.6-2-3.4-2.4 1a7 7 0 0 0-1.7-1L14.5 2h-4l-.3 2.6a7 7 0 0 0-1.7 1l-2.4-1-2 3.4L4.1 11a7 7 0 0 0 0 2l-2 1.6 2 3.4 2.4-1a7 7 0 0 0 1.7 1l.3 2.6h4l.3-2.6a7 7 0 0 0 1.7-1l2.4 1 2-3.4-2-1.6a7 7 0 0 0 .1-1z"/>',
};
const svg = (p) => `<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${p}</svg>`;

/* ── La lista de mosaicos. Agregar un botón = una entrada más aquí. ── */
const TILES = [
  { id: 'insertar',  lbl: 'Insertar',     sub: 'Pegar preguntas',     icon: ICONS.plus,   color: 'teal',   action: () => go('insertar') },
  { id: 'cursos',    lbl: 'Mis cursos',   sub: 'Crear y editar',      icon: ICONS.stack,  color: 'violet', action: () => go('cursos') },
  { id: 'examen',    lbl: 'Examen',       sub: 'Mezcla evaluaciones', icon: ICONS.target, color: 'amber',  action: () => go('examen') },
  { id: 'respaldo',  lbl: 'Respaldo',     sub: 'Exportar copia',      icon: ICONS.save,   color: 'green',  action: exportarBackup },
  { id: 'progreso',  lbl: 'Progreso',     sub: 'Tus estadísticas',    icon: ICONS.chart,  soon: true },
  { id: 'simulacro', lbl: 'Simulacro IA', sub: 'Examen difícil',      icon: ICONS.spark,  soon: true },
];

/* cuenta cursos y preguntas para mostrar en el menú */
async function statsMenu() {
  const cursos = await DB.listCursos();
  let preguntas = 0;
  for (const c of cursos) {
    const evs = await DB.listEvaluaciones(c.id);
    for (const e of evs) preguntas += await DB.countPreguntas(e.id);
  }
  return { cursos: cursos.length, preguntas };
}

/* descarga un respaldo JSON de todo */
async function exportarBackup() {
  const data = await DB.exportAll();
  if (data.preguntas.length === 0) return toast('Aún no hay nada que respaldar');
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `clave-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
  toast('Respaldo descargado');
}

/* dibuja el menú */
function renderMenu(stats) {
  const s = stats.cursos !== 1 ? 's' : '';
  const p = stats.preguntas !== 1 ? 's' : '';
  $('#menuStats').textContent = stats.preguntas
    ? `${stats.cursos} curso${s} · ${stats.preguntas} pregunta${p}`
    : 'Tu repaso para SENATI';

  const grid = $('#grid');
  grid.innerHTML = `
    <div class="tile big" data-tile="estudiar">
      <div class="flip" id="flip">
        <div class="face front">
          <div class="top">${svg(ICONS.play)}<span class="streak">${stats.cursos} curso${s}</span></div>
          <div><div class="lbl">Estudiar</div><div class="sub">Elige curso y empieza</div></div>
        </div>
        <div class="face back">
          <div class="small">Tu banco de preguntas</div>
          <div><div class="course">${stats.preguntas}</div><div class="pend">pregunta${p} guardada${p}</div></div>
        </div>
      </div>
    </div>
    ${TILES.map(t => t.soon
      ? `<button class="tile soon" data-tile="${t.id}"><span class="badge">Pronto</span><div class="top">${svg(t.icon)}</div><div><div class="lbl">${t.lbl}</div><div class="sub">${t.sub}</div></div></button>`
      : `<button class="tile ${t.color} shine" data-tile="${t.id}"><div class="top">${svg(t.icon)}</div><div><div class="lbl">${t.lbl}</div><div class="sub">${t.sub}</div></div></button>`
    ).join('')}
  `;

  /* conectar cada mosaico */
  $('[data-tile="estudiar"]', grid).onclick = () => go('estudiar');
  TILES.forEach(t => {
    const el = $(`[data-tile="${t.id}"]`, grid);
    if (!el) return;
    el.onclick = t.soon ? () => toast(`${t.lbl} — llega pronto`) : t.action;
  });

  iniciarVolteo();
}

/* volteo automático del mosaico grande (estilo Live Tile) */
let _flipTimer;
function iniciarVolteo() {
  clearInterval(_flipTimer);
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const flip = $('#flip');
  if (!flip) return;
  _flipTimer = setInterval(() => flip.classList.toggle('flipped'), 4200);
}

/* registrar la pantalla: se redibuja cada vez que se entra al menú */
SCREENS.menu = {
  async enter() {
    renderMenu(await statsMenu());
  }
};