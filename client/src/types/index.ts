export interface Vendor {
  id: string;
  companyName: string;
  multiplier: number | null;
  contactName: string | null;
  contactEmail: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  phone: string | null;
  netsuiteId: string | null;
  _count?: { parts: number };
}

export interface Manufacturer {
  id: string;
  name: string;
  _count?: { parts: number };
}

export interface PartCategory {
  id: string;
  name: string;
  sortOrder: number;
  _count?: { parts: number };
}

export interface Part {
  id: string;
  description: string;
  model: string;
  manufacturerId: string | null;
  vendorId: string | null;
  categoryId: string | null;
  pointType: string | null;
  listPrice: number | null;
  discountPrice: number | null;
  pricingDate: string | null;
  submittalName: string | null;
  priorityRanking: number | null;
  specSection: string | null;
  isByOthers: boolean;
  manufacturer: Manufacturer | null;
  vendor: Vendor | null;
  category: PartCategory | null;
}

export interface PartDocument {
  id: string;
  partId: string;
  docType: string;
  fileName: string;
  filePath: string;
  fileSize: number | null;
  uploadedAt: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface BomItem {
  id: string;
  projectId: string;
  partId: string;
  quantity: number;
  unitPrice: number | null;
  notes: string | null;
  part: Part;
}

export interface Project {
  id: string;
  jobName: string;
  jobNumber: string | null;
  submittalDate: string | null;
  status: string;
  _count?: { bomItems: number; submittals: number };
  bomItems?: BomItem[];
}
