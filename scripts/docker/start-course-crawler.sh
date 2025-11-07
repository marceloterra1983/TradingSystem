#!/bin/bash

# Course Crawler Stack Startup Script
# Ensures correct environment variables are loaded

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

echo "🚀 Starting Course Crawler Stack..."
echo "📁 Project root: $PROJECT_ROOT"

# Set required environment variables
export COURSE_CRAWLER_DATABASE_URL='postgresql://postgres:coursecrawler@course-crawler-db:5432/coursecrawler'
export COURSE_CRAWLER_NEON_DATABASE_URL='postgresql://postgres:coursecrawler@course-crawler-db:5432/coursecrawler'
export COURSE_CRAWLER_MAX_CLASSES_PER_MODULE=50

# Navigate to project root
cd "$PROJECT_ROOT"

# Start the stack
docker compose -f tools/compose/docker-compose.course-crawler.yml up -d

echo ""
echo "✅ Course Crawler Stack started successfully!"
echo ""
echo "📊 Services:"
echo "   - API:      http://localhost:3601"
echo "   - Frontend: http://localhost:4201"
echo "   - Database: localhost:55433"
echo ""
echo "🔍 Check status:"
echo "   docker ps | grep course-crawler"
echo ""
echo "📋 View logs:"
echo "   docker logs course-crawler-api"
echo "   docker logs course-crawler-worker"
echo "   docker logs course-crawler-ui"
echo ""
