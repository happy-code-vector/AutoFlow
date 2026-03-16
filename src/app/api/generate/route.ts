import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { processInput } from '@/lib/ai-providers';
import { baserow, taskToRow } from '@/lib/baserow';
import type { AIProvider, ContentType, GeneratedTask } from '@/types';
import { z } from 'zod';

const generateSchema = z.object({
  input: z.string().min(10, 'Input must be at least 10 characters'),
  contentType: z.enum(['documentary', 'general', 'custom']).default('general'),
  provider: z.enum(['openai', 'gemini', 'groq', 'claude']).default('claude'),
  projectTitle: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validated = generateSchema.parse(body);

    // Generate story, context, characters, and tasks using hybrid AI pipeline
    const { story, sceneContext, characters, tasks } = await processInput(
      validated.input,
      validated.contentType as ContentType,
      validated.provider as AIProvider
    );

    // Debug: log AI response
    console.log('=== HYBRID AI PIPELINE OUTPUT ===');
    console.log('Story:', story.substring(0, 200) + '...');
    console.log('Scene Context:', JSON.stringify(sceneContext, null, 2));
    console.log('Characters:', JSON.stringify(characters, null, 2));
    console.log('Tasks:', JSON.stringify(tasks, null, 2));

    // Create project title
    const projectTitle = validated.projectTitle ||
      story.substring(0, 50).replace(/[^a-zA-Z0-9\s]/g, '').trim() ||
      `Project ${Date.now()}`;

    // Create tasks in Baserow with hybrid approach data
    // NOTE: New hybrid fields (asset_type, tool, etc.) will be added when you create them in Baserow
    const baserowTasks = tasks
      .filter((task) => task.assetType !== 'b-roll') // Skip B-roll - doesn't need AI generation
      .map((task) => {
      // Determine status based on dependencies
      let status: 'waiting' | 'pending' = 'pending';

      if (task.dependsOnOrders && task.dependsOnOrders.length > 0) {
        // Has dependencies - wait for them
        status = 'waiting';
      }

      const row = taskToRow({
        projectId: projectTitle,
        order: task.order,
        stepType: task.stepType,
        veoPrompt: task.veoPrompt,
        imagePrompt: task.imagePrompt,
        mode: task.tool === 'kling' || task.tool === 'veo' || task.tool === 'seedance' ? 'image' : 'text',
        status,
        // Uncomment these after adding fields to Baserow:
        // assetType: task.assetType,
        // tool: task.tool,
        // characterName: task.characterName,
        // sceneContext: task.sceneContext,
      });

      return {
        ...row,
        user_id: session.user.id,
      };
    });

    // Debug: log what we're sending to Baserow
    console.log('Sending to Baserow:', JSON.stringify(baserowTasks, null, 2));

    // Create all tasks in Baserow
    let createdRows;
    try {
      createdRows = await baserow.createRows(baserowTasks);
      console.log('Baserow response:', JSON.stringify(createdRows, null, 2));
    } catch (baserowError) {
      console.error('Baserow create error:', baserowError);
      throw baserowError;
    }

    // Update dependencies - map order to actual row IDs
    // Filter B-roll from tasks for dependency tracking
    const nonBRollTasks = tasks.filter(t => t.assetType !== 'b-roll');

    for (let i = 0; i < nonBRollTasks.length; i++) {
      const task = nonBRollTasks[i];
      if (task.dependsOnOrders && task.dependsOnOrders.length > 0) {
        // Find the actual row IDs for the dependencies
        const dependencyIds = task.dependsOnOrders
          .map(depOrder => {
            const depIndex = nonBRollTasks.findIndex(t => t.order === depOrder);
            return depIndex >= 0 ? createdRows[depIndex]?.id : null;
          })
          .filter((id): id is number => id !== null);

        if (dependencyIds.length > 0) {
          await baserow.updateRow(createdRows[i].id, {
            depends_on_task_ids: dependencyIds.join(','),
            depends_on_task_id: dependencyIds[dependencyIds.length - 1], // Primary dependency
          });
        }
      }
    }

    // Calculate statistics
    const stats = {
      total: tasks.length,
      created: nonBRollTasks.length,
      characterReferences: tasks.filter(t => t.assetType === 'character-reference').length,
      bRoll: tasks.filter(t => t.assetType === 'b-roll').length,
      stills: tasks.filter(t => t.assetType === 'still').length,
      videos: tasks.filter(t => t.assetType === 'video').length,
      byTool: {
        midjourney: tasks.filter(t => t.tool === 'midjourney').length,
        kling: tasks.filter(t => t.tool === 'kling').length,
        veo: tasks.filter(t => t.tool === 'veo').length,
        seedance: tasks.filter(t => t.tool === 'seedance').length,
        none: tasks.filter(t => !t.tool).length,
      },
    };

    console.log('=== PRODUCTION STATISTICS ===');
    console.log(JSON.stringify(stats, null, 2));

    return NextResponse.json({
      success: true,
      project: {
        title: projectTitle,
        story,
        sceneContext,
        characters,
        taskCount: tasks.length,
      },
      statistics: stats,
      tasks: createdRows.map((row, index) => ({
        id: row.id,
        order: tasks[index].order,
        type: tasks[index].stepType,
        assetType: tasks[index].assetType,
        tool: tasks[index].tool,
        characterName: tasks[index].characterName,
        status: row.Status,
      })),
    });
  } catch (error) {
    console.error('Generate API error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
