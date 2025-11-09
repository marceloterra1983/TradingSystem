# Course Crawler Frontend

**React + TypeScript + Vite** standalone UI for Course Crawler stack.

## 📦 Stack Overview

The Course Crawler frontend is part of a dedicated 4-container stack:

```
┌─────────────────────────────────────────────────────┐
│  Course Crawler Stack (docker-compose.course-crawler.yml) │
├─────────────────────────────────────────────────────┤
│                                                       │
│  📦 course-crawler-db         (PostgreSQL 15)       │
│     Port: 55433 → 5432                               │
│     Database: coursecrawler                          │
│                                                       │
│  🔧 course-crawler-api        (Node.js + Express)   │
│     Port: 3601                                       │
│     REST API for CRUD operations                     │
│                                                       │
│  ⚙️  course-crawler-worker    (Node.js + Puppeteer) │
│     Background job processor                         │
│     Executes scraping tasks                          │
│                                                       │
│  🎨 course-crawler-ui         (React + Vite + NGINX)│
│     Port: 4201 → 80                                  │
│     This frontend application                        │
│                                                       │
└─────────────────────────────────────────────────────┘
```

## 🚀 Quick Start

### Development Mode

```bash
# Install dependencies
npm install

# Start development server (port 4201)
npm run dev

# Access at http://localhost:4201
```

### Production Build

```bash
# Build for production
npm run build

# Preview production build
npm run preview
```

### Docker Container

The production deployment uses Docker with multi-stage build:

```bash
# Build and run container (via docker-compose)
cd /home/marce/Projetos/TradingSystem
docker compose -f tools/compose/docker-compose.course-crawler.yml up -d course-crawler-ui

# Access at http://localhost:4201
```

## 📁 Project Structure

```
frontend/course-crawler/
├── src/
│   ├── components/           # UI components
│   │   ├── common/          # Reusable components (ThemeToggle, etc.)
│   │   └── layout/          # Layout components (Header, Sidebar)
│   │
│   ├── pages/               # Page components (React Router)
│   │   ├── CoursesPage.tsx  # Course credentials management
│   │   ├── RunsPage.tsx     # Execution runs history
│   │   └── ArtifactsPage.tsx # Artifact viewer (Markdown/JSON)
│   │
│   ├── services/            # API client
│   │   └── api.ts           # Course Crawler API client
│   │
│   ├── contexts/            # React contexts
│   │   └── ThemeContext.tsx # Dark/light mode
│   │
│   ├── App.tsx              # Main app component (React Router)
│   ├── main.tsx             # Entry point
│   └── index.css            # Global styles (Tailwind + custom CSS vars)
│
├── public/                  # Static assets
├── Dockerfile               # Multi-stage production build
├── vite.config.ts           # Vite configuration
├── tailwind.config.js       # Tailwind CSS configuration
├── tsconfig.json            # TypeScript configuration
└── package.json             # Dependencies and scripts
```

## 🎯 Features

### 1. **Courses Management** (`/courses`)
- ✅ CRUD operations for course credentials
- ✅ Platform selection (Udemy, Coursera, Pluralsight, Other)
- ✅ Encrypted password storage (server-side)
- ✅ Password visibility toggle
- ✅ Form validation

### 2. **Runs History** (`/runs`)
- ✅ List all scheduled and completed runs
- ✅ Status filtering (All, Pending, Running, Completed, Failed)
- ✅ Real-time progress tracking
- ✅ Run cancellation (pending/running only)
- ✅ Navigation to artifacts
- ✅ Error display

### 3. **Artifacts Viewer** (`/artifacts`)
- ✅ List artifacts by run
- ✅ Preview Markdown files (with syntax highlighting)
- ✅ Preview JSON files (formatted)
- ✅ Download artifacts
- ✅ Split-panel layout (list + preview)

## 🔌 API Integration

The frontend communicates with `course-crawler-api` (port 3601) via the API client in [src/services/api.ts](src/services/api.ts).

### Environment Variables

Configure API URL via environment variables:

