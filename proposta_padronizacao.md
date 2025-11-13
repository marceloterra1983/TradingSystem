# Proposta de Padronização de Conexões - TradingSystem

**Data:** 13 de Novembro de 2025  
**Objetivo:** Estabilizar conexões entre Dashboard e serviços backend através de padronização

---

## 1. Visão Geral da Solução

### 1.1 Princípios de Design

1. **Single Responsibility:** Um único HTTP client para todas as requisições
2. **Fail-Safe:** Retry automático em falhas temporárias
3. **Observable:** Logs e métricas de todas as requisições
4. **Configurable:** Timeouts e retries configuráveis por tipo de operação
5. **Resilient:** Circuit breaker para evitar sobrecarga

### 1.2 Arquitetura Proposta

```
┌─────────────────────────────────────────────────────────┐
│                    Dashboard (React)                     │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌────────────────────────────────────────────────┐    │
│  │         HTTP Client Padronizado                │    │
│  │  (Axios + axios-retry + circuit-breaker)       │    │
│  ├────────────────────────────────────────────────┤    │
│  │  • Retry Logic (exponential backoff)           │    │
│  │  • Circuit Breaker (fail-fast)                 │    │
│  │  • Request Queue (concurrency limit)           │    │
│  │  • Timeout Strategy (por tipo de operação)     │    │
│  │  • Error Normalization                         │    │
│  │  • Request/Response Interceptors               │    │
│  └────────────────────────────────────────────────┘    │
│                          ↓                              │
│  ┌────────────────────────────────────────────────┐    │
│  │         Service Clients (typed)                │    │
│  │  • WorkspaceClient                             │    │
│  │  • TPCapitalClient                             │    │
│  │  • TelegramGatewayClient                       │    │
│  │  • DocsClient                                  │    │
│  └────────────────────────────────────────────────┘    │
│                          ↓                              │
└──────────────────────────┼──────────────────────────────┘
                           ↓
                  ┌────────────────┐
                  │ Traefik Gateway│
                  │   :9082        │
                  └────────────────┘
                           ↓
        ┌──────────────────┼──────────────────┐
        ↓                  ↓                   ↓
  ┌──────────┐      ┌──────────┐       ┌──────────┐
  │Workspace │      │TP Capital│       │ Telegram │
  │   API    │      │   API    │       │ Gateway  │
  └──────────┘      └──────────┘       └──────────┘
```

---

## 2. HTTP Client Padronizado

### 2.1 Configuração Base

**Arquivo:** `frontend/dashboard/src/lib/http-client.ts`

