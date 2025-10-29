import * as React from 'react';
import { llamaIndexService, type QueryResponse, type SearchResultItem } from '../../services/llamaIndexService';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Checkbox } from '../ui/checkbox';
import { Badge } from '../ui/badge';

export function LlamaIndexQueryTool(): JSX.Element {
  const [text, setText] = React.useState('Explain our docs structure');
  const [maxResults, setMaxResults] = React.useState(3);
  const [useLlm, setUseLlm] = React.useState(true);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [results, setResults] = React.useState<SearchResultItem[] | null>(null);
  const [answer, setAnswer] = React.useState<QueryResponse | null>(null);
  const [copied, setCopied] = React.useState<string | null>(null);

  const handleCopy = async (label: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(label);
      setTimeout(() => setCopied(null), 1200);
    } catch {}
  };

  const handleRun = async () => {
    setLoading(true);
    setError(null);
    setResults(null);
    setAnswer(null);
    try {
      if (useLlm) {
        const resp = await llamaIndexService.queryDocs(text, maxResults);
        setAnswer(resp);
      } else {
        const items = await llamaIndexService.search(text, maxResults);
        setResults(items);
      }
    } catch (e: any) {
      setError(e?.message || 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-3">
        <div className="md:col-span-2">
          <Label htmlFor="li-query">Query</Label>
          <Input id="li-query" value={text} onChange={(e) => setText(e.target.value)} placeholder="Pergunta ou termos de busca" />
        </div>
        <div className="flex items-center gap-3">
          <div>
            <Label htmlFor="li-max">Top-K</Label>
            <Input
              id="li-max"
              type="number"
              min={1}
              max={10}
              value={maxResults}
              onChange={(e) => setMaxResults(parseInt(e.target.value || '1', 10))}
            />
          </div>
          <label className="flex items-center gap-2 mt-6">
            <Checkbox checked={useLlm} onCheckedChange={(v) => setUseLlm(!!v)} />
            <span className="text-sm text-slate-600 dark:text-slate-400">Usar LLM (/query)</span>
          </label>
          <Button onClick={handleRun} disabled={loading} className="self-end">
            {loading ? 'Executando…' : 'Executar'}
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-red-300 bg-red-50 text-red-700 p-3 text-sm">
          {error}
        </div>
      )}

      {results && (
        <div className="space-y-2">
          <p className="text-sm text-slate-600 dark:text-slate-400">Resultados ({results.length}):</p>
          <ul className="space-y-2">
            {results.map((r, idx) => (
              <li key={idx} className="rounded border border-slate-200 dark:border-slate-800 p-3">
                <div className="flex items-center justify-between">
                  <Badge variant="outline">Score {r.relevance.toFixed(3)}</Badge>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleCopy(`res-${idx}`, r.content)}>
                      Copiar
                    </Button>
                    {copied === `res-${idx}` && (
                      <span className="text-xs text-emerald-600">Copiado</span>
                    )}
                  </div>
                </div>
                <p className="mt-2 text-sm whitespace-pre-wrap">
                  {r.content}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {answer && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Badge variant="outline">Conf {answer.confidence.toFixed(3)}</Badge>
            <Badge variant="outline">Fontes {answer.sources.length}</Badge>
            <Button variant="outline" size="sm" onClick={() => handleCopy('answer', answer.answer)}>
              Copiar resposta
            </Button>
            {copied === 'answer' && (
              <span className="text-xs text-emerald-600">Copiado</span>
            )}
          </div>
          <div className="rounded border border-slate-200 dark:border-slate-800 p-3">
            <p className="text-sm whitespace-pre-wrap">{answer.answer}</p>
          </div>
          <div className="space-y-2">
            {answer.sources.map((s, idx) => (
              <div key={idx} className="rounded border border-slate-200 dark:border-slate-800 p-3">
                <div className="flex items-center justify-between">
                  <Badge variant="outline">Score {s.relevance.toFixed(3)}</Badge>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleCopy(`src-${idx}`, s.content)}>
                      Copiar fonte
                    </Button>
                    {copied === `src-${idx}` && (
                      <span className="text-xs text-emerald-600">Copiado</span>
                    )}
                  </div>
                </div>
                <p className="mt-2 text-sm whitespace-pre-wrap">{s.content}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default LlamaIndexQueryTool;
