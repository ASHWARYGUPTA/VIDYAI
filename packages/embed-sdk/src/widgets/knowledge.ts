/**
 * Knowledge Base Search Widget — search uploaded documents.
 * Phase C implementation.
 */
import { callTool } from '../transport';
import { getSession } from '../session';
import type { WidgetOptions } from '../types';

export class KnowledgeWidget {
  mount(opts: WidgetOptions = {}): void {
    const container = opts.selector ? document.querySelector(opts.selector) : null;
    const target = container || document.body;

    const el = document.createElement('div');
    el.id = 'vidyai-knowledge';
    el.style.cssText = 'font-family:-apple-system,sans-serif;padding:16px;';
    el.innerHTML = `
      <div style="font-weight:600;font-size:16px;margin-bottom:12px;">📚 Knowledge Base</div>
      <div style="display:flex;gap:8px;margin-bottom:12px;">
        <input id="vidyai-kb-query" type="text" placeholder="Search documents…"
          style="flex:1;padding:10px 14px;border:1px solid #d1d5db;border-radius:8px;font-size:14px;outline:none;" />
        <button id="vidyai-kb-search"
          style="padding:10px 16px;background:#6366f1;color:#fff;border:none;border-radius:8px;cursor:pointer;">
          Search
        </button>
      </div>
      <div id="vidyai-kb-results"></div>
    `;
    target.appendChild(el);

    const search = () => {
      const query = (el.querySelector('#vidyai-kb-query') as HTMLInputElement).value.trim();
      if (query) this._search(el.querySelector('#vidyai-kb-results')!, query);
    };

    el.querySelector('#vidyai-kb-search')!.addEventListener('click', search);
    (el.querySelector('#vidyai-kb-query') as HTMLInputElement).addEventListener('keydown', (e) => {
      if (e.key === 'Enter') search();
    });
  }

  private async _search(area: Element, query: string): Promise<void> {
    area.innerHTML = '<p style="color:#6366f1;">Searching…</p>';
    try {
      const result = await callTool('solve_doubt', {
        question: query,
        student_id: getSession().studentId || 'embed_student',
      }) as Record<string, unknown>;

      const answer = (result?.answer as string) || 'No results found.';
      const sources = (result?.sources as Array<Record<string, string>>) || [];

      area.innerHTML = `
        <div style="background:#f3f4f6;border-radius:8px;padding:14px;margin-bottom:8px;line-height:1.6;">
          ${answer}
        </div>
        ${sources.length > 0 ? `
          <div style="font-size:12px;color:#6b7280;">
            📚 Sources: ${sources.map(s => `<strong>${s.title}</strong>`).join(', ')}
          </div>
        ` : ''}
      `;
    } catch (err) {
      area.innerHTML = '<p style="color:#ef4444;">Search failed.</p>';
      console.error('[VidyAI Knowledge]', err);
    }
  }
}
