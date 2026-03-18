
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
          Diseño Web
        </h1>
        <div className="flex flex-wrap justify-center gap-4 text-sm text-zinc-600 dark:text-zinc-400 mt-6">
            <span className="bg-zinc-100 dark:bg-zinc-800 px-3 py-1 rounded-full">Año 2026</span>
            <span className="bg-zinc-100 dark:bg-zinc-800 px-3 py-1 rounded-full">1er Año</span>
            <span className="bg-zinc-100 dark:bg-zinc-800 px-3 py-1 rounded-full">1er Cuatrimestre</span>
            <span className="bg-zinc-100 dark:bg-zinc-800 px-3 py-1 rounded-full">Carga Horaria: 60 hs</span>
        </div>
      </header>

      <div className="max-w-5xl mx-auto space-y-12">
        
        {/* I. PRESENTACIÓN */}
        <section className="bg-white dark:bg-zinc-900 p-8 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-800">
          <h2 className="text-2xl font-bold mb-6 text-zinc-900 dark:text-white flex items-center gap-2 border-b border-zinc-100 dark:border-zinc-800 pb-4">
            <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            I. Presentación de la Asignatura
          </h2>
          <div className="space-y-4 text-zinc-700 dark:text-zinc-300 leading-relaxed">
            <p>
              La asignatura Diseño Web introduce a los estudiantes en los fundamentos del desarrollo de sitios web estáticos, abordando desde los conceptos básicos de Internet y la Web hasta las técnicas modernas de maquetación, accesibilidad y optimización. En un contexto donde la presencia digital es esencial tanto para organizaciones como para profesionales independientes, la capacidad de diseñar y construir sitios web funcionales, accesibles y visualmente atractivos constituye una competencia fundamental para el ingeniero en informática.
            </p>
            <p>
              La asignatura se estructura en dos fases. En la primera, los estudiantes trabajan exclusivamente de forma manual con HTML y CSS, consolidando una base sólida que les permita comprender en profundidad cómo se construye una página web desde cero. En la segunda fase, una vez certificados esos fundamentos mediante una evaluación práctica, se incorporan herramientas de IA Generativa como complemento al flujo de trabajo. Este enfoque progresivo busca que el estudiante primero domine los conceptos y luego pueda evaluar críticamente lo que las herramientas automatizadas producen, desarrollando un criterio profesional que le permita aprovechar la IA sin depender de ella.
            </p>
            <p>
              Al finalizar el cursado, los estudiantes habrán desarrollado un sitio web completo y publicado en Internet, aplicando estándares de la industria en cuanto a semántica, responsive design, accesibilidad y SEO.
            </p>
          </div>
        </section>

        {/* II. OBJETIVOS */}
        <section className="bg-white dark:bg-zinc-900 p-8 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-800">
          <h2 className="text-2xl font-bold mb-6 text-zinc-900 dark:text-white flex items-center gap-2 border-b border-zinc-100 dark:border-zinc-800 pb-4">
            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
            II. Objetivos
          </h2>
          
          <div className="space-y-6">
            <div>
                <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-3">Objetivo General</h3>
                <p className="text-zinc-700 dark:text-zinc-300">
                    Que el estudiante adquiera los conocimientos y habilidades fundamentales para diseñar, desarrollar y publicar sitios web estáticos, accesibles y optimizados, aplicando estándares actuales de la industria e integrando herramientas de IA Generativa de forma crítica y responsable en su flujo de trabajo.
                </p>
            </div>
            
            <div>
                <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-3">Objetivos Específicos</h3>
                <ul className="space-y-2 text-zinc-700 dark:text-zinc-300 list-disc list-inside">
                    <li>Comprender la arquitectura básica de la Web y el funcionamiento del protocolo HTTP.</li>
                    <li>Construir páginas web semánticas y bien estructuradas utilizando HTML5.</li>
                    <li>Aplicar hojas de estilo CSS para el diseño visual y la maquetación de sitios web.</li>
                    <li>Implementar diseños responsive que se adapten a distintos dispositivos y tamaños de pantalla.</li>
                    <li>Utilizar frameworks y librerías CSS para acelerar el desarrollo frontend.</li>
                    <li>Incorporar principios de accesibilidad web (WCAG) en el proceso de diseño.</li>
                    <li>Aplicar técnicas básicas de SEO on-page para mejorar la visibilidad en motores de búsqueda.</li>
                    <li>Reconocer y aplicar principios de diseño web moderno y tendencias actuales.</li>
                    <li>Utilizar herramientas de IA Generativa como apoyo al flujo de trabajo de diseño y desarrollo web, evaluando críticamente sus resultados y comprendiendo sus limitaciones.</li>
                </ul>
            </div>
          </div>
        </section>

        {/* III. PROGRAMA ANALÍTICO */}
        <section className="bg-white dark:bg-zinc-900 p-8 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-800">
          <h2 className="text-2xl font-bold mb-6 text-zinc-900 dark:text-white flex items-center gap-2 border-b border-zinc-100 dark:border-zinc-800 pb-4">
            <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>
            III. Programa Analítico
          </h2>
          
          <div className="space-y-8">
            {[
                {
                    u: 1, title: "Fundamentos de la Web",
                    content: "Internet: concepto, historia, infraestructura básica, protocolos de red (TCP/IP). La Web: origen, evolución (Web 1.0, 2.0, 3.0), diferencia entre Internet y Web. Páginas web y sitios web: definiciones, diferencias, tipos de sitios (estáticos, dinámicos, aplicaciones web). Arquitectura cliente-servidor. Protocolo HTTP/HTTPS: métodos, códigos de estado, cabeceras. URLs y DNS. Herramientas de desarrollo del navegador (pestañas Red y Elementos). Introducción a HTML5: estructura de un documento, etiquetas básicas. Elementos semánticos: header, nav, main, section, article, footer. Validación según estándares del W3C."
                },
                {
                    u: 2, title: "Primeros pasos con CSS",
                    content: "Introducción a CSS: sintaxis, vinculación (inline, interno, externo). Selectores, combinadores, pseudo-clases. Especificidad y cascada. Modelo de caja (box model). Unidades de medida (px, em, rem, %, vh, vw). Colores, tipografías web mediante servicios de fuentes externas, fondos e imágenes."
                },
                {
                    u: 3, title: "HTML avanzado + Layout CSS",
                    content: "Formularios HTML: tipos de input, atributos de validación, label, fieldset, legend. Tablas semánticas. Multimedia: audio, video, picture. Metadatos, <head>, Open Graph, favicon. Enlaces y anclas. Organización de archivos de un proyecto web. Sitios multipágina. Layout con Flexbox: eje principal/cruzado, propiedades del contenedor e ítems. Layout con CSS Grid: filas, columnas, áreas. Cuándo usar Flexbox vs. Grid."
                },
                {
                    u: 4, title: "IA Generativa + Diseño Responsive",
                    content: "Introducción a IA Generativa para desarrollo web: qué es, cómo funcionan los modelos de lenguaje a alto nivel, asistentes de código basados en IA. Prompt engineering básico: cómo pedir código, iterar y verificar. Ética, limitaciones y alucinaciones: por qué no se puede confiar ciegamente. Principios de diseño responsive. Mobile-first vs. desktop-first. Media queries: breakpoints comunes. Viewport meta tag. Imágenes responsive: srcset, sizes, <picture>. Tipografía fluida (clamp()). Unidades relativas al viewport. Testeo multidispositivo."
                },
                {
                    u: 5, title: "Framework CSS utility-first, librerías y herramientas IA de diseño",
                    content: "Frameworks y librerías CSS: por qué usarlos, enfoques component-based vs. utility-first. Framework CSS utility-first: filosofía, instalación y configuración (CLI, CDN, integración con proyectos). Clases utilitarias fundamentales: layout, espaciado, tipografía, colores. Sistema de diseño: theme y extensión de configuración. Uso avanzado: responsive con prefijos de breakpoint, estados interactivos, componentes reutilizables. Otros frameworks CSS: panorama general y criterios de selección según el proyecto. Herramientas IA de generación de UI: herramientas que generan interfaces a partir de prompts. Flujo de trabajo: prompt → prototipo → refinamiento manual. Limitaciones y cuándo no usarlas."
                },
                {
                    u: 6, title: "Accesibilidad y SEO",
                    content: "Accesibilidad web: principios WCAG 2.1 (perceptible, operable, comprensible, robusto). Roles ARIA, atributo alt, contraste de colores, navegación por teclado. SEO on-page: etiquetas de título, meta description, encabezados jerárquicos. Datos estructurados básicos. Core Web Vitals. Herramientas de auditoría web: analizadores de performance, accesibilidad y SEO."
                },
                {
                    u: 7, title: "Diseño web moderno y proyecto integrador",
                    content: "Principios de diseño web moderno: UX/UI básico, sistemas de diseño. Variables CSS (custom properties). Transiciones y animaciones CSS. Tendencias actuales: dark mode, glassmorphism, microinteracciones. Reflexión final sobre IA en el flujo de trabajo web: cuándo acelera, cuándo estorba, cómo integrarla profesionalmente."
                }
            ].map((unit) => (
                <div key={unit.u} className="group">
                    <h3 className="text-lg font-bold text-indigo-600 dark:text-indigo-400 mb-2">Unidad {unit.u}: {unit.title}</h3>
                    <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed text-justify">{unit.content}</p>
                </div>
            ))}
          </div>
        </section>

        {/* IV. ACTIVIDADES DE FORMACIÓN PRÁCTICA */}
        <section className="bg-white dark:bg-zinc-900 p-8 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-800">
          <h2 className="text-2xl font-bold mb-6 text-zinc-900 dark:text-white flex items-center gap-2 border-b border-zinc-100 dark:border-zinc-800 pb-4">
            <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
            IV. Actividades de Formación Práctica
          </h2>
          
          <div className="space-y-8">
            <div>
                <h3 className="text-lg font-bold text-zinc-800 dark:text-zinc-200 mb-3 border-l-4 border-orange-500 pl-3">Fase 1: Trabajo manual</h3>
                <p className="text-zinc-600 dark:text-zinc-400 mb-4 italic">
                    En esta fase los estudiantes desarrollan todas las actividades sin asistencia de IA, consolidando los fundamentos de HTML y CSS mediante la práctica directa.
                </p>
                <div className="space-y-4">
                    {[
                        { id: "TP1", title: "Cuestionario sobre la Web e Internet", desc: "Cuestionario individual sobre los conceptos fundamentales." },
                        { id: "TP2", title: "Página personal con HTML semántico", desc: "Crear una página personal con estructura semántica completa y validación W3C." },
                        { id: "TP3", title: "Primeros estilos CSS", desc: "Estilizar la página del TP2 con CSS externo, selectores y combinadores." },
                        { id: "TP4", title: "Modelo de caja, tipografía y color", desc: "Rediseñar aplicando modelo de caja, tipografías web y paleta de colores." },
                        { id: "TP5", title: "Formularios y tablas", desc: "Construir formulario con validación y tabla semántica." },
                        { id: "TP6", title: "Sitio multipágina", desc: "Desarrollar sitio multipágina con navegación y estructura organizada." },
                        { id: "TP7", title: "Landing page con Flexbox y Grid", desc: "Maquetar landing page combinando Flexbox y Grid." }
                    ].map((tp, idx) => (
                        <div key={idx} className="flex items-start gap-3">
                            <span className="flex-shrink-0 px-2 py-1 rounded bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300 text-xs font-bold">
                                {tp.id}
                            </span>
                            <div>
                                <strong className="text-zinc-800 dark:text-zinc-200">{tp.title}:</strong>
                                <span className="text-zinc-600 dark:text-zinc-400 ml-1">{tp.desc}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div>
                <h3 className="text-lg font-bold text-zinc-800 dark:text-zinc-200 mb-3 border-l-4 border-purple-500 pl-3">Fase 2: Trabajo con IA Generativa</h3>
                <p className="text-zinc-600 dark:text-zinc-400 mb-4 italic">
                    Una vez aprobado el primer parcial, se incorporan herramientas de IA Generativa. Cada TP incluye un Componente IA que requiere uso crítico.
                </p>
                <div className="space-y-4">
                     {[
                        { id: "TP8", title: "Introducción a IA Generativa", desc: "Exploración de asistentes de código. Componente IA: Generar estilos alternativos para TP7 y analizar resultados." },
                        { id: "TP9", title: "Diseño responsive mobile-first", desc: "Convertir TP7 a mobile-first. Componente IA: Generar media queries y comparar con solución propia." },
                        { id: "TP10", title: "Imágenes responsive y tipografía fluida", desc: "Optimización. Componente IA: Generar imágenes placeholder y paleta de colores." },
                        { id: "TP11", title: "Maquetado con framework CSS utility-first", desc: "Reconstruir TP7 con framework. Componente IA: Migrar sección de CSS puro a framework." },
                        { id: "TP12", title: "Framework avanzado + herramientas IA de UI", desc: "Prototipo institucional. Componente IA: Generar variante con herramienta de UI y comparar." },
                        { id: "TP13", title: "Auditoría de accesibilidad", desc: "Auditar y corregir sitio propio. Componente IA: Identificar problemas de accesibilidad con asistente." },
                        { id: "TP14", title: "Optimización SEO on-page", desc: "Optimizar SEO y performance. Componente IA: Generar meta descriptions y datos estructurados." }
                    ].map((tp, idx) => (
                        <div key={idx} className="flex items-start gap-3">
                            <span className="flex-shrink-0 px-2 py-1 rounded bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 text-xs font-bold">
                                {tp.id}
                            </span>
                            <div>
                                <strong className="text-zinc-800 dark:text-zinc-200">{tp.title}:</strong>
                                <span className="text-zinc-600 dark:text-zinc-400 ml-1">{tp.desc}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
          </div>
        </section>

        {/* V. CRONOGRAMA SEMANAL */}
        <section className="bg-white dark:bg-zinc-900 p-8 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-800">
          <h2 className="text-2xl font-bold mb-6 text-zinc-900 dark:text-white flex items-center gap-2 border-b border-zinc-100 dark:border-zinc-800 pb-4">
            <svg className="w-6 h-6 text-cyan-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            V. Cronograma Semanal
          </h2>
          
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm text-left">
              <thead className="bg-zinc-50 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 font-medium">
                <tr>
                  <th className="px-4 py-3">Semana</th>
                  <th className="px-4 py-3">Unidad</th>
                  <th className="px-4 py-3">Contenido Principal</th>
                  <th className="px-4 py-3">Actividad</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                <tr className="bg-orange-50/50 dark:bg-orange-900/10"><td colSpan={4} className="px-4 py-2 font-bold text-center text-orange-800 dark:text-orange-400">Fase 1: Trabajo manual (Semanas 1-7)</td></tr>
                {[
                  { s: 1, u: 1, c: "Internet vs. Web. Arquitectura. HTTP. DNS.", a: "TP1" },
                  { s: 2, u: 1, c: "HTML5: estructura, semántica. Validación.", a: "TP2" },
                  { s: 3, u: 2, c: "CSS: sintaxis, selectores, cascada.", a: "TP3" },
                  { s: 4, u: 2, c: "Modelo de caja. Unidades. Colores, tipografía.", a: "TP4" },
                  { s: 5, u: 3, c: "Formularios, tablas, multimedia.", a: "TP5" },
                  { s: 6, u: 3, c: "Metadatos, Open Graph. Sitios multipágina.", a: "TP6" },
                  { s: 7, u: 3, c: "Flexbox y CSS Grid.", a: "TP7" }
                ].map((row, i) => (
                  <tr key={`f1-${i}`} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                    <td className="px-4 py-2 text-center">{row.s}</td>
                    <td className="px-4 py-2 text-center">{row.u}</td>
                    <td className="px-4 py-2">{row.c}</td>
                    <td className="px-4 py-2 font-medium">{row.a}</td>
                  </tr>
                ))}
                
                <tr className="bg-zinc-100 dark:bg-zinc-800"><td colSpan={4} className="px-4 py-3 font-bold text-center">Primer parcial práctico (entre semana 7 y 8) (Sin IA)</td></tr>
                
                <tr className="bg-purple-50/50 dark:bg-purple-900/10"><td colSpan={4} className="px-4 py-2 font-bold text-center text-purple-800 dark:text-purple-400">Fase 2: Trabajo con IA Generativa (Semanas 8-15)</td></tr>
                {[
                  { s: 8, u: 4, c: "Intro IA Generativa. Prompt engineering.", a: "TP8" },
                  { s: 9, u: 4, c: "Diseño responsive. Mobile-first.", a: "TP9" },
                  { s: 10, u: 4, c: "Imágenes responsive, tipografía fluida.", a: "TP10" },
                  { s: 11, u: 5, c: "Frameworks CSS utility-first.", a: "TP11" },
                  { s: 12, u: 5, c: "Framework avanzado. Herramientas IA UI.", a: "TP12" },
                  { s: 13, u: 6, c: "Accesibilidad web: WCAG 2.1.", a: "TP13" },
                  { s: 14, u: 6, c: "SEO on-page. Core Web Vitals.", a: "TP14" },
                  { s: 15, u: 7, c: "Diseño moderno. Reflexión final.", a: "Proyecto Integrador" }
                ].map((row, i) => (
                  <tr key={`f2-${i}`} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                    <td className="px-4 py-2 text-center">{row.s}</td>
                    <td className="px-4 py-2 text-center">{row.u}</td>
                    <td className="px-4 py-2">{row.c}</td>
                    <td className="px-4 py-2 font-medium">{row.a}</td>
                  </tr>
                ))}
                <tr className="bg-zinc-100 dark:bg-zinc-800"><td colSpan={4} className="px-4 py-3 font-bold text-center">Segundo parcial: Defensa del proyecto integrador (Semana 15)</td></tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* VI. PROYECTO INTEGRADOR */}
        <section className="bg-white dark:bg-zinc-900 p-8 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-800">
          <h2 className="text-2xl font-bold mb-6 text-zinc-900 dark:text-white flex items-center gap-2 border-b border-zinc-100 dark:border-zinc-800 pb-4">
            <svg className="w-6 h-6 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
            VI. Proyecto Integrador
          </h2>
          <div className="text-zinc-700 dark:text-zinc-300 space-y-4">
            <p>Los estudiantes, en grupos de 2-3 integrantes, desarrollarán un sitio web estático completo (mínimo 4 páginas) para un cliente ficticio o real.</p>
            <div className="bg-teal-50 dark:bg-teal-900/10 p-4 rounded-lg">
                <h3 className="font-semibold mb-2 text-teal-800 dark:text-teal-400">Requisitos:</h3>
                <ul className="list-disc list-inside space-y-1 text-sm">
                    <li>Estructura HTML5 semántica y validada.</li>
                    <li>Diseño responsive mobile-first.</li>
                    <li>Uso de al menos un framework o librería CSS.</li>
                    <li>Cumplimiento de criterios básicos de accesibilidad (puntaje ≥ 80).</li>
                    <li>Optimización SEO on-page básica.</li>
                    <li>Documentación del proyecto y Bitácora de uso de IA.</li>
                    <li>Publicación en hosting gratuito (Netlify, Vercel, GitHub Pages).</li>
                </ul>
            </div>
          </div>
        </section>

        {/* VII. CONDICIONES DE APROBACIÓN */}
        <section className="bg-white dark:bg-zinc-900 p-8 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-800">
          <h2 className="text-2xl font-bold mb-6 text-zinc-900 dark:text-white flex items-center gap-2 border-b border-zinc-100 dark:border-zinc-800 pb-4">
            <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            VII. Condiciones de Regularización / Aprobación
          </h2>
          <div className="grid md:grid-cols-2 gap-6 text-zinc-700 dark:text-zinc-300">
            <div className="bg-green-50 dark:bg-green-900/10 border-l-4 border-green-500 p-4">
                <h3 className="font-bold text-green-800 dark:text-green-400 mb-2">Promoción</h3>
                <ul className="list-disc list-inside space-y-1 text-sm">
                    <li><strong>Trabajos Prácticos:</strong> Aprobar el 80% con nota mínima 7.</li>
                    <li><strong>Parcial:</strong> Aprobar con nota mínima 7.</li>
                    <li><strong>Proyecto Integrador:</strong> Aprobar con nota mínima 7.</li>
                    <li><strong>Asistencia:</strong> Mínimo 80% en clases prácticas.</li>
                </ul>
            </div>
            
            <div className="bg-yellow-50 dark:bg-yellow-900/10 border-l-4 border-yellow-500 p-4">
                <h3 className="font-bold text-yellow-800 dark:text-yellow-400 mb-2">Regularización</h3>
                <ul className="list-disc list-inside space-y-1 text-sm">
                    <li><strong>Trabajos Prácticos:</strong> Aprobar el 80% con nota mínima 4.</li>
                    <li><strong>Parcial:</strong> Aprobar con nota mínima 4.</li>
                    <li><strong>Proyecto Integrador:</strong> Aprobar con nota mínima 4.</li>
                    <li><strong>Asistencia:</strong> Mínimo 80% en clases prácticas.</li>
                </ul>
            </div>
          </div>
        </section>

        {/* VIII. RECURSOS NECESARIOS */}
        <section className="bg-white dark:bg-zinc-900 p-8 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-800">
          <h2 className="text-2xl font-bold mb-6 text-zinc-900 dark:text-white flex items-center gap-2 border-b border-zinc-100 dark:border-zinc-800 pb-4">
            <svg className="w-6 h-6 text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
            VIII. Recursos Necesarios
          </h2>
          <div className="space-y-4 text-zinc-700 dark:text-zinc-300">
             <p>El curso se llevará a cabo en laboratorios informáticos equipados con la infraestructura necesaria para el desarrollo web.</p>
             <div className="grid md:grid-cols-2 gap-6">
                <div>
                    <h3 className="font-bold mb-2">Herramientas y Software:</h3>
                    <ul className="list-disc list-inside text-sm space-y-1">
                        <li>Visual Studio Code</li>
                        <li>Google Chrome y Chrome DevTools</li>
                        <li>Tailwind CSS</li>
                        <li>MDN Web Docs</li>
                        <li>Google Lighthouse</li>
                        <li>Hosting gratuito (Netlify, Vercel, GitHub Pages)</li>
                    </ul>
                </div>
                <div>
                    <h3 className="font-bold mb-2">Materiales Digitales:</h3>
                    <ul className="list-disc list-inside text-sm space-y-1">
                        <li>Documentación oficial de HTML, CSS y Tailwind CSS.</li>
                        <li>Guías y tutoriales interactivos sobre accesibilidad web y SEO.</li>
                        <li>Ejemplos prácticos y plantillas.</li>
                    </ul>
                </div>
             </div>
          </div>
        </section>

      </div>
    </div>
  );
}
