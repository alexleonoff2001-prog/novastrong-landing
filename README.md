# Landing NovaStrong

Landing estática mobile-first, sin dependencias ni rastreadores. Abrir con un servidor local, por ejemplo:

```bash
python3 -m http.server 4173
```

## Integraciones pendientes

- Las fotografías reales suministradas están optimizadas en `assets/product/`. Si se reemplazan, conservar los nombres o actualizar las rutas y dimensiones declaradas en `index.html`.
- Conectar el envío real en el punto marcado `DEMO INTEGRATION POINT` en `app.js`, usando un endpoint HTTPS autorizado. La versión actual no transmite ni almacena datos.
- Las reseñas del arreglo `reviews` de `app.js` son ejemplos ficticios identificados visualmente. Sustituirlas únicamente por experiencias verificadas y cambiar `verified` a `true` cuando exista respaldo documental.
- Completar el responsable legal, la política de privacidad y los términos definitivos antes de publicar.

Los eventos `clic_cta`, `inicio_formulario`, `envio_formulario` y `formulario_exitoso` se emiten como `CustomEvent` (`novastrong:nombre_del_evento`) y también se envían a `window.dataLayer` solo si esa estructura ya existe. No se instala ninguna plataforma analítica.
