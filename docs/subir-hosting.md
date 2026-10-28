# Subir Clinical Skin al hosting

Guía breve, actualizada al 26/10/2026, para publicar el sitio local de WordPress/WooCommerce en cPanel. Los archivos se preparan desde `C:\docker\clinicalskin-woo`; el diseño fuente está en `C:\xampp\htdocs\clinicalskin`.

## Antes de empezar

- Dominio canónico: `www.clinicalskin.cl`. Activa AutoSSL/HTTPS en cPanel y usa `https://www.clinicalskin.cl`; el HTTP debe redirigir a HTTPS. Webpay y los servicios de envío requieren conexión segura.
- La raíz del dominio en este hosting es `/home2/rtqfwfte/clinicalskin.cl` (confírmala en cPanel si fue cambiada).
- El hosting está en PHP 8.5. La copia local usa WordPress 7.1.2, WooCommerce 11.1.2 y PHP 8.3.
- El catálogo real tiene **42 productos**. El paquete ya contiene sus fotos en `wp-content/uploads`; **no vuelvas a importar el CSV** durante la instalación.
- Haz una copia de respaldo del contenido y de la base de datos que ya existan en esa raíz antes de reemplazarlos.
- Abre Docker Desktop antes de exportar; deben estar activos los servicios `wordpress` y `db`.
- Deja al menos **500 MB libres** para la extracción. Las fotos de producto ya se optimizaron: `wp-content/uploads` bajó de 203,7 MB a 19,1 MB. El sitio extraído ocupa aproximadamente 203 MB.

## 1. Preparar los archivos actualizados

Abre PowerShell y ejecuta:

& 'C:\docker\clinicalskin-woo\scripts\exportar-hosting.ps1' -Dominio 'https://www.clinicalskin.cl'

El script exporta la base de datos y construye los dos paquetes en `C:\docker\clinicalskin-woo\salida\`:

| Archivo | Para qué sirve | Tamaño actual aproximado |
|---|---|---:|
| `base.sql` | Catálogo, ajustes, páginas y configuración WooCommerce | 1,6 MB |
| `site.tar.gz` | Sitio completo con permisos Unix; recomendado si cPanel permite extraer TAR.GZ | 83,0 MB |
| `wordpress.zip` | Alternativa para extraer desde File Manager | 88,4 MB |

El paquete incluye el núcleo de WordPress, tema, plugins instalados localmente, medios, diseño y las páginas estáticas. También deja los metadatos estáticos apuntando al dominio final. Se excluyen `.git`, el CSV y las imágenes fuente del inventario (`static/woocommerce`) y la documentación Markdown interna del sitio estático. **Sube `base.sql` y solo uno de los dos paquetes** (`site.tar.gz` o `wordpress.zip`).

> Los archivos de Chilexpress y Starken están parcheados en la copia local. Los paquetes copian las versiones instaladas; no reinstales esos plugins desde WordPress.org durante la subida.

## 2. Crear la base e instalar con File Manager

1. En cPanel, crea una base de datos MySQL y un usuario con todos los privilegios. Guarda el nombre, usuario y contraseña tal como aparecen en el panel (cPanel suele anteponer un prefijo).
2. Haz respaldo del sitio parcial que ya exista. Confirma que `/home2/rtqfwfte/clinicalskin.cl` sea el document root de este dominio. Si solo contiene la instalación incompleta anterior, respáldala y deja la raíz limpia antes de extraer.
3. En File Manager, sube `base.sql` y `site.tar.gz` a esa carpeta. Selecciona el TAR y pulsa **Extract**. Si el panel no admite TAR.GZ, usa `wordpress.zip`. El paquete incluye `wp-admin/`, `wp-includes/`, `wp-content/`, `static/`, `css/`, `js/`, `img/`, `.htaccess` y `wp-config.php`; **no instales otro WordPress encima**.
4. `site.tar.gz` ya trae permisos `755` en directorios y `644` en archivos. La extracción debe quedar propiedad de tu usuario cPanel para que WordPress pueda escribir en `wp-content/uploads`. Si usas ZIP y encuentras permisos incorrectos, en File Manager usa **Change Permissions** recursivo, aplicando `755` a carpetas y `644` a archivos por separado.
5. Si aparece `Permission denied` o no puedes borrar/reemplazar archivos de la instalación parcial, no sigas sobrescribiendo: solicita al hosting que restablezca la propiedad de `/home2/rtqfwfte/clinicalskin.cl` a tu usuario cPanel. Luego limpia la raíz y extrae de nuevo.

## 3. Conectar WordPress al hosting

1. En File Manager, edita el `wp-config.php` de la raíz y cambia solo `DB_NAME`, `DB_USER`, `DB_PASSWORD` y `DB_HOST` por los datos de cPanel. Mantén el prefijo de tablas. Deja `WP_DEBUG` en `false`.
2. En phpMyAdmin, selecciona la base nueva e **importa `base.sql`**.
3. Antes de abrir WordPress, en phpMyAdmin → SQL, actualiza `home` y `siteurl`. Sustituye `wp_options` por la tabla con el prefijo indicado en `wp-config.php`:

   ```sql
   UPDATE `wp_options` SET `option_value` = 'https://www.clinicalskin.cl'
   WHERE `option_name` IN ('home', 'siteurl');
   ```

4. En File Manager, comprueba que `wp-config.php` no tenga `WP_HOME` o `WP_SITEURL` fijados a localhost. Si existen, cámbialos a `https://www.clinicalskin.cl`.
5. Abre `https://www.clinicalskin.cl/wp-admin` e instala Better Search Replace. Busca `http://localhost:8080` y reemplázalo por `https://www.clinicalskin.cl` en todas las tablas, con soporte para datos serializados.
6. En Ajustes → Enlaces permanentes, pulsa **Guardar cambios**. Comprueba que AutoSSL/HTTPS esté activo y configura SMTP para que lleguen los correos de pedidos.

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

Si deseas ejecutar el arnés responsive, abre `https://www.clinicalskin.cl/static/docs/qa-responsive.html`; el paquete generado ya reemplaza su URL local por el dominio final. No completes un pago real como parte de esta verificación.

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
