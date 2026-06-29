import FinalCourseResultControls from "@/components/FinalCourseResultControls";
import ExternalSiuStudentForm from "@/components/ExternalSiuStudentForm";
import { deleteExternalSiuStudent } from "@/lib/actions";
import {
  getAllAssignments,
  getAllDeliveries,
  getAllFinalProjectMemberEvaluations,
  getAllPartialExamSimulations,
  getExternalSiuStudents,
  getStudents,
} from "@/lib/data";
import { getCurrentUser } from "@/lib/pocketbase-server";
import {
  Delivery,
  ExternalSiuStudent,
  FinalCourseStatus,
  FinalProjectMemberEvaluation,
  FinalProjectMemberEvaluationRating,
  PartialExamSimulation,
  User,
} from "@/types";
import Link from "next/link";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

type ResultSource = "platform" | "external-siu";
type ResultViewMode = "siu" | "estado-final";
type ResultSearchParams = {
  vista?: string;
  q?: string;
  siu?: string;
  origen?: string;
  estado?: string;
};
type ResultFilters = {
  query: string;
  siu: "all" | "yes" | "no";
  source: "all" | ResultSource;
  finalStatus: "all" | FinalCourseStatus | "sin-asignar";
};

type StudentCourseResult = {
  id: string;
  displayName: string;
  email?: string;
  dni?: string;
  enrollmentId?: string;
  enrolledInSiu: boolean;
  source: ResultSource;
  detailHref?: string;
  approvedAssignments: number;
  bestPartialExamGrade: number | null;
  approvedWebDesignModule: boolean;
  finalProjectEvaluation: FinalProjectMemberEvaluation | null;
  finalCourseStatus?: FinalCourseStatus;
  finalCourseGrade?: number;
  notes?: string;
};

const finalCourseStatuses: FinalCourseStatus[] = ["Promociona", "Regulariza", "En carrera", "Libre"];

const finalProjectRatingLabels: Record<FinalProjectMemberEvaluationRating, string> = {
  excellent: "Excelente",
  very_good: "Muy buena",
  good: "Buena",
  regular: "Regular",
  insufficient: "Insuficiente",
};

async function deleteExternalSiuStudentFormAction(formData: FormData) {
  "use server";
  await deleteExternalSiuStudent(formData);
}

function getSearchParamValue(value?: string | string[]) {
  return Array.isArray(value) ? value[0] || "" : value || "";
}

function normalizeMatchValue(value?: string) {
  return String(value || "").trim().toLowerCase();
}

function getResultFilters(searchParams?: ResultSearchParams): ResultFilters {
  const siu = getSearchParamValue(searchParams?.siu);
  const source = getSearchParamValue(searchParams?.origen);
  const finalStatus = getSearchParamValue(searchParams?.estado);

  return {
    query: getSearchParamValue(searchParams?.q).trim(),
    siu: siu === "yes" || siu === "no" ? siu : "all",
    source: source === "platform" || source === "external-siu" ? source : "all",
    finalStatus: finalStatus === "sin-asignar" || finalCourseStatuses.includes(finalStatus as FinalCourseStatus)
      ? finalStatus as ResultFilters["finalStatus"]
      : "all",
  };
}

function hasActiveFilters(filters: ResultFilters) {
  return Boolean(filters.query || filters.siu !== "all" || filters.source !== "all" || filters.finalStatus !== "all");
}

function matchesResultFilters(result: StudentCourseResult, filters: ResultFilters) {
  const query = normalizeMatchValue(filters.query);
  const queryMatches = !query || [
    result.displayName,
    result.email,
    result.dni,
    result.enrollmentId,
    result.notes,
  ].some((value) => normalizeMatchValue(value).includes(query));

  if (!queryMatches) {
    return false;
  }

  if (filters.siu === "yes" && !result.enrolledInSiu) {
    return false;
  }

  if (filters.siu === "no" && result.enrolledInSiu) {
    return false;
  }

  if (filters.source !== "all" && result.source !== filters.source) {
    return false;
  }

  if (filters.finalStatus === "sin-asignar" && result.finalCourseStatus) {
    return false;
  }

  if (filters.finalStatus !== "all" && filters.finalStatus !== "sin-asignar" && result.finalCourseStatus !== filters.finalStatus) {
    return false;
  }

  return true;
}

