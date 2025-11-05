import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CollapsibleCard,
  CollapsibleCardHeader,
  CollapsibleCardTitle,
  CollapsibleCardDescription,
  CollapsibleCardContent,
} from '../ui/collapsible-card';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../ui/tooltip';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { ScrollArea } from '../ui/scroll-area';
import { buildDocsUrl } from '../../lib/docsUrl';
import {
  getGovernanceSnapshot,
  GovernanceArtifact,
  GovernanceSnapshot,
} from '../../services/governanceService';
import {
  Activity,
  AlertCircle,
  ArrowDownUp,
  BarChart3,
  ExternalLink,
  FileText,
  Filter,
  FolderOpen,
  Layers,
  Loader2,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  TimerReset,
} from 'lucide-react';

type StatusCode = 'healthy' | 'warning' | 'overdue' | 'unknown';
type StatusFilter = 'all' | 'healthy' | 'warning' | 'overdue' | 'unknown';
type SortKey = 'title' | 'owner' | 'category' | 'status';

const STATUS_STYLES: Record<StatusCode, { label: string; badge: string; text: string }> = {
  healthy: {
    label: 'Healthy',
    badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-200',
    text: 'text-emerald-600 dark:text-emerald-300',
  },
  warning: {
    label: 'Due Soon',
    badge: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-200',
    text: 'text-amber-600 dark:text-amber-200',
  },
  overdue: {
    label: 'Overdue',
    badge: 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-200',
    text: 'text-rose-600 dark:text-rose-200',
  },
  unknown: {
    label: 'Unknown',
    badge: 'bg-slate-200 text-slate-700 dark:bg-slate-500/20 dark:text-slate-200',
    text: 'text-slate-500 dark:text-slate-300',
  },
};

const MS_IN_DAY = 24 * 60 * 60 * 1000;

function computeArtifactStatus(artifact: GovernanceArtifact) {
  const last = new Date(artifact.lastReviewed);
  if (Number.isNaN(last.getTime())) {
    return { code: 'unknown' as const, label: 'Unknown', detail: 'Data inválida' };
  }
  const reviewWindow = Number(artifact.reviewCycleDays || 90);
  const dueDate = new Date(last.getTime() + reviewWindow * MS_IN_DAY);
  const daysUntilDue = Math.round((dueDate.getTime() - Date.now()) / MS_IN_DAY);
  if (daysUntilDue < 0) {
    return {
      code: 'overdue' as const,
      label: 'Overdue',
      detail: `${Math.abs(daysUntilDue)}d em atraso`,
    };
  }
  if (daysUntilDue <= 15) {
    return {
      code: 'warning' as const,
      label: 'Due soon',
      detail: `${daysUntilDue}d restantes`,
    };
  }
  return {
    code: 'healthy' as const,
    label: 'Healthy',
    detail: `${daysUntilDue}d restantes`,
  };
}

