import { api } from './client';
import type { Manufacturer } from '../types';

export function fetchManufacturers(search?: string) {
  const params = search ? `?search=${encodeURIComponent(search)}` : '';
  return api.get<Manufacturer[]>(`/manufacturers${params}`);
}

export function createManufacturer(data: { name: string }) {
  return api.post<Manufacturer>('/manufacturers', data);
}

export function updateManufacturer(id: string, data: { name: string }) {
  return api.put<Manufacturer>(`/manufacturers/${id}`, data);
}

export function deleteManufacturer(id: string) {
  return api.delete(`/manufacturers/${id}`);
}
