/* ============================================================
   Clinical Skin — Footer compartido
   ------------------------------------------------------------
   Uso en cada página (junto a los otros <script> al final):
     <footer class="site-footer" data-site-footer></footer>            → completo (4 columnas)
     <footer class="site-footer" data-site-footer="simple"></footer>   → barra de copyright
     <script src="js/footer.js"></script>
   ============================================================ */
(() => {
  'use strict';

  /* ---------- EDITABLE: contenido del footer ---------- */
  const LOGO = 'img/logo-clinicalSkin.jpeg';
  const SLOGAN = 'La delicadeza de tu piel en un solo clic';
  const DESCRIPCION = 'Dermocosmética con diagnóstico personalizado y despacho a todo Chile.';
  const COPYRIGHT = '© 2026 Clinical Skin — Dermocosmética. Todos los derechos reservados.';
  const NOTA = 'Diseño conceptual — tienda en preparación';

  const COLUMNAS = [
    {
      titulo: 'Explorar',
      links: [
        { href: 'diagnostico.html', etiqueta: 'Diagnóstico' },
        { href: 'productos.html',   etiqueta: 'Productos' },
        { href: 'filosofia.html',   etiqueta: 'Filosofía' }
      ]
    },
    {
      titulo: 'Ayuda',
      links: [
        { href: 'contacto.html', etiqueta: 'Contacto' },
        { href: '#',             etiqueta: 'Envíos' },
        { href: '#',             etiqueta: 'Preguntas frecuentes' }
      ]
    }
  ];

  const NEWSLETTER = { titulo: 'Recibe consejos de piel', texto: 'Tips y novedades, sin spam.' };

  /* Redes sociales: cambia el href cuando existan las cuentas */
  const REDES = [
    { href: '#', svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/></svg>' },
    { href: '#', svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M15 8h2V5h-2a4 4 0 0 0-4 4v2H9v3h2v6h3v-6h2l1-3h-3V9a1 1 0 0 1 1-1z"/></svg>' },
    { href: '#', svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M16 8a4 4 0 0 1-4-4v11a3 3 0 1 1-2-2.8"/></svg>' }
  ];

  /* ---------- No editar bajo esta línea ---------- */
  const bottom = `
    <div class="footer-bottom">
      <span>${COPYRIGHT}</span>
      <span>${NOTA}</span>
    </div>`;

  const redesHTML = REDES.map((r) => `<a href="${r.href}">${r.svg}</a>`).join('\n          ');

  const columnasHTML = COLUMNAS.map((c) => `
      <div>
        <h4>${c.titulo}</h4>
        <ul>
          ${c.links.map((l) => `<li><a href="${l.href}">${l.etiqueta}</a></li>`).join('\n          ')}
        </ul>
      </div>`).join('');

  const completo = `
  <div class="container">
    <div class="footer-grid">
      <div class="footer-brand">
        <div class="footer-logo-card"><img src="${LOGO}" alt="Clinical Skin"></div>
        <p class="footer-slogan script">${SLOGAN}</p>
        <p>${DESCRIPCION}</p>
        <div class="social-row">
          ${redesHTML}
        </div>
      </div>${columnasHTML}
      <div>
        <h4>${NEWSLETTER.titulo}</h4>
        <p style="font-size:0.85rem;color:rgba(255,255,255,0.65);margin-bottom:14px;">${NEWSLETTER.texto}</p>
        <div class="newsletter-form">
          <input type="email" placeholder="tu@correo.com">
          <button>Enviar</button>
        </div>
      </div>
    </div>${bottom}
  </div>`;

  const simple = `
  <div class="container">
    <div class="footer-bottom" style="border-top:1px solid rgba(255,255,255,0.12); padding-top:24px;">
      <span>${COPYRIGHT}</span>
      <span>${NOTA}</span>
    </div>
  </div>`;

  const destino = document.querySelector('[data-site-footer]');
  if (destino) destino.innerHTML = destino.getAttribute('data-site-footer') === 'simple' ? simple : completo;
})();
