export type PipelineStage =
  | 'idle'
  | 'extracting'
  | 'generating_script'
  | 'assembling_video'
  | 'completed'
  | 'error';

export type StepId =
  | 'reading_url'
  | 'extracting_context'
  | 'generating_blueprint'
  | 'matching_media'
  | 'compositing_video';

export interface PipelineStep {
  id: StepId;
  label: string;
  description: string;
  status: 'pending' | 'active' | 'completed' | 'error';
  startedAt?: number;
  completedAt?: number;
  error?: string;
}

export interface VideoBlueprint {
  hook_text: string;
  gif_search_term: string;
  background_video: string;
  audio_track: string;
  source_url?: string;
  summary?: string;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  createdAt: string;
  detectedUrl?: string;
  stage?: PipelineStage;
  steps?: PipelineStep[];
  activeStepId?: StepId;
  blueprint?: VideoBlueprint;
  videoUrl?: string;
  error?: string;
  retryable?: boolean;
  isStreaming?: boolean;
}

export interface ChatApiResponse {
  reply: string;
  detectedUrl?: string;
  stage?: PipelineStage;
  blueprint?: VideoBlueprint;
  videoUrl?: string;
  error?: string;
}

export interface StreamEvent {
  type: 'step' | 'chat' | 'chat_thinking' | 'complete' | 'error';
  stepId?: StepId;
  step?: PipelineStep;
  message?: string;
  reply?: string;
  detectedUrl?: string;
  blueprint?: VideoBlueprint;
  videoUrl?: string;
  error?: string;
  retryable?: boolean;
}

export interface SavedVideo {
  id: string;
  userId: string;
  userEmail: string;
  userName?: string;
  videoUrl: string;
  detectedUrl: string;
  hookText: string;
  blueprint: VideoBlueprint;
  createdAt: string;
}
