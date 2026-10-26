import { z } from 'zod';

export const createIncidentSchema = z.object({
  body: z.object({
    title: z.string().trim().min(5).max(160),
    description: z.string().trim().min(10).max(5000),
    priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
    reporterId: z.string().uuid(),
    categoryId: z.string().uuid(),
  }),
});

export type CreateIncidentInput = z.infer<typeof createIncidentSchema>['body'];

export const listIncidentsSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
    status: z.enum(['NUEVO', 'ASIGNADO', 'EN_PROCESO', 'RESUELTO', 'CERRADO']).optional(),
    priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
    categoryId: z.string().uuid().optional(),
    technicianId: z.string().uuid().optional(),
    reporterId: z.string().uuid().optional(),
  }).strict(),
});

export const metricsQuerySchema = z.object({
  query: z.object({
    reporterId: z.string().uuid().optional(),
    technicianId: z.string().uuid().optional(),
  }).strict(),
});

export const incidentIdSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
});

export const createIncidentCommentSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
  body: z.object({
    authorId: z.string().uuid(),
    content: z.string().trim().min(1).max(2000),
  }),
});

export const listIncidentCommentsSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
  query: z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
  }),
});

export const assignTechnicianSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
  body: z.object({
    technicianId: z.string().uuid(),
    actorId: z.string().uuid(),
  }),
});

export const changeIncidentStatusSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
  body: z
    .object({
      status: z.enum(['NUEVO', 'ASIGNADO', 'EN_PROCESO', 'RESUELTO', 'CERRADO']),
      actorId: z.string().uuid(),
      reason: z.string().trim().min(10).max(1000).optional(),
    })
    .superRefine((body, context) => {
      if (['RESUELTO', 'CERRADO'].includes(body.status) && !body.reason) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['reason'],
          message: 'El motivo es obligatorio para resolver o cerrar un incidente',
        });
      }
    }),
});

export type ListIncidentsInput = z.infer<typeof listIncidentsSchema>['query'];
export type AssignTechnicianInput = z.infer<typeof assignTechnicianSchema>['body'];
export type ChangeIncidentStatusInput = z.infer<typeof changeIncidentStatusSchema>['body'];
export type CreateIncidentCommentInput = z.infer<typeof createIncidentCommentSchema>['body'];
export type ListIncidentCommentsInput = z.infer<typeof listIncidentCommentsSchema>['query'];
