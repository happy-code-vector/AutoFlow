import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { env } from '../env';
import type { AIProvider, ContentType, AssetType, ToolType, CharacterReference, SceneContext, GeneratedTask } from '@/types';

interface GenerateResult {
  story: string;
  sceneContext: SceneContext;
  characters: CharacterReference[];
  tasks: GeneratedTask[];
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
- Midjourney: All still images (historical scenes, artifacts, portraits)
- VEO 3.1: Wide shots, environments, camera movement, action WITHOUT named characters
- Kling: Any scene where a named character's face must be consistent (uses face seeding)
- Seedance 2.0: Long continuous motion sequences, crowd scenes`;

// Step 1: Detect input type
const STORY_DETECTION_PROMPT = `Analyze the following input and determine if it is:
1. A full story/narrative (detailed plot with characters, scenes, and structure)
2. A simple idea/concept (brief description or topic that needs to be expanded)

Input: {INPUT}

Respond with only "STORY" or "IDEA".`;

// Step 2: Convert idea to story
const IDEA_TO_STORY_PROMPT = `You are a creative story writer for historical documentaries. Transform the following idea into a compelling narrative for visual content creation.

Idea: {INPUT}

Create a story that:
- Has a clear beginning, middle, and end
- Describes visual scenes that can be illustrated
- Includes emotional moments and dramatic beats
- Is historically grounded and educational
- Suitable for AI-generated video/image content

Write the story (300-500 words):`;

// Step 3: Extract scene context and characters
const CONTEXT_EXTRACTION_PROMPT = `Analyze the following story and extract:

1. Scene Context (for consistency across all shots):
   - timePeriod: The historical era (e.g., "Stone Age", "Tang Dynasty")
   - location: Primary setting (e.g., "Ancient forest", "Imperial palace")
   - visualStyle: Cinematographic style (e.g., "Dark and atmospheric", "Warm and golden")
   - mood: Overall emotional tone

2. Named Characters (humans who appear in multiple scenes):
   - name: Character name
   - description: Physical description for consistent generation

Story:
{STORY}

Output ONLY valid JSON:
{
  "sceneContext": {
    "timePeriod": "...",
    "location": "...",
    "visualStyle": "...",
    "mood": "..."
  },
  "characters": [
    {"name": "...", "description": "..."}
  ]
}`;

// Step 4: Generate production plan with asset classification and tool routing
const PRODUCTION_PLAN_PROMPT = `You are a content production assistant for historical documentaries. Create a production plan for the following story.

Story:
{STORY}

Scene Context:
{CONTEXT}

Characters:
{CHARACTERS}

Generate a JSON array of production tasks. For each shot, determine:

1. ASSET TYPE (classify based on visual needs):
   - "character-reference": Generate character reference images FIRST (CR-1 full body, CR-2 face)
   - "b-roll": Real footage would work better (landscapes, artifacts, modern locations) - SKIP AI generation
   - "still": AI image only (held shot with Ken Burns effect is sufficient)
   - "video": Full AI video generation needed (motion is essential)

2. TOOL ROUTING:
   - "midjourney": All still images and character references
   - "kling": Any video with a named character's face (for consistency)
   - "veo": Videos without named characters (wide shots, environments)
   - "seedance": Long continuous motion, crowd scenes

3. DEPENDENCIES:
   - Character reference shots MUST come first (order 1, 2, etc.)
   - Video shots using characters must depend on their CR-2 (face) reference

Guidelines:
- ~50% should be "b-roll" (flag these, don't generate)
- ~30% should be "still" (image only, no video)
- ~20% should be "video" (full video generation)
- Generate character references FIRST for all named characters
- Each named character needs 2 reference shots: full body + face close-up

Output ONLY valid JSON array:
[
  {
    "assetType": "character-reference",
    "tool": "midjourney",
    "type": "image",
    "prompt": "...",
    "characterName": "Jara",
    "referenceType": "full-body"
  },
  {
    "assetType": "character-reference",
    "tool": "midjourney",
    "type": "image",
    "prompt": "...",
    "characterName": "Jara",
    "referenceType": "face"
  },
  {
    "assetType": "b-roll",
    "tool": null,
    "type": "image",
    "prompt": "SKIP - Use real footage of ancient forest landscape",
    "characterName": null
  },
  {
    "assetType": "still",
    "tool": "midjourney",
    "type": "image",
    "prompt": "...",
    "characterName": null
  },
  {
    "assetType": "video",
    "tool": "kling",
    "type": "video",
    "prompt": "...",
    "characterName": "Jara",
    "dependsOnReference": 2
  }
]`;

// Provider implementations
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
    max_tokens: 4000,
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
      max_tokens: 4000,
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

export async function extractContextAndCharacters(
  story: string,
  provider: AIProvider
): Promise<{ sceneContext: SceneContext; characters: CharacterReference[] }> {
  const prompt = CONTEXT_EXTRACTION_PROMPT.replace('{STORY}', story);
  const result = await generate(story, prompt, provider);

  try {
    const jsonMatch = result.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }

    const parsed = JSON.parse(jsonMatch[0]);
    return {
      sceneContext: {
        timePeriod: parsed.sceneContext?.timePeriod || 'Unknown era',
        location: parsed.sceneContext?.location || 'Unknown location',
        visualStyle: parsed.sceneContext?.visualStyle || 'Cinematic',
        characters: [],
        mood: parsed.sceneContext?.mood,
      },
      characters: (parsed.characters || []).map((c: any) => ({
        name: c.name,
        description: c.description,
      })),
    };
  } catch (error) {
    console.error('Failed to parse context/characters:', error);
    return {
      sceneContext: {
        timePeriod: 'Unknown era',
        location: 'Unknown location',
        visualStyle: 'Cinematic',
        characters: [],
      },
      characters: [],
    };
  }
}

export async function generateProductionPlan(
  story: string,
  sceneContext: SceneContext,
  characters: CharacterReference[],
  provider: AIProvider
): Promise<GeneratedTask[]> {
  const contextStr = JSON.stringify(sceneContext, null, 2);
  const charactersStr = JSON.stringify(characters, null, 2);

  const prompt = PRODUCTION_PLAN_PROMPT
    .replace('{STORY}', story)
    .replace('{CONTEXT}', contextStr)
    .replace('{CHARACTERS}', charactersStr);

  const result = await generate(story, prompt, provider);

  try {
    const jsonMatch = result.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error('No JSON array found in response');
    }

    const tasks = JSON.parse(jsonMatch[0]);

    // Build a map of character reference indices
    const characterReferenceMap: Record<string, number[]> = {};
    let currentOrder = 1;

    return tasks.map((task: any, index: number) => {
      const generatedTask: GeneratedTask = {
        order: currentOrder++,
        stepType: task.type === 'video' ? 'video' : 'image',
        assetType: task.assetType || 'still',
        tool: task.tool || 'midjourney',
        characterName: task.characterName || undefined,
        dependsOnOrders: task.dependsOnReference ? [task.dependsOnReference] : undefined,
        sceneContext: {
          timePeriod: sceneContext.timePeriod,
          location: sceneContext.location,
          visualStyle: sceneContext.visualStyle,
        },
      };

      if (task.type === 'video') {
        generatedTask.veoPrompt = task.prompt;
      } else {
        generatedTask.imagePrompt = task.prompt;
      }

      // Track character references for dependency resolution
      if (task.assetType === 'character-reference' && task.characterName) {
        if (!characterReferenceMap[task.characterName]) {
          characterReferenceMap[task.characterName] = [];
        }
        characterReferenceMap[task.characterName].push(generatedTask.order);
      }

      return generatedTask;
    });
  } catch (error) {
    console.error('Failed to parse production plan:', error);
    // Fallback: generate basic tasks
    return [
      {
        order: 1,
        stepType: 'image',
        assetType: 'still',
        tool: 'midjourney',
        imagePrompt: `Cinematic scene from: ${story.substring(0, 100)}`,
        sceneContext,
      },
      {
        order: 2,
        stepType: 'video',
        assetType: 'video',
        tool: 'veo',
        veoPrompt: `Visual narrative sequence: ${story.substring(0, 100)}`,
        sceneContext,
      },
    ];
  }
}

export async function processInput(
  input: string,
  contentType: ContentType,
  provider: AIProvider
): Promise<GenerateResult> {
  console.log('AI Provider:', provider);

  // Step 1: Detect if input is idea or story
  const inputType = await detectInputType(input, provider);
  console.log('Detected input type:', inputType);

  // Step 2: Convert to story if needed
  let story = input;
  if (inputType === 'idea') {
    story = await convertIdeaToStory(input, provider);
    console.log('AI generated story:', story.substring(0, 200) + '...');
  }

  // Step 3: Extract scene context and characters
  const { sceneContext, characters } = await extractContextAndCharacters(story, provider);
  console.log('Scene context:', sceneContext);
  console.log('Characters:', characters);

  // Step 4: Generate production plan with asset classification and tool routing
  const tasks = await generateProductionPlan(story, sceneContext, characters, provider);
  console.log('AI generated tasks:', JSON.stringify(tasks, null, 2));

  return { story, sceneContext, characters, tasks };
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
