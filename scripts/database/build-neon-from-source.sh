#!/bin/bash
#
# Neon Build from Source Script
#
# This script compiles Neon PostgreSQL from the official GitHub repository.
# Build time: ~30 minutes (first build), faster with Docker cache.
#
# Usage:
#   bash scripts/database/build-neon-from-source.sh [--no-cache] [--version TAG]
#
# Options:
#   --no-cache    : Force rebuild without using Docker cache
#   --version TAG : Build specific Neon version/tag (default: latest)
#   --help        : Show this help message
#

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
DOCKERFILE="tools/compose/neon.Dockerfile"
IMAGE_NAME="neon-local"
IMAGE_TAG="latest"
NEON_VERSION="latest"
USE_CACHE=true

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --no-cache)
      USE_CACHE=false
      shift
      ;;
    --version)
      NEON_VERSION="$2"
      IMAGE_TAG="$2"
      shift 2
      ;;
    --help)
      grep '^#' "$0" | sed 's/^# //' | sed 's/^#//'
      exit 0
      ;;
    *)
      echo -e "${RED}Unknown option: $1${NC}"
      exit 1
      ;;
  esac
done

# Helper functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

log_build() {
    echo -e "${CYAN}[BUILD]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    log_step "Checking prerequisites..."
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed!"
        exit 1
    fi
    log_info "✓ Docker found: $(docker --version)"
    
    # Check Docker Compose
    if ! docker compose version &> /dev/null; then
        log_error "Docker Compose is not installed!"
        exit 1
    fi
    log_info "✓ Docker Compose found: $(docker compose version)"
    
    # Check Dockerfile exists
    if [ ! -f "$DOCKERFILE" ]; then
        log_error "Dockerfile not found: $DOCKERFILE"
        exit 1
    fi
    log_info "✓ Dockerfile found: $DOCKERFILE"
    
    # Check available disk space (need at least 10GB)
    AVAILABLE_SPACE=$(df -BG . | tail -1 | awk '{print $4}' | sed 's/G//')
    if [ "$AVAILABLE_SPACE" -lt 10 ]; then
        log_warn "Low disk space: ${AVAILABLE_SPACE}GB available (recommended: 10GB+)"
        echo -n "Continue anyway? (yes/no): "
        read -r response
        if [ "$response" != "yes" ]; then
            log_error "Build cancelled by user"
            exit 1
        fi
    else
        log_info "✓ Disk space: ${AVAILABLE_SPACE}GB available"
    fi
    
    echo ""
}

# Display build information
display_build_info() {
    echo ""
    log_info "=========================================="
    log_info "Neon Build Configuration"
    log_info "=========================================="
    echo ""
    echo "  Image Name: $IMAGE_NAME:$IMAGE_TAG"
    echo "  Neon Version: $NEON_VERSION"
    echo "  Use Cache: $USE_CACHE"
    echo "  Dockerfile: $DOCKERFILE"
    echo ""
    echo "  Estimated Build Time:"
    echo "    - First build: ~30 minutes"
    echo "    - With cache: ~5 minutes"
    echo ""
    log_info "=========================================="
    echo ""
}

# Build Neon image
build_neon() {
    log_step "Building Neon from source..."
    echo ""
    
    BUILD_ARGS="--build-arg NEON_VERSION=$NEON_VERSION"
    CACHE_FLAG=""
    
    if [ "$USE_CACHE" = false ]; then
        CACHE_FLAG="--no-cache"
        log_warn "Building without cache (this will take longer)"
    fi
    
    log_build "Starting Docker build..."
    log_build "This will compile Rust code and PostgreSQL from source"
    echo ""
    
    # Build with progress
    if docker build \
        -f "$DOCKERFILE" \
        -t "$IMAGE_NAME:$IMAGE_TAG" \
        $BUILD_ARGS \
        $CACHE_FLAG \
        --progress=plain \
        . ; then
        
        echo ""
        log_info "✓ Build successful!"
    else
        echo ""
        log_error "Build failed!"
        log_error "Check the error messages above for details"
        exit 1
    fi
}

# Tag image
tag_image() {
    if [ "$IMAGE_TAG" != "latest" ]; then
        log_step "Tagging image as latest..."
        docker tag "$IMAGE_NAME:$IMAGE_TAG" "$IMAGE_NAME:latest"
        log_info "✓ Tagged $IMAGE_NAME:$IMAGE_TAG as $IMAGE_NAME:latest"
    fi
}

# Verify build
verify_build() {
    log_step "Verifying build..."
    
    # Check image exists
    if docker images | grep -q "$IMAGE_NAME"; then
        local image_size=$(docker images "$IMAGE_NAME:$IMAGE_TAG" --format "{{.Size}}")
        log_info "✓ Image created: $IMAGE_NAME:$IMAGE_TAG ($image_size)"
    else
        log_error "Image not found after build!"
        exit 1
    fi
    
    # Test image (quick validation)
    log_info "Testing image..."
    if docker run --rm "$IMAGE_NAME:$IMAGE_TAG" /usr/local/bin/pageserver --version &> /dev/null; then
        log_info "✓ Pageserver binary working"
    else
        log_warn "Could not verify pageserver (this may be normal)"
    fi
}

# Display next steps
display_next_steps() {
    echo ""
    log_info "=========================================="
    log_info "Build Complete!"
    log_info "=========================================="
    echo ""
    echo "Next Steps:"
    echo ""
    echo "1. Start Workspace stack (Neon + API):"
    echo "   bash scripts/docker/start-workspace-stack.sh"
    echo ""
    echo "2. Initialize workspace database:"
    echo "   bash scripts/database/init-neon-workspace.sh"
    echo ""
    echo "3. Test connection:"
    echo "   bash scripts/database/test-neon-connection.sh"
    echo ""
    echo "4. Check status:"
    echo "   docker compose -f tools/compose/docker-compose.workspace-stack.yml ps"
    echo ""
    log_info "=========================================="
    echo ""
    log_info "Image Details:"
    docker images "$IMAGE_NAME:$IMAGE_TAG" --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}\t{{.CreatedAt}}"
    echo ""
}

# Cleanup on error
cleanup_on_error() {
    log_error "Build interrupted or failed"
    log_warn "Cleaning up..."
    
    # Stop any running build containers
    docker ps -a | grep "neon" | awk '{print $1}' | xargs -r docker rm -f
    
    exit 1
}

# Trap errors
trap cleanup_on_error ERR INT TERM

# Main execution
main() {
    echo ""
    echo "=========================================="
    echo "Neon PostgreSQL - Build from Source"
    echo "=========================================="
    echo ""
    
    check_prerequisites
    display_build_info
    
    # Confirmation
    echo -n "Start build? (yes/no): "
    read -r response
    if [ "$response" != "yes" ]; then
        log_warn "Build cancelled by user"
        exit 0
    fi
    
    echo ""
    log_info "Starting build process..."
    echo ""
    
    # Start timer
    START_TIME=$(date +%s)
    
    # Build
    build_neon
    tag_image
    verify_build
    
    # End timer
    END_TIME=$(date +%s)
    DURATION=$((END_TIME - START_TIME))
    MINUTES=$((DURATION / 60))
    SECONDS=$((DURATION % 60))
    
    echo ""
    log_info "Build completed in ${MINUTES}m ${SECONDS}s"
    
    display_next_steps
}

# Run main function
main "$@"

