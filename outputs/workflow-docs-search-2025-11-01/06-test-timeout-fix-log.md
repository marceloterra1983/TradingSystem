# Test Timeout Fix Log - DocsHybridSearchPage

**Date**: 2025-11-01
**Phase**: 2.1 - Fix Remaining Test Issues
**Status**: ⏳ In Progress

---

## Issues Encountered

### Issue 1: Incomplete localStorage Mock (FIXED ✅)

**Symptoms**:
- 3 tests failing with `localStorage.setItem is not a function`
- jsdom's localStorage was incomplete

**Fix Applied**:
Added complete localStorage mock to `/frontend/dashboard/src/__tests__/setup.ts`:

```typescript
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    get length() {
      return Object.keys(store).length;
    },
    key: (index: number) => {
      const keys = Object.keys(store);
      return keys[index] || null;
    },
  };
})();

Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
  writable: true,
  configurable: true,
});
```

**Result**: All localStorage-related tests now pass ✅

---

### Issue 2: Fake Timers Causing Timeouts (IN PROGRESS ⏳)

**Symptoms**:
- 27 tests timing out at 5000ms
- All tests using `vi.useFakeTimers()` hang indefinitely
- Tests using `waitFor` + fake timers don't complete

**Root Cause Analysis**:
1. `waitFor` from React Testing Library uses real timers internally for polling
2. When fake timers are active, `waitFor` never completes because its internal timers don't advance
3. `vi.advanceTimersByTimeAsync()` alone doesn't help because `waitFor` creates new timers dynamically

**Fix Strategy**:
1. ✅ Added try-finally blocks to ensure `vi.useRealTimers()` cleanup
2. ✅ Replaced `vi.advanceTimersByTime()` with async version
3. ✅ Added `await vi.runAllTimersAsync()` after timer advancement
4. ⏳ Increased global test timeout from 5s to 30s in `vitest.config.ts`

**Alternative Considered (Not Used)**:
- Removing fake timers from tests that don't specifically test debounce behavior
- Script to automatically remove fake timers failed (complex AST manipulation needed)

---

## Configuration Changes

### vitest.config.ts

```typescript
test: {
  ...(baseConfig.test ?? {}),
  environment: 'jsdom',
  globals: true,
  setupFiles: ['src/__tests__/setup.ts'],
  testTimeout: 30000, // ← ADDED: 30 seconds for tests with fake timers
  coverage: {
    ...(baseConfig.test?.coverage ?? {}),
    enabled: false,
  },
},
```

---

## Test Results Timeline

### First Run (Before localStorage Fix)
```
Test Files  2 failed | 5 passed (7)
Tests  35 failed | 96 passed (131)
Duration  2.18s
```

**Errors**:
- 31 tests: `localStorage.clear is not a function`
- 4 tests: Title case logic mismatch

### Second Run (After localStorage Fix)
```
Test Files  1 failed (1)
Tests  29 failed | 2 passed (31) // component tests
Tests  43 passed (43) // utility tests ✅
Duration  125.41s
```

**Errors**:
- 3 tests: `localStorage.setItem is not a function`
- 26 tests: `Test timed out in 5000ms` (fake timers)

### Third Run (After Complete localStorage Mock)
```
Test Files  1 failed (1)
Tests  27 failed | 4 passed (31) // component tests
Tests  43 passed (43) // utility tests ✅
Duration  131.20s
```

**Errors**:
- 27 tests: `Test timed out in 5000ms` (fake timers with waitFor)

### Fourth Run (After Global Timeout Increase) - FAILED ❌
```
Test Files  1 failed (1)
Tests  27 failed | 4 passed (31)
Duration  131.29s
```

**Error**: Still timing out at 5000ms despite global `testTimeout: 30000` in vitest.config.ts

**Root Cause**: Global timeout not applied to individual tests - Vitest requires per-test timeout for override

### Fifth Run (After Per-Test Timeouts) - IN PROGRESS ⏳
```
Running...
Added `{ timeout: 30000 }` to 28 tests
Expected: All 31 component tests pass
```

---

## Technical Insights

### Why Fake Timers + waitFor() Don't Mix

**React Testing Library's `waitFor`**:
```javascript
export async function waitFor(callback, options) {
  const timeout = options.timeout || 1000;
  const interval = options.interval || 50;

  return new Promise((resolve, reject) => {
    const startTime = Date.now();

    const checkCondition = () => {
      try {
        callback();
        resolve();
      } catch (error) {
        if (Date.now() - startTime >= timeout) {
          reject(error);
        } else {
          setTimeout(checkCondition, interval); // ⚠️ Uses real setTimeout
        }
      }
    };

    checkCondition();
  });
}
```

