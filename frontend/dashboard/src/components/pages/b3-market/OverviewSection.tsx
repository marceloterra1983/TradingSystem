import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CollapsibleCard, CollapsibleCardHeader, CollapsibleCardTitle, CollapsibleCardDescription, CollapsibleCardContent } from '../../ui/collapsible-card';
import { formatTimestamp } from '../../../utils/dateUtils';
import { b3MarketService } from '../../../services/b3MarketService';
import { formatNumber } from './utils';

export function OverviewSection() {
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

  const snapshots = useMemo(() => overviewData?.snapshots ?? [], [overviewData]);
  const indicators = useMemo(() => overviewData?.indicators ?? [], [overviewData]);
  const gamma = useMemo(() => overviewData?.gammaLevels ?? [], [overviewData]);
  const dxy = useMemo(() => overviewData?.dxy ?? [], [overviewData]);

  return (
    <>
      <CollapsibleCard cardId="b3-snapshots">
        <CollapsibleCardHeader>
          <div>
            <CollapsibleCardTitle>Snapshots</CollapsibleCardTitle>
            <CollapsibleCardDescription>
              Dados consolidados do Snapshot (Preços e variações)
            </CollapsibleCardDescription>
          </div>
        </CollapsibleCardHeader>
        <CollapsibleCardContent>
          {overviewLoading && <p className="text-sm text-slate-500">Carregando...</p>}
          {overviewError && <p className="text-sm text-red-500">Erro: {overviewError.message}</p>}
          {!overviewLoading && !overviewError && snapshots.length === 0 && (
            <p className="text-sm text-slate-500">Sem dados disponíveis</p>
          )}
          {snapshots.length > 0 && (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm" aria-label="Snapshots">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-slate-600">Instrumento</th>
                    <th className="px-3 py-2 text-right font-medium text-slate-600">Preço</th>
                    <th className="px-3 py-2 text-right font-medium text-slate-600">Variação</th>
                    <th className="px-3 py-2 text-left font-medium text-slate-600">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {snapshots.map((row) => (
                    <tr key={row.instrument}>
                      <td className="px-3 py-2 font-medium text-slate-700">{row.instrument}</td>
                      <td className="px-3 py-2 text-right text-slate-600">{formatNumber(row.priceSettlement, 2)}</td>
                      <td className="px-3 py-2 text-right">
                        <span className={(row.priceSettlement - row.priceSettlementPrev) >= 0 ? 'text-green-600' : 'text-red-600'}>
                          {formatNumber(row.priceSettlement - row.priceSettlementPrev, 2)}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-slate-600">{formatTimestamp(row.timestamp)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CollapsibleCardContent>
      </CollapsibleCard>

      <CollapsibleCard cardId="b3-indicators" defaultCollapsed>
        <CollapsibleCardHeader>
          <div>
            <CollapsibleCardTitle>Indicadores</CollapsibleCardTitle>
            <CollapsibleCardDescription>
              Dados consolidados do Indicadores (Índices e mercado)
            </CollapsibleCardDescription>
          </div>
        </CollapsibleCardHeader>
        <CollapsibleCardContent>
          {indicators.length === 0 && <p className="text-sm text-slate-500">Sem dados disponíveis</p>}
          {indicators.length > 0 && (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm" aria-label="Indicadores">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-slate-600">Nome</th>
                    <th className="px-3 py-2 text-right font-medium text-slate-600">Valor</th>
                    <th className="px-3 py-2 text-right font-medium text-slate-600">Variação</th>
                    <th className="px-3 py-2 text-left font-medium text-slate-600">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {indicators.map((row) => (
                    <tr key={row.name}>
                      <td className="px-3 py-2 font-medium text-slate-700">{row.name}</td>
                      <td className="px-3 py-2 text-right text-slate-600">{row.displayValue || formatNumber(row.value, 2)}</td>
                      <td className="px-3 py-2 text-right">
                        <span className="text-slate-600">
                          –
                        </span>
                      </td>
                      <td className="px-3 py-2 text-slate-600">{formatTimestamp(row.timestamp)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CollapsibleCardContent>
      </CollapsibleCard>

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
          {gamma.length === 0 && <p className="text-sm text-slate-500">Sem dados disponíveis</p>}
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

      <CollapsibleCard cardId="b3-dxy" defaultCollapsed>
        <CollapsibleCardHeader>
          <div>
            <CollapsibleCardTitle>DXY (Dólar Index)</CollapsibleCardTitle>
            <CollapsibleCardDescription>
              Índice do Dólar Americano
            </CollapsibleCardDescription>
          </div>
        </CollapsibleCardHeader>
        <CollapsibleCardContent>
          {dxy.length === 0 && <p className="text-sm text-slate-500">Sem dados disponíveis</p>}
          {dxy.length > 0 && (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm" aria-label="DXY">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-3 py-2 text-right font-medium text-slate-600">Valor</th>
                    <th className="px-3 py-2 text-left font-medium text-slate-600">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {dxy.map((row, idx) => (
                    <tr key={`${row.timestamp}-${idx}`}>
                      <td className="px-3 py-2 text-right text-slate-600">{formatNumber(row.value, 4)}</td>
                      <td className="px-3 py-2 text-slate-600">{formatTimestamp(row.timestamp)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CollapsibleCardContent>
      </CollapsibleCard>
    </>
  );
}

