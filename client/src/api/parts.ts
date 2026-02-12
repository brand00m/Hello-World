import { api } from './client';
import type { Part, PaginatedResponse } from '../types';

export interface PartsQuery {
  search?: string;
  categoryId?: string;
  vendorId?: string;
  manufacturerId?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
}

export function fetchParts(query: PartsQuery = {}) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== '') {
      params.set(key, String(value));
    }
  }
  return api.get<PaginatedResponse<Part>>(`/parts?${params}`);
}

export function fetchPart(id: string) {
  return api.get<Part>(`/parts/${id}`);
}

export function createPart(data: Partial<Part>) {
  return api.post<Part>('/parts', data);
}

export function updatePart(id: string, data: Partial<Part>) {
  return api.put<Part>(`/parts/${id}`, data);
}

export function deletePart(id: string) {
  return api.delete(`/parts/${id}`);
}
