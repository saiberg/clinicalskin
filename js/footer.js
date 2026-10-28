/* ============================================================
   Clinical Skin — Footer compartido
   Pie visual de marca y enlaces funcionales de la tienda.
   ============================================================ */
(() => {
  'use strict';

  const LOGO = 'img/logoNotext-clinicalSkin.png';
  const COPYRIGHT = '© 2026 Clinical Skin — Dermocosmética. Todos los derechos reservados.';
  const WHATSAPP = 'https://wa.me/56992412354';
  const EMAIL = 'contacto@clinicalskin.cl';
  const TELEFONO = '+56 9 9241 2354';

  const COLUMNAS = [
    {
      titulo: 'Explorar',
      links: [
        { href: 'diagnostico.html', etiqueta: 'Test virtual' },
        { href: 'productos.html', etiqueta: 'Productos' },
        { href: 'index.html#marcas', etiqueta: 'Marcas' },
        { href: 'filosofia.html', etiqueta: 'Filosofía' }
      ]
    },
    {
      titulo: 'Información',
      links: [
        { href: 'terminos.html#envios', etiqueta: 'Envíos' },
        { href: 'terminos.html#cambios', etiqueta: 'Cambios y devoluciones' },
        { href: 'terminos.html', etiqueta: 'Términos y condiciones' },
        { href: 'politica-privacidad.html', etiqueta: 'Política de privacidad' },
        { href: 'img/marcas/creditos.html', etiqueta: 'Créditos de marcas' }
      ]
    }
  ];

  const columnasHTML = COLUMNAS.map((columna) => `
    <nav class="cs-footer-column" aria-label="${columna.titulo}">
      <h3>${columna.titulo}</h3>
      <ul>${columna.links.map((link) => `<li><a href="${link.href}">${link.etiqueta}</a></li>`).join('')}</ul>
    </nav>`).join('');

  const completo = `
    <section class="cs-footer-invite">
      <div class="container cs-footer-invite-inner">
        <div>
          <span class="cs-footer-eyebrow">Un primer paso para tu piel</span>
          <h2>Conoce mejor las necesidades de tu piel.</h2>
          <p>Realiza el test virtual y explora una rutina sugerida según tus respuestas.</p>
        </div>
        <a href="diagnostico.html" class="btn cs-footer-cta">Realizar test virtual <span aria-hidden="true">→</span></a>
      </div>
    </section>
    <div class="cs-footer-main">
      <div class="container">
        <div class="cs-footer-grid">
          <div class="cs-footer-brand">
            <a class="cs-footer-wordmark" href="index.html" aria-label="Clinical Skin, inicio">
              <img src="${LOGO}" alt="">
              <span>Clinical Skin<small>Dermocosmética</small></span>
            </a>
            <p class="cs-footer-slogan">La delicadeza de tu piel en un solo clic</p>
            <p class="cs-footer-description">Dermocosmética, test virtual y asesoría personalizada para acompañar tu rutina.</p>
          </div>
          ${columnasHTML}
          <div class="cs-footer-contact">
            <h3>¿Necesitas ayuda?</h3>
            <a href="mailto:${EMAIL}"><span aria-hidden="true">✉</span><span>${EMAIL}</span></a>
            <a href="tel:+56987654321"><span aria-hidden="true">⌕</span><span>${TELEFONO}</span></a>
            <a href="${WHATSAPP}" target="_blank" rel="noopener"><span aria-hidden="true">◉</span><span>Asesoría por WhatsApp</span></a>
          </div>
        </div>
        <div class="cs-footer-bottom">
          <span>${COPYRIGHT}</span>
          <span>Despacho a todo Chile · Pago con Webpay</span>
        </div>
      </div>
    </div>`;

  document.querySelectorAll('[data-site-footer]').forEach((destino) => {
    destino.innerHTML = completo;
  });
})();