```env
# .env or .env.local
VITE_COURSE_CRAWLER_API_URL=http://localhost:3601
VITE_COURSE_CRAWLER_APP_URL=http://localhost:4201
VITE_DOCKER_CONTROL_URL=http://127.0.0.1:9876
COURSE_CRAWLER_TIMEOUT_MS=3600000
```

These are injected at build time by Vite and referenced in Docker Compose:

```yaml
# tools/compose/docker-compose.course-crawler.yml
course-crawler-ui:
  build:
    args:
      VITE_COURSE_CRAWLER_API_URL: ${VITE_COURSE_CRAWLER_API_URL}
      VITE_COURSE_CRAWLER_APP_URL: ${VITE_COURSE_CRAWLER_APP_URL}
      VITE_DOCKER_CONTROL_URL: ${VITE_DOCKER_CONTROL_URL:-http://127.0.0.1:9876}
      COURSE_CRAWLER_TIMEOUT_MS: ${COURSE_CRAWLER_TIMEOUT_MS:-3600000}
```

> 💡 The optional `VITE_DOCKER_CONTROL_URL` is used by the **Worker Logs** card to pull
> `docker logs --tail 50 course-crawler-worker` via the local Docker Control Server
> (`tools/docker-launcher/docker-control-server.js`). Keep the server running (port 9876)
> to enable automatic log refresh inside the UI.

## 🎨 Styling

### Tailwind CSS + CSS Variables

The project uses **Tailwind CSS** with custom CSS variables for theming:

- **Light Mode**: Default color scheme (`:root`)
- **Dark Mode**: Dark color scheme (`.dark`)
- **CSS Variables**: 31 variables for colors, backgrounds, borders, etc.

See [src/index.css](src/index.css) for the complete theme configuration.

### UI Components (Radix UI)

The project uses **Radix UI** primitives for accessible components:

- `@radix-ui/react-dialog` - Modals
- `@radix-ui/react-tabs` - Tabs
- `@radix-ui/react-select` - Select dropdowns
- `@radix-ui/react-switch` - Toggle switches
- `@radix-ui/react-tooltip` - Tooltips
- And more...

## 🧪 Testing

```bash
# Unit tests (Vitest)
npm run test

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage

# E2E tests (Playwright)
npm run test:e2e

# E2E with UI
npm run test:e2e:ui
```

## 🔧 Scripts

```bash
# Development
npm run dev              # Start dev server (port 4201)
npm run build            # Production build
npm run preview          # Preview production build

# Code Quality
npm run lint             # ESLint
npm run lint:fix         # ESLint with auto-fix
npm run type-check       # TypeScript type checking

# Testing
npm run test             # Run unit tests
npm run test:watch       # Watch mode
npm run test:coverage    # Coverage report
npm run test:e2e         # E2E tests

# Bundle Analysis
npm run check:bundle     # Check bundle size
npm run analyze:bundle   # Visual bundle analyzer
```

## 📊 Bundle Optimization

The project is configured for optimal bundle size:

- ✅ **Code Splitting**: Route-based lazy loading
- ✅ **Tree Shaking**: Dead code elimination
- ✅ **Minification**: Terser plugin
- ✅ **Compression**: Gzip + Brotli (via `vite-plugin-compression`)
- ✅ **Bundle Analyzer**: Visual inspection with `rollup-plugin-visualizer`

Expected bundle size: **~300KB gzipped** (excluding vendor chunks)

## 🌐 Browser Support

- Chrome/Edge (latest 2 versions)
- Firefox (latest 2 versions)
- Safari 14+

## 🐳 Docker Deployment

### Multi-Stage Build

The [Dockerfile](Dockerfile) uses multi-stage build for optimization:

```dockerfile
# Stage 1: Build
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci
COPY . .
ARG VITE_COURSE_CRAWLER_API_URL
ARG VITE_COURSE_CRAWLER_APP_URL
ENV VITE_COURSE_CRAWLER_API_URL=${VITE_COURSE_CRAWLER_API_URL}
ENV VITE_COURSE_CRAWLER_APP_URL=${VITE_COURSE_CRAWLER_APP_URL}
RUN npm run build

# Stage 2: Production
FROM nginx:1.27-alpine
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### Build & Run

```bash
# Build container
docker compose -f tools/compose/docker-compose.course-crawler.yml build course-crawler-ui

