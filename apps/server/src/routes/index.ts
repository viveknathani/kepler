import { Hono } from 'hono';
import {
  bootstrap,
  createSchedule,
  createFeedback,
  deleteSchedule,
  getAgentRuns,
  getAgents,
  getProfiles,
  getReports,
  getReport,
  getRuns,
  getSchedules,
  getWorkflows,
  startWorkflow,
  updateProfile,
  updateSchedule,
  updateWorkflow,
} from '../controllers/kepler';
import { authMiddleware } from '../middlewares/auth';
import type { AppEnv } from '../types';

export const router = new Hono<AppEnv>();
router.get('/', (c) => c.text('hello from kepler!'));
router.get('/api/v1/health', (c) => c.json({ status: 'success' }));
router.post('/api/v1/bootstrap', authMiddleware, bootstrap);
router.get('/api/v1/profiles', authMiddleware, getProfiles);
router.put('/api/v1/profiles/:id', authMiddleware, updateProfile);
router.get('/api/v1/workflows', authMiddleware, getWorkflows);
router.put('/api/v1/workflows/:id', authMiddleware, updateWorkflow);
router.post('/api/v1/workflows/:id/runs', authMiddleware, startWorkflow);
router.get('/api/v1/schedules', authMiddleware, getSchedules);
router.post('/api/v1/workflows/:id/schedules', authMiddleware, createSchedule);
router.put('/api/v1/schedules/:id', authMiddleware, updateSchedule);
router.delete('/api/v1/schedules/:id', authMiddleware, deleteSchedule);
router.get('/api/v1/runs', authMiddleware, getRuns);
router.get('/api/v1/agents', authMiddleware, getAgents);
router.get('/api/v1/agents/:slug/runs', authMiddleware, getAgentRuns);
router.get('/api/v1/reports', authMiddleware, getReports);
router.get('/api/v1/reports/:id', authMiddleware, getReport);
router.post(
  '/api/v1/report-items/:id/feedback',
  authMiddleware,
  createFeedback,
);
