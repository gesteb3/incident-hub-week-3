import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as api from '../src/api';
import type { Catalogs, Incident } from '../src/api';
import CreateIncidentDialog from '../src/incidents/CreateIncidentDialog';
import IncidentOperations from '../src/incidents/IncidentOperations';
import IncidentWorkspace from '../src/incidents/IncidentWorkspace';
import IncidentComments from '../src/incidents/IncidentComments';

vi.mock('../src/api', () => ({
  createIncident: vi.fn(), assignTechnician: vi.fn(), changeStatus: vi.fn(), fetchCatalogs: vi.fn(),
  fetchIncidents: vi.fn(), fetchIncident: vi.fn(), fetchHistory: vi.fn(), fetchCommentsPage: vi.fn(), postComment: vi.fn(),
}));

const technician = { id: 'tech-1', name: 'Técnica de soporte', role: 'TECHNICIAN' as const };
const requester = { id: 'reporter-1', name: 'Solicitante', role: 'REQUESTER' as const };
const administrator = { id: 'admin-1', name: 'Administrador', role: 'ADMIN' as const };
const catalogs: Catalogs = {
  categories: [{ id: 'hardware', name: 'Hardware' }], technicians: [technician], users: [requester, technician],
};
const incident: Incident = {
  id: 'incident-1', title: 'Impresora sin conexión', description: 'Los documentos permanecen en cola de impresión.',
  status: 'NUEVO', priority: 'MEDIUM', createdAt: '2026-10-20T08:00:00Z',
  category: catalogs.categories[0], reporter: requester, technician: null,
};
const meta = { page: 1, limit: 20, total: 0, totalPages: 0 };

beforeEach(() => {
  vi.resetAllMocks();
  localStorage.clear();
  window.history.replaceState(null, '', '/');
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', { configurable: true, value() { this.setAttribute('open', ''); } });
  Object.defineProperty(HTMLDialogElement.prototype, 'close', { configurable: true, value() { this.removeAttribute('open'); } });
  vi.mocked(api.fetchCatalogs).mockResolvedValue(catalogs);
  vi.mocked(api.fetchIncidents).mockResolvedValue({ data: [incident], meta: { ...meta, total: 1, totalPages: 1 } });
  vi.mocked(api.fetchIncident).mockResolvedValue(incident);
  vi.mocked(api.fetchHistory).mockResolvedValue([]);
  vi.mocked(api.fetchCommentsPage).mockResolvedValue({ data: [], meta });
});
afterEach(cleanup);

describe('Registro de incidentes', () => {
  it('envía el solicitante real y conserva los datos cuando falla el guardado', async () => {
    const user = userEvent.setup();
    vi.mocked(api.createIncident).mockRejectedValue(new Error('Servicio no disponible'));
    const onCreated = vi.fn();
    render(<CreateIncidentDialog catalogs={catalogs} actor={requester} onClose={vi.fn()} onCreated={onCreated} />);
    await user.type(screen.getByLabelText(/^Título/), '  Impresora sin conexión  ');
    await user.type(screen.getByLabelText(/^Descripción/), '  Los documentos permanecen en cola.  ');
    await user.selectOptions(screen.getByLabelText(/^Categoría/), 'hardware');
    await user.click(screen.getByRole('button', { name: 'Registrar incidente' }));
    expect(await screen.findByRole('alert')).toHaveProperty('textContent', 'Servicio no disponible');
    expect(api.createIncident).toHaveBeenCalledWith({ title: 'Impresora sin conexión', description: 'Los documentos permanecen en cola.',
      categoryId: 'hardware', reporterId: requester.id, priority: 'MEDIUM' });
    expect((screen.getByLabelText(/^Título/) as HTMLInputElement).value).toBe('  Impresora sin conexión  ');
    expect(onCreated).not.toHaveBeenCalled();
  });

  it('rechaza textos compuestos por espacios antes de llamar a la API', async () => {
    render(<CreateIncidentDialog catalogs={catalogs} actor={requester} onClose={vi.fn()} onCreated={vi.fn()} />);
    fireEvent.change(screen.getByLabelText(/^Título/), { target: { value: '      ' } });
    fireEvent.change(screen.getByLabelText(/^Descripción/), { target: { value: '            ' } });
    fireEvent.submit(screen.getByRole('form', { name: 'Registrar incidente' }));
    expect(api.createIncident).not.toHaveBeenCalled();
    expect(screen.getByRole('alert').textContent).toContain('al menos 5 caracteres');
  });
});

