import { api } from './client';

export interface Submittal {
  id: string;
  projectId: string;
  title: string;
  status: string;
  generatedAt: string | null;
  project?: { jobName: string; jobNumber: string | null };
  sections: SubmittalSection[];
}

export interface SubmittalSection {
  id: string;
  submittalId: string;
  title: string;
  categoryId: string | null;
  sortOrder: number;
  category: { id: string; name: string } | null;
  items: SubmittalItem[];
}

export interface SubmittalItem {
  id: string;
  sectionId: string;
  partId: string;
  sortOrder: number;
  specOverride: string | null;
  part: {
    id: string;
    description: string;
    model: string;
    specSection: string | null;
    submittalName: string | null;
    manufacturer: { name: string } | null;
    vendor: { companyName: string } | null;
    category: { name: string } | null;
  };
}

export function fetchProjectSubmittals(projectId: string) {
  return api.get<Submittal[]>(`/submittals/project/${projectId}`);
}

export function fetchSubmittal(id: string) {
  return api.get<Submittal>(`/submittals/${id}`);
}

export function createSubmittal(data: { projectId: string; title: string }) {
  return api.post<Submittal>('/submittals', data);
}

export function updateSubmittal(id: string, data: Partial<Submittal>) {
  return api.put<Submittal>(`/submittals/${id}`, data);
}

export function deleteSubmittal(id: string) {
  return api.delete(`/submittals/${id}`);
}

export function addSection(submittalId: string, data: { title: string; categoryId?: string }) {
  return api.post<SubmittalSection>(`/submittals/${submittalId}/sections`, data);
}

export function updateSection(submittalId: string, sectionId: string, data: Partial<SubmittalSection>) {
  return api.put<SubmittalSection>(`/submittals/${submittalId}/sections/${sectionId}`, data);
}

export function deleteSection(submittalId: string, sectionId: string) {
  return api.delete(`/submittals/${submittalId}/sections/${sectionId}`);
}

export function addItemToSection(submittalId: string, sectionId: string, data: { partId: string; specOverride?: string }) {
  return api.post<SubmittalItem>(`/submittals/${submittalId}/sections/${sectionId}/items`, data);
}

export function removeItemFromSection(submittalId: string, sectionId: string, itemId: string) {
  return api.delete(`/submittals/${submittalId}/sections/${sectionId}/items/${itemId}`);
}

export function populateFromBom(submittalId: string) {
  return api.post<Submittal>(`/submittals/${submittalId}/populate`, {});
}
