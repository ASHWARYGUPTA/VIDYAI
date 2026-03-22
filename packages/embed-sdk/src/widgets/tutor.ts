/**
 * AI Tutor Widget
 * Renders a floating chat bubble (or inline panel) powered by solve_doubt MCP tool.
 * Zero dependencies — pure DOM manipulation.
 */
import { getSession } from '../session';
import { callToolStreaming } from '../transport';
import type { TutorMessage, WidgetOptions } from '../types';

const WIDGET_ID = 'vidyai-tutor';

const CSS = `
#vidyai-tutor-bubble {
  position: fixed;
  bottom: 24px;
  right: 24px;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: var(--vidyai-accent, #6366f1);
  color: #fff;
  border: none;
  cursor: pointer;
  box-shadow: 0 4px 20px rgba(0,0,0,0.18);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9998;
  transition: transform 0.15s ease;
  font-size: 24px;
}
#vidyai-tutor-bubble:hover { transform: scale(1.08); }

#vidyai-tutor-panel {
  position: fixed;
  bottom: 92px;
  right: 24px;
  width: 380px;
  max-width: calc(100vw - 48px);
  height: 560px;
  max-height: calc(100vh - 120px);
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 8px 40px rgba(0,0,0,0.16);
  display: flex;
  flex-direction: column;
  z-index: 9999;
  overflow: hidden;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  font-size: 14px;
}
#vidyai-tutor-panel.vidyai-dark {
  background: #1a1a2e;
  color: #e0e0e0;
}

.vidyai-header {
  padding: 16px 18px;
  background: var(--vidyai-accent, #6366f1);
  color: #fff;
  display: flex;
  align-items: center;
  gap: 10px;
  font-weight: 600;
  font-size: 15px;
}
.vidyai-header-close {
  margin-left: auto;
  background: rgba(255,255,255,0.2);
  border: none;
  color: #fff;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  cursor: pointer;
  font-size: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.vidyai-messages {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.vidyai-msg {
  max-width: 88%;
  padding: 10px 14px;
  border-radius: 12px;
  line-height: 1.5;
  word-break: break-word;
}
.vidyai-msg.user {
  background: var(--vidyai-accent, #6366f1);
  color: #fff;
  align-self: flex-end;
  border-bottom-right-radius: 4px;
}
.vidyai-msg.assistant {
  background: #f3f4f6;
  color: #1f2937;
  align-self: flex-start;
  border-bottom-left-radius: 4px;
}
#vidyai-tutor-panel.vidyai-dark .vidyai-msg.assistant {
  background: #2d2d4e;
  color: #e0e0e0;
}
.vidyai-msg.thinking {
  opacity: 0.6;
  font-style: italic;
}
.vidyai-sources {
  margin-top: 6px;
  padding-top: 6px;
  border-top: 1px solid rgba(0,0,0,0.08);
  font-size: 12px;
  color: #6b7280;
}
.vidyai-sources a { color: var(--vidyai-accent, #6366f1); text-decoration: none; }

.vidyai-input-row {
  padding: 12px 14px;
  border-top: 1px solid #e5e7eb;
  display: flex;
  gap: 8px;
  align-items: flex-end;
}
#vidyai-tutor-panel.vidyai-dark .vidyai-input-row {
  border-top-color: #3d3d5c;
}
.vidyai-input {
  flex: 1;
  border: 1px solid #d1d5db;
  border-radius: 10px;
  padding: 10px 14px;
  resize: none;
  font-size: 14px;
  font-family: inherit;
  outline: none;
  max-height: 120px;
  min-height: 40px;
  background: #fff;
  color: #1f2937;
}
#vidyai-tutor-panel.vidyai-dark .vidyai-input {
  background: #2d2d4e;
  border-color: #4a4a7c;
  color: #e0e0e0;
}
.vidyai-input:focus { border-color: var(--vidyai-accent, #6366f1); }
.vidyai-send {
  background: var(--vidyai-accent, #6366f1);
  color: #fff;
  border: none;
  border-radius: 10px;
  padding: 10px 14px;
  cursor: pointer;
  font-size: 18px;
  transition: opacity 0.15s;
}
.vidyai-send:disabled { opacity: 0.4; cursor: default; }

.vidyai-powered {
  text-align: center;
  font-size: 11px;
  color: #9ca3af;
  padding: 6px 0 10px;
}
.vidyai-powered a { color: inherit; text-decoration: none; }
`;

