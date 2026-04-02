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
  type?: AssignmentType;
  questions?: Question[];
  aiPrompt?: string;
  // Expanding relations
  expand?: {
    links?: Link[];
    deliveries?: Delivery[];
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
  expand?: {
    student?: User;
    assignment?: Assignment;
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
