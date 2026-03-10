import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { baserow, rowToTask } from '@/lib/baserow';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    // Get all tasks and group by project
    const response = await baserow.listRows({ size: 200 });
    const tasks = response.results
      .filter(row => !userId || row.user_id === userId)
      .map(rowToTask);

    // Group tasks by project title
    const projectMap = new Map<string, {
      title: string;
      tasks: typeof tasks;
      totalTasks: number;
      completedTasks: number;
      status: string;
      createdAt: string;
    }>();

    tasks.forEach(task => {
      if (!task.projectId) return;

      if (!projectMap.has(task.projectId)) {
        projectMap.set(task.projectId, {
          title: task.projectId,
          tasks: [],
          totalTasks: 0,
          completedTasks: 0,
          status: 'pending',
          createdAt: task.createdAt,
        });
      }

      const project = projectMap.get(task.projectId)!;
      project.tasks.push(task);
      project.totalTasks++;

      if (task.status === 'completed') {
        project.completedTasks++;
      }
    });

    // Calculate project status
    const projects = Array.from(projectMap.values()).map(project => {
      let status = 'pending';
      if (project.completedTasks === project.totalTasks) {
        status = 'completed';
      } else if (project.completedTasks > 0) {
        status = 'processing';
      }

      return {
        id: project.title.replace(/\s+/g, '-').toLowerCase(),
        title: project.title,
        taskCount: project.totalTasks,
        completedTasks: project.completedTasks,
        progress: Math.round((project.completedTasks / project.totalTasks) * 100),
        status,
        createdAt: project.createdAt,
      };
    });

    // Sort by most recent
    projects.sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return NextResponse.json({ projects });
  } catch (error) {
    console.error('Projects API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