function getResultViewHref(view: ResultViewMode, filters: ResultFilters) {
  const params = new URLSearchParams();
  if (view === "estado-final") {
    params.set("vista", "estado-final");
  }

  if (filters.query) {
    params.set("q", filters.query);
  }

  if (filters.siu !== "all") {
    params.set("siu", filters.siu);
  }

  if (filters.source !== "all") {
    params.set("origen", filters.source);
  }

  if (filters.finalStatus !== "all") {
    params.set("estado", filters.finalStatus);
  }

  const queryString = params.toString();
  return queryString ? `/resultados-cursada?${queryString}` : "/resultados-cursada";
}

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

function getLatestFinalProjectEvaluations(evaluations: FinalProjectMemberEvaluation[]) {
  const latestByStudent = new Map<string, FinalProjectMemberEvaluation>();

  for (const evaluation of evaluations) {
    const current = latestByStudent.get(evaluation.student);
    if (!current || new Date(evaluation.evaluatedAt).getTime() > new Date(current.evaluatedAt).getTime()) {
      latestByStudent.set(evaluation.student, evaluation);
    }
  }

  return latestByStudent;
}

function formatFinalProjectEvaluation(evaluation: FinalProjectMemberEvaluation | null) {
  if (!evaluation) {
    return "Sin evaluar";
  }

  const attendance = evaluation.present ? "Presente" : "Ausente";
  const exposure = evaluation.exposed ? "Expuso" : "No expuso";
  const rating = evaluation.rating ? finalProjectRatingLabels[evaluation.rating] : "Sin calificacion";

  return `${rating} · ${attendance} · ${exposure}`;
}

function hasMatchingPlatformStudent(externalStudent: ExternalSiuStudent, platformStudents: User[]) {
  const externalEmail = normalizeMatchValue(externalStudent.email);
  const externalDni = normalizeMatchValue(externalStudent.dni);
  const externalEnrollmentId = normalizeMatchValue(externalStudent.enrollmentId);

  return platformStudents.some((student) => {
    const emailMatches = externalEmail && normalizeMatchValue(student.email) === externalEmail;
    const dniMatches = externalDni && normalizeMatchValue(student.dni) === externalDni;
    const enrollmentMatches = externalEnrollmentId && normalizeMatchValue(student.enrollmentId) === externalEnrollmentId;

    return emailMatches || dniMatches || enrollmentMatches;
  });
}

function buildPlatformStudentResults(
  students: User[],
  assignmentIds: string[],
  deliveries: Delivery[],
  simulations: PartialExamSimulation[],
  finalProjectEvaluationsByStudent: Map<string, FinalProjectMemberEvaluation>,
) {
  return students.map<StudentCourseResult>((student) => {
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
      id: student.id,
      displayName: getStudentDisplayName(student),
      email: student.email,
      dni: student.dni,
      enrollmentId: student.enrollmentId,
      enrolledInSiu: Boolean(student.enrolledInSiu),
      approvedAssignments,
      bestPartialExamGrade,
      approvedWebDesignModule: Boolean(student.approvedWebDesignModule),
      finalProjectEvaluation: finalProjectEvaluationsByStudent.get(student.id) || null,
      finalCourseStatus: student.finalCourseStatus,
      finalCourseGrade: student.finalCourseGrade,
      source: "platform",
      detailHref: `/students/${student.id}`,
    };
  });
}

function buildExternalStudentResults(externalStudents: ExternalSiuStudent[], platformStudents: User[]) {
  return externalStudents
    .filter((student) => !hasMatchingPlatformStudent(student, platformStudents))
    .map<StudentCourseResult>((student) => ({
      id: student.id,
      displayName: student.fullName,
      email: student.email,
      dni: student.dni,
      enrollmentId: student.enrollmentId,
      enrolledInSiu: true,
      approvedAssignments: 0,
      bestPartialExamGrade: null,
      approvedWebDesignModule: false,
      finalProjectEvaluation: null,
      finalCourseStatus: student.finalCourseStatus,
      finalCourseGrade: student.finalCourseGrade,
      source: "external-siu",
      notes: student.notes,
    }));
}

