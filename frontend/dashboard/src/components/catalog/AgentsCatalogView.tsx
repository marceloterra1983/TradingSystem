import { useCallback, useMemo, useState, type ReactNode } from 'react';
import {
  CollapsibleCard,
  CollapsibleCardContent,
  CollapsibleCardDescription,
  CollapsibleCardHeader,
  CollapsibleCardTitle,
} from '../ui/collapsible-card';
import { CustomizablePageLayout } from '../layout/CustomizablePageLayout';
import { Input } from '../ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { ScrollArea } from '../ui/scroll-area';
import { MarkdownPreview } from '../ui/MarkdownPreview';
import { ArrowDown, ArrowUp, ArrowUpDown, Copy, Eye, FileWarning, Filter, Search } from 'lucide-react';

import {
  AI_AGENTS_DIRECTORY,
  AGENT_CATEGORY_ORDER,
} from '../../data/aiAgentsDirectory';

type AgentRecord = (typeof AI_AGENTS_DIRECTORY)[number];
type SortField =
  | 'name'
  | 'category'
  | 'capabilities'
  | 'usage'
  | 'example'
  | 'outputType'
  | 'tags';
type SortDirection = 'asc' | 'desc';

const ALL_AGENTS = AI_AGENTS_DIRECTORY;
const TOTAL_AGENTS = ALL_AGENTS.length;

const getAvailableCategories = () => {
  const existing = new Set(ALL_AGENTS.map((agent) => agent.category));
  return AGENT_CATEGORY_ORDER.filter((category) => existing.has(category));
};

const surfaceCardClass =
  'rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900/60';
const mutedTextClass = 'text-slate-500 dark:text-slate-400';
const filterBadgeClass =
  'border-cyan-300 text-cyan-700 dark:border-cyan-700 dark:text-cyan-300';

interface AgentsCatalogViewProps {
  headerActions?: ReactNode;
}

