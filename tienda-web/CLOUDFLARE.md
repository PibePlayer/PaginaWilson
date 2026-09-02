# Despliegue en Cloudflare Workers

Este proyecto se publica como un Cloudflare Worker con OpenNext.

## Preparación local

1. Copiá `.dev.vars.example` como `.dev.vars` y completá sus valores.
2. Probá la compilación y el runtime de Cloudflare:

   ```bash
   npm run preview
   ```

3. La sincronización administrativa exige el encabezado:

   ```text
   Authorization: Bearer <ADMIN_SYNC_SECRET>
   ```

## Configuración de Git en Cloudflare

Al conectar el repositorio de GitHub, configurá:

- **Root directory:** `tienda-web`
- **Build command:** `npm run build:cloudflare`
- **Deploy command:** `npx wrangler deploy`
- **Non-production branch deploy command:** `npx wrangler versions upload`
- **Production branch:** la rama que elijas como producción

El Worker creado en el panel debe llamarse `tienda-web`, igual que el valor
`name` de `wrangler.jsonc`.

En **Build variables and secrets** cargá `MONGODB_URI`,
`MONGODB_USERNAME`, `MONGODB_PASSWORD`, `MONGODB_CONNECTION_MODE=workers` y
`NEXT_PUBLIC_WHATSAPP_PHONE`.
Las dos páginas públicas consultan MongoDB durante el build, por lo que esas
variables deben existir también durante la compilación. Marcá como secretos
las credenciales de MongoDB.

En **Settings > Variables & Secrets**, definí estas variables de runtime en
los entornos de producción y preview:

- `MONGODB_URI`
- `MONGODB_USERNAME`
- `MONGODB_PASSWORD`
- `MONGODB_CONNECTION_MODE=workers`
- `MERCADOLIBRE_CLIENT_ID`
- `MERCADOLIBRE_CLIENT_SECRET`
- `MERCADOLIBRE_REDIRECT_URI`
- `NEXT_PUBLIC_WHATSAPP_PHONE`
- `ADMIN_SYNC_SECRET`

Marcá como secretos todas excepto `NEXT_PUBLIC_WHATSAPP_PHONE`. Esa variable
pública debe estar disponible durante el build porque Next.js la incorpora al
JavaScript del navegador.

## Modo de conexión MongoDB

`MONGODB_CONNECTION_MODE` permite elegir el ciclo de vida de la conexión:

- `workers`: abre y cierra la conexión por solicitud. Es el modo obligatorio
  para Cloudflare Workers y el valor por defecto.
- `pooled`: reutiliza una conexión en memoria y ofrece mejor rendimiento en un
  servidor Node.js persistente. No debe usarse en Cloudflare Workers porque el
  runtime no permite reutilizar sockets TCP entre solicitudes.

Después del primer despliegue, actualizá `MERCADOLIBRE_REDIRECT_URI` y la URL de callback registrada en Mercado Libre a:

```text
https://<tu-worker>.<tu-subdominio>.workers.dev/api/auth/mercadolibre/callback
```

## Despliegue manual

Para publicar desde tu máquina:

```bash
npx wrangler login
npm run deploy
```
