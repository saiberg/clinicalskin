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

    /* Cuántos productos únicos soporta cada perfil (rutina avanzada) */
    pasosPorRutina: { ninguna: 4, basica: 4, cambiante: 5, multi: 6 },

    /* Presupuesto de pasos de la rutina básica (siempre 3-4: esencial) */
    pasosRutinaBasica: 4,

    /* Tolerancia a activos: puntos por tipo + ajustes por sensibilidad */
    toleranciaPorTipo: { normal: 2, mixta: 2, grasa: 2, seca: 1, sensible: 0 },
    ajustesTolerancia: { sensibilidadAlta: -2, sensibilidadMedia: -1 },
    umbralesTolerancia: { alta: 2, media: 1 }, // >= alta | >= media | resto baja

    /* Exfoliación (BHA) */
    exfoliacion: {
      activadaPor: ['acne', 'imperfecciones', 'poros', 'sebo'],
      tiposPermitidos: ['normal', 'mixta', 'grasa'],
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

    /* Análisis visual (IA fotográfica futura). Deshabilitado por defecto:
       el test funciona solo con el cuestionario. Cuando se conecte un
       proveedor, se registra con CS_DIAG.analisisVisual.registrar(fn). */
    analisisVisual: {
      habilitado: false,   // se activa al registrar un analizador
      peso: 0.5,           // cuánto pesa el visual frente al cuestionario (0..1)
      fotoOpcional: true,  // la foto nunca es obligatoria
      maxMB: 8             // tamaño máximo de foto aceptado
    },

    /* Compatibilidad por producto: base + coincidencias, con tope */
    match: { base: 85, tipo: 8, preocupacion: 10, tope: 99 },

    /* Q5 (objetivo) reutiliza el enum de preocupaciones (Q2) */
    mapObjetivo: { brillo_poros: 'acne', hidratar_calmar: 'deshidratacion', iluminar: 'manchas', prevenir: 'edad' },

    /* Las 11 preocupaciones del prompt maestro (Etapa 3) → clave interna.
       'acne' se mantiene como alias de 'imperfecciones' por compatibilidad. */
    preocupaciones: {
      hidratacion: { titulo: 'Hidratación', largo: 'deshidratación', corto: 'sequedad', senal: 'Tirantez' },
      luminosidad: { titulo: 'Luminosidad', largo: 'falta de luminosidad', corto: 'opacidad', senal: 'Opacidad' },
      textura: { titulo: 'Textura irregular', largo: 'textura irregular', corto: 'textura', senal: 'Aspereza' },
      poros: { titulo: 'Poros visibles', largo: 'poros visibles', corto: 'poros', senal: 'Poros' },
      sebo: { titulo: 'Exceso de sebo y brillo', largo: 'exceso de sebo', corto: 'brillo', senal: 'Brillo' },
      imperfecciones: { titulo: 'Imperfecciones', largo: 'imperfecciones', corto: 'imperfecciones', senal: 'Brotes' },
      manchas: { titulo: 'Manchas y tono desigual', largo: 'manchas y tono desigual', corto: 'manchas', senal: 'Manchas' },
      lineas: { titulo: 'Líneas de expresión', largo: 'líneas de expresión', corto: 'líneas', senal: 'Líneas' },
      firmeza: { titulo: 'Firmeza y elasticidad', largo: 'pérdida de firmeza', corto: 'firmeza', senal: 'Firmeza' },
      sensibilidad: { titulo: 'Sensibilidad y rojeces', largo: 'sensibilidad y rojeces', corto: 'rojeces', senal: 'Rojeces' },
      contorno: { titulo: 'Contorno de ojos', largo: 'contorno de ojos', corto: 'contorno', senal: 'Contorno' }
    },

    /* Alias de compatibilidad: las claves antiguas del enum de 4 apuntan a las nuevas. */
    aliasPreoc: {
      acne: 'imperfecciones',
      deshidratacion: 'hidratacion',
      edad: 'lineas'
    },

    /* Etiquetas legibles de cada valor */
    etiquetas: {
      tipos: { normal: 'Normal', mixta: 'Mixta', seca: 'Seca', grasa: 'Grasa', sensible: 'Sensible' },
      tiposLargo: { normal: 'piel normal', mixta: 'piel mixta', seca: 'piel seca', grasa: 'piel grasa', sensible: 'piel sensible' },
      sensibilidad: { alta: 'Alta', media: 'Media', baja: 'Baja' },
      actitud: { alta: 'Muy sensible', media: 'Reactiva', baja: 'Resistente' },
      detalleActitud: { alta: 'Cuidado extra', media: 'Sin irritar', baja: 'Bien tolerada' },
      sol: { bajo: 'Baja', moderado: 'Media', alto: 'Alta', reactivo_clima: 'Reactiva al clima' },
      rutina: { basica: 'Básica', multi: 'Varios pasos', cambiante: 'Variable', ninguna: 'Sin rutina fija' },
      hidratacion: { normal: 'Equilibrada', seca: 'Insuficiente', mixta: 'Desbalanceada', grasa: 'Equilibrada', sensible: 'Comprometida' },
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

    /* Copys del resultado (claves = preocupaciones nuevas; alias resueltos en calcularPerfil) */
    resumen: {
      titulos: {
        imperfecciones: 'Equilibrio, no sobretratamiento',
        hidratacion: 'Hidratar desde la base',
        manchas: 'Luz y constancia',
        lineas: 'Prevenir y mantener',
        luminosidad: 'Recuperar la luz',
        textura: 'Suavizar la superficie',
        poros: 'Afinar y purificar',
        sebo: 'Regular el brillo',
        firmeza: 'Recuperar densidad',
        sensibilidad: 'Calmar primero',
        contorno: 'Cuidar la mirada'
      },
      textos: {
        imperfecciones: 'Tu piel presenta brillo, poros y brotes esporádicos. El objetivo no es eliminar el sebo, sino regularlo para que la piel no reaccione ni se vuelva más sensible.',
        hidratacion: 'Tu piel pierde agua más rápido de la que la repone: por eso se siente tirante u opaca. El plan es reparar la barrera y fijar hidratación, sin sobrecargar.',
        manchas: 'Tu tono se está desparejando por sol, marcas o tiempo. Trabajamos con activos que unifican el tono y — fundamental — protección diaria para que no vuelvan.',
        lineas: 'Tu piel pide firmeza y luminosidad. Combinamos antioxidantes, hidratación profunda y protección solar: la base de toda prevención real.',
        luminosidad: 'Tu piel se ve apagada y sin luz. Trabajamos con activos que renuevan la superficie y devuelven el brillo natural, siempre con protección diaria.',
        textura: 'Tu piel tiene una superficie irregular. Combinamos renovación suave e hidratación para afinar la textura sin agredir la barrera.',
        poros: 'Tus poros se ven marcados. Trabajamos con activos purificantes que los limpian y afinan, sin resecar la piel.',
        sebo: 'Tu piel produce más sebo del necesario. El objetivo es regularlo, no eliminarlo, para evitar el efecto rebote y la sensación de tirantez.',
        firmeza: 'Tu piel pide densidad y elasticidad. Combinamos activos reafirmantes con hidratación y protección solar para mantenerla firme.',
        sensibilidad: 'Tu piel reacciona con facilidad. Priorizamos fórmulas calmantes y respetuosas con la barrera, evitando activos agresivos.',
        contorno: 'El contorno de tus ojos necesita un cuidado específico. Trabajamos la zona con activos que suavizan y descongestionan.'
      },
      finQuiz: {
        imperfecciones: 'Basado en tus respuestas, tu piel necesita equilibrio: controlar el brillo y las imperfecciones sin resecar ni sobretratar.',
        hidratacion: 'Basado en tus respuestas, tu piel necesita hidratación de verdad: reparar la barrera y reducir la tirantez.',
        manchas: 'Basado en tus respuestas, tu piel necesita unificar el tono y protegerse a diario.',
        lineas: 'Basado en tus respuestas, tu piel necesita prevenir: firmeza, luminosidad y protección constante.',
        luminosidad: 'Basado en tus respuestas, tu piel necesita recuperar luminosidad y renovarse.',
        textura: 'Basado en tus respuestas, tu piel necesita suavizar su superficie y afinar la textura.',
        poros: 'Basado en tus respuestas, tu piel necesita purificar y afinar los poros.',
        sebo: 'Basado en tus respuestas, tu piel necesita regular el sebo sin resecarse.',
        firmeza: 'Basado en tus respuestas, tu piel necesita recuperar firmeza y elasticidad.',
        sensibilidad: 'Basado en tus respuestas, tu piel necesita calmarse y reforzar su barrera.',
        contorno: 'Basado en tus respuestas, el contorno de tus ojos necesita un cuidado específico.'
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

  /* ==================== SINCRONIZACIÓN CON WOOCOMMERCE ==================== */
  /*
   * El CATALOGO de arriba es el respaldo estático (11 productos). Cuando el
   * módulo cliente js/catalogo.js está disponible (endpoint cs_catalogo),
   * se fusionan los 42 productos reales con sus atributos cosméticos y stock.
   * Los productos del endpoint reemplazan a los estáticos por id (SKU) y se
   * agregan los que falten. Los productos agotados quedan marcados con
   * stock.en_stock = false para que el motor no los recomiende.
   */
  const sincronizarCatalogo = (listaEndpoint) => {
    if (!Array.isArray(listaEndpoint) || !listaEndpoint.length) return 0;
    let fusionados = 0;
    listaEndpoint.forEach((p) => {
      if (!p || !p.id) return;
      const normalizado = {
        id: p.id,
        product_id: p.product_id || 0,
        nombre: p.nombre,
        paso: p.paso || '',
        tipos: Array.isArray(p.tipos) ? p.tipos : [],
        preocupaciones: Array.isArray(p.preocupaciones) ? p.preocupaciones : [],
        agresividad: p.intensidad || 'baja',
        frecuencia: p.frecuencia || '',
        precio: Number(p.precio) || 0,
        img: p.img || '',
        desc: p.desc || '',
        porque: p.porque || '',
        ficha: p.ficha || '',
        modoUso: p.modo_uso || '',
        ingredientes: p.ingredientes || '',
        categorias: Array.isArray(p.categorias) ? p.categorias : [],
        stock: p.stock || null,
        url: p.url || ''
      };
      const idx = CATALOGO.findIndex((x) => x.id === normalizado.id);
      if (idx === -1) CATALOGO.push(normalizado);
      else CATALOGO[idx] = Object.assign({}, CATALOGO[idx], normalizado);
      fusionados++;
    });
    return fusionados;
  };

  /* Si el catálogo en tiempo real ya está cargado, se sincroniza al instante.
     Si aún no lo está (catalogo.js se imprime después en el footer), espera
     hasta 3 s a que aparezca window.CS_CATALOGO. */
  const sincronizarSiDisponible = () => {
    const intentar = () => {
      if (window.CS_CATALOGO && typeof window.CS_CATALOGO.productos === 'function') {
        return window.CS_CATALOGO.productos().then((lista) => sincronizarCatalogo(lista)).catch(() => 0);
      }
      return null;
    };
    const ya = intentar();
    if (ya) return ya;
    return new Promise((resolve) => {
      let intentos = 0;
      const timer = setInterval(() => {
        const r = intentar();
        if (r) { clearInterval(timer); r.then(resolve); return; }
        if (++intentos > 30) { clearInterval(timer); resolve(0); }
      }, 100);
    });
  };

  /* Qué responde cada opción del quiz (por paso e índice de opción).
     Si en el HTML se agrega data-value a una opción, ese valor manda.
     El quiz ampliado (Fase 3) puede enviar q2 como array (selección múltiple)
     y q6 con los hábitos; el motor acepta ambos formatos. */
  const VALORES = {
    1: ['normal', 'mixta', 'seca', 'grasa', 'sensible'],
    2: ['hidratacion', 'luminosidad', 'textura', 'poros', 'sebo', 'imperfecciones', 'manchas', 'lineas', 'firmeza', 'sensibilidad', 'contorno'],
    3: ['basica', 'multi', 'cambiante', 'ninguna'],
    4: ['bajo', 'moderado', 'alto', 'reactivo_clima'],
    5: ['brillo_poros', 'hidratar_calmar', 'iluminar', 'prevenir']
  };

  /* ==================== PERFIL ==================== */

  /** Resuelve una clave de preocupación antigua (acne/deshidratacion/edad) a la nueva. */
  const normalizarPreoc = (clave) => CONFIG.aliasPreoc[clave] || clave;

  /** Lista de preocupaciones (array) desde q2, que puede ser string o array. */
  const listaPreocupaciones = (r) => {
    let bruto = r.q2;
    if (bruto === undefined || bruto === null || bruto === '') bruto = [];
    if (!Array.isArray(bruto)) bruto = [bruto];
    const limpias = bruto
      .map((x) => String(x || '').trim())
      .filter(Boolean)
      .map(normalizarPreoc)
      .filter((x) => CONFIG.preocupaciones[x]);
    /* Sin duplicados, preservando orden. */
    return limpias.filter((x, i) => limpias.indexOf(x) === i);
  };

  /**
   * Perfil derivado. Acepta el modelo antiguo (q1..q5) y el ampliado
   * (q1, q2 múltiple, q3, q4, q5, q6 hábitos). Todo lo que no venga
   * tiene un valor por defecto coherente.
   */
  const calcularPerfil = (r) => {
    r = r || {};
    const tipo = CONFIG.etiquetas.tipos[r.q1] ? r.q1 : 'normal';

    const puntosSens = (tipo === 'sensible' ? 1 : 0) + (r.q4 === 'reactivo_clima' ? 1 : 0);
    const sensibilidad = puntosSens >= 2 ? 'alta' : puntosSens === 1 ? 'media' : 'baja';

    let tol = CONFIG.toleranciaPorTipo[tipo] ?? 1;
    if (sensibilidad === 'alta') tol += CONFIG.ajustesTolerancia.sensibilidadAlta;
    if (sensibilidad === 'media') tol += CONFIG.ajustesTolerancia.sensibilidadMedia;
    const u = CONFIG.umbralesTolerancia;
    const tolerancia = tol >= u.alta ? 'alta' : tol >= u.media ? 'media' : 'baja';

    /* Preocupaciones: q2 (múltiple) + q5 (objetivo, opcional). */
    const preocupaciones = listaPreocupaciones(r);
    const objetivoPreoc = CONFIG.mapObjetivo[r.q5] ? normalizarPreoc(CONFIG.mapObjetivo[r.q5]) : null;
    if (objetivoPreoc && CONFIG.preocupaciones[objetivoPreoc] && preocupaciones.indexOf(objetivoPreoc) === -1) {
      preocupaciones.push(objetivoPreoc);
    }

    /* preoc1 = la principal (primera elegida); preoc2 = la siguiente distinta. */
    const preoc1 = preocupaciones[0] || 'hidratacion';
    const preoc2 = preocupaciones[1] || null;

    /* Hábitos (Etapa 4). q6 puede ser objeto o string. */
    const habitos = typeof r.q6 === 'object' && r.q6 ? r.q6 : {};
    const sinFragancia = habitos.sin_fragancia === true || habitos.sin_fragancia === 'si';
    const rutinaCompleta = habitos.preferencia === 'completa' || r.q3 === 'multi';

    return {
      tipo,
      preoc1,
      preoc2,
      preocupaciones,
      rutina: r.q3 || 'ninguna',
      sol: r.q4 || 'bajo',
      sensibilidad,
      tolerancia,
      pasos: CONFIG.pasosPorRutina[r.q3] ?? 4,
      hidratacion: CONFIG.etiquetas.hidratacion[tipo] || '—',
      spfPrioridad: CONFIG.spf.solConPrioridad.includes(r.q4),
      sinFragancia,
      rutinaCompleta,
      habitos
    };
  };

  /* ==================== INDICADORES (puntuaciones documentadas) ==================== */
  /*
   * Cada indicador es 0..100 y se calcula con reglas explícitas sobre las
   * respuestas. Si no hay información suficiente, el indicador es null
   * (no se inventa un valor). Documentado en docs/logica-diagnostico.md.
   *
   * Base por tipo de piel (hidratación / sebo / sensibilidad):
   *   normal:  hidra 70, sebo 50, sens 20
   *   seca:    hidra 30, sebo 25, sens 45
   *   grasa:   hidra 55, sebo 85, sens 25
   *   mixta:   hidra 55, sebo 65, sens 35
   *   sensible:hidra 45, sebo 40, sens 80
   * Ajustes:
   *   - preoc 'hidratacion'  → hidra −15
   *   - preoc 'sebo'/'imperfecciones' → sebo +10
   *   - preoc 'sensibilidad' → sens +10
   *   - sol 'alto' → sol 90; 'moderado' → 60; 'bajo' → 25; 'reactivo_clima' → 55
   *   - reactivo_clima → sens +10
   *   - tolerancia alta/media/baja → tol 85/60/35 (no depende de tipo)
   */
  const calcularIndicadores = (P) => {
    const base = {
      normal: { hidra: 70, sebo: 50, sens: 20 },
      seca: { hidra: 30, sebo: 25, sens: 45 },
      grasa: { hidra: 55, sebo: 85, sens: 25 },
      mixta: { hidra: 55, sebo: 65, sens: 35 },
      sensible: { hidra: 45, sebo: 40, sens: 80 }
    }[P.tipo] || { hidra: 60, sebo: 50, sens: 40 };

    const clamp = (n) => Math.max(0, Math.min(100, Math.round(n)));
    const tiene = (k) => (P.preocupaciones || []).indexOf(k) !== -1;

    let hidra = base.hidra;
    let sebo = base.sebo;
    let sens = base.sens;

    if (tiene('hidratacion')) hidra -= 15;
    if (tiene('sebo') || tiene('imperfecciones') || tiene('poros')) sebo += 10;
    if (tiene('sensibilidad')) sens += 10;
    if (P.sol === 'reactivo_clima') sens += 10;

    const sol = { bajo: 25, moderado: 60, alto: 90, reactivo_clima: 55 }[P.sol];
    const tol = { alta: 85, media: 60, baja: 35 }[P.tolerancia];

    return {
      hidratacion: clamp(hidra),
      sebo: clamp(sebo),
      sensibilidad: clamp(sens),
      exposicion_solar: sol === undefined ? null : sol,
      tolerancia: tol === undefined ? null : tol
    };
  };

  /* ==================== EXTENSIÓN: ANÁLISIS VISUAL (IA fotográfica futura) ==================== */
  /*
   * CONTRATO DE EXTENSIÓN — no implementa IA. Define cómo se conectará un
   * análisis fotográfico futuro sin reconstruir el test.
   *
   * Un analizador externo es una función async que recibe un File/Blob y
   * devuelve un objeto con esta forma:
   *
   *   {
   *     ok: true,
   *     fuente: 'ia-externa',            // identificador del proveedor
   *     version: '1',
   *     indicadores: {                    // 0..100 o null si no hay dato
   *       hidratacion: 42,
   *       sebo: 68,
   *       sensibilidad: 30,
   *       poros: 55,
   *       manchas: 40,
   *       arrugas: 20,
   *       rojeces: 35,
   *       textura: 60
   *     },
   *     preocupaciones: ['sebo', 'poros'], // claves del enum del test
   *     confianza: 0.72,                  // 0..1
   *     notas: 'texto opcional'
   *   }
   *
   * La foto es SIEMPRE opcional: si no hay analizador registrado o falla,
   * el test sigue funcionando solo con el cuestionario.
   */
  const analisisVisual = {
    /* Analizador registrado (null = no hay IA todavía). */
    analizador: null,
    /* Resultado del último análisis (para resultados/guardado). */
    ultimo: null,

    /** Indica si hay un analizador visual disponible. */
    disponible() {
      return typeof this.analizador === 'function';
    },

    /**
     * Registra un analizador. La firma debe ser:
     *   async (file, ctx) => resultadoVisual
     * donde ctx = { perfil, config }.
     */
    registrar(fn) {
      this.analizador = typeof fn === 'function' ? fn : null;
      return this;
    },

    /** Quita el analizador registrado. */
    limpiar() {
      this.analizador = null;
      this.ultimo = null;
      return this;
    },

    /**
     * Analiza una foto (si hay analizador). Nunca lanza: devuelve
     * { ok:false, motivo } si no está disponible o falla.
     */
    async analizar(file, perfil) {
      if (!this.disponible()) {
        return { ok: false, motivo: 'sin_analizador' };
      }
      if (!file) {
        return { ok: false, motivo: 'sin_foto' };
      }
      try {
        const resultado = await this.analizador(file, { perfil: perfil || null, config: CONFIG });
        if (!resultado || resultado.ok === false) {
          return { ok: false, motivo: 'analisis_fallido', detalle: resultado };
        }
        this.ultimo = resultado;
        return resultado;
      } catch (e) {
        return { ok: false, motivo: 'error', detalle: String(e) };
      }
    },

    /**
     * Fusiona los indicadores visuales con los del cuestionario.
     * Regla: el visual solo rellena lo que el cuestionario no cubre o
     * refuerza con peso w (0..1). Nunca inventa: si no hay dato, se deja
     * el del cuestionario.
     */
    fusionarIndicadores(indicadoresCuestionario, resultadoVisual, w) {
      const peso = typeof w === 'number' ? Math.max(0, Math.min(1, w)) : 0.5;
      const base = Object.assign({}, indicadoresCuestionario || {});
      const vis = (resultadoVisual && resultadoVisual.indicadores) || {};
      const mapa = {
        hidratacion: 'hidratacion',
        sebo: 'sebo',
        sensibilidad: 'sensibilidad',
        poros: 'sebo',
        manchas: 'manchas',
        arrugas: 'lineas',
        rojeces: 'sensibilidad',
        textura: 'textura'
      };
      Object.keys(vis).forEach((k) => {
        const v = vis[k];
        if (typeof v !== 'number' || isNaN(v)) return;
        const destino = mapa[k] || k;
        if (base[destino] === undefined || base[destino] === null) {
          base[destino] = Math.round(v);
        } else {
          base[destino] = Math.round(base[destino] * (1 - peso) + v * peso);
        }
      });
      return base;
    },

    /**
     * Añade al perfil las preocupaciones detectadas visualmente que aún no
     * estén presentes (sin duplicar, respetando el enum del test).
     */
    fusionarPreocupaciones(perfil, resultadoVisual) {
      if (!perfil || !resultadoVisual || !Array.isArray(resultadoVisual.preocupaciones)) {
        return perfil;
      }
      const lista = Array.isArray(perfil.preocupaciones) ? perfil.preocupaciones.slice() : [];
      resultadoVisual.preocupaciones.forEach((p) => {
        const clave = normalizarPreoc(p);
        if (CONFIG.preocupaciones[clave] && lista.indexOf(clave) === -1) {
          lista.push(clave);
        }
      });
      perfil.preocupaciones = lista;
      if (!perfil.preoc2 && lista[1]) perfil.preoc2 = lista[1];
      perfil.analisisVisual = {
        fuente: resultadoVisual.fuente || 'desconocida',
        confianza: typeof resultadoVisual.confianza === 'number' ? resultadoVisual.confianza : null,
        notas: resultadoVisual.notas || ''
      };
      return perfil;
    },

    /**
     * Flujo completo (para uso futuro): analiza la foto y devuelve
     * indicadores + perfil fusionados. Si no hay analizador, devuelve
     * los del cuestionario sin cambios.
     */
    async analizarYFusionar(file, perfil, indicadoresCuestionario) {
      const res = await this.analizar(file, perfil);
      if (!res.ok) {
        return { ok: false, motivo: res.motivo, perfil, indicadores: indicadoresCuestionario };
      }
      const peso = (CONFIG.analisisVisual && CONFIG.analisisVisual.peso) || 0.5;
      const indicadores = this.fusionarIndicadores(indicadoresCuestionario, res, peso);
      const perfilFusionado = this.fusionarPreocupaciones(
        Object.assign({}, perfil),
        res
      );
      return { ok: true, perfil: perfilFusionado, indicadores, visual: res };
    }
  };

  /* ==================== RUTINA ==================== */
  const rellenar = (texto, P) => {
    if (!texto) return '';
    const E = CONFIG.etiquetas;
    const p1 = CONFIG.preocupaciones[P.preoc1] || {};
    const p2 = (P.preoc2 && CONFIG.preocupaciones[P.preoc2]) || p1;
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

  /** ¿El producto está disponible? (sin dato de stock → se asume disponible). */
  const disponible = (prod) => {
    if (!prod) return false;
    if (prod.stock === undefined || prod.stock === null) return true;
    if (typeof prod.stock === 'object') return prod.stock.en_stock !== false;
    return prod.stock !== false;
  };

  const matchProducto = (P, prod) => {
    const c = CONFIG.match;
    let pct = c.base;
    const tipos = prod.tipos || [];
    const preocs = prod.preocupaciones || [];
    if (tipos.indexOf('todo') !== -1 || tipos.indexOf(P.tipo) !== -1) pct += c.tipo;
    if (preocs.some((x) => (P.preocupaciones || []).indexOf(x) !== -1)) pct += c.preocupacion;
    return Math.min(pct, c.tope);
  };

  /*
   * SKU reales del catálogo. producto.html?id=<sku> resuelve la ficha y el
   * puente del diagnóstico mapea nombre → id con estos mismos productos.
   * Se eligen productos que existen en WooCommerce (Fase 1).
   */
  const SKU = {
    limpiezaGrasa: 'eucerin-gel-limpiador-dermopure-ultra-150ml',
    limpiezaSuave: 'avene-eau-agua-termal-avene-calmante-desensibilizante-y-suavizante-300',
    limpiezaNormal: 'lrp-effaclar-gel-m-limpiador-purificante-400ml',
    imperfecciones: 'eucerin-crema-facial-dermopure-accion-intensiva-noche-40ml',
    hidratacion: 'vichy-mineral-89-serum-facial-hidratante-50ml',
    manchas: 'vichy-liftactiv-serum-collagen-specialist-16',
    lineas: 'eucerin-serum-facial-hyaluron-filler-elasticity-3d-30ml',
    firmeza: 'eucerin-serum-facial-epigenetic-anti-edad-30ml',
    luminosidad: 'eucerin-mist-spray-hyaluron-filler-3x-effect-hidratante-150ml',
    contorno: 'eucerin-contorno-de-ojos-eucerin-antiarrugas-hyaluron-filler-15ml',
    cremaSeca: 'eucerin-crema-de-noche-hyaluron-filler-elasticity-facial-50ml',
    cremaGrasa: 'eucerin-repuesto-crema-facial-eucerin-hyaluron-filler-refill-dia-50ml',
    cremaNormal: 'eucerin-crema-de-dia-hyaluron-filler-elasticity-facial-50ml',
    protector: 'eucerin-protector-solar-hydro-fluid-facial-ultra-light-fps50-50ml',
    protectorMatte: 'uriage-protector-solar-matificante-rostro-bariesun-fluido-spf50-50ml-u',
    exfoliante: 'lrp-effaclar-gel-m-limpiador-purificante-400ml',
    reparacion: 'eucerin-unguento-reparador-aquaphor-55ml'
  };

  /** Producto del catálogo por SKU (o null si no está / está agotado). */
  const buscar = (id, respetarStock = true) => {
    const prod = CATALOGO.find((p) => p.id === id);
    if (!prod) return null;
    if (respetarStock && !disponible(prod)) return null;
    return prod;
  };

  /** Primer producto disponible de una lista de SKU candidatos. */
  const primerDisponible = (ids) => {
    for (const id of ids) {
      const p = buscar(id);
      if (p) return p;
    }
    return null;
  };

  /* Categorías que no son de rutina facial (champús, corporales). */
  const CATEGORIAS_NO_FACIALES = ['Champú', 'Cuidado corporal', 'Labios'];

  /** ¿Es un producto apto para la rutina facial? */
  const esFacial = (prod) => {
    const cats = prod.categorias || [];
    if (!cats.length) return true; /* sin dato → se asume facial */
    return !cats.some((c) => CATEGORIAS_NO_FACIALES.indexOf(c) !== -1);
  };

  /** Primer producto disponible y facial de una lista de SKU candidatos. */
  const primerFacialDisponible = (ids) => {
    for (const id of ids) {
      const p = buscar(id);
      if (p && esFacial(p)) return p;
    }
    return null;
  };

  /** Productos disponibles de un paso concreto, ordenados por match. */
  const disponiblesPorPaso = (P, paso) =>
    CATALOGO
      .filter((p) => p.paso === paso && disponible(p) && esFacial(p))
      .sort((a, b) => matchProducto(P, b) - matchProducto(P, a));

  /** Elección de limpieza: preferidos por tipo, luego cualquier limpieza disponible. */
  const candidatosLimpieza = (tipo) => {
    /* Solo productos con paso 'limpieza' (el exfoliante NO es limpieza diaria). */
    const base = {
      seca: [SKU.limpiezaSuave, SKU.limpiezaGrasa],
      sensible: [SKU.limpiezaSuave, SKU.limpiezaGrasa],
      grasa: [SKU.limpiezaGrasa, SKU.limpiezaSuave],
      mixta: [SKU.limpiezaGrasa, SKU.limpiezaSuave],
      normal: [SKU.limpiezaSuave, SKU.limpiezaGrasa]
    }[tipo] || [SKU.limpiezaSuave, SKU.limpiezaGrasa];
    return base;
  };

  /** Elección de crema hidratante: preferidas por tipo, luego cualquier hidratación. */
  const candidatosCrema = (tipo) => {
    return {
      seca: [SKU.cremaSeca, SKU.cremaNormal, SKU.cremaGrasa],
      sensible: [SKU.cremaSeca, SKU.cremaNormal, SKU.cremaGrasa],
      grasa: [SKU.cremaGrasa, SKU.cremaNormal, SKU.cremaSeca],
      mixta: [SKU.cremaGrasa, SKU.cremaNormal, SKU.cremaSeca],
      normal: [SKU.cremaNormal, SKU.cremaGrasa, SKU.cremaSeca]
    }[tipo] || [SKU.cremaNormal, SKU.cremaGrasa, SKU.cremaSeca];
  };

  /** Elección de protector solar: matificante para grasa/mixta, luego el resto. */
  const candidatosProtector = (tipo) => {
    return (tipo === 'grasa' || tipo === 'mixta')
      ? [SKU.protectorMatte, SKU.protector]
      : [SKU.protector, SKU.protectorMatte];
  };

  /** Tratamiento principal según preocupación (con alternativas). */
  const candidatosTratamiento = (preoc) => {
    const mapa = {
      imperfecciones: [SKU.imperfecciones],
      hidratacion: [SKU.hidratacion],
      manchas: [SKU.manchas],
      lineas: [SKU.lineas],
      firmeza: [SKU.firmeza],
      luminosidad: [SKU.luminosidad],
      textura: [SKU.exfoliante],
      poros: [SKU.exfoliante],
      sebo: [SKU.imperfecciones],
      sensibilidad: [SKU.hidratacion],
      contorno: [SKU.contorno]
    };
    return mapa[preoc] || [SKU.hidratacion];
  };

  /**
   * Construye una rutina con un presupuesto de pasos.
   * modo: 'basica' | 'avanzada'.
   *
   * Cada paso intenta una lista de SKU candidatos y usa el primero
   * DISPONIBLE (no agotado). Si ninguno de los preferidos está en stock,
   * cae al mejor producto disponible de ese paso.
   */
  const construirRutina = (P, modo) => {
    const presupuesto = modo === 'basica'
      ? CONFIG.pasosRutinaBasica
      : (CONFIG.pasosPorRutina[P.rutina] ?? 4);

    const elegidos = new Set();
    const manana = [];
    const noche = [];
    let exfolia = false;
    const agotados = [];

    const meter = (prod, slot, agotado) => {
      if (!prod || elegidos.has(prod.id) || elegidos.size >= presupuesto) return null;
      elegidos.add(prod.id);
      const entrada = {
        prod,
        freq: prod.frecuencia,
        porque: rellenar(prod.porque, P),
        agotado: !!agotado
      };
      if (slot === 'am' || slot === 'ambos') manana.push(entrada);
      if (slot === 'pm' || slot === 'ambos') noche.push(entrada);
      return entrada;
    };

    /* Intenta candidatos por SKU; si todos fallan, cae al mejor del paso.
       Nunca incluye productos agotados: si no hay nada disponible, el paso
       se omite para no generar errores al añadir la rutina al carrito. */
    const ponerPaso = (candidatos, slot, pasoFallback) => {
      const prod = primerFacialDisponible(candidatos);
      if (prod) return meter(prod, slot, false);

      /* Registrar agotados de los candidatos para informar. */
      candidatos.forEach((id) => {
        const existe = CATALOGO.find((p) => p.id === id);
        if (existe && !disponible(existe) && agotados.indexOf(existe.nombre) === -1) {
          agotados.push(existe.nombre);
        }
      });

      /* Fallback: mejor producto disponible del paso. */
      if (pasoFallback) {
        const alt = disponiblesPorPaso(P, pasoFallback).find((p) => !elegidos.has(p.id));
        if (alt) return meter(alt, slot, false);
      }
      return null;
    };

    const esSeca = P.tipo === 'seca';
    const esSensiblePerfil = P.tipo === 'sensible' || P.sensibilidad !== 'baja';
    const quiereTratamiento = P.preocupaciones && P.preocupaciones.length > 0;

    /* --- 1. Limpieza (siempre) --- */
    ponerPaso(candidatosLimpieza(P.tipo), 'ambos', 'limpieza');

    /* --- 2. Tratamiento de la preocupación principal --- */
    if (quiereTratamiento) {
      const preoc = P.preoc1;
      const slot = (preoc === 'imperfecciones' || preoc === 'sebo') ? 'pm' : 'ambos';
      ponerPaso(candidatosTratamiento(preoc), slot, 'tratamiento');
    }

    /* --- 3. Hidratación (siempre) --- */
    ponerPaso(candidatosCrema(P.tipo), 'ambos', 'hidratacion');

    /* --- 4. Protección solar (siempre, AM) --- */
    ponerPaso(candidatosProtector(P.tipo), 'am', 'proteccion');

    /* --- 5. Contorno de ojos (si lo pidió y aún hay presupuesto) --- */
    if ((P.preocupaciones || []).indexOf('contorno') !== -1) {
      ponerPaso([SKU.contorno], 'ambos', null);
    }

    /* --- 6. Extras (solo en rutina avanzada, si hay presupuesto) --- */
    if (modo === 'avanzada') {
      const EXTRAS = {
        exfoliante: () => {
          const activa = CONFIG.exfoliacion.activadaPor.some((c) => (P.preocupaciones || []).indexOf(c) !== -1);
          const okTipo = CONFIG.exfoliacion.tiposPermitidos.indexOf(P.tipo) !== -1;
          const okSens = P.sensibilidad !== CONFIG.exfoliacion.bloqueadaSiSensibilidad;
          if (!(activa && okTipo && okSens)) return null;
          const e = ponerPaso([SKU.exfoliante], 'pm', 'exfoliacion');
          if (e) {
            e.freq = CONFIG.exfoliacion.frecuenciaPorTolerancia[P.tolerancia] || e.freq;
            exfolia = true;
          }
          return e;
        },

        refuerzo: () => {
          if (!P.preoc2 || P.preoc2 === P.preoc1) return null;
          return ponerPaso(candidatosTratamiento(P.preoc2), 'ambos', null);
        },

        reparacion: () =>
          (esSensiblePerfil || exfolia || esSeca) ? ponerPaso([SKU.reparacion], 'pm', null) : null
      };

      for (const clave of CONFIG.prioridadesExtra) {
        if (elegidos.size >= presupuesto) break;
        try { if (EXTRAS[clave]) EXTRAS[clave](); } catch (e) { /* regla no aplicable */ }
      }
    }

    const total = CATALOGO.filter((p) => elegidos.has(p.id)).reduce((s, p) => s + p.precio, 0);
    return { manana, noche, total, ids: [...elegidos], exfolia, agotados };
  };

  /** Rutina avanzada (compatibilidad: armarRutina sigue existiendo). */
  const armarRutinaAvanzada = (P) => construirRutina(P, 'avanzada');

  /** Rutina básica: limpieza + tratamiento esencial + hidratación + SPF. */
  const armarRutinaBasica = (P) => construirRutina(P, 'basica');

  /** Alias histórico: el render actual usa la rutina avanzada. */
  const armarRutina = armarRutinaAvanzada;

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
    const p1 = CONFIG.preocupaciones[P.preoc1] || {};
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
    const p1 = CONFIG.preocupaciones[P.preoc1] || {};
    const rutina = armarRutina(P);

    /* Hero */
    const h1 = document.querySelector('.result-hero h1');
    if (h1) h1.textContent = `Tu piel es ${E.tipos[P.tipo].toLowerCase()}, con tendencia a ${p1.corto}`;
    const parrafo = document.querySelector('.result-hero h1 + p');
    if (parrafo) {
      const extraPreoc = (P.preoc2 && P.preoc2 !== P.preoc1 && CONFIG.preocupaciones[P.preoc2])
        ? `, y también quieres ${CONFIG.preocupaciones[P.preoc2].largo}` : '';
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
      const preoc = CONFIG.preocupaciones[P.preoc1];
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
        /* Sincronizar con el catálogo real antes de renderizar (si está disponible).
           Si falla o tarda, se renderiza igual con el catálogo estático. */
        const render = () => {
          try { renderResultado(data); }
          catch (e) { console.warn('Clinical Skin: no se pudo renderizar el resultado', e); }
        };
        if (window.CS_CATALOGO) {
          sincronizarSiDisponible().then(render).catch(render);
        } else {
          render();
        }
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

  return {
    CONFIG,
    CATALOGO,
    VALORES,
    calcularPerfil,
    calcularIndicadores,
    armarRutina,
    armarRutinaBasica,
    armarRutinaAvanzada,
    matchProducto,
    renderMatch,
    guardar,
    cargar,
    limpiar,
    sincronizarCatalogo,
    sincronizarSiDisponible,
    analisisVisual
  };
})();

/* Exponer en window para que js/compra.js pueda usar el catálogo */
window.CS_DIAG = CS_DIAG;
