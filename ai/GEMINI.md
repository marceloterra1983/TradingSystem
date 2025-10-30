# Gemini Workspace Context: TradingSystem

This document provides an overview of the TradingSystem project, its architecture, and development practices to be used as a context for AI-assisted development.

## Project Overview

TradingSystem is a professional-grade, locally-hosted trading platform designed for real-time market data analysis, automated order execution, and risk management. It operates 100% on-premise with no cloud dependencies, ensuring low latency and data privacy.

The system is built on a microservices architecture, with key components for:
-   **Market Data Capture**: Ingests real-time market data via Nelogica's ProfitDLL.
-   **ML-Powered Analysis**: Uses a cause-and-effect model to identify market patterns and generate trading signals.
-   **Order Execution**: Automates order placement with a comprehensive risk management engine.
-   **Observability**: Provides real-time monitoring through a suite of tools including Prometheus and Grafana.
-   **Frontend**: A React-based dashboard for visualization and interaction.

All services are unified under a single domain (`tradingsystem.local`) using an Nginx reverse proxy, which eliminates the need for CORS configurations.

## Tech Stack

| Layer                | Technology                                                    |
| -------------------- | ------------------------------------------------------------- |
| **Backend Services** | C# (.NET 8.0), Python 3.11+                                   |
| **ML Toolkit**       | scikit-learn, Polars, NumPy                                   |
| **API Layer**        | FastAPI, ASP.NET Core Web API                                 |
| **Frontend**         | React 18, TypeScript, Tailwind CSS                            |
| **Data Storage**     | QuestDB, LowDB, Parquet (Apache Arrow), JSONL                 |
| **Messaging**        | WebSockets, HTTP REST                                         |
| **Monitoring**       | Prometheus, Grafana                                           |
| **Platform**         | Native Windows (Core), Linux (Services)                       |
| **Reverse Proxy**    | Nginx (Unified Domain)                                        |
| **Package Manager**  | pnpm (likely, due to `pnpm-lock.yaml`)                        |

## Getting Started

### Universal Startup (Recommended)

The project includes a universal startup system.

1.  **Installation (One-Time):**
    ```bash
    bash /home/marce/projetos/TradingSystem/install-shortcuts.sh
    source ~/.bashrc # or source ~/.zshrc
    ```

2.  **Daily Use:**
    ```bash
    # Start all services (Docker + Node.js)
    start

    # Stop all services
    stop

    # View status
    status

    # Run a full health check
    health
    ```

### Manual Setup

1.  **Environment Setup:** Configure the centralized `.env` file.
    ```bash
    bash scripts/env/setup-env.sh
    bash scripts/env/validate-env.sh
    ```

2.  **Install Dependencies:**
    ```bash
    # It seems the project uses pnpm, but the README mentions npm.
    # If npm fails, try pnpm.
    npm install --workspaces
    # or
    # pnpm install
    ```

3.  **Start Services:**
    ```bash
    # Start Docker containers (databases, monitoring, etc.)
    bash tools/scripts/start-all-stacks.sh

    # Start individual applications as needed, e.g.:
    # cd frontend/dashboard && npm run dev
    ```

## Development Conventions

### Environment Variables

-   **Centralized `.env`:** All applications, services, and containers **MUST** use the single `.env` file located at the project root. Do not create `.env` files in subdirectories.
-   **Validation:** Use `bash scripts/env/validate-env.sh` to ensure your configuration is correct.

### Code Quality & Testing

-   **Linting:** The project uses ESLint for code quality. The configuration is in `eslint.config.js`. Run the linter with `npm run lint`.
-   **Testing:** The project uses Vitest for testing. The configuration is in `vitest.config.ts`.
-   **Pre-commit Hooks:** Husky is used to run pre-commit hooks that validate documentation frontmatter and run frontend code quality checks. These are installed automatically with `npm install`.

### Documentation

-   The `docs/` directory contains extensive documentation for the project, managed with Docusaurus.
-   A validation script (`scripts/docs/validate-frontmatter.py`) is used to ensure documentation quality.
