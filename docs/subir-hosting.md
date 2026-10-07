# Cómo subir la tienda completa a un hosting — Clinical Skin

> **Alcance:** todo lo que hoy corre en local, tal como se ve en `http://localhost:8080`
> (WordPress en Docker) más el sitio estático de `http://localhost/clinicalskin/` (XAMPP):
> WordPress + WooCommerce + tema puente + los dos plugins parcheados + las 12 páginas del
> diseño aprobado.
>
> **Supuestos:** dominio propio con HTTPS (de aquí en adelante `https://tudominio.cl`) y
> hosting con panel **cPanel** o con **SSH**. "Raíz" = `public_html/`.

---

## 1. Qué se sube

| Pieza | Dónde está hoy (local) | Va a |
|---|---|---|
| WordPress 7.1.2 + WooCommerce 11.1.2 (PHP 8.3, MySQL 8.4) | volumen `db_data`/`wp_data` de Docker | hosting con PHP ≥ 8.1 y MySQL 8 |
| Tema puente `clinicalskin` (`functions.php`, `header/footer`, `envios.php`, `pagos.php`, overrides de Woo, `css/woo.css`) | `C:\docker\clinicalskin-woo\theme\clinicalskin` | `wp-content/themes/clinicalskin` |
| Plugins: `transbank-webpay-plus-rest` 1.14.0, `chilexpress-oficial` 1.4.5, `calculo-de-despacho-via-starken-para-woocommerce` 2026.07.01 | `wp-content/plugins/` del contenedor | `wp-content/plugins/` **copia directa** |
| Biblioteca de medios (11 fotos de producto, 2,3 MB) | `wp-content/uploads` | `wp-content/uploads` |
| Base de datos (5 MB: catálogo, atributos, zona Chile, 4 métodos de envío, Webpay, páginas) | volumen `db_data` | BD del hosting |
| Páginas del diseño (`index`, `diagnostico`, `productos`, …) | `C:\xampp\htdocs\clinicalskin\*.html` (montado como `/static`) | `<raíz>/static/` |
| Assets del diseño (`css/`, `js/`, `img/`) | `C:\xampp\htdocs\clinicalskin\{css,js,img}` (montados en la raíz) | `<raíz>/css`, `<raíz>/js`, `<raíz>/img` |
| `wp-config.php` y `.htaccess` (permalinks `/%postname%/`) | contenedor | raíz |

