import { Delivery, Assignment } from "@/types";
import Link from "next/link";

interface StudentGradesSummaryProps {
  deliveries: Delivery[];
  assignments: Assignment[];
  userEmail?: string;
}

export default function StudentGradesSummary({ deliveries, assignments, userEmail }: StudentGradesSummaryProps) {
  // We want to list all assignments for the student to show their status
  if (!assignments || assignments.length === 0) {
    return null;
  }

  // Only consider submitted or graded deliveries
  const activeDeliveries = deliveries.filter(d => d.status !== 'draft');

  const isSpecialStudent = userEmail === 'carlosacostap@sfvc.edu.ar';

  return (
    <div className="max-w-4xl mx-auto mt-8 mb-12">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-800 overflow-hidden">
        <div className="p-6 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 flex justify-between items-center flex-wrap gap-4">
          <h2 className="text-xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
            <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
            Resumen de Evaluaciones
          </h2>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-50/50 dark:bg-zinc-800/30 text-zinc-500 dark:text-zinc-400">
              <tr>
                <th className="px-6 py-4 font-medium">Trabajo Práctico</th>
                <th className="px-6 py-4 font-medium">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {assignments.map((assignment) => {
                // Find active delivery for this assignment
                const delivery = activeDeliveries.find(d => d.assignment === assignment.id || d.expand?.assignment?.id === assignment.id);
                
                // Calculate due date logic
                const isCorrection = delivery?.verdict === 'Corregir y reenviar';
                let limitDate = assignment.dueDate ? new Date(assignment.dueDate) : null;
                if (isCorrection && assignment.correctionDueDate) {
                  limitDate = new Date(assignment.correctionDueDate);
                }
                const isPastDue = isSpecialStudent ? false : (limitDate ? limitDate < new Date() : false);

                let statusLabel = "";
                let statusColor = "";

                if (!delivery) {
                  if (isPastDue) {
                    statusLabel = "No entregado y vencido";
                    statusColor = "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
                  } else {
                    statusLabel = "No entregado y por vencer";
                    statusColor = "bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-400";
                  }
                } else if (delivery.status === 'graded') {
                  if (delivery.verdict === 'Aprobado') {
                    statusLabel = "Aprobado";
                    statusColor = "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
                  } else if (delivery.verdict === 'Corregir y reenviar') {
                    if (isPastDue) {
                      statusLabel = "Corregir y reenviar y vencido";
                      statusColor = "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
                    } else {
                      statusLabel = "Corregir y reenviar y por vencer";
                      statusColor = "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400";
                    }
                  } else {
                    // Fallback for other verdicts like 'Desaprobado'
                    statusLabel = delivery.verdict || "Evaluado";
                    statusColor = "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
                  }
                } else {
                  statusLabel = "Entregado";
                  statusColor = "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400";
                }

                return (
                  <tr key={assignment.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                    <td className="px-6 py-4">
                      <Link href={`/assignments/${assignment.id}`} className="font-medium text-blue-600 dark:text-blue-400 hover:underline">
                        {assignment.title}
                      </Link>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusColor}`}>
                        {statusLabel}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}