describe('Atención del incidente', () => {
  it('asigna técnico con el actor seleccionado e impide solicitudes duplicadas', async () => {
    const user = userEvent.setup();
    let finish!: (value: Incident) => void;
    vi.mocked(api.assignTechnician).mockReturnValue(new Promise((resolve) => { finish = resolve; }));
    const onChanged = vi.fn();
    render(<IncidentOperations incident={incident} actor={administrator} technicians={catalogs.technicians} onChanged={onChanged} onBusy={vi.fn()} />);
    await user.selectOptions(screen.getByLabelText('Técnico responsable'), technician.id);
    await user.click(screen.getByRole('button', { name: 'Asignar técnico' }));
    expect((screen.getByRole('button', { name: 'Guardando…' }) as HTMLButtonElement).disabled).toBe(true);
    expect(api.assignTechnician).toHaveBeenCalledExactlyOnceWith(incident.id, technician.id, administrator.id);
    finish({ ...incident, status: 'ASIGNADO', technician });
    await waitFor(() => expect(onChanged).toHaveBeenCalledOnce());
  });

  it('exige un motivo suficiente para resolver y lo envía al historial', async () => {
    const user = userEvent.setup();
    vi.mocked(api.changeStatus).mockResolvedValue({ ...incident, status: 'RESUELTO', technician });
    render(<IncidentOperations incident={{ ...incident, status: 'EN_PROCESO', technician }} actor={technician}
      technicians={catalogs.technicians} onChanged={vi.fn()} onBusy={vi.fn()} />);
    const action = screen.getByRole('button', { name: 'Resolver incidente' }) as HTMLButtonElement;
    expect(action.disabled).toBe(true);
    await user.type(screen.getByLabelText('Motivo de la atención'), 'Listo');
    expect(action.disabled).toBe(true);
    await user.clear(screen.getByLabelText('Motivo de la atención'));
    await user.type(screen.getByLabelText('Motivo de la atención'), 'Se reinició el servicio de impresión y se verificó una página de prueba.');
    await user.click(action);
    expect(api.changeStatus).toHaveBeenCalledWith(incident.id, 'RESUELTO', technician.id,
      'Se reinició el servicio de impresión y se verificó una página de prueba.');
  });

  it('conserva el motivo y muestra el conflicto cuando otro usuario adelantó el estado', async () => {
    const user = userEvent.setup();
    vi.mocked(api.changeStatus).mockRejectedValue(new Error('El estado del incidente cambió'));
    render(<IncidentOperations incident={{ ...incident, status: 'RESUELTO', technician }} actor={technician}
      technicians={catalogs.technicians} onChanged={vi.fn()} onBusy={vi.fn()} />);
    await user.type(screen.getByLabelText('Motivo de la atención'), 'El solicitante confirmó que puede imprimir.');
    await user.click(screen.getByRole('button', { name: 'Cerrar incidente' }));
    expect((await screen.findByRole('alert')).textContent).toContain('El estado del incidente cambió');
    expect((screen.getByLabelText('Motivo de la atención') as HTMLTextAreaElement).value).toContain('El solicitante confirmó');
  });

  it('limita al solicitante a consulta y comentarios', () => {
    render(<IncidentOperations incident={incident} actor={requester} technicians={catalogs.technicians} onChanged={vi.fn()} onBusy={vi.fn()} />);
    expect(screen.queryByRole('form', { name: 'Asignar técnico' })).toBeNull();
    expect(screen.queryByRole('form', { name: 'Cambiar estado' })).toBeNull();
  });

  it('no ofrece reasignaciones ni transiciones para un incidente cerrado', () => {
    render(<IncidentOperations incident={{ ...incident, status: 'CERRADO', technician }} actor={technician}
      technicians={catalogs.technicians} onChanged={vi.fn()} onBusy={vi.fn()} />);
    expect(screen.queryByRole('form')).toBeNull();
    expect(screen.getByText(/La atención de este incidente ha finalizado/)).toBeTruthy();
  });
});

