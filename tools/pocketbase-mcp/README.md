# pocketbase-epixum-dw

Servidor MCP local para conectar Codex con la instancia PocketBase de este proyecto.

## Uso directo

```powershell
npm run mcp:pocketbase
```

Tambien se puede ejecutar el archivo directamente:

```powershell
node tools/pocketbase-mcp/server.mjs
```

El servidor lee `.env.local` desde la raiz del proyecto.

Variables reconocidas:

- `NEXT_PUBLIC_POCKETBASE_URL` o `POCKETBASE_URL`
- `POCKETBASE_ADMIN` o `POCKETBASE_ADMIN_EMAIL`
- `POCKETBASE_PASSWORD` o `POCKETBASE_ADMIN_PASSWORD`

Las credenciales se usan solo dentro del proceso MCP y no se imprimen en las respuestas.

## Herramientas

- `health`
- `whoami`
- `list_collections`
- `get_collection`
- `list_records`
- `get_record`
- `create_record`
- `update_record`
- `delete_record`
- `create_collection`
- `update_collection`
- `delete_collection`
- `validate_course_schema`

Las operaciones de escritura y borrado deben quedar con aprobacion explicita en la configuracion de Codex.
