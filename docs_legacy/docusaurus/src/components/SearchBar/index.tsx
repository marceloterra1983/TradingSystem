import React, { useState, useEffect, useRef } from 'react';
import { useHistory } from '@docusaurus/router';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import styles from './styles.module.css';

const DEBOUNCE_DELAY = 300;

interface Suggestion {
  text: string;
  domain: string;
  type: string;
  path: string;
}

function SearchBar() {
  const history = useHistory();
  const { siteConfig } = useDocusaurusContext();

  // Get API URL from config customFields with fallback
  const apiUrl =
    (siteConfig.customFields?.searchApiUrl as string) || 'http://localhost:3400/api/v1/docs';

  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Keyboard shortcut (Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }

      if (e.key === 'Escape') {
        setQuery('');
        setSuggestions([]);
        setShowSuggestions(false);
        inputRef.current?.blur();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Click outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch suggestions
  useEffect(() => {
    if (!query || query.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const timeoutId = setTimeout(async () => {
      try {
        const response = await fetch(`${apiUrl}/suggest?q=${encodeURIComponent(query)}&limit=5`);
        if (!response.ok) throw new Error('Failed to fetch suggestions');

        const data = await response.json();
        setSuggestions(data.suggestions || []);
        setShowSuggestions(data.suggestions.length > 0);
      } catch (error) {
        console.error('Failed to fetch suggestions:', error);
        setSuggestions([]);
        setShowSuggestions(false);
      }
    }, DEBOUNCE_DELAY);

    return () => clearTimeout(timeoutId);
  }, [query]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      history.push(`/search?q=${encodeURIComponent(query.trim())}`);
      setQuery('');
      setShowSuggestions(false);
      inputRef.current?.blur();
    }
  };

  const handleSuggestionClick = (path: string) => {
    history.push(path);
    setQuery('');
    setShowSuggestions(false);
    inputRef.current?.blur();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || suggestions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === 'Enter' && selectedIndex >= 0) {
      e.preventDefault();
      handleSuggestionClick(suggestions[selectedIndex].path);
    }
  };

  return (
    <div className={styles.searchBarContainer} ref={containerRef}>
      <form onSubmit={handleSubmit} className={styles.searchForm}>
        <div className={styles.searchInputWrapper}>
          <svg className={styles.searchIcon} width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path
              d="M9 17A8 8 0 1 0 9 1a8 8 0 0 0 0 16zM19 19l-4.35-4.35"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <input
            ref={inputRef}
            type="text"
            className={styles.searchInput}
            placeholder="Search docs... (Ctrl+K)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => query.length >= 2 && suggestions.length > 0 && setShowSuggestions(true)}
            onKeyDown={handleKeyDown}
            autoComplete="off"
          />
          {query && (
            <button
              type="button"
              className={styles.clearButton}
              onClick={() => {
                setQuery('');
                setSuggestions([]);
                setShowSuggestions(false);
              }}
              aria-label="Clear search"
            >
              ✕
            </button>
          )}
        </div>
      </form>

      {showSuggestions && suggestions.length > 0 && (
        <div className={styles.suggestionsDropdown}>
          {suggestions.map((suggestion, index) => (
            <div
              key={`${suggestion.path}-${index}`}
              className={`${styles.suggestionItem} ${
                index === selectedIndex ? styles.suggestionItemSelected : ''
              }`}
              onClick={() => handleSuggestionClick(suggestion.path)}
              onMouseEnter={() => setSelectedIndex(index)}
            >
              <div className={styles.suggestionText}>{suggestion.text}</div>
              <div className={styles.suggestionMeta}>
                <span className={styles.suggestionDomain}>{suggestion.domain}</span>
                <span className={styles.suggestionType}>{suggestion.type}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default SearchBar;

