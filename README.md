# Landing NovaStrong

Landing estática mobile-first con una función de Cloudflare Pages para recibir leads. Abrir con un servidor local, por ejemplo:

```bash
python3 -m http.server 4173
```

## Captación de leads

El formulario envía un `POST` a `/api/leads`. La función `functions/api/leads.js` valida la solicitud, crea o valida la estructura de la pestaña configurada y añade el lead mediante Google Sheets API. Requiere estas variables en Cloudflare Pages:

- `GOOGLE_SERVICE_ACCOUNT_EMAIL`
- `GOOGLE_PRIVATE_KEY_BASE64` (secreto)
- `GOOGLE_SHEET_ID`
- `GOOGLE_SHEET_TAB`

La clave privada nunca debe añadirse al HTML, JavaScript del navegador ni al repositorio. La hoja debe compartirse con el correo de la cuenta de servicio con permiso de edición.

## Medición Shortl / Meta

El SDK público de Shortl está instalado en `index.html`. El consentimiento publicitario es opcional e independiente del consentimiento de contacto. El evento `Lead` se registra únicamente después de que `/api/leads` confirme la recepción y utiliza el ID estable generado por el servidor como `eventId`.

La prueba extremo a extremo debe comenzar desde la URL corta exacta creada en Shortl; una visita directa no contiene `_sl_click` y no puede atribuirse.

## Notas de mantenimiento

- Las fotografías reales suministradas están optimizadas en `assets/product/`. Si se reemplazan, conservar los nombres o actualizar las rutas y dimensiones declaradas en `index.html`.
- Las reseñas del arreglo `reviews` de `app.js` fueron indicadas por el propietario del sitio como experiencias verificadas y autorizadas para publicación.
- El propietario confirmó que las fotografías corresponden a los autores de las reseñas y que cuenta con autorización para publicarlas. Están optimizadas en `assets/reviews/`.
- Completar el responsable legal, la política de privacidad y los términos definitivos antes de publicar.

Los eventos `clic_cta`, `inicio_formulario`, `envio_formulario`, `formulario_exitoso` y `tracking_error` se emiten como `CustomEvent` (`novastrong:nombre_del_evento`) y también se envían a `window.dataLayer` solo si esa estructura ya existe.