export default function AgentsCatalogView({
  headerActions,
}: AgentsCatalogViewProps = {}): JSX.Element {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [tagFilter, setTagFilter] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<AgentRecord | null>(null);
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const categories = useMemo(() => getAvailableCategories(), []);
  const tagOptions = useMemo(
    () =>
      Array.from(new Set(ALL_AGENTS.flatMap((agent) => agent.tags ?? []))).sort(),
    [],
  );

  const filteredAgents = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    const matchesSearch = (agent: AgentRecord) => {
      if (!normalizedSearch) {
        return true;
      }
      const haystack = [
        agent.name,
        agent.category,
        agent.capabilities,
        agent.usage,
        agent.example,
        agent.outputType,
        (agent.tags ?? []).join(' '),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return haystack.includes(normalizedSearch);
    };

    const matchesCategory = (agent: AgentRecord) =>
      categoryFilter === 'all' || agent.category === categoryFilter;

    const matchesTag = (agent: AgentRecord) =>
      tagFilter === 'all' || (agent.tags ?? []).includes(tagFilter);

    const toComparable = (agent: AgentRecord, field: SortField) => {
      switch (field) {
        case 'name':
          return agent.name;
        case 'category':
          return agent.category;
        case 'capabilities':
          return agent.capabilities;
        case 'usage':
          return agent.usage;
        case 'example':
          return agent.example;
        case 'outputType':
          return agent.outputType;
        case 'tags':
          return (agent.tags ?? []).join(', ');
        default:
          return '';
      }
    };

    const filtered = ALL_AGENTS.filter(
      (agent) => matchesSearch(agent) && matchesCategory(agent) && matchesTag(agent),
    );

    return filtered.slice().sort((a, b) => {
      const aValue = toComparable(a, sortField).toLowerCase();
      const bValue = toComparable(b, sortField).toLowerCase();
      if (aValue < bValue) {
        return sortDirection === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortDirection === 'asc' ? 1 : -1;
      }
      const aName = a.name.toLowerCase();
      const bName = b.name.toLowerCase();
      if (aName < bName) {
        return -1;
      }
      if (aName > bName) {
        return 1;
      }
      return 0;
    });
  }, [categoryFilter, sortDirection, sortField, tagFilter, searchTerm]);

  const handleOpenAgent = (agent: AgentRecord) => {
    setSelectedAgent(agent);
    setDialogOpen(true);
  };

  const handleDialogOpenChange = (open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      setSelectedAgent(null);
    }
  };

  const handleClearFilters = () => {
    setCategoryFilter('all');
    setTagFilter('all');
    setSearchTerm('');
  };

  const handleCopyName = useCallback(async (agentName: string) => {
    if (!navigator?.clipboard) {
      console.error('Clipboard API indisponível.');
      return;
    }
    try {
      await navigator.clipboard.writeText(agentName);
    } catch (error) {
      console.error('Falha ao copiar nome do agente.', error);
    }
  }, []);

  const handleSort = (field: SortField) => {
    setSortField((previousField) => {
      if (previousField === field) {
        setSortDirection((previousDirection) =>
          previousDirection === 'asc' ? 'desc' : 'asc',
        );
        return previousField;
      }
      setSortDirection('asc');
      return field;
    });
  };

  const renderSortIcon = (field: SortField) => {
    if (field !== sortField) {
      return <ArrowUpDown className="h-3 w-3 opacity-50" />;
    }
    return sortDirection === 'asc' ? (
      <ArrowUp className="h-3 w-3" />
    ) : (
      <ArrowDown className="h-3 w-3" />
    );
  };

  const sections = useMemo(
    () => [
      {
        id: 'agents-catalog',
        content: (
          <CollapsibleCard
            cardId="agents-catalog"
            defaultCollapsed={false}
            className={surfaceCardClass}
          >
            <CollapsibleCardHeader>
              <div className="flex items-center gap-3">
                <CollapsibleCardTitle>Catálogo de Agentes Claude</CollapsibleCardTitle>
                <Badge variant="secondary">
                  {filteredAgents.length} de {TOTAL_AGENTS}
                </Badge>
              </div>
              <CollapsibleCardDescription>
                Consulte o diretório oficial de agentes configurados para o TradingSystem, com filtros por domínio, tags e acesso rápido ao arquivo Markdown original.
              </CollapsibleCardDescription>
            </CollapsibleCardHeader>
            <CollapsibleCardContent>
              <div className="space-y-4">
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <div className="md:col-span-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <Input
                        value={searchTerm}
                        onChange={(event) => setSearchTerm(event.target.value)}
                        placeholder="Buscar por agente, capacidade, momento de uso ou tag"
                        className="pl-9"
                      />
                    </div>
                  </div>
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="w-full">
                      <Filter className="mr-2 h-4 w-4 text-slate-400" />
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
                  <Select value={tagFilter} onValueChange={setTagFilter}>
                    <SelectTrigger className="w-full">
                      <Filter className="mr-2 h-4 w-4 rotate-90 text-slate-400" />
                      <SelectValue placeholder="Tag" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas as tags</SelectItem>
                      {tagOptions.map((tag) => (
                        <SelectItem key={tag} value={tag}>
                          {tag}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className={`flex items-center gap-2 text-xs ${mutedTextClass}`}>
                  <span>
                    Exibindo{' '}
                    <strong className="text-slate-700 dark:text-slate-200">
                      {filteredAgents.length}
                    </strong>{' '}
                    de{' '}
                    <strong className="text-slate-700 dark:text-slate-200">
                      {TOTAL_AGENTS}
                    </strong>{' '}
                    agentes cadastrados.
                  </span>
                  {(categoryFilter !== 'all' ||
                    tagFilter !== 'all' ||
                    searchTerm.trim() !== '') && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-2 text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-100"
                      onClick={handleClearFilters}
                    >
                      Limpar filtros
                    </Button>
                  )}
                </div>

                {filteredAgents.length === 0 ? (
                  <div
                    className={`flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-slate-200 bg-white/70 p-10 text-center text-sm dark:border-slate-700 dark:bg-slate-900/40 ${mutedTextClass}`}
                  >
                    <FileWarning className="h-6 w-6" />
                    Nenhum agente encontrado. Ajuste os filtros ou refine a busca.
                  </div>
                ) : (
                  <div className="grid max-h-[520px] gap-4 overflow-y-auto pr-1 md:grid-cols-2 2xl:grid-cols-3">
                    {filteredAgents.map((agent) => (
                      <div
                        key={agent.id}
                        className="flex h-full flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition hover:border-cyan-200 hover:shadow-md dark:border-slate-700 dark:bg-slate-900/60"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex flex-col gap-1">
                            <span className="flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-100">
                              {agent.name}
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-slate-500 hover:text-slate-800 dark:text-slate-300 dark:hover:text-slate-100"
                                onClick={() => handleCopyName(agent.name)}
                                aria-label={`Copiar ${agent.name}`}
                              >
                                <Copy className="h-3.5 w-3.5" />
                              </Button>
                            </span>
                              <span className={`text-xs ${mutedTextClass}`}>
                              {agent.category}
                            </span>
                          </div>
                          <Badge
                            variant="outline"
                            className={`text-[10px] uppercase tracking-wide ${filterBadgeClass}`}
                          >
                            {agent.category}
                          </Badge>
                        </div>
                        <div className="space-y-3 text-sm">
                          <div className="text-slate-700 dark:text-slate-200">
                            <span className="font-semibold">Capacidades:</span>{' '}
                            {agent.capabilities}
                          </div>
                          <div className="text-slate-600 dark:text-slate-300">
                            <span className="font-semibold">Momento de uso:</span>{' '}
                            {agent.usage}
                          </div>
                          <div className={`text-xs ${mutedTextClass}`}>
                            <span className="font-medium text-slate-600 dark:text-slate-300">
                              Exemplo prático:
                            </span>{' '}
                            {agent.example}
                          </div>
                          <div className={`text-xs ${mutedTextClass}`}>
                            <span className="font-medium text-slate-600 dark:text-slate-300">
                              Tipo de saída:
                            </span>{' '}
                            {agent.outputType}
                          </div>
                        </div>
                        {agent.tags.length > 0 && (
                          <div
                            className={`flex flex-wrap gap-1 text-[10px] uppercase tracking-wide ${mutedTextClass}`}
                          >
                            {agent.tags.map((tag) => (
                              <Badge
                                key={`${agent.id}-tag-${tag}`}
                                variant="outline"
                                className={`text-[10px] font-medium ${filterBadgeClass}`}
                              >
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        )}
                        <div className="mt-auto flex flex-wrap gap-2 pt-2">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-slate-600 hover:text-slate-800 dark:text-slate-300 dark:hover:text-slate-100"
                            onClick={() => handleOpenAgent(agent)}
                            aria-label={`Visualizar ${agent.name}`}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CollapsibleCardContent>
          </CollapsibleCard>
        ),
      },
      {
        id: 'agents-table',
        content: (
          <CollapsibleCard
            cardId="agents-table"
            defaultCollapsed={false}
            className={surfaceCardClass}
          >
            <CollapsibleCardHeader>
              <CollapsibleCardTitle>Visão Tabular</CollapsibleCardTitle>
              <CollapsibleCardDescription>
                Mesmos dados filtrados acima, apresentados em formato tabular para comparação rápida.
              </CollapsibleCardDescription>
            </CollapsibleCardHeader>
            <CollapsibleCardContent>
              {filteredAgents.length === 0 ? (
                <div
                  className={`flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-slate-200 bg-white/70 p-10 text-center text-sm dark:border-slate-700 dark:bg-slate-900/40 ${mutedTextClass}`}
                >
                  <FileWarning className="h-6 w-6" />
                  Nenhum agente encontrado com os filtros atuais.
                </div>
              ) : (
                <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
                  <div className="space-y-3 border-b border-slate-200 bg-slate-50 p-4 text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-200">
                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                      <div className="md:col-span-2">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                          <Input
                            value={searchTerm}
                            onChange={(event) => setSearchTerm(event.target.value)}
                            placeholder="Filtrar agentes por texto, categoria ou tag"
                            className="pl-9"
                          />
                        </div>
                      </div>
                      <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                        <SelectTrigger className="w-full">
                          <Filter className="mr-2 h-4 w-4 text-slate-400" />
                          <SelectValue placeholder="Categoria" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todas as categorias</SelectItem>
                          {categories.map((category) => (
                            <SelectItem key={`table-cat-${category}`} value={category}>
                              {category}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select value={tagFilter} onValueChange={setTagFilter}>
                        <SelectTrigger className="w-full">
                          <Filter className="mr-2 h-4 w-4 rotate-90 text-slate-400" />
                          <SelectValue placeholder="Tag" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todas as tags</SelectItem>
                          {tagOptions.map((tag) => (
                            <SelectItem key={`table-tag-${tag}`} value={tag}>
                              {tag}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className={`flex items-center gap-2 text-xs ${mutedTextClass}`}>
                      <span>
                        Exibindo{' '}
                        <strong className="text-slate-700 dark:text-slate-100">
                          {filteredAgents.length}
                        </strong>{' '}
                        de{' '}
                        <strong className="text-slate-700 dark:text-slate-100">
                          {TOTAL_AGENTS}
                        </strong>{' '}
                        agentes.
                      </span>
                      {(categoryFilter !== 'all' ||
                        tagFilter !== 'all' ||
                        searchTerm.trim() !== '') && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="gap-2 text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-100"
                          onClick={handleClearFilters}
                        >
                          Limpar filtros
                        </Button>
                      )}
                    </div>
                  </div>

                  <table className="w-full text-left text-xs text-slate-600 dark:text-slate-200">
                    <thead className="bg-slate-100 uppercase tracking-wide text-[10px] text-slate-500 dark:bg-slate-900/60 dark:text-slate-300">
                      <tr>
                        <th className="cursor-pointer px-4 py-3" onClick={() => handleSort('name')}>
                          <div className="flex items-center gap-2">
                            Agente
                            {renderSortIcon('name')}
                          </div>
                        </th>
                        <th className="cursor-pointer px-4 py-3" onClick={() => handleSort('category')}>
                          <div className="flex items-center gap-2">
                            Categoria
                            {renderSortIcon('category')}
                          </div>
                        </th>
                        <th className="cursor-pointer px-4 py-3" onClick={() => handleSort('capabilities')}>
                          <div className="flex items-center gap-2">
                            Capacidades
                            {renderSortIcon('capabilities')}
                          </div>
                        </th>
                        <th className="cursor-pointer px-4 py-3" onClick={() => handleSort('usage')}>
                          <div className="flex items-center gap-2">
                            Momento de Uso
                            {renderSortIcon('usage')}
                          </div>
                        </th>
                        <th className="cursor-pointer px-4 py-3" onClick={() => handleSort('example')}>
                          <div className="flex items-center gap-2">
                            Exemplo Prático
                            {renderSortIcon('example')}
                          </div>
                        </th>
                        <th className="cursor-pointer px-4 py-3" onClick={() => handleSort('outputType')}>
                          <div className="flex items-center gap-2">
                            Tipo de Saída
                            {renderSortIcon('outputType')}
                          </div>
                        </th>
                        <th className="cursor-pointer px-4 py-3" onClick={() => handleSort('tags')}>
                          <div className="flex items-center gap-2">
                            Tags
                            {renderSortIcon('tags')}
                          </div>
                        </th>
                        <th className="px-4 py-3 text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                      {filteredAgents.map((agent) => (
                        <tr key={`table-${agent.id}`} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                          <td className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-100">
                              <div className="flex items-center gap-2">
                                {agent.name}
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 text-slate-500 hover:text-slate-800 dark:text-slate-300 dark:hover:text-slate-100"
                                  onClick={() => handleCopyName(agent.name)}
                                  aria-label={`Copiar ${agent.name}`}
                                >
                                  <Copy className="h-3.5 w-3.5" />
                                </Button>
                            </div>
                          </td>
                          <td className="px-4 py-3">{agent.category}</td>
                          <td className="px-4 py-3 max-w-[240px] text-slate-600 dark:text-slate-300">
                            {agent.capabilities}
                          </td>
                          <td className="px-4 py-3 max-w-[220px] text-slate-600 dark:text-slate-300">
                            {agent.usage}
                          </td>
                          <td className={`px-4 py-3 max-w-[220px] ${mutedTextClass}`}>
                            {agent.example}
                          </td>
                          <td className={`px-4 py-3 ${mutedTextClass}`}>
                            {agent.outputType}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap gap-1">
                            {agent.tags.map((tag) => (
                              <Badge
                                key={`table-tag-${agent.id}-${tag}`}
                                variant="outline"
                                className={`text-[10px] font-medium ${filterBadgeClass}`}
                              >
                                {tag}
                              </Badge>
                            ))}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 text-slate-600 hover:text-slate-800 dark:text-slate-300 dark:hover:text-slate-100"
                                onClick={() => handleOpenAgent(agent)}
                                aria-label={`Visualizar ${agent.name}`}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
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
    ],
    [
      categories,
      categoryFilter,
      filteredAgents,
      searchTerm,
      tagFilter,
      tagOptions,
      sortField,
      sortDirection,
    ],
  );

  return (
    <>
      <CustomizablePageLayout
        pageId='ai-agents-directory'
        title='AI Agents Directory'
        subtitle='Catálogo dos agentes Claude configurados para o TradingSystem.'
        sections={sections}
        defaultColumns={1}
        leftActions={headerActions}
      />

      <Dialog open={dialogOpen} onOpenChange={handleDialogOpenChange}>
        <DialogContent className="max-w-4xl overflow-hidden p-0">
          <DialogHeader className="border-b border-slate-200 px-6 py-4 dark:border-slate-700">
            <DialogTitle className="flex flex-col gap-1 text-base">
              {selectedAgent?.name ?? 'Agente não selecionado'}
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-[520px] bg-white dark:bg-slate-900">
            {selectedAgent?.fileContent ? (
              <div className="p-6">
                <MarkdownPreview content={selectedAgent.fileContent} className="max-w-none" />
              </div>
            ) : (
              <div
                className={`flex flex-col items-center justify-center gap-2 py-16 text-sm ${mutedTextClass}`}
              >
                <FileWarning className="h-5 w-5" />
                Conteúdo do arquivo indisponível.
              </div>
            )}
          </ScrollArea>
          <DialogFooter className="flex flex-wrap gap-2 border-t border-slate-200 p-4 dark:border-slate-700">
            <Button variant="default" size="sm" onClick={() => handleDialogOpenChange(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