# Start container
docker compose -f tools/compose/docker-compose.course-crawler.yml up -d course-crawler-ui

# Check logs
docker compose -f tools/compose/docker-compose.course-crawler.yml logs -f course-crawler-ui

# Stop container
docker compose -f tools/compose/docker-compose.course-crawler.yml down
```

## 📱 Dashboard Integration

The Course Crawler UI is embedded in the main TradingSystem Dashboard via iframe:

**File:** `frontend/dashboard/src/components/pages/CourseCrawlerPage.tsx`

```tsx
const APP_URL = import.meta.env.VITE_COURSE_CRAWLER_APP_URL ?? 'http://localhost:4201';

export default function CourseCrawlerPage() {
  return (
    <div className="flex flex-col gap-4">
      <div className="...">
        <h2>Course Crawler</h2>
        <p>Stack dedicada para cadastrar credenciais...</p>
        <a href={APP_URL} target="_blank">Abrir em nova aba</a>
      </div>

      <iframe
        title="Course Crawler"
        src={APP_URL}
        className="h-[72vh] w-full rounded-2xl border-0"
      />
    </div>
  );
}
```

This allows users to access the Course Crawler UI:
1. **Embedded** in the Dashboard (Apps → Course Crawler)
2. **Standalone** in a new tab (via "Abrir em nova aba" button)

## 🔐 Security

- ✅ **Credentials Encrypted**: Passwords encrypted server-side (via `COURSE_CRAWLER_ENCRYPTION_KEY`)
- ✅ **No Plaintext Storage**: API never returns plaintext passwords
- ✅ **HTTPS Ready**: Production deployment should use HTTPS
- ✅ **CORS Configured**: API allows requests from trusted origins only

## 📝 Environment Variables Reference

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_COURSE_CRAWLER_API_URL` | `http://localhost:3601` | Course Crawler API base URL |
| `VITE_COURSE_CRAWLER_APP_URL` | `http://localhost:4201` | Frontend app URL (for dashboard embed) |

**Note:** Variables prefixed with `VITE_` are exposed to the browser. Never expose secrets!

## 🐛 Troubleshooting

### API Connection Failed

**Symptom:** "Failed to load courses" error

**Solution:**
1. Check if `course-crawler-api` is running: `docker ps | grep course-crawler-api`
2. Verify API URL: `echo $VITE_COURSE_CRAWLER_API_URL`
3. Check API health: `curl http://localhost:3601/health`

### Container Build Failed

**Symptom:** Docker build errors

**Solution:**
1. Clear build cache: `docker builder prune -a`
2. Rebuild with no cache: `docker compose -f tools/compose/docker-compose.course-crawler.yml build --no-cache course-crawler-ui`

### Dark Mode Not Working

**Symptom:** Theme toggle doesn't change appearance

**Solution:**
1. Check if `ThemeContext` is wrapping the app in `main.tsx`
2. Verify CSS variables in `src/index.css` (`:root` and `.dark` selectors)
3. Clear browser cache

## 📚 Related Documentation

- **API Documentation**: `backend/api/course-crawler/README.md`
- **Worker Documentation**: `backend/api/course-crawler/worker/README.md`
- **CLI Documentation**: `apps/course-crawler/README.md`
- **Docker Compose Stack**: `tools/compose/docker-compose.course-crawler.yml`
- **Environment Variables**: `config/.env.defaults` (search for `COURSE_CRAWLER`)

## 🤝 Contributing

When adding new features:

1. Create page component in `src/pages/`
2. Add route in `src/App.tsx`
3. Update API client in `src/services/api.ts`
4. Add tests in `src/__tests__/`
5. Update this README

## 📄 License

MIT License - See root LICENSE file for details.
