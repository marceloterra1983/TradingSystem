import type { Express } from "express";
import { Router } from "express";
import {
  createCourse,
  deleteCourse,
  getCourse,
  getCourseWithSecret,
  listCourses,
  updateCourse,
} from "../services/course-service.js";
import { validateBody, validateParams } from "../middleware/validation.js";
import { authenticateJWT } from "../middleware/auth.js";
import { CacheStrategies } from "../middleware/cache.js";
import {
  CreateCourseSchema,
  UpdateCourseSchema,
  CourseIdSchema,
} from "../schemas/course.schema.js";

export function registerCourseRoutes(app: Express) {
  const router = Router();

  // Apply JWT authentication to all course routes
  router.use(authenticateJWT);

  // List courses - cache for 5 minutes (courses don't change frequently)
  router.get("/", CacheStrategies.short(), async (req, res, next) => {
    try {
      const courses = await listCourses();
      res.json(courses);
    } catch (error) {
      next(error);
    }
  });

  // Get course by ID - cache for 5 minutes
  router.get(
    "/:id",
    CacheStrategies.short(),
    validateParams(CourseIdSchema),
    async (req, res, next) => {
      try {
        const course = await getCourse(req.params.id);
        if (!course) {
          res.status(404).json({ message: "Course not found" });
          return;
        }
        res.json(course);
      } catch (error) {
        next(error);
      }
    },
  );

  // New endpoint to get course with decrypted password
  // Get course password - no cache (sensitive data)
  router.get(
    "/:id/password",
    CacheStrategies.noCache(),
    validateParams(CourseIdSchema),
    async (req, res, next) => {
      try {
        const courseWithSecret = await getCourseWithSecret(req.params.id);
        if (!courseWithSecret) {
          res.status(404).json({ message: "Course not found" });
          return;
        }
        // Only return the password field
        res.json({ password: courseWithSecret.password });
      } catch (error) {
        next(error);
      }
    },
  );

  // Create course - no cache
  router.post(
    "/",
    CacheStrategies.noCache(),
    validateBody(CreateCourseSchema),
    async (req, res, next) => {
      try {
        const record = await createCourse(req.body);
        res.status(201).json(record);
      } catch (error) {
        next(error);
      }
    },
  );

  // Update course - no cache
  router.put(
    "/:id",
    CacheStrategies.noCache(),
    validateParams(CourseIdSchema),
    validateBody(UpdateCourseSchema),
    async (req, res, next) => {
      try {
        const record = await updateCourse(req.params.id, req.body);
        if (!record) {
          res.status(404).json({ message: "Course not found" });
          return;
        }
        res.json(record);
      } catch (error) {
        next(error);
      }
    },
  );

  // Delete course - no cache
  router.delete(
    "/:id",
    CacheStrategies.noCache(),
    validateParams(CourseIdSchema),
    async (req, res, next) => {
      try {
        await deleteCourse(req.params.id);
        res.status(204).send();
      } catch (error) {
        next(error);
      }
    },
  );

  app.use("/courses", router);
}
