
import React from 'react';
import Link from 'next/link';

export default function CourseInfoPage() {
  return (
    <div className="container mx-auto p-8 min-h-screen">
      <div className="mb-8">
          <Link href="/" className="text-blue-500 hover:underline inline-block">&larr; Volver al Inicio</Link>
      </div>

      <header className="mb-12 text-center border-b border-zinc-200 dark:border-zinc-800 pb-12">
        <h2 className="text-xl font-semibold text-zinc-500 dark:text-zinc-400 mb-2">
            UNIVERSIDAD NACIONAL DE CATAMARCA - FACULTAD DE TECNOLOGÍA Y CIENCIAS APLICADAS
        </h2>
        <h3 className="text-lg text-zinc-500 dark:text-zinc-400 mb-4">
            DEPARTAMENTO DE INFORMÁTICA - TECNICATURA EN DISEÑO DE SOFTWARE
        </h3>
        <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl mb-4 text-zinc-900 dark:text-white">
          Diseño de Software de Dispositivos Móviles
        </h1>
        <div className="flex flex-wrap justify-center gap-4 text-sm text-zinc-600 dark:text-zinc-400 mt-6">
            <span className="bg-zinc-100 dark:bg-zinc-800 px-3 py-1 rounded-full">Año 2026</span>
            <span className="bg-zinc-100 dark:bg-zinc-800 px-3 py-1 rounded-full">3er Año</span>
            <span className="bg-zinc-100 dark:bg-zinc-800 px-3 py-1 rounded-full">1er Cuatrimestre</span>
            <span className="bg-zinc-100 dark:bg-zinc-800 px-3 py-1 rounded-full">Carga Horaria: 90 hs</span>
        </div>
      </header>

      <div className="max-w-5xl mx-auto space-y-12">
        
        {/* PRESENTACIÓN */}
        <section className="bg-white dark:bg-zinc-900 p-8 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-800">
          <h2 className="text-2xl font-bold mb-6 text-zinc-900 dark:text-white flex items-center gap-2 border-b border-zinc-100 dark:border-zinc-800 pb-4">
            <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            Presentación de la Asignatura
          </h2>
          <div className="space-y-4 text-zinc-700 dark:text-zinc-300 leading-relaxed">
            <p>
              La cátedra "Diseño de Software de Dispositivos Móviles" tiene como objetivo proporcionar a los estudiantes los conocimientos y habilidades necesarios para diseñar y desarrollar aplicaciones móviles innovadoras y centradas en el usuario. A lo largo de la cursada, los estudiantes explorarán los fundamentos teóricos del diseño y desarrollo de aplicaciones móviles, adquirirán habilidades de ideación y conceptualización de productos, aprenderán a utilizar herramientas de diseño para crear interfaces de usuario atractivas y funcionales, y desarrollarán prototipos funcionales de aplicaciones móviles.
            </p>
            <p>
              La cátedra se divide en cuatro aspectos clave: parte teórica, práctica de ideación de un producto, práctica de diseño UX/UI y práctica de desarrollo de aplicaciones móviles. A través de una combinación de clases teóricas y prácticas, los estudiantes adquirirán una comprensión integral del proceso de diseño y desarrollo de aplicaciones móviles, desde la generación de ideas hasta la publicación en las tiendas de aplicaciones.
            </p>
            <p>
              Además, durante el cursado, los alumnos formarán equipos de trabajo para desarrollar un proyecto integrador. Este proyecto abarcará desde la ideación, pasando por el diseño y siguiendo con el desarrollo de una aplicación móvil. El trabajo final integrador será presentado durante la última semana del cursado.
            </p>
            <p>
              Al finalizar la asignatura, los estudiantes estarán preparados para enfrentar los desafíos del mercado móvil actual y crear aplicaciones móviles innovadoras y centradas en el usuario, utilizando las últimas herramientas y tecnologías disponibles.
            </p>
          </div>
        </section>

        {/* OBJETIVOS */}
        <section className="bg-white dark:bg-zinc-900 p-8 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-800">
          <h2 className="text-2xl font-bold mb-6 text-zinc-900 dark:text-white flex items-center gap-2 border-b border-zinc-100 dark:border-zinc-800 pb-4">
            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
            Objetivos y Competencias
          </h2>
          
          <div className="grid md:grid-cols-2 gap-8">
            <div>
                <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-3">Competencias Genéricas</h3>
                <ul className="space-y-3 text-zinc-700 dark:text-zinc-300">
                    <li className="flex gap-2"><span className="text-blue-500 font-bold">•</span> <span><strong>Pensamiento Crítico:</strong> Analizar y evaluar ideas y soluciones móviles.</span></li>
                    <li className="flex gap-2"><span className="text-blue-500 font-bold">•</span> <span><strong>Creatividad e Innovación:</strong> Generar ideas originales para productos móviles.</span></li>
                    <li className="flex gap-2"><span className="text-blue-500 font-bold">•</span> <span><strong>Colaboración:</strong> Trabajo efectivo en equipos multidisciplinarios.</span></li>
                </ul>
            </div>
            <div>
                <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-3">Competencias Personales</h3>
                <ul className="space-y-3 text-zinc-700 dark:text-zinc-300">
                    <li className="flex gap-2"><span className="text-green-500 font-bold">•</span> <span><strong>Adaptabilidad:</strong> Aprender nuevas tecnologías continuamente.</span></li>
                    <li className="flex gap-2"><span className="text-green-500 font-bold">•</span> <span><strong>Autonomía:</strong> Trabajar independientemente y tomar decisiones.</span></li>
                    <li className="flex gap-2"><span className="text-green-500 font-bold">•</span> <span><strong>Comunicación:</strong> Expresar ideas claras oralmente y por escrito.</span></li>
                </ul>
            </div>
          </div>
          
          <div className="mt-8 pt-6 border-t border-zinc-100 dark:border-zinc-800">
            <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-4">Competencias Específicas</h3>
            <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-zinc-50 dark:bg-zinc-800/50 p-4 rounded-lg">
                    <h4 className="font-semibold text-zinc-900 dark:text-white mb-2">Diseño de Interfaz (UI)</h4>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">Crear diseños atractivos, intuitivos y funcionales aplicando principios de usabilidad.</p>
                </div>
                <div className="bg-zinc-50 dark:bg-zinc-800/50 p-4 rounded-lg">
                    <h4 className="font-semibold text-zinc-900 dark:text-white mb-2">Desarrollo de Prototipos</h4>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">Crear prototipos funcionales de manera rápida y eficiente.</p>
                </div>
                <div className="bg-zinc-50 dark:bg-zinc-800/50 p-4 rounded-lg">
                    <h4 className="font-semibold text-zinc-900 dark:text-white mb-2">Integración de Back-end</h4>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">Aplicar conceptos de BaaS (Supabase) para almacenamiento y sincronización.</p>
                </div>
                <div className="bg-zinc-50 dark:bg-zinc-800/50 p-4 rounded-lg">
                    <h4 className="font-semibold text-zinc-900 dark:text-white mb-2">Resolución de Problemas</h4>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">Identificar y resolver desafíos complejos en el desarrollo móvil.</p>
                </div>
            </div>
          </div>
        </section>

        {/* PROGRAMA ANALÍTICO */}
        <section className="bg-white dark:bg-zinc-900 p-8 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-800">
          <h2 className="text-2xl font-bold mb-6 text-zinc-900 dark:text-white flex items-center gap-2 border-b border-zinc-100 dark:border-zinc-800 pb-4">
            <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>
            Programa Analítico
          </h2>
          
          <div className="space-y-6">
            {[
                {
                    u: 1, title: "INTRODUCCIÓN A LOS DISPOSITIVOS MÓVILES Y SISTEMAS OPERATIVOS",
                    content: "Tipos de dispositivos móviles y sus características técnicas. Sistemas operativos móviles (iOS, Android). Tendencias actuales y desafíos. Accesibilidad y sostenibilidad."
                },
                {
                    u: 2, title: "ALTERNATIVAS PARA EL DESARROLLO DE APLICACIONES MÓVILES",
                    content: "Enfoques: nativo, híbrido, web y no-code/low-code. Comparativa de frameworks (Flutter, React Native). Ventajas y desventajas. Impacto de la IA."
                },
                {
                    u: 3, title: "FUNDAMENTOS DE DISEÑO UI/UX PARA APLICACIONES MÓVILES",
                    content: "Principios de UI. Mejores prácticas de UX móvil. Pautas para iOS y Android. Diseño responsivo y adaptativo. Tendencias."
                },
                {
                    u: 4, title: "IDEACIÓN Y CONCEPTUALIZACIÓN DE PRODUCTOS MÓVILES",
                    content: "Técnicas de ideación. Investigación de mercado. Identificación de necesidades. Propuesta de valor y diseño centrado en el usuario."
                },
                {
                    u: 5, title: "DISEÑO DE INTERFAZ DE USUARIO",
                    content: "Proceso de prototipado: wireframes a alta fidelidad. Herramientas digitales (Figma). IA en el diseño. Validación con usuarios."
                },
                {
                    u: 6, title: "DISEÑO DE APLICACIONES MÓVILES",
                    content: "Desarrollo de UI interactivas. Flujos de navegación. Gestión de estados y eventos. Integración de APIs. Pruebas y validación."
                },
                {
                    u: 7, title: "INTEGRACIÓN DE APLICACIONES MÓVILES CON SERVICIOS",
                    content: "Integración con back end. Consumo de RESTful y GraphQL. Autenticación y autorización. Almacenamiento en la nube. Seguridad."
                },
                {
                    u: 8, title: "PUBLICACIÓN Y DISTRIBUCIÓN",
                    content: "Proceso de publicación en App Store y Google Play. ASO (App Store Optimization). Marketing. Mantenimiento y métricas."
                }
            ].map((unit) => (
                <div key={unit.u} className="group">
                    <h3 className="text-lg font-bold text-indigo-600 dark:text-indigo-400 mb-1">Unidad {unit.u}: {unit.title}</h3>
                    <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed">{unit.content}</p>
                </div>
            ))}
          </div>
        </section>

        {/* ACTIVIDADES PRÁCTICAS */}
        <section className="bg-white dark:bg-zinc-900 p-8 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-800">
          <h2 className="text-2xl font-bold mb-6 text-zinc-900 dark:text-white flex items-center gap-2 border-b border-zinc-100 dark:border-zinc-800 pb-4">
            <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
            Actividades de Formación Práctica
          </h2>
          <div className="grid md:grid-cols-2 gap-4">
            {[
                "Investigación comparativa iOS vs Android.",
                "Análisis comparativo de enfoques (nativo, híbrido, web).",
                "Análisis de UX de app real y propuesta de mejora.",
                "Mini Design Sprint + Mapa de Empatía.",
                "Desarrollo de prototipo interactivo.",
                "Desarrollo de versión funcional con API pública.",
                "Integración de autenticación o servicio externo.",
                "Simulación de publicación + plan de mejora."
            ].map((activity, index) => (
                <div key={index} className="flex items-start gap-3 p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/30">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-orange-100 dark:bg-orange-900 text-orange-600 dark:text-orange-400 flex items-center justify-center text-xs font-bold">
                        {index + 1}
                    </span>
                    <span className="text-zinc-700 dark:text-zinc-300 text-sm">{activity}</span>
                </div>
            ))}
          </div>
        </section>

        {/* CONDICIONES DE APROBACIÓN */}
        <section className="bg-white dark:bg-zinc-900 p-8 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-800">
          <h2 className="text-2xl font-bold mb-6 text-zinc-900 dark:text-white flex items-center gap-2 border-b border-zinc-100 dark:border-zinc-800 pb-4">
            <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            Condiciones de Aprobación
          </h2>
          <div className="space-y-6 text-zinc-700 dark:text-zinc-300">
            <div className="bg-green-50 dark:bg-green-900/10 border-l-4 border-green-500 p-4">
                <h3 className="font-bold text-green-800 dark:text-green-400 mb-2">Promoción</h3>
                <ul className="list-disc list-inside space-y-1 text-sm">
                    <li><strong>Asistencia:</strong> 100% en Trabajos Prácticos, 80% en Clases Teóricas.</li>
                    <li><strong>Aprobación:</strong> 100% de Trabajos Prácticos.</li>
                    <li><strong>Evaluación Parcial:</strong> Nota mínima 7 (siete).</li>
                </ul>
            </div>
            
            <div className="bg-yellow-50 dark:bg-yellow-900/10 border-l-4 border-yellow-500 p-4">
                <h3 className="font-bold text-yellow-800 dark:text-yellow-400 mb-2">Regularización</h3>
                <ul className="list-disc list-inside space-y-1 text-sm">
                    <li><strong>Asistencia:</strong> 60% en Clases Teóricas.</li>
                    <li><strong>Evaluación Parcial:</strong> Nota mínima 4 (cuatro).</li>
                    <li><strong>Examen Final:</strong> Requerido para aprobar la asignatura.</li>
                </ul>
            </div>
          </div>
        </section>

        {/* BIBLIOGRAFÍA */}
        <section className="bg-white dark:bg-zinc-900 p-8 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-800">
          <h2 className="text-2xl font-bold mb-6 text-zinc-900 dark:text-white flex items-center gap-2 border-b border-zinc-100 dark:border-zinc-800 pb-4">
            <svg className="w-6 h-6 text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
            Bibliografía
          </h2>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm text-left">
                <thead className="bg-zinc-50 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 font-medium">
                    <tr>
                        <th className="px-4 py-3 rounded-tl-lg">Título</th>
                        <th className="px-4 py-3">Autores</th>
                        <th className="px-4 py-3 rounded-tr-lg">Editorial (Año)</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                    {[
                        { title: "Designing Interfaces", author: "Jenifer Tidwell, Charles Brewer", ed: "O'Reilly (2019)" },
                        { title: "Mobile App Development for Businesses", author: "Maja Dakić", ed: "Apress (2023)" },
                        { title: "Designing and Prototyping Interfaces with Figma", author: "Fabio Staiano", ed: "Packt (2023)" },
                        { title: "The Designer’s Guide to Figma", author: "Daniel Schwarz", ed: "SitePoint (2023)" },
                        { title: "Laws of UX", author: "Jon Yablonski", ed: "O'Reilly (2024)" },
                    ].map((book, i) => (
                        <tr key={i} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                            <td className="px-4 py-3 font-medium text-zinc-900 dark:text-white">{book.title}</td>
                            <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">{book.author}</td>
                            <td className="px-4 py-3 text-zinc-500 dark:text-zinc-500">{book.ed}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
          </div>
        </section>

      </div>
    </div>
  );
}
