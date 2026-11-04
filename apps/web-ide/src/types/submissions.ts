export interface UserSubmissionRecord {
  id: string;
  userId: string;
  exerciseId: string;
  status: 'passed' | 'failed' | 'compile_error';
  score: number;
  files: Record<string, string>;
  stagesSummary?: Array<{
    id: string;
    title: string;
    status: 'passed' | 'failed';
    timeMs?: number;
    details?: string;
  }>;
  durationMs: number;
  createdAt: string;
}

