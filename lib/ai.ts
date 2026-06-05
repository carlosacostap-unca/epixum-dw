import OpenAI from 'openai';
import type { ResponseCreateParamsNonStreaming, ResponseInputContent } from 'openai/resources/responses/responses';
import { Assignment } from '@/types';
import fs from 'fs/promises';
import path from 'path';
import JSZip from 'jszip';

let openaiClient: OpenAI | null = null;

const getOpenAIClient = () => {
  if (!openaiClient && process.env.OPENAI_API_KEY) {
    openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return openaiClient;
};

type GeneratedQuestion = {
  kind: 'Conceptual' | 'Detectar error en codigo' | 'Explicar fragmento de codigo' | 'Elegir codigo para necesidad';
  question: string;
  options: { id: string; text: string }[];
  correctOptionId: string;
  explanation: string;
  difficulty: 'Basica' | 'Intermedia' | 'Avanzada';
  sourceReference?: string;
};

type AIEvaluationResult = {
  aiGrade?: number;
  aiFeedback?: string;
  aiVerdict?: 'Aprobado' | 'Corregir y reenviar';
};

function stripXmlText(xml: string) {
  return xml
    .replace(/<w:tab\/>/g, ' ')
    .replace(/<\/w:p>/g, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

async function extractDocxText(buffer: Buffer) {
  const zip = await JSZip.loadAsync(buffer);
  const documentXml = await zip.file('word/document.xml')?.async('text');
  if (!documentXml) {
    throw new Error('No se pudo leer el contenido del DOCX.');
  }
  return stripXmlText(documentXml);
}

function buildPartialExamQuestionPrompt(params: {
  unitName: string;
  sourceLabel: string;
  questionCount: number;
  mode?: 'course' | 'quiz-show';
}) {
  if (params.mode === 'quiz-show') {
    return `
Genera ${params.questionCount} preguntas de opcion multiple para un banco de preguntas de parciales.

Contexto:
- Unidad o categoria: ${params.unitName}
- Fuente: ${params.sourceLabel}

Estilo:
- Las preguntas deben tener un estilo de programa de concursos, similar a "Quien quiere ser millonario".
- No asumas que deben estar relacionadas con Diseno Web, HTML, CSS, JavaScript ni programacion, salvo que el prompt del docente lo pida explicitamente.
- Cada pregunta debe ser clara, interesante y autocontenida.
- Puede haber preguntas de cultura general, historia, ciencia, arte, geografia, tecnologia, actualidad estable, entretenimiento o el tema indicado por el docente.
- Evita preguntas excesivamente tecnicas, ambiguas, capciosas o basadas en datos demasiado recientes.
- Ordena la dificultad de manera variada: algunas faciles, algunas intermedias y algunas avanzadas.

Requisitos:
- Cada pregunta debe tener exactamente 4 opciones.
- Usa IDs de opcion "a", "b", "c" y "d".
- Debe haber una unica respuesta correcta.
- Las opciones incorrectas deben ser plausibles, pero claramente descartables para quien conoce la respuesta.
- Incluye una explicacion breve de la respuesta correcta.
- Usa "Conceptual" como tipo por defecto, salvo que el prompt del docente pida especificamente preguntas con codigo.
- Devuelve solo JSON valido segun el esquema.
`;
  }

  return `
Genera ${params.questionCount} preguntas de opcion multiple para un banco de preguntas de parciales de un curso de Diseno Web.

Contexto:
- Unidad: ${params.unitName}
- Fuente: ${params.sourceLabel}
- Estudiantes de primer ano de Tecnicatura en Diseno de Software.

Requisitos:
- Cada pregunta debe evaluar comprension conceptual y aplicacion basica.
- Cada pregunta debe tener exactamente 4 opciones.
- Usa IDs de opcion "a", "b", "c" y "d".
- Debe haber una unica respuesta correcta.
- Evita preguntas ambiguas, triviales o basadas en detalles irrelevantes.
- Si el contenido de la unidad incluye HTML, CSS o JavaScript, incluye variedad de tipos:
  1. "Detectar error en codigo": presenta un fragmento corto con un error y pide identificar el error o la correccion adecuada.
  2. "Explicar fragmento de codigo": presenta un fragmento corto y pide elegir que hace o que efecto produce.
  3. "Elegir codigo para necesidad": plantea una necesidad concreta y ofrece alternativas de codigo para resolverla.
  4. "Conceptual": preguntas teoricas o de comprension cuando sea necesario.
- En preguntas con codigo, incluye fragmentos breves y legibles dentro del enunciado o las opciones. Usa Markdown con bloques de codigo fenced, por ejemplo \`\`\`html, \`\`\`css o \`\`\`js, y evita fragmentos extensos.
- Los errores de codigo deben ser realistas para estudiantes iniciales: etiquetas mal cerradas, selectores incorrectos, propiedades CSS mal aplicadas, estructura HTML no semantica, orden de reglas o atributos mal usados.
- La correccion esperada debe estar en la opcion correcta o explicada con claridad.
- Incluye una explicacion breve y una referencia de fuente breve si se puede inferir del material.
- Devuelve solo JSON valido segun el esquema.
`;
}

function buildPartialExamQuestionSchema(questionCount: number) {
  return {
    type: 'object',
    additionalProperties: false,
    properties: {
      questions: {
        type: 'array',
        minItems: 1,
        maxItems: questionCount,
        items: {
          type: 'object',
          additionalProperties: false,
          properties: {
            kind: {
              type: 'string',
              enum: [
                'Conceptual',
                'Detectar error en codigo',
                'Explicar fragmento de codigo',
                'Elegir codigo para necesidad',
              ],
            },
            question: { type: 'string' },
            options: {
              type: 'array',
              minItems: 4,
              maxItems: 4,
              items: {
                type: 'object',
                additionalProperties: false,
                properties: {
                  id: { type: 'string', enum: ['a', 'b', 'c', 'd'] },
                  text: { type: 'string' },
                },
                required: ['id', 'text'],
              },
            },
            correctOptionId: { type: 'string', enum: ['a', 'b', 'c', 'd'] },
            explanation: { type: 'string' },
            difficulty: { type: 'string', enum: ['Basica', 'Intermedia', 'Avanzada'] },
            sourceReference: { type: 'string' },
          },
          required: ['kind', 'question', 'options', 'correctOptionId', 'explanation', 'difficulty', 'sourceReference'],
        },
      },
    },
    required: ['questions'],
  };
}

async function createPartialExamQuestionsResponse(inputContent: ResponseInputContent[], questionCount: number) {
  const client = getOpenAIClient();
  if (!client) {
    return { success: false, error: 'OPENAI_API_KEY no esta configurada.' };
  }

  const responseParams: ResponseCreateParamsNonStreaming = {
    model: 'gpt-5.4-mini',
    input: [
      {
        role: 'user',
        content: inputContent,
      },
    ],
    text: {
      format: {
        type: 'json_schema',
        name: 'multiple_choice_questions',
        strict: true,
        schema: buildPartialExamQuestionSchema(questionCount),
      },
    },
  };

  const response = await client.responses.create(responseParams);
  const parsed = JSON.parse(response.output_text || '{}') as { questions?: GeneratedQuestion[] };
  const questions = (parsed.questions || []).filter((question) => {
    return question.question && question.options?.length === 4 && question.correctOptionId;
  });

  return { success: true, questions };
}

export async function generateMultipleChoiceQuestionsFromUnitPrompt(params: {
  unitName: string;
  prompt: string;
  questionCount: number;
}) {
  const questionCount = Math.max(1, Math.min(params.questionCount || 10, 25));
  const basePrompt = buildPartialExamQuestionPrompt({
    unitName: params.unitName,
    sourceLabel: 'Prompt del docente',
    questionCount,
    mode: 'quiz-show',
  });

  try {
    return await createPartialExamQuestionsResponse(
      [
        { type: 'input_text', text: basePrompt },
        {
          type: 'input_text',
          text: `Prompt del docente para generar preguntas:\n\n${params.prompt.slice(0, 50000)}`,
        },
      ],
      questionCount
    );
  } catch (error) {
    console.error('Error generating multiple choice questions from prompt:', error);
    return { success: false, error: 'No se pudieron generar preguntas con IA.' };
  }
}

export async function generateMultipleChoiceQuestionsFromUnitDocument(params: {
  unitName: string;
  documentTitle: string;
  filename: string;
  mimeType: string;
  buffer: Buffer;
  questionCount: number;
}) {
  const questionCount = Math.max(1, Math.min(params.questionCount || 10, 25));
  const basePrompt = buildPartialExamQuestionPrompt({
    unitName: params.unitName,
    sourceLabel: params.documentTitle,
    questionCount,
  });

  try {
    const inputContent: ResponseInputContent[] = [{ type: 'input_text', text: basePrompt }];

    if (params.mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || params.filename.toLowerCase().endsWith('.docx')) {
      const docxText = await extractDocxText(params.buffer);
      inputContent.push({
        type: 'input_text',
        text: `Contenido extraido del DOCX:\n\n${docxText.slice(0, 180000)}`,
      });
    } else {
      const base64 = params.buffer.toString('base64');
      inputContent.push({
        type: 'input_file',
        filename: params.filename,
        file_data: `data:${params.mimeType || 'application/pdf'};base64,${base64}`,
      });
    }

    return await createPartialExamQuestionsResponse(inputContent, questionCount);
  } catch (error) {
    console.error('Error generating multiple choice questions:', error);
    return { success: false, error: 'No se pudieron generar preguntas con IA.' };
  }
}

export async function generateAIEvaluation(
  assignment: Assignment,
  deliveryContent: unknown,
  repositoryUrl?: string
): Promise<AIEvaluationResult | null> {
  const client = getOpenAIClient();
  if (!client) {
    console.warn("OPENAI_API_KEY is not set. Skipping AI evaluation.");
    return null;
  }

  try {
    let studentWork = "";
    if (assignment.type === 'questionnaire' && deliveryContent) {
      studentWork = "Respuestas del estudiante:\n";
      const answers = (typeof deliveryContent === 'string' ? JSON.parse(deliveryContent) : deliveryContent) as Record<string, string>;
      
      assignment.questions?.forEach((q, idx) => {
        studentWork += `Pregunta ${idx + 1}: ${q.text}\n`;
        studentWork += `Respuesta: ${answers[q.id] || 'Sin respuesta'}\n\n`;
      });
    } else if (assignment.type === 'file_upload' && deliveryContent && typeof deliveryContent === 'string') {
      studentWork = `El estudiante ha entregado el siguiente código fuente y estructura de archivos:\n\n${deliveryContent}`;
    } else if (repositoryUrl) {
      studentWork = `El estudiante ha entregado un archivo/repositorio. URL: ${repositoryUrl}\n(Nota: La IA no puede leer directamente el contenido de este archivo zip, pero puedes evaluar el hecho de que se haya entregado si es necesario, o pedirle al profesor que lo revise manualmente).`;
    }

    let extraContext = "";
    
    if (assignment.aiPrompt) {
      extraContext += `\nINSTRUCCIONES ESPECÍFICAS DEL PROFESOR PARA ESTA EVALUACIÓN:\n${assignment.aiPrompt}\n\n`;
    }

    // Si es el Trabajo Práctico 1, leemos el apunte y lo añadimos al contexto
    const titleLower = assignment.title.toLowerCase();
    if (titleLower.includes('trabajo práctico 1') || titleLower.includes('tp1') || titleLower.includes('tp 1')) {
      try {
        const apuntePath = path.join(process.cwd(), 'docs', 'apuntes', 'Apunte_Unidad_1_Fundamentos_de_la_Web.md');
        const apunteContent = await fs.readFile(apuntePath, 'utf-8');
        extraContext = `\nContexto para la evaluación (Apunte de la Unidad 1):\n${apunteContent}\n\nLas respuestas del estudiante deben evaluarse en base a este apunte.`;
      } catch (err) {
        console.error("No se pudo leer el apunte de la Unidad 1", err);
      }
    }

    const prompt = `
Eres un asistente de evaluación de trabajos prácticos para un curso de diseño web.
Debes realizar una preevaluación del trabajo del estudiante.

IMPORTANTE SOBRE EL PERFIL DEL ESTUDIANTE:
Los estudiantes son alumnos del 1er año de la Tecnicatura en Diseño de Software y acaban de comenzar el cursado de su carrera.
Aún no han visto programación (lo verán el próximo semestre). En este semestre tienen diseño web, introducción a metodologías ágiles y diseño de experiencia de usuario.
Por lo tanto, tu evaluación no debe ser estricta ni exigir conocimientos técnicos avanzados o de programación que aún no poseen. Sé comprensivo, alentador y evalúa de acuerdo a este nivel inicial.
También ten en cuenta por favor que este es el primer trabajo práctico. Los alumnos todavía no vieron nada de HTML ni de CSS.
${extraContext}

Detalles del Trabajo Práctico:
Título: ${assignment.title}
Descripción: ${assignment.description}
Tipo: ${assignment.type}

${studentWork}

Tu tarea es proporcionar una calificación del 1 al 10 y un feedback constructivo y alentador para el estudiante.
El alumno aprueba con una nota mayor o igual a 7. Caso contrario debe corregir y reenviar su trabajo.
Por favor si el alumno aprueba, dile que no es necesario que envíe nuevamente su trabajo.
Usa formato Markdown (negritas, listas, saltos de línea) en el feedback para que sea fácil de leer y estructurado.

IMPORTANTE SOBRE EL FORMATO JSON:
- Devuelve el resultado estrictamente en formato JSON con la siguiente estructura, sin markdown en el bloque general ni comillas invertidas.
- NUNCA uses comillas dobles sin escapar dentro del texto del feedback, ya que romperá el JSON. Si necesitas citar código HTML o texto, usa comillas simples (ejemplo: <div class='mi-clase'>) o asegúrate de escapar las comillas dobles con backslash (ejemplo: <div class=\\"mi-clase\\").
{
  "grade": número (1 al 10),
  "verdict": "Aprobado" o "Corregir y reenviar",
  "feedback": "Tu devolución detallada aquí (puedes incluir \\n y markdown)"
}
`;

    const response = await client.chat.completions.create({
      model: 'gpt-4o-mini', // Cambiado a 'gpt-4o-mini' para asegurar compatibilidad
      messages: [
        { role: 'system', content: 'Eres un profesor comprensivo, empático y justo, enfocado en estudiantes de primer año que recién comienzan.' },
        { role: 'user', content: prompt }
      ],
      response_format: { type: "json_object" },
    });

    const resultText = response.choices[0].message.content;
    if (!resultText) return null;

    console.log("AI Response JSON:", resultText);
    const result = JSON.parse(resultText) as Record<string, unknown>;
    
    // Función auxiliar para aplanar objetos anidados por si la IA devuelve {"evaluacion": {"grade": ...}}
    const flattenObject = (obj: Record<string, unknown>, prefix = ''): Record<string, unknown> => {
      return Object.keys(obj).reduce<Record<string, unknown>>((acc, k) => {
        const pre = prefix.length ? prefix + '.' : '';
        const value = obj[k];
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          Object.assign(acc, flattenObject(value as Record<string, unknown>, pre + k));
        } else {
          acc[k] = value;
        }
        return acc;
      }, {});
    };

    const flatResult = flattenObject(result);
    
    // Buscar valores ignorando mayúsculas/minúsculas en las claves
    const getVal = (keys: string[]) => {
      const foundKey = Object.keys(flatResult).find(k => keys.some(searchKey => k.toLowerCase().includes(searchKey.toLowerCase())));
      return foundKey ? flatResult[foundKey] : undefined;
    };

    const extractedGrade = getVal(['grade', 'calificacion', 'nota', 'puntuacion']);
    let extractedFeedback = getVal(['feedback', 'devolucion', 'comentario', 'observacion', 'mensaje', 'respuesta']);
    let extractedVerdict = getVal(['verdict', 'veredicto', 'estado']);

    // Fallback extremo para el feedback: si no lo encuentra, toma el valor de texto más largo en todo el JSON
    if (!extractedFeedback) {
      const stringValues = Object.values(flatResult).filter(v => typeof v === 'string') as string[];
      const longStrings = stringValues.filter(s => s.length > 30).sort((a, b) => b.length - a.length);
      if (longStrings.length > 0) {
        extractedFeedback = longStrings[0];
      }
    }

    // Normalizar el veredicto para que coincida exactamente con los valores permitidos
    if (typeof extractedVerdict === 'string') {
      const vLower = extractedVerdict.toLowerCase();
      if (vLower.includes('aprobad')) extractedVerdict = 'Aprobado';
      else if (vLower.includes('corregir') || vLower.includes('reenviar')) extractedVerdict = 'Corregir y reenviar';
    }

    // Normalizar la nota si viene como string (ej. "8/10")
    let numericGrade = typeof extractedGrade === 'number' ? extractedGrade : undefined;
    if (typeof extractedGrade === 'string') {
      const match = extractedGrade.match(/(\d+(\.\d+)?)/);
      if (match) numericGrade = Number(match[1]);
    }

    const aiFeedback = typeof extractedFeedback === 'string' ? extractedFeedback : undefined;
    const aiVerdict =
      extractedVerdict === 'Aprobado' || extractedVerdict === 'Corregir y reenviar'
        ? extractedVerdict
        : undefined;
    
    return {
      aiGrade: numericGrade,
      aiFeedback,
      aiVerdict
    };
  } catch (error) {
    console.error("Error generating AI evaluation:", error);
    return null;
  }
}
