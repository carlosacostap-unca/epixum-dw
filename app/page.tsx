import {
    getAllClasses,
    getUserDeliveries,
    getAllAssignments,
    getPublishedStudentPartialExams,
    getStudentPartialExamResults,
} from "@/lib/data";
import { Class } from "@/types";
import Link from "next/link";
import { getCurrentUser } from "@/lib/pocketbase-server";
import FormattedDate from "@/components/FormattedDate";
import StudentGradesSummary from "@/components/StudentGradesSummary";
import { isTeacherRole } from "@/lib/roles";

export const dynamic = 'force-dynamic';

export default async function Home() {
  const user = await getCurrentUser();

  // 1. Student View (Navigation Cards)
  if (user && user.role === 'estudiante') {
    const [userDeliveries, assignments, partialExams] = await Promise.all([
        getUserDeliveries(user.id),
        getAllAssignments(),
        getPublishedStudentPartialExams(),
    ]);
    const partialExamResults = await getStudentPartialExamResults(partialExams.map((partialExam) => partialExam.id));

    return (
        <div className="container mx-auto p-8 min-h-screen">
            <header className="mb-12 text-center">
                <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl mb-4">
                Curso de Diseño Web
                </h1>
            </header>


            <StudentGradesSummary
                deliveries={userDeliveries}
                assignments={assignments}
                partialExams={partialExams}
                partialExamResults={partialExamResults}
                userEmail={user.email}
            />

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

                <Link href="/parciales" className="block p-8 bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-800 hover:border-indigo-500 hover:shadow-md transition-all group">
                    <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M6 21h12a2 2 0 002-2V7a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2zm3-8h6m-6 4h4" /></svg>
                    </div>
                    <h2 className="text-2xl font-bold mb-2 text-zinc-900 dark:text-white">Parciales</h2>
                    <p className="text-zinc-500 dark:text-zinc-400">Realizá parciales publicados por el docente.</p>
                </Link>

                <Link href="/mi-equipo" className="block p-8 bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-800 hover:border-teal-500 hover:shadow-md transition-all group">
                    <div className="w-12 h-12 bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.86 6.86 0 016 18.75l.001-.032m11.999 0A5.971 5.971 0 0012 13.5a5.971 5.971 0 00-6 5.218m12 0a8.962 8.962 0 01-6 2.282 8.962 8.962 0 01-6-2.282M12 13.5a3 3 0 100-6 3 3 0 000 6z" /></svg>
                    </div>
                    <h2 className="text-2xl font-bold mb-2 text-zinc-900 dark:text-white">Proyecto Final</h2>
                    <p className="text-zinc-500 dark:text-zinc-400">Consulta tu equipo, el turno de presentación y los recursos cargados.</p>
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

  if (user && user.role === 'docente_invitado') {
    return (
      <div className="container mx-auto p-8 min-h-screen">
          <header className="mb-12 text-center">
              <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl mb-4">
              Proyecto Final
              </h1>
              <p className="text-xl text-zinc-500 dark:text-zinc-400">
              Acceso a turnos, equipos y evaluaciones de la presentación final.
              </p>
          </header>

          <div className="grid grid-cols-1 gap-6 max-w-2xl mx-auto mt-12">
              <Link href="/proyecto-final" className="block p-8 bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-800 hover:border-amber-500 hover:shadow-md transition-all group">
                  <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  </div>
                  <h2 className="text-2xl font-bold mb-2 text-zinc-900 dark:text-white">Proyecto Final</h2>
                  <p className="text-zinc-500 dark:text-zinc-400">Revisa turnos y registra evaluaciones durante las presentaciones.</p>
              </Link>
          </div>
      </div>
    );
  }

  // 2. Teacher / Admin View (Navigation Cards)
  if (user && isTeacherRole(user.role)) {
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
              <Link href="/course-dashboard" className="block p-8 bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-800 hover:border-emerald-500 hover:shadow-md transition-all group">
                  <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125C16.5 3.504 17.004 3 17.625 3h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" /></svg>
                  </div>
                  <h2 className="text-2xl font-bold mb-2 text-zinc-900 dark:text-white">Dashboard de Cursada</h2>
                  <p className="text-zinc-500 dark:text-zinc-400">Visualiza el avance, entregas pendientes y alertas de estudiantes.</p>
              </Link>

              <Link href="/students" className="block p-8 bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-800 hover:border-blue-500 hover:shadow-md transition-all group">
                  <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                  </div>
                  <h2 className="text-2xl font-bold mb-2 text-zinc-900 dark:text-white">Estudiantes</h2>
                  <p className="text-zinc-500 dark:text-zinc-400">Consulta los datos de cursada y calificaciones de los estudiantes.</p>
              </Link>

              <Link href="/equipos" className="block p-8 bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-800 hover:border-teal-500 hover:shadow-md transition-all group">
                  <div className="w-12 h-12 bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.86 6.86 0 016 18.75l.001-.032m11.999 0A5.971 5.971 0 0012 13.5a5.971 5.971 0 00-6 5.218m12 0a8.962 8.962 0 01-6 2.282 8.962 8.962 0 01-6-2.282m0 0A5.971 5.971 0 0112 13.5m0 0a3 3 0 100-6 3 3 0 000 6zm6-3.75a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-12 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" /></svg>
                  </div>
                  <h2 className="text-2xl font-bold mb-2 text-zinc-900 dark:text-white">Equipos</h2>
                  <p className="text-zinc-500 dark:text-zinc-400">Crea grupos de trabajo y asigna estudiantes.</p>
              </Link>

              <Link href="/proyecto-final" className="block p-8 bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-800 hover:border-amber-500 hover:shadow-md transition-all group">
                  <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  </div>
                  <h2 className="text-2xl font-bold mb-2 text-zinc-900 dark:text-white">Proyecto Final</h2>
                  <p className="text-zinc-500 dark:text-zinc-400">Revisa el estado de equipos y solicitudes para la revisión final.</p>
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

              {user.role === 'docente' && (
                <Link href="/parciales" className="block p-8 bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-800 hover:border-indigo-500 hover:shadow-md transition-all group">
                    <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M6 21h12a2 2 0 002-2V7a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2zm3-8h6m-6 4h4" /></svg>
                    </div>
                    <h2 className="text-2xl font-bold mb-2 text-zinc-900 dark:text-white">Parciales</h2>
                    <p className="text-zinc-500 dark:text-zinc-400">Crea y administra los examenes parciales del curso.</p>
                </Link>
              )}

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

