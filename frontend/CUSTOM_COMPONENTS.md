# Custom UI Components Documentation

This document provides comprehensive documentation for all custom-built UI components in the BugRelay frontend. All Radix UI dependencies have been removed and replaced with fully custom implementations.

## Overview

All UI components are located in `src/components/ui/` and are built from scratch using React hooks and Context API. These components are:

- ✅ **Fully accessible** with proper ARIA attributes
- ✅ **Keyboard navigable** with appropriate key handlers
- ✅ **Type-safe** with TypeScript
- ✅ **Themeable** using Tailwind CSS and CSS variables
- ✅ **Zero external UI library dependencies**

## Table of Contents

1. [Button](#button)
2. [Card](#card)
3. [Input](#input)
4. [Textarea](#textarea)
5. [Select](#select)
6. [Dropdown Menu](#dropdown-menu)
7. [Dialog](#dialog)
8. [Tabs](#tabs)
9. [Toast](#toast)
10. [Form](#form)
11. [Badge](#badge)
12. [Switch](#switch)

---

## Button

**Location:** `src/components/ui/button.tsx`

A versatile button component with multiple variants and sizes.

### Usage

```tsx
import { Button } from "@/components/ui/button";

// Default button
<Button>Click me</Button>

// With variants
<Button variant="destructive">Delete</Button>
<Button variant="outline">Cancel</Button>
<Button variant="ghost">Ghost</Button>
<Button variant="link">Link</Button>

// With sizes
<Button size="sm">Small</Button>
<Button size="lg">Large</Button>
<Button size="icon"><Icon /></Button>

// As child (renders children with button styles)
<Button asChild>
  <Link href="/somewhere">Navigate</Link>
</Button>
```

### Props

- `variant`: `"default" | "destructive" | "outline" | "secondary" | "ghost" | "link"`
- `size`: `"default" | "sm" | "lg" | "icon"`
- `asChild`: `boolean` - Merges styles with child component

---

## Card

**Location:** `src/components/ui/card.tsx`

Container component for grouping related content.

### Usage

```tsx
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";

<Card>
  <CardHeader>
    <CardTitle>Card Title</CardTitle>
    <CardDescription>Card description goes here</CardDescription>
  </CardHeader>
  <CardContent>
    Main content
  </CardContent>
  <CardFooter>
    Footer content
  </CardFooter>
</Card>
```

---

## Input

**Location:** `src/components/ui/input.tsx`

Styled text input field with proper accessibility.

### Usage

```tsx
import { Input } from "@/components/ui/input";

<Input 
  type="text" 
  placeholder="Enter text"
  value={value}
  onChange={(e) => setValue(e.target.value)}
/>

<Input type="email" placeholder="Email" />
<Input type="password" placeholder="Password" />
```

### Props

Extends standard HTML `input` attributes.

---

## Textarea

**Location:** `src/components/ui/textarea.tsx`

Multi-line text input component.

### Usage

```tsx
import { Textarea } from "@/components/ui/textarea";

<Textarea 
  placeholder="Enter description"
  rows={4}
  value={value}
  onChange={(e) => setValue(e.target.value)}
/>
```

---

## Select

**Location:** `src/components/ui/select.tsx`

Custom dropdown select component with full keyboard navigation.

### Usage

```tsx
import { 
  Select, 
  SelectTrigger, 
  SelectValue, 
  SelectContent, 
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectGroup
} from "@/components/ui/select";

<Select value={value} onValueChange={setValue}>
  <SelectTrigger>
    <SelectValue placeholder="Select option" />
  </SelectTrigger>
  <SelectContent>
    <SelectGroup>
      <SelectLabel>Group Label</SelectLabel>
      <SelectItem value="option1">Option 1</SelectItem>
      <SelectItem value="option2">Option 2</SelectItem>
    </SelectGroup>
    <SelectSeparator />
    <SelectItem value="option3">Option 3</SelectItem>
  </SelectContent>
</Select>
```

### Features

- ✅ Controlled and uncontrolled modes
- ✅ Keyboard navigation (Arrow keys, Enter, Escape)
- ✅ Click outside to close
- ✅ Visual selection indicator
- ✅ Custom positioning

---

## Dropdown Menu

**Location:** `src/components/ui/dropdown-menu.tsx`

Contextual menu component with support for items, checkboxes, and radio groups.

### Usage

```tsx
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
} from "@/components/ui/dropdown-menu";

<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button variant="outline">Open Menu</Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent>
    <DropdownMenuLabel>My Account</DropdownMenuLabel>
    <DropdownMenuSeparator />
    <DropdownMenuItem>Profile</DropdownMenuItem>
    <DropdownMenuItem>Settings</DropdownMenuItem>
    <DropdownMenuSeparator />
    <DropdownMenuCheckboxItem checked={checked} onCheckedChange={setChecked}>
      Show Panel
    </DropdownMenuCheckboxItem>
    <DropdownMenuSeparator />
    <DropdownMenuRadioGroup value={value} onValueChange={setValue}>
      <DropdownMenuRadioItem value="option1">Option 1</DropdownMenuRadioItem>
      <DropdownMenuRadioItem value="option2">Option 2</DropdownMenuRadioItem>
    </DropdownMenuRadioGroup>
  </DropdownMenuContent>
</DropdownMenu>
```

### Features

- ✅ Auto-close on item selection
- ✅ Keyboard navigation (Escape to close)
- ✅ Click outside to close
- ✅ Checkbox and radio support
- ✅ Visual indicators for selection

---

## Dialog

**Location:** `src/components/ui/dialog.tsx`

Modal dialog component with overlay and proper focus management.

### Usage

```tsx
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";

<Dialog open={open} onOpenChange={setOpen}>
  <DialogTrigger asChild>
    <Button>Open Dialog</Button>
  </DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Dialog Title</DialogTitle>
      <DialogDescription>
        This is a description of what the dialog does.
      </DialogDescription>
    </DialogHeader>
    <div>Dialog content goes here</div>
    <DialogFooter>
      <DialogClose asChild>
        <Button variant="outline">Cancel</Button>
      </DialogClose>
      <Button>Confirm</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

### Features

- ✅ Controlled and uncontrolled modes
- ✅ Escape key to close
- ✅ Click outside overlay to close
- ✅ Body scroll lock when open
- ✅ Portal rendering (rendered at body level)
- ✅ Close button in top-right
- ✅ Smooth animations

---

## Tabs

**Location:** `src/components/ui/tabs.tsx`

Tabbed interface component with horizontal or vertical orientation.

### Usage

```tsx
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

<Tabs defaultValue="tab1" onValueChange={(value) => console.log(value)}>
  <TabsList>
    <TabsTrigger value="tab1">Tab 1</TabsTrigger>
    <TabsTrigger value="tab2">Tab 2</TabsTrigger>
    <TabsTrigger value="tab3">Tab 3</TabsTrigger>
  </TabsList>
  <TabsContent value="tab1">
    Content for tab 1
  </TabsContent>
  <TabsContent value="tab2">
    Content for tab 2
  </TabsContent>
  <TabsContent value="tab3">
    Content for tab 3
  </TabsContent>
</Tabs>

// Vertical orientation
<Tabs orientation="vertical" defaultValue="tab1">
  {/* ... */}
</Tabs>
```

### Features

- ✅ Controlled and uncontrolled modes
- ✅ Horizontal and vertical orientation
- ✅ Keyboard navigation (Arrow keys)
- ✅ ARIA attributes for accessibility
- ✅ Only renders active tab content

---

## Toast

**Location:** `src/components/ui/toast.tsx`

Non-blocking notification system with automatic dismissal.

### Usage

```tsx
import { useToast } from "@/components/ui/toast";

function MyComponent() {
  const { toast } = useToast();

  const showNotification = () => {
    toast({
      title: "Success!",
      description: "Your action was completed successfully.",
      type: "success",
      duration: 5000, // optional, defaults to 5000ms
    });
  };

  return <Button onClick={showNotification}>Show Toast</Button>;
}
```

### Setup

The `ToastProvider` must be included in your app's provider tree:

```tsx
import { ToastProvider } from "@/components/ui/toast";

function App({ children }) {
  return (
    <ToastProvider>
      {children}
    </ToastProvider>
  );
}
```

### Toast Types

- `success` - Green with checkmark icon
- `error` - Red with error icon
- `warning` - Yellow with warning icon
- `info` - Blue with info icon

### Features

- ✅ Auto-dismiss after duration
- ✅ Manual dismiss button
- ✅ Multiple toasts stacking
- ✅ Smooth entrance/exit animations
- ✅ Icon based on type
- ✅ Integrated with Zustand UI store

### useToast Hook

```tsx
const { toast, dismiss, dismissAll } = useToast();

// Add a toast
toast({ title: "Hello", type: "info" });

// Dismiss specific toast
dismiss(toastId);

// Dismiss all toasts
dismissAll();
```

---

## Form

**Location:** `src/components/ui/form.tsx`

Comprehensive form handling with validation and error management.

### Usage

```tsx
import { 
  Form, 
  FormField, 
  FormItem,
  FormLabel, 
  FormControl,
  FormDescription, 
  FormMessage 
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";

function MyForm() {
  const handleSubmit = async (values) => {
    console.log(values);
    // Handle form submission
  };

  const validate = (values) => {
    const errors = {};
    if (!values.email) {
      errors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(values.email)) {
      errors.email = "Email is invalid";
    }
    return errors;
  };

  return (
    <Form
      onSubmit={handleSubmit}
      validate={validate}
      initialValues={{ email: "", password: "" }}
    >
      <FormField name="email" label="Email" required>
        <FormControl name="email">
          <Input type="email" placeholder="you@example.com" />
        </FormControl>
      </FormField>

      <FormField 
        name="password" 
        label="Password"
        description="Must be at least 8 characters"
        required
      >
        <FormControl name="password">
          <Input type="password" />
        </FormControl>
      </FormField>

      <Button type="submit">Submit</Button>
    </Form>
  );
}
```

### Features

- ✅ Field-level validation
- ✅ Form-level validation
- ✅ Error messages
- ✅ Touch state tracking
- ✅ Initial values
- ✅ Field descriptions
- ✅ Required field indicators
- ✅ Accessible error announcements

### useFormField Hook

Access form state within custom components:

```tsx
const { 
  values, 
  errors, 
  touched,
  setFieldValue,
  setFieldError,
  validateField 
} = useFormField();
```

---

## Badge

**Location:** `src/components/ui/badge.tsx`

Small label component for status indicators or tags.

### Usage

```tsx
import { Badge } from "@/components/ui/badge";

<Badge>Default</Badge>
<Badge variant="secondary">Secondary</Badge>
<Badge variant="destructive">Destructive</Badge>
<Badge variant="outline">Outline</Badge>
```

### Props

- `variant`: `"default" | "secondary" | "destructive" | "outline"`

---

## Switch

**Location:** `src/components/ui/switch.tsx`

Toggle switch component (on/off control).

### Usage

```tsx
import { Switch } from "@/components/ui/switch";

<Switch checked={enabled} onCheckedChange={setEnabled} />

// With label
<div className="flex items-center space-x-2">
  <Switch id="notifications" checked={enabled} onCheckedChange={setEnabled} />
  <label htmlFor="notifications">Enable notifications</label>
</div>
```

### Props

- `checked`: `boolean` - Current state
- `onCheckedChange`: `(checked: boolean) => void` - Change handler
- `disabled`: `boolean` - Disable the switch

---

## Custom Components

### Status Badge

**Location:** `src/components/ui/status-badge.tsx`

Specialized badge for bug status display.

```tsx
import { StatusBadge } from "@/components/ui/status-badge";

<StatusBadge status="open" />
<StatusBadge status="in-progress" />
<StatusBadge status="resolved" />
<StatusBadge status="closed" />
```

### Bug Card

**Location:** `src/components/ui/bug-card.tsx`

Card component specifically designed for displaying bug reports.

```tsx
import { BugCard } from "@/components/ui/bug-card";

<BugCard
  bug={bugData}
  onVote={handleVote}
  onComment={handleComment}
/>
```

### Search Filters

**Location:** `src/components/ui/search-filters.tsx`

Comprehensive filtering interface for bug search.

```tsx
import { SearchFilters } from "@/components/ui/search-filters";

<SearchFilters
  filters={currentFilters}
  onFiltersChange={setFilters}
/>
```

### Loading

**Location:** `src/components/ui/loading.tsx`

Loading state components.

```tsx
import { LoadingSpinner, LoadingState } from "@/components/ui/loading";

<LoadingSpinner />
<LoadingSpinner size="lg" />

<LoadingState message="Loading bugs..." />
```

### Error Boundary

**Location:** `src/components/ui/error-boundary.tsx`

Error display components.

```tsx
import { ErrorMessage, ErrorBoundary } from "@/components/ui/error-boundary";

<ErrorMessage error={error} />

<ErrorBoundary>
  <YourComponent />
</ErrorBoundary>
```

---

## Styling

All components use Tailwind CSS with custom CSS variables defined in `globals.css`:

```css
:root {
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
  --primary: 221.2 83.2% 53.3%;
  --secondary: 210 40% 96.1%;
  /* ... more variables */
}

.dark {
  --background: 222.2 84% 4.9%;
  --foreground: 210 40% 98%;
  /* ... dark mode overrides */
}
```

## Accessibility

All components follow WAI-ARIA best practices:

- ✅ Proper role attributes
- ✅ ARIA labels and descriptions
- ✅ Keyboard navigation
- ✅ Focus management
- ✅ Screen reader announcements
- ✅ Color contrast compliance

## Testing

Components are tested with:

- **Jest** for unit tests
- **React Testing Library** for component tests
- **Playwright** for E2E tests

Example test:

```tsx
import { render, screen } from '@testing-library/react';
import { Button } from './button';

test('renders button with text', () => {
  render(<Button>Click me</Button>);
  expect(screen.getByText('Click me')).toBeInTheDocument();
});
```

---

## Migration from Radix UI

If you're migrating from Radix UI, here's what changed:

### Import Changes

**Before:**
```tsx
import * as Dialog from "@radix-ui/react-dialog";
```

**After:**
```tsx
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
```

### API Differences

Most components maintain similar APIs, but some differences:

1. **Portal components** - Radix's `Portal` is handled automatically in our Dialog
2. **Trigger asChild** - Still supported, works the same way
3. **Event handlers** - Same naming conventions maintained

### No Breaking Changes

The custom components are designed to be drop-in replacements, so minimal code changes should be required for most use cases.

---

## Performance

All components are optimized for performance:

- ✅ Memoized callbacks with `useCallback`
- ✅ Memoized values with `useMemo`
- ✅ Minimal re-renders with context optimization
- ✅ Lazy state initialization
- ✅ No unnecessary DOM operations

---

## Browser Support

Components are tested and work in:

- ✅ Chrome/Edge (latest 2 versions)
- ✅ Firefox (latest 2 versions)
- ✅ Safari (latest 2 versions)
- ✅ Mobile browsers (iOS Safari, Chrome Android)

---

## Contributing

When adding new UI components:

1. Create component in `src/components/ui/`
2. Add TypeScript types
3. Include accessibility features
4. Add tests
5. Document in this file
6. Export from `src/components/ui/index.ts`

---

## Resources

- [WAI-ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)
- [React Hooks Documentation](https://react.dev/reference/react)
- [Tailwind CSS](https://tailwindcss.com/)
- [TypeScript](https://www.typescriptlang.org/)

---

## Support

For questions or issues with components, please:

1. Check this documentation
2. Review component source code
3. Create an issue on GitHub
4. Contact the development team

---

**Last Updated:** 2024
**Version:** 1.0.0