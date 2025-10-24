import "dotenv/config";
import { type ChildProcess, spawn } from "child_process";
import * as net from "net";
import { basename } from "path";
import { HTML_TO_MARKDOWN_PATH } from "./natives";
import { createWriteStream } from "fs";

const childProcesses = new Set<ChildProcess>();
const stopping = new WeakSet<ChildProcess>(); // processes we're intentionally stopping

interface ProcessResult {
  promise: Promise<void>;
  process: ChildProcess;
}

interface Services {
  api?: ProcessResult;
  worker?: ProcessResult;
  nuqWorkers: ProcessResult[];
  nuqPrefetchWorker?: ProcessResult;
  indexWorker?: ProcessResult;
  command?: ProcessResult;
}

const colors = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  gray: "\x1b[90m",
  white: "\x1b[37m",
};

const processGroupColors: Record<string, string> = {
  api: colors.green,
  worker: colors.blue,
  extract: colors.magenta,
  nuq: colors.cyan,
  index: colors.yellow,
  go: colors.yellow,
  command: colors.white,
};

function getProcessGroup(name: string): string {
  let group = name;
  if (name.includes("@")) group = name.split("@")[0];
  if (name.includes("-")) group = name.split("-")[0];
  return group;
}

function getProcessColor(name: string): string {
  const group = getProcessGroup(name);
  return processGroupColors[group] || colors.gray;
}

function formatDuration(nanoseconds: bigint): string {
  const milliseconds = Number(nanoseconds) / 1e6;
  if (milliseconds < 1000) return `${milliseconds.toFixed(0)}ms`;
  const seconds = milliseconds / 1000;
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds - minutes * 60;
  return `${minutes}m ${remainingSeconds.toFixed(0)}s`;
}

const stream = createWriteStream("firecrawl.log");

const PORT = process.env.PORT ?? "3002";

const logger = {
  section(message: string) {
    console.log(
      `\n${colors.bold}${colors.blue}── ${message} ──${colors.reset}\n`,
    );
  },
  info(message: string) {
    console.log(message);
  },
  success(message: string) {
    console.log(`${colors.green}✓${colors.reset} ${message}`);
  },
  warn(message: string) {
    console.log(`${colors.yellow}!${colors.reset} ${message}`);
  },
  error(message: string) {
    console.error(`${colors.red}✗${colors.reset} ${message}`);
  },
  processStart(name: string, command: string) {
    const color = getProcessColor(name);
    console.log(
      `${color}>${colors.reset} ${color}${colors.bold}${name}${colors.reset} ${colors.dim}${command}${colors.reset}`,
    );
  },
  processEnd(name: string, exitCode: number | null, duration: bigint) {
    const color = getProcessColor(name);
    const symbol = exitCode === 0 ? "●" : "✗";
    const symbolColor = exitCode === 0 ? colors.green : colors.red;
    const timing = `${colors.dim}${formatDuration(duration)}${colors.reset}`;
    const codeInfo =
      exitCode !== 0 ? ` ${colors.red}(${exitCode})${colors.reset}` : "";
    console.log(
      `${symbolColor}${symbol}${colors.reset} ${color}${colors.bold}${name}${colors.reset} ${timing}${codeInfo}`,
    );
  },
  processOutput(name: string, line: string, isReduceNoise: boolean) {
    const color = getProcessColor(name);
    const label = `${color}${name.padEnd(14)}${colors.reset}`;
    if (!(line.includes("[nuq/metrics:") && isReduceNoise)) {
      console.log(`${label} ${line}`);
    }
    stream.write(`${name.padEnd(14)} ${line}\n`);
  },
};

function waitForPort(
  port: number,
  host: string,
  timeoutMs = 30000,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(
        new Error(
          `Port ${port} did not become available within ${timeoutMs}ms`,
        ),
      );
    }, timeoutMs);

    const checkPort = () => {
      const socket = new net.Socket();
      const onError = () => {
        socket.destroy();
        setTimeout(checkPort, 250);
      };
      socket.once("error", onError);
      socket.setTimeout(1000);
      socket.connect(port, host, () => {
        socket.destroy();
        clearTimeout(timeout);
        resolve();
      });
    };
    checkPort();
  });
}

