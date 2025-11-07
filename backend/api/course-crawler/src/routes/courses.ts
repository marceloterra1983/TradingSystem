import type { Express } from 'express';
import { Router } from 'express';
import { z } from 'zod';
import {
  createCourse,
  deleteCourse,
  getCourse,
  getCourseWithSecret,
  listCourses,
  updateCourse,
} from '../services/course-service.js';

const courseSchema = z.object({
  name: z.string().min(1),
  baseUrl: z.string().url(),
  username: z.string().min(1),
  password: z.string(), // Allow empty string for password-less sites
  targetUrls: z.array(z.string().url()).optional(),
});

const updateSchema = courseSchema.partial().extend({
  password: z.string().optional(), // Allow empty string for password-less sites
});

export function registerCourseRoutes(app: Express) {
  const router = Router();

  router.get('/', async (req, res, next) => {
    try {
      const courses = await listCourses();
      res.json(courses);
    } catch (error) {
      next(error);
    }
  });

  router.get('/:id', async (req, res, next) => {
    try {
      const course = await getCourse(req.params.id);
      if (!course) {
        res.status(404).json({ message: 'Course not found' });
        return;
      }
      res.json(course);
    } catch (error) {
      next(error);
    }
  });

  // New endpoint to get course with decrypted password
  router.get('/:id/password', async (req, res, next) => {
    try {
      const courseWithSecret = await getCourseWithSecret(req.params.id);
      if (!courseWithSecret) {
        res.status(404).json({ message: 'Course not found' });
        return;
      }
      // Only return the password field
      res.json({ password: courseWithSecret.password });
    } catch (error) {
      next(error);
    }
  });

  router.post('/', async (req, res, next) => {
    try {
      const payload = courseSchema.parse(req.body);
      const record = await createCourse(payload);
      res.status(201).json(record);
    } catch (error) {
      next(error);
    }
  });

  router.put('/:id', async (req, res, next) => {
    try {
      const payload = updateSchema.parse(req.body);
      const record = await updateCourse(req.params.id, payload);
      if (!record) {
        res.status(404).json({ message: 'Course not found' });
        return;
      }
      res.json(record);
    } catch (error) {
      next(error);
    }
  });

  router.delete('/:id', async (req, res, next) => {
    try {
      await deleteCourse(req.params.id);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  });

  app.use('/courses', router);
}
