/* ============================================================
   Clinical Skin — Header compartido
   ------------------------------------------------------------
   El header vive SOLO en este archivo. Para usarlo en una página:
     <header class="site-header" data-site-header></header>
     <script src="js/header.js"></script>
   (colocarlo al inicio del <body>, antes de js/main.js)
   ============================================================ */
(() => {
  'use strict';

  /* ---------- EDITABLE: logo, menú y botón ---------- */
  const LOGO = 'img/logoNotext-clinicalSkin.png';
  const ENLACES = [
    { href: 'index.html',       etiqueta: 'Inicio' },
    { href: 'diagnostico.html', etiqueta: 'Diagnóstico' },
    { href: 'productos.html',   etiqueta: 'Productos' },
    { href: 'filosofia.html',   etiqueta: 'Filosofía' },
    { href: 'contacto.html',    etiqueta: 'Contacto' }
  ];
  const CTA = { href: 'diagnostico.html', etiqueta: 'Hacer mi diagnóstico' };
  /* Páginas que heredan el resaltado de otra (subpáginas) */
  const ACTIVO_HEREDADO = {
    'producto.html': 'productos.html',
    'resultado.html': 'diagnostico.html'
  };

  /* ---------- No editar bajo esta línea ---------- */
  const actual = location.pathname.split('/').pop() || 'index.html';
  const activo = ACTIVO_HEREDADO[actual] || actual;

  const enlaces = ENLACES.map((e) =>
    `<a href="${e.href}"${e.href === activo ? ' class="active"' : ''}>${e.etiqueta}</a>`
  ).join('\n      ');

  const html = `
  <div class="container nav">
    <a href="index.html" class="logo">
      <span class="logo-mark"><img src="${LOGO}" alt=""></span>
      <span>Clinical Skin<small>Dermocosmética</small></span>
    </a>
    <nav class="nav-links">
      ${enlaces}
    </nav>
    <div class="nav-actions">
      <a href="carrito.html" class="nav-cart" aria-label="Ver carrito">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M6 7h12l1 13H5L6 7z"/><path d="M9 7a3 3 0 0 1 6 0"/></svg>
      </a>
      <a href="${CTA.href}" class="btn btn-primary btn-sm">${CTA.etiqueta}</a>
      <button class="nav-toggle" aria-label="Abrir menú">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 6h18M3 12h18M3 18h18"/></svg>
      </button>
    </div>
  </div>`;

  const destino = document.querySelector('[data-site-header]');
  if (destino) destino.innerHTML = html;
})();
