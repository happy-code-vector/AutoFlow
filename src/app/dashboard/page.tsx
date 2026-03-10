'use client';

import { useQuery } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { PlusCircle, FolderOpen, CheckCircle2, Clock, Loader2 } from 'lucide-react';

interface Project {
  id: string;
  title: string;
  taskCount: number;
  completedTasks: number;
  progress: number;
  status: string;
  createdAt: string;
}

function ProjectCard({ project }: { project: Project }) {
  const statusColors: Record<string, string> = {
    pending: 'bg-yellow-500/10 text-yellow-500',
    processing: 'bg-blue-500/10 text-blue-500',
    completed: 'bg-green-500/10 text-green-500',
  };

  const statusIcons: Record<string, React.ReactNode> = {
    pending: <Clock className="h-3 w-3" />,
    processing: <Loader2 className="h-3 w-3 animate-spin" />,
    completed: <CheckCircle2 className="h-3 w-3" />,
  };

  return (
    <Link href={`/project/${project.id}`}>
      <Card className="hover:border-primary/50 transition-colors cursor-pointer">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <CardTitle className="text-lg font-semibold line-clamp-1">
              {project.title}
            </CardTitle>
            <Badge variant="secondary" className={statusColors[project.status]}>
              <span className="flex items-center gap-1">
                {statusIcons[project.status]}
                {project.status}
              </span>
            </Badge>
          </div>
          <CardDescription>
            {project.taskCount} assets • {project.completedTasks} completed
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-medium">{project.progress}%</span>
            </div>
            <Progress value={project.progress} className="h-2" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function ProjectSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-5 w-16" />
        </div>
        <Skeleton className="h-4 w-24 mt-2" />
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-8" />
          </div>
          <Skeleton className="h-2 w-full" />
        </div>
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const { data: session } = useSession();

  const { data, isLoading, error } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const response = await fetch('/api/projects');
      if (!response.ok) throw new Error('Failed to fetch projects');
      return response.json();
    },
    enabled: !!session,
  });

  if (!session) {
    return (
      <div className="container py-12">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              Please <a href="/login" className="text-primary hover:underline">sign in</a> to view your projects.
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
          <h1 className="text-3xl font-bold">Your Projects</h1>
          <p className="text-muted-foreground">
            Manage your content generation projects
          </p>
        </div>
        <Link href="/create" className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-2.5 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/80">
          <PlusCircle className="h-4 w-4" />
          New Project
        </Link>
      </div>

      {isLoading && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <ProjectSkeleton key={i} />
          ))}
        </div>
      )}

      {error && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-destructive">
              Failed to load projects. Please try again.
            </p>
          </CardContent>
        </Card>
      )}

      {data?.projects?.length === 0 && (
        <Card>
          <CardContent className="py-16 text-center">
            <FolderOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No projects yet</h3>
            <p className="text-muted-foreground mb-4">
              Create your first content project to get started
            </p>
            <Link href="/create" className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-2.5 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/80">
              <PlusCircle className="h-4 w-4" />
              Create Content
            </Link>
          </CardContent>
        </Card>
      )}

      {data?.projects?.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {data.projects.map((project: Project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      )}
    </div>
  );
}
