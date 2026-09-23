# Lógica del diagnóstico — Clinical Skin

> Documento de reglas: cómo 5 preguntas se convierten en un perfil de piel
> y de ahí en una rutina personalizada de productos.
> Plataforma-agnostic: hoy corre en JS puro, mañana se conecta a WooCommerce.

---

## 1. Principios

1. **Determinista y explicable**: toda recomendación se puede justificar con una frase ("te incluimos BHA porque tu preocupación es acné y tu piel no es sensible").
2. **Simpleza primero**: el perfil "sin rutina / básica" recibe rutina **core de 4 productos**, no 6.
3. **La sensibilidad manda**: si el perfil es sensible, los activos fuertes se excluyen aunque matcheen la preocupación.
4. **Los datos viven del cliente**: respuestas en `localStorage` (hoy) → cuenta de usuario/email (después).

---

## 2. Dimensiones (las 5 preguntas)

| Pregunta | Dimensión | Valores |
|---|---|---|
| Q1 ¿Cómo es tu piel? | `tipo` | `mixta` · `seca` · `grasa` · `sensible` |
| Q2 Preocupación principal | `preoc1` | `acne` · `deshidratacion` · `manchas` · `edad` |
| Q3 Rutina actual | `rutina` | `basica` · `multi` · `cambiante` · `ninguna` |
| Q4 Sol y clima | `sol` | `bajo` · `moderado` · `alto` · `reactivo_clima` |
| Q5 Objetivo | `preoc2` | `brillo_poros`→`acne` · `hidratar_calmar`→`deshidratacion` · `iluminar`→`manchas` · `prevenir`→`edad` |

> Q5 **reutiliza el mismo enum de preocupaciones** que Q2 → la rutina trabaja con
> una lista ordenada `preocupaciones = [preoc1, preoc2]` (sin duplicados).

## 3. Perfil derivado

| Flag | Regla |
|---|---|
| `sensibilidad` | **alta** si Q1=sensible **y** Q4=reactivo_clima · **media** si solo uno · **baja** si ninguno |
| `tolerancia_activos` | tipo mixta/grasa = 2, seca = 1, sensible = 0 → **−2** si sensibilidad alta, **−1** si media → `alta ≥2`, `media 1`, `baja ≤0` |
| `pasos_permitidos` | Q3 `basica`/`ninguna` → **4 (core)** · `cambiante` → **5 (core + 1, con nota de adaptación)** · `multi` → **6 (completa)** |
| `prioridad_spf` | `sol` moderado/alto → **alta** (copy: "reaplicar cada 3 h") · bajo → normal |
| `hidratacion` (para mostrar) | seca → `Insuficiente` · mixta → `Desbalanceada` · grasa → `Equilibrada` · sensible → `Comprometida` |

## 4. Modelo de producto (atributos)

Cada producto del catálogo se carga con:

```json
{
  "id": "serum-equilibrio",
  "nombre": "Sérum Equilibrio Botánico",
  "paso": "tratamiento",          // limpieza | tratamiento | exfoliacion | hidratacion | proteccion
  "tipos": ["mixta", "grasa"],
  "preocupaciones": ["acne"],
  "activos": ["niacinamida", "zinc"],
  "agresividad": "baja",          // baja | media | alta  (qué tan fuerte es para la piel)
  "frecuencia": "diario",
  "precio": 34900,
  "img": "img/productos/serum.svg",
  "porque": "La niacinamida regula el sebo sin resecar: exactamente lo que pide tu piel {tipo} con {preoc1}."
}
```

La lógica **nunca** depende del nombre del producto → el catálogo real puede cambiar sin tocar reglas.

## 5. Pipeline de selección (el corazón)

Orden fijo — se pobla hasta alcanzar `pasos_permitidos`:

