---
title: Dark Mode Implementation Checklist
sidebar_position: 4
tags: [frontend, ui, dark-mode, checklist, implementation, guide]
domain: frontend
type: guide
summary: Step-by-step checklist for implementing dark mode in new pages and components
status: active
last_review: 2025-10-18
---

# Dark Mode Implementation Checklist

> Part of the [Dark Mode Implementation Hub](../dark-mode.md)

## ⚠️ Mandatory Requirement

**Use this checklist when creating ANY new page or component.** Dark mode support is mandatory for all new development.

---

## 🎨 Visual Elements

-   [ ] All background colors have `dark:bg-*` variant
-   [ ] All text colors have `dark:text-*` variant
-   [ ] All border colors have `dark:border-*` variant
-   [ ] All icon colors have dark mode support
-   [ ] All shadow effects have dark variants (if applicable)

**Example:**

```tsx
// ✅ Correct
<div className="bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-700">

// ❌ Incorrect
<div className="bg-white text-gray-900 border border-gray-200">
```

---

## 🎯 Interactive Elements

-   [ ] Buttons have dark mode hover states (`dark:hover:bg-*`)
-   [ ] Links have dark mode hover/focus states
-   [ ] Form inputs have dark backgrounds and text colors
-   [ ] Dropdowns/selects have dark mode styling
-   [ ] Textareas have dark mode styling
-   [ ] Checkboxes/radios have dark mode support

**Example:**

```tsx
// ✅ Correct button
<button className="bg-cyan-500 hover:bg-cyan-600 dark:bg-cyan-600 dark:hover:bg-cyan-500">

// ✅ Correct input
<input className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100" />
```

---

## 🎨 Colored Components

-   [ ] Category badges/cards have dark mode colors
-   [ ] Status indicators have dark mode colors
-   [ ] Priority badges have dark mode colors
-   [ ] Alert/message boxes have dark mode variants
-   [ ] Color-coded sections have proper dark mode backgrounds

**Example:**

```tsx
// ✅ Correct category badge
<span className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400">
  Documentation
</span>

// ✅ Correct alert
<div className="bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800 text-red-800 dark:text-red-300">
  Error message
</div>
```

---

## 📋 Configuration Objects

-   [ ] All color configuration objects include `dark:` variants
-   [ ] Category configs include dark mode colors
-   [ ] Status configs include dark mode colors
-   [ ] Priority configs include dark mode colors

**Example:**

```tsx
// ✅ Correct configuration
const CATEGORY_CONFIG = {
    documentation: {
        label: "Documentação",
        color: "text-blue-600 dark:text-blue-400",
        bgColor: "bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800",
    },
};
```

---

## 🧪 Testing

-   [ ] Manually toggle between light/dark modes
-   [ ] All text is readable in both themes
-   [ ] All interactive elements are visible in both themes
-   [ ] No "invisible" elements (same color as background)
-   [ ] Hover states are visible in both themes
-   [ ] Color contrast meets accessibility standards

**Testing Commands:**

```js
// In browser console
localStorage.setItem("theme", "dark");
location.reload();

localStorage.setItem("theme", "light");
location.reload();
```

---

## 📝 Documentation

-   [ ] Component documented with dark mode examples
-   [ ] Screenshots include both light and dark modes (if applicable)
-   [ ] Color configuration documented in component README

---

## Common Mistakes to Avoid

### ❌ Mistake 1: Missing Dark Variants

```tsx
// ❌ Wrong
<div className="bg-white text-gray-900">

// ✅ Correct
<div className="bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
```

### ❌ Mistake 2: Forgetting Borders

```tsx
// ❌ Wrong
<div className="border border-gray-200">

// ✅ Correct
<div className="border border-gray-200 dark:border-gray-700">
```

### ❌ Mistake 3: Hardcoded Colors in JS

```tsx
// ❌ Wrong
const color = "#ffffff";

// ✅ Correct
const { resolvedTheme } = useTheme();
const color = resolvedTheme === "dark" ? "#111827" : "#ffffff";
```

### ❌ Mistake 4: Missing Hover States

```tsx
// ❌ Wrong
<button className="bg-cyan-500 hover:bg-cyan-600">

// ✅ Correct
<button className="bg-cyan-500 hover:bg-cyan-600 dark:bg-cyan-600 dark:hover:bg-cyan-500">
```

---

## Quick Checklist Summary

**Before committing new component:**

1. ✅ All colors have dark variants
2. ✅ Tested in both light and dark modes
3. ✅ Interactive states work in both themes
4. ✅ Text is readable in both themes
5. ✅ Configuration objects include dark colors
6. ✅ No console errors related to theme

---

## Next Steps

-   **Learn patterns** → [Component Patterns](./03-component-patterns.md)
-   **See examples** → [Real-World Examples](./06-real-world-examples.md)
-   **Debug issues** → [Testing & Troubleshooting](./05-testing-troubleshooting.md)

## Related Guides

-   [Dark Mode Hub](../dark-mode.md) - Complete navigation
-   [Quick Reference Card](../dark-mode-quick-reference.md) - Color mappings
-   [Technical Implementation](./02-technical-implementation.md) - Architecture

---

**Part of**: Dark Mode Implementation Hub
**Version**: 3.0.0
**Last Updated**: 2025-10-18