function MetricCard({
  title,
  description,
  value,
  Icon,
}: {
  title: string;
  description: string;
  value: string;
  Icon: typeof Activity;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}

export default function GovernancePage() {
  const [snapshot, setSnapshot] = useState<GovernanceSnapshot | null>(null);
  const [state, setState] = useState<'idle' | 'loading' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [dataSource, setDataSource] = useState<'api' | 'static'>('api');

  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [ownerFilter, setOwnerFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sortKey, setSortKey] = useState<SortKey>('title');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<GovernanceArtifact | null>(null);
  const [docContent, setDocContent] = useState('');
  const [docLoading, setDocLoading] = useState(false);
  const [docError, setDocError] = useState<string | null>(null);

  const loadSnapshot = useCallback(
    async (showSpinner: boolean = true) => {
      if (showSpinner) {
        setState('loading');
      }
      setErrorMessage(null);
      try {
        const payload = await getGovernanceSnapshot();
        setSnapshot(payload);
        setDataSource('api');
        setState('idle');
      } catch (error) {
        console.error('[Governance] Snapshot load failed', error);
        setErrorMessage(
          error instanceof Error ? error.message : 'Falha ao carregar snapshot',
        );
        setState('error');
      }
    },
    [],
  );

  useEffect(() => {
    void loadSnapshot();
    const timer = window.setInterval(() => void loadSnapshot(false), 60_000);
    return () => window.clearInterval(timer);
  }, [loadSnapshot]);

  const snapshotAge = useMemo(() => {
    if (!snapshot?.metadata.generatedAt) return '-';
    const generated = new Date(snapshot.metadata.generatedAt).getTime();
    const minutes = Math.max(0, Math.round((Date.now() - generated) / 60000));
    return `${minutes}m atrás`;
  }, [snapshot?.metadata.generatedAt]);

  const categories = useMemo(() => {
    const unique = new Set<string>();
    snapshot?.artifacts.forEach((artifact) => unique.add(artifact.category));
    return Array.from(unique).sort((a, b) => a.localeCompare(b));
  }, [snapshot?.artifacts]);

  const owners = useMemo(() => {
    const unique = new Set<string>();
    snapshot?.artifacts.forEach((artifact) => unique.add(artifact.owner));
    return Array.from(unique).sort((a, b) => a.localeCompare(b));
  }, [snapshot?.artifacts]);

  const filteredRows = useMemo(() => {
    if (!snapshot?.artifacts) return [];
    const termTokens = searchTerm
      .toLowerCase()
      .split(/\s+/)
      .filter(Boolean);
    const statusPriority: Record<StatusCode, number> = {
      healthy: 0,
      warning: 1,
      overdue: 2,
      unknown: 3,
    };

    const rows = snapshot.artifacts.map((artifact) => ({
      artifact,
      status: computeArtifactStatus(artifact),
    }));

    const filtered = rows
      .filter(({ artifact }) =>
        categoryFilter === 'all' ? true : artifact.category === categoryFilter,
      )
      .filter(({ artifact }) =>
        ownerFilter === 'all' ? true : artifact.owner === ownerFilter,
      )
      .filter(({ status }) =>
        statusFilter === 'all' ? true : status.code === statusFilter,
      )
      .filter(({ artifact }) => {
        if (!termTokens.length) return true;
        const haystack = [
          artifact.title,
          artifact.owner,
          artifact.description,
          artifact.tags?.join(' '),
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return termTokens.every((token) => haystack.includes(token));
      });

    const sorted = filtered.sort((a, b) => {
      let valueA: string | number = '';
      let valueB: string | number = '';
      switch (sortKey) {
        case 'owner':
          valueA = a.artifact.owner.toLowerCase();
          valueB = b.artifact.owner.toLowerCase();
          break;
        case 'category':
          valueA = a.artifact.category.toLowerCase();
          valueB = b.artifact.category.toLowerCase();
          break;
        case 'status':
          valueA = statusPriority[a.status.code] ?? 99;
          valueB = statusPriority[b.status.code] ?? 99;
          break;
        case 'title':
        default:
          valueA = a.artifact.title.toLowerCase();
          valueB = b.artifact.title.toLowerCase();
          break;
      }
      if (valueA < valueB) return sortDirection === 'asc' ? -1 : 1;
      if (valueA > valueB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return sorted;
  }, [
    snapshot?.artifacts,
    categoryFilter,
    ownerFilter,
    statusFilter,
    searchTerm,
    sortKey,
    sortDirection,
  ]);

  const upcoming = snapshot?.freshness.upcoming ?? [];
  const overdue = snapshot?.freshness.overdue ?? [];
  const totalArtifacts = snapshot?.totals.artifacts ?? 0;

  const handleOpenDocument = useCallback((artifact: GovernanceArtifact) => {
    setSelectedDoc(artifact);
    setDialogOpen(true);
    setDocContent('');
    setDocError(null);
  }, []);

  useEffect(() => {
    if (!dialogOpen || !selectedDoc) {
      return;
    }
    const previewPath = selectedDoc.previewPath;
    if (!previewPath) {
      setDocError('Pré-visualização indisponível para este documento.');
      setDocLoading(false);
      return;
    }
    let cancelled = false;
    setDocLoading(true);
    fetch(previewPath, { cache: 'no-store' })
      .then((res) => {
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        return res.text();
      })
      .then((text) => {
        if (!cancelled) {
          setDocContent(text);
          setDocLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setDocError(
            err instanceof Error ? err.message : 'Falha ao carregar documento',
          );
          setDocLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [dialogOpen, selectedDoc]);

  const closeDialog = () => {
    setDialogOpen(false);
    setSelectedDoc(null);
    setDocContent('');
    setDocError(null);
  };

  const docsUrlFor = (artifact: GovernanceArtifact) =>
    artifact.publishSlug ? buildDocsUrl(artifact.publishSlug) : null;

  const handleSort = (column: SortKey) => {
    if (sortKey === column) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(column);
      setSortDirection('asc');
    }
  };

  return (
    <TooltipProvider>
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">Governance Hub</h1>
            <p className="text-sm text-muted-foreground">
              Visão executiva dos artefatos de governança, freshness e ações pendentes.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={dataSource === 'api' ? 'default' : 'secondary'}>
              Fonte: {dataSource === 'api' ? 'API' : 'snapshot'}
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadSnapshot()}
              disabled={state === 'loading'}
            >
              <RefreshCw
                className={`mr-2 h-4 w-4 ${
                  state === 'loading' ? 'animate-spin' : ''
                }`}
              />
              Atualizar
            </Button>
          </div>
        </div>

        {state === 'error' && errorMessage && (
          <div className="flex items-start gap-3 rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 dark:border-rose-900/30 dark:bg-rose-900/10 dark:text-rose-100">
            <AlertCircle className="mt-0.5 h-4 w-4" />
            <div>
              <p className="font-semibold">Snapshot indisponível</p>
              <p>{errorMessage}</p>
            </div>
          </div>
        )}

        <CollapsibleCard cardId="governance-overview">
          <CollapsibleCardHeader>
            <div>
              <CollapsibleCardTitle>Resumo Geral</CollapsibleCardTitle>
              <CollapsibleCardDescription>
                KPIs consolidados do hub de governança, atualizados automaticamente.
              </CollapsibleCardDescription>
            </div>
          </CollapsibleCardHeader>
          <CollapsibleCardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <MetricCard
                title="Artefatos"
                description="Documentos rastreados"
                value={snapshot?.totals.artifacts?.toString() ?? '0'}
                Icon={Layers}
              />
              <MetricCard
                title="Publicados"
                description="Sincronizados com Docs"
                value={snapshot?.totals.published?.toString() ?? '0'}
                Icon={Sparkles}
              />
              <MetricCard
                title="Evidence"
                description="Audits e relatórios"
                value={snapshot?.totals.evidence?.toString() ?? '0'}
                Icon={FolderOpen}
              />
              <MetricCard
                title="Snapshot"
                description="Atualizado"
                value={snapshotAge}
                Icon={TimerReset}
              />
            </div>
          </CollapsibleCardContent>
        </CollapsibleCard>

        <CollapsibleCard cardId="governance-freshness" defaultCollapsed>
          <CollapsibleCardHeader>
            <div>
              <CollapsibleCardTitle>Freshness & Reviews</CollapsibleCardTitle>
              <CollapsibleCardDescription>
                Distribuição de saúde, próximos vencimentos e status do review-tracking.
              </CollapsibleCardDescription>
            </div>
          </CollapsibleCardHeader>
          <CollapsibleCardContent>
            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Distribuição</CardTitle>
                  <CardDescription>Janela de revisão por status</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {(['healthy', 'warning', 'overdue'] as const).map((status) => {
                    const absolute = snapshot?.freshness.distribution[status] ?? 0;
                    const percent = totalArtifacts
                      ? Math.min(100, (absolute / totalArtifacts) * 100)
                      : 0;
                    const barColor =
                      status === 'healthy'
                        ? 'var(--ts-green-400)'
                        : status === 'warning'
                        ? 'var(--ts-amber-400)'
                        : 'var(--ts-red-400)';
                    return (
                      <div key={status} className="space-y-1">
                        <div className="flex items-center justify-between text-sm font-medium">
                          <span>{STATUS_STYLES[status].label}</span>
                          <span>{absolute}</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{ width: `${percent}%`, backgroundColor: barColor }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>

              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Próximas Revisões</CardTitle>
                    <CardDescription>Top 5 itens a vencer</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {upcoming.length === 0 && (
                      <p className="text-sm text-muted-foreground">
                        Nenhum item previsto para os próximos dias.
                      </p>
                    )}
                    {upcoming.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between rounded-md border bg-muted/40 px-3 py-2 text-sm"
                      >
                        <div>
                          <p className="font-medium leading-tight">{item.title}</p>
                          <p className="text-xs text-muted-foreground">Owner {item.owner}</p>
                        </div>
                        <Badge variant="outline">{item.daysUntilDue}d</Badge>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Review Tracking</CardTitle>
                    <CardDescription>Status do `review-tracking.csv`</CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-3 md:grid-cols-2">
                    <div>
                      <p className="mb-2 text-xs uppercase text-muted-foreground">
                        Status
                      </p>
                      <div className="space-y-1 text-sm">
                        {Object.entries(
                          snapshot?.reviewTracking.statusCounts ?? {},
                        ).map(([status, count]) => (
                          <div
                            key={status}
                            className="flex items-center justify-between rounded-md bg-muted/40 px-2 py-1"
                          >
                            <span>{status}</span>
                            <Badge variant="outline">{count}</Badge>
                          </div>
                        ))}
                        {!snapshot?.reviewTracking.statusCounts && (
                          <p className="text-muted-foreground">Sem registros</p>
                        )}
                      </div>
                    </div>
                    <div>
                      <p className="mb-2 text-xs uppercase text-muted-foreground">
                        Governance Status
                      </p>
                      <div className="space-y-1 text-sm">
                        {Object.entries(
                          snapshot?.reviewTracking.governanceStatusCounts ?? {},
                        ).map(([status, count]) => (
                          <div
                            key={status}
                            className="flex items-center justify-between rounded-md bg-muted/40 px-2 py-1"
                          >
                            <span>{status}</span>
                            <Badge variant="secondary">{count}</Badge>
                          </div>
                        ))}
                        {!snapshot?.reviewTracking.governanceStatusCounts && (
                          <p className="text-muted-foreground">Sem registros</p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </CollapsibleCardContent>
        </CollapsibleCard>

        <CollapsibleCard cardId="governance-documents" defaultCollapsed>
          <CollapsibleCardHeader>
            <div>
              <CollapsibleCardTitle>Governance Documents</CollapsibleCardTitle>
              <CollapsibleCardDescription>
                Biblioteca completa com busca, filtros e preview embutido.
              </CollapsibleCardDescription>
            </div>
          </CollapsibleCardHeader>
          <CollapsibleCardContent>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Buscar por título, owner ou tag"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Filter className="hidden h-4 w-4 text-muted-foreground lg:block" />
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder="Categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as categorias</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={ownerFilter} onValueChange={setOwnerFilter}>
                  <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder="Owner" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os owners</SelectItem>
                    {owners.map((owner) => (
                      <SelectItem key={owner} value={owner}>
                        {owner}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={statusFilter}
                  onValueChange={(value) => setStatusFilter(value as StatusFilter)}
                >
                  <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os status</SelectItem>
                    <SelectItem value="healthy">Healthy</SelectItem>
                    <SelectItem value="warning">Due soon</SelectItem>
                    <SelectItem value="overdue">Overdue</SelectItem>
                    <SelectItem value="unknown">Unknown</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="mt-4 overflow-x-auto rounded-lg border">
              <table className="min-w-full divide-y divide-border text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium">
                      <button
                        type="button"
                        onClick={() => handleSort('title')}
                        className="flex items-center gap-1 text-sm font-medium text-muted-foreground transition hover:text-foreground"
                      >
                        <span>Documento</span>
                        <ArrowDownUp
                          className={`h-3.5 w-3.5 transition ${sortKey === 'title' ? 'text-foreground' : 'opacity-50'} ${
                            sortKey === 'title' && sortDirection === 'desc' ? 'rotate-180' : ''
                          }`}
                        />
                      </button>
                    </th>
                    <th className="px-4 py-2 text-left font-medium">
                      <button
                        type="button"
                        onClick={() => handleSort('owner')}
                        className="flex items-center gap-1 text-sm font-medium text-muted-foreground transition hover:text-foreground"
                      >
                        <span>Owner</span>
                        <ArrowDownUp
                          className={`h-3.5 w-3.5 transition ${sortKey === 'owner' ? 'text-foreground' : 'opacity-50'} ${
                            sortKey === 'owner' && sortDirection === 'desc' ? 'rotate-180' : ''
                          }`}
                        />
                      </button>
                    </th>
                    <th className="px-4 py-2 text-left font-medium">
                      <button
                        type="button"
                        onClick={() => handleSort('category')}
                        className="flex items-center gap-1 text-sm font-medium text-muted-foreground transition hover:text-foreground"
                      >
                        <span>Categoria</span>
                        <ArrowDownUp
                          className={`h-3.5 w-3.5 transition ${sortKey === 'category' ? 'text-foreground' : 'opacity-50'} ${
                            sortKey === 'category' && sortDirection === 'desc' ? 'rotate-180' : ''
                          }`}
                        />
                      </button>
                    </th>
                    <th className="px-4 py-2 text-left font-medium">
                      <button
                        type="button"
                        onClick={() => handleSort('status')}
                        className="flex items-center gap-1 text-sm font-medium text-muted-foreground transition hover:text-foreground"
                      >
                        <span>Status</span>
                        <ArrowDownUp
                          className={`h-3.5 w-3.5 transition ${sortKey === 'status' ? 'text-foreground' : 'opacity-50'} ${
                            sortKey === 'status' && sortDirection === 'desc' ? 'rotate-180' : ''
                          }`}
                        />
                      </button>
                    </th>
                    <th className="px-4 py-2 text-right font-medium">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border bg-background">
                  {filteredRows.length === 0 && (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-4 py-6 text-center text-sm text-muted-foreground"
                      >
                        Nenhum documento encontrado para os filtros aplicados.
                      </td>
                    </tr>
                  )}
                  {filteredRows.map(({ artifact, status }) => {
                    return (
                      <tr key={artifact.id} className="align-top">
                        <td className="px-4 py-3">
                          <p className="font-semibold leading-tight">
                            {artifact.title}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {artifact.description || 'Sem descrição'}
                          </p>
                          <div className="mt-1 flex flex-wrap gap-1">
                            {artifact.tags?.map((tag) => (
                              <Badge key={tag} variant="outline" className="text-[10px]">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {artifact.owner}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {artifact.category}
                        </td>
                        <td className="px-4 py-3">
                          <Badge className={STATUS_STYLES[status.code].badge}>
                            {STATUS_STYLES[status.code].label}
                          </Badge>
                          <p className={`text-xs ${STATUS_STYLES[status.code].text}`}>
                            {status.detail}
                          </p>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end gap-2">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  aria-label="Pré-visualizar documento"
                                  onClick={() => handleOpenDocument(artifact)}
                                  disabled={!artifact.previewPath}
                                >
                                  <FileText className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Preview rápido</p>
                              </TooltipContent>
                            </Tooltip>
                            {docsUrlFor(artifact) && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    aria-label="Abrir no Docs"
                                    onClick={() =>
                                      window.open(docsUrlFor(artifact)!, '_blank')
                                    }
                                  >
                                    <ExternalLink className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Abrir no portal Docs</p>
                                </TooltipContent>
                              </Tooltip>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CollapsibleCardContent>
        </CollapsibleCard>

        <Dialog open={dialogOpen} onOpenChange={(open) => !open && closeDialog()}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>{selectedDoc?.title ?? 'Documento'}</DialogTitle>
              <DialogDescription>
                {selectedDoc?.description || 'Documento de governança'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 text-sm text-muted-foreground">
              {selectedDoc && (
                <div className="flex flex-wrap gap-3 text-xs uppercase tracking-wide">
                  <span>Owner: {selectedDoc.owner}</span>
                  <span>Categoria: {selectedDoc.category}</span>
                  <span>Revisado em: {selectedDoc.lastReviewed}</span>
                </div>
              )}
              <ScrollArea className="max-h-[60vh] rounded-md border">
                <div className="p-4 text-left">
                  {docLoading && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" /> Carregando...
                    </div>
                  )}
                  {docError && <p className="text-rose-500">{docError}</p>}
                  {!docLoading && !docError && (
                    <pre className="whitespace-pre-wrap break-words text-sm leading-relaxed">
                      {docContent || 'Sem conteúdo disponível.'}
                    </pre>
                  )}
                </div>
              </ScrollArea>
            </div>
            <DialogFooter className="flex flex-col gap-2 sm:flex-row">
              {selectedDoc && docsUrlFor(selectedDoc) && (
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => window.open(docsUrlFor(selectedDoc)!, '_blank')}
                >
                  Abrir no Docs
                </Button>
              )}
              <Button type="button" onClick={closeDialog} className="flex-1">
                Fechar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}
