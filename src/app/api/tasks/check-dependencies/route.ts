import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { baserow } from '@/lib/baserow';

/**
 * GET /api/tasks/check-dependencies
 * Checks for waiting video tasks whose dependencies are completed
 * Collects ALL completed image URLs from the same project (with lower order)
 * and updates their status to pending with reference images in Image URL field
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

    const updatedTasks: number[] = [];

    for (const videoTask of waitingTasks) {
      // Find all completed image tasks in the same project with lower order
      const projectImages = allTasks.filter(
        row =>
          row.project_title === videoTask.project_title &&
          row.step_type === 'image' &&
          row.Status === 'completed' &&
          row['Image URL'] &&
          (row.task_order || 0) < (videoTask.task_order || 0)
      );

      // Check if the specific dependency (if any) is completed
      if (videoTask.depends_on_task_id) {
        const dependency = allTasks.find(row => row.id === videoTask.depends_on_task_id);
        if (!dependency || dependency.Status !== 'completed' || !dependency['Image URL']) {
          // Dependency not ready, skip this task
          continue;
        }
      }

      // Collect all image URLs (comma-separated as per documentation)
      const imageUrls = projectImages
        .map(img => img['Image URL'])
        .filter(Boolean)
        .join(',');

      if (imageUrls) {
        // Update the video task with reference images and set to pending
        await baserow.updateRow(videoTask.id, {
          Status: 'pending',
          'Image URL': imageUrls,  // Comma-separated reference images
        });
        updatedTasks.push(videoTask.id);
        console.log(`Updated video task ${videoTask.id} with ${projectImages.length} reference images`);
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
