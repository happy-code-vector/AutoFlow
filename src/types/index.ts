// Types for the Content Creation Platform

export type AIProvider = 'openai' | 'gemini' | 'groq' | 'claude';

export type ContentType = 'documentary' | 'general' | 'custom';

// Hybrid approach: Asset types with tool routing
export type AssetType = 'character-reference' | 'b-roll' | 'still' | 'video';
export type ToolType = 'midjourney' | 'kling' | 'veo' | 'seedance';

// Legacy support
export type TaskType = 'image' | 'video';

export type TaskStatus = 'waiting' | 'pending' | 'processing' | 'completed' | 'failed';

// Character reference system
export interface CharacterReference {
  name: string;
  description: string;
  fullBodyImageUrl?: string;  // CR-1
  faceCloseUpUrl?: string;    // CR-2
}

// Scene context accumulator
export interface SceneContext {
  timePeriod: string;
  location: string;
  visualStyle: string;
  characters: CharacterReference[];
  era?: string;
  mood?: string;
}

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
  // Hybrid approach fields
  assetType?: AssetType;
  tool?: ToolType;
  characterName?: string;  // If shot contains a named character
  sceneContext?: SceneContext;
  // Legacy fields
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
  dependsOnTaskIds?: number[];  // Multiple dependencies (comma-separated in Baserow)
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
  // Project management fields
  project_title?: string;
  task_order?: number;
  step_type?: TaskType;
  depends_on_task_id?: number;
  depends_on_task_ids?: string;  // Comma-separated task IDs
  user_id?: string;
  // Hybrid approach fields (ADD THESE TO BASEROW)
  asset_type?: AssetType;
  tool?: ToolType;
  character_name?: string;
  scene_time_period?: string;
  scene_location?: string;
  scene_visual_style?: string;
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
  sceneContext: SceneContext;
  characters: CharacterReference[];
  tasks: Omit<Task, 'id' | 'projectId' | 'createdAt' | 'updatedAt'>[];
}

// Form types
export interface CreateFormInput {
  content: string;
  contentType: ContentType;
  provider: AIProvider;
}

// Generated task from AI pipeline (hybrid approach)
export interface GeneratedTask {
  order: number;
  stepType: 'image' | 'video';
  assetType: AssetType;
  tool: ToolType;
  imagePrompt?: string;
  veoPrompt?: string;
  characterName?: string;
  dependsOnOrders?: number[];
  sceneContext?: Partial<SceneContext>;
}
