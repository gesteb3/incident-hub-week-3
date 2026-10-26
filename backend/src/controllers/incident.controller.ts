import type { NextFunction, Request, Response } from 'express';
import { getIncidentMetrics } from '../services/metrics.service.js';
import {
  createIncidentSchema,
  assignTechnicianSchema,
  changeIncidentStatusSchema,
  incidentIdSchema,
  listIncidentsSchema,
  metricsQuerySchema,
  createIncidentCommentSchema,
  listIncidentCommentsSchema,
} from '../schemas/incident.schema.js';
import {
  createIncident,
  assignTechnician,
  changeIncidentStatus,
  getIncidentById,
  getIncidentHistory,
  listIncidents,
  createIncidentComment,
  listIncidentComments,
} from '../services/incident.service.js';

export async function createIncidentController(
  request: Request,
  response: Response,
  next: NextFunction,
) {
  try {
    const { body } = createIncidentSchema.parse({ body: request.body });
    const incident = await createIncident(body);

    response.status(201).json({ data: incident });
  } catch (error) {
    next(error);
  }
}

export async function getIncidentMetricsController(
  request: Request,
  response: Response,
  next: NextFunction,
) {
  try {
    const { query } = metricsQuerySchema.parse({ query: request.query });
    const metrics = await getIncidentMetrics(query);
    response.set('Cache-Control', 'no-store').json({ data: metrics });
  } catch (error) {
    next(error);
  }
}

export async function assignTechnicianController(
  request: Request,
  response: Response,
  next: NextFunction,
) {
  try {
    const { params, body } = assignTechnicianSchema.parse({
      params: request.params,
      body: request.body,
    });
    const incident = await assignTechnician(params.id, body);
    response.status(200).json({ data: incident });
  } catch (error) {
    next(error);
  }
}

export async function changeIncidentStatusController(
  request: Request,
  response: Response,
  next: NextFunction,
) {
  try {
    const { params, body } = changeIncidentStatusSchema.parse({
      params: request.params,
      body: request.body,
    });
    const incident = await changeIncidentStatus(params.id, body);
    response.status(200).json({ data: incident });
  } catch (error) {
    next(error);
  }
}

export async function getIncidentHistoryController(
  request: Request,
  response: Response,
  next: NextFunction,
) {
  try {
    const { params } = incidentIdSchema.parse({ params: request.params });
    const history = await getIncidentHistory(params.id);
    response.status(200).json({ data: history });
  } catch (error) {
    next(error);
  }
}

export async function listIncidentCommentsController(
  request: Request,
  response: Response,
  next: NextFunction,
) {
  try {
    const { params, query } = listIncidentCommentsSchema.parse({
      params: request.params,
      query: request.query,
    });
    const result = await listIncidentComments(params.id, query);
    response.status(200).json({ data: result.items, meta: result.pagination });
  } catch (error) {
    next(error);
  }
}

export async function createIncidentCommentController(
  request: Request,
  response: Response,
  next: NextFunction,
) {
  try {
    const { params, body } = createIncidentCommentSchema.parse({
      params: request.params,
      body: request.body,
    });
    const comment = await createIncidentComment(params.id, body);
    response.status(201).json({ data: comment });
  } catch (error) {
    next(error);
  }
}

export async function listIncidentsController(
  request: Request,
  response: Response,
  next: NextFunction,
) {
  try {
    const { query } = listIncidentsSchema.parse({ query: request.query });
    const result = await listIncidents(query);
    response.status(200).json({ data: result.items, meta: result.pagination });
  } catch (error) {
    next(error);
  }
}

export async function getIncidentByIdController(
  request: Request,
  response: Response,
  next: NextFunction,
) {
  try {
    const { params } = incidentIdSchema.parse({ params: request.params });
    const incident = await getIncidentById(params.id);
    response.status(200).json({ data: incident });
  } catch (error) {
    next(error);
  }
}
