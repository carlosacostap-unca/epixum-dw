import { getAllAssignments, getAllDeliveries, getAllPartialExamSimulations, getStudents } from "@/lib/data";
import { getCurrentUser } from "@/lib/pocketbase-server";
import { Delivery, PartialExamSimulation, User } from "@/types";
import Link from "next/link";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

type CourseResult = "Promocionado" | "Regularizado" | "Libre";

type StudentCourseResult = {
  student: User;
  result: CourseResult;
  approvedAssignments: number;
  bestPartialExamGrade: number | null;
  approvedWebDesignModule: boolean;
};

const requiredApprovedAssignments = 9;
const promotionGrade = 7;
const passingGrade = 4;

const resultStyles: Record<CourseResult, string> = {
  Promocionado: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  Regularizado: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  Libre: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
};

function getStudentDisplayName(student: User) {
  return student.name || [student.firstName, student.lastName].filter(Boolean).join(" ") || student.email;
}

function getDeliveryForAssignment(deliveries: Delivery[], assignmentId: string) {
  return deliveries
    .filter((delivery) => delivery.status !== "draft")
    .filter((delivery) => delivery.assignment === assignmentId || delivery.expand?.assignment?.id === assignmentId)
    .sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime())[0];
}

function getSimulationGrade(simulation: PartialExamSimulation) {
  if (!simulation.totalQuestions) {
    return 0;
  }

  return Math.round((simulation.score / simulation.totalQuestions) * 100) / 10;
}

function formatGrade(value: number | null) {
  return value === null ? "Sin parcial" : value.toLocaleString("es-AR", { maximumFractionDigits: 1 });
}

function classifyStudent(student: User, approvedAssignments: number, bestPartialExamGrade: number | null): CourseResult {
  if (student.approvedWebDesignModule) {
    return "Promocionado";
  }

  const hasRequiredAssignments = approvedAssignments >= requiredApprovedAssignments;

  if (hasRequiredAssignments && bestPartialExamGrade !== null && bestPartialExamGrade >= promotionGrade) {
    return "Promocionado";
  }

  if (
    hasRequiredAssignments &&
    bestPartialExamGrade !== null &&
    bestPartialExamGrade >= passingGrade &&
    bestPartialExamGrade < promotionGrade
  ) {
    return "Regularizado";
  }

  return "Libre";
}

function buildStudentResults(
  students: User[],
  assignmentIds: string[],
  deliveries: Delivery[],
  simulations: PartialExamSimulation[],
) {
  return students
    .map<StudentCourseResult>((student) => {
      const studentDeliveries = deliveries.filter((delivery) => {
        const deliveryStudentId = delivery.student || delivery.expand?.student?.id;
        return deliveryStudentId === student.id;
      });

      const approvedAssignments = assignmentIds.filter((assignmentId) => {
        const delivery = getDeliveryForAssignment(studentDeliveries, assignmentId);
        return delivery?.status === "graded" && delivery.verdict === "Aprobado";
      }).length;

      const studentPartialExamGrades = simulations
        .filter((simulation) => simulation.student === student.id)
        .map(getSimulationGrade);
      const bestPartialExamGrade = studentPartialExamGrades.length > 0 ? Math.max(...studentPartialExamGrades) : null;

      return {
        student,
        approvedAssignments,
        bestPartialExamGrade,
        approvedWebDesignModule: Boolean(student.approvedWebDesignModule),
        result: classifyStudent(student, approvedAssignments, bestPartialExamGrade),
      };
    })
    .sort((a, b) =>
      getStudentDisplayName(a.student).localeCompare(getStudentDisplayName(b.student), "es", { sensitivity: "base" }),
    );
}

function ResultBadge({ result }: { result: CourseResult }) {
  return <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${resultStyles[result]}`}>{result}</span>;
}

function WebDesignModuleBadge({ approved }: { approved: boolean }) {
  const styles = approved
    ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
    : "bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300";

  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${styles}`}>
      {approved ? "Aprobado" : "Pendiente"}
    </span>
  );
}

