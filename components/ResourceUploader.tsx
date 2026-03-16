"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { uploadSlide, uploadNote, uploadStudyGuide } from "@/lib/actions-slides";

interface ResourceUploaderProps {
  type: 'slide' | 'note' | 'study-guide';
}

export default function ResourceUploader({ type }: ResourceUploaderProps) {
  const router = useRouter();
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      let result;
      if (type === 'slide') {
        result = await uploadSlide(formData);
      } else if (type === 'note') {
        result = await uploadNote(formData);
      } else {
        result = await uploadStudyGuide(formData);
      }

      if (result.success) {
        router.refresh();
        // Reset file input
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      } else {
        setError(result.error || "Error al subir el archivo");
      }
    } catch (err) {
      console.error(err);
      setError("Error inesperado al subir el archivo");
    } finally {
      setIsUploading(false);
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  let accept = "";
  let label = "";
  let colorClass = "";
  let formatText = "";

  if (type === 'slide') {
    accept = ".html,.pdf,.pptx";
    label = "Subir Diapositiva";
    colorClass = "bg-cyan-600 hover:bg-cyan-700 focus:ring-cyan-500";
    formatText = "Formatos: .html, .pdf, .pptx";
  } else if (type === 'note') {
    accept = ".md,.pdf,.docx";
    label = "Subir Nota";
    colorClass = "bg-yellow-600 hover:bg-yellow-700 focus:ring-yellow-500";
    formatText = "Formatos: .md, .pdf, .docx";
  } else {
    accept = ".pdf,.docx,.md,.txt";
    label = "Subir Apunte";
    colorClass = "bg-purple-600 hover:bg-purple-700 focus:ring-purple-500";
    formatText = "Formatos: .pdf, .docx, .md, .txt";
  }

  return (
    <div className="w-full mt-auto">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept={accept}
        className="hidden"
      />
      
      {error && (
        <div className="mb-2 p-2 bg-red-100 text-red-700 text-sm rounded border border-red-200">
          {error}
        </div>
      )}

      <button
        onClick={handleClick}
        disabled={isUploading}
        className={`w-full py-3 text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${colorClass}`}
      >
        {isUploading ? (
          <>
            <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Subiendo...
          </>
        ) : (
          <>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            {label}
          </>
        )}
      </button>
      <p className="text-xs text-center mt-2 text-zinc-400 dark:text-zinc-500">
        {formatText}
      </p>
    </div>
  );
}
