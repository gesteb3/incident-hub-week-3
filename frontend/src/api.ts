const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000/api';

export type Incident = {
  id: string;
  title: string;
  description: string;
  status: 'NUEVO' | 'ASIGNADO' | 'EN_PROCESO' | 'RESUELTO' | 'CERRADO';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  createdAt: string;
  category: { id: string; name: string };
  reporter: { id: string; name: string };
  technician: { id: string; name: string } | null;
};

export type IncidentComment = {
  id: string;
  incidentId: string;
  authorId: string;
  content: string;
  createdAt: string;
  author: { id: string; name: string; role: string };
};

export type User = { id: string; name: string; role: 'REQUESTER' | 'TECHNICIAN' | 'ADMIN' };

export type IncidentFilters = {
  status?: Incident['status'];
  priority?: Incident['priority'];
  categoryId?: string;
  technicianId?: string;
  reporterId?: string;
};

export type Pagination = { page: number; limit: number; total: number; totalPages: number };
export type Catalogs = {
  categories: { id: string; name: string }[];
  technicians: { id: string; name: string }[];
  users: User[];
};

export type IncidentMetrics = {
  total: number;
  open: number;
  resolved: number;
  closed: number;
  critical: number;
  byStatus: { status: Incident['status']; count: number }[];
  byCategory: { categoryId: string; name: string; count: number }[];
  byTechnician: { technicianId: string | null; name: string; count: number }[];
  generatedAt: string;
};

export async function fetchMetrics(signal?: AbortSignal, scope: Pick<IncidentFilters, 'reporterId' | 'technicianId'> = {}) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(scope)) if (value) query.set(key, value);
  const result = await request<{ data: IncidentMetrics }>(`/incidents/metrics${query.size ? `?${query}` : ''}`, { signal });
  return result.data;
}

type ApiErrorBody = { error?: { message?: string } };

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...init?.headers },
    });
  } catch (error) {
    if (init?.signal?.aborted) throw error;
    throw new Error('No se pudo conectar con el servicio. Intenta nuevamente.');
  }

  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as ApiErrorBody;
    throw new Error(body.error?.message ?? `La solicitud falló (${response.status})`);
  }

  return response.json() as Promise<T>;
}

export async function fetchIncidents(
  filters: IncidentFilters & { page: number; limit: number },
  signal?: AbortSignal,
) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== '') params.set(key, String(value));
  }
  return request<{ data: Incident[]; meta: Pagination }>(`/incidents?${params}`, { signal });
}

export async function fetchCatalogs(signal?: AbortSignal) {
  const result = await request<{ data: Catalogs }>('/catalogs', { signal });
  return result.data;
}

export async function fetchComments(incidentId: string, signal?: AbortSignal) {
  const result = await request<{ data: IncidentComment[] }>(
    `/incidents/${encodeURIComponent(incidentId)}/comments?limit=100`,
    { signal },
  );
  return result.data;
}

export async function postComment(incidentId: string, authorId: string, content: string) {
  const result = await request<{ data: IncidentComment }>(
    `/incidents/${encodeURIComponent(incidentId)}/comments`,
    { method: 'POST', body: JSON.stringify({ authorId, content }) },
  );
  return result.data;
}

export type IncidentHistory = {
  id: string;
  eventType: 'CREATED' | 'ASSIGNED' | 'STATUS_CHANGED' | 'COMMENTED' | 'UPDATED';
  previousStatus: Incident['status'] | null;
  newStatus: Incident['status'] | null;
  details: Record<string, unknown> | null;
  createdAt: string;
  actor: User | null;
};

export type NewIncident = Pick<Incident, 'title' | 'description' | 'priority'> & {
  categoryId: string; reporterId: string;
};

export async function fetchIncident(id: string, signal?: AbortSignal) {
  const result = await request<{ data: Incident }>(`/incidents/${encodeURIComponent(id)}`, { signal });
  return result.data;
}

export async function createIncident(input: NewIncident) {
  const result = await request<{ data: Incident }>('/incidents', { method: 'POST', body: JSON.stringify(input) });
  return result.data;
}

export async function assignTechnician(id: string, technicianId: string, actorId: string) {
  const result = await request<{ data: Incident }>(`/incidents/${encodeURIComponent(id)}/assignment`, {
    method: 'PATCH', body: JSON.stringify({ technicianId, actorId }),
  });
  return result.data;
}

export async function changeStatus(id: string, status: Incident['status'], actorId: string, reason?: string) {
  const result = await request<{ data: Incident }>(`/incidents/${encodeURIComponent(id)}/status`, {
    method: 'PATCH', body: JSON.stringify({ status, actorId, ...(reason ? { reason } : {}) }),
  });
  return result.data;
}

export async function fetchHistory(id: string, signal?: AbortSignal) {
  const result = await request<{ data: IncidentHistory[] }>(`/incidents/${encodeURIComponent(id)}/history`, { signal });
  return result.data;
}

export function fetchCommentsPage(id: string, page: number, signal?: AbortSignal) {
  return request<{ data: IncidentComment[]; meta: Pagination }>(
    `/incidents/${encodeURIComponent(id)}/comments?page=${page}&limit=20`, { signal },
  );
}