export class TutorWidget {
  private messages: TutorMessage[] = [];
  private isOpen = false;
  private isThinking = false;
  private cancelStream: (() => void) | null = null;

  mount(opts: WidgetOptions = {}): void {
    if (document.getElementById(WIDGET_ID)) return; // already mounted

    this._injectCSS();
    const session = getSession();
    document.documentElement.style.setProperty('--vidyai-accent', session.accentColor);

    if (opts.selector) {
      this._mountInline(opts.selector);
    } else {
      this._mountFloating();
    }
  }

  unmount(): void {
    document.getElementById('vidyai-tutor-bubble')?.remove();
    document.getElementById('vidyai-tutor-panel')?.remove();
    document.getElementById('vidyai-tutor-styles')?.remove();
    this.cancelStream?.();
  }

  private _injectCSS(): void {
    if (document.getElementById('vidyai-tutor-styles')) return;
    const style = document.createElement('style');
    style.id = 'vidyai-tutor-styles';
    style.textContent = CSS;
    document.head.appendChild(style);
  }

  private _mountFloating(): void {
    // Bubble button
    const bubble = document.createElement('button');
    bubble.id = 'vidyai-tutor-bubble';
    bubble.title = 'Ask VidyAI Tutor';
    bubble.innerHTML = '🎓';
    bubble.addEventListener('click', () => this._toggle());
    document.body.appendChild(bubble);

    // Panel (hidden initially)
    const panel = this._createPanel();
    panel.style.display = 'none';
    document.body.appendChild(panel);
  }

  private _mountInline(selector: string): void {
    const container = document.querySelector(selector);
    if (!container) {
      console.warn(`[VidyAI] Tutor selector "${selector}" not found.`);
      return;
    }
    const panel = this._createPanel();
    panel.style.position = 'relative';
    panel.style.bottom = 'auto';
    panel.style.right = 'auto';
    panel.style.width = '100%';
    panel.style.height = '100%';
    panel.style.boxShadow = 'none';
    panel.style.borderRadius = '12px';
    container.appendChild(panel);
    this.isOpen = true;
  }

