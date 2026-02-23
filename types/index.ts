import type { Message } from 'ai/react';

export type { FieldId, UserProfile } from '@/lib/prompts';

export interface CustomizableParam {
  id: string;
  label: string;
  type: 'slider' | 'color' | 'toggle' | 'select' | 'text';
  default: string;
  min?: string;
  max?: string;
  options?: string[];
}

export interface GeneratedTool {
  title: string;
  description: string;
  html: string;
  explanation: {
    summary: string;
    mechanism: string;
    usage_hint: string;
  };
  customizable_params: CustomizableParam[];
  academic_advice: string[];
}

export interface SavedTool {
  id: string;
  title: string;
  description: string;
  html: string;
  explanation: GeneratedTool['explanation'];
  field: string;
  createdAt: string;
  author?: string;
}

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  createdAt: string;
  updatedAt: string;
}

export interface ChatInterfaceProps {
  profile: import('@/lib/prompts').UserProfile;
  apiKey: string;
  model: string;
  onApiKeyChange: (key: string) => void;
  onModelChange: (model: string) => void;
  onResetProfile: () => void;
}

export interface StreamingToolProgress {
  title?: string;
  description?: string;
  stage: 'starting' | 'html' | 'explanation' | 'finishing';
  contentLength: number;
}
