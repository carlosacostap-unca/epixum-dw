import { FinalProjectTeamResourceKey, FinalProjectTeamResourceKind } from "@/types";

export interface FinalProjectResourceDefinition {
  key: FinalProjectTeamResourceKey;
  moduleName: string;
  title: string;
  kind: FinalProjectTeamResourceKind;
  accept?: string;
}

export const FINAL_PROJECT_RESOURCE_DEFINITIONS: FinalProjectResourceDefinition[] = [
  {
    key: "agile_tp2",
    moduleName: "Introducción al Desarrollo Ágil de Software",
    title: "Trabajo Práctico 2",
    kind: "file",
    accept: ".pdf,.doc,.docx,.zip,.rar,.7z,application/pdf,application/zip,application/x-rar-compressed,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword",
  },
  {
    key: "agile_tp3",
    moduleName: "Introducción al Desarrollo Ágil de Software",
    title: "Trabajo Práctico 3",
    kind: "file",
    accept: ".pdf,.doc,.docx,.zip,.rar,.7z,application/pdf,application/zip,application/x-rar-compressed,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword",
  },
  {
    key: "ux_figma",
    moduleName: "Diseño de Interfaces y Experiencias de Usuario",
    title: "Diseño en Figma",
    kind: "url",
  },
  {
    key: "web_deployed_site",
    moduleName: "Diseño Web",
    title: "Sitio Web Desplegado",
    kind: "url",
  },
];

export function getFinalProjectResourceDefinition(key: string) {
  return FINAL_PROJECT_RESOURCE_DEFINITIONS.find((definition) => definition.key === key) || null;
}
