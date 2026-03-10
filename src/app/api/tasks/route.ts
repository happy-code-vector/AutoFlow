import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { baserow, rowToTask, taskToRow } from '@/lib/baserow';
import type { TaskStatus } from '@/types';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const project = searchParams.get('project');
    const status = searchParams.get('status');

    const response = await baserow.listRows({ size: 200 });
    let tasks = response.results.map(rowToTask);

    // Filter by project
    if (project) {
      tasks = tasks.filter(task => task.projectId === project);
    }

    // Filter by status
    if (status) {
      tasks = tasks.filter(task => task.status === status);
    }

    // Sort by order
    tasks.sort((a, b) => a.order - b.order);

    return NextResponse.json({ tasks });
  } catch (error) {
    console.error('Tasks API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { taskId, status, imageUrl, videoUrl } = body;

    if (!taskId) {
      return NextResponse.json({ error: 'Task ID is required' }, { status: 400 });
    }

    const updateData: Record<string, any> = {};

    if (status) updateData.Status = status as TaskStatus;
    if (imageUrl) updateData['Image URL'] = imageUrl;
    if (videoUrl) updateData['Video_URL'] = videoUrl;

    const updatedRow = await baserow.updateRow(parseInt(taskId, 10), updateData);

    return NextResponse.json({
      success: true,
      task: rowToTask(updatedRow),
    });
  } catch (error) {
    console.error('Tasks PATCH API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
