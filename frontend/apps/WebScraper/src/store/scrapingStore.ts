import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  ScrapeResult,
  CrawlResult,
  Template,
  ScrapeOptions,
  CrawlOptions,
  ScrapeFormat
} from '../types';

type ScrapeType = 'single' | 'crawl';
type FormatSelections = Record<ScrapeType, ScrapeFormat[]>;

type ScrapingOptionsSnapshot = {
  url: string;
  formats: ScrapeFormat[];
  onlyMainContent: boolean;
  waitFor?: number;
  timeout?: number;
  includeTags?: string[];
  excludeTags?: string[];
  limit?: number;
  maxDepth?: number;
  includePaths?: string[];
  excludePaths?: string[];
};

type ScrapingDataState = {
  url: string;
  scrapeType: ScrapeType;
  formats: ScrapeFormat[];
  formatSelections: FormatSelections;
  onlyMainContent: boolean;
  waitFor?: number;
  timeout?: number;
  limit?: number;
  maxDepth?: number;
  includePaths?: string[];
  excludePaths?: string[];
  includeTags?: string[];
  excludeTags?: string[];
  selectedTemplate?: Template | null;
  lastResult: ScrapeResult | CrawlResult | null;
  templates: Template[];
  errors: Record<string, string>;
};

interface ScrapingState extends ScrapingDataState {
  readonly options: ScrapingOptionsSnapshot;
  setUrl: (url: string) => void;
  setScrapeType: (type: ScrapeType) => void;
  toggleFormat: (format: ScrapeFormat) => void;
  setOptions: (options: Partial<ScrapeOptions & CrawlOptions>) => void;
  applyTemplate: (template: Template) => void;
  setLastResult: (result: ScrapeResult | CrawlResult | null) => void;
  setTemplates: (templates: Template[]) => void;
  setErrors: (errors: Record<string, string>) => void;
  clearError: (key: string) => void;
  reset: () => void;
}

const createDefaultState = (): ScrapingDataState => ({
  url: '',
  scrapeType: 'single',
  formats: ['markdown'],
  formatSelections: {
    single: ['markdown'],
    crawl: ['markdown', 'links']
  },
  onlyMainContent: true,
  waitFor: 0,
  timeout: 15_000,
  limit: 25,
  maxDepth: 2,
  includePaths: [],
  excludePaths: [],
  includeTags: [],
  excludeTags: [],
  selectedTemplate: null,
  lastResult: null,
  templates: [],
  errors: {}
});

export const useScrapingStore = create<ScrapingState>()(
  persist(
    (set, get) => ({
      ...createDefaultState(),
      get options() {
        const state = get();
        const base: ScrapingOptionsSnapshot = {
          url: state.url,
          formats: state.formats,
          onlyMainContent: state.onlyMainContent,
          waitFor: state.waitFor,
          timeout: state.timeout,
          includeTags: state.includeTags,
          excludeTags: state.excludeTags
        };

        if (state.scrapeType === 'crawl') {
          base.limit = state.limit;
          base.maxDepth = state.maxDepth;
          base.includePaths = state.includePaths;
          base.excludePaths = state.excludePaths;
        }

        return base;
      },
      setUrl: url => set({ url }),
      setScrapeType: scrapeType => {
        const current = get();
        if (current.scrapeType === scrapeType) {
          return;
        }

        const nextSelections: FormatSelections = {
          ...current.formatSelections,
          [current.scrapeType]: current.formats
        };

        const rememberedFormats =
          nextSelections[scrapeType] ?? (scrapeType === 'crawl' ? ['markdown', 'links'] : ['markdown']);

        set({
          scrapeType,
          formats: rememberedFormats,
          formatSelections: {
            ...nextSelections,
            [scrapeType]: rememberedFormats
          }
        });
      },
      toggleFormat: format =>
        set(state => {
          const isSelected = state.formats.includes(format);
          const nextFormats = isSelected
            ? state.formats.filter(item => item !== format)
            : [...state.formats, format];

          return {
            formats: nextFormats,
            formatSelections: {
              ...state.formatSelections,
              [state.scrapeType]: nextFormats
            }
          };
        }),
      setOptions: options =>
        set(state => {
          const partial: Partial<ScrapingState> = {};

          if ('onlyMainContent' in options) {
            partial.onlyMainContent = options.onlyMainContent ?? true;
          }
          if ('waitFor' in options) {
            partial.waitFor = options.waitFor;
          }
          if ('timeout' in options) {
            partial.timeout = options.timeout;
          }
          if ('limit' in options) {
            partial.limit = options.limit;
          }
          if ('maxDepth' in options) {
            partial.maxDepth = options.maxDepth;
          }
          if ('includePaths' in options) {
            partial.includePaths = options.includePaths;
          }
          if ('excludePaths' in options) {
            partial.excludePaths = options.excludePaths;
          }
          if ('includeTags' in options) {
            partial.includeTags = options.includeTags;
          }
          if ('excludeTags' in options) {
            partial.excludeTags = options.excludeTags;
          }
          if (Array.isArray(options.formats) && options.formats.length > 0) {
            partial.formats = options.formats;
            partial.formatSelections = {
              ...state.formatSelections,
              [state.scrapeType]: options.formats
            };
          }

          return partial;
        }),
      applyTemplate: template =>
        set(state => {
          const templateFormats = template.options.formats ?? ['markdown'];
          return {
            selectedTemplate: template,
            url: template.options.url ?? '',
            formats: templateFormats,
            formatSelections: {
              ...state.formatSelections,
              [state.scrapeType]: templateFormats
            },
            onlyMainContent: template.options.onlyMainContent ?? true,
            waitFor: template.options.waitFor,
            timeout: template.options.timeout,
            includeTags: template.options.includeTags ?? [],
            excludeTags: template.options.excludeTags ?? []
          };
        }),
      setLastResult: result => set({ lastResult: result }),
      setTemplates: templates => set({ templates }),
      setErrors: errors => set({ errors }),
      clearError: key =>
        set(state => {
          if (!state.errors || !(key in state.errors)) {
            return {};
          }
          const { [key]: _removed, ...rest } = state.errors;
          return { errors: rest };
        }),
      reset: () => set(() => ({ ...createDefaultState() }))
    }),
    {
      name: 'webscraper-form-state',
      partialize: state => ({
        url: state.url,
        scrapeType: state.scrapeType,
        formats: state.formats,
        formatSelections: state.formatSelections,
        onlyMainContent: state.onlyMainContent,
        waitFor: state.waitFor,
        timeout: state.timeout,
        limit: state.limit,
        maxDepth: state.maxDepth,
        includePaths: state.includePaths,
        excludePaths: state.excludePaths,
        includeTags: state.includeTags,
        excludeTags: state.excludeTags,
        selectedTemplate: state.selectedTemplate
      })
    }
  )
);
