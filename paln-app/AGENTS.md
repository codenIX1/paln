# AGENTS.md - Developer Guidelines for PALN

## Project Overview

PALN is a Next.js 16 application with TypeScript, Tailwind CSS v4, Lucide React icons, and shadcn/ui components. It features a modern, minimalist design aesthetic with clean layouts, subtle shadows, and professional interfaces.

---

## Build, Lint, and Test Commands

### Development
```bash
npm run dev          # Start development server at http://localhost:3000
```

### Build & Production
```bash
npm run build        # Create production build
npm run start        # Start production server
```

### Linting
```bash
npm run lint         # Run Next.js ESLint
```

### Testing
This project does not currently have a test framework configured. To add tests:
```bash
npm install --save-dev vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom
```

To run a single test file once tests are configured:
```bash
npx vitest run src/components/__tests__/MyComponent.test.tsx
```

To run a single test:
```bash
npx vitest run -t "test name" src/components/__tests__/MyComponent.test.tsx
```

---

## Code Style Guidelines

### General Principles
- Write clean, readable, and maintainable code
- Keep functions small and focused (single responsibility)
- Use meaningful variable and function names
- Avoid magic numbers - use constants instead

### TypeScript

#### Type Definitions
- Always define return types for functions
- Use explicit types rather than `any`
- Leverage TypeScript strict mode
- Define interfaces for object shapes

```typescript
// Good
interface Source {
  id: string;
  name: string;
  type: "file" | "image" | "text" | "link" | "video";
}

// Bad - avoid any
function process(data: any): any
```

#### Generics
- Use generics for reusable components and utilities
- Constrain generics when appropriate

```typescript
interface ApiResponse<T> {
  data: T;
  error?: string;
}
```

### Naming Conventions

#### Variables & Functions
- Use camelCase: `handleFileUpload`, `uploadedText`
- Use descriptive names: `isProcessing` not `flag`
- Boolean names should be prefix with `is`, `has`, `should`, `can`

#### Components
- Use PascalCase: `Dashboard`, `SourcePanel`
- Component files should match component name: `Dashboard.tsx`

#### Constants
- Use UPPER_SNAKE_CASE for constants: `MAX_FILE_SIZE`
- Use PascalCase for config objects

### Imports

#### Order (enforced by IDE/organize imports)
1. External imports (React, Next.js)
2. External libraries (lucide-react)
3. Relative imports (./components, ../utils)
4. Type imports

```typescript
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Upload, FileText, X } from "lucide-react";
import type { Metadata } from "next";
import { formatDate } from "@/utils/date";
import { Button } from "@/components/ui/button";
```

#### Aliases
- Use `@/*` for src-relative imports: `@/components/ui/button`

### Formatting

#### Whitespace
- Use 2 spaces for indentation
- Add blank lines between logical sections
- Maximum line length: 100 characters

#### Braces
- Use K&R style braces (opening brace on same line)
- Always use braces for control statements

```typescript
// Good
if (condition) {
  doSomething();
} else {
  doOtherThing();
}

// Bad
if (condition) doSomething();
```

### React/Next.js Patterns

#### Client Components
- Use "use client" for components with hooks (useState, useEffect, onClick handlers)
- Keep server components as default where possible

```typescript
"use client";

import { useState } from "react";

export default function Dashboard() {
  const [sources, setSources] = useState<Source[]>([]);
  // ...
}
```

#### Event Handlers
- Prefix with `handle`: `handleSubmit`, `handleClick`
- Keep handlers as methods within the component

#### State
- Use useState for local component state
- Consider useReducer for complex state logic

### Error Handling

#### Try/Catch
- Always wrap async operations in try/catch
- Provide meaningful error messages

```typescript
try {
  const data = await fetchData();
} catch (error) {
  console.error("Failed to fetch data:", error);
  setError("Unable to load data. Please try again.");
}
```

#### Validation
- Validate inputs before processing
- Show user-friendly error messages
- Use early returns for error cases

### Tailwind CSS

#### Modern Design System
This project uses semantic CSS variables defined in globals.css:
- `background` - Page background
- `foreground` - Primary text color
- `card` / `card-foreground` - Card surfaces
- `primary` / `primary-foreground` - Primary actions
- `secondary` / `secondary-foreground` - Secondary elements
- `muted` / `muted-foreground` - Subtle elements
- `accent` / `accent-foreground` - Accent highlights
- `destructive` / `destructive-foreground` - Error states
- `border` / `input` / `ring` - Borders and focus states

#### Dark Mode
- Toggle via `.dark` class on root element
- All semantic colors automatically adapt
- Use `isDark` state + `document.documentElement.classList.toggle("dark", isDark)`

#### Shadow Utilities
- Use Tailwind default shadows: `shadow-sm`, `shadow-md`, `shadow-lg`
- Avoid custom hard offset shadows

#### Best Practices
- Use utility classes for styling
- Prefer semantic HTML elements
- Ensure sufficient color contrast for accessibility
- Use shadcn/ui components for consistent UI

```typescript
// Good
<Button variant="default">Get Started</Button>

// Bad - avoid custom neo-brutalist styling
<button className="bg-neo-yellow border-4 border-neo-black shadow-neo">
  GET STARTED
</button>
```

### Accessibility

- Use semantic HTML (header, main, aside, footer)
- Add aria-labels for icon-only buttons
- Ensure keyboard navigation works
- Maintain color contrast ratios (4.5:1 minimum)
- Use focus states for interactive elements

### File Organization

```
src/
├── app/
│   ├── page.tsx           # Landing page
│   ├── layout.tsx         # Root layout
│   ├── globals.css        # Global styles + Tailwind
│   └── dashboard/
│       └── page.tsx       # Dashboard page
├── components/
│   ├── ui/                # shadcn/ui components
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   ├── card.tsx
│   │   └── ...
│   └── *.tsx              # App-specific components
└── lib/
    ├── utils.ts           # Utility functions
    └── api.ts             # API client
```

---

## shadcn/ui Components

This project uses shadcn/ui for consistent, accessible UI components.

### Available Components
- `Button` - Primary action buttons with variants (default, outline, ghost, secondary, destructive, link)
- `Input` - Text inputs with proper focus states
- `Textarea` - Multi-line text inputs
- `Card` - Content containers with header, content, footer sections
- `Badge` - Status indicators and labels
- `Tabs` - Tabbed navigation
- `Dialog` - Modal dialogs
- `Accordion` - Collapsible sections
- `ScrollArea` - Custom scrollable containers

### Usage Guidelines
- Always use shadcn/ui components instead of custom implementations
- Customize via className prop, not by modifying component source
- Use variant props (variant, size) instead of custom styling
- Maintain accessibility by using proper component APIs

---

## Cursor/Copilot Rules

No existing Cursor or Copilot rules found. These guidelines serve as the primary reference for agentic coding in this repository.

---

## Notes

- This is a client-side focused application with mock functionality intended for development and testing
- The summary and suggested questions are placeholder text - integrate with an AI API for real functionality
- File uploads currently store metadata in state only - implement backend storage as needed
- Build and production commands are included for completeness but primary focus is development
- Dark mode is supported via CSS variables and `.dark` class toggle
