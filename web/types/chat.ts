export type PipelineStage =
  | 'idle'
  | 'extracting'
  | 'generating_script'
  | 'assembling_video'
  | 'completed'
  | 'error';

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
  blueprint?: VideoBlueprint;
  videoUrl?: string;
  error?: string;
}

export interface ChatApiResponse {
  reply: string;
  detectedUrl?: string;
  stage?: PipelineStage;
  blueprint?: VideoBlueprint;
  videoUrl?: string;
  error?: string;
}
