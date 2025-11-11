const SEMVER_REGEX = /^\d+\.\d+\.\d+$/;
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const SERVICE_NAME_REGEX = /^[a-z][a-z0-9-]*$/;
const SUPPORTED_EXPOSURES = new Set(['direct', 'gateway', 'internal']);

export const SUPPORTED_PROTOCOLS = new Set([
  'http',
  'https',
  'postgres',
  'redis',
  'rabbitmq',
  'grpc',
  'tcp',
  'udp',
]);

function parseRange(value, stack) {
  if (typeof value !== 'string') {
    throw new Error(`Range for stack ${stack} must be a string, got ${typeof value}`);
  }

  const [min, max] = value.split('-').map(Number);
  if (!Number.isFinite(min) || !Number.isFinite(max)) {
    throw new Error(`Range "${value}" for stack ${stack} is invalid`);
  }

  return { min, max };
}

function validateTopLevel(registry) {
  const errors = [];

  if (!registry || typeof registry !== 'object') {
    errors.push('Registry must be an object');
    return { errors, rangeMap: new Map() };
  }

  if (!SEMVER_REGEX.test(registry.version ?? '')) {
    errors.push('version must follow semver (e.g., 1.0.0)');
  }

  if (!DATE_REGEX.test(registry.lastUpdated ?? '')) {
    errors.push('lastUpdated must be ISO date (YYYY-MM-DD)');
  }

  if (!registry.ranges || typeof registry.ranges !== 'object' || Array.isArray(registry.ranges)) {
    errors.push('ranges must be an object mapping stack → range');
  }

  const rangeEntries = Object.entries(registry.ranges ?? {});
  const rangeMap = new Map();

  for (const [stack, rangeValue] of rangeEntries) {
    try {
      rangeMap.set(stack, parseRange(rangeValue, stack));
    } catch (error) {
      errors.push(error.message);
    }
  }

  if (!Array.isArray(registry.services) || registry.services.length === 0) {
    errors.push('services must be a non-empty array');
  }

  return { errors, rangeMap };
}

export function validateRegistry(registry) {
  const errors = [];
  const warnings = [];
  const stats = {
    services: 0,
    stacks: new Map(),
  };

  const { errors: topLevelErrors, rangeMap } = validateTopLevel(registry);
  errors.push(...topLevelErrors);

  const services = Array.isArray(registry?.services) ? registry.services : [];
  const allNames = new Set();
  const portMap = new Map();

  for (const service of services) {
    stats.services += 1;
    stats.stacks.set(service.stack, (stats.stacks.get(service.stack) ?? 0) + 1);

    if (!service.name || typeof service.name !== 'string' || !SERVICE_NAME_REGEX.test(service.name)) {
      errors.push(`Service name "${service?.name}" is invalid. Use lowercase kebab-case.`);
    } else if (allNames.has(service.name)) {
      errors.push(`Duplicate service name detected: ${service.name}`);
    } else {
      allNames.add(service.name);
    }

    if (service.exposure && !SUPPORTED_EXPOSURES.has(service.exposure)) {
      errors.push(
        `Service ${service.name} exposure "${service.exposure}" is invalid. Use one of: ${[...SUPPORTED_EXPOSURES].join(', ')}`,
      );
    }

    if (typeof service.gatewayPath !== 'undefined') {
      if (typeof service.gatewayPath !== 'string' || service.gatewayPath.trim().length === 0) {
        errors.push(`Service ${service.name} gatewayPath must be a non-empty string when provided`);
      } else if (!service.gatewayPath.startsWith('/')) {
        errors.push(`Service ${service.name} gatewayPath must start with '/'`);
      }
    } else if (service.exposure === 'gateway') {
      warnings.push(`Service ${service.name} is marked as gateway exposure but has no gatewayPath`);
    }

    if (service.exposure !== 'gateway' && typeof service.gatewayPath !== 'undefined') {
      warnings.push(
        `Service ${service.name} defines gatewayPath but exposure is ${service.exposure ?? 'not set'}. gatewayPath will be ignored.`,
      );
    }

    if (!service.stack || !rangeMap.has(service.stack)) {
      errors.push(`Service ${service.name} references unknown stack "${service.stack}"`);
    }

    if (!Number.isInteger(service.port)) {
      errors.push(`Service ${service.name} must define an integer port`);
    } else if (service.port < 1024 || service.port > 65535) {
      errors.push(`Service ${service.name} port ${service.port} out of range (1024-65535)`);
    } else if (portMap.has(service.port)) {
      errors.push(
        `Port ${service.port} assigned to multiple services: ${portMap.get(service.port)} and ${service.name}`
      );
    } else {
      portMap.set(service.port, service.name);
    }

    if (!SUPPORTED_PROTOCOLS.has(service.protocol)) {
      errors.push(
        `Service ${service.name} uses unsupported protocol "${service.protocol}". Supported: ${[
          ...SUPPORTED_PROTOCOLS,
        ].join(', ')}`
      );
    }

    if (typeof service.owner !== 'string' || service.owner.trim().length === 0) {
      errors.push(`Service ${service.name} must define an owner`);
    }

    if (typeof service.description !== 'string' || service.description.trim().length < 10) {
      warnings.push(`Service ${service.name} has a very short description`);
    }

    if (typeof service.container !== 'boolean') {
      errors.push(`Service ${service.name} must define container: true|false`);
    } else if (service.container && typeof service.network !== 'string') {
      warnings.push(`Containerized service ${service.name} does not set a docker network`);
    }

    if (service.healthcheck) {
      if (
        typeof service.healthcheck.endpoint !== 'string' ||
        typeof service.healthcheck.expected !== 'number'
      ) {
        errors.push(`Service ${service.name} healthcheck must define endpoint (string) and expected (number)`);
      }
    } else if (service.protocol === 'http' || service.protocol === 'https') {
      warnings.push(`Service ${service.name} exposes HTTP but has no healthcheck definition`);
    }

    if (service.deprecated && !service.replacement) {
      warnings.push(`Deprecated service ${service.name} is missing replacement`);
    }
  }

  for (const service of services) {
    const range = rangeMap.get(service.stack);
    if (range && (service.port < range.min || service.port > range.max)) {
      errors.push(
        `Service ${service.name} port ${service.port} is outside stack range ${service.stack} (${range.min}-${range.max})`
      );
    }

    if (Array.isArray(service.depends_on)) {
      for (const dep of service.depends_on) {
        if (!allNames.has(dep)) {
          errors.push(`Service ${service.name} depends on unknown service "${dep}"`);
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    stats: {
      services: stats.services,
      stacks: Object.fromEntries(stats.stacks),
    },
  };
}
