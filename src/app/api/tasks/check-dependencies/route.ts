import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { baserow } from '@/lib/baserow';

/**
 * GET /api/tasks/check-dependencies
 * Checks for waiting video tasks whose dependencies are completed
 * and updates their status to pending
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all waiting tasks
    const response = await baserow.listRows({ size: 200 });
    const waitingTasks = response.results.filter(
      row => row.Status === 'waiting' && row.step_type === 'video'
    );

    const updatedTasks: number[] = [];

    for (const task of waitingTasks) {
      // Check if this task has a dependency
      if (task.depends_on_task_id) {
        // Get the dependency task
        const dependency = await baserow.getRow(task.depends_on_task_id);

        // Check if dependency is completed and has an image URL
        if (dependency.Status === 'completed' && dependency['Image URL']) {
          // Update the waiting task to pending
          await baserow.updateRow(task.id, {
            Status: 'pending',
            'Imagegen Reference': dependency['Image URL'],
          });
          updatedTasks.push(task.id);
          console.log(`Updated task ${task.id} from waiting to pending`);
        }
      }
    }

    return NextResponse.json({
      success: true,
      checked: waitingTasks.length,
      updated: updatedTasks.length,
      updatedTaskIds: updatedTasks,
    });
  } catch (error) {
    console.error('Check dependencies error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
