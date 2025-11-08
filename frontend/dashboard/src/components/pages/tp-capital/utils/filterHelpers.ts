/**
 * Filter Helper Functions
 *
 * Reusable filtering utilities to eliminate code duplication
 *
 * @module tp-capital/utils/filterHelpers
 */

/**
 * Checks if a string contains a search term (case-insensitive)
 *
 * @param value - String to search in
 * @param term - Search term
 * @returns True if term found, false otherwise
 *
 * @example
 * ```ts
 * containsIgnoreCase('PETR4', 'petr') // Returns: true
 * containsIgnoreCase('hello', 'WORLD') // Returns: false
 * ```
 */
export function containsIgnoreCase(value: string, term: string): boolean {
  return value.toLowerCase().includes(term.toLowerCase());
}

/**
 * Checks if any of the provided strings contains the search term
 *
 * @param term - Search term
 * @param values - Strings to search in
 * @returns True if term found in any value
 *
 * @example
 * ```ts
 * searchInMultiple('petr', 'PETR4', 'TP Capital', 'Buy signal')
 * // Returns: true (found in 'PETR4')
 * ```
 */
export function searchInMultiple(term: string, ...values: string[]): boolean {
  const lowerTerm = term.toLowerCase();
  return values.some((value) => value.toLowerCase().includes(lowerTerm));
}

/**
 * Creates a predicate function for filtering by multiple fields
 *
 * @param searchTerm - Term to search for
 * @param fields - Field extractors
 * @returns Predicate function for Array.filter()
 *
 * @example
 * ```ts
 * const filterFn = createSearchPredicate('petr',
 *   (item) => item.asset,
 *   (item) => item.channel
 * );
 * signals.filter(filterFn);
 * ```
 */
export function createSearchPredicate<T>(
  searchTerm: string,
  ...fields: Array<(item: T) => string>
): (item: T) => boolean {
  const lowerTerm = searchTerm.toLowerCase();

  return (item: T) => {
    return fields.some((field) => {
      const value = field(item);
      return value.toLowerCase().includes(lowerTerm);
    });
  };
}