function sortStudentResults(results: StudentCourseResult[]) {
  return [...results].sort((a, b) =>
    a.displayName.localeCompare(b.displayName, "es", { sensitivity: "base" }),
  );
}

function getResultsByFinalStatus(results: StudentCourseResult[], status?: FinalCourseStatus) {
  return results.filter((result) => {
    if (!status) {
      return !result.finalCourseStatus;
    }

    return result.finalCourseStatus === status;
  });
}

function SourceBadge({ source }: { source: ResultSource }) {
  const styles = source === "platform"
    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300"
    : "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300";

  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${styles}`}>
      {source === "platform" ? "Usuario plataforma" : "SIU sin usuario"}
    </span>
  );
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

function SiuEnrollmentBadge({ enrolled }: { enrolled: boolean }) {
  const styles = enrolled
    ? "bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300"
    : "bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300";

  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${styles}`}>
      {enrolled ? "Si" : "No"}
    </span>
  );
}

function ResultFilterPanel({
  activeView,
  filters,
  totalCount,
  filteredCount,
}: {
  activeView: ResultViewMode;
  filters: ResultFilters;
  totalCount: number;
  filteredCount: number;
}) {
  const hasFilters = hasActiveFilters(filters);

  return (
    <section className="mb-6 rounded-lg border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-zinc-950 dark:text-zinc-100">Filtrar estudiantes</h2>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            {filteredCount} de {totalCount} estudiantes visibles
          </p>
        </div>
        {hasFilters && (
          <Link
            href={getResultViewHref(activeView, { query: "", siu: "all", source: "all", finalStatus: "all" })}
            className="w-fit rounded-lg border border-zinc-300 px-3 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            Limpiar filtros
          </Link>
        )}
      </div>
      <form action="/resultados-cursada" className="grid gap-4 lg:grid-cols-[minmax(220px,1.4fr)_repeat(3,minmax(160px,1fr))_auto] lg:items-end">
        {activeView === "estado-final" && <input type="hidden" name="vista" value="estado-final" />}
        <label className="grid gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-200">
          Buscar
          <input
            name="q"
            defaultValue={filters.query}
            placeholder="Nombre, email, DNI o matricula"
            className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 dark:border-zinc-700 dark:bg-zinc-950"
          />
        </label>
        <label className="grid gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-200">
          Inscripto SIU
          <select
            name="siu"
            defaultValue={filters.siu}
            className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 dark:border-zinc-700 dark:bg-zinc-950"
          >
            <option value="all">Todos</option>
            <option value="yes">Si</option>
            <option value="no">No</option>
          </select>
        </label>
        <label className="grid gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-200">
          Origen
          <select
            name="origen"
            defaultValue={filters.source}
            className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 dark:border-zinc-700 dark:bg-zinc-950"
          >
            <option value="all">Todos</option>
            <option value="platform">Usuario plataforma</option>
            <option value="external-siu">SIU sin usuario</option>
          </select>
        </label>
        <label className="grid gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-200">
          Estado final
          <select
            name="estado"
            defaultValue={filters.finalStatus}
            className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 dark:border-zinc-700 dark:bg-zinc-950"
          >
            <option value="all">Todos</option>
            {finalCourseStatuses.map((status) => (
              <option key={status} value={status}>{status}</option>
            ))}
            <option value="sin-asignar">Sin asignar</option>
          </select>
        </label>
        <button
          type="submit"
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
        >
          Filtrar
        </button>
      </form>
    </section>
  );
}

