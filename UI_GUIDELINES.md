# UI Guidelines for AI Assistants

> **Purpose:** This document governs how AI assistants must approach all frontend UI work in this project. Read and follow it entirely before writing a single line of UI code.

---

## Core Principle

You are not here to express creativity. You are here to implement UI **faithfully and precisely** — matching what already exists in this project or what the developer has explicitly shown you. Your job is to extend the system, not reinvent it.

---

## Rule 1 — Follow the Existing Project Style System

Before writing any UI code, inspect and understand the project's existing style system:

- Identify the CSS framework or methodology in use (e.g., Tailwind, CSS Modules, styled-components, SCSS, plain CSS).
- Read the existing component files and understand recurring patterns: spacing scales, color tokens, border radii, shadow levels, font sizes, button variants, etc.
- Replicate those exact patterns when implementing new UI. Do not introduce new utility classes, design tokens, or component patterns unless the developer explicitly approves them.

**Prohibited without explicit developer approval:**

- Importing or referencing a new icon library (e.g., Heroicons, Lucide, FontAwesome, Material Icons, Radix Icons).
- Adding decorative icons, emojis, or visual embellishments not present in the existing codebase.
- Introducing animation libraries or motion effects not already in use.
- Switching color values, font sizes, border radii, or spacing values away from what the project already defines.
- Creating new component abstractions (new base Button, Card, Modal, etc.) if equivalent ones already exist.

---

## Rule 2 — Follow Developer-Provided UI References

When a developer provides a UI screenshot, mockup, Figma export, or annotated image:

- Treat it as the specification. Implement what is shown — no more, no less.
- Match layout, spacing, alignment, and visual hierarchy as closely as possible.
- Do not add UI elements (icons, badges, tooltips, labels, dividers, animations) that are not visible in the reference.
- Do not restyle elements that are visible in the reference to "look better" by your own judgment.
- If the reference conflicts with the existing style system (Rule 1), flag it to the developer. Do not resolve the conflict unilaterally.

---

## Rule 3 — Ask Before Proceeding When in Doubt

If a UI area you are working on is **not covered** by either the existing project style or a developer-provided reference, **stop and ask**.

Do not fill gaps with your own assumptions or aesthetic preferences. Examples of when you must ask:

- The developer says "add a settings panel" but provides no reference for how it should look.
- A new state (empty, error, loading) needs a UI treatment not shown anywhere in the project.
- You need to introduce a new component type with no existing counterpart in the codebase.
- You are unsure whether a certain icon, color, or layout pattern is acceptable.

**How to ask:**

State clearly what information you are missing and what decision you need the developer to make. Do not proceed with a placeholder and "fix later" — get clarity first.

Example:
> "The error state for this form field has no existing pattern in the codebase and no reference was provided. Should I follow the same pattern as [existing component], or do you have a reference for how this should look?"

---

## What "AI-Generated UI" Means and Why It Is Prohibited

The following patterns are considered AI default behavior and are **not acceptable** in this project unless explicitly present in the codebase or approved by the developer:

| Pattern | Why It Is Banned |
|---|---|
| Random decorative icons on every list item or button | Adds visual noise not aligned with project style |
| Gradient backgrounds on cards or sections | Introduces unsanctioned design decisions |
| Rounded everything with large border-radius | May conflict with the project's existing radius scale |
| Emoji used as icons or labels | Unprofessional and inconsistent |
| Fade-in / slide-up animations on all elements | Motion not present in the existing system |
| ALL-CAPS labels above every heading | Typographic pattern not from the project |
| Color accent on a single random word in a heading | AI tell; not in the project's writing style |
| Numbered markers (01 / 02 / 03) for non-sequential content | Misleading structure |
| Duplicate or redundant helper text | Clutters the UI |

---

## Summary Checklist Before Submitting UI Code

Before sending any frontend implementation, verify:

- [ ] No new icon libraries or icons were added without approval.
- [ ] All colors, spacing, font sizes, and radii match the existing style system.
- [ ] Every UI decision is traceable to either the existing codebase or a developer-provided reference.
- [ ] Any ambiguous or missing UI spec was flagged to the developer before coding.
- [ ] No decorative elements, animations, or embellishments were added on your own initiative.
