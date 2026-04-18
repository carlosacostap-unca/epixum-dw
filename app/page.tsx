import { getAllClasses, getUserDeliveries, getAllAssignments } from "@/lib/data";
import { Class } from "@/types";
import Link from "next/link";
import { getCurrentUser } from "@/lib/pocketbase-server";
import FormattedDate from "@/components/FormattedDate";
import StudentGradesSummary from "@/components/StudentGradesSummary";

export const dynamic = 'force-dynamic';

export default async function Home() {
  const user = await getCurrentUser();

  // 1. Student View (Navigation Cards)
  if (user && user.role === 'estudiante') {
    const userDeliveries = await getUserDeliveries(user.id);
    const assignments = await getAllAssignments();

    return (
        <div className="container mx-auto p-8 min-h-screen">
            <header className="mb-12 text-center">
                <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl mb-4">
                Curso de Diseño Web
                </h1>
            </header>
            
            <StudentGradesSummary deliveries={userDeliveries} assignments={assignments} userEmail={user.email} />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto mt-12">
                <Link href="/course-info" className="block p-8 bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-800 hover:border-purple-500 hover:shadow-md transition-all group">
                    <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    </div>
                    <h2 className="text-2xl font-bold mb-2 text-zinc-900 dark:text-white">Presentación del Curso</h2>
                    <p className="text-zinc-500 dark:text-zinc-400">Información general, objetivos y metodología.</p>
                </Link>

                <Link href="/classes" className="block p-8 bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-800 hover:border-blue-500 hover:shadow-md transition-all group">
                    <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                    </div>
                    <h2 className="text-2xl font-bold mb-2 text-zinc-900 dark:text-white">Clases</h2>
                    <p className="text-zinc-500 dark:text-zinc-400">Accede a las clases y materiales del curso.</p>
                </Link>
                
                <Link href="/assignments" className="block p-8 bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-800 hover:border-green-500 hover:shadow-md transition-all group">
                    <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>
                    </div>
                    <h2 className="text-2xl font-bold mb-2 text-zinc-900 dark:text-white">Trabajos Prácticos</h2>
                    <p className="text-zinc-500 dark:text-zinc-400">Entrega tus tareas y visualiza tus calificaciones.</p>
                </Link>

                <Link href="/inquiries" className="block p-8 bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-800 hover:border-orange-500 hover:shadow-md transition-all group">
                    <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    </div>
                    <h2 className="text-2xl font-bold mb-2 text-zinc-900 dark:text-white">Consultas</h2>
                    <p className="text-zinc-500 dark:text-zinc-400">Pregunta dudas y ayuda a tus compañeros.</p>
                </Link>
            </div>
        </div>
    );
  }

  // 2. Teacher / Admin View (Navigation Cards)
  if (user && (user.role === 'docente' || user.role === 'admin')) {
    return (
      <div className="container mx-auto p-8 min-h-screen">
          <header className="mb-12 text-center">
              <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl mb-4">
              Panel Docente
              </h1>
              <p className="text-xl text-zinc-500 dark:text-zinc-400">
              Gestiona el curso, las clases y los trabajos prácticos.
              </p>
          </header>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto mt-12">
              <Link href="/students" className="block p-8 bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-800 hover:border-blue-500 hover:shadow-md transition-all group">
                  <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                  </div>
                  <h2 className="text-2xl font-bold mb-2 text-zinc-900 dark:text-white">Estudiantes</h2>
                  <p className="text-zinc-500 dark:text-zinc-400">Consulta los datos de cursada y calificaciones de los estudiantes.</p>
              </Link>
              
              <Link href="/course-info" className="block p-8 bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-800 hover:border-purple-500 hover:shadow-md transition-all group">
                  <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  </div>
                  <h2 className="text-2xl font-bold mb-2 text-zinc-900 dark:text-white">Presentación del Curso</h2>
                  <p className="text-zinc-500 dark:text-zinc-400">Información general, objetivos y metodología.</p>
              </Link>

              <Link href="/classes" className="block p-8 bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-800 hover:border-blue-500 hover:shadow-md transition-all group">
                  <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                  </div>
                  <h2 className="text-2xl font-bold mb-2 text-zinc-900 dark:text-white">Gestionar Clases</h2>
                  <p className="text-zinc-500 dark:text-zinc-400">Crea, edita y administra las clases del curso.</p>
              </Link>
              
              <Link href="/assignments" className="block p-8 bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-800 hover:border-green-500 hover:shadow-md transition-all group">
                  <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>
                  </div>
                  <h2 className="text-2xl font-bold mb-2 text-zinc-900 dark:text-white">Gestionar Trabajos</h2>
                  <p className="text-zinc-500 dark:text-zinc-400">Crea y administra los trabajos prácticos.</p>
              </Link>

              <Link href="/inquiries" className="block p-8 bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-800 hover:border-orange-500 hover:shadow-md transition-all group">
                  <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  </div>
                  <h2 className="text-2xl font-bold mb-2 text-zinc-900 dark:text-white">Consultas</h2>
                  <p className="text-zinc-500 dark:text-zinc-400">Responde dudas y gestiona las consultas del curso.</p>
              </Link>

              <Link href="/resources" className="block p-8 bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-800 hover:border-cyan-500 hover:shadow-md transition-all group">
                  <div className="w-12 h-12 bg-cyan-100 dark:bg-cyan-900/30 text-cyan-600 dark:text-cyan-400 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z" /></svg>
                  </div>
                  <h2 className="text-2xl font-bold mb-2 text-zinc-900 dark:text-white">Gestionar Recursos Educativos</h2>
                  <p className="text-zinc-500 dark:text-zinc-400">Sube y administra los materiales de estudio para los estudiantes.</p>
              </Link>
          </div>
      </div>
    );
  }

  // 3. Guest View
  let classes: Class[] = [];
  let error = null;

  try {
    classes = await getAllClasses();
  } catch (e) {
    console.error("Failed to fetch classes for guest view", e);
    error = "No se pudieron cargar las clases.";
  }

  return (
    <div className="container mx-auto p-8 min-h-screen">
      <header className="mb-12 text-center">
          <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl mb-4">
          Curso de Diseño Web
          </h1>
          <p className="text-xl text-zinc-500 dark:text-zinc-400">
          Inicia sesión para acceder a todo el contenido.
          </p>
      </header>

      {error ? (
          <div className="text-center text-red-500 p-4 bg-red-50 rounded-lg">
              {error}
          </div>
      ) : (
          <div className="space-y-12">
              <section>
                  <h2 className="text-2xl font-bold mb-6 text-zinc-900 dark:text-zinc-100 border-b border-zinc-200 dark:border-zinc-800 pb-2">
                      Programa de Clases
                  </h2>
                  <div className="grid gap-4">
                      {classes.length === 0 ? (
                          <p className="text-zinc-500">No hay clases visibles públicamente.</p>
                      ) : (
                          classes.map((cls) => (
                              <div key={cls.id} className="p-6 bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-800 opacity-75">
                                  <div className="flex justify-between items-start">
                                      <div>
                                          <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
                                              {cls.title}
                                          </h3>
                                          <div className="flex items-center gap-2 mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                              {cls.date ? <FormattedDate date={cls.date} /> : <span>Fecha por definir</span>}
                                          </div>
                                      </div>
                                      <span className="px-3 py-1 bg-zinc-100 dark:bg-zinc-800 rounded-full text-xs font-medium text-zinc-600 dark:text-zinc-400">
                                          Clase
                                      </span>
                                  </div>
                                  <p className="mt-4 text-zinc-600 dark:text-zinc-400 line-clamp-2">
                                      {cls.description}
                                  </p>
                              </div>
                          ))
                      )}
                  </div>
              </section>
          </div>
      )}
    </div>
  );
}
