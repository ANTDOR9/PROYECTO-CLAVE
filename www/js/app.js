/* ============================================================
   app.js — Arranque
   Es lo último que se carga. Abre la base de datos y muestra
   el menú. A partir de aquí, cada pantalla ya sabe dibujarse
   sola (se registraron en SCREENS).
   ============================================================ */

(async function boot() {
  try {
    await DB.open();
  } catch (e) {
    toast('No se pudo abrir la base de datos: ' + e.message);
    console.error(e);
    return;
  }

  // mostrar el menú de inicio (dibuja los mosaicos y las estadísticas)
  go('menu');
})();