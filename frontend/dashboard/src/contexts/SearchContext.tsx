import React, {
  createContext,
  useContext,
  useReducer,
  useCallback,
} from "react";

interface SearchResult {
  content: string;
  relevance: number;
  metadata: {
    source: string;
    title?: string;
    type?: string;
    lastUpdated?: string;
  };
}

interface SearchState {
  query: string;
  results: SearchResult[];
  isLoading: boolean;
  error: string | null;
  selectedResult: SearchResult | null;
}

type SearchAction =
  | { type: "SET_QUERY"; payload: string }
  | { type: "SET_RESULTS"; payload: SearchResult[] }
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "SET_ERROR"; payload: string | null }
  | { type: "SELECT_RESULT"; payload: SearchResult | null };

const initialState: SearchState = {
  query: "",
  results: [],
  isLoading: false,
  error: null,
  selectedResult: null,
};

const SearchContext = createContext<{
  state: SearchState;
  dispatch: React.Dispatch<SearchAction>;
  search: (query: string) => Promise<void>;
  clearSearch: () => void;
  selectResult: (result: SearchResult | null) => void;
} | null>(null);

const searchReducer = (
  state: SearchState,
  action: SearchAction,
): SearchState => {
  switch (action.type) {
    case "SET_QUERY":
      return { ...state, query: action.payload };
    case "SET_RESULTS":
      return { ...state, results: action.payload };
    case "SET_LOADING":
      return { ...state, isLoading: action.payload };
    case "SET_ERROR":
      return { ...state, error: action.payload };
    case "SELECT_RESULT":
      return { ...state, selectedResult: action.payload };
    default:
      return state;
  }
};

export const SearchProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [state, dispatch] = useReducer(searchReducer, initialState);

  const search = useCallback(async (query: string) => {
    try {
      dispatch({ type: "SET_QUERY", payload: query });
      dispatch({ type: "SET_LOADING", payload: true });
      dispatch({ type: "SET_ERROR", payload: null });

      const response = await fetch("/api/v1/search", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query }),
      });

      if (!response.ok) {
        throw new Error("Search failed");
      }

      const results = await response.json();
      dispatch({ type: "SET_RESULTS", payload: results });
    } catch (error) {
      dispatch({
        type: "SET_ERROR",
        payload: error instanceof Error ? error.message : "Search failed",
      });
    } finally {
      dispatch({ type: "SET_LOADING", payload: false });
    }
  }, []);

  const clearSearch = useCallback(() => {
    dispatch({ type: "SET_QUERY", payload: "" });
    dispatch({ type: "SET_RESULTS", payload: [] });
    dispatch({ type: "SET_ERROR", payload: null });
    dispatch({ type: "SELECT_RESULT", payload: null });
  }, []);

  const selectResult = useCallback((result: SearchResult | null) => {
    dispatch({ type: "SELECT_RESULT", payload: result });
  }, []);

  return (
    <SearchContext.Provider
      value={{ state, dispatch, search, clearSearch, selectResult }}
    >
      {children}
    </SearchContext.Provider>
  );
};

export const useSearch = () => {
  const context = useContext(SearchContext);
  if (!context) {
    throw new Error("useSearch must be used within a SearchProvider");
  }
  return context;
};
