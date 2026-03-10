'use client';

import { use, useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ArrowLeft,
  Image as ImageIcon,
  Video,
  CheckCircle2,
  Clock,
  Loader2,
  ExternalLink,
  Download,
} from 'lucide-react';
import type { Task } from '@/types';

function TaskItem({ task }: { task: Task }) {
  const statusColors: Record<string, string> = {
    waiting: 'bg-gray-500/10 text-gray-500',
    pending: 'bg-yellow-500/10 text-yellow-500',
    processing: 'bg-blue-500/10 text-blue-500',
    completed: 'bg-green-500/10 text-green-500',
    failed: 'bg-red-500/10 text-red-500',
  };

  const statusIcons: Record<string, React.ReactNode> = {
    waiting: <Clock className="h-3 w-3" />,
    pending: <Clock className="h-3 w-3" />,
    processing: <Loader2 className="h-3 w-3 animate-spin" />,
    completed: <CheckCircle2 className="h-3 w-3" />,
    failed: <span>!</span>,
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className={`p-2 rounded-lg ${task.stepType === 'image' ? 'bg-purple-500/10' : 'bg-orange-500/10'}`}>
              {task.stepType === 'image' ? (
                <ImageIcon className="h-4 w-4 text-purple-500" />
              ) : (
                <Video className="h-4 w-4 text-orange-500" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium text-sm">
                  Task #{task.order}
                </span>
                <Badge variant="secondary" className={statusColors[task.status]}>
                  <span className="flex items-center gap-1">
                    {statusIcons[task.status]}
                    {task.status}
                  </span>
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground line-clamp-2">
                {task.stepType === 'video' ? task.veoPrompt : task.imagePrompt}
              </p>

              {/* Show generated media */}
              {task.status === 'completed' && (
                <div className="mt-3 flex gap-2">
                  {task.imageUrl && (
                    <a
                      href={task.imageUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                    >
                      <ExternalLink className="h-3 w-3" />
                      View Image
                    </a>
                  )}
                  {task.videoUrl && (
                    <a
                      href={task.videoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                    >
                      <ExternalLink className="h-3 w-3" />
                      View Video
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: session } = useSession();
  const [projectTitle, setProjectTitle] = useState('');

  // Decode the ID back to the project title
  useEffect(() => {
    const title = id.replace(/-/g, ' ');
    setProjectTitle(title);
  }, [id]);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['tasks', projectTitle],
    queryFn: async () => {
      const response = await fetch(`/api/tasks?project=${encodeURIComponent(projectTitle)}`);
      if (!response.ok) throw new Error('Failed to fetch tasks');
      return response.json();
    },
    enabled: !!session && !!projectTitle,
  });

  const tasks = data?.tasks || [];
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t: Task) => t.status === 'completed').length;
  const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Separate tasks by type
  const imageTasks = tasks.filter((t: Task) => t.stepType === 'image');
  const videoTasks = tasks.filter((t: Task) => t.stepType === 'video');

  if (!session) {
    return (
      <div className="container py-12">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              Please <a href="/login" className="text-primary hover:underline">sign in</a> to view this project.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container py-8">
      <div className="mb-6">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Sidebar */}
        <div className="lg:col-span-1">
          <Card className="sticky top-20">
            <CardHeader>
              <CardTitle className="text-xl">{projectTitle}</CardTitle>
              <CardDescription>
                Content generation progress
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Overall Progress</span>
                  <span className="font-medium">{progress}%</span>
                </div>
                <Progress value={progress} className="h-3" />
              </div>

              <Separator />

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ImageIcon className="h-4 w-4 text-purple-500" />
                    <span className="text-sm">Images</span>
                  </div>
                  <span className="text-sm font-medium">
                    {imageTasks.filter((t: Task) => t.status === 'completed').length}/{imageTasks.length}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Video className="h-4 w-4 text-orange-500" />
                    <span className="text-sm">Videos</span>
                  </div>
                  <span className="text-sm font-medium">
                    {videoTasks.filter((t: Task) => t.status === 'completed').length}/{videoTasks.length}
                  </span>
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <Button variant="outline" className="w-full" onClick={() => refetch()}>
                  Refresh Status
                </Button>
                {progress === 100 && (
                  <Button className="w-full">
                    <Download className="mr-2 h-4 w-4" />
                    Export All
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {isLoading && (
            <div className="space-y-4">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          )}

          {error && (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-destructive">Failed to load tasks. Please try again.</p>
              </CardContent>
            </Card>
          )}

          {!isLoading && tasks.length === 0 && (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">No tasks found for this project.</p>
              </CardContent>
            </Card>
          )}

          {/* Image Tasks */}
          {imageTasks.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <ImageIcon className="h-5 w-5 text-purple-500" />
                Image Generation ({imageTasks.length})
              </h2>
              <div className="space-y-3">
                {imageTasks.map((task: Task) => (
                  <TaskItem key={task.id} task={task} />
                ))}
              </div>
            </div>
          )}

          {/* Video Tasks */}
          {videoTasks.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Video className="h-5 w-5 text-orange-500" />
                Video Generation ({videoTasks.length})
              </h2>
              <div className="space-y-3">
                {videoTasks.map((task: Task) => (
                  <TaskItem key={task.id} task={task} />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
