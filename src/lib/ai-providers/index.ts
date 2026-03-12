import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { env } from '../env';
import type { AIProvider, ContentType, Task, TaskType } from '@/types';

interface GenerateResult {
  story: string;
  tasks: Array<{
    order: number;
    stepType: TaskType;
    veoPrompt?: string;
    imagePrompt?: string;
    mode?: string;
    dependsOnOrder?: number;
  }>;
}

// Historical Documentary Producer System Prompt
const HISTORICAL_DOCUMENTARY_SKILL = `You are the Historical Documentary Producer for "Before Time Had a Name" — a historical documentary YouTube channel covering human history from the Stone Age through the medieval world using AI-generated video (VEO 3.1, Seedance 2.0, Kling), AI images (Midjourney v6.1), and real B-roll footage.

## Production Mix Philosophy
- B-Roll (real footage): ~50% - Establishing shots, landscapes, artifact close-ups
- AI Still Images (held + Ken Burns): ~30% - Historically specific scenes
- AI Video Clips: ~20% - Motion scenes that require historical specificity

## Target runtime: 8–10 minutes

## Character System
Every episode with named recurring human subjects uses this reference hierarchy:
- CR-1: Primary character full body (generate first, always)
- CR-2: Primary character face close-up (Kling seeding reference)
- CR-3: Secondary character full body
- CR-4: Secondary character face close-up
- CR-5: Tertiary character (if present)

## Tool Assignment
- VEO 3.1 Flow: Wide shots, environments, camera movement, action
- Kling: Any scene where a named character's face must be consistent
- Seedance 2.0: Long continuous motion sequences, crowd scenes`;

const STORY_DETECTION_PROMPT = `Analyze the following input and determine if it is:
1. A full story/narrative (detailed plot with characters, scenes, and structure)
2. A simple idea/concept (brief description or topic that needs to be expanded)

Input: {INPUT}

Respond with only "STORY" or "IDEA".`;

const IDEA_TO_STORY_PROMPT = `You are a creative story writer for historical documentaries. Transform the following idea into a compelling narrative for visual content creation.

Idea: {INPUT}

Create a story that:
- Has a clear beginning, middle, and end
- Describes visual scenes that can be illustrated
- Includes emotional moments and dramatic beats
- Is historically grounded and educational
- Suitable for AI-generated video/image content

Write the story (300-500 words):`;

const STORY_TO_TASKS_PROMPT = `You are a content production assistant for historical documentaries. Analyze the following story and generate a production plan with specific image and video generation prompts.

Story:
{STORY}

Content Type: {CONTENT_TYPE}

Generate a JSON array of tasks. Each task should be:
- For images: { "type": "image", "prompt": "detailed prompt for AI image generation" }
- For videos: { "type": "video", "prompt": "detailed prompt for AI video generation", "dependsOnImage": null or index of reference image }

Guidelines:
- Create 5-8 image prompts for key scenes (detailed, cinematic, historically accurate lighting)
- Create 2-4 video prompts for motion scenes (character actions, environment transitions)
- Video prompts that need a reference image should reference the image by its index
- Prompts should be production-ready for Midjourney (images) or VEO/Kling (videos)
- Include era-appropriate visual details (costumes, architecture, landscapes)

Output ONLY valid JSON array, no markdown:
[{"type": "image", "prompt": "..."}, ...]`;

export async function generateWithOpenAI(
  input: string,
  systemPrompt: string
): Promise<string> {
  const openai = new OpenAI({
    apiKey: env.OPENAI_API_KEY,
  });

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: input },
    ],
    temperature: 0.7,
    max_tokens: 2000,
  });

  return response.choices[0]?.message?.content || '';
}

export async function generateWithGemini(
  input: string,
  systemPrompt: string
): Promise<string> {
  const { GoogleGenerativeAI } = await import('@google/generative-ai');

  const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY || '');

  const model = genAI.getGenerativeModel({
    model: 'gemini-1.5-pro',
    systemInstruction: systemPrompt,
  });

  const result = await model.generateContent(input);
  const response = await result.response;

  return response.text();
}