function execForward(
  name: string,
  command: string | string[],
  env: Record<string, string> = {},
): ProcessResult {
  let child: ChildProcess;
  let displayCommand = "";
  const isWindows = process.platform === "win32";

  const isReduceNoise = env.NUQ_REDUCE_NOISE === "true";
  delete env.NUQ_REDUCE_NOISE;

  if (typeof command === "string") {
    displayCommand = command;
    if (isWindows) {
      child = spawn("cmd", ["/c", command], {
        env: { ...process.env, ...env },
        shell: false,
        detached: false,
      });
    } else {
      child = spawn("sh", ["-c", command], {
        env: { ...process.env, ...env },
        shell: false,
        detached: true,
      });
    }
  } else {
    const [cmd, ...args] = command;
    displayCommand = [cmd, ...args].join(" ");
    child = spawn(cmd, args, {
      env: { ...process.env, ...env },
      shell: false,
      detached: !isWindows,
    });
  }

  logger.processStart(name, displayCommand);
  childProcesses.add(child);

  const startTime = process.hrtime.bigint();
  const promise = new Promise<void>((resolve, reject) => {
    let stdoutBuffer = "";
    let stderrBuffer = "";

    const processOutput = (data: string, isError = false) => {
      const buffer = isError ? stderrBuffer : stdoutBuffer;
      const newBuffer =
        buffer + data.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
      const lines = newBuffer.split("\n");
      const completeLines = lines.slice(0, -1);
      const remainingBuffer = lines[lines.length - 1];

      completeLines.forEach(line => {
        if (line.trim()) logger.processOutput(name, line, isReduceNoise);
      });

      if (isError) stderrBuffer = remainingBuffer;
      else stdoutBuffer = remainingBuffer;
    };

    child.stdout?.on("data", data => processOutput(data.toString(), false));
    child.stderr?.on("data", data => processOutput(data.toString(), true));

    child.on("close", code => {
      childProcesses.delete(child);
      logger.processEnd(name, code, process.hrtime.bigint() - startTime);
      const wasStopping = stopping.has(child);
      if (code !== 0 && !wasStopping) {
        reject(new Error(`${name} failed with exit code ${code}`));
      } else {
        resolve();
      }
    });

    child.on("error", error => {
      childProcesses.delete(child);
      logger.processEnd(name, -1, process.hrtime.bigint() - startTime);
      if (stopping.has(child)) resolve();
      else reject(new Error(`${name} failed to start: ${error.message}`));
    });
  });

  return { promise, process: child };
}

function terminateProcess(proc: ChildProcess): Promise<void> {
  return new Promise(resolve => {
    if (!proc || proc.killed || proc.exitCode !== null) {
      resolve();
      return;
    }

    stopping.add(proc);

    let resolved = false;
    const cleanup = () => {
      if (!resolved) {
        resolved = true;
        resolve();
      }
    };

    proc.once("exit", cleanup);
    proc.once("error", cleanup);

    const isWindows = process.platform === "win32";

    if (isWindows && proc.pid) {
      const killer = spawn(
        "taskkill",
        ["/pid", proc.pid.toString(), "/t", "/f"],
        {
          stdio: "ignore",
        },
      );
      killer.on("exit", cleanup);
    } else if (proc.pid) {
      try {
        process.kill(-proc.pid, "SIGTERM");
      } catch {
        proc.kill("SIGTERM");
      }
    }
  });
}

