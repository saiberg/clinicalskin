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
  /* En el sitio estático cada página es un archivo (…/productos.html). Al servir
     con WooCommerce las rutas son limpias (/shop/, /product/…, /cart/), así que
     el primer segmento se traduce al archivo del menú; el resto de páginas
     (filosofia.html, contacto.html…) sigue resolviendo por el último segmento. */
  const MAPA_RUTAS = {
    shop: 'productos.html',
    product: 'productos.html',
    cart: 'carrito.html',
    checkout: 'pago.html',
    'my-account': 'mi-cuenta.html'
  };
  const partes = location.pathname.split('/').filter(Boolean);
  const ultimo = partes[partes.length - 1] || '';
  /* La raíz («/» o «/clinicalskin/») es el inicio; el resto se resuelve por el
     último segmento (filosofia.html) salvo que sea una ruta limpia de Woo. */
  let actual = MAPA_RUTAS[partes[0]];
  if (!actual) {
    actual = ultimo.indexOf('.') > -1 ? ultimo : (partes.length <= 1 ? 'index.html' : ultimo);
  }
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
      <div class="search-wrap">
        <button type="button" class="nav-cart search-toggle" aria-label="Buscar productos" aria-expanded="false" aria-controls="search-panel">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
        </button>
        <div class="search-panel" id="search-panel" hidden>
          <div class="search-field">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
            <input type="search" class="search-input" placeholder="Buscar producto, tipo de piel…" autocomplete="off" aria-label="Buscar productos">
          </div>
          <div class="search-hint">Escribe un nombre o tipo de piel (ej.: grasa, sensible…).</div>
          <ul class="search-list"></ul>
          <a class="search-all" href="productos.html">Ver todos los productos →</a>
        </div>
      </div>
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

  /* ---------- Buscador maquetado (al migrar a Woo: reemplazar por FiboSearch) ----------
     Sugiere productos del CATALOGO (window.CS_DIAG) con foto, categoría y precio.
     Busca por nombre, paso, tipo de piel, preocupación e ingredientes (sin acentos). */
  const wrap = destino && destino.querySelector('.search-wrap');
  const btnS = destino && destino.querySelector('.search-toggle');
  const panel = destino && destino.querySelector('.search-panel');
  const input = destino && destino.querySelector('.search-input');
  const hint = destino && destino.querySelector('.search-hint');
  const lista = destino && destino.querySelector('.search-list');

  if (wrap && btnS && panel && input && lista) {
    const PASOS = {
      limpieza: 'Limpieza', tratamiento: 'Tratamiento', exfoliacion: 'Exfoliación',
      hidratacion: 'Hidratación', proteccion: 'Protección'
    };
    const norm = (s) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const pesos = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.');

    const cerrar = () => {
      panel.hidden = true;
      btnS.setAttribute('aria-expanded', 'false');
    };

    const pintar = () => {
      const q = norm(input.value.trim());
      lista.innerHTML = '';
      if (hint) hint.hidden = q.length > 0;
      if (q.length < 1) return;
      const cat = (window.CS_DIAG && window.CS_DIAG.CATALOGO) || [];
      const hitos = cat.filter((p) =>
        [p.nombre, p.paso, (p.tipos || []).join(' '), (p.preocupaciones || []).join(' '), (p.activos || []).join(' ')]
          .some((c) => norm(String(c)).includes(q))
      ).slice(0, 7);
      if (!hitos.length) {
        const li = document.createElement('li');
        li.className = 'search-empty';
        li.textContent = 'Sin productos para “' + input.value.trim() + '”';
        lista.appendChild(li);
        return;
      }
      lista.innerHTML = hitos.map((p) =>
        `<li><a href="producto.html?id=${encodeURIComponent(p.id)}"><img src="${p.img}" alt="" loading="lazy"><span><span class="search-item-name">${p.nombre}</span><span class="search-item-cat">${PASOS[p.paso] || ''}</span></span><strong class="search-item-price">$${pesos(p.precio)}</strong></a></li>`
      ).join('');
    };

    btnS.addEventListener('click', () => {
      const abriendo = panel.hidden;
      panel.hidden = !abriendo;
      btnS.setAttribute('aria-expanded', String(abriendo));
      if (abriendo) { input.focus(); pintar(); }
    });
    input.addEventListener('input', pintar);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const primero = lista.querySelector('a');
        if (primero) { e.preventDefault(); location.href = primero.href; }
      }
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !panel.hidden) { cerrar(); btnS.focus(); }
    });
    document.addEventListener('click', (e) => {
      if (!panel.hidden && !wrap.contains(e.target)) cerrar();
    });
  }
})();