export async function generateWithGroq(
  input: string,
  systemPrompt: string
): Promise<string> {
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.GROQ_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: input },
      ],
      temperature: 0.7,
      max_tokens: 2000,
    }),
  });

  const data = await response.json();
  return data.choices[0]?.message?.content || '';
}

export async function generateWithClaude(
  input: string,
  systemPrompt: string
): Promise<string> {
  const anthropic = new Anthropic({
    apiKey: env.ANTHROPIC_API_KEY,
  });

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    system: systemPrompt,
    messages: [
      { role: 'user', content: input },
    ],
  });

  const textBlock = response.content.find(block => block.type === 'text');
  return textBlock ? textBlock.text : '';
}

async function generate(
  input: string,
  systemPrompt: string,
  provider: AIProvider
): Promise<string> {
  switch (provider) {
    case 'openai':
      return generateWithOpenAI(input, systemPrompt);
    case 'gemini':
      return generateWithGemini(input, systemPrompt);
    case 'groq':
      return generateWithGroq(input, systemPrompt);
    case 'claude':
      return generateWithClaude(input, systemPrompt);
    default:
      throw new Error(`Unsupported AI provider: ${provider}`);
  }
}

export async function detectInputType(
  input: string,
  provider: AIProvider
): Promise<'idea' | 'story'> {
  const prompt = STORY_DETECTION_PROMPT.replace('{INPUT}', input);
  const result = await generate(input, prompt, provider);
  const trimmed = result.trim().toUpperCase();

  return trimmed.includes('STORY') ? 'story' : 'idea';
}

export async function convertIdeaToStory(
  idea: string,
  provider: AIProvider
): Promise<string> {
  const prompt = IDEA_TO_STORY_PROMPT.replace('{INPUT}', idea);
  return generate(idea, prompt, provider);
}

export async function generateTasksFromStory(
  story: string,
  contentType: ContentType,
  provider: AIProvider
): Promise<GenerateResult['tasks']> {
  const prompt = STORY_TO_TASKS_PROMPT
    .replace('{STORY}', story)
    .replace('{CONTENT_TYPE}', contentType);

  const result = await generate(story, prompt, provider);

  // Parse JSON from response
  try {
    // Extract JSON array from response
    const jsonMatch = result.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error('No JSON array found in response');
    }

    const tasks = JSON.parse(jsonMatch[0]);

    return tasks.map((task: any, index: number) => ({
      order: index + 1,
      stepType: task.type === 'video' ? 'video' : 'image',
      veoPrompt: task.type === 'video' ? task.prompt : undefined,
      imagePrompt: task.type === 'image' ? task.prompt : undefined,
      mode: task.type === 'video' ? 'text' : undefined,
      dependsOnOrder: task.dependsOnImage !== null ? task.dependsOnImage + 1 : undefined,
    }));
  } catch (error) {
    console.error('Failed to parse tasks:', error);
    // Return fallback tasks
    return [
      { order: 1, stepType: 'image', imagePrompt: `Cinematic scene from: ${story.substring(0, 100)}` },
      { order: 2, stepType: 'video', veoPrompt: `Visual narrative sequence based on: ${story.substring(0, 100)}`, mode: 'text' },
    ];
  }
}

export async function processInput(
  input: string,
  contentType: ContentType,
  provider: AIProvider
): Promise<GenerateResult> {
  // Step 1: Detect if input is idea or story
  const inputType = await detectInputType(input, provider);

  // Step 2: Convert to story if needed
  let story = input;
  if (inputType === 'idea') {
    story = await convertIdeaToStory(input, provider);
  }

  // Step 3: Generate tasks from story
  const tasks = await generateTasksFromStory(story, contentType, provider);

  return { story, tasks };
}

export const aiProviders = {
  openai: {
    name: 'OpenAI GPT-4o',
    generate: generateWithOpenAI,
  },
  gemini: {
    name: 'Google Gemini',
    generate: generateWithGemini,
  },
  groq: {
    name: 'Groq (Llama)',
    generate: generateWithGroq,
  },
  claude: {
    name: 'Claude (Anthropic)',
    generate: generateWithClaude,
  },
};
