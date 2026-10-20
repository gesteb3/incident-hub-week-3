import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { env } from './config/env.js';
import { errorHandler } from './middleware/error-handler.js';
import { incidentRouter } from './routes/incident.routes.js';
import { prisma } from './lib/prisma.js';

export const app = express();

app.disable('x-powered-by');
app.use(helmet());
app.use(cors({ origin: env.CORS_ORIGIN }));
app.use(express.json({ limit: '100kb' }));

app.get('/health', (_request, response) => {
  response.status(200).json({ status: 'ok' });
});

app.use('/api/incidents', incidentRouter);
app.get('/api/catalogs', async (_request, response, next) => {
  try {
    const [categories, technicians, users] = await Promise.all([
      prisma.category.findMany({
        where: { active: true },
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
      }),
      prisma.user.findMany({
        where: { active: true, role: 'TECHNICIAN' },
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
      }),
      prisma.user.findMany({
        where: { active: true },
        select: { id: true, name: true, role: true },
        orderBy: { name: 'asc' },
      }),
    ]);
    response.json({ data: { categories, technicians, users } });
  } catch (error) {
    next(error);
  }
});
app.use(errorHandler);
