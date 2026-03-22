/**
 * Knowledge Graph Widget — concept nodes colored by mastery state.
 * Phase C implementation.
 */
import { readResource } from '../transport';
import { getSession } from '../session';
import type { WidgetOptions } from '../types';

const MASTERY_COLORS: Record<string, string> = {
  mastered: '#22c55e',
  reviewing: '#3b82f6',
  learning: '#f59e0b',
  forgotten: '#ef4444',
  unseen: '#d1d5db',
};

export class GraphWidget {
  mount(opts: WidgetOptions = {}): void {
    const container = opts.selector ? document.querySelector(opts.selector) : null;
    const target = container || document.body;

    const el = document.createElement('div');
    el.id = 'vidyai-graph';
    el.style.cssText = 'font-family:-apple-system,sans-serif;padding:16px;';
    el.innerHTML = '<p style="color:#6366f1;font-weight:600;">🧠 Loading knowledge graph…</p>';
    target.appendChild(el);

    this._load(el);
  }

  private async _load(el: HTMLElement): Promise<void> {
    try {
      const session = getSession();
      const result = await readResource(
        `vidyai://student/${session.studentId || 'embed_student'}/knowledge-graph`
      ) as Record<string, unknown>;

      const concepts = (result?.concepts as unknown[]) || [];
      const legend = Object.entries(MASTERY_COLORS).map(([state, color]) =>
        `<span style="display:inline-flex;align-items:center;gap:4px;margin-right:12px;font-size:12px;">
          <span style="width:10px;height:10px;border-radius:50%;background:${color};display:inline-block;"></span>${state}
        </span>`
      ).join('');

      el.innerHTML = `
        <div style="font-weight:600;font-size:16px;margin-bottom:8px;">🧠 Knowledge Graph</div>
        <div style="margin-bottom:12px;">${legend}</div>
        <div style="display:flex;flex-wrap:wrap;gap:8px;">
          ${concepts.slice(0, 60).map((c) => {
            const concept = c as Record<string, unknown>;
            const color = MASTERY_COLORS[concept.mastery_state as string] || MASTERY_COLORS.unseen;
            return `<div title="${concept.concept_name} — ${concept.mastery_state}"
              style="width:12px;height:12px;border-radius:50%;background:${color};cursor:pointer;"
            ></div>`;
          }).join('')}
          ${concepts.length > 60 ? `<span style="color:#6b7280;font-size:12px;align-self:center;">+${concepts.length - 60} more</span>` : ''}
        </div>
        <div style="text-align:center;font-size:11px;color:#9ca3af;margin-top:12px;">
          Powered by <a href="https://vidyai.in" style="color:inherit;" target="_blank">VidyAI</a>
        </div>
      `;
    } catch (err) {
      el.innerHTML = '<p style="color:#ef4444;">Failed to load knowledge graph.</p>';
      console.error('[VidyAI Graph]', err);
    }
  }
}
