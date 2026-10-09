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
      $('.dx-emoji', b).textContent = o.e;
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
