/**
 * MCQ / PYQ Test Widget — launches adaptive tests.
 * Phase C implementation.
 */
import { callTool } from '../transport';
import { getSession } from '../session';
import type { WidgetOptions } from '../types';

export class TestsWidget {
  mount(opts: WidgetOptions = {}): void {
    const container = opts.selector ? document.querySelector(opts.selector) : null;
    const target = container || document.body;

    const el = document.createElement('div');
    el.id = 'vidyai-tests';
    el.style.cssText = 'font-family:-apple-system,sans-serif;padding:16px;';
    el.innerHTML = `
      <div style="font-weight:600;font-size:16px;margin-bottom:12px;">📝 Practice Test</div>
      <select id="vidyai-test-subject" style="padding:8px;border-radius:8px;border:1px solid #d1d5db;margin-right:8px;">
        <option value="Physics">Physics</option>
        <option value="Chemistry">Chemistry</option>
        <option value="Mathematics">Mathematics</option>
      </select>
      <button id="vidyai-test-start" style="padding:8px 18px;background:#6366f1;color:#fff;border:none;border-radius:8px;cursor:pointer;">
        Start Test
      </button>
      <div id="vidyai-test-area" style="margin-top:16px;"></div>
    `;
    target.appendChild(el);

    el.querySelector('#vidyai-test-start')!.addEventListener('click', () => {
      const subject = (el.querySelector('#vidyai-test-subject') as HTMLSelectElement).value;
      this._startTest(el.querySelector('#vidyai-test-area')!, subject);
    });
  }

  private async _startTest(area: Element, subject: string): Promise<void> {
    area.innerHTML = '<p style="color:#6366f1;">Loading questions…</p>';
    try {
      const session = getSession();
      const result = await callTool('run_mcq_test', {
        student_id: session.studentId || 'embed_student',
        subject,
        count: 5,
        mode: 'practice',
      }) as Record<string, unknown>;

      const questions = (result?.questions as unknown[]) || [];
      area.innerHTML = questions.length === 0
        ? '<p style="color:#6b7280;">No questions available.</p>'
        : `<p style="color:#6b7280;">${questions.length} questions loaded. Full test UI — Phase C.</p>`;
    } catch (err) {
      area.innerHTML = '<p style="color:#ef4444;">Failed to load test.</p>';
      console.error('[VidyAI Tests]', err);
    }
  }
}
