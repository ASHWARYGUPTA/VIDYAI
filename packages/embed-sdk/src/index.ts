/**
 * VidyAI Embed SDK
 * =================
 * Drop-in learning engine for any course maker website.
 *
 * Quick Start:
 *   <script src="https://cdn.vidyai.in/embed.js"></script>
 *   <script>
 *     // 1. Get embed_token from YOUR backend (server-to-server call)
 *     VidyAI.init({ embedToken: 'et_...' });
 *
 *     // 2. Mount widgets anywhere on the page
 *     VidyAI.tutor();                          // floating bubble (bottom-right)
 *     VidyAI.tutor({ selector: '#my-div' });   // inline panel
 *     VidyAI.planner({ selector: '#plan' });
 *     VidyAI.tests({ selector: '#mcq-area' });
 *     VidyAI.graph({ selector: '#graph-div' });
 *     VidyAI.knowledge({ selector: '#search' });
 *     VidyAI.content({ selector: '#video' });
 *   </script>
 */

import { initSession } from './session';
import { TutorWidget } from './widgets/tutor';
import { PlannerWidget } from './widgets/planner';
import { TestsWidget } from './widgets/tests';
import { GraphWidget } from './widgets/graph';
import { KnowledgeWidget } from './widgets/knowledge';
import { ContentWidget } from './widgets/content';
import type { InitOptions, WidgetOptions } from './types';

export type { InitOptions, WidgetOptions };

// Singleton widget instances (one per feature)
let _tutorWidget: TutorWidget | null = null;
let _initialized = false;

const VidyAI = {
  /**
   * Initialize the SDK. Must be called before mounting any widget.
   * @param opts.embedToken  Short-lived token from your backend (POST /api/v1/embed/session)
   * @param opts.theme       'light' (default) | 'dark'
   * @param opts.language    'en' (default) | 'hi' | 'hinglish'
   * @param opts.accentColor CSS color, e.g. '#6366f1'
   * @param opts.apiUrl      Override API base URL (default: https://api.vidyai.in)
   */
  init(opts: InitOptions): void {
    initSession(opts);
    _initialized = true;
    console.info('[VidyAI] Initialized. Ready to mount widgets.');
  },

  /** AI Tutor — floating chat bubble or inline panel */
  tutor(opts: WidgetOptions = {}): TutorWidget {
    _assertInit();
    if (!_tutorWidget) _tutorWidget = new TutorWidget();
    _tutorWidget.mount(opts);
    return _tutorWidget;
  },

  /** Study Planner — today's slots + week overview */
  planner(opts: WidgetOptions = {}): PlannerWidget {
    _assertInit();
    const w = new PlannerWidget();
    w.mount(opts);
    return w;
  },

  /** MCQ / PYQ Tests — adaptive test launcher */
  tests(opts: WidgetOptions = {}): TestsWidget {
    _assertInit();
    const w = new TestsWidget();
    w.mount(opts);
    return w;
  },

  /** Knowledge Graph — concept nodes colored by mastery state */
  graph(opts: WidgetOptions = {}): GraphWidget {
    _assertInit();
    const w = new GraphWidget();
    w.mount(opts);
    return w;
  },

  /** Knowledge Base Search — search uploaded documents via RAG */
  knowledge(opts: WidgetOptions = {}): KnowledgeWidget {
    _assertInit();
    const w = new KnowledgeWidget();
    w.mount(opts);
    return w;
  },

  /** Content Processor — YouTube URL → structured notes */
  content(opts: WidgetOptions = {}): ContentWidget {
    _assertInit();
    const w = new ContentWidget();
    w.mount(opts);
    return w;
  },

  /** Destroy all widgets and clear session (call on logout) */
  destroy(): void {
    _tutorWidget?.unmount();
    _tutorWidget = null;
    _initialized = false;
    console.info('[VidyAI] Destroyed.');
  },

  /** SDK version */
  version: '0.1.0',
};

function _assertInit(): void {
  if (!_initialized) {
    throw new Error('[VidyAI] Call VidyAI.init({ embedToken }) before mounting widgets.');
  }
}

export default VidyAI;

// Also expose on window for <script> tag usage
if (typeof window !== 'undefined') {
  (window as unknown as Record<string, unknown>).VidyAI = VidyAI;
}
