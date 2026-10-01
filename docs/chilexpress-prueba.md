# Chilexpress — datos de prueba (ambiente TEST)

> Plugin oficial **Chilexpress para WooCommerce** (`chilexpress-oficial`) en
> ambiente **test**: todo se cotiza contra `https://qaservices.wschilexpress.com/`,
> sin envíos reales ni cobros.

## Configuración actual

| Ajuste | Valor |
|---|---|
| Ambiente | `test` |
| Llave primaria (cotizador / georeferencia / OT) | `9a72fa21133747538182a6edf71e82f3` |
| Llave secundaria (respaldo) | `f9b8b65bf2a44dd6bc910915b4e58f6d` |
| TCC (número de cliente) | `18578680` |
| Origen del despacho | región `RM` / comuna `STGO` (Santiago) |
| Método en la zona Chile | `chilexpress_woo_oficial`, instancia 6 |
| Medidas por defecto | 15 × 10 × 20 cm y 0.5 kg (si un producto no tiene medidas) |
| Catálogo en la tienda | 32 regiones y 850 comunas |

## Cómo se ve en la tienda

- En **Método de despacho** va **una sola tarjeta**: `Chilexpress a domicilio`,
  con el servicio real como texto secundario (p. ej. *"Entrega el día siguiente
  (hasta 19:00)"* o *"Hasta 14 días hábiles"*).
- El precio sale de la API en vivo: comuna de destino, peso (0.5 kg por
  producto) y medidas de lo que hay en el carrito. De los servicios que
  devuelve Chilexpress se muestra el **más barato**.
- Si la API falla o devuelve costo `-1`, la tarjeta **no aparece** (nunca se
  muestra un precio inventado).

## Pasos para probar

1. Añadir productos a la tienda y entrar en `/checkout/`.
2. En **Dirección de envío** elegir región (p. ej. *Biobío*): las comunas se
   cargan solas en el desplegable.
3. Elegir comuna y escribir la dirección.
4. En **Método de despacho** revisar la tarjeta `Chilexpress a domicilio` con
   su precio (junto a BlueExpress, retiro en tienda y Starken).
5. Elegir método de pago **Tarjeta de crédito o débito** (Webpay TEST) y
   finalizar la compra: la OT de Chilexpress queda en el pedido (ambiente test).

## Notas

- Las comunas de cada región viven en un archivo local
  (`wp-content/plugins/chilexpress-oficial/includes/data/comunas/*.json`) que
  el plugin refresca cada 5 horas. Para precargarlas todas:
  `docker compose -f C:\docker\clinicalskin-woo\docker-compose.yml run --rm cli wp eval-file /tmp/cs/chilexpress-comunas-cache.php`
- El checkout publica las regiones con el formato de WooCommerce (`CL-RM`,
  `CL-BI`…, lo que exige Starken/Anyda) y el plugin las traduce a sus códigos
  (`RM`, `R8`…) al buscar comunas (parche en
  `includes/class-chilexpress-woo-oficial-coverage.php`).
- Para **cobrar de verdad** hay que pasar el ambiente a `production` con las
  llaves reales de Chilexpress y el TCC de la cuenta (los de arriba son de
  prueba/QAS).
- Los errores del plugin quedan en **WooCommerce → Estado del sistema →
  Registros** (archivos `chilexpress*`).

## Parches aplicados sobre los plugins (solo funcionales, el diseño no cambia)

| Archivo | Cambio |
|---|---|
| `chilexpress-oficial/includes/class-chilexpress-woo-oficial-coverage.php` | Traduce `CL-XX` → `R1…RM` para cargar comunas con cualquier formato de región |
| `chilexpress-oficial/public/class-chilexpress-woo-oficial-public.php` | Reemplaza `wc_enqueue_js()` (obsoleto desde WooCommerce 10.4) por `wp_add_inline_script()` y así no emitir el aviso *Deprecated* en el checkout |
| `calculo-de-despacho-via-starken-para-woocommerce/assets/js/script.js` | Cuando Chilexpress está activo, Starken ya no reemplaza el desplegable de comuna por un input ni por su propio listado |