**No se sube:** XAMPP, Docker/`docker-compose.yml`, `C:\docker\clinicalskin-woo\scripts\`,
`CREDENCIALES.md` (guárdalo aparte), `.git`, ni `docs/*.md` (el arnés `qa-responsive.html`
sí puede subirse, es opcional).

> **Aviso importante:** Chilexpress y Starken están **parcheados a mano** dentro del
> contenedor (comuna/regiones, select2 del checkout, guard del script). Esos cambios no
> existen en wordpress.org: si instalas los plugins "frescos" en el hosting se pierden los
> arreglos y vuelve el bug de las comunas. **Copia siempre los archivos locales.**

### Árbol final en el hosting

```
public_html/
├── wp-config.php
├── .htaccess                  ← regenerado en Ajustes → Enlaces
├── static/                    ← *.html del diseño (los lee el tema)
│   ├── index.html  productos.html  diagnostico.html  …
│   └── docs/qa-responsive.html     (opcional)
├── css/  js/  img/            ← assets del diseño (el tema usa <base href>)
├── wp-admin/  wp-includes/
└── wp-content/
    ├── themes/clinicalskin/
    ├── plugins/{woocommerce, transbank-webpay-plus-rest, chilexpress-oficial, …}
    └── uploads/               ← 11 fotos
```

---

## 2. Requisitos del hosting

- **PHP 8.1 o superior** (probado con 8.3), `curl` y `openssl` habilitados: Starken y
  Chilexpress cotizan contra APIs externas y sin `curl` el checkout no muestra envíos.
- **MySQL 8** (o MariaDB ≥ 10.6) con base de datos y usuario propios.
- **HTTPS obligatorio**: lo exigen los webhooks/retornos de Transbank y las APIs de envío.
- Espacio ≥ 500 MB (hoy la tienda pesa ~8 MB; el resto es margen para subidas).
- **Cron**: idealmente cron real (`wp-cron.php` programado cada 5 min) para correos y stock.
- **Correo transaccional**: configurar SMTP (el `sendmail` de PHP suele caer en spam o no salir).
- Guardar 500 MB de respaldo diario (BD + `wp-content`).

---

## 3. Paso 1 — Exportar desde local (PowerShell)

```powershell
# a) Base de datos → C:\docker\clinicalskin-woo\scripts\base.sql
docker compose -f C:\docker\clinicalskin-woo\docker-compose.yml run --rm cli wp db export /tmp/cs/base.sql

# b) Archivos de WordPress (tema + plugins parcheados + uploads + configuración)
New-Item -ItemType Directory -Force C:\docker\clinicalskin-woo\salida
docker cp clinicalskin-woo-wordpress-1:/var/www/html/wp-content  C:\docker\clinicalskin-woo\salida\wp-content
docker cp clinicalskin-woo-wordpress-1:/var/www/html/wp-config.php C:\docker\clinicalskin-woo\salida\wp-config.php
docker cp clinicalskin-woo-wordpress-1:/var/www/html/.htaccess    C:\docker\clinicalskin-woo\salida\.htaccess

# c) Sitio estático del diseño (mismos archivos que ya están en el repo)
Compress-Archive -Path C:\xampp\htdocs\clinicalskin\*.html, C:\xampp\htdocs\clinicalskin\docs `
                  -DestinationPath C:\docker\clinicalskin-woo\salida\static.zip -Force
Compress-Archive -Path C:\xampp\htdocs\clinicalskin\css, C:\xampp\htdocs\clinicalskin\js, C:\xampp\htdocs\clinicalskin\img `
                  -DestinationPath C:\docker\clinicalskin-woo\salida\assets.zip -Force

# d) Empaquetar lo de WordPress (opcional, para subirlo de una vez)
Compress-Archive -Path C:\docker\clinicalskin-woo\salida\wp-content, C:\docker\clinicalskin-woo\salida\wp-config.php, C:\docker\clinicalskin-woo\salida\.htaccess `
                  -DestinationPath C:\docker\clinicalskin-woo\salida\wordpress.zip -Force
```

Resultado en `C:\docker\clinicalskin-woo\salida\`: `base.sql`, `wordpress.zip`,
`static.zip`, `assets.zip`.

---

## 4. Paso 2 — Preparar el hosting

1. **Crear la base de datos** desde el panel (phpMyAdmin → *Nueva base de datos*,
   cotejamiento `utf8mb4_unicode_ci`) y un usuario con todos los privilegios sobre ella.
2. **Subir** los cuatro archivos (`base.sql`, `wordpress.zip`, `static.zip`, `assets.zip`)
   al `public_html/` por el Administrador de Archivos o por FTP.
3. **Descomprimir** en la raíz (`Extract Here` cada zip). Verificar que el árbol quede como
   en la sección 1: `wp-config.php` y `.htaccess` en la raíz, `static/`, `css/`, `js/`,
   `img/` junto a `wp-admin/`.
4. **Editar `wp-config.php`**: solo las constantes de base de datos
   (`DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_HOST`); el resto se queda igual. Revisar que
   `WP_DEBUG` quede en `false` para que los errores no se muestren en pantalla.
5. **Importar la BD**: phpMyAdmin → la base creada → *Importar* → `base.sql` (UTF-8).
6. **Permalinks**: entrar a `/wp-admin` → Ajustes → Enlaces → **Guardar** (regenera
   `.htaccess`; sin esto las páginas del diseño dan 404).

### Alternativa con SSH + WP-CLI (más rápido)

```bash
wp config set DB_NAME  'clinicoskin'      --type=constant   # valores reales del panel
wp config set DB_USER  'clin_user'        --type=constant
wp config set DB_PASSWORD '***'           --type=constant
wp db import base.sql
wp rewrite flush --hard
```

---

## 5. Paso 3 — Ajustar la URL definitiva

La BD se exporta con `http://localhost:8080` adentro (home/siteurl, imágenes, enlaces):

```bash
wp search-replace 'http://localhost:8080' 'https://tudominio.cl' --all-tables
wp option update home 'https://tudominio.cl'
wp option update siteurl 'https://tudominio.cl'
```

(Sin SSH, usar el plugin **Better Search Replace** con la misma búsqueda.)

Además, en el panel:

- **Ajustes → Generales**: dirección de WordPress y del sitio = `https://tudominio.cl`.
- **Ajustes → Medios**: si la carpeta de subidas quedó con nombre de año/mes, comprobar que
  las 11 fotos carguen.

En los **archivos** del sitio estático quedan 12 referencias locales que hay que reemplazar
(`og:url` y `og:image` apuntan a `http://localhost/clinicalskin/…`): buscar `localhost` en
`static/*.html` y cambiar por el dominio. Igual conviene revisar `grep -r localhost
wp-content/themes/clinicalskin`.

---

## 6. Paso 4 — Poner en producción pagos y envíos

Los servicios están conectados **en ambiente de prueba**; al subir hay que darles a production.

| Servicio | Estado hoy | Qué cambiar | Dónde |
|---|---|---|---|
| **Webpay Plus** (Transbank) | Ambiente **Integración** (`environment: TEST`), comercio de prueba | Ambiente → **Producción** + *Código de Comercio Producción* + *API Key producción* (los entrega Transbank en su portal una vez firmado el contrato) | WooCommerce → Ajustes → Pagos → **Webpay Plus** |
| **Chilexpress** | Ambiente **Staging** (`ambiente: test`), llave y TCC de prueba | Ambiente → **Production**, llave de API y TCC de producción | Menú lateral **Chilexpress** → Ajustes → campo *Ambiente* |
| **Starken** (Anyda) | Conectado: llave de Anyda, origen `1`, fallback $3.990, medidas 6/6/8, peso 0,5 kg | No tiene campo de ambiente: confirmar con Anyda que la llave opere en producción. El plugin marca `plan: free` con reinicio de cupo mensual (`next_reset`), conviene revisar límites | WooCommerce → Ajustes → Envíos → **Starken** |
| **BlueExpress** | Tarifa fija $4.990 (sin cotización real) | Requiere credenciales del *Plugin BlueX for WooCommerce* (pendiente) | WooCommerce → Ajustes → Envíos |
| **Retiro en tienda** | Gratis, zona Chile | Sin cambio | WooCommerce → Ajustes → Envíos → Zonas |
| Khipu, Mercado Pago, transferencia, contra entrega | Desactivados | Dejarlos así (el checkout muestra un solo medio de pago) | WooCommerce → Ajustes → Pagos |

Los secretos (llaves, comercio, TCC) están en `C:\docker\clinicalskin-woo\CREDENCIALES.md`;
guárdalos en el hosting dentro de `wp-config.php` o en el gestor de contraseñas, nunca en el
repositorio.

---

## 7. Paso 5 — Verificación tras subir

- [ ] `https://tudominio.cl` carga con HTTPS y redirige de `http` (certificado activo).
- [ ] Portada, catálogo, ficha de producto, diagnóstico y resultado: diseño idéntico al local
      (tipografías, colores e imágenes cargando desde `/css`, `/js`, `/img`).
- [ ] 11 productos con precio CLP, fotos y atributos; carrito y **checkout** funcionando.
- [ ] Envíos: al elegir comuna ( Providencia y Alhué ) aparecen las 4 tarjetas con precio vivo
      (BlueExpress, Retiro, Starken, Chilexpress) y la comuna se carga sin quedarse pegada.
- [ ] Pago: en Integración pasa la tarjeta de prueba `4051885600446623` (CVV 123, 12/30) y
      rechaza la `5186059559590568`; en Producción se usa una tarjeta real.
- [ ] Se genera un pedido y el **correo de nuevo pedido** llega al correo del administrador.
- [ ] /wp-admin entra con las credenciales guardadas; `WP_DEBUG` en `false`.
- [ ] Arnés responsive: abrir `https://tudominio.cl/static/docs/qa-responsive.html`
      (si lo subiste; recuerda cambiar `const WOO` en la línea 74 por el dominio).
- [ ] Backup diario programado y plugin de seguridad (Wordfence o similar) instalado.

---

## 8. Errores típicos

| Síntoma | Causa y arreglo |
|---|---|
| Página en blanco | PHP desactualizado o error de `wp-config.php`: revisar `wp-content/debug.log` y subir la versión de PHP a 8.1+ |
| Las páginas del diseño dan 404 | Falta la carpeta `static/` o no se guardaron los Enlaces (regenera `.htaccess`) |
| Sin estilos o imágenes rotas | Faltan `css/`, `js/`, `img/` en la raíz (el tema usa `<base href>` y pide `css/style.css` relativo a la raíz) |
| El checkout nunca muestra precios de envío | El hosting no tiene `curl`, o no hay HTTPS, o se instalaron los plugins sin los parches |
| La comuna no carga o queda "Elige una opción…" | Se perdió el parche de Chilexpress/estilo select2: recopiar `wp-content/plugins/chilexpress-oficial` desde local |
| Webpay no avanza o rechaza todo | Ambiente sigue en Integración, o la API Key no es la de producción, o el certificado/comercio no está habilitado |
| Correos de pedido no llegan | `sendmail` de PHP bloqueado: configurar SMTP (plugin WP Mail SMTP) |

---

## 9. Mantenimiento posterior

- **Cambios de diseño/CSS/JS**: editar en local (`C:\xampp\htdocs\clinicalskin` y
  `C:\docker\clinicalskin-woo\theme\clinicalskin`) y volver a subir `static/`, `css/`, `js/`,
  `img/` y `wp-content/themes/clinicalskin`.
- **Cambios de contenido** (precios, stock, textos, métodos de envío): se hacen directo en
  `/wp-admin` del hosting; luego se exporta la BD con `wp db export` y se guarda como respaldo.
- **Cambios en plugins parcheados**: nunca actualizar Chilexpress ni Starken desde el panel
  sin antes reaplicar los parches (los archivos están en el contenedor local).
- **Actualizaciones de WordPress/WooCommerce**: hacerlas primero en local, probar con el
  arnés y recién entonces en el hosting.

---

*Documento relacionado: [`migracion-woocommerce.md`](migracion-woocommerce.md) (plan original
de la migración) y [`chilexpress-prueba.md`](chilexpress-prueba.md) /
[`webpay-prueba.md`](webpay-prueba.md) (pruebas de los servicios).*
