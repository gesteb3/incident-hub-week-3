import { prisma } from '../lib/prisma.js';
import { IncidentStatus, type Prisma } from '@prisma/client';
import { AppError } from '../errors/app-error.js';
import type {
  CreateIncidentInput,
  AssignTechnicianInput,
  ChangeIncidentStatusInput,
  ListIncidentsInput,
  CreateIncidentCommentInput,
  ListIncidentCommentsInput,
} from '../schemas/incident.schema.js';

const incidentSummaryInclude = {
  reporter: { select: { id: true, name: true, email: true } },
  category: { select: { id: true, name: true } },
  technician: { select: { id: true, name: true, email: true } },
} as const;

const allowedStatusTransitions: Record<IncidentStatus, IncidentStatus[]> = {
  NUEVO: ['ASIGNADO'],
  ASIGNADO: ['EN_PROCESO'],
  EN_PROCESO: ['RESUELTO'],
  RESUELTO: ['CERRADO'],
  CERRADO: [],
};

export async function createIncident(input: CreateIncidentInput) {
  const [reporter, category] = await Promise.all([
    prisma.user.findFirst({
      where: { id: input.reporterId, active: true },
      select: { id: true },
    }),
    prisma.category.findFirst({
      where: { id: input.categoryId, active: true },
      select: { id: true },
    }),
  ]);

  if (!reporter) {
    throw new AppError(404, 'REPORTER_NOT_FOUND', 'El usuario reportante no existe o está inactivo');
  }

  if (!category) {
    throw new AppError(404, 'CATEGORY_NOT_FOUND', 'La categoría no existe o está inactiva');
  }

  return prisma.incident.create({
    data: input,
    include: incidentSummaryInclude,
  });
}

export async function listIncidents(input: ListIncidentsInput) {
  const skip = (input.page - 1) * input.limit;
  const where: Prisma.IncidentWhereInput = {
    ...(input.status ? { status: input.status } : {}),
    ...(input.priority ? { priority: input.priority } : {}),
    ...(input.categoryId ? { categoryId: input.categoryId } : {}),
    ...(input.technicianId ? { technicianId: input.technicianId } : {}),
    ...(input.reporterId ? { reporterId: input.reporterId } : {}),
  };
  const [items, total] = await prisma.$transaction([
    prisma.incident.findMany({
      where,
      skip,
      take: input.limit,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      include: incidentSummaryInclude,
    }),
    prisma.incident.count({ where }),
  ]);

  return {
    items,
    pagination: {
      page: input.page,
      limit: input.limit,
      total,
      totalPages: Math.ceil(total / input.limit),
    },
  };
}

export async function getIncidentById(id: string) {
  const incident = await prisma.incident.findUnique({
    where: { id },
    include: incidentSummaryInclude,
  });

  if (!incident) {
    throw new AppError(404, 'INCIDENT_NOT_FOUND', 'El incidente no existe');
  }

  return incident;
}

export async function getIncidentHistory(id: string) {
  const incidentExists = await prisma.incident.findUnique({
    where: { id },
    select: { id: true },
  });

  if (!incidentExists) {
    throw new AppError(404, 'INCIDENT_NOT_FOUND', 'El incidente no existe');
  }

  return prisma.incidentHistory.findMany({
    where: { incidentId: id },
    orderBy: { createdAt: 'asc' },
    include: {
      actor: {
        select: { id: true, name: true, role: true },
      },
    },
  });
}

export async function listIncidentComments(id: string, input: ListIncidentCommentsInput) {
  const incidentExists = await prisma.incident.findUnique({ where: { id }, select: { id: true } });
  if (!incidentExists) {
    throw new AppError(404, 'INCIDENT_NOT_FOUND', 'El incidente no existe');
  }

  const skip = (input.page - 1) * input.limit;
  const [items, total] = await prisma.$transaction([
    prisma.incidentComment.findMany({
      where: { incidentId: id },
      skip,
      take: input.limit,
      orderBy: { createdAt: 'asc' },
      include: { author: { select: { id: true, name: true, role: true } } },
    }),
    prisma.incidentComment.count({ where: { incidentId: id } }),
  ]);

  return {
    items,
    pagination: {
      page: input.page,
      limit: input.limit,
      total,
      totalPages: Math.ceil(total / input.limit),
    },
  };
}