function ResultViewSwitch({ activeView, filters }: { activeView: ResultViewMode; filters: ResultFilters }) {
  const options: { value: ResultViewMode; label: string; href: string }[] = [
    { value: "siu", label: "Por SIU", href: getResultViewHref("siu", filters) },
    { value: "estado-final", label: "Por estado final", href: getResultViewHref("estado-final", filters) },
  ];

  return (
    <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Vista</h2>
      <div className="inline-flex w-fit rounded-lg border border-zinc-200 bg-white p-1 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        {options.map((option) => {
          const isActive = activeView === option.value;

          return (
            <Link
              key={option.value}
              href={option.href}
              className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-blue-600 text-white"
                  : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
              }`}
            >
              {option.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function StudentRows({ results }: { results: StudentCourseResult[] }) {
  if (results.length === 0) {
    return (
      <tr>
        <td colSpan={11} className="px-5 py-8 text-center text-zinc-500 dark:text-zinc-400">
          No hay estudiantes en esta categoria.
        </td>
      </tr>
    );
  }

  return results.map((result) => (
    <tr key={`${result.source}-${result.id}`} className="group relative transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
      <td className="relative px-5 py-4">
        {result.detailHref && (
          <Link
            href={result.detailHref}
            className="absolute inset-0 z-10"
            aria-label={`Ver detalle de ${result.displayName}`}
          />
        )}
        <span className={result.detailHref ? "font-medium text-blue-600 group-hover:underline dark:text-blue-400" : "font-medium text-zinc-950 dark:text-zinc-100"}>
          {result.displayName}
        </span>
        {result.notes && <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-500">{result.notes}</p>}
      </td>
      <td className="relative px-5 py-4">
        <SourceBadge source={result.source} />
      </td>
      <td className="relative px-5 py-4">
        <SiuEnrollmentBadge enrolled={result.enrolledInSiu} />
      </td>
      <td className="relative px-5 py-4">{result.email || "-"}</td>
      <td className="relative px-5 py-4">{result.enrollmentId || "-"}</td>
      <td className="relative px-5 py-4">
        <WebDesignModuleBadge approved={result.approvedWebDesignModule} />
      </td>
      <td className="relative px-5 py-4 font-medium text-zinc-950 dark:text-zinc-100">{result.approvedAssignments}</td>
      <td className="relative px-5 py-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium text-zinc-950 dark:text-zinc-100">{formatGrade(result.bestPartialExamGrade)}</span>
          {result.source === "external-siu" && (
            <form action={deleteExternalSiuStudentFormAction} className="relative z-20">
              <input type="hidden" name="externalStudentId" value={result.id} />
              <button
                type="submit"
                className="rounded-md border border-red-200 px-2.5 py-1 text-xs font-medium text-red-700 transition-colors hover:bg-red-50 dark:border-red-900 dark:text-red-200 dark:hover:bg-red-950/40"
              >
                Quitar
              </button>
            </form>
          )}
        </div>
      </td>
      <td className="relative px-5 py-4">{formatFinalProjectEvaluation(result.finalProjectEvaluation)}</td>
      <td className="relative px-5 py-4">
        <FinalCourseResultControls
          field="status"
          source={result.source}
          studentId={result.id}
          studentName={result.displayName}
          initialStatus={result.finalCourseStatus}
          initialGrade={result.finalCourseGrade}
        />
      </td>
      <td className="relative px-5 py-4">
        <FinalCourseResultControls
          field="grade"
          source={result.source}
          studentId={result.id}
          studentName={result.displayName}
          initialStatus={result.finalCourseStatus}
          initialGrade={result.finalCourseGrade}
        />
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
        <table className="w-full min-w-[1420px] text-left text-sm text-zinc-600 dark:text-zinc-300">
          <thead className="bg-zinc-100 text-xs uppercase text-zinc-500 dark:bg-zinc-800/70 dark:text-zinc-400">
            <tr>
              <th className="px-5 py-3">Estudiante</th>
              <th className="px-5 py-3">Origen</th>
              <th className="px-5 py-3">Inscripto SIU</th>
              <th className="px-5 py-3">Email</th>
              <th className="px-5 py-3">Matricula</th>
              <th className="px-5 py-3">Equiv. Diplom.</th>
              <th className="px-5 py-3">TPs aprobados</th>
              <th className="px-5 py-3">Mejor parcial</th>
              <th className="px-5 py-3">Coloquio</th>
              <th className="px-5 py-3">Estado final</th>
              <th className="px-5 py-3">Nota final</th>
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

export default async function ResultadosCursadaPage({
  searchParams,
}: {
  searchParams?: Promise<ResultSearchParams>;
}) {
  const currentUser = await getCurrentUser();
  if (!currentUser || (currentUser.role !== "docente" && currentUser.role !== "admin")) {
    redirect("/");
  }

  const resolvedSearchParams = await searchParams;
  const viewMode: ResultViewMode = resolvedSearchParams?.vista === "estado-final" ? "estado-final" : "siu";
  const filters = getResultFilters(resolvedSearchParams);

  const [students, assignments, deliveries, partialExamSimulations, externalSiuStudents, finalProjectEvaluations] = await Promise.all([
    getStudents(),
    getAllAssignments(),
    getAllDeliveries(),
    getAllPartialExamSimulations(),
    getExternalSiuStudents(),
    getAllFinalProjectMemberEvaluations(),
  ]);
  const finalProjectEvaluationsByStudent = getLatestFinalProjectEvaluations(finalProjectEvaluations);

  const platformResults = buildPlatformStudentResults(
    students,
    assignments.map((assignment) => assignment.id),
    deliveries,
    partialExamSimulations,
    finalProjectEvaluationsByStudent,
  );
  const externalResults = buildExternalStudentResults(externalSiuStudents, students);
  const studentResults = sortStudentResults([...platformResults, ...externalResults]);
  const filteredStudentResults = studentResults.filter((result) => matchesResultFilters(result, filters));
  const siuStudents = filteredStudentResults.filter((result) => result.enrolledInSiu);
  const nonSiuStudents = filteredStudentResults.filter((result) => !result.enrolledInSiu);
  const totalSiuStudents = studentResults.filter((result) => result.enrolledInSiu);
  const externalSiuStudentCount = totalSiuStudents.filter((result) => result.source === "external-siu").length;
  const finalStatusSections = [
    ...finalCourseStatuses.map((status) => ({
      title: `Estado final: ${status}`,
      description: `Estudiantes con estado final ${status}.`,
      results: getResultsByFinalStatus(filteredStudentResults, status),
    })),
    {
      title: "Estado final: Sin asignar",
      description: "Estudiantes que todavia no tienen estado final cargado.",
      results: getResultsByFinalStatus(filteredStudentResults),
    },
  ];

  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-6 dark:bg-zinc-950 sm:px-6 lg:px-8">
      <div className="w-full">
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
              Clasificacion de todos los estudiantes, separados por inscripcion SIU y diferenciando usuarios de plataforma de registros SIU sin acceso.
            </p>
          </div>
        </div>

        <ExternalSiuStudentForm />

        <section className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <MetricCard label="Total alumnos" value={studentResults.length} detail="Usuarios y registros SIU externos" tone="bg-zinc-500" />
          <MetricCard label="Inscriptos SIU" value={totalSiuStudents.length} detail="Con usuario o cargados como externos" tone="bg-sky-500" />
          <MetricCard label="No inscriptos SIU" value={studentResults.length - totalSiuStudents.length} detail="Usuarios estudiantes sin marca SIU" tone="bg-red-500" />
          <MetricCard label="SIU sin usuario" value={externalSiuStudentCount} detail="Cargados manualmente como libres" tone="bg-amber-500" />
          <MetricCard label="Usuarios plataforma" value={students.length} detail="Estudiantes registrados en la app" tone="bg-emerald-500" />
        </section>

        <ResultFilterPanel
          activeView={viewMode}
          filters={filters}
          totalCount={studentResults.length}
          filteredCount={filteredStudentResults.length}
        />

        <ResultViewSwitch activeView={viewMode} filters={filters} />

        {viewMode === "siu" ? (
          <div className="grid gap-5">
            <ResultSection
              title="Alumnos inscriptos en el SIU"
              description="Incluye usuarios estudiantes marcados como inscriptos y registros SIU sin usuario cargados manualmente."
              results={siuStudents}
            />
            <ResultSection
              title="Alumnos no inscriptos en el SIU"
              description="Usuarios estudiantes de la plataforma que no tienen marcada la inscripcion en SIU."
              results={nonSiuStudents}
            />
          </div>
        ) : (
          <div className="grid gap-5">
            {finalStatusSections.map((section) => (
              <ResultSection
                key={section.title}
                title={section.title}
                description={section.description}
                results={section.results}
              />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
