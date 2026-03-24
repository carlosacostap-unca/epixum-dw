# TP2 — Página personal con HTML semántico

**Asignatura:** Diseño Web  
**Unidad:** 1 — Fundamentos de la Web (Secciones 8 a 12)  
**Tipo:** Trabajo Práctico individual  
**Modalidad:** Desarrollo en laboratorio + entrega digital

---

## Objetivo

Construir una página web personal utilizando HTML5 con estructura semántica completa, validarla según los estándares del W3C, y explorar el resultado con las herramientas de desarrollo del navegador.

---

## Contexto

En este trabajo práctico vas a crear tu primera página web desde cero. No vamos a preocuparnos por la apariencia visual (eso viene en el TP3 con CSS); lo importante acá es que la **estructura** del documento sea correcta, que uses las **etiquetas semánticas** adecuadas para cada tipo de contenido, y que el código **pase la validación del W3C** sin errores.

Pensá en esta página como tu carta de presentación profesional: quién sos, qué estudiás, qué te interesa, cómo contactarte. El contenido es real y sobre vos.

---

## Consigna

Crear un archivo `index.html` que contenga tu página personal, respetando todos los requisitos que se detallan a continuación.

### Parte 1 — Estructura del documento

El documento debe incluir la estructura base completa de HTML5:

- Declaración `<!DOCTYPE html>`.
- Elemento `<html>` con atributo `lang` apropiado.
- Sección `<head>` con: codificación de caracteres UTF-8, configuración del viewport para dispositivos móviles, título descriptivo de la página, meta description con una breve descripción del contenido, y nombre del autor en una etiqueta meta.
- Sección `<body>` con todo el contenido visible.

### Parte 2 — Contenido y semántica

La página debe contener las siguientes secciones, utilizando los elementos semánticos que correspondan:

**Encabezado del sitio:** Tu nombre completo como título principal de la página, y un menú de navegación con enlaces internos (anclas) que lleven a cada sección de la página.

**Sección "Sobre mí":** Un párrafo de presentación donde cuentes quién sos, qué carrera cursás, en qué año estás y qué te motiva del mundo de la tecnología. Incluí al menos una imagen tuya o una imagen representativa con un texto alternativo descriptivo y apropiado.

**Sección "Formación":** Un listado de tu formación académica (secundario, carrera actual y cualquier otro estudio que quieras mencionar). Usá el tipo de lista que consideres más apropiado.

**Sección "Intereses y habilidades":** Una lista de tus intereses, hobbies o habilidades. Puede incluir tanto temas tecnológicos como personales.

**Sección "Sitios web que me gustan":** Una lista de al menos 3 sitios web que visites frecuentemente o que te parezcan interesantes, con enlaces que funcionen correctamente y que se abran en una nueva pestaña. Junto a cada enlace, escribí una o dos oraciones explicando por qué elegiste ese sitio.

**Sección "Contacto":** Tu dirección de correo electrónico como enlace `mailto:` y al menos una red social o plataforma profesional como enlace externo.

**Pie de página:** Un texto con el año actual, tu nombre y la leyenda "Trabajo Práctico 2 — Diseño Web".

### Parte 3 — Requisitos técnicos

- Usar **exclusivamente HTML** (no incluir CSS ni JavaScript).
- Utilizar los elementos semánticos de HTML5 vistos en clase: `<header>`, `<nav>`, `<main>`, `<section>`, `<article>` (si corresponde), `<aside>` (si corresponde), `<footer>`, `<figure>`, `<figcaption>`.
- Respetar la **jerarquía de encabezados**: un solo `<h1>`, y los niveles siguientes en orden lógico sin saltar niveles.
- Incluir al menos una imagen con atributos `src`, `alt`, `width` y `height`.
- Incluir al menos un enlace interno (ancla a una sección de la misma página) y al menos un enlace externo.
- Usar **comentarios HTML** (`<!-- ... -->`) para marcar el inicio de cada sección principal del documento.
- El código debe estar correctamente **indentado** y organizado de forma legible.
- El archivo debe llamarse `index.html` y la imagen debe estar en una carpeta llamada `img/` dentro del mismo directorio del proyecto.

### Parte 4 — Validación W3C

- Validar el documento con el validador del W3C (por entrada directa o por carga de archivo).
- El documento debe pasar la validación **sin errores**. Las advertencias (warnings) son aceptables pero se valorará que sean las mínimas posibles.
- Capturar una imagen de pantalla del resultado de la validación mostrando que no hay errores.

