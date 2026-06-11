export interface BaseModel {
  id: string;
  created: string;
  updated: string;
  collectionId: string;
  collectionName: string;
}

export type UserRole = 'admin' | 'docente' | 'docente_invitado' | 'estudiante';

export interface User extends BaseModel {
  username: string;
  email: string;
  name: string;
  firstName?: string;
  lastName?: string;
  dni?: string;
  birthDate?: string;
  phone?: string;
  enrollmentId?: string;
  approvedWebDesignModule?: boolean;
  avatar?: string;
  role: UserRole;
}

export interface Team extends BaseModel {
  name: string;
  description?: string;
  expand?: {
    members?: TeamMember[];
  };
}

export interface TeamMember extends BaseModel {
  team: string;
  student: string;
  expand?: {
    team?: Team;
    student?: User;
  };
}

export type TeamValidationStatus =
  | 'correct'
  | 'wrong_team'
  | 'missing_member'
  | 'extra_member'
  | 'no_team'
  | 'other';

export interface TeamValidationResponse extends BaseModel {
  student: string;
  team?: string;
  status: TeamValidationStatus;
  details?: string;
  submittedAt: string;
  resolvedAt?: string;
  resolvedBy?: string;
  expand?: {
    student?: User;
    team?: Team;
    resolvedBy?: User;
  };
}

export interface FinalProjectPresentationSlot extends BaseModel {
  startsAt: string;
  endsAt: string;
  team?: string;
  reservedBy?: string;
  reservedAt?: string;
  reservation?: FinalProjectPresentationSlotReservation;
  expand?: {
    team?: Team;
    reservedBy?: User;
  };
}

export interface FinalProjectPresentationSlotReservation extends BaseModel {
  slot: string;
  team: string;
  reservedBy: string;
  reservedAt: string;
  expand?: {
    slot?: FinalProjectPresentationSlot;
    team?: Team;
    reservedBy?: User;
  };
}

export type FinalProjectTeamResourceKey =
  | 'agile_tp2'
  | 'agile_tp3'
  | 'ux_figma'
  | 'web_deployed_site';

export type FinalProjectTeamResourceKind = 'file' | 'url';

export interface FinalProjectTeamResource extends BaseModel {
  team: string;
  resourceKey: FinalProjectTeamResourceKey;
  moduleName: string;
  title: string;
  kind: FinalProjectTeamResourceKind;
  url?: string;
  file?: string;
  originalName?: string;
  submittedBy?: string;
  submittedAt?: string;
  expand?: {
    team?: Team;
    submittedBy?: User;
  };
}

export type FinalProjectMemberEvaluationRating =
  | 'excellent'
  | 'very_good'
  | 'good'
  | 'regular'
  | 'insufficient';

export interface FinalProjectMemberEvaluation extends BaseModel {
  slot: string;
  team: string;
  student: string;
  evaluatedBy: string;
  present: boolean;
  exposed: boolean;
  rating?: FinalProjectMemberEvaluationRating;
  notes?: string;
  evaluatedAt: string;
  expand?: {
    slot?: FinalProjectPresentationSlot;
    team?: Team;
    student?: User;
    evaluatedBy?: User;
  };
}

export interface Link extends BaseModel {
  title: string;
  url: string;
  type?: 'link' | 'file' | 'slide' | 'note' | 'study-guide';
  class?: string; // Relation to Class ID (optional, mutually exclusive with assignment)
  assignment?: string; // Relation to Assignment ID (optional, mutually exclusive with class)
}

export interface Class extends BaseModel {
  title: string;
  description: string;
  date: string;
  // Expanding relations
  expand?: {
    links?: Link[];
  };
}

export interface Question {
  id: string;
  text: string;
}

export type AssignmentType = 'file_upload' | 'questionnaire';

export interface Assignment extends BaseModel {
  title: string;
  description: string;
  dueDate?: string;
  correctionDueDate?: string;
  type?: AssignmentType;
  questions?: Question[];
  aiPrompt?: string;
  // Expanding relations
  expand?: {
    links?: Link[];
    deliveries?: Delivery[];
  };
}

export type PartialExamStatus = 'Planificado' | 'Publicado' | 'Finalizado';

export interface PartialExam extends BaseModel {
  title: string;
  description: string;
  startsAt?: string;
  endsAt?: string;
  questionBanks?: string[] | string;
  topics?: string;
  status?: PartialExamStatus;
  turns?: PartialExamTurn[];
  expand?: {
    questionBanks?: PartialExamUnit[];
  };
}

