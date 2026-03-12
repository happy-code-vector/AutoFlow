'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Sparkles } from 'lucide-react';
import type { AIProvider, ContentType } from '@/types';

export default function CreatePage() {
  const router = useRouter();
  const { data: session } = useSession();

  const [content, setContent] = useState('');
  const [contentType, setContentType] = useState<ContentType>('general');
  const [provider, setProvider] = useState<AIProvider>('claude');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGenerate = async () => {
    if (!content.trim()) {
      setError('Please enter an idea or story');
      return;
    }

    if (content.trim().length < 10) {
      setError('Input must be at least 10 characters');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input: content,
          contentType,
          provider,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate content');
      }

      // Navigate to the project page
      router.push(`/project/${data.project.title.replace(/\s+/g, '-').toLowerCase()}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  if (!session) {
    return (
      <div className="container py-12">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              Please <a href="/login" className="text-primary hover:underline">sign in</a> to create content.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container py-8 max-w-3xl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Create New Content
          </CardTitle>
          <CardDescription>
            Enter an idea or a full story. Our AI will automatically detect the input type
            and generate the appropriate prompts for images and videos.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Textarea
              placeholder="What story do you want to tell?

Examples:
• A story about the first humans discovering fire in the Stone Age...
• The rise and fall of an ancient Roman city...
• A lone astronaut exploring an alien planet..."
              className="min-h-[200px] text-base"
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
            <p className="text-sm text-muted-foreground">
              Minimum 10 characters. The AI will detect if this is an idea or a full story.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Content Type</label>
              <Select value={contentType} onValueChange={(v) => setContentType(v as ContentType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="documentary">Documentary</SelectItem>
                  <SelectItem value="general">General</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">AI Provider</label>
              <Select value={provider} onValueChange={(v) => setProvider(v as AIProvider)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="claude">Claude (Anthropic) - Recommended</SelectItem>
                  <SelectItem value="openai">OpenAI GPT-4o</SelectItem>
                  <SelectItem value="gemini">Google Gemini</SelectItem>
                  <SelectItem value="groq">Groq (Llama)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <Button
            className="w-full"
            size="lg"
            onClick={handleGenerate}
            disabled={isLoading || !content.trim()}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Generate Content
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
