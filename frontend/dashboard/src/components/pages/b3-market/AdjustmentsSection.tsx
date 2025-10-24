import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CollapsibleCard, CollapsibleCardHeader, CollapsibleCardTitle, CollapsibleCardDescription, CollapsibleCardContent } from '../../ui/collapsible-card';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../../ui/select';
import { Input } from '../../ui/input';
import { Button } from '../../ui/button';
import { formatTimestamp } from '../../../utils/dateUtils';
import { b3MarketService } from '../../../services/b3MarketService';
import { formatNumber, CONTRACT_PATTERN } from './utils';

type AdjustmentQueryParams = NonNullable<Parameters<typeof b3MarketService.getAdjustments>[0]>;

export function AdjustmentsSection() {
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

  const {
    data: adjustments = [],
    isLoading: adjustmentsLoading,
    error: adjustmentsError,
  } = useQuery({
    queryKey: ['b3-adjustments', instrumentFilter, contractFilter, fromDate, toDate],
    queryFn: () => {
      if (contractFilter && contractError) {
        throw new Error(contractError);
      }
      
      const params: AdjustmentQueryParams = {};
      if (instrumentFilter && instrumentFilter !== 'ALL') {
        params.instrument = instrumentFilter;
      }
      if (contractFilter && !contractError) {
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
    staleTime: 60_000,
    enabled: !contractError,
  });

  return (
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
                  setFromDate('');
                  setToDate('');
                  setContractError('');
                }}
              >
                Limpar filtros
              </Button>
            </div>
          )}
        </div>
        {adjustmentsLoading && <p className="text-sm text-slate-500">Carregando...</p>}
        {adjustmentsError && (
          <p className="text-sm text-red-500">
            Erro ao carregar ajustes: {adjustmentsError.message}
          </p>
        )}
        {!adjustmentsLoading && !adjustmentsError && adjustments.length === 0 && (
          <p className="text-sm text-slate-500">Sem ajustes encontrados</p>
        )}
        {adjustments.length > 0 && (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm" aria-label="Ajustes">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-slate-600">Instrumento</th>
                  <th className="px-3 py-2 text-left font-medium text-slate-600">Contrato</th>
                  <th className="px-3 py-2 text-right font-medium text-slate-600">Ajuste Anterior</th>
                  <th className="px-3 py-2 text-right font-medium text-slate-600">Ajuste Atual</th>
                  <th className="px-3 py-2 text-right font-medium text-slate-600">Variação</th>
                  <th className="px-3 py-2 text-left font-medium text-slate-600">Data Ajuste</th>
                  <th className="px-3 py-2 text-left font-medium text-slate-600">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {adjustments.map((row, idx) => (
                  <tr key={`${row.instrument}-${row.contractMonth}-${row.timestamp}-${idx}`}>
                    <td className="px-3 py-2 font-medium text-slate-700">{row.instrument}</td>
                    <td className="px-3 py-2 text-slate-600">{row.contractMonth}</td>
                    <td className="px-3 py-2 text-right text-slate-600">{formatNumber(row.pricePrev, 6)}</td>
                    <td className="px-3 py-2 text-right text-slate-600">{formatNumber(row.priceSettlement, 6)}</td>
                    <td className="px-3 py-2 text-right">
                      <span className={(row.priceSettlement - row.pricePrev) >= 0 ? 'text-green-600' : 'text-red-600'}>
                        {formatNumber(row.priceSettlement - row.pricePrev, 6)}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-slate-600">{row.contractMonth}</td>
                    <td className="px-3 py-2 text-slate-600">{formatTimestamp(row.timestamp)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CollapsibleCardContent>
    </CollapsibleCard>
  );
}

