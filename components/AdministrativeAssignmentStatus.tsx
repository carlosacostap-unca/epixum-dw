import { Delivery } from "@/types";

interface AdministrativeAssignmentStatusProps {
  delivery: Delivery | null;
}

export default function AdministrativeAssignmentStatus({ delivery }: AdministrativeAssignmentStatusProps) {
  const isApproved = delivery?.status === 'graded' && delivery?.verdict === 'Aprobado';

  return (
    <div className={`rounded-xl border p-6 ${
      isApproved
        ? "border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/30"
        : "border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30"
    }`}>
      <div className="flex items-start gap-4">
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${
          isApproved
            ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200"
            : "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-200"
        }`}>
          {isApproved ? (
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
          ) : (
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6l4 2m5-2a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
          )}
        </div>
        <div>
          <p className={`text-sm font-semibold uppercase tracking-wide ${
            isApproved
              ? "text-green-700 dark:text-green-300"
              : "text-amber-700 dark:text-amber-300"
          }`}>
            {isApproved ? "Aprobado" : "Pendiente de evaluacion"}
          </p>
          <h2 className="mt-1 text-xl font-bold text-zinc-950 dark:text-zinc-50">
            {isApproved ? "Este trabajo practico esta aprobado." : "Este trabajo practico esta pendiente de evaluacion."}
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-600 dark:text-zinc-300">
            No tenes que realizar una entrega desde esta pantalla. La catedra actualizara el estado cuando corresponda.
          </p>
        </div>
      </div>
    </div>
  );
}
