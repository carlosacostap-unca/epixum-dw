import OpenAI from 'openai';
import { Assignment, Delivery } from '@/types';

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

    const prompt = `
Eres un asistente de evaluación de trabajos prácticos para un curso de diseño web.
Debes realizar una preevaluación del trabajo del estudiante.

Detalles del Trabajo Práctico:
Título: ${assignment.title}
Descripción: ${assignment.description}
Tipo: ${assignment.type}

${studentWork}

Tu tarea es proporcionar una calificación del 1 al 10 y un feedback constructivo para el estudiante.
Devuelve el resultado estrictamente en formato JSON con la siguiente estructura, sin markdown ni comillas invertidas:
{
  "grade": número (1 al 10),
  "feedback": "Tu devolución detallada aquí"
}
`;

    const response = await client.chat.completions.create({
      model: 'gpt-5-mini', // Cambiar a 'gpt-4o-mini' si da error de que no existe
      messages: [
        { role: 'system', content: 'Eres un profesor estricto pero justo.' },
        { role: 'user', content: prompt }
      ],
      response_format: { type: "json_object" },
    });

    const resultText = response.choices[0].message.content;
    if (!resultText) return null;

    const result = JSON.parse(resultText);
    
    return {
      aiGrade: result.grade,
      aiFeedback: result.feedback
    };
  } catch (error) {
    console.error("Error generating AI evaluation:", error);
    return null;
  }
}
