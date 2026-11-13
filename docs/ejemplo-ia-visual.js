/* ============================================================
   Clinical Skin — Ejemplo de integración futura de IA fotográfica
   ------------------------------------------------------------
   ESTE ARCHIVO NO SE CARGA. Es una referencia para la Fase 7:
   muestra cómo conectar un análisis visual cuando exista un
   proveedor de IA, sin tocar el motor del test.

   Para activarlo en el futuro:
   1. Implementar un endpoint propio (PHP) que reciba la imagen y
      llame al proveedor de IA (con costo y consentimiento).
   2. Copiar el bloque de abajo en un archivo cargado después de
      logica.js.
   3. Añadir la UI de carga de foto (opcional, no bloqueante).
   ============================================================ */
(() => {
  'use strict';

  const D = window.CS_DIAG;
  if (!D || !D.analisisVisual) return;

  /* Endpoint propio que devuelve el JSON del análisis. */
  const ENDPOINT = '/?wc-ajax=cs_analisis_visual';

  D.analisisVisual.registrar(async (file, ctx) => {
    const form = new FormData();
    form.append('foto', file, file.name || 'foto.jpg');
    if (ctx && ctx.perfil) {
      form.append('perfil', JSON.stringify(ctx.perfil));
    }

    const r = await fetch(ENDPOINT, { method: 'POST', body: form, credentials: 'same-origin' });
    if (!r.ok) throw new Error('HTTP ' + r.status);

    const data = await r.json();
    /* Se espera: { ok, fuente, version, indicadores, preocupaciones, confianza, notas } */
    return data;
  });

  /* Ejemplo de uso tras elegir una foto (opcional):
     const perfil = D.calcularPerfil(respuestas);
     const ind = D.calcularIndicadores(perfil);
     const fusion = await D.analisisVisual.analizarYFusionar(file, perfil, ind);
     if (fusion.ok) {
       // usar fusion.perfil y fusion.indicadores en el resultado
     }
  */
})();