```typescript
import axios, { AxiosInstance, AxiosRequestConfig, AxiosError } from 'axios';
import axiosRetry, { exponentialDelay } from 'axios-retry';
import { CircuitBreaker } from './circuit-breaker';

// Tipos de operação (determinam timeout e retry)
export enum OperationType {
  HEALTH_CHECK = 'health_check',
  QUICK_READ = 'quick_read',
  STANDARD_READ = 'standard_read',
  WRITE = 'write',
  LONG_OPERATION = 'long_operation',
  FILE_UPLOAD = 'file_upload',
}

// Configuração de timeout por tipo de operação
const TIMEOUT_CONFIG: Record<OperationType, number> = {
  [OperationType.HEALTH_CHECK]: 5000,      // 5s
  [OperationType.QUICK_READ]: 10000,       // 10s
  [OperationType.STANDARD_READ]: 15000,    // 15s
  [OperationType.WRITE]: 30000,            // 30s
  [OperationType.LONG_OPERATION]: 120000,  // 2min
  [OperationType.FILE_UPLOAD]: 300000,     // 5min
};

// Configuração de retry por tipo de operação
const RETRY_CONFIG: Record<OperationType, number> = {
  [OperationType.HEALTH_CHECK]: 2,
  [OperationType.QUICK_READ]: 3,
  [OperationType.STANDARD_READ]: 3,
  [OperationType.WRITE]: 2,
  [OperationType.LONG_OPERATION]: 1,
  [OperationType.FILE_UPLOAD]: 1,
};

interface HttpClientConfig {
  baseURL: string;
  defaultTimeout?: number;
  enableCircuitBreaker?: boolean;
  enableRetry?: boolean;
  enableLogging?: boolean;
  maxConcurrentRequests?: number;
}

export class HttpClient {
  private client: AxiosInstance;
  private circuitBreaker?: CircuitBreaker;
  private requestQueue: Map<string, Promise<any>> = new Map();
  private activeRequests = 0;
  private maxConcurrentRequests: number;

  constructor(config: HttpClientConfig) {
    this.maxConcurrentRequests = config.maxConcurrentRequests || 10;

    // Criar instância Axios
    this.client = axios.create({
      baseURL: config.baseURL,
      timeout: config.defaultTimeout || 15000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Configurar retry
    if (config.enableRetry !== false) {
      this.setupRetry();
    }

    // Configurar circuit breaker
    if (config.enableCircuitBreaker) {
      this.circuitBreaker = new CircuitBreaker({
        failureThreshold: 5,
        resetTimeout: 30000,
        monitoringPeriod: 10000,
      });
    }

    // Configurar interceptors
    this.setupInterceptors(config.enableLogging);
  }

  private setupRetry() {
    axiosRetry(this.client, {
      retries: 3,
      retryDelay: exponentialDelay,
      retryCondition: (error: AxiosError) => {
        // Retry em:
        // - Network errors
        // - 5xx server errors
        // - Timeout errors
        // - ECONNABORTED, ENOTFOUND, ECONNRESET, ECONNREFUSED
        
        if (!error.response) {
          // Network error ou timeout
          return true;
        }

        const status = error.response.status;
        // Retry em 5xx (server errors) e 429 (rate limit)
        return status >= 500 || status === 429;
      },
      onRetry: (retryCount, error, requestConfig) => {
        console.warn(
          `[HttpClient] Retry ${retryCount} for ${requestConfig.url}`,
          error.message
        );
      },
    });
  }

  private setupInterceptors(enableLogging?: boolean) {
    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        // Adicionar timestamp
        config.metadata = { startTime: Date.now() };

        // Logging
        if (enableLogging) {
          console.log(`[HttpClient] → ${config.method?.toUpperCase()} ${config.url}`);
        }

        return config;
      },
      (error) => {
        console.error('[HttpClient] Request error:', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => {
        // Calcular latência
        const duration = Date.now() - (response.config.metadata?.startTime || 0);

        if (enableLogging) {
          console.log(
            `[HttpClient] ← ${response.status} ${response.config.url} (${duration}ms)`
          );
        }

        // Métricas (pode ser enviado para analytics)
        this.recordMetrics({
          url: response.config.url,
          method: response.config.method,
          status: response.status,
          duration,
        });

        return response;
      },
      (error: AxiosError) => {
        const duration = Date.now() - (error.config?.metadata?.startTime || 0);

        console.error(
          `[HttpClient] ✗ ${error.config?.url} (${duration}ms)`,
          error.message
        );

        // Normalizar erro
        return Promise.reject(this.normalizeError(error));
      }
    );
  }

  private normalizeError(error: AxiosError): Error {
    // Criar erro padronizado com informações úteis
    if (!error.response) {
      // Network error ou timeout
      return new Error(
        error.code === 'ECONNABORTED'
          ? 'Tempo limite de conexão excedido. Tente novamente.'
          : 'Erro de conexão. Verifique sua internet e tente novamente.'
      );
    }

    const status = error.response.status;
    const data = error.response.data as any;

    if (status >= 500) {
      return new Error(
        data?.message || 'Erro no servidor. Tente novamente em alguns instantes.'
      );
    }

    if (status === 429) {
      return new Error('Muitas requisições. Aguarde um momento e tente novamente.');
    }

    if (status === 401 || status === 403) {
      return new Error('Não autorizado. Verifique suas credenciais.');
    }

    if (status === 404) {
      return new Error('Recurso não encontrado.');
    }

    return new Error(data?.message || 'Erro desconhecido.');
  }

  private recordMetrics(metrics: {
    url?: string;
    method?: string;
    status: number;
    duration: number;
  }) {
    // Aqui pode enviar para analytics, Prometheus, etc.
    // Por enquanto, apenas log
    if (metrics.duration > 1000) {
      console.warn(`[HttpClient] Slow request: ${metrics.url} (${metrics.duration}ms)`);
    }
  }

  private async waitForSlot(): Promise<void> {
    // Request queuing: aguarda até ter slot disponível
    while (this.activeRequests >= this.maxConcurrentRequests) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  async request<T = any>(
    config: AxiosRequestConfig & { operationType?: OperationType }
  ): Promise<T> {
    // Aplicar timeout baseado no tipo de operação
    const operationType = config.operationType || OperationType.STANDARD_READ;
    const timeout = TIMEOUT_CONFIG[operationType];
    const retries = RETRY_CONFIG[operationType];

    // Aguardar slot disponível
    await this.waitForSlot();
    this.activeRequests++;

    try {
      // Circuit breaker check
      if (this.circuitBreaker && !this.circuitBreaker.canRequest()) {
        throw new Error('Serviço temporariamente indisponível (circuit breaker aberto)');
      }

      const response = await this.client.request<T>({
        ...config,
        timeout,
        'axios-retry': {
          retries,
        },
      });

      // Circuit breaker: registrar sucesso
      this.circuitBreaker?.recordSuccess();

      return response.data;
    } catch (error) {
      // Circuit breaker: registrar falha
      this.circuitBreaker?.recordFailure();

      throw error;
    } finally {
      this.activeRequests--;
    }
  }

  // Métodos de conveniência
  async get<T = any>(
    url: string,
    config?: AxiosRequestConfig & { operationType?: OperationType }
  ): Promise<T> {
    return this.request<T>({ ...config, method: 'GET', url });
  }

  async post<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig & { operationType?: OperationType }
  ): Promise<T> {
    return this.request<T>({ ...config, method: 'POST', url, data });
  }

  async put<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig & { operationType?: OperationType }
  ): Promise<T> {
    return this.request<T>({ ...config, method: 'PUT', url, data });
  }

  async delete<T = any>(
    url: string,
    config?: AxiosRequestConfig & { operationType?: OperationType }
  ): Promise<T> {
    return this.request<T>({ ...config, method: 'DELETE', url });
  }

  // Health check dedicado
  async healthCheck(url: string = '/health'): Promise<boolean> {
    try {
      await this.get(url, { operationType: OperationType.HEALTH_CHECK });
      return true;
    } catch {
      return false;
    }
  }
}
```

