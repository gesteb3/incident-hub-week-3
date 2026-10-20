import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const prismaMock = vi.hoisted(() => ({
  user: { findFirst: vi.fn(), findMany: vi.fn() },
  category: { findFirst: vi.fn(), findMany: vi.fn() },
  incident: {
    create: vi.fn(),
    findMany: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
    count: vi.fn(),
  },
  incidentHistory: { findMany: vi.fn(), create: vi.fn() },
  incidentComment: { findMany: vi.fn(), count: vi.fn(), create: vi.fn() },
  $transaction: vi.fn((operations: Promise<unknown>[]) => Promise.all(operations)),
  $disconnect: vi.fn(),
}));

vi.mock('../src/lib/prisma.js', () => ({ prisma: prismaMock }));

process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';

const { app } = await import('../src/app.js');

describe('GET /api/catalogs', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('consulta categorías activas y técnicos elegibles sin exponer correos', async () => {
    const categories = [{ id: randomUUID(), name: 'Redes' }];
    const technicians = [{ id: randomUUID(), name: 'Técnico de Soporte' }];
    prismaMock.category.findMany.mockResolvedValue(categories);
    const users = [{ id: randomUUID(), name: 'Solicitante', role: 'REQUESTER' }];
    prismaMock.user.findMany.mockResolvedValueOnce(technicians).mockResolvedValueOnce(users);

    const response = await request(app).get('/api/catalogs');

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual({ categories, technicians, users });
    expect(prismaMock.category.findMany).toHaveBeenCalledWith({
      where: { active: true }, select: { id: true, name: true }, orderBy: { name: 'asc' },
    });
    expect(prismaMock.user.findMany).toHaveBeenCalledWith({
      where: { active: true, role: 'TECHNICIAN' },
      select: { id: true, name: true }, orderBy: { name: 'asc' },
    });
    expect(prismaMock.user.findMany).toHaveBeenCalledWith({
      where: { active: true }, select: { id: true, name: true, role: true }, orderBy: { name: 'asc' },
    });
  });
});

describe('POST /api/incidents', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('crea un incidente válido con estado NUEVO', async () => {
    const reporterId = randomUUID();
    const categoryId = randomUUID();
    const incidentId = randomUUID();
    prismaMock.user.findFirst.mockResolvedValue({ id: reporterId });
    prismaMock.category.findFirst.mockResolvedValue({ id: categoryId });
    prismaMock.incident.create.mockResolvedValue({
      id: incidentId,
      title: 'Equipo sin acceso',
      description: 'El usuario no puede iniciar sesión',
      priority: 'HIGH',
      status: 'NUEVO',
      reporterId,
      categoryId,
    });

    const response = await request(app).post('/api/incidents').send({
      title: 'Equipo sin acceso',
      description: 'El usuario no puede iniciar sesión',
      priority: 'HIGH',
      reporterId,
      categoryId,
    });

    expect(response.status).toBe(201);
    expect(response.body.data).toMatchObject({ id: incidentId, status: 'NUEVO' });
    expect(prismaMock.incident.create).toHaveBeenCalledOnce();
  });

  it('rechaza datos inválidos sin consultar la base de datos', async () => {
    const response = await request(app).post('/api/incidents').send({
      title: 'x',
      description: 'corta',
      priority: 'URGENT',
      reporterId: 'invalid',
      categoryId: 'invalid',
    });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(prismaMock.incident.create).not.toHaveBeenCalled();
  });

  it('responde 404 cuando el reportante no existe', async () => {
    prismaMock.user.findFirst.mockResolvedValue(null);
    prismaMock.category.findFirst.mockResolvedValue({ id: randomUUID() });

    const response = await request(app).post('/api/incidents').send({
      title: 'Equipo sin acceso',
      description: 'El usuario no puede iniciar sesión',
      priority: 'HIGH',
      reporterId: randomUUID(),
      categoryId: randomUUID(),
    });

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('REPORTER_NOT_FOUND');
  });
});

