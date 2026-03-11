import { env } from './env';
import type { BaserowRow, BaserowListResponse, Task, TaskStatus, TaskType } from '@/types';

const BASEROW_API_URL = env.BASEROW_API_URL;
const BASEROW_TABLE_ID = env.BASEROW_TABLE_ID;

async function baserowFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${BASEROW_API_URL}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      'Authorization': `Token ${env.BASEROW_API_TOKEN}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Baserow API error: ${response.status} - ${error}`);
  }

  return response.json();
}

// Convert Baserow row to Task type
export function rowToTask(row: BaserowRow): Task {
  return {
    id: String(row.id),
    projectId: row.project_title || '',
    order: row.task_order || 0,
    stepType: row.step_type || 'image',
    veoPrompt: row['VEO Prompt'],
    imagePrompt: row['Image Prompt'],
    imageUrl: row['Image URL'],
    imagegenReference: row['Imagegen Reference'],
    videoUrl: row.Video_URL,  // Fixed: underscore not space
    status: row.Status || 'pending',
    mode: row.Mode,
    startFrame: row['Start Frame'],
    endFrame: row['End Frame'],
    dependsOnTaskId: row.depends_on_task_id ? String(row.depends_on_task_id) : undefined,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

// Convert Task to Baserow row format
export function taskToRow(task: Partial<Omit<Task, 'id'>>): Partial<BaserowRow> {
  const row: Partial<BaserowRow> = {};

  if (task.projectId !== undefined) row.project_title = task.projectId;
  if (task.order !== undefined) row.task_order = task.order;
  if (task.stepType !== undefined) row.step_type = task.stepType;
  if (task.veoPrompt !== undefined) row['VEO Prompt'] = task.veoPrompt;
  if (task.imagePrompt !== undefined) row['Image Prompt'] = task.imagePrompt;
  if (task.imageUrl !== undefined) row['Image URL'] = task.imageUrl;
  if (task.imagegenReference !== undefined) row['Imagegen Reference'] = task.imagegenReference;
  if (task.videoUrl !== undefined) row.Video_URL = task.videoUrl;  // Fixed: underscore not space
  if (task.status !== undefined) row.Status = task.status;
  if (task.mode !== undefined) row.Mode = task.mode;
  if (task.startFrame !== undefined) row['Start Frame'] = task.startFrame;
  if (task.endFrame !== undefined) row['End Frame'] = task.endFrame;
  if (task.dependsOnTaskId !== undefined) {
    row.depends_on_task_id = parseInt(task.dependsOnTaskId, 10);
  }

  return row;
}

// Baserow API functions
export const baserow = {
  // List rows with optional filters
  async listRows(params: {
    page?: number;
    size?: number;
    search?: string;
    filter?: Record<string, string>;
  } = {}): Promise<BaserowListResponse> {
    const searchParams = new URLSearchParams();

    if (params.page) searchParams.set('page', String(params.page));
    if (params.size) searchParams.set('size', String(params.size));
    if (params.search) searchParams.set('search', params.search);

    if (params.filter) {
      Object.entries(params.filter).forEach(([key, value]) => {
        searchParams.set(`filter__${key}`, value);
      });
    }

    const queryString = searchParams.toString();
    const endpoint = `/database/rows/table/${BASEROW_TABLE_ID}/${queryString ? `?${queryString}` : ''}`;

    return baserowFetch<BaserowListResponse>(endpoint);
  },

  // Get a single row by ID
  async getRow(rowId: number): Promise<BaserowRow> {
    return baserowFetch<BaserowRow>(`/database/rows/table/${BASEROW_TABLE_ID}/${rowId}/`);
  },

  // Create a new row
  async createRow(data: Partial<BaserowRow>): Promise<BaserowRow> {
    return baserowFetch<BaserowRow>(`/database/rows/table/${BASEROW_TABLE_ID}/`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Update a row
  async updateRow(rowId: number, data: Partial<BaserowRow>): Promise<BaserowRow> {
    return baserowFetch<BaserowRow>(`/database/rows/table/${BASEROW_TABLE_ID}/${rowId}/`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  // Delete a row
  async deleteRow(rowId: number): Promise<void> {
    await baserowFetch(`/database/rows/table/${BASEROW_TABLE_ID}/${rowId}/`, {
      method: 'DELETE',
    });
  },

  // Create multiple rows in batch
  async createRows(rows: Partial<BaserowRow>[]): Promise<BaserowRow[]> {
    const results: BaserowRow[] = [];

    // Baserow doesn't have a batch create API, so we create rows sequentially
    for (const row of rows) {
      const result = await this.createRow(row);
      results.push(result);
    }

    return results;
  },

  // Helper: Get all tasks for a project
  async getProjectTasks(projectTitle: string): Promise<Task[]> {
    const response = await this.listRows({
      search: projectTitle,
      size: 100,
    });

    return response.results
      .filter(row => row.project_title === projectTitle)
      .map(rowToTask)
      .sort((a, b) => a.order - b.order);
  },

  // Helper: Get tasks by status
  async getTasksByStatus(status: TaskStatus): Promise<Task[]> {
    const response = await this.listRows({
      filter: { 'Status__contains': status },
      size: 100,
    });

    return response.results.map(rowToTask);
  },

  // Helper: Get waiting tasks whose dependencies are completed
  async getReadyVideoTasks(): Promise<Task[]> {
    const waitingTasks = await this.getTasksByStatus('waiting');
    const readyTasks: Task[] = [];

    for (const task of waitingTasks) {
      if (task.stepType === 'video' && task.dependsOnTaskId) {
        const dependency = await this.getRow(parseInt(task.dependsOnTaskId, 10));
        if (dependency.Status === 'completed' && dependency['Image URL']) {
          readyTasks.push(task);
        }
      }
    }

    return readyTasks;
  },
};

export default baserow;
