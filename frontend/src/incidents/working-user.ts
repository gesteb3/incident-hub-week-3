import type { User, IncidentFilters } from '../api';

export function storedUserId(): string {
  try { return localStorage.getItem('incident-hub-working-user') ?? ''; }
  catch { return ''; }
}

export function rememberUser(id: string) {
  try { localStorage.setItem('incident-hub-working-user', id); }
  catch { /* The current view still works when browser storage is unavailable. */ }
}

export function chooseUser(users: User[], id: string) {
  return users.find(user => user.id === id) ?? users.find(user => user.role === 'ADMIN')
    ?? users.find(user => user.role === 'TECHNICIAN') ?? users[0];
}

export function userScope(user: User): Pick<IncidentFilters, 'reporterId' | 'technicianId'> {
  return user.role === 'REQUESTER' ? { reporterId: user.id }
    : user.role === 'TECHNICIAN' ? { technicianId: user.id } : {};
}

export function scopeLabel(user: User) {
  return user.role === 'REQUESTER' ? 'Mis reportes' : user.role === 'TECHNICIAN' ? 'Mis incidentes asignados' : 'Todos los incidentes';
}