describe('GET /api/incidents', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.$transaction.mockImplementation((operations: Promise<unknown>[]) =>
      Promise.all(operations),
    );
  });

  it('lista incidentes con paginación', async () => {
    const incidents = [{ id: randomUUID(), title: 'Equipo sin acceso', status: 'NUEVO' }];
    prismaMock.incident.findMany.mockResolvedValue(incidents);
    prismaMock.incident.count.mockResolvedValue(1);

    const response = await request(app).get('/api/incidents?page=1&limit=10');

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual(incidents);
    expect(response.body.meta).toEqual({ page: 1, limit: 10, total: 1, totalPages: 1 });
  });

  it('consulta el detalle de un incidente', async () => {
    const incident = { id: randomUUID(), title: 'Equipo sin acceso', status: 'NUEVO' };
    prismaMock.incident.findUnique.mockResolvedValue(incident);

    const response = await request(app).get(`/api/incidents/${incident.id}`);

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual(incident);
  });

  it.each([
    ['status', 'EN_PROCESO'],
    ['priority', 'CRITICAL'],
    ['categoryId', '00000000-0000-4000-8000-000000000001'],
    ['technicianId', '00000000-0000-4000-8000-000000000002'],
  ])('filtra individualmente por %s y aplica el filtro al total', async (key, value) => {
    prismaMock.incident.findMany.mockResolvedValue([]);
    prismaMock.incident.count.mockResolvedValue(0);

    const response = await request(app).get('/api/incidents').query({ [key]: value });

    expect(response.status).toBe(200);
    expect(prismaMock.incident.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { [key]: value } }),
    );
    expect(prismaMock.incident.count).toHaveBeenCalledWith({ where: { [key]: value } });
    expect(response.body).toEqual({
      data: [],
      meta: { page: 1, limit: 20, total: 0, totalPages: 0 },
    });
  });

  it('combina los cuatro filtros y conserva la paginación', async () => {
    const filters = {
      status: 'ASIGNADO',
      priority: 'HIGH',
      categoryId: randomUUID(),
      technicianId: randomUUID(),
    };
    const incidents = [{ id: randomUUID(), ...filters }];
    prismaMock.incident.findMany.mockResolvedValue(incidents);
    prismaMock.incident.count.mockResolvedValue(12);

    const response = await request(app)
      .get('/api/incidents')
      .query({ ...filters, page: 2, limit: 5 });

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual(incidents);
    expect(response.body.meta).toEqual({ page: 2, limit: 5, total: 12, totalPages: 3 });
    expect(prismaMock.incident.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: filters,
        skip: 5,
        take: 5,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      }),
    );
    expect(prismaMock.incident.count).toHaveBeenCalledWith({ where: filters });
  });

  it.each([
    { status: 'ABIERTO' },
    { priority: 'URGENTE' },
    { categoryId: 'no-es-uuid' },
    { technicianId: 'no-es-uuid' },
    { status: '' },
    { status: ['NUEVO', 'CERRADO'] },
    { category: 'Red' },
    { page: 0 },
    { limit: 101 },
  ])('rechaza parámetros inválidos antes de consultar: %j', async (query) => {
    const response = await request(app).get('/api/incidents').query(query);

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(prismaMock.incident.findMany).not.toHaveBeenCalled();
    expect(prismaMock.incident.count).not.toHaveBeenCalled();
  });

  it('responde 404 cuando el incidente no existe', async () => {
    prismaMock.incident.findUnique.mockResolvedValue(null);

    const response = await request(app).get(`/api/incidents/${randomUUID()}`);

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('INCIDENT_NOT_FOUND');
  });

  it('devuelve el historial cronológico del incidente', async () => {
    const incidentId = randomUUID();
    const history = [
      {
        id: randomUUID(),
        incidentId,
        eventType: 'CREATED',
        previousStatus: null,
        newStatus: 'NUEVO',
        actor: { id: randomUUID(), name: 'Usuario Solicitante', role: 'REQUESTER' },
      },
    ];
    prismaMock.incident.findUnique.mockResolvedValue({ id: incidentId });
    prismaMock.incidentHistory.findMany.mockResolvedValue(history);

    const response = await request(app).get(`/api/incidents/${incidentId}/history`);

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual(history);
    expect(prismaMock.incidentHistory.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { incidentId },
        orderBy: { createdAt: 'asc' },
      }),
    );
  });
});