async function installDependencies() {
  logger.section("Installing dependencies");

  const tasks = [
    (async () => {
      if (
        process.argv[2] !== "--start-built" &&
        process.argv[2] !== "--start-docker"
      ) {
        logger.info("Installing API dependencies");
        const install = execForward("api@install", "pnpm install");
        await install.promise;

        logger.info("Building API");
        const build = execForward("api@build", "pnpm build");
        await build.promise;
      } else {
        logger.warn("Skipping API install and build");
      }
    })(),

    (async () => {
      logger.info("Installing Go dependencies");
      const install = execForward(
        "go@install",
        "cd sharedLibs/go-html-to-md && go mod tidy",
      );
      await install.promise;

      logger.info("Building Go module");
      const build = execForward(
        "go@build",
        `cd sharedLibs/go-html-to-md && go build -o ${basename(HTML_TO_MARKDOWN_PATH)} -buildmode=c-shared html-to-markdown.go`,
      );
      await build.promise;
    })(),
  ];

  await Promise.all(tasks);
  logger.success("Dependencies installed");
}

function startServices(command?: string[]): Services {
  logger.section("Starting services");

  const api = execForward(
    "api",
    process.argv[2] === "--start-docker"
      ? "node --import ./dist/src/otel.js dist/src/index.js"
      : "pnpm server:production:nobuild",
    {
      NUQ_REDUCE_NOISE: "true",
      NUQ_POD_NAME: "api",
    },
  );

  const worker = execForward(
    "worker",
    process.argv[2] === "--start-docker"
      ? "node --import ./dist/src/otel.js dist/src/services/queue-worker.js"
      : "pnpm worker:production",
    {
      NUQ_REDUCE_NOISE: "true",
      NUQ_POD_NAME: "worker",
    },
  );

  const extractWorker = execForward(
    "extract-worker",
    process.argv[2] === "--start-docker"
      ? "node --import ./dist/src/otel.js dist/src/services/extract-worker.js"
      : "pnpm extract-worker:production",
    {
      NUQ_REDUCE_NOISE: "true",
      NUQ_POD_NAME: "extract-worker",
      NUQ_WORKER_PORT: String(3005),
    },
  );

  const nuqWorkers = Array.from({ length: 5 }, (_, i) =>
    execForward(
      `nuq-worker-${i}`,
      process.argv[2] === "--start-docker"
        ? "node --import ./dist/src/otel.js dist/src/services/worker/nuq-worker.js"
        : "pnpm nuq-worker:production",
      {
        NUQ_WORKER_PORT: String(3006 + i),
        NUQ_REDUCE_NOISE: "true",
        NUQ_POD_NAME: `nuq-worker-${i}`,
      },
    ),
  );

  const nuqPrefetchWorker = process.env.NUQ_RABBITMQ_URL
    ? execForward(
        "nuq-prefetch-worker",
        process.argv[2] === "--start-docker"
          ? "node --import ./dist/src/otel.js dist/src/services/worker/nuq-prefetch-worker.js"
          : "pnpm nuq-prefetch-worker:production",
        {
          NUQ_PREFETCH_WORKER_PORT: String(3011),
          NUQ_REDUCE_NOISE: "true",
          NUQ_POD_NAME: "nuq-prefetch-worker",
        },
      )
    : undefined;

  const indexWorker =
    process.env.USE_DB_AUTHENTICATION === "true"
      ? execForward(
          "index-worker",
          process.argv[2] === "--start-docker"
            ? "node --import ./dist/src/otel.js dist/src/services/indexing/index-worker.js"
            : "pnpm index-worker:production",
          {
            NUQ_REDUCE_NOISE: "true",
            NUQ_POD_NAME: "index-worker",
          },
        )
      : undefined;

  const commandProcess =
    command && !command?.[0].startsWith("--")
      ? execForward("command", command)
      : undefined;

  return {
    api,
    worker,
    nuqWorkers,
    nuqPrefetchWorker,
    indexWorker,
    command: commandProcess,
  };
}

async function stopServices(services: Services) {
  const stopPromises = [
    services.api && terminateProcess(services.api.process),
    services.worker && terminateProcess(services.worker.process),
    ...services.nuqWorkers.map(w => terminateProcess(w.process)),
    services.nuqPrefetchWorker &&
      terminateProcess(services.nuqPrefetchWorker.process),
    services.indexWorker && terminateProcess(services.indexWorker.process),
    services.command && terminateProcess(services.command.process),
  ].filter(Boolean);

  await Promise.all(stopPromises);
}

