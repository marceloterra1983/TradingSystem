import { useMemo } from 'react';
import { CustomizablePageLayout } from '../components/layout/CustomizablePageLayout';
import { CoursesSection } from '../components/CoursesSection';
import { RunsSection } from '../components/RunsSection';
import { ArtifactsSection } from '../components/ArtifactsSection';
import { WorkerLogsSection } from '../components/WorkerLogsSection';

/**
 * Course Crawler Home Page
 * Three-section layout with customizable grid:
 * 1. Courses - CRUD management of course credentials
 * 2. Runs - Track scraping execution status
 * 3. Artifacts - View and download generated files
 */
export function HomePage() {
  // TODO: Implement run selection mechanism to pass runId to ArtifactsSection
  // For now, ArtifactsSection shows message to select a run from RunsSection
  const selectedRunId = undefined;

  const sections = useMemo(
    () => [
      {
        id: 'course-crawler-courses',
        content: <CoursesSection />,
      },
      {
        id: 'course-crawler-runs',
        content: <RunsSection />,
      },
      {
        id: 'course-crawler-worker-logs',
        content: <WorkerLogsSection />,
      },
      {
        id: 'course-crawler-artifacts',
        content: <ArtifactsSection runId={selectedRunId} />,
      },
    ],
    [selectedRunId],
  );

  return (
    <CustomizablePageLayout
      pageId="course-crawler"
      title="Course Crawler"
      subtitle="Manage course credentials, schedule scraping runs, and view generated artifacts"
      sections={sections}
      defaultColumns={1}
    />
  );
}

export default HomePage;
