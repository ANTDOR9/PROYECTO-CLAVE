/* ============================================================
   ui.js — Ayudantes y navegación
   Lo usan todas las pantallas. Expone de forma global:
     $  $$  esc   -> atajos para el DOM
     toast(msg)   -> aviso flotante
     go(id, dato) -> ir a una pantalla
     back()       -> volver
     SCREENS      -> cada pantalla registra aquí su "enter"
   ============================================================ */

/* ---- atajos del DOM ---- */
const $  = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

/* escapa texto para meterlo seguro en innerHTML */
const esc = (s) => String(s).replace(/[&<>"]/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' }[c]));

/* ---- aviso flotante (toast) ---- */
let _toastTimer;
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => t.classList.remove('show'), 2200);
}

/* ============================================================
   NAVEGACIÓN
   Cada pantalla puede registrar:  SCREENS.cursos = { enter(dato){...} }
   y "enter" se llama cada vez que se entra a esa pantalla.
   ============================================================ */
const SCREENS = {};
const TITLES = {
  insertar: 'Insertar',
  cursos:   'Mis cursos',
  estudiar: 'Estudiar',
  quiz:     '',
  result:   '',
};
const navStack = ['menu'];

/* muestra una pantalla y oculta las demás */
function show(id) {
  $$('.screen').forEach(s => s.classList.toggle('active', s.id === 'screen-' + id));
  const isMenu = id === 'menu';
  $('#topbar').style.display = isMenu ? 'none' : 'flex';
  $('#title').textContent = TITLES[id] || '';
  window.scrollTo(0, 0);
}

/* ir a una pantalla (dato = info opcional, ej. el id de una evaluación) */
function go(id, dato) {
  if (navStack[navStack.length - 1] !== id) navStack.push(id);
  show(id);
  if (SCREENS[id] && SCREENS[id].enter) SCREENS[id].enter(dato);
}

/* volver a la pantalla anterior */
function back() {
  if (navStack.length > 1) navStack.pop();
  const id = navStack[navStack.length - 1];
  show(id);
  if (SCREENS[id] && SCREENS[id].enter) SCREENS[id].enter();
}

/* el botón ← de la barra superior */
$('#backBtn').onclick = back;