/* ============================================================
   db.js — Capa de datos de CLAVE
   IndexedDB con 3 cajas enlazadas + parser de preguntas.
   Expone 2 cosas globales para las demás pantallas:
     · DB     -> guardar / leer datos
     · parse  -> texto pegado -> preguntas
   ============================================================ */

const DB = {
  _db: null,

  /* Abre (o crea) la base. Subir el número de versión crea cajas nuevas. */
  open() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open('clave', 2);
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('cursos'))
          db.createObjectStore('cursos', { keyPath: 'id', autoIncrement: true });
        if (!db.objectStoreNames.contains('evaluaciones')) {
          const s = db.createObjectStore('evaluaciones', { keyPath: 'id', autoIncrement: true });
          s.createIndex('cursoId', 'cursoId');           // para buscar evals de un curso
        }
        if (!db.objectStoreNames.contains('preguntas')) {
          const s = db.createObjectStore('preguntas', { keyPath: 'id', autoIncrement: true });
          s.createIndex('evaluacionId', 'evaluacionId'); // para buscar preguntas de una eval
        }
      };
      req.onsuccess = (e) => { this._db = e.target.result; resolve(); };
      req.onerror   = (e) => reject(e.target.error);
    });
  },

  /* ---------- helpers internos (no se usan desde fuera) ---------- */
  _add(store, obj) {
    return new Promise((res, rej) => {
      const r = this._db.transaction(store, 'readwrite').objectStore(store).add(obj);
      r.onsuccess = () => res(r.result);
      r.onerror   = (e) => rej(e.target.error);
    });
  },
  _put(store, obj) {
    return new Promise((res, rej) => {
      const r = this._db.transaction(store, 'readwrite').objectStore(store).put(obj);
      r.onsuccess = () => res(r.result);
      r.onerror   = (e) => rej(e.target.error);
    });
  },
  _delete(store, key) {
    return new Promise((res, rej) => {
      const r = this._db.transaction(store, 'readwrite').objectStore(store).delete(key);
      r.onsuccess = () => res();
      r.onerror   = (e) => rej(e.target.error);
    });
  },
  _all(store) {
    return new Promise((res, rej) => {
      const r = this._db.transaction(store).objectStore(store).getAll();
      r.onsuccess = () => res(r.result);
      r.onerror   = (e) => rej(e.target.error);
    });
  },
  _byIndex(store, index, val) {
    return new Promise((res, rej) => {
      const r = this._db.transaction(store).objectStore(store).index(index).getAll(val);
      r.onsuccess = () => res(r.result);
      r.onerror   = (e) => rej(e.target.error);
    });
  },
  _countIndex(store, index, val) {
    return new Promise((res, rej) => {
      const r = this._db.transaction(store).objectStore(store).index(index).count(val);
      r.onsuccess = () => res(r.result);
      r.onerror   = (e) => rej(e.target.error);
    });
  },

  /* ---------- CURSOS ---------- */
  addCurso(curso)  { return this._add('cursos', curso); },   // {nombre, color} -> devuelve id
  listCursos()     { return this._all('cursos'); },
  async deleteCurso(id) {                                     // borra el curso y todo lo suyo
    id = Number(id);
    const evs = await this.listEvaluaciones(id);
    for (const ev of evs) await this.deleteEvaluacion(ev.id);
    return this._delete('cursos', id);
  },

  /* ---------- EVALUACIONES ---------- */
  addEvaluacion(ev)         { return this._add('evaluaciones', ev); },  // {cursoId, nombre, tipo} -> id
  listEvaluaciones(cursoId) { return this._byIndex('evaluaciones', 'cursoId', Number(cursoId)); },
  async deleteEvaluacion(id) {                               // borra la eval y sus preguntas
    id = Number(id);
    const qs = await this.getPreguntas(id);
    for (const q of qs) await this._delete('preguntas', q.id);
    return this._delete('evaluaciones', id);
  },

  /* ---------- PREGUNTAS ---------- */
  addPreguntas(items, evaluacionId) {
    evaluacionId = Number(evaluacionId);
    return new Promise((res, rej) => {
      const tx = this._db.transaction('preguntas', 'readwrite');
      const store = tx.objectStore('preguntas');
      items.forEach(q => store.add({
        ...q,
        evaluacionId,
        stats: { vista: 0, fallada: 0, ultima: null }   // para el repaso inteligente a futuro
      }));
      tx.oncomplete = res;
      tx.onerror    = (e) => rej(e.target.error);
    });
  },
  getPreguntas(evaluacionId)   { return this._byIndex('preguntas', 'evaluacionId', Number(evaluacionId)); },
  countPreguntas(evaluacionId) { return this._countIndex('preguntas', 'evaluacionId', Number(evaluacionId)); },
  deletePregunta(id)           { return this._delete('preguntas', Number(id)); },
  updatePregunta(q)            { return this._put('preguntas', q); },

  /* ---------- RESPALDO (lo usaremos en la pantalla de backup) ---------- */
  async exportAll() {
    return {
      version: 1,
      exportado: new Date().toISOString(),
      cursos:       await this._all('cursos'),
      evaluaciones: await this._all('evaluaciones'),
      preguntas:    await this._all('preguntas'),
    };
  },
};


/* ============================================================
   parse(texto) -> { questions, errors }
   Formato esperado:
     1. Enunciado de la pregunta
     [imagen]                 (opcional, marca que lleva foto)
     a) Alternativa
     b) Correcta *            (* al final = correcta; varias * = multi-respuesta)
     > Explicación            (opcional)
   Cada pregunta se separa con una línea en blanco.
   ============================================================ */
function parse(text) {
  const errors = [];
  const questions = [];
  const blocks = text.trim().split(/\n\s*\n/).filter(b => b.trim());

  blocks.forEach((block, bi) => {
    const lines = block.split('\n').map(l => l.trim()).filter(Boolean);
    let enunciado = [], opciones = [], correctas = [], explicacion = '', imagen = false;

    lines.forEach(line => {
      const opt = line.match(/^([a-zA-Z])[\)\.]\s+(.*)$/);   // "a) texto"
      if (opt) {
        let txt = opt[2];
        const esCorrecta = /\*\s*$/.test(txt);               // termina en *
        txt = txt.replace(/\s*\*\s*$/, '').trim();
        if (esCorrecta) correctas.push(opciones.length);
        opciones.push(txt);
      } else if (/^>\s?/.test(line)) {
        explicacion = line.replace(/^>\s?/, '').trim();
      } else if (/^\[imagen\]$/i.test(line)) {
        imagen = true;
      } else {
        enunciado.push(line.replace(/^\d+[\.\)]\s*/, ''));   // quita el "1. " del inicio
      }
    });

    const enun = enunciado.join(' ').trim();
    const n = bi + 1;
    if (!enun) {
      errors.push(`Pregunta ${n}: falta el enunciado.`); return;
    }
    if (opciones.length < 2) {
      errors.push(`Pregunta ${n} ("${enun.slice(0, 30)}…"): necesita al menos 2 alternativas.`); return;
    }
    if (correctas.length === 0) {
      errors.push(`Pregunta ${n} ("${enun.slice(0, 30)}…"): ninguna alternativa marcada con *.`);
    }

    questions.push({ enunciado: enun, opciones, correctas, explicacion, imagen });
  });

  return { questions, errors };
}