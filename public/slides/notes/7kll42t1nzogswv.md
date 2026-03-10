# Notas de Orador - Clase 1: Introducción a la IA y GenAI

## Slide 1: Título
**Speech:**
"¡Hola a todos y bienvenidos! Soy el Ing. Carlos Acosta Parra y hoy comenzamos una nueva aventura en el curso de Diseño de Software de Dispositivos Móviles.
En esta primera clase, vamos a explorar un tema que está revolucionando nuestra industria: la Inteligencia Artificial y, más específicamente, la Inteligencia Artificial Generativa."

**Notas:**
- Asegurar que todos tengan buena visibilidad.
- Hacer una pausa breve para que lean el título.

---

## Slide 2: Agenda de Hoy
**Speech:**
"Esta es nuestra hoja de ruta para hoy.
Primero, asentaremos las bases de qué es la IA.
Luego, entraremos en materia con la IA Generativa y los Modelos de Lenguaje (LLMs).
Veremos los conceptos técnicos clave para interactuar con ella: Prompts, Tokens y Contexto.
Lo más importante: veremos cómo esto se aplica directamente a nuestro trabajo como desarrolladores de software.
Y finalmente, revisaremos herramientas prácticas y consideraciones éticas."

**Notas:**
- No leer literalmente, solo mencionar los puntos clave.
- Generar expectativa sobre la sección 3.

---

## Slide 3: Introducción a la IA
**Speech:**
"Empecemos por el principio. Seguramente han escuchado el término IA mil veces, pero... ¿qué entendemos realmente por Inteligencia Artificial?"

**Notas:**
- Lanzar la pregunta al aire y esperar 2-3 segundos. No es necesario que respondan en voz alta, es para activar la atención.

---

## Slide 4: Definición General
**Speech:**
"Una definición clásica y útil es esta: 'La simulación de procesos de inteligencia humana por parte de máquinas'.
No se trata solo de calcular rápido, sino de **aprender** de datos, **razonar** para resolver problemas y **autocorregirse** cuando se cometen errores. Esos son los pilares."

**Notas:**
- Enfatizar las palabras: aprender, razonar, autocorrección.

---

## Slide 5: Ramas Principales
**Speech:**
"La IA es un campo enorme. Para no perdernos, distingamos tres niveles clave:
1.  **IA Estrecha (ANI):** Es lo que tenemos hoy. Un sistema que juega ajedrez increíblemente bien, pero no sabe hacer café. Es especialista.
2.  **Machine Learning:** Es el subconjunto de la IA donde las máquinas aprenden sin ser explícitamente programadas para cada regla.
3.  **Deep Learning:** Es una técnica dentro del ML inspirada en nuestras neuronas, capaz de manejar datos muy complejos como imágenes o voz."

**Notas:**
- Usar las animaciones de la diapositiva para ir revelando cada punto paso a paso.

---

## Slide 6: Inteligencia Artificial Generativa
**Speech:**
"Ahora, demos un salto. Hasta hace poco, la mayoría de la IA que usábamos era 'analítica'. Ahora estamos en la era de la IA Generativa."

**Notas:**
- Transición suave hacia el tema central.

---

## Slide 7: Discriminativa vs. Generativa
**Speech:**
"¿Cuál es la diferencia clave?
La **IA Discriminativa** (la tradicional) se dedica a clasificar. Le das una foto y te dice: 'Esto es un gato'. Discrimina entre opciones.
La **IA Generativa**, en cambio, CREA. Le dices 'Dibújame un gato azul' y genera una imagen nueva, píxel por píxel, que nunca antes existió.
Pasamos de analizar el pasado a crear el futuro."

**Notas:**
- Señalar los bloques de código en la diapositiva como ejemplos conceptuales.

---

## Slide 8: ¿Qué puede generar?
**Speech:**
"Y no es solo texto o imágenes.
Hoy generamos audio, video, y para nosotros lo más crítico: **CÓDIGO**.
Sistemas como GitHub Copilot no solo 'completan' código, sino que pueden escribir funciones enteras basándose en lo que queremos hacer."

**Notas:**
- Mencionar ejemplos rápidos si la audiencia conoce Midjourney o ChatGPT.

---

## Slide 9: LLMs (Large Language Models)
**Speech:**
"El motor detrás de herramientas como ChatGPT son los LLMs.
Son modelos entrenados con casi todo el texto de internet.
Ojo: No 'piensan' como nosotros. Lo que hacen es predecir estadísticamente qué palabra viene a continuación.
Si digo 'El desarrollo móvil es...', el modelo calcula que 'fundamental' o 'complejo' son continuaciones probables. Es matemática, no magia, pero el resultado es sorprendentemente coherente."

**Notas:**
- Desmitificar la IA. Es importante que entiendan que es probabilística.

---

