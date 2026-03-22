/**
 * Content Processor Widget — YouTube URL → structured notes.
 * Phase C implementation.
 */
import { callTool } from '../transport';
import { getSession } from '../session';
import type { WidgetOptions } from '../types';

export class ContentWidget {
  mount(opts: WidgetOptions = {}): void {
    const container = opts.selector ? document.querySelector(opts.selector) : null;
    const target = container || document.body;

    const el = document.createElement('div');
    el.id = 'vidyai-content';
    el.style.cssText = 'font-family:-apple-system,sans-serif;padding:16px;';
    el.innerHTML = `
      <div style="font-weight:600;font-size:16px;margin-bottom:12px;">🎥 Process Video</div>
      <div style="display:flex;gap:8px;margin-bottom:12px;">
        <input id="vidyai-content-url" type="url" placeholder="Paste YouTube URL…"
          style="flex:1;padding:10px 14px;border:1px solid #d1d5db;border-radius:8px;font-size:14px;outline:none;" />
        <button id="vidyai-content-process"
          style="padding:10px 16px;background:#6366f1;color:#fff;border:none;border-radius:8px;cursor:pointer;">
          Process
        </button>
      </div>
      <div id="vidyai-content-status"></div>
    `;
    target.appendChild(el);

    el.querySelector('#vidyai-content-process')!.addEventListener('click', () => {
      const url = (el.querySelector('#vidyai-content-url') as HTMLInputElement).value.trim();
      if (url) this._process(el.querySelector('#vidyai-content-status')!, url);
    });
  }

  private async _process(area: Element, youtubeUrl: string): Promise<void> {
    area.innerHTML = '<p style="color:#6366f1;">⏳ Processing video (this may take a minute)…</p>';
    try {
      const result = await callTool('process_video', {
        student_id: getSession().studentId || 'embed_student',
        youtube_url: youtubeUrl,
        output_language: getSession().language,
      }) as Record<string, unknown>;

      const jobId = result?.job_id as string;
      area.innerHTML = `
        <div style="background:#f0fdf4;border-radius:8px;padding:14px;border:1px solid #bbf7d0;">
          ✅ Video queued for processing.<br/>
          <span style="font-size:12px;color:#6b7280;">Job ID: ${jobId}</span>
        </div>
      `;
    } catch (err) {
      area.innerHTML = '<p style="color:#ef4444;">Failed to process video.</p>';
      console.error('[VidyAI Content]', err);
    }
  }
}
