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
    prioridadesExtra: ['exfoliante', 'refuerzo', 'reparacion'],

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
        texto: 'Introduce el exfoliante solo {frecuenciaBHA} las primeras dos semanas para permitir que tu piel se adapte.'
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
      id: 'eucerin-gel-limpiador-dermopure-ultra-150ml', nombre: 'EUCERIN Gel Limpiador DermoPure Ultra 150ml', paso: 'limpieza',
      tipos: ['mixta', 'grasa'], preocupaciones: ['acne'], agresividad: 'media',
      frecuencia: 'Mañana y noche', precio: 14490, img: 'img/productos/diag-dermopure-ultra.jpg',
      desc: 'Gel limpiador de uso diario para piel grasa y con impurezas.',
      porque: 'Limpia el exceso de sebo de tu {tipoLargo} sin alterar la barrera: la base para que el resto de la rutina funcione.',
      ficha: 'Gel limpiador de textura transparente que retira impurezas, exceso de sebo y residuos del día sin resecar. Deja la piel fresca y equilibrada, sin sensación de tirantez.',
      modoUso: 'Masajea una pequeña cantidad sobre piel húmeda, mañana y noche, durante 30 segundos. Enjuaga con agua tibia y seca con toques suaves.',
      ingredientes: 'Ácido salicílico, AHA suaves y glicerina.'
    },
    {
      id: 'avene-eau-agua-termal-avene-calmante-desensibilizante-y-suavizante-300', nombre: 'Eau Agua Termal Avène Calmante, Desensibilizante y Suavizante 300ml', paso: 'limpieza',
      tipos: ['seca', 'sensible'], preocupaciones: ['deshidratacion'], agresividad: 'baja',
      frecuencia: 'Mañana y noche', precio: 15990, img: 'img/productos/diag-agua-termal-300.jpg',
      desc: 'Agua termal en bruma: limpia y calma sin jabón.',
      porque: 'Calma y limpia tu {tipoLargo} sin jabón ni fricción: una limpieza que respeta la barrera.',
      ficha: 'Agua termal microfinada en bruma que limpia suavemente, desensibiliza y refresca. Ideal para pieles reactivas y como paso final de una rutina de doble limpieza.',
      modoUso: 'Rocía sobre rostro y cuello mañana y noche y retira con un algodón suave o deja secar sin enjuagar.',
      ingredientes: 'Agua termal de Avène, rica en oligoelementos.'
    },
    {
      id: 'eucerin-crema-facial-dermopure-accion-intensiva-noche-40ml', nombre: 'Crema Facial Dermopure Acción Intensiva Noche 40ml', paso: 'tratamiento',
      tipos: ['mixta', 'grasa'], preocupaciones: ['acne'], agresividad: 'media',
      frecuencia: 'Solo de noche', precio: 32990, img: 'img/productos/diag-dermopure-noche.jpg',
      desc: 'Tratamiento nocturno con hidroxiácidos para piel grasa con tendencia al acné.',
      porque: 'Los hidroxiácidos renuevan mientras duermes y regulan el sebo: ataca tu {preoc1Largo} sin sobretratar.',
      ficha: 'Crema de noche con complejo de hidroxiácidos al 10% (glicólico, salicílico y polihidroxi) que destapa poros, elimina células muertas y reduce granos, puntos negros y marcas post-acné mientras controla el brillo.',
      modoUso: 'Solo de noche: aplica una vez al día sobre piel limpia y seca. De día, acompaña siempre con protector solar.',
      ingredientes: 'Complejo de hidroxiácidos al 10%, glicerina y pantenol.'
    },
    {
      id: 'vichy-mineral-89-serum-facial-hidratante-50ml', nombre: 'Vichy Minéral 89 Sérum Facial Hidratante 50ml', paso: 'tratamiento',
      tipos: ['todo'], preocupaciones: ['deshidratacion'], agresividad: 'baja',
      frecuencia: 'Mañana y noche', precio: 29990, img: 'img/productos/diag-mineral89.jpg',
      desc: 'Booster hidratante con 89% de agua termal y ácido hialurónico.',
      porque: 'Ácido hialurónico que atrapa agua en tu {tipoLargo}: la respuesta directa a tu {preoc1Largo}.',
      ficha: 'Sérum gel con 89% de agua termal volcánica y ácido hialurónico de bajo peso molecular: fortalece la barrera, aporta luminosidad y deja la piel jugosa desde las primeras aplicaciones.',
      modoUso: 'Aplica 2-3 gotas sobre piel ligeramente húmeda, mañana y noche, antes de tu crema.',
      ingredientes: 'Agua termal Vichy al 89% y ácido hialurónico.'
    },
    {
      id: 'vichy-liftactiv-serum-collagen-specialist-16', nombre: 'Liftactiv Sérum Collagen Specialist 16', paso: 'tratamiento',
      tipos: ['todo'], preocupaciones: ['manchas', 'edad'], agresividad: 'baja',
      frecuencia: 'Mañana y noche', precio: 39990, img: 'img/productos/diag-liftactiv.jpg',
      desc: 'Sérum reafirmante con péptidos para densidad y luminosidad.',
      porque: 'Péptidos que estimulan el colágeno: trabajan tu {preoc1Largo} devolviendo densidad y luz.',
      ficha: 'Sérum con péptidos de colágeno y rhamnosa que mejora la densidad de la piel, suaviza líneas y aporta luminosidad con uso continuo. Textura fluida de rápida absorción.',
      modoUso: 'Aplica 3-4 gotas por la mañana sobre rostro limpio, antes de la crema y del protector solar.',
      ingredientes: 'Péptidos de colágeno y rhamnosa.'
    },
    {
      id: 'eucerin-serum-facial-hyaluron-filler-elasticity-3d-30ml', nombre: 'EUCERIN Serum Facial Hyaluron-Filler Elasticity 3D 30ml', paso: 'tratamiento',
      tipos: ['todo'], preocupaciones: ['edad', 'manchas'], agresividad: 'media',
      frecuencia: 'Mañana y noche', precio: 39990, img: 'img/productos/diag-elasticity3d.jpg',
      desc: 'Sérum concentrado con efecto relleno y efecto lifting.',
      porque: 'Ácido hialurónico de triple acción que rellena desde el interior: tu aliado contra tu {preoc1Largo}.',
      ficha: 'Sérum antiarrugas de alta concentración que combina ácido hialurónico con activos reafirmantes: rellena las arrugas visibles, mejora la elasticidad y reafirma el contorno facial con uso diario.',
      modoUso: 'Aplica sobre rostro limpio mañana y noche, con un suave masaje ascendente, antes de la crema.',
      ingredientes: 'Ácido hialurónico y activos reafirmantes.'
    },
    {
      id: 'eucerin-crema-de-noche-hyaluron-filler-elasticity-facial-50ml', nombre: 'Crema de Noche Hyaluron-Filler Elasticity Facial 50ml', paso: 'hidratacion',
      tipos: ['seca', 'sensible'], preocupaciones: ['deshidratacion', 'edad'], agresividad: 'baja',
      frecuencia: 'Mañana y noche', precio: 32990, img: 'img/productos/diag-crema-noche.jpg',
      desc: 'Nutrición intensiva con ácido hialurónico y Arctiin.',
      porque: 'Nutrición y regeneración nocturna para tu {tipoLargo}: despiertas con la piel más elástica.',
      ficha: 'Crema de noche anti-edad para piel madura con ácido hialurónico de alto y bajo peso molecular, Arctiin y creatina: regenera durante el sueño, mejora la elasticidad y aporta hidratación intensiva con textura rica.',
      modoUso: 'Aplica por la noche sobre rostro y cuello limpios; por la mañana, una avellana si tu piel lo pide.',
      ingredientes: 'Ácido hialurónico, Arctiin y creatina.'
    },
    {
      id: 'eucerin-repuesto-crema-facial-eucerin-hyaluron-filler-refill-dia-50ml', nombre: 'Repuesto Crema Facial Eucerin Hyaluron Filler Refill Dia 50ml', paso: 'hidratacion',
      tipos: ['mixta', 'grasa'], preocupaciones: ['deshidratacion', 'edad'], agresividad: 'baja',
      frecuencia: 'Mañana y noche', precio: 22990, img: 'img/productos/diag-repuesto-dia.jpg',
      desc: 'Hidratante de día de textura ligera, no obstruye poros.',
      porque: 'Hidratación ligera para tu {tipoLargo}: comodidad todo el día sin apagar la zona T.',
      ficha: 'Crema hidratante de textura ligera con ácido hialurónico que suaviza las líneas de deshidratación y deja la piel confortable sin sensación grasa. En formato recargable.',
      modoUso: 'Aplica mañana y noche sobre rostro limpio, después del sérum y antes del protector solar.',
      ingredientes: 'Ácido hialurónico, glicerina y pantenol.'
    },
    {
      id: 'eucerin-protector-solar-hydro-fluid-facial-ultra-light-fps50-50ml', nombre: 'EUCERIN Protector Solar Hydro Fluid Facial Ultra Light FPS50+ 50ml', paso: 'proteccion',
      tipos: ['todo'], preocupaciones: ['manchas', 'edad'], agresividad: 'baja',
      frecuencia: 'Cada mañana', precio: 15990, img: 'img/productos/diag-hydro-fluid.jpg',
      desc: 'Fluido facial ultraligero con FPS50+ de amplio espectro.',
      porque: 'Protección diaria: el mejor antienvejecimiento y el aliado de cualquier rutina.',
      ficha: 'Fluido solar de textura ultraligera con protección UVA/UVB FPS50+: no deja residuo blanco ni sensación grasa y sirve de último paso de la mañana. Resiste sudor y agua.',
      modoUso: 'Último paso de la mañana, con generosidad (2 dedos para rostro y cuello). Reaplica cada 3 horas si te expones al sol.',
      ingredientes: 'Filtros UVA/UVB de amplio espectro y glicerina.'
    },
    {
      id: 'lrp-effaclar-gel-m-limpiador-purificante-400ml', nombre: 'Effaclar Gel +M Limpiador Purificante 400ml', paso: 'exfoliacion',
      tipos: ['mixta', 'grasa'], preocupaciones: ['acne'], agresividad: 'media',
      frecuencia: 'De noche', precio: 19990, img: 'img/productos/diag-effaclar.jpg',
      desc: 'Gel exfoliante con LHA y AHA que desobstruye poros.',
      porque: 'Exfolía mientras duermes sin fricción: desobstruye poros y previene nuevos brotes.',
      ficha: 'Gel limpiador exfoliante con LHA y ácido glicólico que renueva la superficie, destapa los poros y afina la textura sin grano. Uso nocturno escalonado según tolerancia.',
      modoUso: 'Noche: 2-3 veces por semana en lugar de tu limpiador habitual, dejando en contacto un minuto antes de enjuagar.',
      ingredientes: 'LHA y ácido glicólico, glicerina.'
    },
    {
      id: 'eucerin-unguento-reparador-aquaphor-55ml', nombre: 'EUCERIN Ungüento Reparador Aquaphor 55ml', paso: 'hidratacion',
      tipos: ['seca', 'sensible'], preocupaciones: ['deshidratacion'], agresividad: 'baja',
      frecuencia: 'Solo de noche', precio: 10990, img: 'img/productos/diag-aquaphor.jpg',
      desc: 'Ungüento reparador de barrera para zonas muy secas o irritadas.',
      porque: 'Repara y sella durante la noche: ideal si tu piel tiende a reaccionar o a resecarse.',
      ficha: 'Ungüento reparador con panthenol, glicerina y bisabolol que forma una película protectora semioclusiva: acelera la regeneración de la piel seca o irritada y alivia la tirantez.',
      modoUso: 'Solo de noche, en capa fina sobre zonas secas o como último paso de sellado en rostro y cuello.',
      ingredientes: 'Panthenol, glicerina y bisabolol.'
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

    /* SKU reales del catálogo: producto.html?id=<sku> resuelve la ficha y el
       puente del diagnóstico mapea nombre → id con estos mismos productos. */
    const K = {
      limpiezaGrasa: 'eucerin-gel-limpiador-dermopure-ultra-150ml',
      limpiezaSuave: 'avene-eau-agua-termal-avene-calmante-desensibilizante-y-suavizante-300',
      acne: 'eucerin-crema-facial-dermopure-accion-intensiva-noche-40ml',
      hidratacionSerum: 'vichy-mineral-89-serum-facial-hidratante-50ml',
      manchas: 'vichy-liftactiv-serum-collagen-specialist-16',
      edad: 'eucerin-serum-facial-hyaluron-filler-elasticity-3d-30ml',
      cremaSeca: 'eucerin-crema-de-noche-hyaluron-filler-elasticity-facial-50ml',
      cremaGrasa: 'eucerin-repuesto-crema-facial-eucerin-hyaluron-filler-refill-dia-50ml',
      protector: 'eucerin-protector-solar-hydro-fluid-facial-ultra-light-fps50-50ml',
      exfoliante: 'lrp-effaclar-gel-m-limpiador-purificante-400ml',
      reparacion: 'eucerin-unguento-reparador-aquaphor-55ml'
    };

    /* --- Core (siempre entra) --- */
    poner(esSeca || P.tipo === 'sensible' ? K.limpiezaSuave : K.limpiezaGrasa, 'ambos');

    const tratMap = { acne: K.acne, deshidratacion: K.hidratacionSerum, manchas: K.manchas, edad: K.edad };
    const slotTrat = P.preoc1 === 'acne' ? 'pm' : 'ambos';
    poner(tratMap[P.preoc1], slotTrat);

    poner(esSeca || P.tipo === 'sensible' ? K.cremaSeca : K.cremaGrasa, 'ambos');
    poner(K.protector, 'am');

    /* --- Extras por prioridad (respetando el presupuesto) --- */
    const EXTRAS = {
      exfoliante: () => {
        const activa = CONFIG.exfoliacion.activadaPor.some((c) => P.preocupaciones.includes(c));
        const okTipo = CONFIG.exfoliacion.tiposPermitidos.includes(P.tipo);
        const okSens = P.sensibilidad !== CONFIG.exfoliacion.bloqueadaSiSensibilidad;
        if (!(activa && okTipo && okSens)) return null;
        const e = poner(K.exfoliante, 'pm');
        if (e) {
          e.freq = CONFIG.exfoliacion.frecuenciaPorTolerancia[P.tolerancia] || e.freq;
          exfolia = true;
        }
        return e;
      },

      refuerzo: () => {
        if (!P.preoc2 || P.preoc2 === P.preoc1 || P.preocupaciones.length < 2) return null;
        const mapa = {
          acne: [K.acne, 'pm'],
          deshidratacion: [K.hidratacionSerum, 'ambos'],
          manchas: [K.manchas, 'ambos'],
          edad: [K.edad, 'ambos']
        }[P.preoc2];
        if (!mapa) return null;
        if (poner(mapa[0], mapa[1])) return mapa[0];
        const alt = {
          deshidratacion: [K.cremaSeca, 'ambos'],
          manchas: [K.hidratacionSerum, 'ambos'],
          edad: [K.manchas, 'ambos'],
          acne: [K.limpiezaGrasa, 'pm']
        }[P.preoc2];
        return alt ? poner(alt[0], alt[1]) : null;
      },

      reparacion: () =>
        (esSensiblePerfil || exfolia || esSeca)
          ? poner(K.reparacion, 'pm')
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
        <h3>${entrada.prod.nombre}</h3>
        <p class="desc">${entrada.porque}</p>
        <div class="product-footer"><span class="price">${formatear(entrada.prod.precio)}</span><a href="producto.html?id=${entrada.prod.id}" class="btn btn-ghost btn-sm">Ver</a></div>
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

  };

  /* % de compatibilidad en producto.html (también lo llama js/compra.js tras cambiar ?id) */
  const renderMatch = (prod) => {
    const data = cargar();
    if (!data || !prod) return;
    const P = data.perfil;
    const pct = matchProducto(P, prod);
    const ring = document.querySelector('.match-ring');
    if (ring) {
      ring.style.background = `conic-gradient(var(--color-primary) 0 ${pct}%, var(--color-border) ${pct}% 100%)`;
      const span = ring.querySelector('span');
      if (span) span.textContent = pct + '%';
    }
    const sub = document.querySelector('[data-match-sub]');
    if (sub) {
      const E = CONFIG.etiquetas;
      const preoc = E.preoc[P.preoc1];
      sub.textContent = `Según tu diagnóstico: ${E.tiposLargo[P.tipo]} con tendencia a ${preoc ? preoc.corto : ''}.`;
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

    /* resultado.html: renderizar la rutina personalizada */
    if (document.querySelector('.result-hero')) {
      const data = cargar();
      if (data) {
        try { renderResultado(data); }
        catch (e) { console.warn('Clinical Skin: no se pudo renderizar el resultado', e); }
      }
    }
    /* producto.html: % de compatibilidad (compra.js lo vuelve a llamar tras cambiar ?id) */
    if (document.querySelector('.match-ring')) {
      try {
        const prod = CATALOGO.find((p) => p.nombre === document.querySelector('.product-info h1')?.textContent.trim());
        if (prod) renderMatch(prod);
      } catch (e) { console.warn('Clinical Skin: no se pudo calcular el match', e); }
    }
  } catch (e) { console.warn('Clinical Skin: error de lógica', e); }

  return { CONFIG, CATALOGO, VALORES, calcularPerfil, armarRutina, matchProducto, renderMatch, guardar, cargar, limpiar };
})();

/* Exponer en window para que js/compra.js pueda usar el catálogo */
window.CS_DIAG = CS_DIAG;
