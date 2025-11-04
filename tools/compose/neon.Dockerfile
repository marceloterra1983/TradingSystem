# Neon PostgreSQL - Build from Source
# 
# This Dockerfile compiles Neon from the official GitHub repository.
# Build time: ~30 minutes (first build), ~5 minutes (cached)
# 
# Based on: https://github.com/neondatabase/neon
#
# Build command:
#   docker build -f tools/compose/neon.Dockerfile -t neon-local:latest .

FROM debian:bookworm-slim AS builder

# Install build dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    git \
    pkg-config \
    curl \
    libssl-dev \
    libreadline-dev \
    zlib1g-dev \
    flex \
    bison \
    libxml2-dev \
    libxslt1-dev \
    libkrb5-dev \
    liblz4-dev \
    libzstd-dev \
    libicu-dev \
    python3 \
    python3-pip \
    ca-certificates \
    protobuf-compiler \
    && rm -rf /var/lib/apt/lists/*

# Install Rust (required for Neon components)
RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
ENV PATH="/root/.cargo/bin:${PATH}"

# Install PostgreSQL build dependencies
RUN apt-get update && apt-get install -y \
    postgresql-common \
    postgresql-server-dev-all \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /build

# Clone Neon repository (use specific tag for stability)
ARG NEON_VERSION=latest
RUN git clone --depth 1 --branch ${NEON_VERSION} https://github.com/neondatabase/neon.git neon || \
    git clone --depth 1 https://github.com/neondatabase/neon.git neon

WORKDIR /build/neon

# Build Neon components
# This compiles: pageserver, safekeeper, storage_broker, postgres
RUN cargo build --release --bins

# Build PostgreSQL with Neon extensions
WORKDIR /build/neon/vendor/postgres-v17
RUN ./configure \
    --prefix=/usr/local/postgres \
    --enable-debug \
    --with-openssl \
    && make -j$(nproc) \
    && make install

# Build Neon PostgreSQL extensions
WORKDIR /build/neon
RUN make -C pgxn/neon

# ========================================
# Runtime Stage
# ========================================
FROM debian:bookworm-slim

# Install runtime dependencies
RUN apt-get update && apt-get install -y \
    libssl3 \
    libreadline8 \
    zlib1g \
    liblz4-1 \
    libzstd1 \
    libicu72 \
    libxml2 \
    libxslt1.1 \
    ca-certificates \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy compiled binaries from builder
COPY --from=builder /build/neon/target/release/pageserver /usr/local/bin/
COPY --from=builder /build/neon/target/release/safekeeper /usr/local/bin/
COPY --from=builder /build/neon/target/release/storage_broker /usr/local/bin/
COPY --from=builder /build/neon/target/release/compute_ctl /usr/local/bin/
COPY --from=builder /build/neon/target/release/neon_local /usr/local/bin/

# Copy PostgreSQL installation
COPY --from=builder /usr/local/postgres /usr/local/postgres

# Copy Neon extensions
COPY --from=builder /build/neon/pgxn/neon/*.so /usr/local/postgres/lib/
COPY --from=builder /build/neon/pgxn/neon/*.sql /usr/local/postgres/share/extension/
COPY --from=builder /build/neon/pgxn/neon/*.control /usr/local/postgres/share/extension/

# Add PostgreSQL to PATH
ENV PATH="/usr/local/postgres/bin:${PATH}"
ENV LD_LIBRARY_PATH="/usr/local/postgres/lib"

# Create neon user
RUN useradd -m -s /bin/bash neon

# Create directories
RUN mkdir -p /data /var/log/neon && \
    chown -R neon:neon /data /var/log/neon

# Set working directory
WORKDIR /data

# Switch to neon user
USER neon

# Expose ports
# 9898 - Pageserver HTTP
# 6400 - Pageserver PostgreSQL
# 7676 - Safekeeper HTTP
# 5454 - Safekeeper PostgreSQL
# 55432 - Compute PostgreSQL
EXPOSE 9898 6400 7676 5454 55432

# Health check
HEALTHCHECK --interval=30s --timeout=10s --retries=3 --start-period=60s \
  CMD curl -f http://localhost:9898/v1/status || exit 1

# Default command (overridden by docker-compose)
CMD ["/usr/local/bin/pageserver"]