### Parte 5 — Exploración con DevTools

Abrir la página `index.html` en el navegador y usar las herramientas de desarrollo para realizar las siguientes actividades:

**Pestaña Elementos:**

- Localizar el elemento `<main>` en el árbol del DOM y expandirlo para ver su contenido.
- Seleccionar la imagen que incluiste y verificar que tenga el atributo `alt` correcto.
- Modificar temporalmente el texto del `<h1>` desde las DevTools (por ejemplo, cambiarlo a "Hola Mundo") y capturar una imagen de pantalla del cambio.

**Pestaña Red:**

- Recargar la página con la pestaña Red abierta.
- Capturar una imagen de pantalla de la pestaña Red mostrando todas las solicitudes HTTP realizadas.
- Identificar: cuántas solicitudes se hicieron, qué tipos de recursos se cargaron (documento, imagen, etc.), y qué código de estado devolvió cada una.

Escribir un breve párrafo (5-10 líneas) comentando lo que observaste en las DevTools y cómo se relaciona con lo que aprendiste en la clase sobre la arquitectura cliente-servidor y el protocolo HTTP.

---

## Estructura de entrega

Entregar la carpeta del proyecto (sin comprimir) a través de la plataforma **Epixum**, respetando la siguiente estructura:

```
tp2-apellido-nombre/
├── index.html
├── img/
│   └── (imagen utilizada)
└── capturas/
    ├── validacion-w3c.png
    ├── devtools-elementos.png
    ├── devtools-red.png
    └── reflexion-devtools.txt (o .pdf)
```

---

## Criterios de evaluación

| Criterio | Qué se evalúa |
|----------|---------------|
| Estructura HTML5 | DOCTYPE, html con lang, head completo (charset, viewport, title, meta description, meta author), body. |
| Uso de semántica | Uso correcto y justificado de header, nav, main, section, footer y otros elementos semánticos. No se abusa de div donde existe una etiqueta semántica apropiada. |
| Jerarquía de encabezados | Un solo h1, niveles jerárquicos sin saltos. |
| Contenido | Todas las secciones solicitadas están presentes con contenido real y significativo. |
| Elementos HTML | Uso correcto de párrafos, listas, enlaces (internos y externos), imagen con alt descriptivo, comentarios HTML. |
| Validación W3C | El documento pasa sin errores. Se incluye la captura de pantalla como evidencia. |
| Exploración DevTools | Se incluyen las capturas solicitadas y la reflexión demuestra comprensión de lo observado. |
| Calidad del código | Indentación consistente, código legible, organización de archivos correcta. |

---

## Ejemplo de estructura esperada (fragmento orientativo)

El siguiente fragmento muestra cómo podría verse la estructura general del documento. No es una solución completa ni hay que copiarlo textualmente; es solo una guía de referencia para entender la organización esperada.

```html
<!DOCTYPE html>
<html lang="es-AR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="Página personal de [nombre] — estudiante de Ingeniería en Informática">
  <meta name="author" content="[nombre]">
  <title>[Nombre] — Página personal</title>
</head>
<body>

  <!-- Encabezado del sitio -->
  <header>
    <h1>...</h1>
    <nav>
      <ul>
        <li><a href="#sobre-mi">Sobre mí</a></li>
        <li>...</li>
      </ul>
    </nav>
  </header>

  <!-- Contenido principal -->
  <main>

    <!-- Sección: Sobre mí -->
    <section id="sobre-mi">
      <h2>Sobre mí</h2>
      <figure>
        <img src="img/..." alt="..." width="..." height="...">
        <figcaption>...</figcaption>
      </figure>
      <p>...</p>
    </section>

    <!-- Sección: Formación -->
    <section id="formacion">
      <h2>Formación</h2>
      ...
    </section>

    <!-- Más secciones... -->

  </main>

  <!-- Pie de página -->
  <footer>
    <p>...</p>
  </footer>

</body>
</html>
```

---

## Recomendaciones finales

- Empezá siempre por la estructura base y después andá agregando secciones de a una.
- Validá frecuentemente con el W3C a medida que avanzás, no solo al final. Es más fácil corregir un error a la vez que diez juntos.
- Antes de entregar, abrí tu página en el navegador y verificá que todos los enlaces funcionen, que la imagen se vea, y que la navegación interna lleve a las secciones correctas.
- Recordá que en este TP no usamos CSS: la página va a verse "fea" y eso está perfecto. Lo que importa es la estructura. En el TP3 le vamos a dar vida visual.