async function runDevMode(): Promise<void> {
  let currentServices: Services | null = null;
  let isFirstStart = true;

  const { TscWatchClient } = await import("tsc-watch");

  const watch = new TscWatchClient();

  watch.on("started", () => {
    logger.info("TypeScript compilation started");
  });

  watch.on("first_success", async () => {
    logger.success("Initial compilation complete");

    currentServices = startServices();

    logger.info(`Waiting for API on localhost:${PORT}`);
    await waitForPort(Number(PORT), "localhost");
    logger.success("API is ready");

    isFirstStart = false;
  });

  watch.on("success", async () => {
    if (!isFirstStart && currentServices) {
      logger.info("Recompilation complete - restarting services");

      await stopServices(currentServices);
      logger.info("Services stopped");

      currentServices = startServices();

      await waitForPort(Number(PORT), "localhost");
      logger.success("Services restarted");
    }
  });

  watch.on("compile_errors", () => {
    logger.error("Compilation failed - services not restarted");
  });

  logger.section("Starting development mode");
  watch.start("--project", ".");

  await new Promise<void>(resolve => {
    process.on("SIGINT", resolve);
    process.on("SIGTERM", resolve);
  });

  if (currentServices) {
    await stopServices(currentServices);
  }
  watch.kill();
}

async function runProductionMode(command: string[]): Promise<void> {
  const services = startServices(command);

  logger.info(`Waiting for API on localhost:${PORT}`);
  await waitForPort(Number(PORT), "localhost");

  await waitForTermination(services);
}

async function waitForTermination(services: Services): Promise<void> {
  logger.info("All services running. Press Ctrl+C to stop");

  const promises: Promise<void>[] = [
    new Promise<void>(resolve => {
      process.on("SIGINT", resolve);
      process.on("SIGTERM", resolve);
    }),
  ];

  if (services.command) promises.push(services.command.promise);
  if (services.api) promises.push(services.api.promise);
  if (services.worker) promises.push(services.worker.promise);
  if (services.indexWorker) promises.push(services.indexWorker.promise);
  if (services.nuqPrefetchWorker)
    promises.push(services.nuqPrefetchWorker.promise);

  promises.push(...services.nuqWorkers.map(w => w.promise));

  await Promise.race(promises);
}

let shuttingDown = false;
async function gracefulShutdown() {
  if (shuttingDown) return;
  shuttingDown = true;

  logger.section("Shutting down");
  const terminationPromises = Array.from(childProcesses).map(terminateProcess);
  await Promise.all(terminationPromises);
  logger.success("All processes terminated");
}

function printUsage() {
  console.error(
    `${colors.bold}Usage:${colors.reset} pnpm harness <command...>\n`,
  );
  console.error(`${colors.bold}Special commands:${colors.reset}`);
  console.error(
    `  --start        Start in development mode (auto-restart on changes)`,
  );
  console.error(`  --start-built  Start services without rebuilding`);
  console.error(`  --start-docker Start services (skip install, assume built)`);
}

async function main() {
  process.on("SIGINT", gracefulShutdown);
  process.on("SIGTERM", gracefulShutdown);

  try {
    if (process.argv.length < 3) {
      printUsage();
      process.exit(1);
    }

    const command = process.argv.slice(2);
    const isDev = command[0] === "--start";

    if (command[0] !== "--start-docker") {
      await installDependencies();
    }

    if (isDev) {
      await runDevMode();
    } else {
      await runProductionMode(command);
    }
  } catch (error: any) {
    logger.error("Fatal error occurred");
    console.error(error?.stack || error?.message || error);
    process.exit(1);
  } finally {
    await gracefulShutdown();
    logger.info("Goodbye!");
  }
}

process.on("unhandledRejection", async (reason, promise) => {
  logger.error("Unhandled rejection");
  console.error(reason);
  await gracefulShutdown();
  process.exit(1);
});

main().catch(async error => {
  logger.error("Fatal error in main");
  console.error(error?.stack || error?.message || error);
  await gracefulShutdown();
  process.exit(1);
});
