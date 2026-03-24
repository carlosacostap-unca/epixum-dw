import OpenAI from 'openai';
import { Assignment, Delivery } from '@/types';
import fs from 'fs/promises';
import path from 'path';

let openaiClient: OpenAI | null = null;

const getOpenAIClient = () => {
  if (!openaiClient && process.env.OPENAI_API_KEY) {
    openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return openaiClient;
};

export async function generateAIEvaluation(assignment: Assignment, deliveryContent: any, repositoryUrl?: string) {
  const client = getOpenAIClient();
  if (!client) {
    console.warn("OPENAI_API_KEY is not set. Skipping AI evaluation.");
    return null;
  }

  try {
    let studentWork = "";
    if (assignment.type === 'questionnaire' && deliveryContent) {
      studentWork = "Respuestas del estudiante:\n";
      const answers = typeof deliveryContent === 'string' ? JSON.parse(deliveryContent) : deliveryContent;
      
      assignment.questions?.forEach((q, idx) => {
        studentWork += `Pregunta ${idx + 1}: ${q.text}\n`;
        studentWork += `Respuesta: ${answers[q.id] || 'Sin respuesta'}\n\n`;
      });
    } else if (repositoryUrl) {
      studentWork = `El estudiante ha entregado un archivo/repositorio. URL: ${repositoryUrl}\n(Nota: La IA no puede leer directamente el contenido de este archivo zip, pero puedes evaluar el hecho de que se haya entregado si es necesario, o pedirle al profesor que lo revise manualmente).`;
    }

    let extraContext = "";
    
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
Devuelve el resultado estrictamente en formato JSON con la siguiente estructura, sin markdown en el bloque general ni comillas invertidas:
{
  "grade": número (1 al 10),
  "verdict": "Aprobado" o "Corregir y reenviar",
  "feedback": "Tu devolución detallada aquí (puedes incluir \\n y markdown)"
}
`;

    const response = await client.chat.completions.create({
      model: 'gpt-5-mini', // Cambiar a 'gpt-4o-mini' si da error de que no existe
      messages: [
        { role: 'system', content: 'Eres un profesor comprensivo, empático y justo, enfocado en estudiantes de primer año que recién comienzan.' },
        { role: 'user', content: prompt }
      ],
      response_format: { type: "json_object" },
    });

    const resultText = response.choices[0].message.content;
    if (!resultText) return null;

    const result = JSON.parse(resultText);
    
    return {
      aiGrade: result.grade,
      aiFeedback: result.feedback,
      aiVerdict: result.verdict
    };
  } catch (error) {
    console.error("Error generating AI evaluation:", error);
    return null;
  }
}
