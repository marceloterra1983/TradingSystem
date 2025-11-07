const APP_URL =
  import.meta.env.VITE_COURSE_CRAWLER_APP_URL ?? 'http://localhost:4201';

export default function CourseCrawlerPage() {
  return (
    <div className="h-[calc(100vh-8rem)] w-full">
      <iframe
        title="Course Crawler"
        src={APP_URL}
        className="h-full w-full border-0"
        allow="fullscreen"
      />
    </div>
  );
}
