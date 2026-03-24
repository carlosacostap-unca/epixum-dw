"use client";

import { Delivery, Assignment } from "@/types";
import { useState } from "react";
import Link from "next/link";

interface TeacherDeliveriesProps {
  deliveries: Delivery[];
  assignment: Assignment;
}

export default function TeacherDeliveries({ deliveries, assignment }: TeacherDeliveriesProps) {
  const [searchTerm, setSearchTerm] = useState("");
  
  const pbUrl = process.env.NEXT_PUBLIC_POCKETBASE_URL?.replace(/\/$/, "") || "";

  const filteredDeliveries = deliveries.filter(delivery => {
    const student = delivery.expand?.student;
    const studentName = student?.name || "Estudiante desconocido";
    const studentEmail = student?.email || "Sin email";
    
    return studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
           studentEmail.toLowerCase().includes(searchTerm.toLowerCase());
  });

  return (
    <div className="bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 p-6">
      <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
        <span className="p-1 bg-blue-100 dark:bg-blue-900 rounded-md">
            <svg className="w-5 h-5 text-blue-600 dark:text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        </span>
        Entregas ({deliveries.length})
      </h2>

      {/* Search Input */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Buscar estudiante..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100"
        />
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-700">
          <thead className="bg-zinc-50 dark:bg-zinc-700">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-300 uppercase tracking-wider">
                Estudiante
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-300 uppercase tracking-wider">
                Estado
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-300 uppercase tracking-wider">
                Nota
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-300 uppercase tracking-wider">
                Veredicto
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-300 uppercase tracking-wider">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-zinc-800 divide-y divide-zinc-200 dark:divide-zinc-700">
            {filteredDeliveries.length > 0 ? (
              filteredDeliveries.map((delivery) => {
                const student = delivery.expand?.student;
                const studentName = student?.name || "Estudiante desconocido";
                
                return (
                <tr key={delivery.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-8 w-8 rounded-full bg-zinc-200 dark:bg-zinc-600 flex items-center justify-center text-zinc-500 dark:text-zinc-300 overflow-hidden">
                         {student?.avatar ? (
                            <img 
                              src={`${pbUrl}/api/files/${student.collectionId}/${student.id}/${student.avatar}`} 
                              alt={studentName} 
                              className="h-full w-full object-cover" 
                            />
                         ) : (
                            <span className="font-bold text-xs">
                                {studentName.charAt(0) || "?"}
                            </span>
                         )}
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                          {studentName}
                        </div>
                        <div className="text-xs text-zinc-500 dark:text-zinc-400">
                            {new Date(delivery.created).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                        ${delivery.status === 'graded' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 
                          delivery.status === 'submitted' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' : 
                          'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'}`}>
                        {delivery.status === 'graded' ? 'Calificado' : 
                         delivery.status === 'submitted' ? 'Entregado' : 'Borrador'}
                      </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-500 dark:text-zinc-400">
                    {delivery.grade !== undefined && delivery.grade !== null ? delivery.grade : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-500 dark:text-zinc-400">
                    {delivery.verdict ? (
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            delivery.verdict === 'Aprobado' 
                                ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300' 
                                : 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300'
                        }`}>
                            {delivery.verdict}
                        </span>
                    ) : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <Link 
                        href={`/deliveries/${delivery.id}`}
                        className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300"
                    >
                        Ver / Calificar
                    </Link>
                  </td>
                </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={5} className="px-6 py-4 text-center text-sm text-zinc-500 dark:text-zinc-400">
                  No hay entregas registradas
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}