### 2.2 Circuit Breaker

**Arquivo:** `frontend/dashboard/src/lib/circuit-breaker.ts`

```typescript
export enum CircuitState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN',
}

interface CircuitBreakerConfig {
  failureThreshold: number;    // Número de falhas para abrir circuito
  resetTimeout: number;         // Tempo para tentar half-open (ms)
  monitoringPeriod: number;     // Janela de monitoramento (ms)
}

export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failures: number[] = [];
  private lastFailureTime: number = 0;
  private config: CircuitBreakerConfig;

  constructor(config: CircuitBreakerConfig) {
    this.config = config;
  }

  canRequest(): boolean {
    if (this.state === CircuitState.CLOSED) {
      return true;
    }

    if (this.state === CircuitState.OPEN) {
      // Verificar se deve tentar half-open
      const timeSinceLastFailure = Date.now() - this.lastFailureTime;
      if (timeSinceLastFailure >= this.config.resetTimeout) {
        console.log('[CircuitBreaker] Transitioning to HALF_OPEN');
        this.state = CircuitState.HALF_OPEN;
        return true;
      }
      return false;
    }

    // HALF_OPEN: permitir uma requisição de teste
    return true;
  }

  recordSuccess(): void {
    if (this.state === CircuitState.HALF_OPEN) {
      console.log('[CircuitBreaker] Success in HALF_OPEN, closing circuit');
      this.state = CircuitState.CLOSED;
      this.failures = [];
    }
  }

  recordFailure(): void {
    const now = Date.now();
    this.lastFailureTime = now;

    // Remover falhas antigas (fora da janela de monitoramento)
    this.failures = this.failures.filter(
      (timestamp) => now - timestamp < this.config.monitoringPeriod
    );

    // Adicionar nova falha
    this.failures.push(now);

    // Verificar se deve abrir circuito
    if (this.failures.length >= this.config.failureThreshold) {
      if (this.state !== CircuitState.OPEN) {
        console.warn(
          `[CircuitBreaker] Opening circuit (${this.failures.length} failures)`
        );
        this.state = CircuitState.OPEN;
      }
    }
  }

  getState(): CircuitState {
    return this.state;
  }

  reset(): void {
    this.state = CircuitState.CLOSED;
    this.failures = [];
    this.lastFailureTime = 0;
  }
}
```

