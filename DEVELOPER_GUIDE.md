# Developer Quick Reference Guide

## Type System Overview

### Importing Types

```typescript
// ✅ Recommended: Use centralized exports
import type { ActionState, SafeError, Company } from '@/types'

// ⚠️ Also valid: Import from specific files
import type { ActionState } from '@/types/action-types'
import { SafeError } from '@/types/error-types'
```

### Common Type Patterns

#### Server Actions

```typescript
import type { ActionState } from '@/types'

export async function myAction(
  prevState: ActionState | null,
  formData: FormData
): Promise<ActionState> {
  try {
    // Your logic here
    
    return { success: true, message: 'Success!' }
  } catch (error) {
    return { 
      success: false, 
      message: getSafeErrorMessage(error) 
    }
  }
}
```

#### Database Queries

```typescript
import type { Company } from '@/types'
import { db } from '@/db'
import { companies } from '@/db/schema'

async function getCompany(id: number): Promise<Company | null> {
  const [company] = await db
    .select()
    .from(companies)
    .where(eq(companies.id, id))
    .limit(1)
  
  return company ?? null
}
```

#### Service Methods

```typescript
import { SafeError } from '@/types'

class MyService {
  async myMethod(userId: string): Promise<Result> {
    // Validate input
    if (!userId) {
      throw new SafeError('User ID is required')
    }
    
    try {
      // Your logic
      return result
    } catch (error) {
      // Re-throw SafeError, wrap others
      if (error instanceof SafeError) {
        throw error
      }
      throw new SafeError('Operation failed')
    }
  }
}
```

---

## Error Handling Patterns

### User-Facing Errors

```typescript
import { SafeError } from '@/types'

// ✅ Good: User will see this message
throw new SafeError('Firma o podanym NIP już istnieje w systemie.')

// ❌ Bad: Exposes internal details
throw new Error('Unique constraint violation on companies.nip')
```

### Logging Errors

```typescript
import { getSafeErrorMessage } from '@/types'

try {
  // risky operation
} catch (error) {
  // Log full error for debugging (dev only)
  if (process.env.NODE_ENV === 'development') {
    console.error('Full error:', error)
  }
  
  // Return safe message to user
  return { error: getSafeErrorMessage(error) }
}
```

### Custom Error Classes

```typescript
export class MyCustomError extends Error {
  constructor(
    message: string,
    public readonly code?: string,
    public readonly cause?: unknown
  ) {
    super(message)
    this.name = 'MyCustomError'
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, MyCustomError)
    }
  }
}
```

---

## Authentication Patterns

### Getting Session

```typescript
import { auth } from '@/auth'

// In Server Component
export default async function MyPage() {
  const session = await auth()
  
  if (!session?.user?.id) {
    redirect('/login')
  }
  
  // session.user.id and session.user.companies are now available
}
```

### Checking Permissions

```typescript
import { auth } from '@/auth'
import { SafeError } from '@/types'

export async function myAction() {
  const session = await auth()
  
  if (!session?.user?.id) {
    throw new SafeError('Musisz być zalogowany')
  }
  
  // Check if user belongs to company
  const hasAccess = session.user.companies.some(
    c => c.companyId === targetCompanyId
  )
  
  if (!hasAccess) {
    throw new SafeError('Brak dostępu do tej firmy')
  }
}
```

---

## Form Handling with React 19

### Server Action

```typescript
'use server'

import { z } from 'zod'
import type { ActionState } from '@/types'

const schema = z.object({
  name: z.string().min(2),
  email: z.string().email()
})

export async function submitForm(
  prevState: ActionState | null,
  formData: FormData
): Promise<ActionState> {
  // Parse and validate
  const rawData = Object.fromEntries(formData.entries())
  const validated = schema.safeParse(rawData)
  
  if (!validated.success) {
    return {
      success: false,
      message: 'Błędy w formularzu',
      errors: validated.error.flatten().fieldErrors
    }
  }
  
  // Process data
  try {
    // ... your logic
    return { success: true, message: 'Zapisano' }
  } catch (error) {
    return { 
      success: false, 
      message: getSafeErrorMessage(error) 
    }
  }
}
```

### Client Component

```typescript
'use client'

import { useActionState } from 'react'
import type { ActionState } from '@/types'

export function MyForm() {
  const [state, action, isPending] = useActionState<
    ActionState | null,
    FormData
  >(submitForm, null)
  
  const getFieldError = (field: string) => {
    return state?.errors?.[field]?.[0]
  }
  
  return (
    <form action={action}>
      <input 
        name="name" 
        aria-invalid={!!getFieldError('name')}
      />
      {getFieldError('name') && (
        <p className="text-destructive">{getFieldError('name')}</p>
      )}
      
      <button disabled={isPending}>
        {isPending ? 'Saving...' : 'Save'}
      </button>
    </form>
  )
}
```

---

## Database Patterns

### Safe Queries