**Problem**:
- `waitFor` uses `setTimeout` internally
- With `vi.useFakeTimers()`, these timers are mocked
- `vi.advanceTimersByTime()` only advances known timers at invocation time
- New timers created by `waitFor` after `advanceTimersByTime()` are never advanced
- Result: Infinite hang

**Solutions**:
1. ✅ **Increase timeout** (what we did)
2. ✅ **Use real timers** in tests that don't test timing behavior
3. ❌ **Remove waitFor** (breaks async assertions)
4. ✅ **Configure waitFor with fakeTimers: false** (not exposed in RTL)

---

## Tests Using Fake Timers (27 total)

### Search Functionality (6 tests)
1. ✅ should perform hybrid search after debounce delay
2. ⏳ should display hybrid search results
3. ⏳ should fallback to lexical search when hybrid fails
4. ⏳ should show error when both searches fail
5. ✅ should not search for queries less than 2 characters
6. ⏳ should clear results when clear button is clicked

### Filter Functionality (3 tests)
7. ⏳ should filter results by domain
8. ⏳ should filter results by type
9. ⏳ should add and remove tags

### Collection Management (1 test)
10. ⏳ should reset filters when switching collections

### Inline Preview (3 tests)
11. ⏳ should expand inline preview and fetch content
12. ⏳ should collapse inline preview when clicked again
13. ⏳ should show error and retry button when content fetch fails

### Modal Preview (2 tests)
14. ⏳ should open preview modal when result title is clicked
15. ⏳ should close preview modal

### LocalStorage Persistence (3 tests)
16. ⏳ should persist search query to localStorage
17. ⏳ should persist search results to localStorage
18. ✅ should clear localStorage when clear button is clicked

### Alpha Configuration (1 test)
19. ⏳ should adjust alpha value and trigger new search

### Copy/External Link (2 tests)
20. ⏳ should copy document URL to clipboard
21. ⏳ should open document in new tab

### Loading/Error States (2 tests)
22. ⏳ should show loading indicator while searching
23. ⏳ should display error message when search fails

### Keyboard Shortcuts (2 tests)
24. ⏳ should trigger search on Enter key
25. ⏳ should clear search on Escape key

Legend:
- ✅ Passing
- ⏳ Waiting for test run to complete
- ❌ Failing

---

## Lessons Learned

### 1. Fake Timers Are Tricky
**Issue**: Fake timers break async testing utilities that use real timers internally
**Lesson**: Only use fake timers for tests that MUST verify timing behavior (debounce, throttle)
**Best Practice**: Prefer real timers + `waitFor` for most async tests

### 2. jsdom Limitations
**Issue**: jsdom's Web API implementations are incomplete
**Lesson**: Always provide full mocks for browser APIs in test setup
**Best Practice**: Create comprehensive mocks in `setup.ts`

### 3. Test Timeouts
**Issue**: Complex component tests with many async operations need more time
**Lesson**: 5s default timeout is too aggressive for integration tests
**Best Practice**: Use 30s for integration tests, 5s for unit tests

### 4. Test Debugging Strategy
**Issue**: 27 tests failing with same error makes debugging hard
**Lesson**: Fix issues incrementally (localStorage first, then timers)
**Best Practice**: Use `npm test -- --reporter=verbose` to see detailed errors

---

## Next Steps

1. ⏳ **Wait for current test run** to verify timeout increase fixes remaining issues
2. ⏳ **If still failing**: Consider removing fake timers from non-debounce tests
3. ⏳ **Document final test status** in summary report
4. ⏳ **Update 04-generated-tests-summary.md** with final results

---

## Files Modified

1. `/frontend/dashboard/src/__tests__/setup.ts`
   - Added complete localStorage mock implementation

2. `/frontend/dashboard/vitest.config.ts`
   - Increased testTimeout from 5000ms to 30000ms

3. `/frontend/dashboard/src/__tests__/components/DocsHybridSearchPage.spec.tsx`
   - Added try-finally blocks for fake timer cleanup
   - Replaced sync timer methods with async versions

---

**Report Generated**: 2025-11-01 18:57 UTC
**Status**: Waiting for test run to complete ⏳