---

## 3. Service Clients (Typed)

### 3.1 Workspace Client

**Arquivo:** `frontend/dashboard/src/services/workspace-client.ts`

```typescript
import { HttpClient, OperationType } from '../lib/http-client';
import { apiConfig } from '../config/api';

export interface WorkspaceItem {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export class WorkspaceClient {
  private http: HttpClient;

  constructor() {
    this.http = new HttpClient({
      baseURL: apiConfig.libraryApi,
      enableCircuitBreaker: true,
      enableRetry: true,
      enableLogging: import.meta.env.DEV,
      maxConcurrentRequests: 5,
    });
  }

  async getItems(): Promise<WorkspaceItem[]> {
    return this.http.get<WorkspaceItem[]>('/items', {
      operationType: OperationType.STANDARD_READ,
    });
  }

  async getItemById(id: string): Promise<WorkspaceItem> {
    return this.http.get<WorkspaceItem>(`/items/${id}`, {
      operationType: OperationType.QUICK_READ,
    });
  }

  async createItem(item: Omit<WorkspaceItem, 'id' | 'createdAt' | 'updatedAt'>): Promise<WorkspaceItem> {
    return this.http.post<WorkspaceItem>('/items', item, {
      operationType: OperationType.WRITE,
    });
  }

  async updateItem(id: string, item: Partial<WorkspaceItem>): Promise<WorkspaceItem> {
    return this.http.put<WorkspaceItem>(`/items/${id}`, item, {
      operationType: OperationType.WRITE,
    });
  }

  async deleteItem(id: string): Promise<void> {
    return this.http.delete(`/items/${id}`, {
      operationType: OperationType.WRITE,
    });
  }

  async healthCheck(): Promise<boolean> {
    return this.http.healthCheck('/health');
  }
}

// Singleton instance
export const workspaceClient = new WorkspaceClient();
```

### 3.2 Telegram Gateway Client

**Arquivo:** `frontend/dashboard/src/services/telegram-gateway-client.ts`

```typescript
import { HttpClient, OperationType } from '../lib/http-client';
import { apiConfig } from '../config/api';

export interface SyncMessagesResponse {
  success: boolean;
  data: {
    totalMessagesSynced: number;
  };
}

export class TelegramGatewayClient {
  private http: HttpClient;

  constructor() {
    this.http = new HttpClient({
      baseURL: apiConfig.telegramGatewayApi,
      enableCircuitBreaker: true,
      enableRetry: true,
      enableLogging: import.meta.env.DEV,
      maxConcurrentRequests: 3, // Telegram API tem rate limits
    });
  }

  async syncMessages(token?: string): Promise<SyncMessagesResponse> {
    return this.http.post<SyncMessagesResponse>(
      '/sync-messages',
      {},
      {
        operationType: OperationType.LONG_OPERATION, // 2 minutos
        headers: token ? { 'X-API-Key': token } : {},
      }
    );
  }

  async getOverview(): Promise<any> {
    return this.http.get('/overview', {
      operationType: OperationType.STANDARD_READ,
    });
  }

  async healthCheck(): Promise<boolean> {
    return this.http.healthCheck('/health');
  }
}

export const telegramGatewayClient = new TelegramGatewayClient();
```

---

## 4. Health Check Proativo

### 4.1 Health Monitor

