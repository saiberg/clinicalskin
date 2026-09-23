# Migración a WooCommerce — Clinical Skin

> Estado: mockup funcional con diagnóstico, carrito y checkout en JS.
> Este documento define **cómo llevarlo a WooCommerce sin reescribir la lógica del diagnóstico**.

---

## 1. Qué se mantiene y qué cambia

| Se mantiene igual | Cambia a WooCommerce |
|---|---|
| `js/logica.js` — reglas, quiz, `armarRutina`, match % (plataforma-agnóstico) | Carrito y checkout reales (`/carrito`, `/checkout` de Woo) |
| Catálogo de 11 productos con atributos (`CATALOGO`) | Catálogo importado vía CSV con **atributos globales** |
| Perfil guardado 30 días en `localStorage` (o cuenta de cliente) | Pagos reales (Webpay/Flow/Mercado Pago) y boleta |
| `js/header.js` / `js/footer.js` (footer → menú de Woo si se desea) | Despacho real (Starken/BlueExpress), correos transaccionales |

**Clave de enlace:** el `id` de `CATALOGO` = **SKU** en WooCommerce. Todo lo que hoy hace
`agregar(['gel-balance'])` pasará a buscar el producto por SKU.

---

## 2. Importar el catálogo

Archivo: [`woocommerce/catalogo-clinical-skin.csv`](woocommerce/catalogo-clinical-skin.csv)

1. En Woo: **Productos → Importar → elegir el CSV**.
2. Antes de importar, crear los **atributos globales** en
   **Productos → Atributos**: `Paso`, `Tipo de piel`, `Preocupación`, `Intensidad`
   (activar "Visible en la ficha" y usar en archivos).
3. El CSV ya trae por producto: precio CLP, descripción corta (`desc`), descripción larga
   (`ficha` + modo de uso + ingredientes), categoría por paso, atributos y meta personalizada
   (`_cs_paso`, `_cs_agresividad`, `_cs_frecuencia`, `_cs_modo_uso`, `_cs_ingredientes`).
4. **Imágenes:** el CSV no incluye columna `Images` porque los SVG del mockup no son
   válidos para la biblioteca de medios. Subir fotos reales (JPG/WebP ~1200 px) y
   completar la columna `Images` con la URL pública, o asignarlas a mano.
5. Verificar tras importar: 11 productos publicados, precios sin decimales, IVA según configuración.

---

## 3. Cómo queda conectado el diagnóstico

```
diagnostico.html (quiz JS, igual que hoy)
        │  guarda perfil (localStorage, 30 días)
        ▼
resultado.html → CS_DIAG.armarRutina(perfil)
        │  producto elegido por SKU
        ▼
"Añadir rutina completa" → por cada SKU:
   /?add-to-cart=<ID>&quantity=1        (o Store API /wc/store/v1/cart/add-item)
        ▼
/checkout de Woo (pasarela chilena)
```

Cambios puntuales en `js/compra.js`:

- `agregar(ids)` → en vez de `localStorage`, enviar cada SKU al carrito de Woo
  (mapa **SKU → ID** obtenido con `wc_get_products` o un endpoint JSON tras importar).
- `resumen()` → leer el carrito real de Woo (`wc-cart-fragments` o Store API) para
  subtotal/descuento/envío.
- **Eliminar** el render de `carrito.html`/`checkout.html` demo cuando las páginas nativas
  estén activas (basta no incluir `compra.js` en esas páginas).

Reglas del diagnóstico **no se tocan**: siguen en `logica.js` (sección `CONFIG` y `CATALOGO`),
fáciles de modificar tal como pediste.

---

## 4. Pasarelas de pago (Chile)

| Opción | Plugin típico | Notas |
|---|---|---|
| **Flow** | "Flow WooCommerce" (oficial) | Simple, webhooks, boleta según plan |
| **Webpay Plus / Transbank** | Plugin oficial Transbank o vía Flow/Mercado Pago | Requiere comercio habilitado en Transbank |
| **Mercado Pago** | Plugin oficial Mercado Pago | Tarjetas + billetera; setup rápido para pruebas (sandbox) |

- Dominio propio + **SSL obligatorio** (los webhooks no llegan a `localhost`).
- Emisión de **boleta electrónica (SII)**: resolver con el plugin de la pasarela o con el
  contador — define si los precios se muestran con/sin IVA (19 %).

## 5. Despacho

- **Starken** y **BlueExpress**: mientras no exista integración API, usar
  **Zonas de envío** de Woo con tabla por rango de comuna/total.
- **Retiro en Santiago**: zona con costo $0.
- Plazos publicados en `terminos.html#envios` (24–48 h Starken, 24 h BlueExpress, estándar $3.990).

---

## 6. Checklist pre-lanzamiento

**Base**
- [ ] Dominio `.cl` + hosting con SSL + WordPress/WooCommerce actualizados
- [ ] Moneda **CLP**, precios sin decimales, IVA 19 % definido (con/sin impuesto en front)
- [ ] Importar CSV → 11 productos OK con atributos globales
- [ ] Fotos reales reemplazan los SVG de `img/productos/`
- [ ] Correos transaccionales de Woo en español (nuevo pedido, despachado, etc.)

**Diagnóstico**
- [ ] `diagnostico.html` + `logica.js` embebidos en el tema (misma versión que acá)
- [ ] Botón "Añadir rutina completa" → carrito real de Woo por SKU
- [ ] `% de match` visible en la ficha de producto de Woo (shortcode/JS embebido)
- [ ] Perfil: conservar `localStorage` o migrar a cuenta de cliente

**Pago y legal**
- [ ] Pasarela en sandbox → traspaso a producción
- [ ] Boleta electrónica funcionando
- [ ] `politica-privacidad.html` y `terminos.html` adaptadas (mencionar Woo/cookies)
- [ ] Banner de cookies / consentimiento (Ley 19.628)

**Operación**
- [ ] Zonas y tarifas Starken/BlueExpress/retiro cargadas
- [ ] Stock y alertas activas
- [ ] Backup diario + seguridad (Wordfence o similar)
- [ ] Analítica con consentimiento (GA4/Matomo)

**SEO/post-lanzamiento**
- [ ] Reemplazar `http://localhost/clinicalskin` por el dominio real en tags `og:url`
      y `og:image` de las 12 páginas
- [ ] Redirects: `producto.html?id=X` → ficha real de Woo (`?post_type=product&p=ID` o slug)
- [ ] Search Console + sitemap
