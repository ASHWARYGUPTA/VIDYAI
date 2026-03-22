/**
 * Study Planner Widget — renders today's plan + week overview.
 * Phase C implementation.
 */
import { callTool } from '../transport';
import { getSession } from '../session';
import type { WidgetOptions } from '../types';

export class PlannerWidget {
  mount(opts: WidgetOptions = {}): void {
    const container = opts.selector ? document.querySelector(opts.selector) : null;
    const target = container || document.body;

    const el = document.createElement('div');
    el.id = 'vidyai-planner';
    el.style.cssText = 'font-family:-apple-system,sans-serif;padding:16px;';
    el.innerHTML = '<p style="color:#6366f1;font-weight:600;">📅 Loading study plan…</p>';
    target.appendChild(el);

    this._load(el);
  }

  private async _load(el: HTMLElement): Promise<void> {
    try {
      const session = getSession();
      const result = await callTool('get_study_plan', {
        student_id: session.studentId || 'embed_student',
      }) as Record<string, unknown>;

      const slots = (result?.slots as unknown[]) || [];
      el.innerHTML = `
        <div style="font-weight:600;font-size:16px;margin-bottom:12px;">📅 Today's Plan</div>
        ${slots.length === 0
          ? '<p style="color:#6b7280;">No slots planned for today.</p>'
          : slots.map((s) => {
              const slot = s as Record<string, unknown>;
              return `<div style="padding:10px 14px;border-radius:8px;background:#f3f4f6;margin-bottom:8px;">
                <strong>${slot.subject || 'Study'}</strong>
                ${slot.chapter ? ` — ${slot.chapter}` : ''}
                <span style="float:right;color:#6b7280;font-size:13px;">${slot.duration_minutes || 60} min</span>
              </div>`;
            }).join('')
        }
        <div style="text-align:center;font-size:11px;color:#9ca3af;margin-top:8px;">
          Powered by <a href="https://vidyai.in" style="color:inherit;" target="_blank">VidyAI</a>
        </div>
      `;
    } catch (err) {
      el.innerHTML = '<p style="color:#ef4444;">Failed to load plan.</p>';
      console.error('[VidyAI Planner]', err);
    }
  }
}