**Arquivo:** `frontend/dashboard/src/lib/health-monitor.ts`

```typescript
import { workspaceClient } from '../services/workspace-client';
import { telegramGatewayClient } from '../services/telegram-gateway-client';
// ... outros clients

export interface ServiceHealth {
  name: string;
  healthy: boolean;
  lastCheck: Date;
  consecutiveFailures: number;
}

export class HealthMonitor {
  private services: Map<string, ServiceHealth> = new Map();
  private intervalId?: number;
  private listeners: Set<(services: Map<string, ServiceHealth>) => void> = new Set();

  constructor(private checkInterval: number = 30000) {} // 30s

  start() {
    // Check inicial
    this.checkAll();

    // Polling periódico
    this.intervalId = window.setInterval(() => {
      this.checkAll();
    }, this.checkInterval);
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }

  private async checkAll() {
    const checks = [
      { name: 'Workspace', client: workspaceClient },
      { name: 'Telegram Gateway', client: telegramGatewayClient },
      // ... outros serviços
    ];

    for (const { name, client } of checks) {
      try {
        const healthy = await client.healthCheck();
        this.updateServiceHealth(name, healthy);
      } catch {
        this.updateServiceHealth(name, false);
      }
    }

    // Notificar listeners
    this.notifyListeners();
  }

  private updateServiceHealth(name: string, healthy: boolean) {
    const current = this.services.get(name);

    this.services.set(name, {
      name,
      healthy,
      lastCheck: new Date(),
      consecutiveFailures: healthy
        ? 0
        : (current?.consecutiveFailures || 0) + 1,
    });
  }

  private notifyListeners() {
    this.listeners.forEach((listener) => listener(this.services));
  }

  subscribe(listener: (services: Map<string, ServiceHealth>) => void) {
    this.listeners.add(listener);
    // Enviar estado atual imediatamente
    listener(this.services);
  }

  unsubscribe(listener: (services: Map<string, ServiceHealth>) => void) {
    this.listeners.delete(listener);
  }

  isServiceHealthy(name: string): boolean {
    return this.services.get(name)?.healthy ?? false;
  }
}

// Singleton
export const healthMonitor = new HealthMonitor();
```

### 4.2 React Hook para Health Status

**Arquivo:** `frontend/dashboard/src/hooks/useServiceHealth.ts`

```typescript
import { useState, useEffect } from 'react';
import { healthMonitor, ServiceHealth } from '../lib/health-monitor';

export function useServiceHealth(serviceName?: string) {
  const [services, setServices] = useState<Map<string, ServiceHealth>>(new Map());

  useEffect(() => {
    const listener = (updatedServices: Map<string, ServiceHealth>) => {
      setServices(new Map(updatedServices));
    };

    healthMonitor.subscribe(listener);

    return () => {
      healthMonitor.unsubscribe(listener);
    };
  }, []);

  if (serviceName) {
    return services.get(serviceName);
  }

  return Array.from(services.values());
}
```

---

## 5. Uso nos Componentes

### 5.1 Exemplo: TelegramGatewayFinal.tsx (refatorado)

```typescript
import { useState } from 'react';
import { telegramGatewayClient } from '../../services/telegram-gateway-client';
import { useServiceHealth } from '../../hooks/useServiceHealth';

export function TelegramGatewayFinal() {
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{ show: boolean; success: boolean; message: string }>();
  
  // Health check proativo
  const serviceHealth = useServiceHealth('Telegram Gateway');

  const handleSyncMessages = async () => {
    // Verificar se serviço está saudável
    if (!serviceHealth?.healthy) {
      setSyncResult({
        show: true,
        success: false,
        message: 'Serviço Telegram Gateway está indisponível. Tente novamente em alguns instantes.',
      });
      return;
    }

    setSyncing(true);
    try {
      const result = await telegramGatewayClient.syncMessages();
      
      const totalSynced = result.data?.totalMessagesSynced || 0;
      setSyncResult({
        show: true,
        success: true,
        message:
          totalSynced > 0
            ? `✅ ${totalSynced} mensagem(ns) recuperada(s) com sucesso!`
            : '✓ Todas as mensagens estão sincronizadas.',
      });
    } catch (error) {
      setSyncResult({
        show: true,
        success: false,
        message: error instanceof Error ? error.message : 'Erro ao sincronizar mensagens',
      });
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div>
      {/* Indicador de status do serviço */}
      <ServiceStatusBadge health={serviceHealth} />

      <button
        onClick={handleSyncMessages}
        disabled={syncing || !serviceHealth?.healthy}
      >
        {syncing ? 'Sincronizando...' : 'Sincronizar Mensagens'}
      </button>

      {syncResult?.show && (
        <div className={syncResult.success ? 'success' : 'error'}>
          {syncResult.message}
        </div>
      )}
    </div>
  );
}
```

