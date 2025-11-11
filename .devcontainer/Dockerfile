# syntax=docker/dockerfile:1.4

# Base image with Node.js and Python
FROM mcr.microsoft.com/devcontainers/base:ubuntu-24.04

# Arguments
ARG NODE_VERSION=20
ARG PYTHON_VERSION=3.12
ARG USER_UID=1000
ARG USER_GID=1000
ARG USERNAME=vscode

# Avoid prompts from apt
ENV DEBIAN_FRONTEND=noninteractive

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    # Build essentials
    build-essential \
    pkg-config \
    # Node.js native modules dependencies
    libnode-dev \
    python3-dev \
    # Python build dependencies
    libffi-dev \
    libssl-dev \
    # Common utilities
    curl \
    wget \
    git \
    vim \
    nano \
    zip \
    unzip \
    jq \
    ca-certificates \
    gnupg \
    lsb-release \
    # Docker CLI
    docker-ce-cli \
    # Network tools
    iputils-ping \
    netcat-openbsd \
    # Process management
    htop \
    # Compression
    gzip \
    bzip2 \
    # PostgreSQL client (for TimescaleDB)
    postgresql-client \
    # Redis client
    redis-tools \
    && rm -rf /var/lib/apt/lists/*

# Install Node.js using official NodeSource repository
RUN curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

# Install Python 3.12 (if not already installed)
RUN apt-get update && apt-get install -y --no-install-recommends \
    python${PYTHON_VERSION} \
    python${PYTHON_VERSION}-dev \
    python${PYTHON_VERSION}-venv \
    python3-pip \
    && rm -rf /var/lib/apt/lists/*

# Create symlinks for Python
RUN update-alternatives --install /usr/bin/python3 python3 /usr/bin/python${PYTHON_VERSION} 1 \
    && update-alternatives --install /usr/bin/python python /usr/bin/python${PYTHON_VERSION} 1

# Upgrade pip and install Python tools globally
RUN python3 -m pip install --upgrade pip setuptools wheel \
    && pip3 install --no-cache-dir \
    black \
    flake8 \
    pylint \
    mypy \
    pytest \
    ipython

# Install global npm packages
RUN npm install -g \
    npm@latest \
    pnpm \
    yarn \
    typescript \
    ts-node \
    eslint \
    prettier \
    nodemon \
    pm2

# Install GitHub CLI
RUN curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg \
    && chmod go+r /usr/share/keyrings/githubcli-archive-keyring.gpg \
    && echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | tee /etc/apt/sources.list.d/github-cli.list > /dev/null \
    && apt-get update \
    && apt-get install -y gh \
    && rm -rf /var/lib/apt/lists/*

# Configure user (matches host UID/GID)
RUN if [ "$USER_UID" != "1000" ] || [ "$USER_GID" != "1000" ]; then \
    groupmod --gid $USER_GID $USERNAME 2>/dev/null || true \
    && usermod --uid $USER_UID --gid $USER_GID $USERNAME 2>/dev/null || true \
    && chown -R $USER_UID:$USER_GID /home/$USERNAME; \
    fi

# Add user to docker group (for Docker-in-Docker)
RUN usermod -aG docker $USERNAME || true

# Setup workspace directory
WORKDIR /workspace

# Setup Oh My Zsh for better terminal experience
USER $USERNAME
RUN sh -c "$(curl -fsSL https://raw.githubusercontent.com/ohmyzsh/ohmyzsh/master/tools/install.sh)" "" --unattended \
    && echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.zshrc \
    && echo 'export PYTHONPATH="/workspace:$PYTHONPATH"' >> ~/.zshrc \
    && echo 'alias ll="ls -alh"' >> ~/.zshrc \
    && echo 'alias dc="docker compose"' >> ~/.zshrc \
    && echo 'alias npm-check="npm run env:validate"' >> ~/.zshrc \
    && echo 'alias start="npm run start"' >> ~/.zshrc \
    && echo 'alias stop="npm run stop"' >> ~/.zshrc

# Switch back to root for final setup
USER root

# Configure Docker socket permissions
RUN chmod 666 /var/run/docker.sock 2>/dev/null || true

# Set default shell to zsh
RUN chsh -s /usr/bin/zsh $USERNAME

# Set user back to vscode
USER $USERNAME

# Default command (overridden by docker-compose)
CMD ["sleep", "infinity"]
