export type Feature = 'tutor' | 'planner' | 'tests' | 'graph' | 'knowledge' | 'content';
export type Theme = 'light' | 'dark';
export type Language = 'en' | 'hi' | 'hinglish';

export interface InitOptions {
  embedToken: string;
  apiUrl?: string;          // defaults to https://api.vidyai.in
  theme?: Theme;
  language?: Language;
  accentColor?: string;     // CSS color, e.g. "#6366f1"
}

export interface VidyAISession {
  embedToken: string;
  apiUrl: string;
  theme: Theme;
  language: Language;
  accentColor: string;
  features: Feature[];
  studentId: string;
}

export interface WidgetOptions {
  selector?: string;        // CSS selector for inline mounting, else floating
  width?: string;
  height?: string;
}

// JSON-RPC 2.0 types
export interface JsonRpcRequest {
  jsonrpc: '2.0';
  method: string;
  params: Record<string, unknown>;
  id: string;
}

export interface JsonRpcResponse {
  jsonrpc: '2.0';
  id: string;
  result?: unknown;
  error?: { code: number; message: string; data?: unknown };
}

export interface TutorMessage {
  role: 'user' | 'assistant';
  content: string;
  sources?: Array<{ title: string; excerpt: string }>;
  timestamp: number;
}
