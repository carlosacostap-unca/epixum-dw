import { getAllClasses } from "@/lib/data";
import Link from "next/link";
import FormattedDate from "@/components/FormattedDate";
import { getCurrentUser } from "@/lib/pocketbase-server";
import ClassForm from "@/components/ClassForm";

export const dynamic = 'force-dynamic';

export default async function ClassesPage() {
  const classes = await getAllClasses();
  const user = await getCurrentUser();
  const isTeacher = user && (user.role === 'docente' || user.role === 'admin');

  return (
    <div className="container mx-auto p-8 min-h-screen">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">Clases</h1>
          <p className="text-zinc-500 dark:text-zinc-400 mt-2">Todas las clases del curso.</p>
        </div>
        {isTeacher && (
           <ClassForm />
        )}
      </div>

      <div className="grid gap-6">
        {classes.length === 0 ? (
          <p className="text-zinc-500">No hay clases registradas aún.</p>
        ) : (
          classes.map((cls) => (
            <Link 
              href={`/classes/${cls.id}`} 
              key={cls.id}
              className="block p-6 bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-800 hover:border-blue-500 hover:shadow-md transition-all group"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {cls.title}
                  </h2>
                  <div className="flex items-center gap-2 mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                    {cls.date ? <FormattedDate date={cls.date} /> : <span>Fecha por definir</span>}
                  </div>
                </div>
                <div className="bg-zinc-100 dark:bg-zinc-800 p-2 rounded-lg group-hover:bg-blue-50 dark:group-hover:bg-blue-900/20 transition-colors">
                   <svg className="w-5 h-5 text-zinc-400 group-hover:text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                </div>
              </div>
              <p className="mt-4 text-zinc-600 dark:text-zinc-400 line-clamp-2">
                {cls.description}
              </p>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
