import React, { useState } from 'react';
import styles from './styles.module.css';

interface FacetOption {
  value: string;
  count: number;
}

interface FacetsData {
  domains: FacetOption[];
  types: FacetOption[];
  tags: FacetOption[];
  statuses: FacetOption[];
}

interface SelectedFilters {
  domain?: string;
  type?: string;
  tags: string[];
  status?: string;
}

interface FacetFiltersProps {
  facets: FacetsData;
  selectedFilters: SelectedFilters;
  onFilterChange: (filterType: string, value: string | string[]) => void;
  onClearAll: () => void;
}

interface FilterSectionProps {
  title: string;
  options: FacetOption[];
  selected?: string;
  onChange: (value: string) => void;
  multiSelect?: boolean;
}

function FilterSection({
  title,
  options,
  selected,
  onChange,
  multiSelect = false,
}: FilterSectionProps) {
  const [expanded, setExpanded] = useState(true);

  if (options.length === 0) {
    return null;
  }

  return (
    <div className={styles.filterSection}>
      <button
        className={styles.filterTitle}
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
      >
        <span>{title}</span>
        <span className={styles.expandIcon}>{expanded ? '▼' : '▶'}</span>
      </button>

      {expanded && (
        <div className={styles.filterOptions}>
          {/* "All" option for single-select */}
          {!multiSelect && (
            <label className={styles.filterOption}>
              <input type="radio" name={title} checked={!selected} onChange={() => onChange('')} />
              <span className={styles.filterLabel}>All</span>
            </label>
          )}

          {options.map((option) => (
            <label key={option.value} className={styles.filterOption}>
              <input
                type={multiSelect ? 'checkbox' : 'radio'}
                name={title}
                checked={selected === option.value}
                onChange={() => onChange(option.value)}
                disabled={option.count === 0}
              />
              <span className={styles.filterLabel}>
                {option.value.charAt(0).toUpperCase() + option.value.slice(1)}
              </span>
              <span className={styles.filterCount}>{option.count}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

interface TagsFilterProps {
  tags: FacetOption[];
  selectedTags: string[];
  onChange: (tags: string[]) => void;
}

function TagsFilter({ tags, selectedTags, onChange }: TagsFilterProps) {
  const [expanded, setExpanded] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAll, setShowAll] = useState(false);

  const displayLimit = showAll ? tags.length : 20;
  const filteredTags = tags.filter((tag) =>
    tag.value.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const displayedTags = filteredTags.slice(0, displayLimit);

  const toggleTag = (tagValue: string) => {
    if (selectedTags.includes(tagValue)) {
      onChange(selectedTags.filter((t) => t !== tagValue));
    } else {
      onChange([...selectedTags, tagValue]);
    }
  };

  const removeTag = (tagValue: string) => {
    onChange(selectedTags.filter((t) => t !== tagValue));
  };

  if (tags.length === 0) {
    return null;
  }

  return (
    <div className={styles.filterSection}>
      <button
        className={styles.filterTitle}
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
      >
        <span>Tags</span>
        <span className={styles.expandIcon}>{expanded ? '▼' : '▶'}</span>
      </button>

      {expanded && (
        <div className={styles.filterOptions}>
          {selectedTags.length > 0 && (
            <div className={styles.selectedTags}>
              {selectedTags.map((tag) => (
                <span key={tag} className={styles.tagChip}>
                  {tag}
                  <button
                    className={styles.tagRemove}
                    onClick={() => removeTag(tag)}
                    aria-label={`Remove ${tag}`}
                  >
                    ✕
                  </button>
                </span>
              ))}
            </div>
          )}

          {tags.length > 10 && (
            <input
              type="text"
              className={styles.tagSearch}
              placeholder="Search tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          )}

          {displayedTags.map((tag) => (
            <label key={tag.value} className={styles.filterOption}>
              <input
                type="checkbox"
                checked={selectedTags.includes(tag.value)}
                onChange={() => toggleTag(tag.value)}
                disabled={tag.count === 0}
              />
              <span className={styles.filterLabel}>{tag.value}</span>
              <span className={styles.filterCount}>{tag.count}</span>
            </label>
          ))}

          {filteredTags.length > displayLimit && (
            <button className={styles.showMoreButton} onClick={() => setShowAll(!showAll)}>
              {showAll ? 'Show less' : `Show ${filteredTags.length - displayLimit} more`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function FacetFilters({ facets, selectedFilters, onFilterChange, onClearAll }: FacetFiltersProps) {
  const activeFilterCount =
    (selectedFilters.domain ? 1 : 0) +
    (selectedFilters.type ? 1 : 0) +
    selectedFilters.tags.length +
    (selectedFilters.status ? 1 : 0);

  return (
    <div className={styles.facetFilters}>
      <div className={styles.filtersHeader}>
        <h3>Filters</h3>
        {activeFilterCount > 0 && (
          <div className={styles.activeFilters}>
            <span className={styles.activeCount}>{activeFilterCount} active</span>
            <button className={styles.clearAllButton} onClick={onClearAll}>
              Clear all
            </button>
          </div>
        )}
      </div>

      <FilterSection
        title="Domain"
        options={facets.domains}
        selected={selectedFilters.domain}
        onChange={(value) => onFilterChange('domain', value)}
      />

      <FilterSection
        title="Type"
        options={facets.types}
        selected={selectedFilters.type}
        onChange={(value) => onFilterChange('type', value)}
      />

      <TagsFilter
        tags={facets.tags}
        selectedTags={selectedFilters.tags}
        onChange={(tags) => onFilterChange('tags', tags)}
      />

      <FilterSection
        title="Status"
        options={facets.statuses}
        selected={selectedFilters.status}
        onChange={(value) => onFilterChange('status', value)}
      />
    </div>
  );
}

export default FacetFilters;





