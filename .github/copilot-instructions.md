# Copilot Instructions - Real Estate Management Dashboard

## Project Overview
Arabic-language (RTL) real estate and accounting management system built with React + TypeScript, using Supabase as backend. Features dual-interface design: **Sales (projects)** and **Accounting (expenses)**.

## Architecture

### Directory Structure
```
├── components/pages/
│   ├── sales/        # Sales interface: Units, Customers, Bookings, Payments
│   └── accounting/   # Accounting interface: Expenses, Treasury, Employees, Budgets
├── contexts/         # AuthContext (user/permissions), ProjectContext, ToastContext
├── src/services/     # supabaseService.ts (main data layer), storageService.ts
├── utils/            # permissions.ts, validation.ts, passwordUtils.ts
├── hooks/            # useButtonPermission, usePagination, useSafeAsync
└── types.ts          # All TypeScript interfaces
```

### Dual Interface System
- `InterfaceMode`: `'projects'` (sales) or `'expenses'` (accounting)
- User roles: `Admin` (all access), `Sales` (projects only), `Accounting` (expenses only)
- Pass `interfaceMode` prop to filter context-specific data

### Data Flow
1. Components → `supabaseService.ts` → Supabase client → PostgreSQL
2. Auth: `AuthContext.tsx` manages user state, permissions loaded via `loadUserDataByUserId()`
3. Permissions: `utils/permissions.ts` → `canShowButton()`, `canAccessPage()`

## Key Patterns

### Service Layer (`src/services/supabaseService.ts`)
All database operations use service objects. **FK constraint fix pattern**:
```typescript
// Convert empty strings to null for foreign keys
if (expense.accountId !== undefined) {
  dbUpdate.account_id = expense.accountId || null;
}
```

### Permission Checking
```typescript
// ✅ Correct: Two parameters
useButtonPermission('customers', 'add')

// ❌ Wrong: Single parameter causes TypeError
useButtonPermission('export_reports')
```

### Project Assignment Lookup
Users can be assigned to projects via role-specific fields:
```typescript
const userIdField = user.role === 'Sales' ? 'sales_user_id' : 'accounting_user_id';
// Fallback to 'assigned_user_id' if not found
```

### Admin-Only Content
```tsx
{currentUser?.role === 'Admin' && (
  <SensitiveComponent />
)}
```

## Development Commands
```bash
npm run dev      # Start Vite dev server
npm run build    # Production build
npm run preview  # Preview production build
```

## Database Schema
- 24 tables with RLS policies (see `supabase-migrations/COMPLETE-DATABASE-SCHEMA.sql`)
- Key tables: `users`, `projects`, `units`, `customers`, `bookings`, `payments`, `expenses`
- Default admin: `username: admin`, `password: 123456`

## Validation Requirements
- Use `utils/validation.ts` functions: `validateEmail()`, `validateUsername()`, `validatePassword()`
- Passwords: min 8 chars, uppercase, lowercase, number
- Arabic text support in username validation: `/^[a-zA-Z0-9_\u0600-\u06FF]+$/`

## UI Conventions
- RTL layout (Arabic interface)
- TailwindCSS with dark mode support (`dark:` variants)
- GSAP for chart animations
- Custom SVG charts with viewBox for responsiveness
- Icons from `lucide-react`

## Critical Files to Review
- [types.ts](../types.ts) - All data interfaces
- [permissions.ts](../utils/permissions.ts) - RBAC system with `SYSTEM_RESOURCES`, `SALES_MENUS`, `ACCOUNTING_MENUS`
- [AuthContext.tsx](../contexts/AuthContext.tsx) - Authentication and permission loading
- [supabaseService.ts](../src/services/supabaseService.ts) - Database service layer

## Common Gotchas
1. **Empty strings break FK constraints** - Always convert to `null`
2. **Permission hooks need both `pageKey` and `buttonKey`**
3. **InterfaceMode filtering** - Check `interfaceMode === 'projects'` vs `'expenses'`
4. **User project assignment** - Check role-specific fields first, then fallback
