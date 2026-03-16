import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { baserow } from '@/lib/baserow';

/**
 * GET /api/tasks/check-dependencies
 * Checks for waiting video tasks whose dependencies are completed
 * Handles multiple dependencies (depends_on_task_ids)
 * Collects ALL completed image URLs from dependencies
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all tasks
    const response = await baserow.listRows({ size: 200 });
    const allTasks = response.results;

    // Find all waiting video tasks
    const waitingTasks = allTasks.filter(
      row => row.Status === 'waiting' && row.step_type === 'video'
    );

    const updatedTasks: { id: number; referenceCount: number }[] = [];
    const skippedTasks: { id: number; reason: string }[] = [];

    for (const videoTask of waitingTasks) {
      let dependencyIds: number[] = [];

      // Parse multiple dependencies if present
      if (videoTask.depends_on_task_ids) {
        dependencyIds = videoTask.depends_on_task_ids
          .split(',')
          .map(Number)
          .filter(Boolean);
      } else if (videoTask.depends_on_task_id) {
        // Single dependency fallback
        dependencyIds = [videoTask.depends_on_task_id];
      }

      // Check if all dependencies are completed
      if (dependencyIds.length > 0) {
        const dependencies = dependencyIds.map(id =>
          allTasks.find(row => row.id === id)
        );

        const allReady = dependencies.every(
          dep => dep && dep.Status === 'completed' && dep['Image URL']
        );

        if (!allReady) {
          const missingDeps = dependencies
            .filter(dep => !dep || dep.Status !== 'completed' || !dep['Image URL'])
            .map((dep, i) => dep ? `ID ${dep.id}` : `ID ${dependencyIds[i]}`);

          skippedTasks.push({
            id: videoTask.id,
            reason: `Dependencies not ready: ${missingDeps.join(', ')}`,
          });
          continue;
        }

        // Collect image URLs from specific dependencies only
        const imageUrls = dependencies
          .filter((dep): dep is NonNullable<typeof dep> => dep !== undefined)
          .map(dep => dep['Image URL'])
          .filter(Boolean)
          .join(',');

        if (imageUrls) {
          await baserow.updateRow(videoTask.id, {
            Status: 'pending',
            'Imagegen Reference': imageUrls,  // Use Imagegen Reference for the reference images
          });
          updatedTasks.push({
            id: videoTask.id,
            referenceCount: dependencies.length,
          });
          console.log(`Updated video task ${videoTask.id} with ${dependencies.length} reference images`);
        }
      } else {
        // No dependencies - just set to pending
        await baserow.updateRow(videoTask.id, {
          Status: 'pending',
        });
        updatedTasks.push({
          id: videoTask.id,
          referenceCount: 0,
        });
        console.log(`Updated video task ${videoTask.id} to pending (no dependencies)`);
      }
    }

    return NextResponse.json({
      success: true,
      checked: waitingTasks.length,
      updated: updatedTasks.length,
      skipped: skippedTasks.length,
      updatedTasks,
      skippedTasks,
    });
  } catch (error) {
    console.error('Check dependencies error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
