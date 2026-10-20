'use server';

import { resolveApiBaseUrl } from '../lib/api-client';

export async function searchViaMCP(query: string, categories: string[] = ['code']) {
  try {
    const response = await fetch(`${resolveApiBaseUrl()}/api/mcp/query`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ query, categories, per_page: 20 }),
      cache: 'no-store',
    });
    const payload = await response.json();
    return { success: response.ok, data: payload.data ?? payload, error: payload.error?.message };
  } catch (error: any) {
    console.error('[MCP] Search failed:', error);
    return { success: false, error: error.message };
  }
}

export async function analyzeGraphViaMCP(query: string) {
  try {
    const response = await fetch(`${resolveApiBaseUrl()}/api/mcp/query`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ query, categories: ['code'], per_page: 20 }),
      cache: 'no-store',
    });
    const payload = await response.json();
    return { success: response.ok, data: payload.data ?? payload, error: payload.error?.message };
  } catch (error: any) {
    console.error('[MCP] Graph analysis failed:', error);
    return { success: false, error: error.message };
  }
}
