# Subir Clinical Skin al hosting

Guía breve, actualizada al 26/10/2026, para publicar el sitio local de WordPress/WooCommerce en cPanel. Los archivos se preparan desde `C:\docker\clinicalskin-woo`; el diseño fuente está en `C:\xampp\htdocs\clinicalskin`.

## Antes de empezar

- Dominio configurado con HTTPS: `https://clinicalskin.cl`.
- La raíz del dominio en este hosting es `/home2/rtqfwfte/clinicalskin.cl` (confírmala en cPanel si fue cambiada).
- El hosting está en PHP 8.5. La copia local usa WordPress 7.1.2, WooCommerce 11.1.2 y PHP 8.3.
- El catálogo real tiene **42 productos**. El paquete ya contiene sus fotos en `wp-content/uploads`; **no vuelvas a importar el CSV** durante la instalación.
- Haz una copia de respaldo del contenido y de la base de datos que ya existan en esa raíz antes de reemplazarlos.
- Abre Docker Desktop antes de exportar; deben estar activos los servicios `wordpress` y `db`.
- Deja al menos **1 GB libre**. El sitio extraído ocupa aproximadamente 388 MB; el ZIP y el TAR de subida rondan 260 MB cada uno. Si el Administrador de Archivos rechaza el tamaño, usa SFTP/SSH o solicita al hosting que habilite una subida mayor.

## 1. Preparar los archivos actualizados

Abre PowerShell y ejecuta:

```powershell
& 'C:\docker\clinicalskin-woo\scripts\exportar-hosting.ps1' -Dominio 'https://clinicalskin.cl'
```

El script exporta la base de datos y construye los dos paquetes en `C:\docker\clinicalskin-woo\salida\`:

| Archivo | Para qué sirve | Tamaño actual aproximado |
|---|---|---:|
| `base.sql` | Catálogo, ajustes, páginas y configuración WooCommerce | 1,6 MB |
| `site.tar.gz` | Sitio completo; recomendado si usas SSH, conserva permisos Unix | 259,5 MB |
| `wordpress.zip` | El mismo sitio para el Administrador de Archivos de cPanel | 265 MB |

El paquete incluye el núcleo de WordPress, tema, plugins instalados localmente, medios, diseño y las páginas estáticas. También deja los metadatos estáticos apuntando al dominio final. Se excluyen `.git`, el CSV y las imágenes fuente del inventario (`static/woocommerce`) y la documentación Markdown interna del sitio estático. **Sube `base.sql` y solo uno de los dos paquetes** (`site.tar.gz` o `wordpress.zip`).

> Los archivos de Chilexpress y Starken están parcheados en la copia local. Los paquetes copian las versiones instaladas; no reinstales esos plugins desde WordPress.org durante la subida.

## 2. Crear la base e instalar los archivos

1. En cPanel, crea una base de datos MySQL y un usuario con todos los privilegios. Guarda el nombre, usuario y contraseña tal como aparecen en el panel (cPanel suele anteponer un prefijo).
2. Sube `base.sql` y el archivo del sitio elegido a la raíz del dominio.
3. Extrae el paquete en la raíz vacía o respaldada. El ZIP y el TAR ya llevan `wp-admin/`, `wp-includes/`, `wp-content/`, `static/`, `css/`, `js/`, `img/`, `.htaccess` y `wp-config.php`; **no instales otro WordPress encima**.
4. Si usas `site.tar.gz` por SSH/Terminal de cPanel, desde la raíz del sitio:

   ```bash
   cd /home2/rtqfwfte/clinicalskin.cl
   tar -xzf site.tar.gz
   find . -type d -exec chmod 755 {} +
   find . -type f -exec chmod 644 {} +
   ```

   Si extraes `wordpress.zip` con File Manager y aparece `Permission denied`, aplica esos mismos comandos desde Terminal de cPanel. Si no puedes corregir permisos o el dueño no es tu usuario, pide al hosting que restablezca la propiedad de la carpeta. `wp-content/uploads` debe ser escribible por WordPress.

## 3. Conectar WordPress al hosting

1. Edita el `wp-config.php` de la raíz y cambia solo los datos de la base (`DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_HOST`) por los que creó cPanel. Deja el resto del archivo y el prefijo de tablas sin cambios. Pon `WP_DEBUG` en `false`.
2. Importa `base.sql` desde phpMyAdmin, seleccionando la base que acabas de crear. Si usas WP-CLI, puedes hacer la importación desde la raíz del sitio con `wp db import base.sql`.
3. Con WP-CLI, cambia las URLs que venían de Docker:

   ```bash
   wp search-replace 'http://localhost:8080' 'https://clinicalskin.cl' --all-tables
   wp option update home 'https://clinicalskin.cl'
   wp option update siteurl 'https://clinicalskin.cl'
   ```

   Si no tienes WP-CLI, primero cambia `home` y `siteurl` en phpMyAdmin. Sustituye `wp_options` por la tabla con el prefijo indicado en `wp-config.php`:

   ```sql
   UPDATE `wp_options` SET `option_value` = 'https://clinicalskin.cl'
   WHERE `option_name` IN ('home', 'siteurl');
   ```

   Después entra al sitio y usa Better Search Replace para cambiar `http://localhost:8080` en todas las tablas con soporte para datos serializados. Si `wp-config.php` contiene `WP_HOME` o `WP_SITEURL`, actualiza también esas constantes.
