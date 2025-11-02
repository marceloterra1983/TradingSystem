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
import { Dialog, DialogContent, DialogFooter } from '../ui/dialog';
import { ScrollArea } from '../ui/scroll-area';
import { MarkdownPreview } from '../ui/MarkdownPreview';
import { useToast } from '../../hooks/useToast';
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Clipboard,
  Copy,
  Download,
  FileText,
  FileWarning,
  Filter,
  Search,
} from 'lucide-react';

import commandsDatabase from '../../data/commands-db.json';

type CommandsDatabase = typeof commandsDatabase;
type CommandRecord = CommandsDatabase['commands'][number];

const ALL_COMMANDS = commandsDatabase.commands;
const TOTAL_COMMANDS = ALL_COMMANDS.length;

const surfaceCardClass =
  'rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900/60';
const mutedTextClass = 'text-slate-500 dark:text-slate-400';
const filterBadgeClass =
  'border-cyan-300 text-cyan-700 dark:border-cyan-700 dark:text-cyan-300';

type SortField =
  | 'command'
  | 'category'
  | 'capacidades'
  | 'momentoIdeal'
  | 'exemploMomento'
  | 'tipoSaida'
  | 'tags'
  | 'exemplos';

type SortDirection = 'asc' | 'desc';

interface CommandsCatalogViewProps {
  headerActions?: ReactNode;
}

