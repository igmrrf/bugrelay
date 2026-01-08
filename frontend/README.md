# BugRelay Frontend

A modern, accessible, and fully custom React frontend for the BugRelay bug tracking platform.

## 🎨 Tech Stack

- **Framework:** Next.js 15 with App Router
- **Language:** TypeScript
- **Styling:** Tailwind CSS 4
- **State Management:** Zustand
- **Data Fetching:** TanStack Query (React Query)
- **UI Components:** 100% Custom-built (no external UI libraries)
- **Icons:** Lucide React
- **Theme:** next-themes (dark/light mode)

## ✨ Key Features

- ✅ **Zero External UI Dependencies** - All components built from scratch
- ✅ **Fully Accessible** - WCAG compliant with ARIA attributes
- ✅ **Dark Mode** - Complete theme support
- ✅ **Type-Safe** - Full TypeScript coverage
- ✅ **Responsive** - Mobile-first design
- ✅ **Tested** - Comprehensive test coverage

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and npm
- Backend API running on port 8080 (or configure `NEXT_PUBLIC_API_URL`)

### Installation

```bash
# Install dependencies
npm install

# Copy environment variables (if needed)
cp .env.example .env.local

# Start development server
npm run dev
```

The app will be available at [http://localhost:3000](http://localhost:3000).

## 📦 Scripts

```bash
# Development
npm run dev              # Start dev server with hot reload

# Building
npm run build            # Create production build
npm run start            # Start production server

# Testing
npm run test             # Run unit tests
npm run test:watch       # Run tests in watch mode
npm run test:coverage    # Generate coverage report
npm run test:e2e         # Run E2E tests with Playwright
npm run test:e2e:ui      # Run E2E tests with UI
npm run test:e2e:debug   # Debug E2E tests

# Type Checking
npm run type-check       # Check TypeScript types
```

## 🎨 Custom UI Components

All UI components are custom-built without external UI library dependencies. See [CUSTOM_COMPONENTS.md](./CUSTOM_COMPONENTS.md) for detailed documentation.

### Available Components

**Core Components:**
- Button - Multiple variants and sizes
- Card - Container with header, content, footer
- Input - Text input with validation
- Textarea - Multi-line text input
- Select - Dropdown select with keyboard navigation
- Dropdown Menu - Context menu with items, checkboxes, radio groups
- Dialog - Modal with overlay and focus management
- Tabs - Tabbed interface (horizontal/vertical)
- Toast - Notification system
- Form - Form handling with validation
- Badge - Status labels and tags
- Switch - Toggle switch control

**Custom Components:**
- Status Badge - Bug status indicators
- Bug Card - Bug report display card
- Search Filters - Bug search interface
- Loading - Loading states and spinners
- Error Boundary - Error handling components

### Component Usage

```tsx
import { Button, Card, Dialog, Toast, useToast } from "@/components/ui";

// Button with variants
<Button variant="destructive">Delete</Button>

// Dialog
<Dialog open={open} onOpenChange={setOpen}>
  <DialogTrigger>Open</DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Title</DialogTitle>
    </DialogHeader>
  </DialogContent>
</Dialog>

// Toast notifications
const { toast } = useToast();
toast({ title: "Success!", type: "success" });
```

## 📁 Project Structure

```
frontend/
├── src/
│   ├── app/                    # Next.js app router pages
│   │   ├── (auth)/            # Auth-related pages
│   │   ├── bugs/              # Bug pages
│   │   ├── companies/         # Company pages
│   │   └── ...                # Other pages
│   ├── components/
│   │   ├── ui/                # Custom UI components
│   │   ├── auth/              # Authentication components
│   │   ├── bugs/              # Bug-related components
│   │   ├── companies/         # Company components
│   │   ├── admin/             # Admin components
│   │   └── layout/            # Layout components
│   ├── lib/
│   │   ├── api/               # API client and endpoints
│   │   ├── hooks/             # Custom React hooks
│   │   ├── stores/            # Zustand stores
│   │   ├── utils/             # Utility functions
│   │   └── types/             # TypeScript types
│   └── test/
│       ├── integration/       # Integration tests
│       └── e2e/              # End-to-end tests
├── public/                    # Static assets
└── ...config files
```

## 🔧 Configuration

### Environment Variables

Create a `.env.local` file:

```env
# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:8080/api/v1

# OAuth (optional)
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_google_client_id
NEXT_PUBLIC_GITHUB_CLIENT_ID=your_github_client_id
```

### Theme Configuration

Customize theme colors in `src/app/globals.css`:

```css
:root {
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
  --primary: 221.2 83.2% 53.3%;
  /* ... more variables */
}
```

## 🧪 Testing

### Unit Tests

```bash
# Run all tests
npm run test

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage
```

### E2E Tests

```bash
# Install browsers (first time only)
npm run playwright:install

# Run E2E tests
npm run test:e2e

# Run with UI
npm run test:e2e:ui

# Debug mode
npm run test:e2e:debug
```

## 🎯 State Management

### Zustand Stores

- **Auth Store** (`useAuthStore`) - User authentication state
- **Bug Store** (`useBugStore`) - Bug data and filters
- **Company Store** (`useCompanyStore`) - Company data
- **UI Store** (`useUIStore`) - UI state, toasts, modals

```tsx
import { useAuthStore, useUIStore } from "@/lib/stores";

// Auth store
const { user, login, logout } = useAuthStore();

// UI store
const { addToast } = useUIStore();
addToast({ title: "Hello", type: "success" });
```

## 🌐 API Integration

### API Client

All API calls go through the centralized API client:

```tsx
import { APIClient } from "@/lib/api/client";

const api = new APIClient();

// Automatic error handling
// Automatic retries
// Automatic auth token injection
```

### React Query Hooks

```tsx
import { useBugs, useCreateBug, useBug } from "@/lib/hooks";

// Fetch bugs
const { data: bugs, isLoading } = useBugs(filters);

// Create bug
const createBug = useCreateBug();
createBug.mutate(bugData);

// Single bug
const { data: bug } = useBug(bugId);
```

## ♿ Accessibility

All components follow WCAG 2.1 Level AA standards:

- ✅ Semantic HTML elements
- ✅ ARIA attributes and roles
- ✅ Keyboard navigation
- ✅ Focus management
- ✅ Screen reader support
- ✅ Color contrast compliance
- ✅ Skip navigation links

## 🎨 Styling

### Tailwind CSS

The project uses Tailwind CSS 4 with custom configuration:

```tsx
// Use cn() utility for conditional classes
import { cn } from "@/lib/utils";

<div className={cn(
  "base-class",
  condition && "conditional-class"
)} />
```

### Dark Mode

Theme switching is handled by `next-themes`:

```tsx
import { useTheme } from "next-themes";

const { theme, setTheme } = useTheme();
setTheme("dark"); // or "light" or "system"
```

## 🔒 Authentication

### Login Flow

```tsx
import { useLogin } from "@/lib/hooks/use-auth-queries";

const login = useLogin();
login.mutate({ email, password });
```

### Protected Routes

Protected routes automatically redirect to login:

```tsx
"use client";

import { useAuthStore } from "@/lib/stores/auth-store";
import { redirect } from "next/navigation";

export default function ProtectedPage() {
  const { isAuthenticated } = useAuthStore();
  
  if (!isAuthenticated) {
    redirect("/login");
  }
  
  return <div>Protected Content</div>;
}
```

## 📊 Performance

### Optimization Features

- ✅ **Code Splitting** - Automatic with Next.js App Router
- ✅ **Image Optimization** - Next.js Image component
- ✅ **Font Optimization** - next/font
- ✅ **Lazy Loading** - React.lazy for heavy components
- ✅ **Memoization** - useMemo and useCallback
- ✅ **Query Caching** - TanStack Query cache

### Bundle Size

After migration to custom components:
- Reduced bundle size by ~200KB (minified)
- Zero external UI library dependencies
- Improved tree-shaking

## 🐛 Debugging

### Development Tools

```tsx
// Enable React Query DevTools
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";

// In providers.tsx
<ReactQueryDevtools initialIsOpen={false} />
```

### Logging

```tsx
import { logger } from "@/lib/logging";

logger.info("Info message", "context");
logger.error("Error message", "context", error);
logger.debug("Debug message", "context", { data });
```

## 🚢 Deployment

### Production Build

```bash
# Build for production
npm run build

# Start production server
npm run start
```

### Environment Variables

Set production environment variables:

```env
NEXT_PUBLIC_API_URL=https://api.bugrelay.com/api/v1
```

### Docker

```bash
# Build image
docker build -t bugrelay-frontend .

# Run container
docker run -p 3000:3000 bugrelay-frontend
```

## 🤝 Contributing

### Code Style

- Follow existing patterns and conventions
- Use TypeScript for all new files
- Write tests for new features
- Follow accessibility guidelines
- Document complex logic

### Component Guidelines

When creating new components:

1. Add TypeScript types for all props
2. Include accessibility features (ARIA attributes)
3. Support keyboard navigation
4. Add unit tests
5. Document in CUSTOM_COMPONENTS.md
6. Export from `src/components/ui/index.ts`

### Git Workflow

```bash
# Create feature branch
git checkout -b feature/your-feature

# Make changes and commit
git commit -m "feat: add new feature"

# Push and create PR
git push origin feature/your-feature
```

## 📚 Documentation

- [Custom Components](./CUSTOM_COMPONENTS.md) - Complete UI component documentation
- [API Documentation](../docs/api/) - Backend API reference
- [Contributing Guide](../CONTRIBUTING.md) - How to contribute

## 🔗 Related Packages

- [Backend API](../backend/) - Go API server
- [Documentation](../docs/) - Project documentation
- [Docker Setup](../docker-compose.yml) - Container orchestration

## 📝 Migration Notes

This project has been migrated from Radix UI to custom components. See [RADIX_MIGRATION.md](../RADIX_MIGRATION.md) for details.

## 📄 License

MIT License - see [LICENSE](../LICENSE) for details.

---

**Built with ❤️ by the BugRelay team**