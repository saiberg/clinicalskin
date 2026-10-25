/* Escáner de piel — usa CS_DIAG (js/logica.js) para calcular y guardar el perfil,
   por lo que resultado.html funciona sin cambios. */
(() => {
  'use strict';

  const PREGUNTAS = [
    {
      n: 1, titulo: '¿Cómo describirías tu piel en general?', sub: 'Elige la descripción que más te represente hoy.',
      opciones: [
        { v: 'mixta', e: '🌗', t: 'Mixta', d: 'Brillo en la zona T y zonas secas en mejillas.' },
        { v: 'seca', e: '🏜️', t: 'Seca', d: 'Tirantez, aspereza y sensación de opacidad.' },
        { v: 'grasa', e: '💧', t: 'Grasa', d: 'Brillo constante, poros visibles y tendencia a acné.' },
        { v: 'sensible', e: '🌸', t: 'Sensible', d: 'Se irrita, enrojece o reacciona fácilmente.' }
      ]
    },
    {
      n: 2, titulo: '¿Cuál es tu principal preocupación?', sub: 'Lo que más te gustaría resolver ahora.',
      opciones: [
        { v: 'acne', e: '🔬', t: 'Acné e imperfecciones', d: 'Brotes, puntos negros o textura irregular.' },
        { v: 'deshidratacion', e: '💦', t: 'Deshidratación', d: 'Tirantez, piel opaca o descamada.' },
        { v: 'manchas', e: '☀️', t: 'Manchas y tono desigual', d: 'Marcas de acné, melasma o manchas solares.' },
        { v: 'edad', e: '⏳', t: 'Signos de la edad', d: 'Líneas de expresión, pérdida de firmeza.' }
      ]
    },
    {
      n: 3, titulo: '¿Cómo es tu rutina actual?', sub: 'Nos ayuda a no saturar tu piel ni quedarnos cortos.',
      opciones: [
        { v: 'basica', e: '🧴', t: 'Básica', d: 'Limpiador + hidratante, sin activos.' },
        { v: 'multi', e: '🧪', t: 'Varios pasos', d: 'Varias capas y activos a la semana.' },
        { v: 'cambiante', e: '🔄', t: 'Probando productos', d: 'Rutina cambiante o con cambios recientes.' },
        { v: 'ninguna', e: '🤷', t: 'Sin rutina fija', d: 'Uso lo que tengo, sin constancia.' }
      ]
    },
    {
      n: 4, titulo: '¿Cuánto te afectan el sol y el clima?', sub: 'Define la protección y la hidratación ideales.',
      opciones: [
        { v: 'bajo', e: '🏢', t: 'Poco sol / clima controlado', d: 'Casi siempre en interiores o clima estable.' },
        { v: 'moderado', e: '🌤️', t: 'Exposición moderada', d: 'Sol varias veces por semana o clima cambiante.' },
        { v: 'alto', e: '🏖️', t: 'Mucho sol o calor', d: 'Exposición frecuente al sol o calor extremo.' },
        { v: 'reactivo_clima', e: '🌬️', t: 'Mi piel reacciona al clima', d: 'Frío, calor o humedad me irritan.' }
      ]
    },
    {
      n: 5, titulo: '¿Qué quieres lograr en los próximos meses?', sub: 'Último paso: priorizamos lo que más te importa.',
      opciones: [
        { v: 'brillo_poros', e: '✨', t: 'Controlar brillo y poros', d: 'Mejorar textura y aspecto general.' },
        { v: 'hidratar_calmar', e: '🫧', t: 'Hidratar y calmar', d: 'Reducir tirantez y ganar comodidad.' },
        { v: 'iluminar', e: '🌟', t: 'Iluminar y unificar tono', d: 'Reducir manchas, piel más uniforme.' },
        { v: 'prevenir', e: '🛡️', t: 'Prevenir y mantener', d: 'Priorizar salud y equilibrio general.' }
      ]
    }
  ];

  /* Iconografía lineal de la interfaz, sin depender de emojis del sistema. */
  const ICONOS = {
    balance: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5"/><path d="M12 3.5v17M12 5c-3 1-4.8 3.1-4.8 5.5S9 15 12 16M12 8c3 .8 4.5 2.5 4.5 4.5"/></svg>',
    drop: '<svg viewBox="0 0 24 24"><path d="M12 3c-2.2 3.2-6.5 7.4-6.5 11.5a6.5 6.5 0 0 0 13 0C18.5 10.4 14.2 6.2 12 3Z"/><path d="M9 15.5c.4 1.2 1.3 1.8 2.5 2"/></svg>',
    sun: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42"/></svg>',
    leaf: '<svg viewBox="0 0 24 24"><path d="M20.5 3.5C12 3.5 5 5.7 5 12.5a5 5 0 0 0 5 5c6.8 0 9-7 10.5-14Z"/><path d="M3.5 21c3.2-5.5 6.7-8.3 12-11"/></svg>',
    spark: '<svg viewBox="0 0 24 24"><path d="m12 2 1.6 6.4L20 10l-6.4 1.6L12 18l-1.6-6.4L4 10l6.4-1.6L12 2Z"/><path d="m19 16 .8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8L19 16Z"/></svg>',
    clock: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/></svg>',
    bottle: '<svg viewBox="0 0 24 24"><path d="M9 3h6M10 3v3l-2 2v11a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2V8l-2-2V3M8 11h8"/></svg>',
    layers: '<svg viewBox="0 0 24 24"><path d="m12 3 9 5-9 5-9-5 9-5Z"/><path d="m3 12 9 5 9-5M3 16l9 5 9-5"/></svg>',
    cycle: '<svg viewBox="0 0 24 24"><path d="M20 7v5h-5M4 17v-5h5"/><path d="M5.5 9A7 7 0 0 1 18 6l2 2M4 16l2 2a7 7 0 0 0 12.5-3"/></svg>',
    minus: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M8 12h8"/></svg>',
    building: '<svg viewBox="0 0 24 24"><path d="M4 21V5l8-3v19M12 9h8v12M8 7h.01M8 11h.01M8 15h.01M16 13h.01M16 17h.01M2 21h20"/></svg>',
    cloud: '<svg viewBox="0 0 24 24"><path d="M7 18h10a4 4 0 0 0 .5-8A6 6 0 0 0 6 9.5 4.3 4.3 0 0 0 7 18Z"/><path d="m8 22 1-2m5 2 1-2"/></svg>',
    wind: '<svg viewBox="0 0 24 24"><path d="M3 8h12a3 3 0 1 0-3-3M2 12h17a3 3 0 1 1-3 3M4 16h8a2.5 2.5 0 1 1-2.5 2.5"/></svg>',
    shield: '<svg viewBox="0 0 24 24"><path d="M12 3 20 6v5c0 5-3.4 8.2-8 10-4.6-1.8-8-5-8-10V6l8-3Z"/><path d="m8.5 12 2.2 2.2 4.8-5"/></svg>'
  };
  const ICONO_OPCION = {
    mixta: 'balance', seca: 'drop', grasa: 'spark', sensible: 'leaf',
    acne: 'spark', deshidratacion: 'drop', manchas: 'sun', edad: 'clock',
    basica: 'bottle', multi: 'layers', cambiante: 'cycle', ninguna: 'minus',
    bajo: 'building', moderado: 'cloud', alto: 'sun', reactivo_clima: 'wind',
    brillo_poros: 'spark', hidratar_calmar: 'drop', iluminar: 'sun', prevenir: 'shield'
  };

  const ZONAS = ['frente', 'mejillaI', 'mejillaD', 'nariz', 'mentón'];
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const vistas = {};
  $$('[data-view]').forEach((el) => { vistas[el.dataset.view] = el; });

  const respuestas = {};
  let paso = 0;
  let bloqueado = false;
  const timers = [];

  const mostrar = (nombre) => {
    Object.keys(vistas).forEach((k) => { vistas[k].hidden = k !== nombre; });
  };

  /* ---------- Perfil en vivo ---------- */
  const clamp = (n) => Math.max(0, Math.min(100, n));
  const metricas = () => {
    const r = respuestas;
    const m = {};
    if (r.q1) {
      m.hidra = { seca: 25, sensible: 40, mixta: 60, grasa: 75 }[r.q1];
      m.sebo = { grasa: 30, mixta: 55, sensible: 75, seca: 90 }[r.q1];
      m.sens = { sensible: 85, seca: 45, mixta: 30, grasa: 25 }[r.q1];
      m.tol = { mixta: 80, grasa: 85, seca: 55, sensible: 25 }[r.q1];
    }
    if (r.q2 && m.hidra !== undefined) {
      if (r.q2 === 'deshidratacion') m.hidra -= 15;
      if (r.q2 === 'acne') m.sebo -= 15;
    }
    if (r.q4) {
      m.sol = { bajo: 20, moderado: 55, alto: 90, reactivo_clima: 50 }[r.q4];
      if (r.q4 === 'reactivo_clima') {
        m.sens = (m.sens ?? 40) + 15;
        if (m.tol !== undefined) m.tol -= 15;
      }
    }
    return m;
  };

  const pintarPerfil = () => {
    const m = metricas();
    ['hidra', 'sebo', 'sens', 'sol', 'tol'].forEach((k) => {
      const b = $(`[data-m="${k}"]`);
      if (b) b.style.width = (m[k] === undefined ? 0 : clamp(m[k])) + '%';
    });
    const hechas = Object.keys(respuestas).length;
    const pct = Math.round((hechas / PREGUNTAS.length) * 100);
    $('[data-dx-pct]').textContent = pct + '%';
    ZONAS.forEach((z, i) => {
      const el = $(`[data-zone="${z}"]`);
      if (el) el.classList.toggle('on', i < hechas);
    });
  };

  /* ---------- Preguntas ---------- */
  const pintarPregunta = (atras) => {
    const q = PREGUNTAS[paso];
    const cont = $('[data-dx-question]');
    cont.className = 'dx-question' + (atras ? ' back' : '');
    cont.innerHTML = `
      <span class="eyebrow">Pregunta ${q.n} de ${PREGUNTAS.length}</span>
      <h2></h2><p></p>
      <div class="dx-options" role="radiogroup"></div>`;
    $('h2', cont).textContent = q.titulo;
    $('p', cont).textContent = q.sub;
    const grid = $('.dx-options', cont);
    q.opciones.forEach((o, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'dx-opt' + (respuestas['q' + q.n] === o.v ? ' selected' : '');
      b.setAttribute('role', 'radio');
      b.setAttribute('aria-checked', respuestas['q' + q.n] === o.v ? 'true' : 'false');
      b.innerHTML = `<span class="dx-emoji" aria-hidden="true"></span><span><h3></h3><p></p></span><span class="dx-key" aria-hidden="true">${i + 1}</span>`;
      $('.dx-emoji', b).innerHTML = ICONOS[ICONO_OPCION[o.v]] || ICONOS.spark;
      $('h3', b).textContent = o.t;
      $('p', b).textContent = o.d;
      b.addEventListener('click', () => elegir(i));
      grid.appendChild(b);
    });

    const bar = $('.dx-bar');
    $('[data-dx-bar]').style.width = (paso / PREGUNTAS.length) * 100 + '%';
    bar.setAttribute('aria-valuenow', paso);
    $('[data-dx-count]').textContent = `${q.n}/${PREGUNTAS.length}`;
    $('[data-dx-back]').disabled = paso === 0;
    pintarPerfil();
  };

  const elegir = (i) => {
    if (bloqueado) return;
    const q = PREGUNTAS[paso];
    const o = q.opciones[i];
    if (!o) return;
    bloqueado = true;
    respuestas['q' + q.n] = o.v;
    $$('.dx-opt').forEach((b, k) => {
      b.classList.toggle('selected', k === i);
      b.setAttribute('aria-checked', k === i ? 'true' : 'false');
    });
    pintarPerfil();
    $('[data-dx-bar]').style.width = ((paso + 1) / PREGUNTAS.length) * 100 + '%';
    timers.push(setTimeout(() => {
      bloqueado = false;
      if (paso < PREGUNTAS.length - 1) { paso++; pintarPregunta(false); }
      else analizar();
    }, 380));
  };

  const volver = () => {
    if (bloqueado || paso === 0) return;
    paso--;
    delete respuestas['q' + PREGUNTAS[paso + 1].n];
    pintarPregunta(true);
  };

  /* ---------- Análisis y resultado ---------- */
  const analizar = () => {
    mostrar('analyzing');
    const E = window.CS_DIAG.CONFIG.etiquetas;
    const data = window.CS_DIAG.guardar({ ...respuestas });
    const P = data.perfil;
    const pasos = [
      `Tipo de piel identificado: ${E.tipos[P.tipo].toLowerCase()}`,
      `Sensibilidad evaluada: ${E.sensibilidad[P.sensibilidad].toLowerCase()}`,
      `Tolerancia a activos: ${P.tolerancia}`,
      'Seleccionando los productos de tu rutina'
    ];
    const log = $('[data-dx-log]');
    log.innerHTML = '';
    pasos.forEach((t, i) => {
      const li = document.createElement('li');
      li.textContent = t;
      log.appendChild(li);
      timers.push(setTimeout(() => li.classList.add('show'), 250 + i * 520));
    });
    timers.push(setTimeout(() => resultado(data), 250 + pasos.length * 520 + 400));
  };

  const resultado = (data) => {
    const D = window.CS_DIAG;
    const E = D.CONFIG.etiquetas;
    const P = data.perfil;
    const p1 = E.preoc[P.preoc1] || {};
    const rutina = D.armarRutina(P);

    $('[data-dx-title]').textContent = `Tu piel es ${E.tipos[P.tipo].toLowerCase()}, con tendencia a ${p1.corto}`;
    $('[data-dx-text]').textContent = (D.CONFIG.resumen.finQuiz || {})[P.preoc1] || '';

    const chips = [
      ['Tipo', E.tipos[P.tipo]],
      ['Prioridad', p1.titulo],
      ['Sensibilidad', E.sensibilidad[P.sensibilidad]],
      ['Hidratación', E.hidratacion[P.tipo]],
      ['Rutina actual', E.rutina[P.rutina]]
    ];
    const cont = $('[data-dx-chips]');
    cont.innerHTML = '';
    chips.forEach(([k, v]) => {
      const s = document.createElement('span');
      s.className = 'dx-chip';
      s.append(k + ': ');
      const b = document.createElement('b');
      b.textContent = v || '—';
      s.appendChild(b);
      cont.appendChild(s);
    });

    const productos = D.CATALOGO.filter((p) => rutina.ids.includes(p.id));
    const wrap = $('[data-dx-routine]');
    wrap.innerHTML = '';
    productos.forEach((p, i) => {
      const d = document.createElement('div');
      d.className = 'dx-prod';
      d.style.animationDelay = 300 + i * 120 + 'ms';
      const img = document.createElement('img');
      img.src = p.img; img.alt = p.nombre; img.loading = 'lazy';
      const s = document.createElement('span');
      s.textContent = E.paso[p.paso] || '';
      const n = document.createElement('strong');
      n.textContent = p.nombre;
      d.append(img, s, n);
      wrap.appendChild(d);
    });

    const pct = productos.length
      ? Math.round(productos.reduce((a, p) => a + D.matchProducto(P, p), 0) / productos.length)
      : 0;
    mostrar('result');
    const ring = $('[data-dx-score-ring]');
    requestAnimationFrame(() => requestAnimationFrame(() => {
      ring.style.strokeDashoffset = 327 * (1 - pct / 100);
    }));
    let cur = 0;
    const el = $('[data-dx-score]');
    const tick = setInterval(() => {
      cur = Math.min(pct, cur + 2);
      el.textContent = cur + '%';
      if (cur >= pct) clearInterval(tick);
    }, 20);
    $('[data-dx-pct]').textContent = '100%';
    ZONAS.forEach((z) => $(`[data-zone="${z}"]`).classList.add('on'));
  };

  const reiniciar = () => {
    timers.splice(0).forEach(clearTimeout);
    Object.keys(respuestas).forEach((k) => delete respuestas[k]);
    paso = 0; bloqueado = false;
    const ring = $('[data-dx-score-ring]');
    ring.style.strokeDashoffset = 327;
    mostrar('quiz');
    pintarPregunta(false);
  };

  /* ---------- Eventos ---------- */
  $('[data-dx-start]').addEventListener('click', () => { mostrar('quiz'); pintarPregunta(false); });
  $('[data-dx-back]').addEventListener('click', volver);
  $('[data-dx-restart]').addEventListener('click', reiniciar);
  document.addEventListener('keydown', (e) => {
    if (vistas.quiz.hidden) return;
    if (e.key >= '1' && e.key <= '4') elegir(Number(e.key) - 1);
    else if (e.key === 'Backspace' || e.key === 'ArrowLeft') volver();
  });

  pintarPerfil();
})();
