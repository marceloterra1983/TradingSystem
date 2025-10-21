import { useCallback, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CustomizablePageLayout } from '../layout/CustomizablePageLayout';
import {
  CollapsibleCard,
  CollapsibleCardHeader,
  CollapsibleCardTitle,
  CollapsibleCardDescription,
  CollapsibleCardContent,
} from '../ui/collapsible-card';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../ui/select';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { formatTimestamp } from '../../utils/dateUtils';
import { b3MarketService } from '../../services/b3MarketService';


function formatNumber(value: number | null | undefined, fractionDigits = 2) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return '–';
  }
  return Number(value).toLocaleString('pt-BR', {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });
}

const CONTRACT_PATTERN = /^[A-Z][0-9]{2}$/;

type AdjustmentQueryParams = NonNullable<Parameters<typeof b3MarketService.getAdjustments>[0]>;

export function B3MarketPage() {
  const [instrumentFilter, setInstrumentFilter] = useState<string>('ALL');
  const [contractFilter, setContractFilter] = useState<string>('');
  const [contractError, setContractError] = useState<string>('');
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');

  const handleContractFilterChange = useCallback((value: string) => {
    const upper = value.toUpperCase();
    setContractFilter(upper);
    
    if (upper && !CONTRACT_PATTERN.test(upper)) {
      setContractError('Formato inválido. Use padrão: [A-Z][0-9]{2} (ex: X25)');
    } else {
      setContractError('');
    }
  }, []);

  // Single query for all overview data (snapshots, indicators, gamma, dxy)
  const {
    data: overviewData,
    isLoading: overviewLoading,
    error: overviewError,
  } = useQuery({
    queryKey: ['b3-overview'],
    queryFn: () => b3MarketService.getOverview(),
    staleTime: 60_000,
    refetchInterval: 60_000,
    placeholderData: (previousData) => previousData,
  });

  // Derive individual datasets from overview
  const snapshots = useMemo(() => overviewData?.snapshots ?? [], [overviewData]);
  const indicators = useMemo(() => overviewData?.indicators ?? [], [overviewData]);
  const gamma = useMemo(() => overviewData?.gammaLevels ?? [], [overviewData]);
  const dxy = useMemo(() => overviewData?.dxy ?? [], [overviewData]);

  const {
    data: adjustments = [],
    isLoading: adjustmentsLoading,
    error: adjustmentsError,
  } = useQuery({
    queryKey: ['b3-adjustments', instrumentFilter, contractFilter, fromDate, toDate],
    queryFn: () => {
      // Skip fetch if contract filter is invalid
      if (contractFilter && contractError) {
        throw new Error(contractError);
      }
      
      const params: AdjustmentQueryParams = { limit: 120 };
      if (instrumentFilter && instrumentFilter !== 'ALL') {
        params.instrument = instrumentFilter.toLowerCase();
      }
      if (contractFilter) {
        params.contract = contractFilter;
      }
      if (fromDate) {
        params.from = new Date(fromDate).toISOString();
      }
      if (toDate) {
        params.to = new Date(toDate).toISOString();
      }
      return b3MarketService.getAdjustments(params);
    },
    staleTime: 120_000,
    refetchInterval: 120_000,
    placeholderData: (previousData) => previousData,
    enabled: !contractError, // Disable query if contract validation fails
  });

  const latestUpdate = useMemo(() => {
    const timestamps = [
      ...snapshots.map((row) => row.timestamp),
      ...indicators.map((row) => row.timestamp),
      ...gamma.map((row) => row.timestamp),
      ...dxy.map((row) => row.timestamp),
    ].filter(Boolean) as string[];
    if (timestamps.length === 0) return null;
    const sorted = [...timestamps].sort();
    return sorted[sorted.length - 1] ?? null;
  }, [snapshots, indicators, gamma, dxy]);

  const sections = useMemo(() => [
      {
        id: 'b3-overview',
        content: (
          <CollapsibleCard cardId="b3-overview" defaultCollapsed={false}>
            <CollapsibleCardHeader>
              <div>
                <CollapsibleCardTitle>B3 Snapshot</CollapsibleCardTitle>
                <CollapsibleCardDescription>
                  Última atualização: {formatTimestamp(latestUpdate)}
                </CollapsibleCardDescription>
              </div>
            </CollapsibleCardHeader>
            <CollapsibleCardContent>
              {overviewLoading && <p className="text-sm text-slate-600">Carregando dados...</p>}
              {overviewError && (
                <p className="text-red-500 text-sm">
                  Erro ao carregar dados da B3: {(overviewError as Error).message}. Verifique o serviço.
                </p>
              )}
              {!overviewLoading && !overviewError && snapshots.length === 0 && (
                <p className="text-sm text-slate-500">Sem dados disponíveis</p>
              )}
              {!overviewLoading && !overviewError && snapshots.length > 0 && (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  {snapshots.map((row) => (
                    <div key={row.instrument} className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
                      <div className="text-xs uppercase text-slate-500">{row.instrument}</div>
                      <div className="text-lg font-semibold">
                        {formatNumber(row.priceSettlement)}
                      </div>
                      <div className="text-xs text-slate-500">
                        Contrato: {row.contractMonth || '–'}
                      </div>
                      <div className="mt-2 text-xs text-slate-500">
                        Anterior: {formatNumber(row.priceSettlementPrev)}
                      </div>
                      <div className="mt-2 text-xs text-slate-500">
                        Status: {row.status || '–'}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CollapsibleCardContent>
          </CollapsibleCard>
        ),
      },
      {
        id: 'b3-indicators',
        content: (
          <CollapsibleCard cardId="b3-indicators" defaultCollapsed={false}>
            <CollapsibleCardHeader>
              <div>
                <CollapsibleCardTitle>Indicadores Financeiros</CollapsibleCardTitle>
                <CollapsibleCardDescription>
                  Valores oficiais consolidados (SELIC, DIF Operações, Dólar, SOFR)
                </CollapsibleCardDescription>
              </div>
            </CollapsibleCardHeader>
            <CollapsibleCardContent>
              {indicators.length === 0 && (
                <p className="text-sm text-slate-500">Sem dados disponíveis</p>
              )}
{indicators.length > 0 && (
                <div className="grid gap-4 lg:grid-cols-2">
                  {indicators.map((row) => (
                    <div
                      key={row.name}
                      className="rounded-md border border-slate-200 bg-white p-4 shadow-sm"
                    >
                      <div className="text-sm font-semibold text-slate-700">{row.name}</div>
                      <div className="text-xl font-bold text-emerald-600">
                        {row.displayValue || formatNumber(row.value)}
                      </div>
                      <div className="text-xs text-slate-500">
                        Atualizado em: {row.updatedAt || formatTimestamp(row.timestamp)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CollapsibleCardContent>
          </CollapsibleCard>
        ),
      },
      {
        id: 'b3-gamma',
        content: (
          <CollapsibleCard cardId="b3-gamma" defaultCollapsed>
            <CollapsibleCardHeader>
              <div>
                <CollapsibleCardTitle>Gamma Levels</CollapsibleCardTitle>
                <CollapsibleCardDescription>
                  Dados consolidados do GammaLevels (Call/Put walls & Gamma Flip)
                </CollapsibleCardDescription>
              </div>
            </CollapsibleCardHeader>
            <CollapsibleCardContent>
              {gamma.length === 0 && (
                <p className="text-sm text-slate-500">Sem dados disponíveis</p>
              )}
              {gamma.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200 text-sm" aria-label="Gamma Levels">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium text-slate-600">Instrumento</th>
                        <th className="px-3 py-2 text-left font-medium text-slate-600">Call Wall</th>
                        <th className="px-3 py-2 text-left font-medium text-slate-600">Put Wall</th>
                        <th className="px-3 py-2 text-left font-medium text-slate-600">Gamma Flip</th>
                        <th className="px-3 py-2 text-left font-medium text-slate-600">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 bg-white">
                      {gamma.map((row) => (
                        <tr key={row.instrument}>
                          <td className="px-3 py-2 font-medium text-slate-700">{row.instrument}</td>
                          <td className="px-3 py-2 text-slate-600">{formatNumber(row.callWall, 2)}</td>
                          <td className="px-3 py-2 text-slate-600">{formatNumber(row.putWall, 2)}</td>
                          <td className="px-3 py-2 text-slate-600">{formatNumber(row.gammaFlip, 2)}</td>
                          <td className="px-3 py-2 text-slate-600">{row.status || '–'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CollapsibleCardContent>
          </CollapsibleCard>
        ),
      },
      {
        id: 'b3-adjustments',
        content: (
          <CollapsibleCard cardId="b3-adjustments" defaultCollapsed>
            <CollapsibleCardHeader>
              <div>
                <CollapsibleCardTitle>Ajustes Recorrentes</CollapsibleCardTitle>
                <CollapsibleCardDescription>
                  Últimos registros de ajustes DI1, DDI e DOL (QuestDB)
                </CollapsibleCardDescription>
              </div>
            </CollapsibleCardHeader>
            <CollapsibleCardContent>
              <div className="mb-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">Instrumento</label>
                  <Select value={instrumentFilter} onValueChange={setInstrumentFilter}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Filtro de instrumento" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">Todos</SelectItem>
                      <SelectItem value="DDI">DDI</SelectItem>
                      <SelectItem value="DI1">DI1</SelectItem>
                      <SelectItem value="DOL">DOL</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">Contrato</label>
                  <Input
                    value={contractFilter}
                    onChange={(event) => handleContractFilterChange(event.target.value)}
                    placeholder="Ex: X25"
                    className={contractError ? 'border-red-500' : ''}
                  />
                  {contractError && (
                    <p className="mt-1 text-xs text-red-500">{contractError}</p>
                  )}
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">De (UTC)</label>
                  <Input type="datetime-local" value={fromDate} onChange={(event) => setFromDate(event.target.value)} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">Até (UTC)</label>
                  <Input type="datetime-local" value={toDate} onChange={(event) => setToDate(event.target.value)} />
                </div>
                {(instrumentFilter !== 'ALL' || contractFilter || fromDate || toDate) && (
                  <div className="flex items-end">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setInstrumentFilter('ALL');
                        setContractFilter('');
                        setContractError('');
                        setFromDate('');
                        setToDate('');
                      }}
                    >
                      Limpar filtros
                    </Button>
                  </div>
                )}
              </div>
              {adjustmentsLoading && <p className="text-sm text-slate-600">Carregando ajustes...</p>}
              {adjustmentsError && (
                <p className="text-red-500 text-sm">
                  Erro ao carregar ajustes: {(adjustmentsError as Error).message}. Verifique o serviço.
                </p>
              )}
              {!adjustmentsLoading && !adjustmentsError && adjustments.length === 0 && (
                <p className="text-sm text-slate-500">Sem dados disponíveis</p>
              )}
              {!adjustmentsLoading && !adjustmentsError && adjustments.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200 text-sm" aria-label="Ajustes Recorrentes">
                    <caption className="sr-only">Tabela de ajustes recorrentes DI1, DDI e DOL</caption>
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="whitespace-nowrap px-3 py-2 text-left font-medium text-slate-600">Data</th>
                        <th className="px-3 py-2 text-left font-medium text-slate-600">Instrumento</th>
                        <th className="px-3 py-2 text-right font-medium text-slate-600">Liquidação</th>
                        <th className="px-3 py-2 text-right font-medium text-slate-600">Anterior</th>
                        <th className="hidden px-3 py-2 text-left font-medium text-slate-600 sm:table-cell">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 bg-white">
                      {adjustments.map((row) => (
                        <tr key={`${row.timestamp}-${row.instrument}`}>
                          <td className="whitespace-nowrap px-3 py-2 text-slate-600">{formatTimestamp(row.timestamp)}</td>
                          <td className="px-3 py-2 font-medium text-slate-700">
                            {row.instrument} • {row.contractMonth || '–'}
                          </td>
                          <td className="px-3 py-2 text-right text-slate-600">
                            {formatNumber(row.priceSettlement)}
                          </td>
                          <td className="px-3 py-2 text-right text-slate-600">
                            {formatNumber(row.pricePrev)}
                          </td>
                          <td className="hidden px-3 py-2 text-slate-600 sm:table-cell">{row.status || '–'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CollapsibleCardContent>
          </CollapsibleCard>
        ),
      },
      {
        id: 'b3-dxy',
        content: (
          <CollapsibleCard cardId="b3-dxy" defaultCollapsed>
            <CollapsibleCardHeader>
              <div>
                <CollapsibleCardTitle>DXY Intraday</CollapsibleCardTitle>
                <CollapsibleCardDescription>
                  Últimos valores capturados para os buckets das 08h50 às 09h00
                </CollapsibleCardDescription>
              </div>
            </CollapsibleCardHeader>
            <CollapsibleCardContent>
              {dxy.length === 0 && (
                <p className="text-sm text-slate-500">Sem dados disponíveis</p>
              )}
              {dxy.length > 0 && (
                <div className="grid gap-4 sm:grid-cols-3">
                  {dxy.map((row) => (
                    <div key={row.bucket} className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
                      <div className="text-xs uppercase text-slate-500">{row.bucket}</div>
                      <div className="text-lg font-semibold text-slate-700">
                        {formatNumber(row.value, 3)}%
                      </div>
                      <div className="mt-2 text-xs text-slate-500">
                        Atualizado: {formatTimestamp(row.timestamp)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CollapsibleCardContent>
          </CollapsibleCard>
        ),
      },
    ], [
      snapshots,
      indicators,
      gamma,
      dxy,
      adjustments,
      overviewLoading,
      overviewError,
      adjustmentsLoading,
      adjustmentsError,
      latestUpdate,
      instrumentFilter,
      contractFilter,
      contractError,
      fromDate,
      toDate,
      handleContractFilterChange,
    ]);

  return (
    <CustomizablePageLayout
      pageId="b3-market-data"
      title="B3"
      subtitle="Dados consolidados da B3 publicados via QuestDB"
      sections={sections}
      defaultColumns={2}
    />
  );
}

export default B3MarketPage;
