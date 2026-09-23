/* ============================================================
   Clinical Skin — Lógica del diagnóstico
   ------------------------------------------------------------
   TODO lo modificable vive en este archivo:
     CONFIG    → reglas, umbrales, etiquetas y copys
     CATALOGO  → productos con sus atributos
     VALORES   → qué responde cada opción del quiz
   Explicación completa: docs/logica-diagnostico.md
   ============================================================ */

const CS_DIAG = (() => {
  'use strict';

  /* ==================== CONFIG ==================== */
  const CONFIG = {
    almacen: { clave: 'cs_diagnostico', caducaDias: 30 },

    /* Cuántos productos únicos soporta cada perfil */
    pasosPorRutina: { ninguna: 4, basica: 4, cambiante: 5, multi: 6 },

    /* Tolerancia a activos: puntos por tipo + ajustes por sensibilidad */
    toleranciaPorTipo: { mixta: 2, grasa: 2, seca: 1, sensible: 0 },
    ajustesTolerancia: { sensibilidadAlta: -2, sensibilidadMedia: -1 },
    umbralesTolerancia: { alta: 2, media: 1 }, // >= alta | >= media | resto baja

    /* Exfoliación (BHA) */
    exfoliacion: {
      activadaPor: ['acne'],
      tiposPermitidos: ['mixta', 'grasa'],
      bloqueadaSiSensibilidad: 'alta',
      frecuenciaPorTolerancia: {
        alta: '3-4 veces por semana',
        media: '2-3 veces por semana',
        baja: '1 vez por semana'
      },
      notaSiToleranciaBaja: 'Introdúcelo de a poco: empieza 1 vez por semana las dos primeras semanas.'
    },

    /* Orden en que se agregan los pasos extras (si el presupuesto alcanza) */
    prioridadesExtra: ['limpiezaExtra', 'exfoliante', 'refuerzo', 'reparacion'],

    /* Protección solar */
    spf: { solConPrioridad: ['moderado', 'alto'] },

    /* Compatibilidad por producto: base + coincidencias, con tope */
    match: { base: 85, tipo: 8, preocupacion: 10, tope: 99 },

    /* Q5 (objetivo) reutiliza el enum de preocupaciones (Q2) */
    mapObjetivo: { brillo_poros: 'acne', hidratar_calmar: 'deshidratacion', iluminar: 'manchas', prevenir: 'edad' },

    /* Etiquetas legibles de cada valor */
    etiquetas: {
      tipos: { mixta: 'Mixta', seca: 'Seca', grasa: 'Grasa', sensible: 'Sensible' },
      tiposLargo: { mixta: 'piel mixta', seca: 'piel seca', grasa: 'piel grasa', sensible: 'piel sensible' },
      preoc: {
        acne: { titulo: 'Acné', largo: 'acné e imperfecciones', corto: 'imperfecciones', senal: 'Brotes' },
        deshidratacion: { titulo: 'Deshidratación', largo: 'deshidratación', corto: 'sequedad', senal: 'Tirantez' },
        manchas: { titulo: 'Manchas', largo: 'manchas y tono desigual', corto: 'manchas', senal: 'Manchas' },
        edad: { titulo: 'Signos de la edad', largo: 'signos de la edad', corto: 'signos de la edad', senal: 'Líneas' }
      },
      sensibilidad: { alta: 'Alta', media: 'Media', baja: 'Baja' },
      actitud: { alta: 'Muy sensible', media: 'Reactiva', baja: 'Resistente' },
      detalleActitud: { alta: 'Cuidado extra', media: 'Sin irritar', baja: 'Bien tolerada' },
      sol: { bajo: 'Baja', moderado: 'Media', alto: 'Alta', reactivo_clima: 'Reactiva al clima' },
      rutina: { basica: 'Básica', multi: 'Varios pasos', cambiante: 'Variable', ninguna: 'Sin rutina fija' },
      hidratacion: { seca: 'Insuficiente', mixta: 'Desbalanceada', grasa: 'Equilibrada', sensible: 'Comprometida' },
      objetivos: {
        brillo_poros: 'Controlar brillo y poros',
        hidratar_calmar: 'Hidratar y calmar',
        iluminar: 'Iluminar y unificar tono',
        prevenir: 'Prevenir y mantener'
      },
      paso: {
        limpieza: 'Limpieza',
        tratamiento: 'Tratamiento',
        exfoliacion: 'Exfoliación',
        hidratacion: 'Hidratación',
        proteccion: 'Protección'
      }
    },

    /* Copys del resultado */
    resumen: {
      titulos: {
        acne: 'Equilibrio, no sobretratamiento',
        deshidratacion: 'Hidratar desde la base',
        manchas: 'Luz y constancia',
        edad: 'Prevenir y mantener'
      },
      textos: {
        acne: 'Tu piel presenta brillo, poros y brotes esporádicos. El objetivo no es eliminar el sebo, sino regularlo para que la piel no reaccione ni se vuelva más sensible.',
        deshidratacion: 'Tu piel pierde agua más rápido de la que la repone: por eso se siente tirante u opaca. El plan es reparar la barrera y fijar hidratación, sin sobrecargar.',
        manchas: 'Tu tono se está desparejando por sol, marcas o tiempo. Trabajamos con activos que unifican el tono y — fundamental — protección diaria para que no vuelvan.',
        edad: 'Tu piel pide firmeza y luminosidad. Combinamos antioxidantes, hidratación profunda y protección solar: la base de toda prevención real.'
      },
      finQuiz: {
        acne: 'Basado en tus respuestas, tu piel necesita equilibrio: controlar el brillo y las imperfecciones sin resecar ni sobretratar.',
        deshidratacion: 'Basado en tus respuestas, tu piel necesita hidratación de verdad: reparar la barrera y reducir la tirantez.',
        manchas: 'Basado en tus respuestas, tu piel necesita unificar el tono y protegerse a diario.',
        edad: 'Basado en tus respuestas, tu piel necesita prevenir: firmeza, luminosidad y protección constante.'
      }
    },

    /* Lista "Qué está ocurriendo en tu piel" (tokens: {tipoLargo}, {preoc1Largo}...) */
    expertos: [
      'Tu {tipoLargo} pide {preoc1Largo}: por eso el corazón de tu rutina es {tratamiento}, elegido para actuar sin comprometer tu barrera cutánea.',
      'La señal que más importa hoy es {senal}. Trabajamos esa prioridad con activos de uso comprobado, no con promesas milagrosas.',
      'Tu sensibilidad es {sensibilidad}. {detalleSens} Armamos solo {nProductos} productos: {detallePasos}'
    ],
    detallesSensibilidad: {
      alta: 'Evitamos exfoliantes agresivos: primero calmar, después tratar.',
      media: 'Mantenemos los activos con frecuencias moderadas para no irritar.',
      baja: 'Tolerarás bien los activos, siempre con constancia.'
    },
    detallesPasos: {
      corta: 'empezamos por lo esencial: limpiar, tratar, hidratar y proteger.',
      media: 'añadimos un paso extra para tu objetivo, sin saturarte.',
      completa: 'rutina completa de mañana y noche, lista para crecer contigo.'
    },

    /* Tips: se muestra el primero que cumpla la condición */
    tips: [
      {
        clave: 'sensibilidad',
        cond: (P) => P.sensibilidad === 'alta',
        texto: 'Tu piel es reactiva: priorizamos fórmulas calmantes y dejamos fuera exfoliantes fuertes. Si algún producto te genera ardor, escríbenos y lo ajustamos.'
      },
      {
        clave: 'sol',
        cond: (P) => CONFIG.spf.solConPrioridad.includes(P.sol),
        texto: 'Con tu exposición solar, el protector es el paso más importante: aplícalo cada mañana y reaplícalo cada 3 horas al aire libre.'
      },
      {
        clave: 'rutina-nueva',
        cond: (P) => P.rutina === 'ninguna' || P.rutina === 'cambiante',
        texto: 'Tu rutina está en construcción: introduce los productos de a uno cada dos semanas. Así sabrás exactamente qué le hace bien a tu piel.'
      },
      {
        clave: 'bha',
        cond: (P, R) => R && R.exfolia,
        texto: 'Introduce el exfoliante BHA solo {frecuenciaBHA} las primeras dos semanas para permitir que tu piel se adapte.'
      },
      {
        clave: 'default',
        cond: () => true,
        texto: 'Constancia antes que cantidad: una rutina corta bien hecha rinde más que diez pasos abandonados a la semana.'
      }
    ]
  };

  /* ==================== CATALOGO ==================== */
  /* paso: limpieza | tratamiento | exfoliacion | hidratacion | proteccion
     tipos: mixta | seca | grasa | sensible | todo
     preocupaciones: acne | deshidratacion | manchas | edad              */
  const CATALOGO = [
    {
      id: 'gel-balance', nombre: 'Gel Limpiador Balance', paso: 'limpieza',
      tipos: ['mixta', 'grasa'], preocupaciones: ['acne'], agresividad: 'media',
      frecuencia: 'Mañana y noche', precio: 19900, img: 'img/productos/limpiador.svg',
      desc: 'Limpia sin resecar, regula el exceso de sebo.',
      porque: 'Limpia el exceso de sebo de tu {tipoLargo} sin alterar la barrera: la base para que el resto de la rutina funcione.'
    },
    {
      id: 'leche-cremosa', nombre: 'Leche Limpiadora Suave', paso: 'limpieza',
      tipos: ['seca', 'sensible'], preocupaciones: ['deshidratacion'], agresividad: 'baja',
      frecuencia: 'Mañana y noche', precio: 23500, img: 'img/productos/limpiador-cremoso.svg',
      desc: 'Limpieza cremosa sin jabones, ideal para piel seca o sensible.',
      porque: 'Retira impurezas sin jabones agresivos: limpia tu {tipoLargo} dejando la barrera intacta.'
    },
    {
      id: 'aceite-desmaquillante', nombre: 'Aceite Desmaquillante Suave', paso: 'limpieza',
      tipos: ['todo'], preocupaciones: ['deshidratacion', 'manchas'], agresividad: 'baja',
      frecuencia: 'Solo de noche', precio: 24300, img: 'img/productos/aceite.svg',
      desc: 'Disuelve impurezas y protector solar sin agredir.',
      porque: 'Doble limpieza de noche: retira protector solar y residuos que por el día tu piel no soltó.'
    },
    {
      id: 'serum-equilibrio', nombre: 'Sérum Equilibrio Botánico', paso: 'tratamiento',
      tipos: ['mixta', 'grasa'], preocupaciones: ['acne'], agresividad: 'media',
      frecuencia: 'Mañana y noche', precio: 34900, img: 'img/productos/serum.svg',
      desc: 'Niacinamida y zinc para controlar brillo y poros.',
      porque: 'La niacinamida regula el sebo y afina los poros: ataca tu {preoc1Largo} sin resecar.'
    },
    {
      id: 'serum-hidra', nombre: 'Sérum Hidra Plump', paso: 'tratamiento',
      tipos: ['todo'], preocupaciones: ['deshidratacion'], agresividad: 'baja',
      frecuencia: 'Mañana y noche', precio: 36400, img: 'img/productos/serum-hidra.svg',
      desc: 'Ácido hialurónico de triple peso molecular para rellenar hidratación.',
      porque: 'Ácido hialurónico que atrapa agua en la piel: la respuesta directa a tu {preoc1Largo}.'
    },
    {
      id: 'ampolla-vitc', nombre: 'Ampolla Luz Vitamina C', paso: 'tratamiento',
      tipos: ['todo'], preocupaciones: ['manchas', 'edad'], agresividad: 'media',
      frecuencia: 'Solo mañana', precio: 31200, img: 'img/productos/ampolla-vitc.svg',
      desc: 'Ilumina y unifica el tono con vitamina C estable.',
      porque: 'Vitamina C estable para unificar el tono y potenciar la protección de tu piel durante el día.'
    },
    {
      id: 'crema-avena', nombre: 'Crema Bruma de Avena', paso: 'hidratacion',
      tipos: ['seca', 'sensible'], preocupaciones: ['deshidratacion'], agresividad: 'baja',
      frecuencia: 'Mañana y noche', precio: 28500, img: 'img/productos/crema-avena.svg',
      desc: 'Hidratación profunda con avena coloidal y ceramidas.',
      porque: 'Avena coloidal y ceramidas reparan la barrera: hidratación profunda para tu {tipoLargo}.'
    },
    {
      id: 'gel-hidratante', nombre: 'Gel Hidratante Oil-Free', paso: 'hidratacion',
      tipos: ['mixta', 'grasa'], preocupaciones: ['acne', 'deshidratacion'], agresividad: 'baja',
      frecuencia: 'Mañana y noche', precio: 26900, img: 'img/productos/gel-hidratante.svg',
      desc: 'Hidratación en gel sin aceites, no obstruye poros.',
      porque: 'Da comodidad a tu {tipoLargo} sin aceites ni grasa: hidrata sin apagar la zona T.'
    },
    {
      id: 'balsamo-centella', nombre: 'Bálsamo Centella Calma', paso: 'hidratacion',
      tipos: ['sensible', 'seca'], preocupaciones: ['deshidratacion'], agresividad: 'baja',
      frecuencia: 'Solo de noche', precio: 26700, img: 'img/productos/balsamo.svg',
      desc: 'Repara la barrera cutánea y reduce el enrojecimiento.',
      porque: 'Centella asiática repara durante la noche y calma: ideal si tu piel tiende a reaccionar.'
    },
    {
      id: 'protector-spf50', nombre: 'Protector Solar Ligero SPF50', paso: 'proteccion',
      tipos: ['todo'], preocupaciones: ['manchas', 'edad'], agresividad: 'baja',
      frecuencia: 'Cada mañana', precio: 29500, img: 'img/productos/protector.svg',
      desc: 'Textura invisible, no obstruye poros.',
      porque: 'Protección diaria: el mejor antienvejecimiento y el aliado de cualquier rutina.'
    },
    {
      id: 'tonico-bha', nombre: 'Tónico Exfoliante BHA 2%', paso: 'exfoliacion',
      tipos: ['mixta', 'grasa'], preocupaciones: ['acne'], agresividad: 'alta',
      frecuencia: 'De noche', precio: 27800, img: 'img/productos/tonico.svg',
      desc: 'Desobstruye poros y previene nuevos brotes.',
      porque: 'BHA que desobstruye poros mientras duermes: trabaja tu {preoc1Largo} sin dejar residuo.'
    }
  ];

  /* Qué responde cada opción del quiz (por paso e índice de opción).
     Si en el HTML se agrega data-value a una opción, ese valor manda. */
  const VALORES = {
    1: ['mixta', 'seca', 'grasa', 'sensible'],
    2: ['acne', 'deshidratacion', 'manchas', 'edad'],
    3: ['basica', 'multi', 'cambiante', 'ninguna'],
    4: ['bajo', 'moderado', 'alto', 'reactivo_clima'],
    5: ['brillo_poros', 'hidratar_calmar', 'iluminar', 'prevenir']
  };

  /* ==================== PERFIL ==================== */
  const calcularPerfil = (r) => {
    const puntosSens = (r.q1 === 'sensible' ? 1 : 0) + (r.q4 === 'reactivo_clima' ? 1 : 0);
    const sensibilidad = puntosSens >= 2 ? 'alta' : puntosSens === 1 ? 'media' : 'baja';

    let tol = CONFIG.toleranciaPorTipo[r.q1] ?? 1;
    if (sensibilidad === 'alta') tol += CONFIG.ajustesTolerancia.sensibilidadAlta;
    if (sensibilidad === 'media') tol += CONFIG.ajustesTolerancia.sensibilidadMedia;
    const u = CONFIG.umbralesTolerancia;
    const tolerancia = tol >= u.alta ? 'alta' : tol >= u.media ? 'media' : 'baja';

    const preoc1 = CONFIG.mapObjetivo[r.q2] ? r.q2 : r.q2; // q2 ya viene en el enum
    const preoc2 = CONFIG.mapObjetivo[r.q5] || r.q2;
    const preocupaciones = preoc2 === preoc1 ? [preoc1] : [preoc1, preoc2];

    return {
      tipo: r.q1,
      preoc1,
      preoc2,
      preocupaciones,
      rutina: r.q3,
      sol: r.q4,
      sensibilidad,
      tolerancia,
      pasos: CONFIG.pasosPorRutina[r.q3] ?? 4,
      hidratacion: CONFIG.etiquetas.hidratacion[r.q1] || '—',
      spfPrioridad: CONFIG.spf.solConPrioridad.includes(r.q4)
    };
  };

  /* ==================== RUTINA ==================== */
  const rellenar = (texto, P) => {
    if (!texto) return '';
    const E = CONFIG.etiquetas;
    const p1 = E.preoc[P.preoc1] || {};
    const p2 = (P.preoc2 && E.preoc[P.preoc2]) || p1;
    const map = {
      '{tipo}': P.tipo || '',
      '{tipoLargo}': E.tiposLargo[P.tipo] || P.tipo || '',
      '{preoc1}': p1.largo || '',
      '{preoc1Largo}': p1.largo || '',
      '{preoc1Corto}': p1.corto || '',
      '{preoc2}': p2.largo || '',
      '{sensibilidad}': (E.sensibilidad[P.sensibilidad] || '').toLowerCase(),
      '{sol}': E.sol[P.sol] || ''
    };
    let out = String(texto);
    Object.keys(map).forEach((k) => { out = out.split(k).join(map[k]); });
    return out;
  };

  const matchProducto = (P, prod) => {
    const c = CONFIG.match;
    let pct = c.base;
    if (prod.tipos.includes('todo') || prod.tipos.includes(P.tipo)) pct += c.tipo;
    if (prod.preocupaciones.some((x) => P.preocupaciones.includes(x))) pct += c.preocupacion;
    return Math.min(pct, c.tope);
  };

  const armarRutina = (P) => {
    const presupuesto = CONFIG.pasosPorRutina[P.rutina] ?? 4;
    const elegidos = new Set();
    const manana = [];
    const noche = [];
    let exfolia = false;

    const poner = (id, slot) => {
      const prod = CATALOGO.find((p) => p.id === id);
      if (!prod || elegidos.has(id) || elegidos.size >= presupuesto) return null;
      elegidos.add(id);
      const entrada = { prod, freq: prod.frecuencia, porque: rellenar(prod.porque, P) };
      if (slot === 'am' || slot === 'ambos') manana.push(entrada);
      if (slot === 'pm' || slot === 'ambos') noche.push(entrada);
      return entrada;
    };

    const esSeca = P.tipo === 'seca';
    const esMixture = ['mixta', 'grasa'].includes(P.tipo);
    const esSensiblePerfil = P.tipo === 'sensible' || P.sensibilidad !== 'baja';

    /* --- Core (siempre entra) --- */
    poner((esSeca || P.tipo === 'sensible') ? 'leche-cremosa' : 'gel-balance', 'ambos');

    const tratMap = { acne: 'serum-equilibrio', deshidratacion: 'serum-hidra', manchas: 'ampolla-vitc', edad: 'ampolla-vitc' };
    const slotTrat = (P.preoc1 === 'manchas' || P.preoc1 === 'edad') ? 'am' : 'ambos';
    poner(tratMap[P.preoc1], slotTrat);

    poner((esSeca || P.tipo === 'sensible') ? 'crema-avena' : 'gel-hidratante', 'ambos');
    poner('protector-spf50', 'am');

    /* --- Extras por prioridad (respetando el presupuesto) --- */
    const EXTRAS = {
      limpiezaExtra: () =>
        (CONFIG.spf.solConPrioridad.includes(P.sol) || P.rutina === 'multi' || esMixture)
          ? poner('aceite-desmaquillante', 'pm')
          : null,

      exfoliante: () => {
        const activa = CONFIG.exfoliacion.activadaPor.some((c) => P.preocupaciones.includes(c));
        const okTipo = CONFIG.exfoliacion.tiposPermitidos.includes(P.tipo);
        const okSens = P.sensibilidad !== CONFIG.exfoliacion.bloqueadaSiSensibilidad;
        if (!(activa && okTipo && okSens)) return null;
        const e = poner('tonico-bha', 'pm');
        if (e) {
          e.freq = CONFIG.exfoliacion.frecuenciaPorTolerancia[P.tolerancia] || e.freq;
          exfolia = true;
        }
        return e;
      },

      refuerzo: () => {
        if (!P.preoc2 || P.preoc2 === P.preoc1 || P.preocupaciones.length < 2) return null;
        const mapa = {
          acne: ['serum-equilibrio', 'ambos'],
          deshidratacion: ['crema-avena', 'ambos'],
          manchas: ['ampolla-vitc', 'am'],
          edad: ['ampolla-vitc', 'am']
        }[P.preoc2];
        if (!mapa) return null;
        if (elegidos.has(mapa[0])) {
          const alt = { deshidratacion: 'serum-hidra', manchas: 'serum-equilibrio', edad: 'serum-equilibrio', acne: 'balsamo-centella' }[P.preoc2];
          return alt ? poner(alt, 'ambos') : null;
        }
        return poner(mapa[0], mapa[1]);
      },

      reparacion: () =>
        (esSensiblePerfil || exfolia || esSeca)
          ? poner('balsamo-centella', 'pm')
          : null
    };

    for (const clave of CONFIG.prioridadesExtra) {
      if (elegidos.size >= presupuesto) break;
      try { if (EXTRAS[clave]) EXTRAS[clave](); } catch (e) { /* regla no aplicable */ }
    }

    const total = CATALOGO.filter((p) => elegidos.has(p.id)).reduce((s, p) => s + p.precio, 0);
    return { manana, noche, total, ids: [...elegidos], exfolia };
  };

  /* ==================== PERSISTENCIA ==================== */
  const guardar = (respuestas) => {
    const data = { respuestas, perfil: calcularPerfil(respuestas), ts: Date.now() };
    try { localStorage.setItem(CONFIG.almacen.clave, JSON.stringify(data)); } catch (e) { /* modo privado */ }
    return data;
  };

  const cargar = () => {
    try {
      const raw = localStorage.getItem(CONFIG.almacen.clave);
      if (!raw) return null;
      const data = JSON.parse(raw);
      if (!data || !data.perfil) return null;
      const caduca = CONFIG.almacen.caducaDias * 86400000;
      if (Date.now() - (data.ts || 0) > caduca) {
        localStorage.removeItem(CONFIG.almacen.clave);
        return null;
      }
      return data;
    } catch (e) { return null; }
  };

  const limpiar = () => { try { localStorage.removeItem(CONFIG.almacen.clave); } catch (e) {} };

  /* ==================== LECTURA DEL QUIZ ==================== */
  const leerRespuestas = () => {
    const r = {};
    document.querySelectorAll('.quiz-step').forEach((step) => {
      const n = step.dataset.step;
      const opciones = step.querySelectorAll('.quiz-option');
      let idx = 0;
      opciones.forEach((o, i) => { if (o.classList.contains('selected')) idx = i; });
      const sel = opciones[idx];
      r['q' + n] = (sel && sel.dataset.value) || (VALORES[n] && VALORES[n][idx]);
    });
    return r;
  };

  const capitalizar = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '');

  /* ==================== RENDER: RESUMEN DEL QUIZ ==================== */
  const renderResumenQuiz = (data) => {
    const P = data.perfil;
    const E = CONFIG.etiquetas;
    const p1 = E.preoc[P.preoc1] || {};
    const h2 = document.querySelector('.quiz-summary h2');
    const para = document.querySelector('.quiz-summary p');
    const strongs = document.querySelectorAll('.quiz-summary .summary-card strong');
    if (h2) h2.textContent = `Tu piel tiene un perfil ${E.tipos[P.tipo].toLowerCase()} con tendencia a ${p1.corto}`;
    if (para) para.textContent = CONFIG.resumen.finQuiz[P.preoc1] || '';
    if (strongs.length >= 4) {
      strongs[0].textContent = E.tipos[P.tipo] || '—';
      strongs[1].textContent = p1.titulo || '—';
      strongs[2].textContent = E.rutina[P.rutina] || '—';
      strongs[3].textContent = E.objetivos[data.respuestas.q5] || '—';
    }
  };

  /* ==================== RENDER: PÁGINA DE RESULTADO ==================== */
  const cardHTML = (entrada, n) => `
    <div class="product-card">
      <div class="product-media"><span class="badge badge-primary">Paso ${n}</span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M9 3h6M10 3v4l-3.5 5A4 4 0 0 0 10 19h4a4 4 0 0 0 3.5-7L14 7V3"/></svg></div>
      <div class="product-body">
        <div class="product-tags"><span class="badge badge-accent">${CONFIG.etiquetas.paso[entrada.prod.paso] || ''}</span><span class="badge">${entrada.freq}</span></div>
        <h4>${entrada.prod.nombre}</h4>
        <p class="desc">${entrada.porque}</p>
        <div class="product-footer"><span class="price">${formatear(entrada.prod.precio)}</span><a href="producto.html" class="btn btn-ghost btn-sm">Ver</a></div>
      </div>
    </div>`;

  const formatear = (n) => '$' + Math.round(n).toLocaleString('es-CL');

  const renderResultado = (data) => {
    const P = data.perfil;
    const E = CONFIG.etiquetas;
    const p1 = E.preoc[P.preoc1] || {};
    const rutina = armarRutina(P);

    /* Hero */
    const h1 = document.querySelector('.result-hero h1');
    if (h1) h1.textContent = `Tu piel es ${E.tipos[P.tipo].toLowerCase()}, con tendencia a ${p1.corto}`;
    const parrafo = document.querySelector('.result-hero h1 + p');
    if (parrafo) {
      const extraPreoc = (P.preoc2 && P.preoc2 !== P.preoc1 && E.preoc[P.preoc2])
        ? `, y también quieres ${E.preoc[P.preoc2].largo}` : '';
      const extraSol = P.spfPrioridad ? ' Con tu exposición solar, la protección diaria es prioritaria.' : '';
      parrafo.textContent = `Detectamos ${p1.largo}${extraPreoc}.${extraSol} Aquí está la rutina pensada específicamente para ti.`;
    }
    const tags = document.querySelector('.skin-profile-tags');
    if (tags) {
      const lista = [
        capitalizar(E.tiposLargo[P.tipo]),
        capitalizar(p1.largo),
        `Sensibilidad ${E.sensibilidad[P.sensibilidad].toLowerCase()}`,
        `Exposición solar ${E.sol[P.sol]}`
      ];
      tags.innerHTML = lista.map((t) => `<span class="badge badge-accent">${t}</span>`).join('');
    }

    /* Ficha de perfil */
    const filas = document.querySelectorAll('.profile-row');
    const valores = [
      E.tipos[P.tipo],
      capitalizar(p1.largo),
      E.sensibilidad[P.sensibilidad],
      E.hidratacion[P.tipo],
      E.sol[P.sol]
    ];
    filas.forEach((fila, i) => {
      const spans = fila.querySelectorAll('span');
      if (spans.length >= 2 && valores[i] !== undefined) spans[1].textContent = valores[i];
    });

    /* Resumen diagnóstico */
    const resH3 = document.querySelector('.diagnostic-summary h3');
    if (resH3) resH3.textContent = CONFIG.resumen.titulos[P.preoc1] || '';
    const resP = document.querySelector('.summary-copy p');
    if (resP) resP.textContent = CONFIG.resumen.textos[P.preoc1] || '';

    const metricas = document.querySelectorAll('.metrics-grid .metric');
    const valoresMetricas = [
      { span: 'Señal', strong: p1.senal, small: capitalizar(p1.corto) },
      { span: 'Actitud', strong: E.actitud[P.sensibilidad], small: E.detalleActitud[P.sensibilidad] },
      P.spfPrioridad
        ? { span: 'Prioridad', strong: 'SPF', small: 'Protección diaria' }
        : { span: 'Prioridad', strong: 'Constancia', small: 'Rutina diaria' }
    ];
    metricas.forEach((m, i) => {
      const v = valoresMetricas[i];
      if (!v) return;
      const sp = m.querySelector('span'), st = m.querySelector('strong'), sm = m.querySelector('small');
      if (sp) sp.textContent = v.span;
      if (st) st.textContent = v.strong;
      if (sm) sm.textContent = v.small;
    });

    /* Panel experto */
    const listaExp = document.querySelector('.expert-list');
    if (listaExp) {
      const tratamiento = rutina.ids.length
        ? (armarRutina(P).manana.find((e) => e.prod.paso === 'tratamiento') || {}).prod?.nombre || 'tu sérum' : 'tu sérum';
      const detalleSens = CONFIG.detallesSensibilidad[P.sensibilidad] || '';
      const detallePasos = rutina.ids.length <= 4 ? CONFIG.detallesPasos.corta
        : rutina.ids.length === 5 ? CONFIG.detallesPasos.media
        : CONFIG.detallesPasos.completa;
      const tokens = {
        '{tipoLargo}': E.tiposLargo[P.tipo],
        '{preoc1Largo}': p1.largo,
        '{senal}': (p1.senal || '').toLowerCase(),
        '{sensibilidad}': (E.sensibilidad[P.sensibilidad] || '').toLowerCase(),
        '{detalleSens}': detalleSens,
        '{nProductos}': String(rutina.ids.length),
        '{detallePasos}': detallePasos,
        '{tratamiento}': tratamiento
      };
      const items = CONFIG.expertos.map((t) => {
        let out = t;
        Object.keys(tokens).forEach((k) => { out = out.split(k).join(tokens[k]); });
        return `<li>${out}</li>`;
      });
      listaExp.innerHTML = items.join('');
    }

    /* Rutinas AM / PM */
    const bloques = document.querySelectorAll('.routine-block');
    const pintar = (bloque, entradas) => {
      const grid = bloque.querySelector('.products-grid');
      if (!grid) return;
      if (!entradas || entradas.length === 0) { bloque.style.display = 'none'; return; }
      bloque.style.display = '';
      grid.innerHTML = entradas.map((e, i) => cardHTML(e, i + 1)).join('');
    };
    if (bloques[0]) pintar(bloques[0], rutina.manana);
    if (bloques[1]) pintar(bloques[1], rutina.noche);

    /* Tip adaptativo */
    const tip = CONFIG.tips.find((t) => { try { return t.cond(P, rutina); } catch (e) { return false; } });
    const tipP = document.querySelector('.tip-box p');
    if (tip && tipP) {
      let texto = tip.texto;
      texto = texto.split('{frecuenciaBHA}').join(CONFIG.exfoliacion.frecuenciaPorTolerancia[P.tolerancia] || '');
      tipP.innerHTML = '<strong>Consejo de nuestras especialistas:</strong> ' + texto;
    }

    /* CTA rutina completa */
    const ctaEyebrow = document.querySelector('.routine-cta .eyebrow');
    if (ctaEyebrow) ctaEyebrow.textContent = `Rutina completa — ${rutina.ids.length} productos`;
    const ctaTotal = document.querySelector('.routine-cta .rc-total');
    if (ctaTotal) ctaTotal.textContent = formatear(rutina.total);

    /* Match en la página de producto */
    const ring = document.querySelector('.match-ring');
    if (ring) {
      const nombre = document.querySelector('.product-info h1')?.textContent.trim();
      const prod = CATALOGO.find((p) => p.nombre === nombre);
      if (prod) {
        const pct = matchProducto(P, prod);
        ring.style.background = `conic-gradient(var(--color-primary) 0 ${pct}%, var(--color-border) ${pct}% 100%)`;
        const span = ring.querySelector('span');
        if (span) span.textContent = pct + '%';
      }
    }
  };

  /* ==================== AUTO-EJECUCIÓN ==================== */
  try {
    /* diagnostico.html: al terminar el quiz, calcular y guardar */
    if (document.querySelector('.quiz-final')) {
      document.querySelectorAll('.finish-step').forEach((btn) => {
        btn.addEventListener('click', () => {
          try { renderResumenQuiz(guardar(leerRespuestas())); }
          catch (e) { console.warn('Clinical Skin: no se pudo calcular el diagnóstico', e); }
        });
      });
    }

    /* resultado.html / producto.html: si hay perfil guardado, renderizar */
    if (document.querySelector('.result-hero') || document.querySelector('.match-ring')) {
      const data = cargar();
      if (data) {
        try { renderResultado(data); }
        catch (e) { console.warn('Clinical Skin: no se pudo renderizar el resultado', e); }
      }
    }
  } catch (e) { console.warn('Clinical Skin: error de lógica', e); }

  return { CONFIG, CATALOGO, VALORES, calcularPerfil, armarRutina, matchProducto, guardar, cargar, limpiar };
})();
