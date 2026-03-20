"use client";

import { createDelivery, updateDelivery, getUploadUrl, getDeliveryDownloadUrl, ensureCorsConfigured } from "@/lib/actions";
import { Delivery, Assignment } from "@/types";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import JSZip from "jszip";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";

interface StudentDeliveryProps {
  assignmentId: string;
  delivery: Delivery | null;
  studentName: string;
  assignmentTitle: string;
  assignment: Assignment;
}

export default function StudentDelivery({ assignmentId, delivery, studentName, assignmentTitle, assignment }: StudentDeliveryProps) {
  const [isEditing, setIsEditing] = useState(!delivery || delivery.status === 'draft');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("");
  const [currentStep, setCurrentStep] = useState<'idle' | 'compressing' | 'uploading' | 'saving' | 'completed'>('idle');
  const [showCorsFix, setShowCorsFix] = useState(false);
  const [selectedFolderName, setSelectedFolderName] = useState<string | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<{ file: File, path: string }[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Questionnaire state
  const [answers, setAnswers] = useState<Record<string, string>>({});
  
  // Auto-save state
  const [localDeliveryId, setLocalDeliveryId] = useState<string | undefined>(delivery?.id);
  const [lastAutoSave, setLastAutoSave] = useState<Date | null>(null);
  const [isAutoSaving, setIsAutoSaving] = useState(false);

  const answersRef = useRef(answers);
  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);

  const localDeliveryIdRef = useRef(localDeliveryId);
  useEffect(() => {
    localDeliveryIdRef.current = localDeliveryId;
  }, [localDeliveryId]);

  const router = useRouter();

  const isDelivered = !!delivery && delivery.status !== 'draft';
  const isDraft = !!delivery && delivery.status === 'draft';
  const isGraded = !!delivery && delivery.status === 'graded';
  const isPastDue = assignment.dueDate ? new Date(assignment.dueDate) < new Date() : false;

  useEffect(() => {
    if (delivery?.content && assignment.type === 'questionnaire') {
      try {
        const savedAnswers = typeof delivery.content === 'string' ? JSON.parse(delivery.content) : delivery.content;
        setAnswers(savedAnswers);
      } catch (e) {
        console.error("Error parsing saved answers", e);
      }
    }
    if (delivery?.id) {
        setLocalDeliveryId(delivery.id);
    }
  }, [delivery, assignment.type]);

  // Auto-save effect
  useEffect(() => {
    const isTP1 = assignment.title.toLowerCase().includes('tp1');
    if (!isEditing || assignment.type !== 'questionnaire' || isPastDue || !isTP1) return;

    const interval = setInterval(async () => {
      // Only auto-save if there are actual answers
      if (Object.keys(answersRef.current).length === 0) return;

      setIsAutoSaving(true);
      try {
        const formData = new FormData();
        formData.append("assignmentId", assignmentId);
        formData.append("content", JSON.stringify(answersRef.current));
        formData.append("status", "draft");

        const currentDeliveryId = localDeliveryIdRef.current;
        const result = currentDeliveryId
          ? await updateDelivery(currentDeliveryId, formData)
          : await createDelivery(formData);

        if (result.success) {
          if (!currentDeliveryId && result.id) {
            setLocalDeliveryId(result.id);
          }
          setLastAutoSave(new Date());
        }
      } catch (e) {
        console.error("Auto-save failed", e);
      } finally {
        setIsAutoSaving(false);
      }
    }, 120000); // 2 minutes

    return () => clearInterval(interval);
  }, [isEditing, assignment.type, isPastDue, assignmentId, assignment.title]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      // files[0].webkitRelativePath usually starts with the folder name
      const path = e.target.files[0].webkitRelativePath;
      const folderName = path.split('/')[0];
      setSelectedFolderName(`${folderName} (${e.target.files.length} archivos)`);
      
      const filesArray = Array.from(e.target.files).map(file => ({
        file,
        path: file.webkitRelativePath
      }));
      setSelectedFiles(filesArray);
    } else {
      setSelectedFolderName(null);
      setSelectedFiles([]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const items = e.dataTransfer.items;
    if (!items) return;

    const files: { file: File, path: string }[] = [];
    const queue: { entry: any, path: string }[] = [];

    // Get all entries
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.kind === 'file') {
        const entry = item.webkitGetAsEntry ? item.webkitGetAsEntry() : (item as any).getAsFileSystemHandle ? await (item as any).getAsFileSystemHandle() : null;
        if (entry) {
          queue.push({ entry, path: entry.name });
        }
      }
    }

    if (queue.length === 0) return;

    // Process queue
    setStatus("Analizando archivos...");
    try {
        while (queue.length > 0) {
        const { entry, path } = queue.shift()!;
        
        if (entry.isFile) {
            const file = await new Promise<File>((resolve, reject) => {
            entry.file(resolve, reject);
            });
            files.push({ file, path });
        } else if (entry.isDirectory) {
            const reader = entry.createReader();
            const entries = await new Promise<any[]>((resolve, reject) => {
            const result: any[] = [];
            function read() {
                reader.readEntries((batch: any[]) => {
                if (batch.length === 0) {
                    resolve(result);
                } else {
                    result.push(...batch);
                    read();
                }
                }, reject);
            }
            read();
            });
            
            for (const child of entries) {
            queue.push({ entry: child, path: `${path}/${child.name}` });
            }
        }
        }

        if (files.length > 0) {
            const folderName = files[0].path.split('/')[0];
            setSelectedFolderName(`${folderName} (${files.length} archivos)`);
            setSelectedFiles(files);
        }
    } catch (err) {
        console.error("Error analyzing dropped files:", err);
        setError("Error al leer la carpeta arrastrada. Intenta usar el botón de selección.");
    } finally {
        setStatus("");
    }
  };

  const handleDownload = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!delivery) return;
    
    // Show temporary loading state if needed, or just open
    try {
        const result = await getDeliveryDownloadUrl(delivery.id);
        if (result.success && result.url) {
            window.open(result.url, '_blank');
        } else {
            alert(result.error || "No se pudo obtener el enlace de descarga");
        }
    } catch (err) {
        console.error(err);
        alert("Error al intentar descargar el archivo");
    }
  };

  const handleAnswerChange = (questionId: string, value: string) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: value
    }));
  };

  async function handleSubmit(e: React.FormEvent, submitStatus: 'draft' | 'submitted' = 'submitted') {
    e.preventDefault();
    setError(null);
    setLoading(true);
    setStatus("Guardando...");

    try {
      if (assignment.type === 'questionnaire') {
        const formData = new FormData();
        formData.append("assignmentId", assignmentId);
        formData.append("content", JSON.stringify(answers));
        formData.append("status", submitStatus);

        const currentDeliveryId = localDeliveryIdRef.current;
        const result = currentDeliveryId 
          ? await updateDelivery(currentDeliveryId, formData)
          : await createDelivery(formData);

        if (result.success) {
          if (!currentDeliveryId && result.id) {
            setLocalDeliveryId(result.id);
          }
          if (submitStatus === 'submitted') {
            setIsEditing(false);
          } else {
            setLastAutoSave(new Date());
          }
          router.refresh();
        } else {
          setError(result.error || "Error al guardar las respuestas");
        }
      } else {
        // File upload logic
        if (selectedFiles.length === 0 && !delivery) {
          throw new Error("Debes seleccionar una carpeta para subir");
        }

        if (selectedFiles.length === 0 && delivery && !isDraft) {
            // Only updating status? No, file upload usually implies re-uploading content
            // Unless we allow changing status without changing file?
            // For now, assume if file list is empty, we keep existing file if not editing file?
            // But UI forces selection if isEditing is true.
            throw new Error("Debes seleccionar una carpeta para actualizar tu entrega");
        }

        setCurrentStep('compressing');
        setStatus("Preparando archivos...");

        const zip = new JSZip();
        
        // Add files to zip
        setStatus("Comprimiendo carpeta...");
        let fileCount = 0;
        for (const { file, path } of selectedFiles) {
          zip.file(path, file);
          fileCount++;
        }

        if (fileCount === 0) {
          throw new Error("No se encontraron archivos en la carpeta seleccionada");
        }

        // Generate zip blob
        const blob = await zip.generateAsync({ type: "blob" });
        
        // Generate filename: StudentName_AssignmentTitle.zip
        const safeStudentName = studentName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        const safeAssignmentTitle = assignmentTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        const filename = `${safeStudentName}_${safeAssignmentTitle}.zip`;

        // Get upload URL
        setStatus("Obteniendo autorización de subida...");
        
        const uploadAuth = await getUploadUrl(filename, "application/zip");

        if (!uploadAuth.success || !uploadAuth.url) {
          throw new Error(uploadAuth.error || "No se pudo obtener la URL de subida");
        }

        // Upload to S3
        setCurrentStep('uploading');
        setStatus("Subiendo archivo a iDrive...");
        
        const uploadResponse = await fetch(uploadAuth.url, {
          method: "PUT",
          body: blob,
          headers: {
              "Content-Type": "application/zip",
          }
        });

        if (!uploadResponse.ok) {
          throw new Error("Error al subir el archivo a iDrive. Verifica tu conexión o intenta nuevamente.");
        }

        // Calculate final file URL
        const fileUrl = uploadAuth.url.split('?')[0];

        // Save delivery record
        setCurrentStep('saving');
        setStatus("Guardando entrega...");
        
        const formData = new FormData();
        formData.append("assignmentId", assignmentId);
        formData.append("repositoryUrl", fileUrl);
        formData.append("status", "submitted"); // File uploads are always submitted directly for now? Or should we support drafts too? User asked for drafts for questionnaires.

        const result = delivery 
          ? await updateDelivery(delivery.id, formData)
          : await createDelivery(formData);

        if (result.success) {
          setCurrentStep('completed');
          setIsEditing(false);
          setStatus("");
          router.refresh();
        } else {
          setError(result.error || "Error al guardar la entrega");
          setCurrentStep('idle');
        }
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Ocurrió un error inesperado");
      setCurrentStep('idle');
      if (assignment.type !== 'questionnaire') setShowCorsFix(true);
    } finally {
      setLoading(false);
    }
  }

  const handleCorsFix = async () => {
    setStatus("Configurando conexión...");
    try {
        const res = await ensureCorsConfigured();
        if (res.success) {
            alert("Configuración aplicada. Por favor intenta subir la carpeta nuevamente.");
            setShowCorsFix(false);
            setError(null);
        } else {
            alert("No se pudo configurar automáticamente: " + res.error);
        }
    } catch (err) {
        console.error(err);
        alert("Error al intentar configurar");
    } finally {
        setStatus("");
    }
  };

  // Progress UI Component
  const ProgressSteps = () => (
    <div className="w-full py-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex flex-col items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                currentStep === 'compressing' || currentStep === 'uploading' || currentStep === 'saving' || currentStep === 'completed'
                ? 'bg-blue-600 text-white' 
                : 'bg-zinc-200 text-zinc-500'
            }`}>1</div>
            <span className="text-xs mt-1 text-zinc-600">Compresión</span>
        </div>
        <div className={`flex-1 h-1 mx-2 ${
            currentStep === 'uploading' || currentStep === 'saving' || currentStep === 'completed' ? 'bg-blue-600' : 'bg-zinc-200'
        }`}></div>
        <div className="flex flex-col items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                currentStep === 'uploading' || currentStep === 'saving' || currentStep === 'completed'
                ? 'bg-blue-600 text-white' 
                : 'bg-zinc-200 text-zinc-500'
            }`}>2</div>
            <span className="text-xs mt-1 text-zinc-600">Subida</span>
        </div>
        <div className={`flex-1 h-1 mx-2 ${
            currentStep === 'saving' || currentStep === 'completed' ? 'bg-blue-600' : 'bg-zinc-200'
        }`}></div>
        <div className="flex flex-col items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                currentStep === 'saving' || currentStep === 'completed'
                ? 'bg-blue-600 text-white' 
                : 'bg-zinc-200 text-zinc-500'
            }`}>3</div>
            <span className="text-xs mt-1 text-zinc-600">Guardado</span>
        </div>
      </div>
      <div className="text-center text-sm font-medium text-blue-600 mt-4 animate-pulse">
        {status}
      </div>
    </div>
  );

  return (
    <div className={`rounded-xl border p-6 transition-all ${
        isDelivered 
        ? "bg-green-50/50 dark:bg-green-900/10 border-green-200 dark:border-green-800" 
        : "bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700"
    }`}>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold flex items-center gap-3">
            <span className={`p-2 rounded-lg ${
                isDelivered 
                ? "bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-400" 
                : isDraft
                ? "bg-yellow-100 text-yellow-600 dark:bg-yellow-900 dark:text-yellow-400"
                : "bg-zinc-100 text-zinc-500 dark:bg-zinc-700 dark:text-zinc-400"
            }`}>
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            </span>
            <div>
                <span className="block">Mi Entrega</span>
                {isGraded ? (
                    <span className="text-xs font-normal text-purple-600 dark:text-purple-400">
                        Trabajo evaluado
                    </span>
                ) : isDelivered ? (
                    <span className="text-xs font-normal text-green-600 dark:text-green-400">
                        Tarea completada
                    </span>
                ) : isDraft ? (
                    <span className="text-xs font-normal text-yellow-600 dark:text-yellow-400">
                        Borrador guardado
                    </span>
                ) : null}
            </div>
        </h2>
        
        <span className={`px-4 py-1.5 text-sm font-semibold rounded-full border ${
            isGraded
            ? "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800"
            : isDelivered 
            ? "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800" 
            : isDraft
            ? "bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800"
            : "bg-zinc-100 text-zinc-700 border-zinc-200 dark:bg-zinc-700 dark:text-zinc-300 dark:border-zinc-600"
        }`}>
            {isGraded ? "🎓 Calificado" : isDelivered ? "✅ Entregado" : isDraft ? "📝 Borrador" : "⏳ Pendiente"}
        </span>
      </div>

      {delivery?.feedback && (
        <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800">
          <h3 className="text-sm font-bold text-blue-800 dark:text-blue-300 mb-2">Feedback del Docente</h3>
          <div className="prose prose-sm max-w-none text-blue-900 dark:text-blue-100 prose-a:text-blue-600 dark:prose-a:text-blue-400 prose-p:leading-relaxed">
            <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>
              {delivery.feedback}
            </ReactMarkdown>
          </div>
          {delivery.grade && (
             <div className="mt-4 pt-3 border-t border-blue-200 dark:border-blue-800/50 text-lg font-bold text-blue-700 dark:text-blue-400">
               Nota: {delivery.grade}
             </div>
          )}
        </div>
      )}

      {error && (
        <div className="mb-4 p-4 text-red-700 bg-red-100 rounded-lg dark:bg-red-900 dark:text-red-300">
          <p>{error}</p>
          {showCorsFix && (
            <button 
                type="button"
                onClick={handleCorsFix}
                className="mt-2 text-sm font-medium underline hover:text-red-900 dark:hover:text-red-100"
            >
                Diagnosticar y arreglar conexión (CORS)
            </button>
          )}
        </div>
      )}

      {!isEditing && delivery && !isDraft ? (
        <div className="bg-white dark:bg-zinc-900 rounded-xl p-6 border border-zinc-200 dark:border-zinc-700 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
            <div className="flex-1 overflow-hidden">
                <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2 block">
                  {assignment.type === 'questionnaire' ? 'Respuestas Enviadas' : 'Archivo Entregado'}
                </label>
                
                {assignment.type === 'questionnaire' ? (
                  <div className="space-y-4">
                    {assignment.questions?.map((q, idx) => (
                      <div key={q.id} className="p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded border border-zinc-100 dark:border-zinc-800">
                        <p className="text-xs font-bold text-zinc-500 mb-1">Pregunta {idx + 1}: {q.text}</p>
                        <p className="text-sm text-zinc-800 dark:text-zinc-200">{answers[q.id] || "Sin respuesta"}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 bg-zinc-100 dark:bg-zinc-800 rounded text-zinc-500">
                          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M13 9V3.5L18.5 9M6 2c-1.11 0-1.99.89-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6H6z"/></svg>
                      </div>
                      <button
                        onClick={handleDownload}
                        className="text-lg font-medium text-blue-600 hover:text-blue-800 hover:underline truncate text-left"
                      >
                        Descargar Entrega (.zip)
                      </button>
                  </div>
                )}
                
                <div className="mt-4 flex items-center gap-2 text-sm text-zinc-500 bg-zinc-50 dark:bg-zinc-800/50 py-2 px-3 rounded-md inline-flex">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                    <span>Entregado el <strong>{new Date(delivery.created).toLocaleDateString()}</strong> a las <strong>{new Date(delivery.created).toLocaleTimeString()}</strong></span>
                </div>
            </div>

            <button
                onClick={() => {
                    if (isGraded) {
                        if (confirm("Tu trabajo ya ha sido evaluado. Si haces una nueva entrega, tu trabajo volverá al estado de 'Entregado' para ser revisado nuevamente. ¿Deseas continuar?")) {
                            setIsEditing(true);
                        }
                    } else {
                        setIsEditing(true);
                    }
                }}
                disabled={isPastDue}
                className="shrink-0 px-4 py-2 text-sm font-medium text-zinc-700 bg-white border border-zinc-300 rounded-lg hover:bg-zinc-50 hover:text-zinc-900 transition-colors shadow-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                title={isPastDue ? "La fecha límite ha pasado" : isGraded ? "Hacer una nueva entrega" : "Modificar entrega"}
            >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                {isGraded ? "Nueva Entrega" : "Modificar Entrega"}
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={(e) => handleSubmit(e, 'submitted')} className="bg-zinc-50 dark:bg-zinc-900/50 rounded-xl p-6 border border-zinc-200 dark:border-zinc-700">
          
          {isPastDue && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-800 dark:text-red-300 flex items-center gap-3">
              <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              <p className="text-sm font-medium">La fecha límite para este trabajo práctico ha pasado. Ya no es posible realizar entregas ni modificaciones.</p>
            </div>
          )}

          {assignment.type === 'questionnaire' ? (
            <div className="space-y-6">
              {assignment.questions?.map((q, idx) => (
                <div key={q.id}>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                    <span className="text-zinc-500 mr-2">{idx + 1}.</span>
                    {q.text}
                  </label>
                  <textarea
                    value={answers[q.id] || ''}
                    onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                    rows={4}
                    disabled={isPastDue}
                    className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 disabled:opacity-50 disabled:bg-zinc-100 dark:disabled:bg-zinc-900"
                    placeholder={isPastDue ? "Entrega cerrada" : "Escribe tu respuesta aquí..."}
                  />
                </div>
              ))}
              
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-200 dark:border-zinc-700">
                {lastAutoSave && (
                  <span className="text-xs text-zinc-500 mr-auto flex items-center gap-1">
                    {isAutoSaving ? (
                      <>
                        <svg className="animate-spin h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Guardando borrador...
                      </>
                    ) : (
                      <>
                        <svg className="w-3 h-3 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                        Borrador guardado {lastAutoSave.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </>
                    )}
                  </span>
                )}
                <button
                  type="button"
                  onClick={(e) => handleSubmit(e as any, 'draft')}
                  disabled={loading || isPastDue}
                  className="px-4 py-2 text-sm font-medium text-zinc-700 bg-white border border-zinc-300 rounded-lg hover:bg-zinc-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Guardar Borrador
                </button>
                <button
                  type="submit"
                  disabled={loading || isPastDue}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Guardando...
                    </>
                  ) : (
                    <>
                      Enviar Entrega Final
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="mb-6">
                <label htmlFor="project-folder" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  Código Fuente (Carpeta del Proyecto)
                </label>
                <div 
                  className={`relative border-2 border-dashed rounded-xl p-8 transition-all ${
                    isDragging 
                      ? "border-purple-500 bg-purple-50 dark:bg-purple-900/20" 
                      : isPastDue 
                        ? "border-red-300 bg-red-50/50 dark:border-red-800/50 dark:bg-red-900/10 cursor-not-allowed" 
                        : "border-zinc-300 dark:border-zinc-700 hover:border-purple-400 dark:hover:border-purple-500"
                  }`}
                  onDragOver={isPastDue ? undefined : handleDragOver}
                  onDragLeave={isPastDue ? undefined : handleDragLeave}
                  onDrop={isPastDue ? undefined : handleDrop}
                >
                    <input
                      type="file"
                      id="project-folder"
                      ref={fileInputRef}
                      disabled={isPastDue}
                      {...({ webkitdirectory: "", directory: "" } as any)}
                      className="hidden"
                      onChange={handleFileChange}
                    />
                    <div className="flex flex-col items-center justify-center text-center gap-3">
                      <div className={`p-4 rounded-full ${
                        selectedFolderName 
                          ? "bg-purple-100 text-purple-600 dark:bg-purple-900/40 dark:text-purple-400" 
                          : isPastDue
                            ? "bg-red-100 text-red-400 dark:bg-red-900/30 dark:text-red-500"
                            : "bg-zinc-100 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500"
                      }`}>
                        {selectedFolderName ? (
                            <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24"><path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/></svg>
                        ) : (
                            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                        )}
                      </div>
                      
                      {selectedFolderName ? (
                        <div>
                            <p className="font-medium text-zinc-900 dark:text-zinc-100 mb-1">{selectedFolderName}</p>
                            {!isPastDue && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setSelectedFolderName(null);
                                        setSelectedFiles([]);
                                        if (fileInputRef.current) fileInputRef.current.value = "";
                                    }}
                                    className="text-xs text-red-500 hover:text-red-700 hover:underline"
                                >
                                    Eliminar selección
                                </button>
                            )}
                        </div>
                      ) : (
                        <>
                            <p className="text-sm text-zinc-600 dark:text-zinc-400">
                                {isPastDue ? (
                                    "Entrega cerrada"
                                ) : (
                                    <>
                                        <button
                                            type="button"
                                            onClick={() => fileInputRef.current?.click()}
                                            className="font-semibold text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300 hover:underline"
                                        >
                                            Selecciona una carpeta
                                        </button>
                                        {" "}o arrástrala aquí
                                    </>
                                )}
                            </p>
                            {!isPastDue && (
                                <p className="text-xs text-zinc-500">
                                    Se comprimirá automáticamente en un archivo ZIP
                                </p>
                            )}
                        </>
                      )}
                    </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3">
                {loading ? (
                    <ProgressSteps />
                ) : (
                    <>
                        {isDelivered && (
                            <button
                                type="button"
                                onClick={() => {
                                    setIsEditing(false);
                                }}
                                className="px-4 py-2 text-sm font-medium text-zinc-700 bg-white border border-zinc-300 rounded-lg hover:bg-zinc-50 transition-colors"
                            >
                                Cancelar
                            </button>
                        )}
                        <button
                        type="submit"
                        disabled={loading || isPastDue}
                        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                        {isDelivered ? "Actualizar Entrega" : "Entregar Tarea"}
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                        </button>
                    </>
                )}
              </div>
            </>
          )}
        </form>
      )}
    </div>
  );
}
