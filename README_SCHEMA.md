# Configuración de PocketBase para Epixum Node

Para que la aplicación funcione correctamente, necesitas crear las siguientes colecciones en tu instancia de PocketBase (`https://pocketbase-mobile.epixum.com/_/`).

## 1. Colección: `courses` (Opcional por ahora, pero recomendada)
- **Name**: `courses`
- **Type**: `Base`
- **Fields**:
    - `title`: Text (Required)
    - `description`: Text

### Users Collection (`users`)

- **role**: Select (options: "admin", "docente", "estudiante").
- **firstName**: Text (Required)
- **lastName**: Text (Required)
- **dni**: Text
- **enrollmentId**: Text (Matrícula Universitaria)
- **birthDate**: Date
- **phone**: Text
  - Esto permitirá identificar los permisos de cada usuario.

### API Rules (Reglas de Acceso)

Para que el rol "Docente" pueda gestionar el contenido, debes configurar las siguientes reglas en PocketBase:

**Collections: `classes`, `assignments`, `links`**

- **List/View Rule**: `""` (Público o accesible para todos los autenticados, según prefieras. Si es solo estudiantes/docentes: `@request.auth.id != ""`)
- **Create/Update/Delete Rule**: `@request.auth.role = "docente" || @request.auth.role = "admin"`

**Collection: `users`**

- **List/View Rule**: `id = @request.auth.id || @request.auth.role = "admin"`
- **Create Rule**: `""` (Público, para permitir registro)
- **Update Rule**: `id = @request.auth.id && (@request.data.role:isset = false || role = @request.data.role) || @request.auth.role = "admin"`
  - *Nota*: Esto permite que los usuarios editen su perfil pero **NO** su rol. Solo los admins pueden cambiar roles.
- **Delete Rule**: `id = @request.auth.id || @request.auth.role = "admin"`
  - *Nota*: Permite que los usuarios borren su cuenta y que los admins borren a cualquiera.

## Pasos para implementar Roles

1.  Ve a la colección `users` > Edit Collection > Add Field > Select.

## 2. Colección: `classes`
- **Name**: `classes`
- **Type**: `Base`
- **Fields**:
    - `title`: Text (Required)
    - `description`: Text
    - `date`: Date

## 3. Colección: `assignments` (Trabajos Prácticos)
- **Name**: `assignments`
- **Type**: `Base`
- **Fields**:
    - `title`: Text (Required)
    - `description`: Editor (Rich Text)
    - `dueDate`: Date

## 4. Colección: `links`
- **Name**: `links`
- **Type**: `Base`
- **Fields**:
    - `title`: Text (Required)
    - `url`: Text (Required) (Cambiar de URL a Text para permitir rutas relativas de diapositivas)
    - `type`: Select (Required, options: "link", "file", "slide") (Default: "link")
    - `class`: Relation (Single, Optional) -> Collection: `classes`
    - `assignment`: Relation (Single, Optional) -> Collection: `assignments`

## 5. Colección: `deliveries` (Entregas de TP)
- **Name**: `deliveries`
- **Type**: `Base`
- **Fields**:
    - `assignment`: Relation (Single, Required) -> Collection: `assignments`
    - `student`: Relation (Single, Required) -> Collection: `users`
    - `repositoryUrl`: URL (Required)
- **Constraints**:
    - Unique index on `assignment` + `student` (Un estudiante solo puede tener una entrega por TP)
- **API Rules**:
    - **List/View Rule**: `student = @request.auth.id || @request.auth.role = "docente" || @request.auth.role = "admin"`
        - *Nota*: Los estudiantes solo ven sus entregas; docentes/admins ven todas.
    - **Create Rule**: `@request.auth.id != "" && @request.auth.role = "estudiante"`
    - **Update Rule**: `student = @request.auth.id || @request.auth.role = "admin"`
        - *Nota*: Estudiantes pueden modificar su entrega.
    - **Delete Rule**: `student = @request.auth.id || @request.auth.role = "admin"`

## 6. Colección: `teams`
- **Name**: `teams`
- **Type**: `Base`
- **Fields**:
    - `name`: Text (Required)
    - `members`: Relation (Multiple) -> Collection: `users`
- **API Rules**:
    - **List/View**: `@request.auth.id != ""`
    - **Create/Update/Delete**: `@request.auth.role = "docente" || @request.auth.role = "admin"`

## 8. Colección: `messages` (Chat de Equipo)
- **Name**: `messages`
- **Type**: `Base`
- **Fields**:
    - `text`: Text (Required)
    - `sender`: Relation (Single, Required) -> Collection: `users` (Renamed from `user` to avoid system conflicts)
    - `team`: Relation (Single, Required) -> Collection: `teams`
- **API Rules**:
    - **List/View**: `@request.auth.id != "" && team.members.id ?= @request.auth.id`
        - *Nota*: Solo los miembros del equipo pueden ver los mensajes.
    - **Create Rule**: `@request.auth.id != "" && @request.data.team.members ?= @request.auth.id`

## 9. Colección: `inquiries` (Consultas)
- **Name**: `inquiries`
- **Type**: `Base`
- **Fields**:
    - `title`: Text (Required)
    - `description`: Text (Required)
    - `status`: Select (options: "Pendiente", "Resuelta") (Default: "Pendiente")
    - `author`: Relation (Single, Required) -> Collection: `users`
    - `class`: Relation (Single, Optional) -> Collection: `classes`
    - `assignment`: Relation (Single, Optional) -> Collection: `assignments`
- **API Rules**:
    - **List/View**: `@request.auth.id != ""` (Cualquier usuario autenticado puede ver las consultas)
    - **Create**: `@request.auth.id != ""`
    - **Update**: `author = @request.auth.id || @request.auth.role = "docente" || @request.auth.role = "admin"` (Autor o docentes pueden marcar como resuelta)
    - **Delete**: `author = @request.auth.id || @request.auth.role = "docente" || @request.auth.role = "admin"`

## 10. Colección: `inquiry_responses` (Respuestas a Consultas)
- **Name**: `inquiry_responses`
- **Type**: `Base`
- **Fields**:
    - `inquiry`: Relation (Single, Required) -> Collection: `inquiries`
    - `author`: Relation (Single, Required) -> Collection: `users`
    - `content`: Text (Required)
- **API Rules**:
    - **List/View**: `@request.auth.id != ""`
    - **Create**: `@request.auth.id != ""`
    - **Update**: `author = @request.auth.id || @request.auth.role = "docente" || @request.auth.role = "admin"`
    - **Delete**: `author = @request.auth.id || @request.auth.role = "docente" || @request.auth.role = "admin"`

## Datos de Ejemplo
Una vez creadas las colecciones y configuradas las reglas, puedes añadir algunos registros de prueba:

1. Crea una **Clase**: "Instalación y configuración"
2. Crea un **Link**: "Video de instalación" (url: https://youtube.com/..., class: [ID de la clase anterior])
