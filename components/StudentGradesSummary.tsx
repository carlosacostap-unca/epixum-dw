import { getDeliveryLimitDate } from "@/lib/delivery-deadlines";
import { Assignment, Delivery, PartialExam, PartialExamSimulation } from "@/types";
import Link from "next/link";

interface StudentGradesSummaryProps {
  deliveries: Delivery[];
  assignments: Assignment[];
  partialExams?: PartialExam[];
  partialExamResults?: Map<string, PartialExamSimulation>;
  userEmail?: string;
}

export default function StudentGradesSummary({
  deliveries,
  assignments,
  partialExams = [],
  partialExamResults = new Map(),
  userEmail,
}: StudentGradesSummaryProps) {
  if ((!assignments || assignments.length === 0) && partialExams.length === 0) {
    return null;
  }

  const activeDeliveries = deliveries.filter((delivery) => delivery.status !== "draft");
  const isSpecialStudent = userEmail === "carlosacostap@sfvc.edu.ar";

  return (
    <div className="max-w-4xl mx-auto mt-8 mb-12">
      <details className="group overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-4 bg-zinc-50 p-6 dark:bg-zinc-800/50">
          <h2 className="flex items-center gap-2 text-xl font-bold text-zinc-900 dark:text-white">
            <svg className="h-5 w-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
            Resumen de Evaluaciones
          </h2>
          <span className="flex h-8 w-8 items-center justify-center rounded-full border border-zinc-300 text-zinc-600 transition-colors group-open:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:group-open:bg-zinc-800" aria-hidden="true">
            <svg className="h-4 w-4 group-open:hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
            <svg className="hidden h-4 w-4 group-open:block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
            </svg>
          </span>
        </summary>

        <div className="overflow-x-auto border-t border-zinc-200 dark:border-zinc-800">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-50/50 text-zinc-500 dark:bg-zinc-800/30 dark:text-zinc-400">
              <tr>
                <th className="px-6 py-4 font-medium">Evaluación</th>
                <th className="px-6 py-4 font-medium">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {partialExams.map((partialExam) => {
                const result = partialExamResults.get(partialExam.id);
                let statusLabel = "Sin realizar";
                let statusColor = "bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-400";

                if (result) {
                  if (result.scoreVisible) {
                    statusLabel = `Nota: ${result.score}/${result.totalQuestions}`;
                    statusColor = "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
                  } else {
                    statusLabel = "Parcial enviado. Nota pendiente de publicación";
                    statusColor = "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400";
                  }
                }

                return (
                  <tr key={`partial-${partialExam.id}`} className="transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                    <td className="px-6 py-4">
                      <Link
                        href={result?.scoreVisible ? `/parciales/${partialExam.id}/devolucion` : "/parciales"}
                        className="font-medium text-blue-600 hover:underline dark:text-blue-400"
                      >
                        Parcial
                      </Link>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusColor}`}>{statusLabel}</span>
                    </td>
                  </tr>
                );
              })}

              {assignments.map((assignment) => {
                const delivery = activeDeliveries.find(
                  (item) => item.assignment === assignment.id || item.expand?.assignment?.id === assignment.id
                );
                const limitDate = getDeliveryLimitDate(assignment, delivery);
                const isPastDue = isSpecialStudent ? false : Boolean(limitDate && limitDate < new Date());

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
                } else if (delivery.status === "graded") {
                  if (delivery.verdict === "Aprobado") {
                    statusLabel = "Aprobado";
                    statusColor = "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
                  } else if (delivery.verdict === "Corregir y reenviar") {
                    if (isPastDue) {
                      statusLabel = "Corregir y reenviar y vencido";
                      statusColor = "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
                    } else {
                      statusLabel = "Corregir y reenviar y por vencer";
                      statusColor = "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400";
                    }
                  } else {
                    statusLabel = delivery.verdict || "Evaluado";
                    statusColor = "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
                  }
                } else {
                  statusLabel = "Entregado";
                  statusColor = "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400";
                }

                return (
                  <tr key={assignment.id} className="transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                    <td className="px-6 py-4">
                      <Link href={`/assignments/${assignment.id}`} className="font-medium text-blue-600 hover:underline dark:text-blue-400">
                        {assignment.title}
                      </Link>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusColor}`}>{statusLabel}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
