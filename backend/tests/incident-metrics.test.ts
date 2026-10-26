import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const prismaMock = vi.hoisted(() => ({
  incident: { groupBy: vi.fn(), count: vi.fn() },
  category: { findMany: vi.fn() },
  user: { findMany: vi.fn() },
  $transaction: vi.fn(),
}));

vi.mock('../src/lib/prisma.js', () => ({ prisma: prismaMock }));
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
const { app } = await import('../src/app.js');

describe('GET /api/incidents/metrics', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    prismaMock.$transaction.mockImplementation((callback) => callback(prismaMock));
    prismaMock.incident.groupBy.mockResolvedValue([]);
    prismaMock.incident.count.mockResolvedValue(0);
    prismaMock.category.findMany.mockResolvedValue([]);
    prismaMock.user.findMany.mockResolvedValue([]);
  });

  it('devuelve ceros y cinco estados cuando no hay incidentes', async () => {
    const response = await request(app).get('/api/incidents/metrics');

    expect(response.status).toBe(200);
    expect(response.headers['cache-control']).toBe('no-store');
    expect(response.body.data).toMatchObject({
      total: 0, open: 0, resolved: 0, closed: 0, critical: 0,
      byCategory: [], byTechnician: [],
    });
    expect(response.body.data.byStatus).toEqual([
      { status: 'NUEVO', count: 0 }, { status: 'ASIGNADO', count: 0 },
      { status: 'EN_PROCESO', count: 0 }, { status: 'RESUELTO', count: 0 },
      { status: 'CERRADO', count: 0 },
    ]);
    expect(Number.isNaN(Date.parse(response.body.data.generatedAt))).toBe(false);
  });

  it.each(['reporterId', 'technicianId'])('aplica %s a todos los indicadores', async field => {
    const id = '00000000-0000-4000-8000-000000000001';
    const response = await request(app).get('/api/incidents/metrics').query({ [field]: id });
    expect(response.status).toBe(200);
    for (const call of prismaMock.incident.groupBy.mock.calls) {
      expect(call[0].where).toEqual({ [field]: id });
    }
    expect(prismaMock.incident.groupBy).toHaveBeenCalledTimes(3);
    expect(prismaMock.incident.count).toHaveBeenCalledWith({
      where: { [field]: id, priority: 'CRITICAL', status: { in: ['NUEVO', 'ASIGNADO', 'EN_PROCESO'] } },
    });
  });

  it('rechaza un identificador inválido antes de consultar métricas', async () => {
    const response = await request(app).get('/api/incidents/metrics?reporterId=incorrecto');
    expect(response.status).toBe(400);
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it('distingue abiertos, resueltos y cerrados y distribuye todos los incidentes', async () => {
    prismaMock.incident.groupBy
      .mockResolvedValueOnce([
        { status: 'NUEVO', _count: { _all: 2 } },
        { status: 'ASIGNADO', _count: { _all: 1 } },
        { status: 'EN_PROCESO', _count: { _all: 1 } },
        { status: 'RESUELTO', _count: { _all: 1 } },
        { status: 'CERRADO', _count: { _all: 1 } },
      ])
      .mockResolvedValueOnce([
        { categoryId: 'hardware', _count: { _all: 2 } },
        { categoryId: 'redes', _count: { _all: 3 } },
        { categoryId: 'accesos', _count: { _all: 1 } },
      ])
      .mockResolvedValueOnce([
        { technicianId: 'tecnico', _count: { _all: 2 } },
        { technicianId: null, _count: { _all: 4 } },
      ]);
    prismaMock.incident.count.mockResolvedValue(1);
    prismaMock.category.findMany.mockResolvedValue([
      { id: 'redes', name: 'Redes' }, { id: 'hardware', name: 'Hardware' },
      { id: 'accesos', name: 'Accesos' },
    ]);
    prismaMock.user.findMany.mockResolvedValue([{ id: 'tecnico', name: 'Técnico de Soporte' }]);

    const response = await request(app).get('/api/incidents/metrics');
    const data = response.body.data;

    expect(response.status).toBe(200);
    expect(data).toMatchObject({ total: 6, open: 4, resolved: 1, closed: 1, critical: 1 });
    expect(data.total).toBe(data.open + data.resolved + data.closed);
    expect(data.byCategory).toEqual([
      { categoryId: 'redes', name: 'Redes', count: 3 },
      { categoryId: 'hardware', name: 'Hardware', count: 2 },
      { categoryId: 'accesos', name: 'Accesos', count: 1 },
    ]);
    expect(data.byTechnician).toEqual([
      { technicianId: null, name: 'Sin asignar', count: 4 },
      { technicianId: 'tecnico', name: 'Técnico de Soporte', count: 2 },
    ]);
    expect(prismaMock.incident.count).toHaveBeenCalledWith({
      where: { priority: 'CRITICAL', status: { in: ['NUEVO', 'ASIGNADO', 'EN_PROCESO'] } },
    });
    expect(prismaMock.$transaction).toHaveBeenCalledWith(expect.any(Function), {
      isolationLevel: 'RepeatableRead',
    });
  });

  it('incluye estados ausentes y conserva incidentes asociados a catálogos históricos', async () => {
    prismaMock.incident.groupBy
      .mockResolvedValueOnce([{ status: 'CERRADO', _count: { _all: 1 } }])
      .mockResolvedValueOnce([{ categoryId: 'categoria-inactiva', _count: { _all: 1 } }])
      .mockResolvedValueOnce([{ technicianId: 'tecnico-inactivo', _count: { _all: 1 } }]);
    prismaMock.category.findMany.mockResolvedValue([{ id: 'categoria-inactiva', name: 'Categoría anterior' }]);
    prismaMock.user.findMany.mockResolvedValue([{ id: 'tecnico-inactivo', name: 'Técnico anterior' }]);

    const response = await request(app).get('/api/incidents/metrics');

    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({ total: 1, open: 0, resolved: 0, closed: 1, critical: 0 });
    expect(response.body.data.byStatus).toContainEqual({ status: 'RESUELTO', count: 0 });
    expect(response.body.data.byCategory[0].name).toBe('Categoría anterior');
    expect(response.body.data.byTechnician[0].name).toBe('Técnico anterior');
    expect(prismaMock.category.findMany).toHaveBeenCalledWith({
      where: { id: { in: ['categoria-inactiva'] } }, select: { id: true, name: true },
    });
  });

  it('responde con error general si falla la consulta de métricas', async () => {
    prismaMock.$transaction.mockRejectedValueOnce(new Error('Detalle interno de prueba'));
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const response = await request(app).get('/api/incidents/metrics');
      expect(response.status).toBe(500);
      expect(response.body.error.code).toBe('INTERNAL_ERROR');
      expect(JSON.stringify(response.body)).not.toContain('Detalle interno de prueba');
    } finally {
      log.mockRestore();
    }
  });
});
