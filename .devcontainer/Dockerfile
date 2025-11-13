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
    build-essential \
    pkg-config \
    libnode-dev \
    python3-dev \
    libffi-dev \
    libssl-dev \
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
    iputils-ping \
    netcat-openbsd \
    htop \
    gzip \
    bzip2 \
    postgresql-client \
    redis-tools \
    && rm -rf /var/lib/apt/lists/*

# Install Docker CLI
RUN set -eux; \
    apt-get update; \
    apt-get install -y --no-install-recommends ca-certificates curl gnupg lsb-release; \
    install -m 0755 -d /etc/apt/keyrings; \
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg; \
    chmod a+r /etc/apt/keyrings/docker.gpg; \
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu noble stable" > /etc/apt/sources.list.d/docker.list; \
    apt-get update; \
    apt-get install -y --no-install-recommends docker-ce-cli docker-compose-plugin; \
    rm -rf /var/lib/apt/lists/*

# Install Node.js using official NodeSource repository
RUN curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

# Install Node.js global packages
RUN npm i -g ts-node eslint prettier nodemon pm2
# Update npm to latest version
RUN npm install -g npm@latest

# Install Python 3.12
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
RUN python3 -m venv /opt/pytools \
    && /opt/pytools/bin/pip install -U pip setuptools wheel \
    && /opt/pytools/bin/pip install --no-cache-dir black flake8 pylint mypy pytest ipython

ENV PATH="/opt/pytools/bin:${PATH}"

# Install GitHub CLI
RUN set -eux; \
    apt-get update; \
    apt-get install -y ca-certificates curl gnupg; \
    install -m 0755 -d /etc/apt/keyrings; \
    curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | gpg --dearmor -o /etc/apt/keyrings/githubcli-archive-keyring.gpg; \
    chmod a+r /etc/apt/keyrings/githubcli-archive-keyring.gpg; \
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" > /etc/apt/sources.list.d/github-cli.list; \
    apt-get update; \
    apt-get install -y gh; \
    rm -rf /var/lib/apt/lists/*

# Configure user (matches host UID/GID)
RUN if [ "$USER_UID" != "1000" ] || [ "$USER_GID" != "1000" ]; then \
        groupmod --gid $USER_GID $USERNAME 2>/dev/null || true; \
        usermod --uid $USER_UID --gid $USER_GID $USERNAME 2>/dev/null || true; \
        chown -R $USER_UID:$USER_GID /home/$USERNAME; \
    fi

# Add user to docker group
RUN usermod -aG docker $USERNAME || true

# Setup workspace directory
WORKDIR /workspace

# Configure zsh (Oh My Zsh already exists in base image)
USER $USERNAME
RUN echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.zshrc \
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

# Default command
CMD ["sleep", "infinity"]
