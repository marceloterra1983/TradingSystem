import { Badge } from '../ui/badge';
import { LlamaIndexCollectionInfo } from './LlamaIndexIngestionStatusCard';

interface LlamaIndexCollectionsCardProps {
  primaryCollection?: string;
  collections?: LlamaIndexCollectionInfo[];
  chunkCount?: number | null;
  loading?: boolean;
}

export function LlamaIndexCollectionsCard({
  primaryCollection,
  collections,
  chunkCount,
  loading = false,
}: LlamaIndexCollectionsCardProps): JSX.Element {
  const list = collections ?? [];
  const hasAlias = list.some((item) => item.aliasOf);

  return (
    <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/60 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Coleções Qdrant</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {loading ? 'Sincronizando…' : `${list.length} coleção(ões) registradas.`}
          </p>
        </div>
        {typeof chunkCount === 'number' && (
          <Badge variant="outline">{chunkCount.toLocaleString()} chunks indexados</Badge>
        )}
      </div>
      {hasAlias && (
        <p className="text-[11px] text-slate-500 dark:text-slate-400">
          Coleções marcadas como <em>alias</em> apontam para a coleção ativa e serão removidas futuramente.
        </p>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left text-slate-600 dark:text-slate-300">
          <thead className="text-xs uppercase text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
            <tr>
              <th className="py-2">Coleção</th>
              <th className="py-2 text-right">Chunks</th>
            </tr>
          </thead>
          <tbody>
            {list.length === 0 && (
              <tr>
                <td colSpan={2} className="py-3 text-center text-xs text-slate-500 dark:text-slate-400">
                  Nenhuma coleção encontrada.
                </td>
              </tr>
            )}
            {list.map((collection) => {
              const isPrimary = collection.name === primaryCollection;
              const aliasTarget = collection.aliasOf;
              return (
                <tr key={collection.name} className="border-b border-slate-100 dark:border-slate-800 last:border-0">
                  <td className="py-2">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-slate-700 dark:text-slate-200">{collection.name}</span>
                      {isPrimary && <Badge variant="secondary">ativo</Badge>}
                      {!isPrimary && aliasTarget && (
                        <Badge variant="outline" className="text-[10px] uppercase tracking-wide">
                          alias de {aliasTarget}
                        </Badge>
                      )}
                    </div>
                  </td>
                  <td className="py-2 text-right font-medium text-slate-700 dark:text-slate-200">
                    {typeof collection.count === 'number' ? collection.count.toLocaleString() : '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default LlamaIndexCollectionsCard;
