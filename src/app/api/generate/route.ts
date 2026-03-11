import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { processInput } from '@/lib/ai-providers';
import { baserow, taskToRow } from '@/lib/baserow';
import type { AIProvider, ContentType } from '@/types';
import { z } from 'zod';

const generateSchema = z.object({
  input: z.string().min(10, 'Input must be at least 10 characters'),
  contentType: z.enum(['documentary', 'general', 'custom']).default('general'),
  provider: z.enum(['openai', 'gemini', 'groq']).default('openai'),
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

    // Generate story and tasks using AI
    const { story, tasks } = await processInput(
      validated.input,
      validated.contentType as ContentType,
      validated.provider as AIProvider
    );

    // Debug: log AI response
    console.log('AI generated story:', story.substring(0, 200) + '...');
    console.log('AI generated tasks:', JSON.stringify(tasks, null, 2));

    // Create project title
    const projectTitle = validated.projectTitle ||
      story.substring(0, 50).replace(/[^a-zA-Z0-9\s]/g, '').trim() ||
      `Project ${Date.now()}`;

    // Create tasks in Baserow
    const baserowTasks = tasks.map((task) => {
      const row = taskToRow({
        projectId: projectTitle,
        order: task.order,
        stepType: task.stepType,
        veoPrompt: task.veoPrompt,
        imagePrompt: task.imagePrompt,
        mode: task.mode,
        status: task.dependsOnOrder ? 'waiting' : 'pending',
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

    // Update dependencies - now that we have the actual IDs
    for (let i = 0; i < tasks.length; i++) {
      const task = tasks[i];
      if (task.dependsOnOrder && task.dependsOnOrder <= createdRows.length) {
        const dependencyRow = createdRows[task.dependsOnOrder - 1];
        await baserow.updateRow(createdRows[i].id, {
          depends_on_task_id: dependencyRow.id,
        });
      }
    }

    return NextResponse.json({
      success: true,
      project: {
        title: projectTitle,
        story,
        taskCount: tasks.length,
      },
      tasks: createdRows.map((row, index) => ({
        id: row.id,
        order: tasks[index].order,
        type: tasks[index].stepType,
        status: row.Status,
      })),
    });
  } catch (error) {
    console.error('Generate API error:', error);

    if (error instanceof z.ZodError) {
      const zodError = error as unknown as { errors: unknown[] };
      return NextResponse.json(
        { error: 'Validation error', details: zodError.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