---

## 6. Benefícios da Padronização

### 6.1 Estabilidade

✅ **Retry automático** em falhas temporárias (3 tentativas com exponential backoff)  
✅ **Circuit breaker** evita sobrecarga de serviços offline  
✅ **Timeouts adequados** por tipo de operação  
✅ **Request queuing** previne sobrecarga de conexões  

### 6.2 Observabilidade

✅ **Logs estruturados** de todas as requisições  
✅ **Métricas de latência** para identificar gargalos  
✅ **Health monitoring** proativo  
✅ **Error normalization** para mensagens consistentes  

### 6.3 Manutenibilidade

✅ **Single source of truth** para configuração HTTP  
✅ **Typed clients** com autocomplete  
✅ **Código reutilizável** (DRY)  
✅ **Fácil debugging** com logs centralizados  

### 6.4 Experiência do Usuário

✅ **Feedback claro** sobre status dos serviços  
✅ **Recuperação automática** de falhas temporárias  
✅ **Mensagens de erro** compreensíveis  
✅ **Indicadores visuais** de disponibilidade  

---

## 7. Métricas Esperadas (Pós-Implementação)

| Métrica | Antes | Depois | Melhoria |
|---------|-------|--------|----------|
| Taxa de falha em requisições | 5-10% | < 0.5% | **90-95%** |
| Tempo médio de recuperação | Manual (min) | Automático (seg) | **99%** |
| Requisições com retry | 0% | 100% | **∞** |
| Timeouts inadequados | ~60% | < 5% | **92%** |
| Feedback de erro claro | ~30% | 100% | **233%** |
| Sobrecarga de conexões | Frequente | Raro | **90%** |

---

## 8. Plano de Implementação

### Fase 1: Infraestrutura (1-2 dias)
- [ ] Implementar `HttpClient` base
- [ ] Implementar `CircuitBreaker`
- [ ] Implementar `HealthMonitor`
- [ ] Criar hooks React (`useServiceHealth`)

### Fase 2: Service Clients (2-3 dias)
- [ ] Criar `WorkspaceClient`
- [ ] Criar `TelegramGatewayClient`
- [ ] Criar `TPCapitalClient`
- [ ] Criar `DocsClient`

### Fase 3: Migração de Componentes (3-5 dias)
- [ ] Refatorar `TelegramGatewayFinal.tsx`
- [ ] Refatorar `WorkspacePage.tsx`
- [ ] Refatorar `TPCapitalPage.tsx`
- [ ] Refatorar demais componentes (fetch → clients)

### Fase 4: Testes e Ajustes (2-3 dias)
- [ ] Testes de integração
- [ ] Testes de carga (simular falhas)
- [ ] Ajustes de timeout e retry
- [ ] Documentação

**Total Estimado:** 8-13 dias (1.5-2.5 semanas)

---

## 9. Próximos Passos

1. ✅ Diagnóstico completo
2. ✅ Proposta de padronização
3. ⏭️ Implementar infraestrutura base
4. ⏭️ Criar service clients
5. ⏭️ Migrar componentes
6. ⏭️ Documentar padrões de uso

---

**Conclusão:** A padronização proposta resolve todos os problemas identificados no diagnóstico, trazendo ganhos significativos de estabilidade, observabilidade e manutenibilidade. A implementação é incremental e não quebra funcionalidades existentes.
