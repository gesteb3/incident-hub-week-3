import { IncidentStatus, Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';

const openStatuses: IncidentStatus[] = ['NUEVO', 'ASIGNADO', 'EN_PROCESO'];

export async function getIncidentMetrics(scope: { reporterId?: string; technicianId?: string } = {}) {
  const metrics = await prisma.$transaction(async (transaction) => {
    const [statuses, critical, categoryGroups, technicianGroups] = await Promise.all([
      transaction.incident.groupBy({ by: ['status'], where: scope, _count: { _all: true } }),
      transaction.incident.count({
        where: { ...scope, priority: 'CRITICAL', status: { in: openStatuses } },
      }),
      transaction.incident.groupBy({ by: ['categoryId'], where: scope, _count: { _all: true } }),
      transaction.incident.groupBy({ by: ['technicianId'], where: scope, _count: { _all: true } }),
    ]);

    const technicianIds = technicianGroups.flatMap((group) => group.technicianId ? [group.technicianId] : []);
    const [categories, technicians] = await Promise.all([
      transaction.category.findMany({
        where: { id: { in: categoryGroups.map((group) => group.categoryId) } },
        select: { id: true, name: true },
      }),
      transaction.user.findMany({
        where: { id: { in: technicianIds } },
        select: { id: true, name: true },
      }),
    ]);

    const byStatus = Object.values(IncidentStatus).map((status) => ({
      status,
      count: statuses.find((group) => group.status === status)?._count._all ?? 0,
    }));
    const countFor = (status: IncidentStatus) => byStatus.find((item) => item.status === status)!.count;
    const byCategory = categoryGroups.map((group) => ({
      categoryId: group.categoryId,
      name: categories.find((category) => category.id === group.categoryId)?.name ?? 'Categoría no disponible',
      count: group._count._all,
    })).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'es'));
    const byTechnician = technicianGroups.map((group) => ({
      technicianId: group.technicianId,
      name: group.technicianId
        ? technicians.find((technician) => technician.id === group.technicianId)?.name ?? 'Técnico no disponible'
        : 'Sin asignar',
      count: group._count._all,
    })).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'es'));

    return {
      total: byStatus.reduce((sum, item) => sum + item.count, 0),
      open: openStatuses.reduce((sum, status) => sum + countFor(status), 0),
      resolved: countFor('RESUELTO'),
      closed: countFor('CERRADO'),
      critical,
      byStatus,
      byCategory,
      byTechnician,
    };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });

  return { ...metrics, generatedAt: new Date().toISOString() };
}