export default function CommandsCatalogView({
  headerActions,
}: CommandsCatalogViewProps = {}): JSX.Element {
  const toast = useToast();

  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [tagFilter, setTagFilter] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedCommand, setSelectedCommand] = useState<CommandRecord | null>(
    null,
  );
  const [sortField, setSortField] = useState<SortField>('command');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const categories = useMemo(() => {
    return Array.from(
      new Set(
        ALL_COMMANDS.map((item) => item.category).filter(
          (category) => category && category !== 'Observacoes Finais',
        ),
      ),
    ).sort();
  }, []);

  const tagOptions = useMemo(() => {
    return Array.from(
      new Set(ALL_COMMANDS.flatMap((item) => item.tags ?? [])),
    ).sort();
  }, []);

  const filteredCommands = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    const matchesSearch = (item: CommandRecord) => {
      if (!normalizedSearch) {
        return true;
      }
      const haystack = [
        item.command,
        item.label,
        item.capacidades,
        item.momentoIdeal,
        item.exemploMomento,
        item.tipoSaida,
        item.exemplos.join(' '),
        (item.tags ?? []).join(' '),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return haystack.includes(normalizedSearch);
    };

    const matchesCategory = (command: CommandRecord) =>
      categoryFilter === 'all' ||
      command.category === categoryFilter ||
      (!command.category && categoryFilter === 'sem-categoria');

    const matchesTag = (command: CommandRecord) =>
      tagFilter === 'all' || (command.tags ?? []).includes(tagFilter);

    const toComparable = (command: CommandRecord, field: SortField) => {
      switch (field) {
        case 'command':
          return command.command ?? '';
        case 'category':
          return command.category ?? '';
        case 'capacidades':
          return command.capacidades ?? '';
        case 'momentoIdeal':
          return command.momentoIdeal ?? '';
        case 'exemploMomento':
          return command.exemploMomento ?? '';
        case 'tipoSaida':
          return command.tipoSaida ?? '';
        case 'tags':
          return (command.tags ?? []).join(', ');
        case 'exemplos':
          return command.exemplos.join(', ');
        default:
          return '';
      }
    };

    const filtered = ALL_COMMANDS.filter(
      (command) =>
        command.category !== 'Observacoes Finais' &&
        matchesSearch(command) &&
        matchesCategory(command) &&
        matchesTag(command),
    );

    const sorted = filtered.slice().sort((a, b) => {
      const aValue = toComparable(a, sortField).toLowerCase();
      const bValue = toComparable(b, sortField).toLowerCase();
      if (aValue < bValue) {
        return sortDirection === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortDirection === 'asc' ? 1 : -1;
      }
      // fallback secondary sort by command name
      const aCommand = a.command.toLowerCase();
      const bCommand = b.command.toLowerCase();
      if (aCommand < bCommand) {
        return -1;
      }
      if (aCommand > bCommand) {
        return 1;
      }
      return 0;
    });

    return sorted;
  }, [categoryFilter, tagFilter, searchTerm, sortField, sortDirection]);

  const handleOpenCommand = (command: CommandRecord) => {
    setSelectedCommand(command);
    setDialogOpen(true);
  };

  const handleCloseDialog = (open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      setSelectedCommand(null);
    }
  };

  const handleClearFilters = useCallback(() => {
    setCategoryFilter('all');
    setTagFilter('all');
    setSearchTerm('');
  }, []);

  const copyText = useCallback(
    async (
      text: string | undefined,
      successMessage: string,
      emptyMessage: string,
    ) => {
      if (!text) {
        toast.error(emptyMessage);
        return;
      }

      if (!navigator?.clipboard) {
        toast.error('Clipboard API indisponível neste navegador.');
        return;
      }

      try {
        await navigator.clipboard.writeText(text);
        toast.success(successMessage);
      } catch (error) {
        console.error('Failed to copy text', error);
        toast.error('Não foi possível copiar o conteúdo.');
      }
    },
    [toast],
  );

  const handleCopyPath = useCallback(
    (command: CommandRecord) =>
      copyText(
        command.filePath,
        'Caminho copiado para a área de transferência.',
        'Arquivo não localizado no diretório de comandos.',
      ),
    [copyText],
  );

  const handleCopyCommand = useCallback(
    (command: CommandRecord) =>
      copyText(
        command.command,
        'Comando copiado para a área de transferência.',
        'Comando inválido para copiar.',
      ),
    [copyText],
  );

  const handleCopyExample = useCallback(
    (example: string) =>
      copyText(
        example,
        'Exemplo copiado para a área de transferência.',
        'Exemplo inválido para copiar.',
      ),
    [copyText],
  );

  const handleDownload = (command: CommandRecord) => {
    if (!command.fileContent || !command.fileName) {
      toast.error('Conteúdo do comando não disponível para download.');
      return;
    }

    const blob = new Blob([command.fileContent], {
      type: 'text/markdown;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = command.fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success('Download do arquivo iniciado.');
  };

  const handleSort = (field: SortField) => {
    setSortField((prevField) => {
      if (prevField === field) {
        setSortDirection((prevDirection) =>
          prevDirection === 'asc' ? 'desc' : 'asc',
        );
        return prevField;
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
        id: 'commands-dashboard',
        content: (
          <CollapsibleCard
            cardId="commands-dashboard"
            defaultCollapsed={false}
            className={surfaceCardClass}
          >
            <CollapsibleCardHeader>
              <div className="flex items-center gap-3">
                <CollapsibleCardTitle>
                  Catálogo de Comandos Claude
                </CollapsibleCardTitle>
                <Badge variant="secondary">
                  {filteredCommands.length} de {TOTAL_COMMANDS}
                </Badge>
              </div>
              <CollapsibleCardDescription>
                Consulte parâmetros oficiais dos comandos customizados do
                TradingSystem, filtre por categoria ou tag e visualize o arquivo
                Markdown original em um popup dedicado.
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
                        placeholder="Buscar por comando, capacidade, exemplo ou tag"
                        className="pl-9"
                      />
                    </div>
                  </div>
                  <Select
                    value={categoryFilter}
                    onValueChange={setCategoryFilter}
                  >
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
                      {filteredCommands.length}
                    </strong>{' '}
                    de{' '}
                    <strong className="text-slate-700 dark:text-slate-200">
                      {TOTAL_COMMANDS}
                    </strong>{' '}
                    comandos documentados.
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

                {filteredCommands.length === 0 ? (
                  <div
                    className={`flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-slate-200 bg-white/70 p-10 text-center text-sm dark:border-slate-700 dark:bg-slate-900/40 ${mutedTextClass}`}
                  >
                    <FileWarning className="h-6 w-6" />
                    Nenhum comando encontrado. Ajuste os filtros ou refine a
                    busca.
                  </div>
                ) : (
                  <div className="grid max-h-[520px] gap-4 overflow-y-auto pr-1 md:grid-cols-2 2xl:grid-cols-3">
                    {filteredCommands.map((command) => (
                      <div
                        key={command.command}
                        className="flex h-full flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition hover:border-cyan-200 hover:shadow-md dark:border-slate-700 dark:bg-slate-900/60"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <code className="rounded bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-900 dark:text-slate-200">
                              {command.command}
                            </code>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-100"
                              onClick={() => handleCopyCommand(command)}
                              aria-label={`Copiar ${command.command}`}
                            >
                              <Copy className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                          <Badge
                            variant="outline"
                            className={`text-xs font-medium ${filterBadgeClass}`}
                          >
                            {command.category}
                          </Badge>
                        </div>
                        {command.capacidades && (
                          <div className="text-sm text-slate-700 dark:text-slate-200">
                            <span className="font-semibold">Capacidades:</span>{' '}
                            {command.capacidades}
                          </div>
                        )}
                        {command.momentoIdeal && (
                          <div className="text-sm text-slate-600 dark:text-slate-300">
                            <span className="font-semibold">
                              Momento ideal:
                            </span>{' '}
                            {command.momentoIdeal}
                          </div>
                        )}
                        {command.exemploMomento && (
                          <div className={`text-xs ${mutedTextClass}`}>
                            <span className="font-medium text-slate-600 dark:text-slate-300">
                              Exemplo prático:
                            </span>{' '}
                            {command.exemploMomento}
                          </div>
                        )}
                        {command.tipoSaida && (
                          <div className={`text-xs ${mutedTextClass}`}>
                            <span className="font-medium text-slate-600 dark:text-slate-300">
                              Tipo de saída:
                            </span>{' '}
                            {command.tipoSaida}
                          </div>
                        )}
                        {command.exemplos.length > 0 && (
                          <div className="flex flex-wrap gap-2 pt-1">
                            {command.exemplos.map((example) => (
                              <div
                                key={example}
                                className="flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2 py-1 dark:border-slate-700 dark:bg-slate-900/40"
                              >
                                <Badge variant="secondary" className="text-xs">
                                  {example}
                                </Badge>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-100"
                                  onClick={() => handleCopyExample(example)}
                                  aria-label={`Copiar exemplo ${example}`}
                                >
                                  <Copy className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                        {command.tags?.length > 0 && (
                          <div
                            className={`flex flex-wrap gap-1 text-[10px] uppercase tracking-wide ${mutedTextClass}`}
                          >
                            {command.tags.map((tag) => (
                              <Badge
                                key={`${command.command}-tag-${tag}`}
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
                            variant="primary"
                            className="h-9 w-9"
                            onClick={() => handleOpenCommand(command)}
                            aria-label={`Visualizar ${command.command}`}
                          >
                            <FileText className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-9 w-9 text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-100"
                            onClick={() => handleCopyPath(command)}
                            aria-label={`Copiar caminho ${command.command}`}
                          >
                            <Clipboard className="h-4 w-4" />
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
        id: 'commands-table',
        content: (
          <CollapsibleCard
            cardId="commands-table"
            defaultCollapsed
            className={surfaceCardClass}
          >
            <CollapsibleCardHeader>
              <CollapsibleCardTitle>Visualização em Tabela</CollapsibleCardTitle>
              <CollapsibleCardDescription>
                Mesmos dados filtrados acima, apresentados em formato tabular para comparação rápida.
              </CollapsibleCardDescription>
            </CollapsibleCardHeader>
            <CollapsibleCardContent>
              {filteredCommands.length === 0 ? (
                <div
                  className={`flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-slate-200 bg-white/70 p-10 text-center text-sm dark:border-slate-700 dark:bg-slate-900/40 ${mutedTextClass}`}
                >
                  <FileWarning className="h-6 w-6" />
                  Nenhum comando encontrado com os filtros atuais.
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
                            placeholder="Filtrar comandos por texto, categoria ou tag"
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
                          {filteredCommands.length}
                        </strong>{' '}
                        de{' '}
                        <strong className="text-slate-700 dark:text-slate-100">
                          {TOTAL_COMMANDS}
                        </strong>{' '}
                        comandos.
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
                  <div className="max-h-[420px] overflow-y-auto">
                    <table className="min-w-full divide-y divide-slate-200 bg-white text-sm dark:divide-slate-700 dark:bg-slate-900/40">
                      <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-600 dark:bg-slate-900/60 dark:text-slate-300">
                        <tr>
                        <th scope="col" className="px-4 py-3 text-left">
                          <button
                            type="button"
                            onClick={() => handleSort('command')}
                            className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
                          >
                            Comando
                            {renderSortIcon('command')}
                          </button>
                        </th>
                        <th scope="col" className="px-4 py-3 text-left">
                          <button
                            type="button"
                            onClick={() => handleSort('category')}
                            className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
                          >
                            Categoria
                            {renderSortIcon('category')}
                          </button>
                        </th>
                        <th scope="col" className="px-4 py-3 text-left">
                          <button
                            type="button"
                            onClick={() => handleSort('capacidades')}
                            className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
                          >
                            Capacidades
                            {renderSortIcon('capacidades')}
                          </button>
                        </th>
                        <th scope="col" className="px-4 py-3 text-left">
                          <button
                            type="button"
                            onClick={() => handleSort('momentoIdeal')}
                            className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
                          >
                            Momento ideal
                            {renderSortIcon('momentoIdeal')}
                          </button>
                        </th>
                        <th scope="col" className="px-4 py-3 text-left">
                          <button
                            type="button"
                            onClick={() => handleSort('exemploMomento')}
                            className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
                          >
                            Exemplo prático
                            {renderSortIcon('exemploMomento')}
                          </button>
                        </th>
                        <th scope="col" className="px-4 py-3 text-left">
                          <button
                            type="button"
                            onClick={() => handleSort('tipoSaida')}
                            className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
                          >
                            Tipo de saída
                            {renderSortIcon('tipoSaida')}
                          </button>
                        </th>
                        <th scope="col" className="px-4 py-3 text-left">
                          <button
                            type="button"
                            onClick={() => handleSort('tags')}
                            className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
                          >
                            Tags
                            {renderSortIcon('tags')}
                          </button>
                        </th>
                        <th scope="col" className="px-4 py-3 text-left">
                          <button
                            type="button"
                            onClick={() => handleSort('exemplos')}
                            className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
                          >
                            Exemplos
                            {renderSortIcon('exemplos')}
                          </button>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-slate-700 dark:divide-slate-800 dark:text-slate-200">
                      {filteredCommands.map((command) => (
                        <tr key={`table-${command.command}`} className="hover:bg-slate-50 dark:hover:bg-slate-900/60">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <code className="rounded bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-900 dark:text-slate-200">
                                {command.command}
                              </code>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-100"
                                onClick={() => handleOpenCommand(command)}
                                aria-label={`Visualizar ${command.command}`}
                              >
                                <FileText className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-100"
                                onClick={() => handleCopyCommand(command)}
                                aria-label={`Copiar ${command.command}`}
                              >
                                <Copy className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </td>
                          <td className="px-4 py-3 align-top">
                            <Badge
                              variant="outline"
                              className={`text-xs font-medium ${filterBadgeClass}`}
                            >
                              {command.category}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 align-top">
                            <span className="block text-xs text-slate-600 dark:text-slate-300">
                              {command.capacidades ?? '—'}
                            </span>
                          </td>
                          <td className="px-4 py-3 align-top">
                            <span className="block text-xs text-slate-600 dark:text-slate-300">
                              {command.momentoIdeal ?? '—'}
                            </span>
                          </td>
                          <td className="px-4 py-3 align-top">
                            <span className="block text-xs text-slate-600 dark:text-slate-300">
                              {command.exemploMomento ?? '—'}
                            </span>
                          </td>
                          <td className="px-4 py-3 align-top">
                            <span className="block text-xs text-slate-600 dark:text-slate-300">
                              {command.tipoSaida ?? '—'}
                            </span>
                          </td>
                          <td className="px-4 py-3 align-top">
                            <div
                              className={`flex flex-wrap gap-1 text-[10px] uppercase tracking-wide ${mutedTextClass}`}
                            >
                              {(command.tags ?? []).map((tag) => (
                                <Badge
                                  key={`${command.command}-table-tag-${tag}`}
                                  variant="outline"
                                  className={`text-[10px] font-medium ${filterBadgeClass}`}
                                >
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          </td>
                          <td className="px-4 py-3 align-top">
                            <div className="flex flex-wrap gap-2 text-xs text-slate-600 dark:text-slate-300">
                              {command.exemplos.length > 0
                                ? command.exemplos.map((example) => (
                                    <div
                                      key={`${command.command}-table-example-${example}`}
                                      className="flex items-center gap-1 rounded border border-slate-200 bg-slate-50 px-2 py-0.5 dark:border-slate-700 dark:bg-slate-900/40"
                                    >
                                      <span>{example}</span>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-5 w-5 text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-100"
                                        onClick={() => handleCopyExample(example)}
                                        aria-label={`Copiar exemplo ${example}`}
                                      >
                                        <Copy className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  ))
                                : '—'}
                            </div>
                          </td>
                        </tr>
                      ))}
                      </tbody>
                    </table>
                  </div>
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
      filteredCommands,
      handleClearFilters,
      handleCopyCommand,
      handleCopyPath,
      handleOpenCommand,
      handleCopyExample,
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
        pageId="commands-toolbox"
        title="Claude Commands Toolbox"
        subtitle="Catálogo oficial dos comandos personalizados com filtros, exemplos e acesso direto aos arquivos Markdown."
        sections={sections}
        defaultColumns={1}
        leftActions={headerActions}
      />

      <Dialog open={dialogOpen} onOpenChange={handleCloseDialog}>
        <DialogContent className="max-w-4xl overflow-hidden p-0">
          <ScrollArea className="h-[520px] bg-white dark:bg-slate-900">
            {selectedCommand?.fileContent ? (
              <div className="p-6">
                <MarkdownPreview
                  content={selectedCommand.fileContent}
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

          <DialogFooter className="flex flex-wrap gap-2 border-t border-slate-200 p-4 dark:border-slate-700">
            {selectedCommand?.fileName && (
              <Button
                size="icon"
                variant="outline"
                className="h-9 w-9"
                onClick={() => handleDownload(selectedCommand)}
                aria-label="Baixar .md"
              >
                <Download className="h-4 w-4" />
              </Button>
            )}
            {selectedCommand?.filePath && (
              <Button
                size="icon"
                variant="ghost"
                className="h-9 w-9 text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-100"
                onClick={() => handleCopyPath(selectedCommand)}
                aria-label="Copiar caminho"
              >
                <Clipboard className="h-4 w-4" />
              </Button>
            )}
            <Button
              variant="default"
              size="sm"
              onClick={() => handleCloseDialog(false)}
            >
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