4. En `/wp-admin` → Ajustes → Enlaces permanentes, pulsa **Guardar cambios** para regenerar las reglas de `.htaccess`.
5. Comprueba que el certificado SSL esté activo y que las URLs carguen en HTTPS. Configura SMTP desde el hosting para que lleguen los correos de pedidos.

## 4. Pagos y envíos

Subir los archivos **no convierte los servicios de prueba en producción**. La configuración local actual es:

- **Webpay Plus:** ambiente TEST. Para producción se requieren el código de comercio y las llaves de producción entregadas por Transbank.
- **Chilexpress:** credenciales de staging. Para vender en producción, configura sus credenciales productivas.
- **Starken:** conectado mediante Anyda; confirma con el proveedor que la credencial y el plan sirven en producción y revisa su cuota mensual.
- **BlueExpress:** tarifa fija de $4.990; no es cotización API.
- **Pago activo:** Webpay es el único método habilitado. Los demás están desactivados.

No habilites cobros reales hasta tener las credenciales productivas de Webpay. Los parches de Chilexpress y Starken viajan dentro del paquete; no actualices esos plugins en el panel sin reaplicar los parches.

## 5. Verificación puntual

- [ ] Abren la portada, productos, ficha, test, resultado, carrito y checkout con HTTPS.
- [ ] Se muestran los **42 productos** con fotos, precios, stock y categorías por marca/tipo.
- [ ] Los filtros de marca/tipo funcionan y “Ver todos los productos” regresa al catálogo completo.
- [ ] El test completa sus cinco preguntas, muestra productos del catálogo y pasa la rutina al carrito.
- [ ] Aparecen las opciones de envío para la comuna elegida (Chilexpress, Starken, BlueExpress y retiro) y Webpay como único medio de pago.
- [ ] `/wp-admin` inicia sesión y los correos de pedido llegan (tras configurar SMTP).

Si deseas ejecutar el arnés responsive, abre `https://clinicalskin.cl/static/docs/qa-responsive.html`; el paquete generado ya reemplaza su URL local por el dominio final. No completes un pago real como parte de esta verificación.

## Errores habituales

| Síntoma | Qué revisar |
|---|---|
| `Permission denied` o error crítico al extraer | Permisos `755` en carpetas y `644` en archivos; si no eres propietario, solicita al hosting que corrija la propiedad. |
| Páginas con 404 | Guardar Ajustes → Enlaces permanentes y comprobar `.htaccess` en la raíz. |
| CSS o imágenes apuntan a `localhost` | Repetir `wp search-replace`, revisar `home`/`siteurl` y comprobar `WP_HOME`/`WP_SITEURL`. |
| Falta un archivo de `wp-includes` | La extracción o subida quedó incompleta; reextrae el archivo completo y revisa la cuota/espacio libre. |
| No aparecen tarifas de envío | Revisar HTTPS, extensión cURL, credenciales y que se hayan subido los plugins locales parcheados. |
| Webpay rechaza el pago | Comprobar ambiente y credenciales: el paquete local está en TEST hasta que configures producción. |

## Archivos que no se suben

No subas `CREDENCIALES.md`, `.git`, los scripts de mantenimiento ni el CSV/carpeta de imágenes fuente. Conserva aparte `base.sql` y los paquetes como respaldo de la publicación.