describe('Comentarios de incidentes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.$transaction.mockImplementation((operations: Promise<unknown>[]) =>
      Promise.all(operations),
    );
  });

  it('registra un comentario y crea el evento correspondiente en la bitácora', async () => {
    const incidentId = randomUUID();
    const authorId = randomUUID();
    const comment = {
      id: randomUUID(),
      incidentId,
      authorId,
      content: 'Se verificó la conexión del usuario.',
      author: { id: authorId, name: 'Técnico', role: 'TECHNICIAN' },
    };
    prismaMock.incident.findUnique.mockResolvedValue({ id: incidentId });
    prismaMock.user.findFirst.mockResolvedValue({ id: authorId });
    prismaMock.incidentComment.create.mockResolvedValue(comment);
    prismaMock.incidentHistory.create.mockResolvedValue({ id: randomUUID() });

    const response = await request(app)
      .post(`/api/incidents/${incidentId}/comments`)
      .send({ authorId, content: comment.content });

    expect(response.status).toBe(201);
    expect(response.body.data).toEqual(comment);
    expect(prismaMock.incidentHistory.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          incidentId,
          actorId: authorId,
          eventType: 'COMMENTED',
        }),
      }),
    );
  });

  it('lista comentarios cronológicamente con paginación', async () => {
    const incidentId = randomUUID();
    const comments = [{ id: randomUUID(), incidentId, content: 'Seguimiento' }];
    prismaMock.incident.findUnique.mockResolvedValue({ id: incidentId });
    prismaMock.incidentComment.findMany.mockResolvedValue(comments);
    prismaMock.incidentComment.count.mockResolvedValue(1);

    const response = await request(app).get(`/api/incidents/${incidentId}/comments?page=1&limit=10`);

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual(comments);
    expect(response.body.meta).toEqual({ page: 1, limit: 10, total: 1, totalPages: 1 });
    expect(prismaMock.incidentComment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { incidentId },
        orderBy: { createdAt: 'asc' },
      }),
    );
  });

  it('rechaza un comentario vacío', async () => {
    const response = await request(app)
      .post(`/api/incidents/${randomUUID()}/comments`)
      .send({ authorId: randomUUID(), content: '   ' });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(prismaMock.incidentComment.create).not.toHaveBeenCalled();
  });

  it('responde 404 si el incidente no existe al registrar comentario', async () => {
    prismaMock.incident.findUnique.mockResolvedValue(null);
    prismaMock.user.findFirst.mockResolvedValue({ id: randomUUID() });

    const response = await request(app)
      .post(`/api/incidents/${randomUUID()}/comments`)
      .send({ authorId: randomUUID(), content: 'Se inició revisión técnica.' });

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('INCIDENT_NOT_FOUND');
  });
});

