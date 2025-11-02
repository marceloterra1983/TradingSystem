#!/bin/bash

# This script adds fake timers to all tests that use userEvent.type()
# which triggers the debounced search

FILE="src/__tests__/components/DocsHybridSearchPage.spec.tsx"

echo "Creating backup..."
cp "$FILE" "$FILE.backup-$(date +%Y%m%d-%H%M%S)"

echo "Adding fake timers to tests with userEvent.type()..."

# The solution: Add fake timers + timer advancement pattern to tests that:
# 1. Use userEvent.type()
# 2. Don't already have vi.useFakeTimers()

# For now, let's document which tests need fake timers and create a manual fix plan

grep -n "userEvent.type" "$FILE" | while read -r line; do
    line_num=$(echo "$LINE" | cut -d: -f1)
    echo "Line $line_num needs fake timers"
done

echo "Total tests needing fake timers:"
grep -c "userEvent.type" "$FILE"

echo ""
echo "Solution: All 27 failing tests need this pattern:"
echo ""
cat <<'EOF'
it('test name', { timeout: 30000 }, async () => {
  vi.useFakeTimers();
  try {
    render(<DocsHybridSearchPage />);
    const input = screen.getByPlaceholderText(/Ex.: docker, workspace api, docusaurus/i);
    await userEvent.type(input, 'docker');

    // Advance timers past debounce delay
    await vi.advanceTimersByTimeAsync(400);
    await vi.runAllTimersAsync();

    await waitFor(() => {
      expect(mockedHybridSearch).toHaveBeenCalled();
    });
  } finally {
    vi.useRealTimers();
  }
});
EOF

echo ""
echo "Recommendation: Since 27/31 tests fail, it's faster to REWRITE the tests"
echo "using a consistent pattern rather than fixing each individually."