```typescript
import { db } from '@/db'
import { companies } from '@/db/schema'
import { eq } from 'drizzle-orm'

// ✅ Good: Returns array (empty if not found)
const results = await db
  .select()
  .from(companies)
  .where(eq(companies.userId, userId))

// ✅ Good: Explicit null handling
const [company] = await db
  .select()
  .from(companies)
  .where(eq(companies.id, id))
  .limit(1)

if (!company) {
  throw new SafeError('Firma nie została znaleziona')
}
```

### Transactions

```typescript
import { db } from '@/db'

// ✅ Use transactions for multi-step operations
await db.transaction(async (tx) => {
  const [company] = await tx.insert(companies).values({...}).returning()
  
  await tx.insert(companyMembers).values({
    companyId: company.id,
    userId: userId
  })
  
  // If any step fails, entire transaction rolls back
})
```

---

## Testing Utilities

### Type Testing

```typescript
import type { Company } from '@/types'

// Ensure types are correct
const company: Company = {
  id: 1,
  name: 'Test',
  nip: '1234567890',
  addressData: {...},
  createdAt: new Date()
}
```

### Mock Data

```typescript
// test/mocks/company.ts
import type { Company } from '@/types'

export const mockCompany: Company = {
  id: 1,
  name: 'Test Company',
  nip: '1234567890',
  addressData: {
    street: 'Test St',
    buildingNumber: '1',
    city: 'Warsaw',
    postalCode: '00-000',
    countryCode: 'PL'
  },
  createdAt: new Date('2024-01-01')
}
```

---

## Common Pitfalls & Solutions

### ❌ Problem: Type assertion overuse

```typescript
// ❌ Bad
const user = data.user as User
const id = token.id as string
```

```typescript
// ✅ Good
import type { User } from '@/types'

function isUser(obj: unknown): obj is User {
  return typeof obj === 'object' && obj !== null && 'id' in obj
}

if (isUser(data.user)) {
  // data.user is now typed as User
}
```

### ❌ Problem: Unsafe error messages

```typescript
// ❌ Bad: Exposes stack trace to user
catch (error) {
  return { error: error.message }
}
```

```typescript
// ✅ Good: Sanitized error
import { getSafeErrorMessage } from '@/types'

catch (error) {
  return { error: getSafeErrorMessage(error) }
}
```

### ❌ Problem: Missing null checks

```typescript
// ❌ Bad
const company = await getCompany(id)
return company.name // Might crash
```

```typescript
// ✅ Good
const company = await getCompany(id)
if (!company) {
  throw new SafeError('Company not found')
}
return company.name
```

---

## Code Style Guidelines

### Naming Conventions

```typescript
// ✅ Types: PascalCase
type UserData = {...}
interface CompanyInfo {...}

// ✅ Functions: camelCase
function getUserById() {}
async function createCompany() {}

// ✅ Constants: UPPER_SNAKE_CASE
const MAX_RETRIES = 3
const DEFAULT_TIMEOUT = 5000

// ✅ React Components: PascalCase
function UserProfile() {}
export function CompanyForm() {}
```

### File Naming

```typescript
// ✅ Types: kebab-case with .ts
auth-types.ts
database-types.ts

// ✅ Components: PascalCase with .tsx
UserProfile.tsx
CompanyForm.tsx

// ✅ Utilities: kebab-case with .ts
encryption.ts
validation-helpers.ts

// ✅ Server Actions: kebab-case with -actions.ts
auth-actions.ts
company-actions.ts
```

### Import Order

```typescript
// 1. External dependencies
import { useState } from 'react'
import { z } from 'zod'

// 2. Internal aliases (@/)
import { db } from '@/db'
import { auth } from '@/auth'
import type { Company } from '@/types'

// 3. Relative imports
import { Button } from '../../components/ui/button'
import { MyComponent } from './MyComponent'
```

---

## Performance Tips

### Database Queries

```typescript
// ✅ Good: Use limit to prevent over-fetching
.limit(100)

// ✅ Good: Use select to fetch only needed fields
.select({
  id: companies.id,
  name: companies.name
})

// ✅ Good: Use proper indexes (defined in schema)
index('invitation_email_idx').on(t.email)
```

### Caching

```typescript
// ✅ Good: Cache stable data
const res = await fetch(url, {
  next: { revalidate: 3600 } // 1 hour
})

// ✅ Good: Use RAM cache for hot data
let cachedKey: string | null = null
if (cachedKey) return cachedKey
```

---

## Deployment Checklist

- [ ] No linter errors (`npm run lint`)
- [ ] Types check passes (`npm run type-check`)
- [ ] Tests pass (`npm run test`)
- [ ] Environment variables set
- [ ] Database migrations applied
- [ ] Error monitoring configured
- [ ] Logging reviewed

---

## Getting Help

### Resources

- [Next.js 16 Documentation](https://nextjs.org/docs)
- [React 19 Documentation](https://react.dev)
- [Drizzle ORM Documentation](https://orm.drizzle.team)
- [NextAuth.js Documentation](https://next-auth.js.org)

### Internal Documentation

- `REFACTORING_SUMMARY.md` - Full refactoring details
- `src/types/` - Type definitions and interfaces
- JSDoc comments in service files

---

**Last Updated:** December 2, 2025

