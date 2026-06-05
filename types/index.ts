export interface BaseModel {
  id: string;
  created: string;
  updated: string;
  collectionId: string;
  collectionName: string;
}

export type UserRole = 'admin' | 'docente' | 'estudiante';

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
  expand?: {
    questionBanks?: PartialExamUnit[];
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
    student?: User;
    completedSimulation?: PartialExamSimulation;
  };
}

export interface PartialExamSimulation extends BaseModel {
  partialExam: string;
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