  private _createPanel(): HTMLElement {
    const session = getSession();
    const panel = document.createElement('div');
    panel.id = 'vidyai-tutor-panel';
    if (session.theme === 'dark') panel.classList.add('vidyai-dark');

    panel.innerHTML = `
      <div class="vidyai-header">
        <span>🎓</span>
        <span>VidyAI Tutor</span>
        <button class="vidyai-header-close" title="Close">✕</button>
      </div>
      <div class="vidyai-messages" id="vidyai-msgs">
        <div class="vidyai-msg assistant">
          👋 Hi! I'm your AI tutor. Ask me any doubt about Physics, Chemistry, or Maths.
        </div>
      </div>
      <div class="vidyai-input-row">
        <textarea
          class="vidyai-input"
          id="vidyai-tutor-input"
          placeholder="Type your doubt..."
          rows="1"
        ></textarea>
        <button class="vidyai-send" id="vidyai-tutor-send" title="Send">➤</button>
      </div>
      <div class="vidyai-powered">
        Powered by <a href="https://vidyai.in" target="_blank" rel="noopener">VidyAI</a>
      </div>
    `;

    panel.querySelector('.vidyai-header-close')!.addEventListener('click', () => this._close());
    panel.querySelector('#vidyai-tutor-send')!.addEventListener('click', () => this._send());

    const input = panel.querySelector('#vidyai-tutor-input') as HTMLTextAreaElement;
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this._send();
      }
    });
    input.addEventListener('input', () => {
      input.style.height = 'auto';
      input.style.height = Math.min(input.scrollHeight, 120) + 'px';
    });

    return panel;
  }

  private _toggle(): void {
    this.isOpen ? this._close() : this._open();
  }

  private _open(): void {
    const panel = document.getElementById('vidyai-tutor-panel');
    if (panel) panel.style.display = 'flex';
    this.isOpen = true;
    setTimeout(() => (document.getElementById('vidyai-tutor-input') as HTMLTextAreaElement)?.focus(), 50);
  }

  private _close(): void {
    const panel = document.getElementById('vidyai-tutor-panel');
    if (panel) panel.style.display = 'none';
    this.isOpen = false;
  }

  private _send(): void {
    if (this.isThinking) return;
    const input = document.getElementById('vidyai-tutor-input') as HTMLTextAreaElement;
    const question = input.value.trim();
    if (!question) return;

    input.value = '';
    input.style.height = 'auto';
    this._addMessage('user', question);
    this._askTutor(question);
  }

  private _addMessage(role: 'user' | 'assistant', content: string, sources?: TutorMessage['sources']): HTMLElement {
    const msgs = document.getElementById('vidyai-msgs')!;
    const div = document.createElement('div');
    div.className = `vidyai-msg ${role}`;
    div.textContent = content;

    if (sources && sources.length > 0) {
      const srcDiv = document.createElement('div');
      srcDiv.className = 'vidyai-sources';
      srcDiv.innerHTML = '📚 ' + sources.slice(0, 3).map(s =>
        `<a href="#" title="${s.excerpt}">${s.title}</a>`
      ).join(' · ');
      div.appendChild(srcDiv);
    }

    msgs.appendChild(div);
    msgs.scrollTop = msgs.scrollHeight;

    this.messages.push({ role, content, sources, timestamp: Date.now() });
    return div;
  }

  private _askTutor(question: string): void {
    const session = getSession();
    this.isThinking = true;
    const sendBtn = document.getElementById('vidyai-tutor-send') as HTMLButtonElement;
    if (sendBtn) sendBtn.disabled = true;

    // Streaming assistant bubble
    const msgs = document.getElementById('vidyai-msgs')!;
    const bubble = document.createElement('div');
    bubble.className = 'vidyai-msg assistant thinking';
    bubble.textContent = '…';
    msgs.appendChild(bubble);
    msgs.scrollTop = msgs.scrollHeight;

    let fullText = '';

    this.cancelStream = callToolStreaming(
      'solve_doubt',
      {
        question,
        student_id: session.studentId || 'embed_student',
        language: session.language,
      },
      (chunk) => {
        // Stream chunk arrived
        if (bubble.classList.contains('thinking')) {
          bubble.classList.remove('thinking');
          bubble.textContent = '';
        }
        fullText += chunk;
        bubble.textContent = fullText;
        msgs.scrollTop = msgs.scrollHeight;
      },
      (result) => {
        // Stream complete
        bubble.classList.remove('thinking');
        if (!fullText && result) {
          // Non-streaming response — extract text from result
          const r = result as Record<string, unknown>;
          fullText = (r.answer as string) || JSON.stringify(result);
          bubble.textContent = fullText;
        }

        // Attach sources if present
        const r = result as Record<string, unknown>;
        const sources = r?.sources as TutorMessage['sources'];
        if (sources && sources.length > 0) {
          const srcDiv = document.createElement('div');
          srcDiv.className = 'vidyai-sources';
          srcDiv.innerHTML = '📚 ' + sources.slice(0, 3).map((s) =>
            `<span title="${(s as Record<string, string>).excerpt}">${(s as Record<string, string>).title}</span>`
          ).join(' · ');
          bubble.appendChild(srcDiv);
        }

        this.messages.push({ role: 'assistant', content: fullText, sources, timestamp: Date.now() });
        this._finishThinking(sendBtn);
      },
      (err) => {
        bubble.classList.remove('thinking');
        bubble.textContent = '⚠️ Something went wrong. Please try again.';
        console.error('[VidyAI Tutor]', err);
        this._finishThinking(sendBtn);
      }
    );
  }

  private _finishThinking(sendBtn: HTMLButtonElement | null): void {
    this.isThinking = false;
    this.cancelStream = null;
    if (sendBtn) sendBtn.disabled = false;
    setTimeout(() => (document.getElementById('vidyai-tutor-input') as HTMLTextAreaElement)?.focus(), 50);
  }
}