export async function createIncidentComment(id: string, input: CreateIncidentCommentInput) {
  const [incident, author] = await Promise.all([
    prisma.incident.findUnique({ where: { id }, select: { id: true } }),
    prisma.user.findFirst({
      where: { id: input.authorId, active: true },
      select: { id: true },
    }),
  ]);

  if (!incident) {
    throw new AppError(404, 'INCIDENT_NOT_FOUND', 'El incidente no existe');
  }
  if (!author) {
    throw new AppError(404, 'AUTHOR_NOT_FOUND', 'El autor no existe o está inactivo');
  }

  const [comment] = await prisma.$transaction([
    prisma.incidentComment.create({
      data: { incidentId: id, authorId: author.id, content: input.content },
      include: { author: { select: { id: true, name: true, role: true } } },
    }),
    prisma.incidentHistory.create({
      data: {
        incidentId: id,
        actorId: author.id,
        eventType: 'COMMENTED',
        details: { content: input.content },
      },
    }),
  ]);

  return comment;
}

export async function assignTechnician(id: string, input: AssignTechnicianInput) {
  const [incident, technician, actor] = await Promise.all([
    prisma.incident.findUnique({
      where: { id },
      select: { id: true, status: true },
    }),
    prisma.user.findFirst({
      where: {
        id: input.technicianId,
        active: true,
        role: { in: ['TECHNICIAN', 'ADMIN'] },
      },
      select: { id: true, name: true },
    }),
    prisma.user.findFirst({
      where: {
        id: input.actorId,
        active: true,
        role: { in: ['TECHNICIAN', 'ADMIN'] },
      },
      select: { id: true },
    }),
  ]);

  if (!incident) {
    throw new AppError(404, 'INCIDENT_NOT_FOUND', 'El incidente no existe');
  }

  if (!technician) {
    throw new AppError(404, 'TECHNICIAN_NOT_FOUND', 'El técnico no existe o está inactivo');
  }

  if (!actor) {
    throw new AppError(403, 'ACTOR_NOT_AUTHORIZED', 'El usuario no puede asignar técnicos');
  }

  const newStatus = incident.status === 'NUEVO' ? 'ASIGNADO' : incident.status;
  const [updatedIncident] = await prisma.$transaction([
    prisma.incident.update({
      where: { id },
      data: {
        technicianId: technician.id,
        status: newStatus,
      },
      include: incidentSummaryInclude,
    }),
    prisma.incidentHistory.create({
      data: {
        incidentId: id,
        actorId: actor.id,
        eventType: 'ASSIGNED',
        previousStatus: incident.status,
        newStatus,
        details: {
          technicianId: technician.id,
          technicianName: technician.name,
        },
      },
    }),
  ]);

  return updatedIncident;
}

export async function changeIncidentStatus(id: string, input: ChangeIncidentStatusInput) {
  const [incident, actor] = await Promise.all([
    prisma.incident.findUnique({
      where: { id },
      select: { id: true, status: true, technicianId: true },
    }),
    prisma.user.findFirst({
      where: {
        id: input.actorId,
        active: true,
        role: { in: ['TECHNICIAN', 'ADMIN'] },
      },
      select: { id: true },
    }),
  ]);

  if (!incident) {
    throw new AppError(404, 'INCIDENT_NOT_FOUND', 'El incidente no existe');
  }

  if (!actor) {
    throw new AppError(403, 'ACTOR_NOT_AUTHORIZED', 'El usuario no puede cambiar estados');
  }

  const targetStatus = input.status as IncidentStatus;
  const allowedTargets = allowedStatusTransitions[incident.status];
  if (!allowedTargets.includes(targetStatus)) {
    throw new AppError(
      409,
      'INVALID_STATUS_TRANSITION',
      `No se permite cambiar de ${incident.status} a ${targetStatus}`,
    );
  }

  if (targetStatus === 'ASIGNADO' && !incident.technicianId) {
    throw new AppError(
      409,
      'TECHNICIAN_REQUIRED',
      'Debe asignarse un técnico antes de cambiar a ASIGNADO',
    );
  }

  const timestampChanges = {
    ...(targetStatus === 'RESUELTO' ? { resolvedAt: new Date() } : {}),
    ...(targetStatus === 'CERRADO' ? { closedAt: new Date() } : {}),
  };

  const [updatedIncident] = await prisma.$transaction([
    prisma.incident.update({
      where: { id },
      data: { status: targetStatus, ...timestampChanges },
      include: incidentSummaryInclude,
    }),
    prisma.incidentHistory.create({
      data: {
        incidentId: id,
        actorId: actor.id,
        eventType: 'STATUS_CHANGED',
        previousStatus: incident.status,
        newStatus: targetStatus,
        details: {
          from: incident.status,
          to: targetStatus,
          ...(input.reason ? { reason: input.reason } : {}),
        },
      },
    }),
  ]);

  return updatedIncident;
}