describe('Navegación y seguimiento', () => {
  it('abre un enlace directo aunque el incidente no esté en la primera página', async () => {
    vi.mocked(api.fetchCatalogs).mockResolvedValue({ ...catalogs, users: [...catalogs.users, administrator] });
    window.history.replaceState(null, '', '/?incidentId=outside-page');
    vi.mocked(api.fetchIncident).mockResolvedValue({ ...incident, id: 'outside-page', title: 'Incidente de otra página' });
    render(<IncidentWorkspace />);
    expect(await screen.findByRole('heading', { name: 'Incidente de otra página' })).toBeTruthy();
    expect(api.fetchIncident).toHaveBeenCalledWith('outside-page', expect.any(AbortSignal));
    expect(screen.getByText(/El detalle abierto está fuera/)).toBeTruthy();
  });

  it('cambia la bandeja y retira el detalle anterior al cambiar de persona', async () => {
    const user = userEvent.setup();
    const assigned = { ...incident, id: 'assigned', title: 'Incidente asignado', technician };
    const reported = { ...incident, id: 'reported', title: 'Mi reporte', reporter: requester };
    vi.mocked(api.fetchIncidents).mockImplementation(async filters => ({
      data: filters.reporterId ? [reported] : [assigned], meta: { ...meta, total: 1, totalPages: 1 },
    }));
    vi.mocked(api.fetchIncident).mockImplementation(async id => id === 'reported' ? reported : assigned);
    render(<IncidentWorkspace />);
    await screen.findByRole('heading', { name: 'Incidente asignado' });
    await user.selectOptions(screen.getByLabelText('Trabajar como'), requester.id);
    await screen.findByRole('heading', { name: 'Mi reporte' });
    expect(screen.queryByRole('heading', { name: 'Incidente asignado' })).toBeNull();
    expect(api.fetchIncidents).toHaveBeenLastCalledWith(
      expect.objectContaining({ reporterId: requester.id, page: 1 }), expect.any(AbortSignal));
    expect(screen.queryByRole('form', { name: 'Cambiar estado' })).toBeNull();
    expect(localStorage.getItem('incident-hub-working-user')).toBe(requester.id);
  });

  it('limita al técnico a sus asignados y conserva el alcance al limpiar filtros', async () => {
    const user = userEvent.setup();
    render(<IncidentWorkspace />);
    await screen.findByText('Mis incidentes asignados');
    expect(api.fetchIncidents).toHaveBeenCalledWith(expect.objectContaining({ technicianId: technician.id }), expect.any(AbortSignal));
    expect(screen.queryByRole('button', { name: /Nuevo incidente/ })).toBeNull();
    await waitFor(() => expect((screen.getByRole('button', { name: 'Limpiar' }) as HTMLButtonElement).disabled).toBe(false));
    await user.click(screen.getByRole('button', { name: 'Limpiar' }));
    await waitFor(() => expect(api.fetchIncidents).toHaveBeenCalledTimes(2));
    expect(api.fetchIncidents).toHaveBeenLastCalledWith(expect.objectContaining({ technicianId: technician.id }), expect.any(AbortSignal));
    expect((screen.getByLabelText('Técnico') as HTMLSelectElement).disabled).toBe(true);
  });

  it('restaura al usuario elegido sin consultar la bandeja global', async () => {
    localStorage.setItem('incident-hub-working-user', requester.id);
    render(<IncidentWorkspace />);
    await screen.findByText('Mis reportes');
    expect(api.fetchIncidents).toHaveBeenCalledTimes(1);
    expect(api.fetchIncidents).toHaveBeenCalledWith(expect.objectContaining({ reporterId: requester.id }), expect.any(AbortSignal));
  });

  it('al guardar un comentario abre la última página y actualiza la bitácora', async () => {
    const user = userEvent.setup();
    vi.mocked(api.fetchCommentsPage).mockResolvedValue({ data: [], meta: { ...meta, total: 20, totalPages: 1 } });
    const onCommented = vi.fn();
    render(<IncidentComments incidentId={incident.id} actor={technician} onBusy={vi.fn()} onCommented={onCommented} />);
    await screen.findByText('20 comentarios');
    await user.type(screen.getByLabelText(/Nueva nota/), 'Se revisó el servicio de impresión.');
    await user.click(screen.getByRole('button', { name: 'Publicar comentario' }));
    await waitFor(() => expect(api.fetchCommentsPage).toHaveBeenCalledWith(incident.id, 2, expect.any(AbortSignal)));
    expect(onCommented).toHaveBeenCalledOnce();
  });
});
