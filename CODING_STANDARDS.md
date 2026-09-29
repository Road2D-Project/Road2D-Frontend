# Coding Standards & Critical Thinking Protocol for AI Assistants

> **Purpose:** This document defines the mandatory reasoning process AI assistants must follow before writing code, as well as self-review requirements before submitting any implementation.

---

## Core Principle

Do not write code the moment you receive a task. Think first. Unclear requirements produce broken code. A few clarifying questions asked upfront save hours of debugging. Your job is not to produce output quickly — it is to produce correct, maintainable output.

---

## Phase 1 — Pre-Implementation: Think Before You Code

Before writing any code, go through the following checklist internally. If any item produces uncertainty, **ask the developer first**.

### 1.1 Requirement Clarity

- Do you fully understand what this feature is supposed to do?
- Are there edge cases that the task description does not address (empty state, loading state, error state, concurrent actions)?
- Does the task involve existing logic that you have not read yet?
- Are there implicit assumptions in the task that could be wrong?

**If yes to any of the above → ask before coding.**

### 1.2 Data & API Contracts

- Do you know the exact shape of the data (request payload, response structure)?
- Is the API endpoint defined and confirmed, or are you guessing the field names?
- Are there nullable fields, optional properties, or union types you need to account for?
- What happens if the API fails or returns an unexpected response?

**If unclear → ask the developer for the API spec or data model before proceeding.**

### 1.3 State & Logic Dependencies

- Does this feature interact with existing state management (Redux, Zustand, Context, local state)?
- Could your changes break an existing flow that uses the same state slice?
- Are there race conditions possible (e.g., multiple async operations touching the same state)?
- Is there existing logic in the codebase that already handles a similar concern — and should be reused?

**If yes to any dependency → read the existing code first, then ask if anything is still unclear.**

### 1.4 How to Ask the Developer

When you need clarification, be specific. Do not ask vague questions.

**Bad:**
> "Can you clarify the requirements?"

**Good:**
> "When the user submits the form while offline, should we queue the request and retry later, or show an error immediately and let them resubmit manually? The current codebase does not have a retry mechanism."

State: what you found, what is ambiguous, and what decision you need. Then wait for the answer before proceeding.

---

## Phase 2 — Implementation: Standards to Follow While Coding

### 2.1 Clean Code Requirements

**Naming**
- Variables, functions, and components must have names that clearly describe their purpose.
- Avoid abbreviations unless they are universally understood (e.g., `id`, `url`, `i` in loops).
- Boolean variables should read as a condition: `isLoading`, `hasError`, `canSubmit`.
- Event handlers should describe the action: `handleSubmit`, `handleUserDelete`, not `onClick2`.

**Functions**
- Each function should do one thing. If a function is doing multiple unrelated things, split it.
- Functions longer than ~40–50 lines are a signal to review and refactor.
- Avoid deeply nested logic (more than 3 levels of indentation). Use early returns to flatten conditionals.

**Comments**
- Do not comment what the code obviously does. Comment *why* a non-obvious decision was made.
- If a workaround or hack is necessary, leave a comment explaining the constraint and a TODO if applicable.

**Dead Code**
- Do not leave commented-out code in the final submission.
- Do not leave `console.log`, `console.error`, or debug statements unless they are part of a formal logging strategy.

**Magic Values**
- Do not hardcode strings, numbers, or URLs inline. Extract them to named constants or configuration.

---

## Phase 3 — Pre-Submission Self-Review

Before presenting any implementation to the developer, complete all of the following checks yourself.

### 3.1 Button & Interaction Audit

For every interactive element in your implementation:

- [ ] Does clicking/tapping this button do exactly what the label says?
- [ ] Is there a loading state while an async operation is in progress? Does the button disable during that time to prevent double-submission?
- [ ] Is there an error state if the action fails? Is it visible and understandable to the user?
- [ ] Is there a success state or confirmation after the action completes?
- [ ] Can the user trigger this action in an unintended order (e.g., submitting before required data is loaded)?
- [ ] Does a destructive action (delete, reset, logout) have a confirmation step?

### 3.2 Logic Flow Audit

Trace every user flow your code touches from start to finish:

- [ ] Happy path: does the normal flow work end-to-end?
- [ ] Empty state: what happens when there is no data to display?
- [ ] Loading state: is the UI properly gated while async data is being fetched?
- [ ] Error state: what does the user see if an API call fails or data is malformed?
- [ ] Boundary conditions: what happens at zero, one, and maximum values?
- [ ] Permission/auth edge case: what happens if a user accesses this without the required permissions?

### 3.3 Bug Self-Check

Review your own implementation for these common issues:

| Category | What to Check |
|---|---|
| Async | Are all async calls properly awaited? Are errors caught? |
| State mutation | Are you mutating state directly instead of producing new values? |
| Stale closures | Are event handlers or `useEffect` dependencies capturing outdated values? |
| Conditional rendering | Are null/undefined values guarded before being accessed? |
| Array operations | Do `.map()`, `.filter()`, `.find()` have proper fallbacks when the array is empty or undefined? |
| Side effects | Are side effects (API calls, subscriptions, timers) properly cleaned up on unmount? |
| Type mismatches | Are you passing the correct types to functions and components? |
| Prop drilling | Is data being passed down more than 2–3 levels unnecessarily? |

### 3.4 Code Cleanliness Final Check

- [ ] No unused imports, variables, or functions.
- [ ] No commented-out code.
- [ ] No debug statements (`console.log`, `debugger`).
- [ ] All new logic follows the same patterns as the surrounding existing code.
- [ ] No magic values — constants are extracted and named.
- [ ] Functions are named clearly and do one thing each.

---

## Summary

| Phase | Rule |
|---|---|
| Before coding | If logic is unclear or requirements are ambiguous, ask the developer first. Do not assume. |
| While coding | Follow clean code standards: clear naming, single-responsibility, no dead code, no magic values. |
| Before submitting | Audit every button, trace every user flow, check for common bugs, verify code cleanliness. |

The goal is code that works correctly, reads clearly, and is easy for the next developer (human or AI) to understand and maintain.
