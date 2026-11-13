/* Resultado — resultado-pro.html. Lee el perfil guardado por el escáner (CS_DIAG.cargar).
   Fase 3: sincroniza el catálogo real, usa las 11 preocupaciones, indicadores
   documentados y marca los productos agotados (sin compra). */
(async () => {
  'use strict';
  const D = window.CS_DIAG;
  const C = window.CS_COMPRA;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '');
  const fmt = (n) => '$' + Math.round(n).toLocaleString('es-CL');

  const data = D && D.cargar();
  if (!data) { $('[data-rp-empty]').hidden = false; return; }
  $('[data-rp-content]').hidden = false;

  /* Catálogo real antes de calcular la rutina (si el endpoint está disponible). */
  if (D.sincronizarSiDisponible) {
    try { await D.sincronizarSiDisponible(); } catch (e) { /* se usa el estático */ }
  }

  const P = data.perfil;
  const E = D.CONFIG.etiquetas;
  const PREF = D.CONFIG.preocupaciones;
  const p1 = PREF[P.preoc1] || {};
  let nivel = 'avanzada';
  let rutina = D.armarRutinaAvanzada(P);
  const excluidos = new Set();

  const calcularRutina = () => (nivel === 'basica' ? D.armarRutinaBasica(P) : D.armarRutinaAvanzada(P));

  const productosUnicos = () => {
    const ids = new Set();
    rutina.manana.concat(rutina.noche).forEach((e) => ids.add(e.prod.id));
    return [...ids].map((id) => D.CATALOGO.find((p) => p.id === id));
  };

  /* Ids que están agotados (no se pueden comprar). */
  const agotadosIds = () => new Set(
    rutina.manana.concat(rutina.noche).filter((e) => e.agotado).map((e) => e.prod.id)
  );

  /* ---------- Hero ---------- */
  $('[data-rp-title]').textContent = `Tu piel es ${(E.tipos[P.tipo] || '').toLowerCase()}, con tendencia a ${p1.corto || ''}`;
  const extraPreoc = (P.preoc2 && P.preoc2 !== P.preoc1 && PREF[P.preoc2]) ? `, y también quieres ${PREF[P.preoc2].largo}` : '';
  const extraSol = P.spfPrioridad ? ' Con tu exposición solar, la protección diaria es prioritaria.' : '';
  $('[data-rp-lead]').textContent = `Detectamos ${p1.largo}${extraPreoc}.${extraSol} Esta es la rutina pensada específicamente para ti.`;

  const tags = $('[data-rp-tags]');
  [cap(E.tiposLargo[P.tipo]), cap(p1.largo), `Sensibilidad ${E.sensibilidad[P.sensibilidad].toLowerCase()}`, `Exposición solar ${E.sol[P.sol]}`]
    .forEach((t) => { const s = document.createElement('span'); s.className = 'badge badge-accent'; s.textContent = t; tags.appendChild(s); });

  /* Barras de perfil: indicadores documentados (calcularIndicadores). */
  const ind = D.calcularIndicadores(P);
  const m = {
    hidra: ind.hidratacion,
    sebo: ind.sebo,
    sens: ind.sensibilidad,
    tol: ind.tolerancia,
    sol: ind.exposicion_solar
  };
  requestAnimationFrame(() => setTimeout(() => {
    Object.keys(m).forEach((k) => {
      const b = $(`[data-m="${k}"]`);
      if (b && m[k] !== undefined && m[k] !== null) b.style.width = Math.max(0, Math.min(100, m[k])) + '%';
    });
  }, 150));

  /* ---------- Insights ---------- */
  $('[data-rp-sumtitle]').textContent = D.CONFIG.resumen.titulos[P.preoc1] || '';
  $('[data-rp-sumtext]').textContent = D.CONFIG.resumen.textos[P.preoc1] || '';
  $('[data-rp-k1]').textContent = p1.senal || '—';
  $('[data-rp-k1s]').textContent = cap(p1.corto || '');
  $('[data-rp-k2]').textContent = E.actitud[P.sensibilidad];
  $('[data-rp-k2s]').textContent = E.detalleActitud[P.sensibilidad];
  $('[data-rp-k3]').textContent = P.spfPrioridad ? 'SPF' : 'Constancia';
  $('[data-rp-k3s]').textContent = P.spfPrioridad ? 'Protección diaria' : 'Rutina diaria';
  $('[data-rp-count]').textContent = rutina.ids.length;

  /* ---------- Rutina ---------- */
  const primerIngrediente = (txt) => (txt || '').split(/,| y /)[0].replace(/\(.*?\)/g, '').trim();

  /* Escapa texto para insertarlo en HTML (viene de WooCommerce). */
  const esc = (s) => String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

  const pintarPasos = (slot, entradas) => {
    const ol = $(`[data-steps="${slot}"]`);
    ol.innerHTML = '';
    if (!entradas.length) {
      ol.innerHTML = '<li class="rp-why">No hay productos en este momento del día.</li>';
      return;
    }
    entradas.forEach((e, i) => {
      const p = e.prod;
      const agotado = !!e.agotado;
      const li = document.createElement('li');
      li.className = 'rp-step';
      li.style.animationDelay = i * 90 + 'ms';

      /* Datos reales del catálogo (con fallback al texto estático). */
      const nombre = esc(p.nombre);
      const desc = esc(p.desc || '');
      const porque = esc(e.porque || p.porque || '');
      const fichaRaw = p.ficha || '';
      /* Evita repetir la misma frase: la ficha solo si aporta información nueva. */
      const ficha = (fichaRaw && fichaRaw.trim() !== (p.desc || '').trim()) ? esc(fichaRaw) : '';
      const modoUso = esc(p.modoUso || p.modo_uso || '');
      const activo = esc(primerIngrediente(p.ingredientes));
      const paso = esc(E.paso[p.paso] || '');
      const freq = esc(e.freq || p.frecuencia || '');
      const url = p.url || ('producto.html?id=' + encodeURIComponent(p.id));

      li.innerHTML = `
        <span class="rp-num">${i + 1}</span>
        <div class="rp-card${excluidos.has(p.id) ? ' off' : ''}${agotado ? ' agotado' : ''}" data-sku="${esc(p.id)}" data-product-id="${esc(p.product_id || '')}">
          <a class="rp-media" href="${esc(url)}" aria-label="Ver ${nombre}">
            <img src="${esc(p.img)}" alt="${nombre}" loading="lazy">
          </a>
          <div class="rp-body">
            <div class="rp-badges">
              <span class="badge badge-accent">${paso}</span>
              <span class="badge">${freq}</span>
              ${agotado ? '<span class="badge badge-agotado">Agotado</span>' : ''}
            </div>
            <h3><a href="${esc(url)}">${nombre}</a></h3>
            ${desc ? `<p class="rp-desc">${desc}</p>` : ''}
            ${ficha ? `<p class="rp-ficha">${ficha}</p>` : ''}
            ${porque ? `<p class="rp-why"><strong>Por qué te lo recomendamos:</strong> ${porque}</p>` : ''}
            ${activo ? `<p class="rp-key">Activo clave: <b>${activo}</b></p>` : ''}
            ${modoUso ? `<p class="rp-modo"><strong>Cómo usarlo:</strong> ${modoUso}</p>` : ''}
          </div>
          <div class="rp-side">
            <span class="rp-price">${fmt(p.precio)}</span>
            ${agotado
              ? '<span class="rp-agotado-label">Sin stock</span>'
              : `<label class="rp-inc"><input type="checkbox" data-inc="${p.id}" ${excluidos.has(p.id) ? '' : 'checked'}> Incluir</label>`}
            <a href="${esc(url)}" class="btn btn-ghost btn-sm">Ver ficha</a>
            ${agotado
              ? ''
              : `<a href="${esc(url)}" class="btn btn-primary btn-sm rp-buy">Comprar</a>`}
          </div>
        </div>`;
      ol.appendChild(li);
    });
  };
  const pintarRutina = () => {
    pintarPasos('am', rutina.manana);
    pintarPasos('pm', rutina.noche);
    $('[data-rp-count]').textContent = rutina.ids.length;
  };
  $('[data-panel="am"]').dataset.label = 'Rutina de mañana';
  $('[data-panel="pm"]').dataset.label = 'Rutina de noche';

  $$('.rp-tab').forEach((t) => t.addEventListener('click', () => {
    $$('.rp-tab').forEach((x) => { const on = x === t; x.classList.toggle('active', on); x.setAttribute('aria-selected', on); });
    $$('.rp-panel').forEach((p) => { p.hidden = p.dataset.panel !== t.dataset.tab; });
    pintarRutina();
  }));

  /* ---------- Alternancia básica / avanzada ---------- */
  const NOTAS_NIVEL = {
    basica: 'Rutina básica: lo esencial para tu piel — limpieza, hidratación y protección solar.',
    avanzada: 'Rutina avanzada: añade tratamientos específicos para tus preocupaciones.'
  };
  const aplicarNivel = (nuevo) => {
    nivel = nuevo;
    rutina = calcularRutina();
    excluidos.clear();
    $$('.rp-level-btn').forEach((b) => {
      const on = b.dataset.level === nivel;
      b.classList.toggle('active', on);
      b.setAttribute('aria-selected', on);
    });
    const nota = $('[data-rp-level-note]');
    if (nota) nota.textContent = NOTAS_NIVEL[nivel] || '';
    pintarRutina();
    actualizarTotal();
  };
  $$('.rp-level-btn').forEach((b) => b.addEventListener('click', () => aplicarNivel(b.dataset.level)));

  /* ---------- Indicadores (Etapa 5) ---------- */
  const INDICADORES = [
    { clave: 'hidratacion', nombre: 'Hidratación', desc: 'Cómo de bien retiene agua tu piel.' },
    { clave: 'sebo', nombre: 'Control de sebo', desc: 'Nivel de producción de grasa.' },
    { clave: 'sensibilidad', nombre: 'Sensibilidad', desc: 'Tendencia a reaccionar o irritarse.' },
    { clave: 'exposicion_solar', nombre: 'Exposición solar', desc: 'Cuánto sol recibe tu piel.' },
    { clave: 'tolerancia', nombre: 'Tolerancia a activos', desc: 'Capacidad de tolerar ingredientes potentes.' }
  ];
  const pintarIndicadores = () => {
    const cont = $('[data-rp-indicators]');
    if (!cont) return;
    const valores = D.calcularIndicadores(P);
    cont.innerHTML = INDICADORES.map((ind) => {
      const v = valores[ind.clave];
      if (v === null || v === undefined) {
        return `<div class="rp-ind"><div class="rp-ind-top"><strong>${ind.nombre}</strong><span class="rp-ind-na">Sin datos</span></div><p>${ind.desc}</p></div>`;
      }
      return `<div class="rp-ind">
        <div class="rp-ind-top"><strong>${ind.nombre}</strong><span class="rp-ind-val">${v}</span></div>
        <div class="rp-ind-bar"><i style="width:${v}%"></i></div>
        <p>${ind.desc}</p>
      </div>`;
    }).join('');
  };

  /* ---------- WhatsApp con mensaje prefijado ---------- */
  const configurarWhatsApp = () => {
    const a = $('[data-rp-whatsapp]');
    if (!a) return;
    const numero = '56992412354';
    const texto = `Hola Clinical Skin, hice el test de piel y mi perfil es ${(E.tipos[P.tipo] || '').toLowerCase()} con tendencia a ${p1.corto || ''}. Me gustaría orientación sobre mi rutina.`;
    a.href = `https://wa.me/${numero}?text=${encodeURIComponent(texto)}`;
  };

  document.addEventListener('change', (ev) => {
    const id = ev.target && ev.target.dataset && ev.target.dataset.inc;
    if (!id) return;
    if (ev.target.checked) excluidos.delete(id); else excluidos.add(id);
    $$(`[data-inc="${id}"]`).forEach((c) => { c.checked = ev.target.checked; c.closest('.rp-card').classList.toggle('off', !ev.target.checked); });
    actualizarTotal();
  });

  /* ---------- Total y compra ---------- */
  /* Los agotados nunca entran en la compra. */
  const seleccion = () => { const ag = agotadosIds(); return productosUnicos().filter((p) => !excluidos.has(p.id) && !ag.has(p.id)); };
  const comprables = () => { const ag = agotadosIds(); return productosUnicos().filter((p) => !ag.has(p.id)); };
  const actualizarTotal = () => {
    const sel = seleccion();
    const subtotal = sel.reduce((s, p) => s + p.precio, 0);
    const desc = sel.length >= 2 ? subtotal * 0.1 : 0;
    $('[data-rp-total]').textContent = fmt(subtotal - desc);
    $('[data-rp-buysub]').textContent = sel.length === comprables().length ? `Rutina completa · ${sel.length} productos` : `${sel.length} productos seleccionados`;
    $('[data-rp-save]').textContent = desc ? `Ahorras ${fmt(desc)} (10%)` : '';
    $('[data-rp-add]').disabled = sel.length === 0;
  };
  /* ---------- Copia por correo (opcional, captura de lead) ---------- */
  /* URL que recibirá {email, consent, perfil, productos, ts} por POST JSON y enviará el correo.
     Mientras esté vacía, el correo solo se guarda en este navegador y no se envía nada. */
  const LEADS_ENDPOINT = '';
  const KEY_LEAD = 'cs_lead';
  const form = $('[data-rp-gate]');
  const errorEl = $('[data-rp-error]');
  const sentEl = $('[data-rp-sent]');
  const emailOk = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);

  try {
    const previo = JSON.parse(localStorage.getItem(KEY_LEAD));
    if (previo && previo.email) form.email.value = previo.email;
  } catch (e) { /* sin dato previo */ }

  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const email = form.email.value.trim().toLowerCase();
    errorEl.hidden = true;
    sentEl.hidden = true;
    if (!emailOk(email)) { errorEl.textContent = 'Ingresa un correo válido.'; errorEl.hidden = false; form.email.focus(); return; }
    if (!form.consent.checked) { errorEl.textContent = 'Debes aceptar para recibir tu rutina.'; errorEl.hidden = false; return; }

    const btn = $('[data-rp-submit]');
    btn.disabled = true;
    btn.textContent = 'Enviando…';
    const lead = {
      email, consent: true, ts: Date.now(),
      perfil: P,
      productos: productosUnicos().map((p) => p.id)
    };
    let enviado = false;
    if (LEADS_ENDPOINT) {
      try {
        const res = await fetch(LEADS_ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(lead) });
        enviado = res.ok;
      } catch (e) { enviado = false; }
    }
    btn.disabled = false;
    btn.textContent = 'Enviarme mi rutina';
    if (LEADS_ENDPOINT && !enviado) {
      errorEl.textContent = 'No pudimos enviar el correo. Revisa tu conexión e inténtalo nuevamente.';
      errorEl.hidden = false;
      return;
    }
    try { localStorage.setItem(KEY_LEAD, JSON.stringify({ email, ts: lead.ts })); } catch (e) { /* modo privado */ }
    sentEl.textContent = enviado
      ? `Listo, te enviamos tu rutina a ${email}. Revisa también la carpeta de spam.`
      : `Guardamos tu correo (${email}).`;
    sentEl.hidden = false;
  });
  $('[data-rp-add]').addEventListener('click', () => {
    const ids = seleccion().map((p) => p.id);
    if (!ids.length) return;
    if (C) C.guardar(ids.map((id) => ({ id, qty: 1 })));
    location.href = 'carrito.html';
  });

  /* ---------- Semana tipo ---------- */
  const exf = rutina.noche.find((e) => e.prod.paso === 'exfoliacion');
  const dias = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
  const veces = exf ? (parseInt((exf.freq.match(/\d/) || [2])[0], 10) || 2) : 0;
  const patrones = { 1: [2], 2: [1, 4], 3: [0, 2, 4], 4: [0, 2, 4, 5] };
  const diasExf = new Set(patrones[Math.min(veces, 4)] || []);
  const sem = $('[data-rp-week]');
  const fila = (etq, fn) => {
    const l = document.createElement('div'); l.className = 'l'; l.textContent = etq; sem.appendChild(l);
    dias.forEach((_, i) => { const c = document.createElement('div'); fn(c, i); sem.appendChild(c); });
  };
  sem.appendChild(Object.assign(document.createElement('div'), { className: 'h' }));
  dias.forEach((d) => { const h = document.createElement('div'); h.className = 'h'; h.textContent = d; sem.appendChild(h); });
  fila('☀️ AM', (c) => { c.className = 'rp-cell on'; c.textContent = '✓'; });
  fila('🌙 PM', (c, i) => {
    if (exf && diasExf.has(i)) { c.className = 'rp-cell act'; c.textContent = 'BHA'; }
    else { c.className = 'rp-cell on'; c.textContent = '✓'; }
  });
  $('[data-rp-weeknote]').textContent = exf
    ? `El exfoliante BHA va ${exf.freq.toLowerCase()}. Las primeras dos semanas úsalo solo 1 vez por semana.`
    : 'Tu rutina es diaria: constancia por sobre cantidad.';

  /* ---------- Consejo ---------- */
  const tip = D.CONFIG.tips.find((t) => { try { return t.cond(P, rutina); } catch (e) { return false; } });
  if (tip) {
    const texto = tip.texto.split('{frecuenciaBHA}').join(D.CONFIG.exfoliacion.frecuenciaPorTolerancia[P.tolerancia] || '');
    const p = $('[data-rp-tip]');
    const b = document.createElement('strong');
    b.textContent = 'Consejo de nuestras especialistas: ';
    p.append(b, texto);
  }

  pintarIndicadores();
  configurarWhatsApp();
  aplicarNivel('avanzada');
})();
