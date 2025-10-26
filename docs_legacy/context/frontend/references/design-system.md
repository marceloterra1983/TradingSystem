---
title: Design System and Styling
sidebar_position: 10
tags: [frontend, design-system, reference, ui]
domain: frontend
type: reference
summary: UI patterns, tokens, and libraries used in the dashboard
status: active
last_review: "2025-10-17"
---

# Design System and Styling

## Libraries

- Tailwind CSS 3.4  utility-first styling configured in `tailwind.config.js`.
- shadcn/ui + Radix UI  accessible components (accordion, dialog, select, etc.).
- Lucide Icons  outline icon set.
- framer-motion  lightweight animations.

## Tokens and configuration

- Custom colour palette defined in Tailwind (`primary`, `success`, `warning`, `danger`).
- Typography defaults to Inter/sans (see `index.css`).
- Use the `cn` helper (`lib/utils.ts`) to combine conditional classes.

## Base components (`components/ui/`)

| File | Purpose |
|------|---------|
| button.tsx | Button variants (default, outline, ghost, etc.). |
| card.tsx | Card wrapper with header/content/footer. |
| dialog.tsx | Modal interactions. |
| input.tsx | Standardised text inputs. |
| select.tsx | Radix + Tailwind select. |
| textarea.tsx | Multiline idea description input. |
| accordion.tsx | Accordion used in Escopo page. |

## Accessibility

- Radix primitives ship with ARIA attributes.
- Keep `aria-label` on icon-only buttons.
- Ensure focus styles remain visible (`focus:ring-*`).

## Dark mode (planned)

- Add Tailwind `dark:` variants tied to CSS variables.
- Store theme tokens in shared JSON once defined.
- Document final approach in an ADR under `frontend/architecture/decisions`.

## References

- https://tailwindcss.com/docs
- https://ui.shadcn.com
- https://www.radix-ui.com/primitives