describe('PATCH /api/incidents/:id/assignment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.$transaction.mockImplementation((operations: Promise<unknown>[]) =>
      Promise.all(operations),
    );
  });

  it('asigna un técnico y cambia un incidente NUEVO a ASIGNADO', async () => {
    const incidentId = randomUUID();
    const technicianId = randomUUID();
    const actorId = randomUUID();
    prismaMock.incident.findUnique.mockResolvedValue({ id: incidentId, status: 'NUEVO' });
    prismaMock.user.findFirst
      .mockResolvedValueOnce({ id: technicianId, name: 'Técnico de Soporte' })
      .mockResolvedValueOnce({ id: actorId });
    prismaMock.incident.update.mockResolvedValue({
      id: incidentId,
      technicianId,
      status: 'ASIGNADO',
    });
    prismaMock.incidentHistory.create.mockResolvedValue({ id: randomUUID() });

    const response = await request(app)
      .patch(`/api/incidents/${incidentId}/assignment`)
      .send({ technicianId, actorId });

    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({ technicianId, status: 'ASIGNADO' });
    expect(prismaMock.incidentHistory.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ eventType: 'ASSIGNED', newStatus: 'ASIGNADO' }),
      }),
    );
  });

  it('rechaza la asignación cuando el técnico no es válido', async () => {
    prismaMock.incident.findUnique.mockResolvedValue({ id: randomUUID(), status: 'NUEVO' });
    prismaMock.user.findFirst.mockResolvedValueOnce(null).mockResolvedValueOnce({ id: randomUUID() });

    const response = await request(app)
      .patch(`/api/incidents/${randomUUID()}/assignment`)
      .send({ technicianId: randomUUID(), actorId: randomUUID() });

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('TECHNICIAN_NOT_FOUND');
    expect(prismaMock.incident.update).not.toHaveBeenCalled();
  });
});

describe('PATCH /api/incidents/:id/status', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.$transaction.mockImplementation((operations: Promise<unknown>[]) =>
      Promise.all(operations),
    );
  });

  it('cambia un incidente ASIGNADO a EN_PROCESO y registra el historial', async () => {
    const incidentId = randomUUID();
    const actorId = randomUUID();
    prismaMock.incident.findUnique.mockResolvedValue({
      id: incidentId,
      status: 'ASIGNADO',
      technicianId: randomUUID(),
    });
    prismaMock.user.findFirst.mockResolvedValue({ id: actorId });
    prismaMock.incident.update.mockResolvedValue({ id: incidentId, status: 'EN_PROCESO' });
    prismaMock.incidentHistory.create.mockResolvedValue({ id: randomUUID() });

    const response = await request(app)
      .patch(`/api/incidents/${incidentId}/status`)
      .send({ status: 'EN_PROCESO', actorId });

    expect(response.status).toBe(200);
    expect(response.body.data.status).toBe('EN_PROCESO');
    expect(prismaMock.incidentHistory.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          eventType: 'STATUS_CHANGED',
          previousStatus: 'ASIGNADO',
          newStatus: 'EN_PROCESO',
        }),
      }),
    );
  });

  it('rechaza saltos de estado no permitidos', async () => {
    prismaMock.incident.findUnique.mockResolvedValue({
      id: randomUUID(),
      status: 'NUEVO',
      technicianId: null,
    });
    prismaMock.user.findFirst.mockResolvedValue({ id: randomUUID() });

    const response = await request(app)
      .patch(`/api/incidents/${randomUUID()}/status`)
      .send({
        status: 'RESUELTO',
        actorId: randomUUID(),
        reason: 'El incidente fue solucionado correctamente',
      });

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe('INVALID_STATUS_TRANSITION');
    expect(prismaMock.incident.update).not.toHaveBeenCalled();
  });

  it('impide que un usuario no autorizado cambie estados', async () => {
    prismaMock.incident.findUnique.mockResolvedValue({
      id: randomUUID(),
      status: 'ASIGNADO',
      technicianId: randomUUID(),
    });
    prismaMock.user.findFirst.mockResolvedValue(null);

    const response = await request(app)
      .patch(`/api/incidents/${randomUUID()}/status`)
      .send({ status: 'EN_PROCESO', actorId: randomUUID() });

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('ACTOR_NOT_AUTHORIZED');
  });

  it('exige un motivo para resolver un incidente', async () => {
    const response = await request(app)
      .patch(`/api/incidents/${randomUUID()}/status`)
      .send({ status: 'RESUELTO', actorId: randomUUID() });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(response.body.error.details.fieldErrors.body).toContain(
      'El motivo es obligatorio para resolver o cerrar un incidente',
    );
    expect(prismaMock.incident.update).not.toHaveBeenCalled();
  });
});
