/**
 * B3 Service
 * Handles all HTTP requests to the B3 API
 */

import { getApiUrl } from '../config/api';

const API_BASE_URL = getApiUrl('b3Market');

export interface B3Snapshot {
  instrument: string;
  contractMonth: string;
  priceSettlement: number;
  priceSettlementPrev: number;
  status: string;
  source: string;
  timestamp: string;
}

export interface B3Indicator {
  name: string;
  value: number;
  displayValue: string;
  updatedAt: string;
  timestamp: string;
}

export interface B3GammaLevel {
  instrument: string;
  callWall: number;
  putWall: number;
  gammaFlip: number;
  status: string;
  timestamp: string;
}

export interface B3DxyTick {
  bucket: string;
  value: number;
  timestamp: string;
}

export interface B3Adjustment {
  timestamp: string;
  instrument: string;
  contractMonth: string;
  priceSettlement: number;
  pricePrev: number;
  status: string;
}

export interface B3VolSurface {
  timestamp: string;
  contractMonth: string;
  deltaBucket: string;
  volatility: number;
  updatedAt: string;
}

export interface B3IndicatorDaily {
  timestamp: string;
  indicator: string;
  value: number;
}

export interface B3Overview {
  snapshots: B3Snapshot[];
  indicators: B3Indicator[];
  gammaLevels: B3GammaLevel[];
  dxy: B3DxyTick[];
}

export const b3MarketService = {
  /**
   * Get overview (snapshots, indicators, gamma, dxy)
   */
  async getOverview(): Promise<B3Overview> {
    try {
      const response = await fetch(`${API_BASE_URL}/overview`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const json = await response.json();
      return json.data || { snapshots: [], indicators: [], gammaLevels: [], dxy: [] };
    } catch (error) {
      console.error('Error fetching B3 overview:', error);
      return { snapshots: [], indicators: [], gammaLevels: [], dxy: [] };
    }
  },

  /**
   * Get latest snapshots
   */
  async getSnapshots(): Promise<B3Snapshot[]> {
    try {
      const overview = await this.getOverview();
      return overview.snapshots;
    } catch (error) {
      console.error('Error fetching B3 snapshots:', error);
      return [];
    }
  },

  /**
   * Get latest indicators
   */
  async getIndicators(): Promise<B3Indicator[]> {
    try {
      const overview = await this.getOverview();
      return overview.indicators;
    } catch (error) {
      console.error('Error fetching B3 indicators:', error);
      return [];
    }
  },

  /**
   * Get latest gamma levels
   */
  async getGammaLevels(): Promise<B3GammaLevel[]> {
    try {
      const overview = await this.getOverview();
      return overview.gammaLevels;
    } catch (error) {
      console.error('Error fetching gamma levels:', error);
      return [];
    }
  },

  /**
   * Get latest DXY ticks
   */
  async getDxyTicks(): Promise<B3DxyTick[]> {
    try {
      const overview = await this.getOverview();
      return overview.dxy;
    } catch (error) {
      console.error('Error fetching DXY ticks:', error);
      return [];
    }
  },

  /**
   * Get adjustments with optional filters
   */
  async getAdjustments(params?: {
    limit?: number;
    instrument?: string;
    contract?: string;
    from?: string;
    to?: string;
  }): Promise<B3Adjustment[]> {
    try {
      const queryParams = new URLSearchParams();
      if (params?.limit) queryParams.append('limit', params.limit.toString());
      if (params?.instrument) queryParams.append('instrument', params.instrument);
      if (params?.contract) queryParams.append('contract', params.contract);
      if (params?.from) queryParams.append('from', params.from);
      if (params?.to) queryParams.append('to', params.to);

      const url = `${API_BASE_URL}/adjustments${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const json = await response.json();
      return json.data || [];
    } catch (error) {
      console.error('Error fetching adjustments:', error);
      return [];
    }
  },

  /**
   * Get volatility surface
   */
  async getVolSurface(params?: {
    contractMonth?: string;
    limit?: number;
  }): Promise<B3VolSurface[]> {
    try {
      const queryParams = new URLSearchParams();
      if (params?.contractMonth) queryParams.append('contract', params.contractMonth);
      if (params?.limit) queryParams.append('limit', params.limit.toString());

      const url = `${API_BASE_URL}/vol-surface${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const json = await response.json();
      return json.data || [];
    } catch (error) {
      console.error('Error fetching vol surface:', error);
      return [];
    }
  },

  /**
   * Get daily indicators
   */
  async getIndicatorsDaily(limit: number = 90): Promise<B3IndicatorDaily[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/indicators/daily?limit=${limit}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const json = await response.json();
      return json.data || [];
    } catch (error) {
      console.error('Error fetching daily indicators:', error);
      return [];
    }
  },

  /**
   * Health check
   */
  async healthCheck(): Promise<{ status: string; questdb: boolean }> {
    try {
      const response = await fetch(`${API_BASE_URL}/health`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error checking B3 Market API health:', error);
      return { status: 'error', questdb: false };
    }
  },
};