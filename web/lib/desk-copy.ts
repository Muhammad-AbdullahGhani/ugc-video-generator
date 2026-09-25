import { ChatMessage, StepId } from '@/types/chat';

const STATUS: Record<StepId, string> = {
  reading_url: 'Reading the page',
  extracting_context: 'Working out what it is',
  generating_blueprint: 'Writing the line',
  matching_media: 'Picking picture, sound, and gif',
  compositing_video: 'Assembling the reel',
  validating_video: 'Checking the length',
};

const KNOWN_FILES: Record<string, string> = {
  'fitness_cardio.mp4': 'Cardio floor',
  'fitness_workout.mp4': 'Weight room',
  'food_culinary.mp4': 'Kitchen',
  'saas_dev_ide.mp4': 'Editor',
  'saas_dev_terminal.mp4': 'Terminal',
  'tech_abstract.mp4': 'Abstract light',
  'mixkit-driving-ambition-32.mp3': 'Driving ambition',
  'mixkit-hip-hop-02-738.mp3': 'Hip hop',
  'mixkit-sun-and-his-daughter-580.mp3': 'Sun and his daughter',
  'mind-blown.gif': 'Mind blown',
  'shocked.gif': 'Shocked',
  'celebration.gif': 'Celebration',
  'money.gif': 'Money',
  'confused.gif': 'Confused',
  'focused-nod.gif': 'Nod',
  'typing-fast.gif': 'Typing',
};

export function hostLabel(url?: string | null): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  try {
    const withProto = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    return new URL(withProto).host.replace(/^www\./, '');
  } catch {
    return trimmed.replace(/^https?:\/\//i, '').split('/')[0] || null;
  }
}

export function prettyAsset(value?: string | null): string | null {
  if (!value) return null;
  const base = value.split(/[/\\]/).pop() || value;
  if (KNOWN_FILES[base]) return KNOWN_FILES[base];
  if (/^\d{5,}/.test(base)) return 'Vertical clip';
  if (/\.(mp4|mp3|gif|webm|webp)$/i.test(base)) {
    return base
      .replace(/\.[a-z0-9]+$/i, '')
      .replace(/^mixkit[-_]/i, '')
      .replace(/[-_]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }
  return value.trim();
}

export function isReelMessage(message: ChatMessage): boolean {
  return (
    message.sender === 'assistant' &&
    (!!message.videoUrl ||
      !!message.blueprint ||
      !!message.detectedUrl ||
      (!!message.steps && message.steps.length > 0))
  );
}

export function deskStatus(message: ChatMessage | null): string {
  if (!message) return 'No reel yet';
  if (message.error && !message.videoUrl) return 'Stopped';
  if (message.videoUrl && !message.isStreaming) {
    return hostLabel(message.detectedUrl) || 'Ready';
  }
  const active =
    message.steps?.find((step) => step.status === 'active') ||
    message.steps?.find((step) => step.id === message.activeStepId);
  if (active && STATUS[active.id]) return STATUS[active.id];
  if (message.isStreaming) return 'Starting';
  return hostLabel(message.detectedUrl) || 'No reel yet';
}

export function isCutting(message: ChatMessage | null): boolean {
  if (!message || message.videoUrl || message.error) return false;
  return !!message.isStreaming || !!message.steps?.some((step) => step.status === 'active');
}

export function readableReply(text: string): string {
  return text
    .replace(/\*\*|__/g, '')
    .replace(/`/g, '')
    .replace(/[🎬💡📊🎨⚡✓]/g, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
