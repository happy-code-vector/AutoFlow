'use client';

import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { Card, CardContent } from '@/components/ui/card';
import {
  Film,
  Sparkles,
  Image as ImageIcon,
  Video,
  Zap,
  Layers,
} from 'lucide-react';

export default function Home() {
  const { data: session } = useSession();

  if (session) {
    return (
      <div className="container py-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Welcome back!</h1>
          <p className="text-xl text-muted-foreground mb-6">
            Ready to create amazing content?
          </p>
          <Link
            href="/create"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/80"
          >
            <Sparkles className="h-5 w-5" />
            Create New Content
          </Link>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <Card className="hover:border-primary/50 transition-colors">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 rounded-lg bg-purple-500/10">
                  <ImageIcon className="h-5 w-5 text-purple-500" />
                </div>
                <h3 className="font-semibold">AI Images</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Generate stunning AI images from your prompts using Midjourney, DALL-E, and more.
              </p>
            </CardContent>
          </Card>

          <Card className="hover:border-primary/50 transition-colors">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 rounded-lg bg-orange-500/10">
                  <Video className="h-5 w-5 text-orange-500" />
                </div>
                <h3 className="font-semibold">AI Videos</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Create cinematic video clips with VEO 3.1, Kling, and other cutting-edge tools.
              </p>
            </CardContent>
          </Card>

          <Card className="hover:border-primary/50 transition-colors">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <Layers className="h-5 w-5 text-blue-500" />
                </div>
                <h3 className="font-semibold">Full Pipeline</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                End-to-end workflow from idea to finished content with automated prompt generation.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-16">
      <div className="text-center mb-16">
        <div className="flex justify-center mb-6">
          <div className="p-4 rounded-2xl bg-primary/10">
            <Film className="h-12 w-12 text-primary" />
          </div>
        </div>
        <h1 className="text-5xl font-bold mb-4">
          ContentFlow
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
          Transform your ideas into stunning AI-generated images and videos.
          Just describe what you want, and let AI do the rest.
        </p>
        <div className="flex gap-4 justify-center">
          <Link
            href="/create"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/80"
          >
            <Sparkles className="h-5 w-5" />
            Get Started
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-background px-4 py-2.5 text-sm font-medium hover:bg-muted"
          >
            Sign In
          </Link>
        </div>
      </div>

      <div className="grid gap-8 md:grid-cols-3 max-w-4xl mx-auto">
        <div className="text-center">
          <div className="p-3 rounded-full bg-purple-500/10 w-fit mx-auto mb-4">
            <Zap className="h-6 w-6 text-purple-500" />
          </div>
          <h3 className="font-semibold mb-2">Idea to Story</h3>
          <p className="text-sm text-muted-foreground">
            Input a simple idea and AI automatically expands it into a full narrative.
          </p>
        </div>

        <div className="text-center">
          <div className="p-3 rounded-full bg-orange-500/10 w-fit mx-auto mb-4">
            <ImageIcon className="h-6 w-6 text-orange-500" />
          </div>
          <h3 className="font-semibold mb-2">Auto Prompts</h3>
          <p className="text-sm text-muted-foreground">
            AI generates optimized prompts for image and video generation tools.
          </p>
        </div>

        <div className="text-center">
          <div className="p-3 rounded-full bg-blue-500/10 w-fit mx-auto mb-4">
            <Layers className="h-6 w-6 text-blue-500" />
          </div>
          <h3 className="font-semibold mb-2">Multi-Step Pipeline</h3>
          <p className="text-sm text-muted-foreground">
            Reference images feed into video generation for consistent results.
          </p>
        </div>
      </div>

      <div className="mt-16 text-center">
        <Card className="max-w-2xl mx-auto">
          <CardContent className="py-8">
            <h3 className="font-semibold text-lg mb-2">Ready to create?</h3>
            <p className="text-muted-foreground mb-4">
              Join ContentFlow and start generating amazing AI content today.
            </p>
            <Link
              href="/login"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/80"
            >
              Start Creating
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