export interface PartialExamTurn extends BaseModel {
  partialExam: string;
  name: string;
  startsAt: string;
  endsAt: string;
  expand?: {
    partialExam?: PartialExam;
  };
}

export interface PartialExamUnit extends BaseModel {
  name: string;
  description?: string;
  order?: number;
}

export interface PartialExamUnitDocument extends BaseModel {
  unit: string;
  title: string;
  file: string;
  originalName?: string;
  expand?: {
    unit?: PartialExamUnit;
  };
}

export type QuestionDifficulty = 'Basica' | 'Intermedia' | 'Avanzada';
export type PartialExamQuestionKind =
  | 'Conceptual'
  | 'Detectar error en codigo'
  | 'Explicar fragmento de codigo'
  | 'Elegir codigo para necesidad';

export interface MultipleChoiceOption {
  id: string;
  text: string;
}

export interface PartialExamQuestion extends BaseModel {
  unit: string;
  document?: string;
  kind?: PartialExamQuestionKind;
  question: string;
  options: MultipleChoiceOption[];
  correctOptionId: string;
  explanation?: string;
  difficulty?: QuestionDifficulty;
  selected?: boolean;
  sourceReference?: string;
  expand?: {
    unit?: PartialExamUnit;
    document?: PartialExamUnitDocument;
  };
}

export type PartialExamSimulationFinishReason = 'manual' | 'time';
export type PartialExamAttemptStatus = 'in_progress' | 'submitted';

export interface PartialExamAttempt extends BaseModel {
  partialExam: string;
  turn?: string;
  student: string;
  questionIds: string[];
  answers: Record<string, string>;
  status: PartialExamAttemptStatus;
  startedAt: string;
  lastSavedAt: string;
  submittedAt?: string;
  finishReason?: PartialExamSimulationFinishReason;
  completedSimulation?: string;
  expand?: {
    partialExam?: PartialExam;
    turn?: PartialExamTurn;
    student?: User;
    completedSimulation?: PartialExamSimulation;
  };
}

export interface PartialExamSimulation extends BaseModel {
  partialExam: string;
  turn?: string;
  student: string;
  score: number;
  totalQuestions: number;
  answeredQuestions: number;
  questionIds: string[];
  answers: Record<string, string>;
  finishReason: PartialExamSimulationFinishReason;
  completedAt: string;
  scoreVisible?: boolean;
  expand?: {
    partialExam?: PartialExam;
    turn?: PartialExamTurn;
    student?: User;
  };
}

export interface Delivery extends BaseModel {
  assignment: string;
  student: string;
  repositoryUrl?: string; // Used for file upload URL
  content?: any; // Used for questionnaire answers
  status?: 'draft' | 'submitted' | 'graded';
  grade?: number;
  feedback?: string;
  aiGrade?: number;
  aiFeedback?: string;
  aiVerdict?: 'Aprobado' | 'Corregir y reenviar';
  verdict?: 'Aprobado' | 'Corregir y reenviar';
  history?: any[];
  latestFeedback?: DeliveryFeedback;
  feedbacks?: DeliveryFeedback[];
  expand?: {
    student?: User;
    assignment?: Assignment;
  };
}

export interface DeliveryFeedback extends BaseModel {
  delivery: string;
  assignment: string;
  student: string;
  teacher?: string;
  grade?: number;
  feedback?: string;
  verdict?: 'Aprobado' | 'Corregir y reenviar';
  aiGrade?: number;
  aiFeedback?: string;
  aiVerdict?: 'Aprobado' | 'Corregir y reenviar';
  sentAt: string;
  expand?: {
    delivery?: Delivery;
    assignment?: Assignment;
    student?: User;
    teacher?: User;
  };
}

export interface Course extends BaseModel {
  title: string;
  description: string;
}

export interface Inquiry extends BaseModel {
  title: string;
  description: string;
  status: 'Pendiente' | 'Resuelta';
  author: string; // Relation to User ID
  class?: string; // Relation to Class ID (optional)
  assignment?: string; // Relation to Assignment ID (optional)
  expand?: {
    author?: User;
    class?: Class;
    assignment?: Assignment;
  };
}

export interface InquiryResponse extends BaseModel {
  inquiry: string; // Relation to Inquiry ID
  author: string; // Relation to User ID
  content: string;
  expand?: {
    author?: User;
  };
}