function MetricCard({ label, value, detail, tone }: { label: string; value: string | number; detail: string; tone: string }) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">{label}</p>
        <span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${tone}`} />
      </div>
      <p className="mt-3 text-3xl font-bold text-zinc-900 dark:text-zinc-100">{value}</p>
      <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">{detail}</p>
    </div>
  );
}

function StudentRows({ results }: { results: StudentCourseResult[] }) {
  if (results.length === 0) {
    return (
      <tr>
        <td colSpan={7} className="px-5 py-8 text-center text-zinc-500 dark:text-zinc-400">
          No hay estudiantes en esta categoria.
        </td>
      </tr>
    );
  }

  return results.map((result) => (
    <tr key={result.student.id} className="group relative transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
      <td className="relative px-5 py-4">
        <Link
          href={`/students/${result.student.id}`}
          className="absolute inset-0 z-10"
          aria-label={`Ver detalle de ${getStudentDisplayName(result.student)}`}
        />
        <span className="font-medium text-blue-600 group-hover:underline dark:text-blue-400">
          {getStudentDisplayName(result.student)}
        </span>
      </td>
      <td className="relative px-5 py-4">{result.student.email}</td>
      <td className="relative px-5 py-4">{result.student.dni || "-"}</td>
      <td className="relative px-5 py-4">{result.student.enrollmentId || "-"}</td>
      <td className="relative px-5 py-4 font-medium text-zinc-950 dark:text-zinc-100">{result.approvedAssignments}</td>
      <td className="relative px-5 py-4">
        <WebDesignModuleBadge approved={result.approvedWebDesignModule} />
      </td>
      <td className="relative px-5 py-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium text-zinc-950 dark:text-zinc-100">{formatGrade(result.bestPartialExamGrade)}</span>
          <ResultBadge result={result.result} />
        </div>
      </td>
    </tr>
  ));
}

function ResultSection({
  title,
  description,
  results,
}: {
  title: string;
  description: string;
  results: StudentCourseResult[];
}) {
  return (
    <section className="overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex flex-col gap-3 border-b border-zinc-200 px-5 py-4 dark:border-zinc-800 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-zinc-950 dark:text-zinc-100">{title}</h2>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{description}</p>
        </div>
        <span className="text-sm font-medium text-zinc-500 dark:text-zinc-400">{results.length} estudiantes</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[860px] text-left text-sm text-zinc-600 dark:text-zinc-300">
          <thead className="bg-zinc-100 text-xs uppercase text-zinc-500 dark:bg-zinc-800/70 dark:text-zinc-400">
            <tr>
              <th className="px-5 py-3">Estudiante</th>
              <th className="px-5 py-3">Email</th>
              <th className="px-5 py-3">DNI</th>
              <th className="px-5 py-3">Matricula</th>
              <th className="px-5 py-3">TPs aprobados</th>
              <th className="px-5 py-3">Diseno Web</th>
              <th className="px-5 py-3">Mejor parcial</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
            <StudentRows results={results} />
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default async function ResultadosCursadaPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser || (currentUser.role !== "docente" && currentUser.role !== "admin")) {
    redirect("/");
  }

  const [students, assignments, deliveries, partialExamSimulations] = await Promise.all([
    getStudents(),
    getAllAssignments(),
    getAllDeliveries(),
    getAllPartialExamSimulations(),
  ]);

  const siuStudents = students.filter((student) => Boolean(student.enrolledInSiu));
  const studentResults = buildStudentResults(
    siuStudents,
    assignments.map((assignment) => assignment.id),
    deliveries,
    partialExamSimulations,
  );
  const promotedStudents = studentResults.filter((result) => result.result === "Promocionado");
  const regularizedStudents = studentResults.filter((result) => result.result === "Regularizado");
  const freeStudents = studentResults.filter((result) => result.result === "Libre");

  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-6 dark:bg-zinc-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6">
          <Link
            href="/"
            className="inline-flex items-center text-sm font-medium text-blue-600 transition-colors hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
          >
            Volver al panel
          </Link>
          <div className="mt-4">
            <h1 className="text-3xl font-bold text-zinc-950 dark:text-zinc-100">Resultados de Cursada</h1>
            <p className="mt-2 max-w-3xl text-zinc-500 dark:text-zinc-400">
              Clasificacion de estudiantes inscriptos en SIU segun trabajos practicos aprobados y mejor nota de parcial.
            </p>
          </div>
        </div>

        <section className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Inscriptos SIU" value={siuStudents.length} detail="Estudiantes considerados para el cierre" tone="bg-sky-500" />
          <MetricCard label="Promocionados" value={promotedStudents.length} detail="9+ TPs y parcial con 7 o mas, o modulo aprobado" tone="bg-green-500" />
          <MetricCard label="Regularizados" value={regularizedStudents.length} detail="9+ TPs y parcial entre 4 y 6.9" tone="bg-blue-500" />
          <MetricCard label="Libres" value={freeStudents.length} detail="Sin condiciones de promocion o regularidad" tone="bg-red-500" />
        </section>

        <div className="grid gap-5">
          <ResultSection
            title="Estudiantes promocionados"
            description="Parcial de mayor nota igual o mayor a 7 y al menos 9 trabajos practicos aprobados, o modulo de Diseno Web aprobado en la diplomatura."
            results={promotedStudents}
          />
          <ResultSection
            title="Estudiantes regularizados pero no promocionados"
            description="Parcial de mayor nota igual o mayor a 4 y menor a 7, con al menos 9 trabajos practicos aprobados."
            results={regularizedStudents}
          />
          <ResultSection
            title="Estudiantes libres"
            description="Estudiantes inscriptos en SIU que no ingresan en las categorias anteriores."
            results={freeStudents}
          />
        </div>
      </div>
    </main>
  );
}
