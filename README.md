# Yuro en Cloudflare Workers (gratis)

## Requisitos
- Cuenta gratis en [dash.cloudflare.com](https://dash.cloudflare.com) (sin tarjeta)
- Node.js instalado en tu PC

## Paso 1: Instalar Wrangler (CLI de Cloudflare)

```bash
npm install -g wrangler
```

## Paso 2: Login en Cloudflare

```bash
wrangler login
```

Se abrirá tu navegador para autorizar.

## Paso 3: Crear la base de datos D1

```bash
wrangler d1 create yuro
```

Copia el `database_id` que aparece y pégalo en `wrangler.toml`:

```toml
[[d1_databases]]
binding = "DB"
database_name = "yuro"
database_id = "PEGA_AQUI_TU_DATABASE_ID"
```

## Paso 4: Crear las tablas

```bash
wrangler d1 execute yuro --file=./schema.sql
```

## Paso 5: Desplegar

```bash
wrangler deploy
```

Te dará una URL como: `https://yuro.TU_USUARIO.workers.dev`

## Paso 6: ¡Listo!

Abre la URL en tu navegador y regístrate.

---

## Comandos útiles

```bash
# Ver logs
wrangler tail

# Ver datos de la BD
wrangler d1 execute yuro --command="SELECT * FROM usuarios"

# Reiniciar (borrar todo)
wrangler d1 execute yuro --file=./schema.sql
```

---

## Límites gratis

| Recurso | Gratis |
|---------|--------|
| Peticiones/día | 100,000 |
| CPU | 10ms por petición |
| Almacenamiento D1 | 5 GB |
| **Coste** | **$0/mes** |

Para una comunidad de amigos es más que suficiente.

---

## Subir cambios

```bash
# Si cambias el frontend
wrangler deploy

# Si cambias la BD
wrangler d1 execute yuro --file=./schema.sql
```
