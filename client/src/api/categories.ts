import { api } from './client';
import type { PartCategory } from '../types';

export function fetchCategories() {
  return api.get<PartCategory[]>('/categories');
}

export function createCategory(data: { name: string; sortOrder?: number }) {
  return api.post<PartCategory>('/categories', data);
}

export function updateCategory(id: string, data: { name?: string; sortOrder?: number }) {
  return api.put<PartCategory>(`/categories/${id}`, data);
}

export function deleteCategory(id: string) {
  return api.delete(`/categories/${id}`);
}
