/* ============================================================
   Clinical Skin — Flujo de compra (carrito · producto · checkout)
   ------------------------------------------------------------
   Carrito en localStorage.cs_cart = [{ id, qty }]
   Sin clave (nunca compró) → se muestra la maqueta estática.
   Requiere js/logica.js (catálogo CS_DIAG.CATALOGO).
   ============================================================ */
(() => {
  'use strict';

  const KEY = 'cs_cart';
  const KEY_ENVIO = 'cs_envio';
  const fmt = (n) => '$' + Math.round(n).toLocaleString('es-CL');
  const cat = () => (window.CS_DIAG ? CS_DIAG.CATALOGO : []);
  const porId = (id) => cat().find((p) => p.id === id);
  const porNombre = (nombre) => cat().find((p) => p.nombre === nombre);
  const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '');

  const etiquetaPaso = (p) => (window.CS_DIAG ? CS_DIAG.CONFIG.etiquetas.paso[p.paso] || '' : p.paso);
  const tiposTexto = (p) => {
    const E = window.CS_DIAG ? CS_DIAG.CONFIG.etiquetas : null;
    if (!E) return 'Todo tipo';
    return cap(p.tipos.map((t) => (t === 'todo' ? 'todo tipo' : E.tiposLargo[t])).join(' y '));
  };

  /* ---------- Persistencia ---------- */
  const leer = () => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw === null) return null;
      const arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr.filter((i) => porId(i.id)) : null;
    } catch (e) { return null; }
  };
  const guardar = (items) => {
    try { localStorage.setItem(KEY, JSON.stringify(items)); } catch (e) { /* modo privado */ }
    return items;
  };
  const agregar = (ids, qty) => {
    const items = leer() || [];
    ids.forEach((id) => {
      const existente = items.find((i) => i.id === id);
      if (existente) existente.qty += qty;
      else items.push({ id, qty });
    });
    return guardar(items);
  };
  const resumen = () => {
    const items = leer() || [];
    let subtotal = 0;
    let count = 0;
    items.forEach((i) => {
      const p = porId(i.id);
      if (p) { subtotal += p.precio * i.qty; count += i.qty; }
    });
    const descuento = items.length >= 2 ? subtotal * 0.1 : 0;
    let envio = parseInt(localStorage.getItem(KEY_ENVIO), 10);
    if (isNaN(envio)) envio = 3990;
    return { items, subtotal, descuento, count, envio, total: subtotal - descuento + envio };
  };

  window.CS_COMPRA = { leer, guardar, agregar, resumen, fmt, porId, porNombre };

  /* ---------- Enlaces "Ver" de tarjetas → producto?id= ---------- */
  document.querySelectorAll('.product-card').forEach((card) => {
    const nombre = card.querySelector('h4')?.textContent.trim();
    const enlace = card.querySelector('.product-footer a');
    const prod = nombre && porNombre(nombre);
    if (enlace && prod) enlace.href = 'producto.html?id=' + prod.id;
  });

  /* ---------- carrito.html: render desde storage ---------- */
  const panel = document.querySelector('.cart-panel');
  const guardado = leer();
  if (panel && guardado !== null) {
    panel.innerHTML = guardado.map((item) => {
      const p = porId(item.id);
      if (!p) return '';
      return `
          <div class="cart-item" data-price="${p.precio}" data-id="${p.id}">
            <div class="cart-thumb">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M9 3h6M10 3v4l-3.5 5A4 4 0 0 0 10 19h4a4 4 0 0 0 3.5-7L14 7V3"/></svg>
            </div>
            <div class="cart-item-info">
              <div class="product-tags">
                <span class="badge badge-primary">De tu rutina</span>
                <span class="badge badge-accent">${etiquetaPaso(p)} · ${p.frecuencia}</span>
              </div>
              <h4><a href="producto.html?id=${p.id}">${p.nombre}</a></h4>
              <span class="meta">${etiquetaPaso(p)} · ${tiposTexto(p)}</span>
              <div class="qty-selector">
                <button type="button">−</button><span>${item.qty}</span><button type="button">+</button>
              </div>
            </div>
            <div class="cart-item-side">
              <span class="line-price">${fmt(p.precio * item.qty)}</span>
              <button type="button" class="remove-item">Eliminar</button>
            </div>
          </div>`;
    }).join('');

    /* Persistir cambios (main.js recalcula y repinta la maqueta) */
    panel.querySelectorAll('.remove-item').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.closest('.cart-item')?.dataset.id;
        guardar((leer() || []).filter((i) => i.id !== id));
      });
    });
    panel.querySelectorAll('.qty-selector').forEach((sel) => {
      sel.addEventListener('qtychange', () => {
        guardar(Array.from(panel.querySelectorAll('.cart-item')).map((it) => ({
          id: it.dataset.id,
          qty: parseInt(it.querySelector('.qty-selector span')?.textContent, 10) || 1
        })));
      });
    });
  }

  /* ---------- checkout.html: resumen del pedido ---------- */
  const orderBox = document.querySelector('.checkout-layout .order-box');
  const r = resumen();
  if (orderBox && r.count > 0) {
    const itemsHTML = r.items.map((i) => {
      const p = porId(i.id);
      if (!p) return '';
      return `
        <div class="os-item">
          <div class="os-thumb"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M9 3h6M10 3v4l-3.5 5A4 4 0 0 0 10 19h4a4 4 0 0 0 3.5-7L14 7V3"/></svg></div>
          <div class="os-copy"><strong>${p.nombre}</strong><span>Cant. ${i.qty}</span></div>
          <span class="os-price">${fmt(p.precio * i.qty)}</span>
        </div>`;
    }).join('');
    orderBox.querySelectorAll('.os-item').forEach((n) => n.remove());
    const primeraFila = orderBox.querySelector('.summary-row');
    if (primeraFila) primeraFila.insertAdjacentHTML('beforebegin', itemsHTML);

    const sub = orderBox.querySelector('[data-checkout="subtotal"]');
    const desc = orderBox.querySelector('[data-checkout="descuento"]');
    const descRow = orderBox.querySelector('[data-checkout-row="descuento"]');
    if (sub) sub.textContent = fmt(r.subtotal);
    if (desc) desc.textContent = '-' + fmt(r.descuento);
    if (descRow) descRow.style.display = r.descuento > 0 ? '' : 'none';
  }
  /* Persistir envío elegido (lo usa la confirmación) */
  document.querySelectorAll('input[name="envio"]').forEach((input) => {
    input.addEventListener('change', () => {
      try { localStorage.setItem(KEY_ENVIO, input.dataset.cost || '0'); } catch (e) { /* noop */ }
    });
  });

  /* ---------- producto.html: render por ?id ---------- */
  const info = document.querySelector('.product-info');
  if (info) {
    const params = new URLSearchParams(location.search);
    const idParam = params.get('id');
    const h1 = info.querySelector('h1');
    const prod = (idParam && porId(idParam)) || porNombre(h1?.textContent.trim());

    if (prod) {
      const E = window.CS_DIAG ? CS_DIAG.CONFIG.etiquetas : null;
      const actual = h1?.textContent.trim();

      if (prod.nombre !== actual) {
        document.title = `${prod.nombre} — Clinical Skin`;
        if (h1) h1.textContent = prod.nombre;

        const bc = document.querySelector('.breadcrumb');
        if (bc) bc.innerHTML = `<a href="index.html">Inicio</a> / <a href="productos.html">Productos</a> / ${prod.nombre}`;

        const tags = info.querySelector('.product-tags');
        if (tags && E) {
          const lista = prod.tipos.slice(0, 1).map((t) => (t === 'todo' ? 'Todo tipo' : cap(E.tiposLargo[t])));
          lista.push(E.preoc[prod.preocupaciones[0]]?.titulo || 'Cuidado');
          lista.push(E.paso[prod.paso] || '');
          tags.innerHTML = lista
            .map((x, i) => `<span class="badge ${i < 2 ? 'badge-accent' : ''}">${x}</span>`)
            .join('');
        }

        const precio = info.querySelector('.price');
        if (precio) precio.textContent = fmt(prod.precio);

        const parrafo = info.querySelector('.price + p');
        if (parrafo) parrafo.textContent = prod.ficha || prod.desc;

        const detalles = info.querySelectorAll('.accordion-item p');
        if (detalles[0]) detalles[0].textContent = prod.modoUso || 'Aplica según la frecuencia indicada en tu rutina personalizada.';
        if (detalles[1]) detalles[1].textContent = prod.ingredientes || 'Ingredientes activos de uso dermatológico.';
        if (detalles[2]) detalles[2].textContent = `Ideal para ${tiposTexto(prod).toLowerCase()}. ${prod.desc}`;
      }

      /* % de compatibilidad según el diagnóstico guardado */
      if (window.CS_DIAG && CS_DIAG.renderMatch) CS_DIAG.renderMatch(prod);

      /* Agregar al carrito */
      const btn = info.querySelector('[data-add-cart]');
      btn?.addEventListener('click', (ev) => {
        ev.preventDefault();
        const qty = parseInt(info.querySelector('.qty-selector span')?.textContent, 10) || 1;
        agregar([prod.id], qty);
        const original = btn.textContent;
        btn.textContent = '¡Añadido al carrito! ✓';
        setTimeout(() => { btn.textContent = original; }, 1600);
      });
    }
  }

  /* ---------- resultado: "Añadir rutina completa" ---------- */
  document.querySelector('[data-add-routine]')?.addEventListener('click', (ev) => {
    ev.preventDefault();
    const nombres = Array.from(document.querySelectorAll('.routine-block .products-grid h4'))
      .map((h) => h.textContent.trim());
    const ids = [...new Set(nombres.map((n) => porNombre(n)?.id).filter(Boolean))];
    if (ids.length) guardar(ids.map((id) => ({ id, qty: 1 })));
    location.href = 'carrito.html';
  });

  /* ---------- confirmacion: total real del pedido ---------- */
  const confTotal = document.querySelector('[data-confirm="total"]');
  if (confTotal) {
    const rc = resumen();
    if (rc.count > 0) confTotal.textContent = fmt(rc.total);
  }
})();
