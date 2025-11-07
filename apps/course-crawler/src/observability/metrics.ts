import type { ClassResource, CourseResource, ExtractionMetrics } from '../types.js';

export function computeMetrics(courses: CourseResource[]): ExtractionMetrics {
  const totalCourses = courses.length;
  const modules = courses.flatMap((course) => course.modules);
  const classes = modules.flatMap((module) => module.classes);
  const totalClasses = classes.length;
  const avgConfidence = classes.length
    ? classes.reduce((sum, item) => sum + (item.confidenceScore ?? 0), 0) /
      classes.length
    : 0;
  const minConfidence = classes.length
    ? Math.min(...classes.map((item) => item.confidenceScore ?? 0))
    : 0;

  return {
    totalCourses,
    totalModules: modules.length,
    totalClasses,
    successRate: classes.length
      ? classes.filter((cls) => (cls.markdown?.length ?? 0) > 50).length /
        classes.length
      : 0,
    minConfidence,
    avgConfidence,
    selectorFailures: classes.filter((cls) => cls.confidenceScore === 0).length,
  };
}

export function summarizeConfidences(classes: ClassResource[]) {
  return {
    min: classes.length
      ? Math.min(...classes.map((c) => c.confidenceScore ?? 0))
      : 0,
    avg: classes.length
      ?
          classes.reduce((acc, cls) => acc + (cls.confidenceScore ?? 0), 0) /
          classes.length
      : 0,
  };
}
