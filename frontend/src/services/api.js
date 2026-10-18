/**
 * AlgoVoice API Client
 * Connects frontend with FastAPI backend endpoints.
 */

const BASE_URL = ''; // Relative URLs will be proxied by Vite or served from same origin

export async function fetchHealth() {
  const res = await fetch(`${BASE_URL}/api/health`);
  if (!res.ok) throw new Error(`Health check failed: ${res.statusText}`);
  return await res.json();
}

export async function fetchPresets() {
  const res = await fetch(`${BASE_URL}/api/presets`);
  if (!res.ok) throw new Error(`Failed to load presets: ${res.statusText}`);
  return await res.json();
}

export async function fetchHistory() {
  const res = await fetch(`${BASE_URL}/api/history`);
  if (!res.ok) throw new Error(`Failed to load history: ${res.statusText}`);
  return await res.json();
}

export async function generateQuickVoice({ text, instruct, language = "English" }) {
  const res = await fetch(`${BASE_URL}/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, instruct, language })
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || 'Voice generation failed');
  }

  return await res.json();
}

export async function previewDocument({ file, rawText }) {
  const formData = new FormData();
  if (file) {
    formData.append('file', file);
  }
  if (rawText) {
    formData.append('raw_text_input', rawText);
  }

  const res = await fetch(`${BASE_URL}/api/document/preview`, {
    method: 'POST',
    body: formData
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || 'Document preview failed');
  }

  return await res.json();
}

export async function generateFromScript({ script, instruct = "", language = "English", title = "Audiobook" }) {
  const res = await fetch(`${BASE_URL}/api/script/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ script, instruct, language, title })
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || 'Audiobook generation failed');
  }

  return await res.json();
}

export async function generateDocumentDirect({ file, instruct = "", language = "English" }) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('instruct', instruct);
  formData.append('language', language);

  const res = await fetch(`${BASE_URL}/generate-document`, {
    method: 'POST',
    body: formData
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || 'Document generation failed');
  }

  return await res.json();
}

export async function analyzeVoiceText(text) {
  const res = await fetch(`${BASE_URL}/api/analyze-voice`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text })
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || 'Voice analysis failed');
  }

  return await res.json();
}
