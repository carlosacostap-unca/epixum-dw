import { UserRole } from "@/types";

export function isTeacherRole(role?: unknown) {
  return role === "docente" || role === "admin";
}

export function isFinalProjectEvaluatorRole(role?: unknown) {
  return role === "docente" || role === "admin" || role === "docente_invitado";
}

export function getRoleLabel(role?: UserRole | string) {
  if (role === "admin") return "Administrador";
  if (role === "docente") return "Docente";
  if (role === "docente_invitado") return "Docente Invitado";
  if (role === "estudiante") return "Estudiante";
  return "Estudiante";
}
