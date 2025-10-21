---
title: Dark Mode Technical Implementation
sidebar_position: 2
tags: [frontend, ui, dark-mode, theming, technical, architecture]
domain: frontend
type: guide
summary: Technical architecture of dark mode including ThemeProvider, Tailwind config, and color palette
status: active
last_review: 2025-10-18
---

# Dark Mode Technical Implementation

> Part of the [Dark Mode Implementation Hub](../dark-mode.md)

## Architecture Overview

Dark mode is implemented using:

1. **React Context** - ThemeProvider for state management
2. **Tailwind CSS** - Class-based dark mode with `dark:` utilities
3. **localStorage** - Persistent theme preference
4. **matchMedia API** - System preference detection

## 1. ThemeProvider Context

Location: `src/contexts/ThemeContext.tsx`

Provides theme state and controls to all components:

```tsx
import { useTheme } from "@/contexts/ThemeContext";

function MyComponent() {
    const { theme, resolvedTheme, setTheme, toggleTheme } = useTheme();

    return (
        <div>
            <p>Current theme: {resolvedTheme}</p>
            <button onClick={toggleTheme}>Toggle</button>
        </div>
    );
}
```

**API:**

-   `theme: 'light' | 'dark' | 'system'` - User's preference
-   `resolvedTheme: 'light' | 'dark'` - Actual applied theme (resolves 'system')
-   `setTheme(theme)` - Set specific theme
-   `toggleTheme()` - Switch between light/dark

## 2. Tailwind Configuration

Location: `tailwind.config.js`

```js
export default {
    darkMode: "class", // Class-based dark mode
    // ...
};
```

This enables `dark:` utility classes like:

-   `dark:bg-gray-900` - Dark background
-   `dark:text-gray-100` - Dark text color
-   `dark:border-gray-700` - Dark border color

## 3. Component Styling

All layout components updated with dark mode classes:

**LayoutHeader:**

```tsx
className = "bg-white/80 dark:bg-gray-900/80";
```

**LayoutSidebar:**

```tsx
className = "bg-card/40 dark:bg-gray-900/40";
```

**Logo:**

-   Light mode: Uses `logo-compact.svg`
-   Dark mode: Uses `logo-dark.svg` (optimized colors for dark backgrounds)

## 4. Color Palette

### Light Theme

```css
--background: #f9fafb; /* gray-50 */
--card: #ffffff;
--border: #e5e7eb; /* gray-200 */
--text-primary: #111827; /* gray-900 */
--text-secondary: #6b7280; /* gray-500 */
```

### Dark Theme

```css
--background: #030712; /* gray-950 */
--card: #111827; /* gray-900 */
--border: #374151; /* gray-700 */
--text-primary: #f3f4f6; /* gray-100 */
--text-secondary: #9ca3af; /* gray-400 */
```

### Accent Colors (Both Themes)

```css
--cyan-50: #ecfeff;
--cyan-700: #0e7490;
--cyan-950: #083344; /* Dark mode accent background */
--cyan-400: #22d3ee; /* Dark mode accent text */
```

## Implementation Details

### Theme Detection Flow

1. **On Mount**: Check localStorage for saved preference
2. **If 'system'**: Query `matchMedia('(prefers-color-scheme: dark)')`
3. **Apply Theme**: Add/remove `dark` class on `<html>` element
4. **Listen**: Watch for system preference changes
5. **Persist**: Save user choice to localStorage on change

### Performance Considerations

-   **No runtime overhead** - Tailwind generates only used classes
-   **No JavaScript required** after initial theme detection
-   **CSS-only transitions** - Smooth and performant
-   **localStorage is synchronous** - No async complexity

### Preventing Flash of Unstyled Content (FOUC)

ThemeProvider must wrap App in `src/App.tsx`:

```tsx
<ThemeProvider defaultTheme="system">
    <App />
</ThemeProvider>
```

This ensures theme is applied before first render.

---

## Next Steps

-   **Learn patterns** → [Component Patterns](./03-component-patterns.md)
-   **Implement in components** → [Implementation Checklist](./04-implementation-checklist.md)
-   **See examples** → [Real-World Examples](./06-real-world-examples.md)

## Related Guides

-   [Dark Mode Hub](../dark-mode.md) - Complete navigation
-   [Overview & Setup](./01-overview-setup.md) - Features and usage
-   [Testing & Troubleshooting](./05-testing-troubleshooting.md) - Debug issues

## External References

-   [Tailwind CSS Dark Mode Docs](https://tailwindcss.com/docs/dark-mode)
-   [MDN: prefers-color-scheme](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-color-scheme)
-   [React Context API](https://react.dev/reference/react/useContext)

---

**Part of**: Dark Mode Implementation Hub
**Version**: 3.0.0
**Last Updated**: 2025-10-18
