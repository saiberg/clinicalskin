# Webpay — datos de prueba (ambiente TEST)

> Plugin oficial **Transbank Webpay Plus REST** en ambiente **TEST / Integración**.
> No se cobra nada de verdad: todo ocurre contra `webpay3gint.transbank.cl`.

## Configuración actual (WooCommerce → Ajustes → Pagos → Tarjeta de crédito o débito)

| Ajuste | Valor |
|---|---|
| Ambiente | `TEST` |
| Comercio | `597055555532` |
| API key | `579B532A7440BB0C9079DED94D31EA1615BACEB56610332264630D42D0A36B1C` |
| Estado del pedido al pagar | `processing` (pedido pagado) |
| Orden de compra | `{orderId}` + 8 caracteres aleatorios |

## Datos para simular la compra

| Dato | Valor | Resultado |
|---|---|---|
| Tarjeta VISA | `4051885600446623` | Aprobada |
| Tarjeta Mastercard | `5186059559590568` | Rechazada |
| Código de seguridad (CVV) | `123` | — |
| Vencimiento | fecha futura, p. ej. `12/30` | — |
| Cuotas | **Sin Cuotas** | — |
| Banco: usuario | `11.111.111-1` | — |
| Banco: clave | `123` | — |

## Pasos

1. Abrir la tienda, añadir productos y entrar en `/checkout/`.
2. Rellenar dirección (región, comuna, calle) y elegir el método de envío.
3. En **Método de pago** elegir **Tarjeta de crédito o débito** y pagar
   (los datos de tarjeta **no** se piden en la tienda: los pide Transbank
   en su página, como en cualquier comercio real).
4. En `webpay3gint.transbank.cl`: ingresar la tarjeta de prueba, CVV y
   vencimiento → **Continuar** → abrir el modal de cuotas y marcar
   **Sin Cuotas** → **Aceptar**.
5. Formulario del banco: usuario `11.111.111-1`, clave `123` → **Aceptar**.
6. Transbank vuelve a la tienda: pantalla **"Compra confirmada ·
   Pedido #CS-xx"**, pedido con estado **`processing`** y método
   **"Tarjeta de crédito o débito"**.

## Notas

- Con la tarjeta Mastercard el banco devuelve un rechazo: se vuelve a la
  tienda con el pedido en estado fallido (servve para probar el camino malo).
- Para **cobrar de verdad** hay que cambiar el ambiente a `production`
  con el comercio y la API key reales de Transbank (y aceptar las tarjetas
  normales del público).
- Pedidos de prueba anteriores se pueden borrar desde
  **WooCommerce → Pedidos**.