```
PASO 1 · LIMPIEZA (siempre 1; 2 si aplica)
   AM+PM → seca/sensible → Leche Limpiadora Suave · mixta/grasa → Gel Limpiador Balance
   PM → + Aceite Desmaquillante si: sol moderado/alto  O  rutina multi  O  tipo mixta/grasa
        (doble limpieza para retirar bien el protector solar)

PASO 2 · TRATAMIENTO de preoc1 (siempre 1)
   acne / brillo     → Sérum Equilibrio (niacinamida)  (AM+PM)
   deshidratacion    → Sérum Hidra Plump (ácido hialurónico)  (AM+PM)
   manchas           → Ampolla Luz Vitamina C  (va en AM)
   edad              → Ampolla Luz Vitamina C  (AM)

PASO 3 · REFUERZO de preoc2 (solo si preoc2 ≠ preoc1 y pasos lo permiten)

PASO 4 · EXFOLIACIÓN (condicional)
   entra si: (preoc1 = acne O brillo)  Y  tipo ∈ {mixta, grasa}  Y  sensibilidad ≠ alta
   frecuencia por tolerancia: alta → 3-4×/sem · media → 2-3×/sem · baja → 1×/sem
                              con nota "introdúcelo de a poco, primero 1 vez"

PASO 5 · HIDRATACIÓN (siempre 1)
   seca / sensible → Crema Bruma de Avena AM/PM
   mixta / grasa   → Gel Hidratante Oil-Free AM/PM
   (+ Bálsamo Centella PM entra como extra "reparacion" si piel sensible, usó BHA o es seca)

PASO 6 · PROTECCIÓN (siempre, AM, no negociable)
   Protector Solar SPF50 — con instrucción extra si sol ≥ moderado
```

**Presupuesto de pasos**: primero el core (limpieza, tratamiento, hidratación, SPF = 4) y luego
los extras **en el orden de `CONFIG.prioridadesExtra`** de `js/logica.js`:
`limpiezaExtra → exfoliante → refuerzo → reparacion`, hasta alcanzar `pasos_permitidos`.
Para cambiar el orden o desactivar un extra basta con reordenar/quitar esa lista.

**Exclusiones duras** (antes del pipeline):
- `sensibilidad = alta` → jamás BHA/exfoliante ni productos `agresividad = alta`
- `sensibilidad = media` + exfoliante → solo si preoc1 = acne, y con advertencia

## 6. Match %

- Por producto: `85 base` + `8` si matchea tipo + `10` si matchea preocupación → tope **99%**
- Rutina global: promedio de los productos → se muestra en el hero del resultado ("compatibilidad de tu rutina: 96%")

## 7. Salida = qué ve la persona

1. **Hero**: título derivado (`"Tu piel es {tipo}, con tendencia a {preoc1}"`), tags, ficha de perfil (tipo, preoc1, sensibilidad, hidratación, sol).
2. **Resumen**: qué está pidiendo la piel + 3 métricas.
3. **Rutina AM/PM**: cards en orden de pasos, cada una con badge `Paso N`, badge de **frecuencia** y el **porqué** con tokens rellenados (`{tipo}`, `{preoc1}`...).
4. **Tip adaptativo**: por Q3 (cómo introducir activos), Q4 (reaplicar SPF) o sensibilidad.
5. **CTA**: total de la rutina + "añadir completa" / "comprar por separado".
6. **Captura de email** del resultado (ya diseñada) — el imán.

## 8. Persistencia e integración

```
diagnostico.html ──(fin del quiz)──► localStorage.cs_profile ──► resultado.html renderiza
                                        │
                                        └─ fallback: sin datos → muestra la rutina demo actual
```

```js
cs_profile = {
  respuestas: { q1: "mixta", q2: "acne", q3: "basica", q4: "moderado", q5: "brillo_poros" },
  perfil: { tipo, preocupaciones: [...], sensibilidad, tolerancia, pasos, sol, hidratacion },
  ts: 1769...                        // caduca a los 30 días
}
```

**Implementado en `js/logica.js`** (captura, cálculo, persistencia y render).

## 9. Huecos de catálogo (avisar cuando entre el catálogo real)

| Necesidad de la lógica | Estado hoy |
|---|---|
| Limpiador suave/cremoso para piel **seca** | ✅ creado (fase mockup): `Leche Limpiadora Suave` |
| Gel-crema hidratante **oil-free** (grasa/mixta) | ✅ creado: `Gel Hidratante Oil-Free` |
| Sérum hidratante (ácido hialurónico) para `deshidratacion` | ✅ creado: `Sérum Hidra Plump` |
| Atributos de la sección 4 en **todos** los productos reales | pendiente al cargar catálogo en Woo |

## 10. Cómo ajustar reglas en el futuro

- Pesos y copys → constantes al inicio de `js/logica.js`
- Nuevas preocupaciones → sumar valor al enum + mapeo en PASO 2
- Nuevas preguntas (ej. rango etario) → nueva dimensión + flag, sin tocar el pipeline