## Slide 10: Conceptos Clave
**Speech:**
"Para usar bien estas herramientas, necesitamos hablar su idioma. Hay tres o cuatro conceptos técnicos que deben dominar: Prompt, Tokens, Contexto y Temperatura."

**Notas:**
- Introducción rápida a la sección técnica.

---

## Slide 11: El Prompt
**Speech:**
"Todo empieza con el **Prompt**. Es la instrucción que le damos a la máquina.
La calidad de la respuesta depende 100% de la calidad del prompt. 'Garbage in, garbage out'.
Un buen prompt tiene estructura: Instrucción clara, Contexto (rol), Datos de entrada y Formato de salida."

**Notas:**
- Dar un ejemplo verbal de mal prompt ("Hazme un código") vs buen prompt ("Actúa como experto en React y crea un componente de botón...").

---

## Slide 12: Tokens
**Speech:**
"Luego están los **Tokens**.
Nosotros leemos palabras, la IA lee tokens. Son fragmentos de caracteres.
¿Por qué importa? Porque las APIs cobran por token, y porque hay un límite de cuántos tokens puede procesar el modelo de una vez."

**Notas:**
- Explicar que en español gastamos más tokens que en inglés porque las palabras suelen ser más largas o se fragmentan más.

---

## Slide 13: Ventana de Contexto
**Speech:**
"Ese límite se llama **Ventana de Contexto**. Es la memoria a corto plazo.
Si la ventana se llena, el modelo olvida lo primero que le dijiste.
Hoy en día tenemos ventanas enormes (como Gemini 1.5 Pro con millones de tokens), pero igual hay que ser eficientes."

**Notas:**
- Analogía: Es como la RAM. Si se llena, empieza a borrar lo viejo.

---

## Slide 14: Temperatura
**Speech:**
"Finalmente, la **Temperatura**.
Es un parámetro que ajustamos.
Baja temperatura (0.0) = El modelo es como un robot lógico. Siempre da la misma respuesta. Ideal para código.
Alta temperatura (1.0) = El modelo es como un poeta creativo. Varía mucho. Ideal para brainstorming."

**Notas:**
- Consejo práctico: Para programar, siempre temperatura baja para evitar errores aleatorios.

---

## Slide 15: IA en Desarrollo de Software
**Speech:**
"Bien, ¿y esto cómo nos afecta a nosotros que escribimos código?"

**Notas:**
- Pausa dramática.

---

## Slide 16: Transformación del Flujo de Trabajo
**Speech:**
"Quiero ser claro: La IA **no** viene a quitarles el trabajo, viene a potenciarlo.
Es como pasar de cavar con una pala a usar una excavadora.
Nos ayuda a eliminar las tareas repetitivas y aburridas para que podamos concentrarnos en la arquitectura y la lógica de negocio compleja."

**Notas:**
- Mensaje tranquilizador pero empoderador.

---

## Slide 17: Casos de Uso Principales
**Speech:**
"(Navegar por los fragmentos de la diapositiva)
1.  **Generación:** Le pides una función de validación y la tienes en segundos.
2.  **Explicación:** ¿Llegas a un proyecto nuevo con código legacy horrible? Le pides a la IA que te lo explique.
3.  **Debugging:** A veces encuentra ese error de sintaxis que llevas horas buscando.
4.  **Tests:** Escribir pruebas unitarias es tedioso. La IA lo hace excelente y nos ayuda a tener software más robusto."

**Notas:**
- Detenerse un poco más en la Generación de Código, ya que es lo que más usarán.

---

## Slide 18: Herramientas Populares
**Speech:**
"En el mercado hay muchas opciones.
Están los chats como ChatGPT o Claude para consultas generales.
Y están los integrados en el editor, como Copilot o Trae (que es lo que usaremos). Estos son más potentes porque ven tu contexto, tus archivos abiertos."

**Notas:**
- Mencionar que exploraremos algunas de estas durante el curso.

---

## Slide 19: Consideraciones Éticas
**Speech:**
"Un gran poder conlleva una gran responsabilidad.
Cuidado con las **alucinaciones**: la IA puede inventar librerías que no existen con total seguridad.
Cuidado con la **seguridad**: nunca peguen claves API o contraseñas en ChatGPT.
Y **Supervisión**: Ustedes son los pilotos. Si el código falla, la culpa es del desarrollador, no de la IA. Siempre revisen lo que genera."

**Notas:**
- Tono serio en este punto. Es crucial para su carrera profesional.

---

## Slide 20: Conclusión
**Speech:**
"En resumen: La IA Generativa es su nuevo copiloto. Aprendan a usarla, experimenten y no le tengan miedo. Va a cambiar la forma en que construimos el mundo digital."

**Notas:**
- Cierre motivacional.

---

## Slide 21: Preguntas
**Speech:**
"¿Alguna duda, comentario o experiencia que quieran compartir?"

**Notas:**
- Abrir el foro.
