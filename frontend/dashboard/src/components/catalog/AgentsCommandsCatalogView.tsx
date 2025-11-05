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
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  FileWarning,
  Filter,
  Search,
} from 'lucide-react';

import {
  AI_AGENTS_DIRECTORY,
  type AgentDirectoryEntry,
} from '../../data/aiAgentsDirectory';
import commandsDatabase from '../../data/commands-db.json';

type CommandRecord = (typeof commandsDatabase.commands)[number];

// Tipo unificado que combina Agentes e Comandos
type UnifiedEntry = {
  type: 'agent' | 'command';
  id: string;
  name: string; // name do agente ou command do comando
  category: string;
  description: string; // capabilities do agente ou capacidades do comando
  usage: string; // usage do agente ou momentoIdeal do comando
  example: string; // example do agente ou exemploMomento do comando
  outputType: string; // outputType de ambos (ou tipoSaida do comando)
  tags: string[];
  filePath: string;
  fileContent: string;
  // Campos específicos opcionais
  originalData: AgentDirectoryEntry | CommandRecord;
};

const surfaceCardClass =
  'rounded-lg border border-[color:var(--ts-surface-border)] bg-[color:var(--ts-surface-0)] shadow-[var(--ts-shadow-sm)] transition-shadow hover:shadow-[var(--ts-shadow-lg)]';
const mutedTextClass = 'text-[color:var(--ts-text-muted)]';
const filterBadgeClass =
  'border-[color:var(--ts-accent)] text-[color:var(--ts-accent-strong)]';

type SortField = 'name' | 'type' | 'category' | 'description' | 'usage' | 'tags';
type SortDirection = 'asc' | 'desc';

interface AgentsCommandsCatalogViewProps {
  headerActions?: ReactNode;
}

