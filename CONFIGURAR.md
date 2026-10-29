# Activar sincronización privada

La aplicación está preparada, pero la sincronización NO está activa hasta configurar Supabase y publicar los archivos actualizados. Conserva tu web actual mientras completas estos pasos.

## 1. Preparar Supabase

Puedes conectar el plugin Supabase en ChatGPT para que te ayude con la configuración. También puedes hacerlo desde https://supabase.com/dashboard.

1. Crea un proyecto en tu propia cuenta. Revisa las condiciones y los límites del plan antes de elegirlo. No compartas la contraseña de la base de datos.
2. En SQL Editor, ejecuta el contenido completo de `supabase.sql`. Este archivo crea la tabla, las reglas de acceso por usuario y el guardado con control de versiones. No actives acceso público a la tabla.
3. En Authentication → Users, crea tu usuario con correo y contraseña, mediante Add user/Create new user; confirma el correo con la opción disponible del panel. Usa una contraseña exclusiva. Esta app no incluye registro público ni recuperación de contraseña; administra tu cuenta desde Supabase.
4. En la configuración de Authentication, desactiva el registro de usuarios nuevos si solo usarás tu cuenta. Mantén habilitado el acceso mediante correo y contraseña. Si luego necesitas otra cuenta, créala desde el panel.
5. Configura la URL del sitio como https://andresibh.github.io/mi-estudio-y-pastoreo/.
6. Obtén Project URL y la clave **Publishable** (o la clave pública heredada `anon`) desde Connect o los ajustes API del proyecto.

## 2. Completar config.js

Abre `config.js` en VS Code. Pega la URL y la clave pública entre las comillas correspondientes. Ejemplo ilustrativo:

```js
window.MEP_CONFIG = {
  supabaseUrl: 'https://TU-PROYECTO.supabase.co',
  supabasePublishableKey: 'TU-CLAVE-PUBLICA'
};
```

Estos dos datos están diseñados para el navegador. NUNCA pegues una clave `secret`, `service_role`, contraseña de base de datos ni contraseña de tu usuario en el código o en GitHub. La privacidad de las filas depende de las políticas SQL y de la sesión del usuario, no de ocultar la clave pública.

## 3. Actualizar GitHub

1. Antes de actualizar, abre la versión anterior y exporta un respaldo JSON en cada dispositivo que tenga información que quieras conservar.
2. En tu repositorio, elige Add file → Upload files.
3. Sube el contenido de esta carpeta a la raíz, reemplazando los archivos anteriores. `index.html`, `config.js` y `sync.js` deben quedar al mismo nivel. No subas respaldos personales.
4. Guarda con Commit changes. Conserva Pages en main / (root).
5. Cuando termine la publicación, cierra y vuelve a abrir la aplicación. Si aparece la versión anterior, recarga Safari; el nuevo service worker reemplaza la caché anterior. No borres los datos del navegador sin exportar antes tus respaldos.

## 4. Usar la misma cuenta

1. Abre la aplicación en tu computadora e inicia sesión.
2. Si aparece «Importar biblioteca de este navegador», púlsalo una sola vez: añade una copia de los datos de la versión anterior. La copia anterior permanece local. Si has borrado esos datos, importa tu respaldo JSON desde Respaldo.
3. Crea o modifica un tema y espera el mensaje «Sincronizado».
4. Abre la misma dirección en Safari en iPhone/iPad e inicia sesión con el mismo correo y contraseña.
5. Comprueba que aparezca el tema y añade la app a la pantalla de inicio si aún no lo hiciste.

La nube se revisa cada 15 segundos mientras la app está visible, al volver a ella y con «Sincronizar ahora». Los cambios se envían al guardar. Para recibir cambios de otro dispositivo, vuelve a Biblioteca; la app evita reemplazar un formulario abierto.

## Conflictos y conexión

- Puedes seguir editando si pierdes la conexión después de abrir tu biblioteca. Los cambios quedan pendientes localmente y se reintentan al recuperar conexión.
- Para abrir la aplicación desde cero se requiere conexión: no se garantiza arranque sin internet ni sin cargar el SDK de acceso.
- Si dos dispositivos modifican la misma versión, la app bloquea la segunda subida. Descarga la copia pendiente y luego usa la versión de la nube. Incorpora manualmente los cambios necesarios. No hay combinación automática.
- Restaurar un JSON reemplaza la biblioteca de esa cuenta y se sincroniza. Exporta antes de restaurar. La importación de datos de la versión anterior, en cambio, los añade.
- Si cierras sesión con cambios pendientes y aceptas descartarlos, la copia de esa cuenta se elimina de ese navegador. Exporta primero.

## Privacidad y alcance

El código es público en GitHub; los temas se guardan en Supabase y solo son accesibles por API con la cuenta propietaria, si ejecutaste las políticas incluidas. El administrador del proyecto tiene acceso administrativo. No es cifrado de extremo a extremo.

Se conserva una copia de la cuenta en el navegador mientras trabajas. Cierra sesión en equipos compartidos. El almacenamiento anterior `mep_v1` se conserva para evitar pérdidas; si importaste datos sensibles de la versión anterior, respáldalos y elimina después ese almacenamiento desde los ajustes del navegador. Evita registrar información personal innecesaria.

## Validación incluida

Se verificó la sintaxis y se ejecutaron 7 pruebas automatizadas con servidor simulado: carga de nube, guardado, conflicto, recuperación de pendientes, bloqueo ante fallo inicial, edición sin conexión y cierre de sesión. Falta probar en tu proyecto real las políticas SQL, el acceso y el recorrido computadora → iPhone/iPad.

Para verificar privacidad en producción, confirma que la tabla no devuelve filas sin iniciar sesión y que una segunda cuenta de prueba no puede leer o modificar filas de la primera. Prueba también dos ediciones simultáneas antes de introducir información real.

Referencias oficiales:
- https://supabase.com/docs/guides/database/postgres/row-level-security
- https://supabase.com/docs/guides/database/functions
- https://supabase.com/docs/guides/auth/passwords
- https://supabase.com/docs/guides/getting-started/api-keys
