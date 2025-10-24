export interface B3Snapshot {
  instrument: string;
  price: number;
  change: number;
  timestamp: string;
}

export interface B3Indicator {
  name: string;
  value: number;
  change: number;
  timestamp: string;
}

export interface B3Gamma {
  instrument: string;
  callWall: number;
  putWall: number;
  gammaFlip: number;
  status?: string;
}

export interface B3Adjustment {
  instrument: string;
  contract: string;
  ajuste_anterior: number;
  ajuste_atual: number;
  variacao: number;
  data_ajuste: string;
  timestamp: string;
}

export interface B3DXY {
  value: number;
  timestamp: string;
}