export default function AgentsCommandsCatalogView({
  headerActions,
}: AgentsCommandsCatalogViewProps = {}): JSX.Element {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'agent' | 'command'>('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [tagFilter, setTagFilter] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<UnifiedEntry | null>(null);
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  // Converter dados de agentes para formato unificado
  const agentsAsUnified: UnifiedEntry[] = useMemo(() => {
    return AI_AGENTS_DIRECTORY.map((agent) => ({
      type: 'agent' as const,
      id: agent.id,
      name: agent.name,
      category: agent.category,
      description: agent.capabilities,
      usage: agent.usage,
      example: agent.example,
      outputType: agent.outputType,
      tags: agent.tags,
      filePath: agent.filePath,
      fileContent: agent.fileContent,
      originalData: agent,
    }));
  }, []);

  // Converter dados de comandos para formato unificado
  const commandsAsUnified: UnifiedEntry[] = useMemo(() => {
    return commandsDatabase.commands.map((cmd) => ({
      type: 'command' as const,
      id: cmd.command,
      name: cmd.command,
      category: cmd.category,
      description: cmd.capacidades,
      usage: cmd.momentoIdeal,
      example: cmd.exemploMomento,
      outputType: cmd.tipoSaida,
      tags: cmd.tags ?? [],
      filePath: cmd.filePath,
      fileContent: cmd.fileContent,
      originalData: cmd,
    }));
  }, []);

  // Combinar ambos os arrays
  const allEntries = useMemo(() => {
    return [...agentsAsUnified, ...commandsAsUnified];
  }, [agentsAsUnified, commandsAsUnified]);

  const categories = useMemo(() => {
    return Array.from(
      new Set(allEntries.map((item) => item.category).filter(Boolean)),
    ).sort();
  }, [allEntries]);

  const tagOptions = useMemo(() => {
    return Array.from(
      new Set(allEntries.flatMap((item) => item.tags ?? [])),
    ).sort();
  }, [allEntries]);

  const filteredEntries = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    let filtered = allEntries;

    // Filtro por tipo (agent ou command)
    if (typeFilter !== 'all') {
      filtered = filtered.filter((item) => item.type === typeFilter);
    }

    // Filtro por categoria
    if (categoryFilter !== 'all') {
      filtered = filtered.filter((item) => item.category === categoryFilter);
    }

    // Filtro por tag
    if (tagFilter !== 'all') {
      filtered = filtered.filter((item) => item.tags.includes(tagFilter));
    }

    // Busca textual
    if (normalizedSearch) {
      filtered = filtered.filter(
        (item) =>
          item.name.toLowerCase().includes(normalizedSearch) ||
          item.category.toLowerCase().includes(normalizedSearch) ||
          item.description.toLowerCase().includes(normalizedSearch) ||
          item.usage.toLowerCase().includes(normalizedSearch) ||
          item.example.toLowerCase().includes(normalizedSearch) ||
          item.tags.some((tag) => tag.toLowerCase().includes(normalizedSearch)),
      );
    }

    // Ordenação
    filtered.sort((a, b) => {
      let valA: string | number = '';
      let valB: string | number = '';

      if (sortField === 'name') {
        valA = a.name;
        valB = b.name;
      } else if (sortField === 'type') {
        valA = a.type;
        valB = b.type;
      } else if (sortField === 'category') {
        valA = a.category;
        valB = b.category;
      } else if (sortField === 'description') {
        valA = a.description;
        valB = b.description;
      } else if (sortField === 'usage') {
        valA = a.usage;
        valB = b.usage;
      } else if (sortField === 'tags') {
        valA = a.tags.join(', ');
        valB = b.tags.join(', ');
      }

      if (typeof valA === 'string' && typeof valB === 'string') {
        valA = valA.toLowerCase();
        valB = valB.toLowerCase();
      }

      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [
    allEntries,
    typeFilter,
    categoryFilter,
    tagFilter,
    searchTerm,
    sortField,
    sortDirection,
  ]);

  const handleSort = useCallback(
    (field: SortField) => {
      if (sortField === field) {
        setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
      } else {
        setSortField(field);
        setSortDirection('asc');
      }
    },
    [sortField],
  );

  const handleOpenEntry = useCallback((entry: UnifiedEntry) => {
    setSelectedEntry(entry);
    setDialogOpen(true);
  }, []);

  const handleCloseDialog = useCallback(() => {
    setDialogOpen(false);
    setSelectedEntry(null);
  }, []);

  const handleClearFilters = useCallback(() => {
    setSearchTerm('');
    setTypeFilter('all');
    setCategoryFilter('all');
    setTagFilter('all');
    setSortField('name');
    setSortDirection('asc');
  }, []);

  const hasActiveFilters =
    searchTerm.trim() !== '' ||
    typeFilter !== 'all' ||
    categoryFilter !== 'all' ||
    tagFilter !== 'all';

  const SortIcon = useCallback(
    (field: SortField) => {
      if (sortField !== field) {
        return <ArrowUpDown className="ml-2 h-4 w-4 opacity-50" />;
      }
      return sortDirection === 'asc' ? (
        <ArrowUp className="ml-2 h-4 w-4" />
      ) : (
        <ArrowDown className="ml-2 h-4 w-4" />
      );
    },
    [sortField, sortDirection],
  );

  const sections = useMemo(
    () => [
      {
        id: 'unified-catalog',
        content: (
          <CollapsibleCard
            cardId="unified-catalog"
            defaultCollapsed={false}
            className={surfaceCardClass}
          >
            <CollapsibleCardHeader>
              <div className="flex items-center gap-3">
                <CollapsibleCardTitle>Catálogo Unificado - Agents & Commands</CollapsibleCardTitle>
                <Badge variant="secondary">
                  {filteredEntries.length} de {allEntries.length}
                </Badge>
              </div>
              <CollapsibleCardDescription>
                Consulte o diretório unificado de agentes e comandos configurados para o TradingSystem, com filtros por tipo, domínio, tags e acesso rápido ao arquivo Markdown original.
              </CollapsibleCardDescription>
            </CollapsibleCardHeader>
            <CollapsibleCardContent>
              <div className="space-y-4">
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <div className="md:col-span-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--ts-text-muted)]" />
                      <Input
                        value={searchTerm}
                        onChange={(event) => setSearchTerm(event.target.value)}
                        placeholder="Buscar por agente, comando, capacidade, momento de uso ou tag"
                        data-testid="unified-search-input"
                        className="pl-9"
                      />
                    </div>
                  </div>
                  <Select
                    value={typeFilter}
                    onValueChange={(value) =>
                      setTypeFilter(value as 'all' | 'agent' | 'command')
                    }
                  >
                    <SelectTrigger
                      className="w-full"
                      data-testid="unified-type-filter"
                    >
                      <Filter className="mr-2 h-4 w-4 text-[color:var(--ts-text-muted)]" />
                      <SelectValue placeholder="Tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os tipos</SelectItem>
                      <SelectItem value="agent">Agents</SelectItem>
                      <SelectItem value="command">Commands</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger
                      className="w-full"
                      data-testid="unified-category-filter"
                    >
                      <Filter className="mr-2 h-4 w-4 text-[color:var(--ts-text-muted)]" />
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
                    <SelectTrigger
                      className="w-full"
                      data-testid="unified-tag-filter"
                    >
                      <Filter className="mr-2 h-4 w-4 rotate-90 text-[color:var(--ts-text-muted)]" />
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
                  <strong className="text-[color:var(--ts-text-secondary)]">
                    {filteredEntries.length}
                  </strong>{' '}
                  de{' '}
                  <strong className="text-[color:var(--ts-text-secondary)]">
                    {allEntries.length}
                  </strong>{' '}
                  itens cadastrados.
                </span>
                {hasActiveFilters && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-2 text-[color:var(--ts-text-secondary)] hover:text-[color:var(--ts-text-primary)]"
                    onClick={handleClearFilters}
                  >
                    Limpar filtros
                  </Button>
                )}
              </div>

              {filteredEntries.length === 0 ? (
                <div
                  data-testid="unified-empty-state"
                  className={`flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-[color:var(--ts-surface-border)] bg-[color:var(--ts-surface-1)] p-10 text-center text-sm ${mutedTextClass}`}
                >
                  <FileWarning className="h-6 w-6" />
                  Nenhum item encontrado. Ajuste os filtros ou refine a busca.
                </div>
              ) : (
                <div
                  className="grid max-h-[520px] gap-4 overflow-y-auto pr-1 md:grid-cols-2 2xl:grid-cols-3"
                  data-testid="unified-card-grid"
                >
                  {filteredEntries.map((entry) => {
                    const commandExamples =
                      entry.type === 'command' &&
                      (entry.originalData as CommandRecord).exemplos
                        ? (entry.originalData as CommandRecord).exemplos
                        : [];

                    return (
                      <div
                        key={`${entry.type}-${entry.id}`}
                        className="flex h-full cursor-pointer flex-col gap-3 rounded-lg border border-[color:var(--ts-surface-border)] bg-[color:var(--ts-surface-0)] p-4 shadow-[var(--ts-shadow-sm)] transition-all hover:border-[color:var(--ts-accent)] hover:shadow-[var(--ts-shadow-lg)]"
                        onClick={() => handleOpenEntry(entry)}
                        data-testid="unified-card"
                        data-entry-type={entry.type}
                        data-entry-id={entry.id}
                        data-entry-category={entry.category}
                        data-entry-tags={entry.tags.join(',')}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex flex-col gap-1">
                            <span className="flex items-center gap-2 text-sm font-semibold text-[color:var(--ts-text-primary)]">
                              {entry.name}
                            </span>
                          </div>
                          <Badge
                            variant="outline"
                            className={`text-[10px] uppercase tracking-wide ${filterBadgeClass}`}
                          >
                            {entry.type === 'agent' ? 'Agent' : 'Command'}
                          </Badge>
                        </div>
                        <div className="space-y-3 text-sm">
                          <div className="text-[color:var(--ts-text-secondary)]">
                            <span className="font-semibold">Categoria:</span>{' '}
                            {entry.category}
                          </div>
                          <div className="text-[color:var(--ts-text-secondary)]">
                            <span className="font-semibold">Capacidades:</span>{' '}
                            {entry.description}
                          </div>
                          <div className="text-[color:var(--ts-text-secondary)]">
                            <span className="font-semibold">Momento ideal:</span>{' '}
                            {entry.usage}
                          </div>
                          <div className="text-[color:var(--ts-text-secondary)]">
                            <span className="font-semibold">Exemplo prático:</span>{' '}
                            {entry.example}
                          </div>
                          <div className="text-[color:var(--ts-text-secondary)]">
                            <span className="font-semibold">Tipo de saída:</span>{' '}
                            {entry.outputType}
                          </div>
                          {commandExamples.length > 0 && (
                            <div className="space-y-1">
                              <span className="text-xs font-semibold text-[color:var(--ts-text-secondary)]">
                                Exemplos:
                              </span>
                              <div className="flex flex-col gap-1">
                                {commandExamples.slice(0, 2).map((ex, idx) => (
                                  <code
                                    key={idx}
                                    className="rounded bg-[color:var(--ts-surface-1)] px-2 py-1 text-xs"
                                  >
                                    {ex}
                                  </code>
                                ))}
                                {commandExamples.length > 2 && (
                                  <span className="text-xs text-[color:var(--ts-text-muted)]">
                                    +{commandExamples.length - 2} mais
                                  </span>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="mt-auto border-t border-[color:var(--ts-surface-border)] pt-3">
                          <div className="flex flex-wrap gap-2 text-xs text-[color:var(--ts-text-muted)]">
                            {entry.tags.map((tag, idx) => (
                              <span key={tag}>
                                {tag}
                                {idx < entry.tags.length - 1 && ','}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              </div>
            </CollapsibleCardContent>
          </CollapsibleCard>
        ),
      },
    ],
    [
      filteredEntries,
      allEntries.length,
      searchTerm,
      typeFilter,
      categoryFilter,
      tagFilter,
      categories,
      tagOptions,
      hasActiveFilters,
      handleSort,
      handleClearFilters,
      handleOpenEntry,
      SortIcon,
    ],
  );

  return (
    <>
      <CustomizablePageLayout
        pageId="agents-commands-unified"
        title="Agents & Commands - Catálogo Unificado"
        subtitle="Busca e filtragem unificada de agentes e comandos do TradingSystem."
        sections={sections}
        defaultColumns={1}
        leftActions={headerActions}
      />

      <Dialog open={dialogOpen} onOpenChange={handleCloseDialog}>
        <DialogContent className="max-w-4xl overflow-hidden p-0">
          <DialogHeader className="border-b border-[color:var(--ts-surface-border)] px-6 py-4">
            <DialogTitle className="flex items-center gap-2 text-base">
              {selectedEntry?.name ?? 'Entrada não selecionada'}
              {selectedEntry && (
                <Badge
                  variant={
                    selectedEntry.type === 'agent' ? 'default' : 'secondary'
                  }
                >
                  {selectedEntry.type === 'agent' ? 'Agent' : 'Command'}
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-[520px] bg-[color:var(--ts-surface-0)]">
            {selectedEntry?.fileContent ? (
              <div className="p-6">
                <MarkdownPreview
                  content={selectedEntry.fileContent}
                  className="max-w-none"
                />
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
          <DialogFooter className="flex flex-wrap gap-2 border-t border-[color:var(--ts-surface-border)] p-4">
            <Button
              variant="default"
              size="sm"
              onClick={() => handleCloseDialog()}
            >
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
