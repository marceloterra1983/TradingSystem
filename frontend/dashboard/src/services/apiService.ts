import axios, { AxiosInstance, AxiosError } from 'axios';

const DEFAULT_BASE_URL =
  typeof window !== 'undefined'
    ? window.location.origin
    : 'http://localhost:8000';
const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL &&
    import.meta.env.VITE_API_BASE_URL.replace(/\/$/, '')) ||
  DEFAULT_BASE_URL;

class ApiService {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        // Add timestamp to prevent caching
        config.params = {
          ...config.params,
          _t: Date.now(),
        };
        return config;
      },
      (error) => {
        throw error;
      },
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        console.error('[API Error]', error.message);
        throw error;
      },
    );
  }

  // Positions
  async getPositions() {
    const response = await this.client.get('/api/v1/positions');
    return response.data;
  }

  // Orders
  async getOrders() {
    const response = await this.client.get('/api/v1/orders');
    return response.data;
  }

  async getOrderById(orderId: string) {
    const response = await this.client.get(`/api/v1/orders/${orderId}`);
    return response.data;
  }

  async executeOrder(order: {
    symbol: string;
    side: 'BUY' | 'SELL';
    quantity: number;
    orderType: 'MARKET' | 'LIMIT' | 'STOP' | 'STOPLIMIT';
    price?: number;
    stopPrice?: number;
    positionType: 'DAYTRADE' | 'SWING';
    justification: string;
  }) {
    const response = await this.client.post('/api/v1/execute', order);
    return response.data;
  }

  // Signals
  async getLatestSignals(symbol?: string, limit: number = 10) {
    const response = await this.client.get('/api/v1/signals/latest', {
      params: { symbol, limit },
    });
    return response.data;
  }

  async generateSignal(data: {
    symbol: string;
    features: {
      aggressor_flow: number;
      volatility_roll: number;
      book_delta: number;
      volume_anomaly: number;
      ma_price: number;
    };
    timestamp: string;
  }) {
    const response = await this.client.post('/api/v1/signals', data);
    return response.data;
  }

  // Risk Management
  async getRiskLimits() {
    const response = await this.client.get('/api/v1/risk/limits');
    return response.data;
  }

  async activateKillSwitch(data: { reason: string; operator: string }) {
    const response = await this.client.post('/api/v1/risk/kill-switch', data);
    return response.data;
  }

  // Metrics
  async getMetrics() {
    const response = await this.client.get('/api/v1/metrics');
    return response.data;
  }

  // Health Check
  async healthCheck() {
    try {
      const response = await this.client.get('/health');
      return response.data;
    } catch (error) {
      return { status: 'unhealthy', error: (error as Error).message };
    }
  }
}

export const apiService = new ApiService();
export default apiService;
