// Types for the Content Creation Platform

export type AIProvider = 'openai' | 'gemini' | 'groq' | 'claude';

export type ContentType = 'documentary' | 'general' | 'custom';

export type TaskType = 'image' | 'video';

export type TaskStatus = 'waiting' | 'pending' | 'processing' | 'completed' | 'failed';

export interface User {
  id: string;
  email: string;
  name?: string;
  image?: string;
}

export interface Project {
  id: string;
  title: string;
  story: string;
  idea?: string;
  contentType: ContentType;
  userId: string;
  status: TaskStatus;
  totalTasks: number;
  completedTasks: number;
  createdAt: string;
  updatedAt: string;
}

export interface Task {
  id: string;
  projectId: string;
  order: number;
  stepType: TaskType;
  veoPrompt?: string;
  imagePrompt?: string;
  imageUrl?: string;
  imagegenReference?: string;
  videoUrl?: string;
  status: TaskStatus;
  mode?: string;
  startFrame?: string;
  endFrame?: string;
  dependsOnTaskId?: string;
  createdAt: string;
  updatedAt: string;
}

// Baserow API types - field names MUST match Baserow column names exactly
export interface BaserowRow {
  id: number;
  order: string;
  // Existing fields (from CSV template)
  ID?: string;
  'VEO Prompt'?: string;
  'Image URL'?: string;
  'Image Prompt'?: string;
  'Imagegen Reference'?: string;
  Video_URL?: string;  // Note: underscore, not space
  Status?: TaskStatus;
  Mode?: string;
  'Start Frame'?: string;
  'End Frame'?: string;
  // New fields for project management (ADD THESE TO BASEROW)
  project_title?: string;
  task_order?: number;
  step_type?: TaskType;
  depends_on_task_id?: number;
  user_id?: string;
}

export interface BaserowListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: BaserowRow[];
}

// AI Generation types
export interface GenerationRequest {
  input: string;
  contentType: ContentType;
  provider: AIProvider;
}

export interface GenerationResponse {
  isStory: boolean;
  story: string;
  tasks: Omit<Task, 'id' | 'projectId' | 'createdAt' | 'updatedAt'>[];
}

// Form types
export interface CreateFormInput {
  content: string;
  contentType: ContentType;
  provider: AIProvider;
}
