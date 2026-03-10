'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Image as ImageIcon, Video, Download, ExternalLink } from 'lucide-react';
import type { Task } from '@/types';

function MediaCard({ task, onClick }: { task: Task; onClick: () => void }) {
  const hasImage = task.imageUrl && task.status === 'completed';
  const hasVideo = task.videoUrl && task.status === 'completed';

  return (
    <Card
      className="overflow-hidden cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all"
      onClick={onClick}
    >
      <div className="aspect-video bg-muted relative">
        {hasImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={task.imageUrl}
            alt={task.imagePrompt || 'Generated image'}
            className="w-full h-full object-cover"
          />
        ) : hasVideo ? (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-orange-500/20 to-red-500/20">
            <Video className="h-12 w-12 text-orange-500" />
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            {task.stepType === 'video' ? (
              <Video className="h-12 w-12 text-muted-foreground/50" />
            ) : (
              <ImageIcon className="h-12 w-12 text-muted-foreground/50" />
            )}
          </div>
        )}

        {/* Type indicator */}
        <div className="absolute top-2 right-2">
          {task.stepType === 'video' ? (
            <div className="p-1.5 rounded-full bg-orange-500/80 text-white">
              <Video className="h-3 w-3" />
            </div>
          ) : (
            <div className="p-1.5 rounded-full bg-purple-500/80 text-white">
              <ImageIcon className="h-3 w-3" />
            </div>
          )}
        </div>
      </div>
      <CardContent className="p-3">
        <p className="text-sm text-muted-foreground line-clamp-2">
          {task.stepType === 'video' ? task.veoPrompt : task.imagePrompt}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          {task.projectId}
        </p>
      </CardContent>
    </Card>
  );
}

function MediaSkeleton() {
  return (
    <Card className="overflow-hidden">
      <Skeleton className="aspect-video" />
      <CardContent className="p-3">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-3 w-2/3 mt-2" />
      </CardContent>
    </Card>
  );
}

export default function GalleryPage() {
  const { data: session } = useSession();
  const [filter, setFilter] = useState<'all' | 'image' | 'video'>('all');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['tasks', 'completed'],
    queryFn: async () => {
      const response = await fetch('/api/tasks?status=completed');
      if (!response.ok) throw new Error('Failed to fetch tasks');
      return response.json();
    },
    enabled: !!session,
  });

  const tasks = data?.tasks || [];
  const filteredTasks = filter === 'all'
    ? tasks
    : tasks.filter((t: Task) => t.stepType === filter);

  const completedWithMedia = filteredTasks.filter(
    (t: Task) => t.status === 'completed' && (t.imageUrl || t.videoUrl)
  );

  if (!session) {
    return (
      <div className="container py-12">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              Please <a href="/login" className="text-primary hover:underline">sign in</a> to view the gallery.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Media Gallery</h1>
          <p className="text-muted-foreground">
            View and download your generated content
          </p>
        </div>
        <Select
          value={filter}
          onValueChange={(v) => setFilter(v as 'all' | 'image' | 'video')}
        >
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Media</SelectItem>
            <SelectItem value="image">Images Only</SelectItem>
            <SelectItem value="video">Videos Only</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {[...Array(8)].map((_, i) => (
            <MediaSkeleton key={i} />
          ))}
        </div>
      )}

      {error && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-destructive">Failed to load gallery. Please try again.</p>
          </CardContent>
        </Card>
      )}

      {!isLoading && completedWithMedia.length === 0 && (
        <Card>
          <CardContent className="py-16 text-center">
            <ImageIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No media yet</h3>
            <p className="text-muted-foreground mb-4">
              Generated images and videos will appear here once completed
            </p>
            <Link
              href="/create"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/80"
            >
              Create Content
            </Link>
          </CardContent>
        </Card>
      )}

      {!isLoading && completedWithMedia.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {completedWithMedia.map((task: Task) => (
            <MediaCard
              key={task.id}
              task={task}
              onClick={() => setSelectedTask(task)}
            />
          ))}
        </div>
      )}

      {/* Media Preview Dialog */}
      <Dialog open={!!selectedTask} onOpenChange={() => setSelectedTask(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>
              {selectedTask?.stepType === 'video' ? 'Video' : 'Image'} Preview
            </DialogTitle>
          </DialogHeader>
          {selectedTask && (
            <div className="space-y-4">
              <div className="aspect-video bg-muted rounded-lg overflow-hidden">
                {selectedTask.imageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={selectedTask.imageUrl}
                    alt={selectedTask.imagePrompt || 'Generated image'}
                    className="w-full h-full object-contain"
                  />
                )}
                {selectedTask.videoUrl && (
                  <video
                    src={selectedTask.videoUrl}
                    controls
                    className="w-full h-full object-contain"
                  />
                )}
              </div>

              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  {selectedTask.stepType === 'video'
                    ? selectedTask.veoPrompt
                    : selectedTask.imagePrompt}
                </p>
                <p className="text-xs text-muted-foreground">
                  Project: {selectedTask.projectId}
                </p>
              </div>

              <div className="flex gap-2 flex-wrap">
                {selectedTask.imageUrl && (
                  <>
                    <a
                      href={selectedTask.imageUrl}
                      download
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/80"
                    >
                      <Download className="h-4 w-4" />
                      Download
                    </a>
                    <a
                      href={selectedTask.imageUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium hover:bg-muted"
                    >
                      <ExternalLink className="h-4 w-4" />
                      Open Original
                    </a>
                  </>
                )}
                {selectedTask.videoUrl && (
                  <>
                    <a
                      href={selectedTask.videoUrl}
                      download
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/80"
                    >
                      <Download className="h-4 w-4" />
                      Download
                    </a>
                    <a
                      href={selectedTask.videoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium hover:bg-muted"
                    >
                      <ExternalLink className="h-4 w-4" />
                      Open Original
                    </a>
                  </>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
