import { getApiUrl } from '../config/api';
import type { Template, TemplateInput } from '../types/webscraper';

const API_BASE_URL = getApiUrl('webscraper').replace(/\/$/, '');

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    const message = payload?.error || `HTTP error! status: ${response.status}`;
    throw new Error(message);
  }
  const json = (await response.json()) as ApiResponse<T>;
  if (json.success === false || !json.data) {
    throw new Error(json.error || 'Unexpected API response');
  }
  return json.data;
}

export const webscraperTemplateService = {
  async list(): Promise<Template[]> {
    const response = await fetch(`${API_BASE_URL}/templates`, {
      headers: { Accept: 'application/json' },
    });
    return handleResponse<Template[]>(response);
  },

  async create(payload: TemplateInput): Promise<Template> {
    const response = await fetch(`${API_BASE_URL}/templates`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
    });
    return handleResponse<Template>(response);
  },

  async update(id: string, payload: TemplateInput): Promise<Template> {
    const response = await fetch(`${API_BASE_URL}/templates/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
    });
    return handleResponse<Template>(response);
  },

  async remove(id: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/templates/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      const message = payload?.error || `HTTP error! status: ${response.status}`;
      throw new Error(message);
    }
  },

  async importMany(payload: TemplateInput[]): Promise<Template[]> {
    const response = await fetch(`${API_BASE_URL}/templates/import`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
    });
    return handleResponse<Template[]>(response);
  },

  async exportAll(): Promise<Template[]> {
    const response = await fetch(`${API_BASE_URL}/templates/export`, {
      headers: { Accept: 'application/json' },
    });
    return handleResponse<Template[]>(response);
  },
};
