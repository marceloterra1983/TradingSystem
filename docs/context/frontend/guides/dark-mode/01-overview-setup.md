---
title: Dark Mode Overview & Setup
sidebar_position: 1
tags: [frontend, ui, dark-mode, theming, overview, setup]
domain: frontend
type: guide
summary: Dark mode features, usage, and theme toggle setup for TradingSystem dashboard
status: active
last_review: 2025-10-18
---

# Dark Mode Overview & Setup

> Part of the [Dark Mode Implementation Hub](../dark-mode.md)

## Overview

The TradingSystem dashboard includes a complete dark mode implementation with automatic system preference detection, manual toggle, and localStorage persistence.

## Features

✅ **Three Theme Modes**

-   `light` - Light theme
-   `dark` - Dark theme
-   `system` - Automatically follows OS preference

✅ **Persistent Preference**

-   Theme choice saved to `localStorage`
-   Survives browser refresh and page reload

✅ **Smooth Transitions**

-   All colors transition smoothly between themes
-   No flickering on page load

✅ **Semantic Colors**

-   Tailwind dark mode utilities (`dark:`)
-   Consistent color palette across themes

## Usage

### Toggle Theme Button

Located in the top-right corner of the header (next to connection status):

-   🌙 Moon icon = Currently in light mode (click to switch to dark)
-   ☀️ Sun icon = Currently in dark mode (click to switch to light)

### Keyboard Shortcuts

You can add keyboard shortcuts by modifying the `ThemeContext`:

```tsx
// Example: Ctrl+Shift+D to toggle theme
useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
        if (e.ctrlKey && e.shiftKey && e.key === "D") {
            toggleTheme();
        }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
}, [toggleTheme]);
```

## System Requirements

-   React 18+
-   Tailwind CSS 3.4+
-   Modern browser with `matchMedia` support
-   localStorage enabled

## Browser Compatibility

| Browser | Version | Support |
| ------- | ------- | ------- |
| Chrome  | 76+     | ✅ Full |
| Firefox | 67+     | ✅ Full |
| Safari  | 12.1+   | ✅ Full |
| Edge    | 79+     | ✅ Full |

---

## Next Steps

-   **Implement in components** → [Implementation Checklist](./04-implementation-checklist.md)
-   **Learn patterns** → [Component Patterns](./03-component-patterns.md)
-   **Understand architecture** → [Technical Implementation](./02-technical-implementation.md)

## Related Guides

-   [Dark Mode Hub](../dark-mode.md) - Complete navigation
-   [Quick Reference Card](../dark-mode-quick-reference.md) - Fast lookup
-   [Testing & Troubleshooting](./05-testing-troubleshooting.md) - Debug issues

---

**Part of**: Dark Mode Implementation Hub
**Version**: 3.0.0
**Last Updated**: 2025-10-18
