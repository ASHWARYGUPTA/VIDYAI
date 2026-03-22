/**
 * JSON-RPC 2.0 transport layer.
 * Sends requests to the VidyAI MCP server and handles SSE streaming responses.
 */
import { getSession } from './session';
import type { JsonRpcRequest, JsonRpcResponse } from './types';

let _requestId = 1;

function nextId(): string {
  return String(_requestId++);
}

/**
 * Call an MCP tool and return the full result (non-streaming).
 */
export async function callTool(
  toolName: string,
  params: Record<string, unknown>
): Promise<unknown> {
  const session = getSession();
  const body: JsonRpcRequest = {
    jsonrpc: '2.0',
    method: `tools/call`,
    params: { name: toolName, arguments: params },
    id: nextId(),
  };

  const res = await fetch(`${session.apiUrl}/mcp`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.embedToken}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `HTTP ${res.status}`);
  }

  const data: JsonRpcResponse = await res.json();
  if (data.error) {
    throw new Error(data.error.message || 'MCP error');
  }
  return data.result;
}

/**
 * Call an MCP tool and stream the response token-by-token via SSE.
 * onChunk is called for each streamed text fragment.
 * onDone is called with the final result object when streaming ends.
 */
export function callToolStreaming(
  toolName: string,
  params: Record<string, unknown>,
  onChunk: (text: string) => void,
  onDone: (result: unknown) => void,
  onError: (err: Error) => void
): () => void {
  const session = getSession();
  const id = nextId();
  const body: JsonRpcRequest = {
    jsonrpc: '2.0',
    method: 'tools/call',
    params: { name: toolName, arguments: params },
    id,
  };

  // SSE via POST — send request body, server streams back events
  const controller = new AbortController();

  (async () => {
    try {
      const res = await fetch(`${session.apiUrl}/mcp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.embedToken}`,
          Accept: 'text/event-stream',
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!res.ok || !res.body) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error?.message || `HTTP ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let finalResult: unknown = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim() || line.startsWith(':')) continue;
          if (line.startsWith('data: ')) {
            const raw = line.slice(6).trim();
            if (raw === '[DONE]') continue;
            try {
              const event = JSON.parse(raw);
              if (event.type === 'chunk') {
                onChunk(event.text || '');
              } else if (event.type === 'result') {
                finalResult = event.result;
              }
            } catch {
              // non-JSON SSE line — treat as text chunk
              onChunk(raw);
            }
          }
        }
      }

      onDone(finalResult);
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        onError(err as Error);
      }
    }
  })();

  // Return cancel function
  return () => controller.abort();
}

/**
 * Read an MCP resource (e.g. student profile, syllabus graph).
 */
export async function readResource(uri: string): Promise<unknown> {
  const session = getSession();
  const body: JsonRpcRequest = {
    jsonrpc: '2.0',
    method: 'resources/read',
    params: { uri },
    id: nextId(),
  };

  const res = await fetch(`${session.apiUrl}/mcp`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.embedToken}`,
    },
    body: JSON.stringify(body),
  });

  const data: JsonRpcResponse = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data.result;
}
