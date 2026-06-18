/* ============================================================
   respaldo.js — Exportar e importar copias
   Exportar: descarga un .json con todo (funciona en navegador).
   Importar: lee un .json y REEMPLAZA todo el contenido actual.
   ============================================================ */

async function exportarRespaldo() {
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

async function importarRespaldo(file) {
  try {
    const texto = await file.text();
    const data = JSON.parse(texto);

    // validación básica: que tenga la forma de un respaldo de CLAVE
    if (!data || !Array.isArray(data.cursos) || !Array.isArray(data.evaluaciones) || !Array.isArray(data.preguntas)) {
      return toast('Ese archivo no parece un respaldo de CLAVE');
    }

    const resumen = `${data.cursos.length} curso(s) y ${data.preguntas.length} pregunta(s)`;
    if (!confirm(`Esto REEMPLAZA todo tu contenido actual por el del archivo (${resumen}). ¿Continuar?`)) return;

    await DB.importAll(data);
    toast('Respaldo restaurado');
    go('menu');
  } catch (e) {
    toast('No se pudo leer el archivo: ' + e.message);
  }
}

$('#resp-export').onclick = exportarRespaldo;
$('#resp-import-file').onchange = (e) => {
  const file = e.target.files[0];
  if (file) importarRespaldo(file);
  e.target.value = '';   // permite volver a elegir el mismo archivo
};

SCREENS.respaldo = { enter() {} };