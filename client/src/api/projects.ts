import { api } from './client';
import type { Project, BomItem } from '../types';

export function fetchProjects() {
  return api.get<Project[]>('/projects');
}

export function fetchProject(id: string) {
  return api.get<Project>(`/projects/${id}`);
}

export function createProject(data: { jobName: string; jobNumber?: string; submittalDate?: string }) {
  return api.post<Project>('/projects', data);
}

export function updateProject(id: string, data: Partial<Project>) {
  return api.put<Project>(`/projects/${id}`, data);
}

export function deleteProject(id: string) {
  return api.delete(`/projects/${id}`);
}

export function addBomItem(projectId: string, data: { partId: string; quantity: number; unitPrice?: number; notes?: string }) {
  return api.post<BomItem>(`/projects/${projectId}/bom`, data);
}

export function updateBomItem(projectId: string, bomItemId: string, data: Partial<BomItem>) {
  return api.put<BomItem>(`/projects/${projectId}/bom/${bomItemId}`, data);
}

export function deleteBomItem(projectId: string, bomItemId: string) {
  return api.delete(`/projects/${projectId}/bom/${bomItemId}`);
}
