import { api } from './client';
import type { Vendor } from '../types';

export function fetchVendors(search?: string) {
  const params = search ? `?search=${encodeURIComponent(search)}` : '';
  return api.get<Vendor[]>(`/vendors${params}`);
}

export function fetchVendor(id: string) {
  return api.get<Vendor>(`/vendors/${id}`);
}

export function createVendor(data: Partial<Vendor>) {
  return api.post<Vendor>('/vendors', data);
}

export function updateVendor(id: string, data: Partial<Vendor>) {
  return api.put<Vendor>(`/vendors/${id}`, data);
}

export function deleteVendor(id: string) {
  return api.delete(`/vendors/${id}`);
}
