"use client";

import { Delivery, Assignment } from "@/types";
import { useState, useRef, useEffect } from "react";
import { getDeliveryDownloadUrl, gradeDelivery, evaluateDeliveryWithAI } from "@/lib/actions";
import { processDeliveryZip } from "@/lib/actions-zip";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";

interface TeacherGradingViewProps {
  delivery: Delivery;
  assignment: Assignment;
}

export default function TeacherGradingView({ delivery, assignment }: TeacherGradingViewProps) {
  const router = useRouter();
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [grade, setGrade] = useState<string>(
    delivery.grade !== undefined && delivery.grade !== null && delivery.status === 'graded' 
      ? delivery.grade.toString() 
      : (delivery.aiGrade !== undefined && delivery.aiGrade !== null ? delivery.aiGrade.toString() : "")
  );
  const [feedback, setFeedback] = useState<string>(
    delivery.grade !== undefined && delivery.grade !== null && delivery.status === 'graded' 
      ? (delivery.feedback || "") 
      : (delivery.aiFeedback || "")
  );
  const [verdict, setVerdict] = useState<'Aprobado' | 'Corregir y reenviar' | ''>(
    delivery.verdict || delivery.aiVerdict || ''
  );
  const [isGrading, setIsGrading] = useState(false);
  const [isEvaluatingAI, setIsEvaluatingAI] = useState(false);
  const [isProcessingZip, setIsProcessingZip] = useState(false);
  const [extractedCode, setExtractedCode] = useState<string>(
    delivery.content && typeof delivery.content === 'string' ? delivery.content : ""
  );
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [feedback]);
  
  const student = delivery.expand?.student;
  const studentName = student?.name || "Estudiante desconocido";

  const handleProcessZip = async () => {
    if (!confirm("Esto extraerá el contenido HTML/CSS del ZIP y borrará el archivo original. ¿Deseas continuar?")) {
      return;
    }
    
    setIsProcessingZip(true);
    try {
      const result = await processDeliveryZip(delivery.id);
      if (result.success && result.extractedContent) {
        setExtractedCode(result.extractedContent);
        router.refresh();
      } else {
        alert(result.error || "No se pudo procesar el archivo ZIP");
      }
    } catch (err) {
      console.error(err);
      alert("Error inesperado al procesar el ZIP");
    } finally {
      setIsProcessingZip(false);
    }
  };

  const handleEvaluateAI = async () => {
    setIsEvaluatingAI(true);
    try {
      const result = await evaluateDeliveryWithAI(
        delivery.id, 
        assignment.type === 'file_upload' ? extractedCode : undefined
      );
      if (result.success && result.data) {
        // Update local state to show the result immediately without a full refresh if preferred
        // or just let router.refresh() handle it. We'll update the local inputs:
        setGrade(result.data.aiGrade.toString());
        setFeedback(result.data.aiFeedback);
        if (result.data.aiVerdict) {
          setVerdict(result.data.aiVerdict as any);
        }
        router.refresh();
      } else {
        alert(result.error || "No se pudo realizar la evaluación por IA");
      }
    } catch (err) {
      console.error(err);
      alert("Error inesperado al evaluar con IA");
    } finally {
      setIsEvaluatingAI(false);
    }
  };

  const handleDownloadDelivery = async (deliveryId: string) => {
    setDownloadingId(deliveryId);
    try {
        const result = await getDeliveryDownloadUrl(deliveryId);
        if (result.success && result.url) {
            window.open(result.url, '_blank');
        } else {
            alert(result.error || "No se pudo generar el link de descarga");
        }
    } catch (err) {
        console.error(err);
        alert("Error al intentar descargar el archivo");
    } finally {
        setDownloadingId(null);
    }
  };

  const handleGradeSubmit = async (e: React.FormEvent) => {
      e.preventDefault();

      setIsGrading(true);
      try {
          const formData = new FormData();
          formData.append('grade', grade);
          formData.append('feedback', feedback);
          if (verdict) formData.append('verdict', verdict);
          formData.append('assignmentId', assignment.id);
          
          const result = await gradeDelivery(delivery.id, formData);
          
          if (result.success) {
              router.push(`/assignments/${assignment.id}`);
              router.refresh();
          } else {
              alert(result.error || "Error al calificar");
          }
      } catch (err) {
          console.error(err);
          alert("Error inesperado al calificar");
      } finally {
          setIsGrading(false);
      }
  };

  return (
    <div className="w-full max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8">
      <Link href={`/assignments/${assignment.id}`} className="text-blue-500 hover:underline mb-6 inline-block">&larr; Volver al Trabajo Práctico</Link>
      
      <div className="flex flex-col lg:flex-row gap-8">
        {/* Left Column: Delivery Content */}
        <div className="flex-1 min-w-0 bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 p-6 md:p-8 shadow-sm lg:max-h-[calc(100vh-8rem)] lg:overflow-y-auto">
            <div className="flex justify-between items-center mb-8 border-b border-zinc-200 dark:border-zinc-700 pb-6">
                <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                    Entrega de {studentName}
                </h2>
                <span className={`px-3 py-1 inline-flex text-sm leading-5 font-semibold rounded-full 
                    ${delivery.status === 'graded' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 
                    delivery.status === 'submitted' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' : 
                    'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'}`}>
                    {delivery.status === 'graded' ? 'Calificado' : 
                    delivery.status === 'submitted' ? 'Entregado' : 'Borrador'}
                </span>
            </div>

            <div className="mb-8">
                <h3 className="text-lg font-semibold mb-4 text-zinc-800 dark:text-zinc-200">Contenido de la entrega</h3>
                
                {assignment.type === 'questionnaire' ? (
                    <div className="bg-zinc-50 dark:bg-zinc-900 p-6 rounded-lg border border-zinc-200 dark:border-zinc-700 space-y-6">
                        {assignment.questions?.map((q, idx) => {
                            const answers = typeof delivery.content === 'string' ? JSON.parse(delivery.content) : delivery.content;
                            return (
                                <div key={q.id}>
                                    <p className="text-base font-medium text-zinc-800 dark:text-zinc-200"><span className="text-zinc-500 mr-2">{idx + 1}.</span> {q.text}</p>
                                    <p className="text-base text-zinc-700 dark:text-zinc-300 mt-2 pl-4 border-l-4 border-zinc-300 dark:border-zinc-600 whitespace-pre-wrap">
                                        {answers?.[q.id] || <span className="italic text-zinc-400">Sin respuesta</span>}
                                    </p>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="bg-zinc-50 dark:bg-zinc-900 p-6 rounded-lg border border-zinc-200 dark:border-zinc-700 flex flex-col gap-4">
                        {delivery.content && typeof delivery.content === 'string' ? (
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                                    Entrega del estudiante (Código Extraído)
                                </label>
                                <textarea
                                    value={extractedCode}
                                    onChange={(e) => setExtractedCode(e.target.value)}
                                    className="w-full px-4 py-3 font-mono text-sm border border-zinc-300 dark:border-zinc-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 min-h-[300px] resize-y"
                                />
                            </div>
                        ) : (
                            <p className="text-base text-zinc-700 dark:text-zinc-300">
                                El estudiante ha subido un archivo/carpeta comprimida en formato ZIP.
                            </p>
                        )}
                        
                        {delivery.repositoryUrl && (
                            <div className="flex flex-col sm:flex-row gap-3 mt-2">
                                <button
                                    onClick={() => handleDownloadDelivery(delivery.id)}
                                    disabled={downloadingId === delivery.id}
                                    className="flex items-center justify-center gap-2 w-full md:w-auto px-6 py-3 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border border-blue-200 dark:border-blue-800 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors font-medium disabled:opacity-50"
                                >
                                    {downloadingId === delivery.id ? (
                                        <>
                                            <span className="animate-spin h-5 w-5 border-2 border-blue-600 border-t-transparent rounded-full"></span>
                                            Preparando descarga...
                                        </>
                                    ) : (
                                        <>
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                                            Descargar ZIP
                                        </>
                                    )}
                                </button>

                                <button
                                    onClick={handleProcessZip}
                                    disabled={isProcessingZip}
                                    className="flex items-center justify-center gap-2 w-full md:w-auto px-6 py-3 bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border border-amber-200 dark:border-amber-800 rounded-lg hover:bg-amber-100 dark:hover:bg-amber-900/50 transition-colors font-medium disabled:opacity-50"
                                >
                                    {isProcessingZip ? (
                                        <>
                                            <span className="animate-spin h-5 w-5 border-2 border-amber-600 border-t-transparent rounded-full"></span>
                                            Procesando ZIP...
                                        </>
                                    ) : (
                                        <>
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                                            Extraer y ver contenido
                                        </>
                                    )}
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Removed AI Pre-evaluation display section based on user request */}

            {delivery.status !== 'graded' && (
                <div className="mb-2">
                    <button
                        onClick={handleEvaluateAI}
                        disabled={isEvaluatingAI}
                        className="flex items-center justify-center gap-2 w-full md:w-auto px-6 py-3 bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300 border border-purple-300 dark:border-purple-700 rounded-lg hover:bg-purple-200 dark:hover:bg-purple-800/50 transition-colors font-medium disabled:opacity-50"
                    >
                        {isEvaluatingAI ? (
                            <>
                                <span className="animate-spin h-5 w-5 border-2 border-purple-600 border-t-transparent rounded-full"></span>
                                Generando evaluación...
                            </>
                        ) : (
                            <>
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                                {delivery.aiGrade !== undefined && delivery.aiFeedback ? "Rehacer Preevaluación Asistida por IA" : "Realizar Preevaluación Asistida por IA"}
                            </>
                        )}
                    </button>
                </div>
            )}
        </div>

        {/* Right Column: Grading Form */}
        <div className="flex-1 min-w-0 bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 p-6 md:p-8 shadow-sm lg:max-h-[calc(100vh-8rem)] lg:overflow-y-auto">
            <form onSubmit={handleGradeSubmit} className="space-y-6">
                <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 mb-6">Calificar Entrega</h3>
                
                <div className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                            Calificación (0-10)
                        </label>
                        <input 
                            type="number" 
                            min="0" 
                            max="10" 
                            step="0.1"
                            value={grade}
                            onChange={(e) => setGrade(e.target.value)}
                            className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                            Veredicto
                        </label>
                        <select
                            value={verdict}
                            onChange={(e) => setVerdict(e.target.value as any)}
                            className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100"
                            required
                        >
                            <option value="" disabled>Seleccione un veredicto</option>
                            <option value="Aprobado">Aprobado</option>
                            <option value="Corregir y reenviar">Corregir y reenviar</option>
                        </select>
                    </div>
                </div>
                
                <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                        Feedback para el estudiante
                    </label>
                    <textarea 
                        ref={textareaRef}
                        rows={4}
                        value={feedback}
                        onChange={(e) => setFeedback(e.target.value)}
                        className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 min-h-[150px] resize-none overflow-hidden"
                        placeholder="Escribe tus comentarios aquí..."
                        required
                    />
                </div>
                
                <div className="flex flex-col gap-3 pt-4">
                    <button 
                        type="submit"
                        disabled={isGrading}
                        className="w-full justify-center px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors flex items-center gap-2 font-medium"
                    >
                        {isGrading && <span className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></span>}
                        Guardar Calificación
                    </button>
                    <Link 
                        href={`/assignments/${assignment.id}`}
                        className="w-full text-center px-6 py-3 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-lg transition-colors font-medium border border-transparent hover:border-zinc-200 dark:hover:border-zinc-600"
                    >
                        Cancelar
                    </Link>
                </div>
            </form>
        </div>
      </div>
    </div>
  );
}