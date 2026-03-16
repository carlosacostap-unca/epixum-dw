import { getCurrentUser } from "@/lib/pocketbase-server";
import { getAvailableSlides, getAvailableNotes, getAvailableStudyGuides } from "@/lib/actions-slides";
import Link from "next/link";
import ResourceUploader from "@/components/ResourceUploader";

export const dynamic = 'force-dynamic';

export default async function ResourcesPage() {
  const user = await getCurrentUser();
  const isTeacher = user && (user.role === 'docente' || user.role === 'admin');
  
  const slidesResponse = await getAvailableSlides();
  const notesResponse = await getAvailableNotes();
  const guidesResponse = await getAvailableStudyGuides();
  
  const slides = slidesResponse.success ? slidesResponse.slides : [];
  const notes = notesResponse.success ? notesResponse.notes : [];
  const guides = guidesResponse.success ? guidesResponse.guides : [];

  return (
    <div className="container mx-auto p-8 min-h-screen">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">Gestión de Recursos Educativos</h1>
          <p className="text-zinc-500 dark:text-zinc-400 mt-2">
            Administra las diapositivas, notas del orador y apuntes del curso.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mt-12">
        {/* Sección de Diapositivas */}
        <section className="bg-white dark:bg-zinc-900 p-8 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-800 flex flex-col h-full">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-cyan-100 dark:bg-cyan-900/30 text-cyan-600 dark:text-cyan-400 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
              </div>
              <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">Diapositivas</h2>
            </div>
          </div>
          
          <p className="text-zinc-500 dark:text-zinc-400 mb-6">
            Aquí podrás organizar y compartir las presentaciones que se utilizarán en clase.
          </p>

          <div className="flex-grow overflow-y-auto max-h-80 mb-6 pr-2">
            {slides && slides.length > 0 ? (
              <ul className="space-y-3">
                {slides.map((slide, index) => (
                  <li key={index}>
                    <Link href={slide.path} target="_blank" className="flex items-center p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl hover:bg-cyan-50 dark:hover:bg-cyan-900/20 hover:border-cyan-200 dark:hover:border-cyan-800 border border-transparent transition-all group">
                      <svg className="w-5 h-5 text-zinc-400 group-hover:text-cyan-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                      <span className="font-medium text-zinc-700 dark:text-zinc-300 group-hover:text-cyan-600 dark:group-hover:text-cyan-400 truncate">
                        {slide.title}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="flex items-center justify-center h-32 bg-zinc-50 dark:bg-zinc-800/30 rounded-xl border border-dashed border-zinc-200 dark:border-zinc-700">
                <span className="text-zinc-500 dark:text-zinc-400">No hay presentaciones disponibles</span>
              </div>
            )}
          </div>

          {isTeacher && <ResourceUploader type="slide" />}
        </section>

        {/* Sección de Notas del Orador */}
        <section className="bg-white dark:bg-zinc-900 p-8 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-800 flex flex-col h-full">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              </div>
              <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">Notas del Orador</h2>
            </div>
          </div>
          
          <p className="text-zinc-500 dark:text-zinc-400 mb-6">
            Crea y visualiza apuntes detallados para complementar cada una de las clases.
          </p>

          <div className="flex-grow overflow-y-auto max-h-80 mb-6 pr-2">
            {notes && notes.length > 0 ? (
              <ul className="space-y-3">
                {notes.map((note, index) => (
                  <li key={index}>
                    <Link href={note.path} target="_blank" className="flex items-center p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl hover:bg-yellow-50 dark:hover:bg-yellow-900/20 hover:border-yellow-200 dark:hover:border-yellow-800 border border-transparent transition-all group">
                      <svg className="w-5 h-5 text-zinc-400 group-hover:text-yellow-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                      <span className="font-medium text-zinc-700 dark:text-zinc-300 group-hover:text-yellow-600 dark:group-hover:text-yellow-400 truncate">
                        {note.title}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="flex items-center justify-center h-32 bg-zinc-50 dark:bg-zinc-800/30 rounded-xl border border-dashed border-zinc-200 dark:border-zinc-700">
                <span className="text-zinc-500 dark:text-zinc-400">No hay notas disponibles</span>
              </div>
            )}
          </div>

          {isTeacher && <ResourceUploader type="note" />}
        </section>

        {/* Sección de Apuntes */}
        <section className="bg-white dark:bg-zinc-900 p-8 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-800 flex flex-col h-full">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
              </div>
              <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">Apuntes</h2>
            </div>
          </div>
          
          <p className="text-zinc-500 dark:text-zinc-400 mb-6">
            Recursos adicionales y guías de estudio para profundizar en los temas.
          </p>

          <div className="flex-grow overflow-y-auto max-h-80 mb-6 pr-2">
            {guides && guides.length > 0 ? (
              <ul className="space-y-3">
                {guides.map((guide, index) => (
                  <li key={index}>
                    <Link href={guide.path} target="_blank" className="flex items-center p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl hover:bg-purple-50 dark:hover:bg-purple-900/20 hover:border-purple-200 dark:hover:border-purple-800 border border-transparent transition-all group">
                      <svg className="w-5 h-5 text-zinc-400 group-hover:text-purple-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                      <span className="font-medium text-zinc-700 dark:text-zinc-300 group-hover:text-purple-600 dark:group-hover:text-purple-400 truncate">
                        {guide.title}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="flex items-center justify-center h-32 bg-zinc-50 dark:bg-zinc-800/30 rounded-xl border border-dashed border-zinc-200 dark:border-zinc-700">
                <span className="text-zinc-500 dark:text-zinc-400">No hay apuntes disponibles</span>
              </div>
            )}
          </div>

          {isTeacher && <ResourceUploader type="study-guide" />}
        </section>
      </div>
    </div>
  );
}
