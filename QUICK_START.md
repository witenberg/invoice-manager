# Quick Start Guide - Invoice Manager

## 🚀 Szybki Start

### Nowe Komponenty i Utilities

#### 1. Strony Błędów

```tsx
// Automatycznie - Next.js używa tych plików:
// - src/app/not-found.tsx (404)
// - src/app/error.tsx (500)
// - src/app/loading.tsx (Loading)
// - src/app/unauthorized/page.tsx (401)

// W kodzie:
import { notFound } from "next/navigation"

if (!data) {
  notFound() // Pokazuje piękną stronę 404
}
```

#### 2. Route Guards - Ochrona Tras

```tsx
import { requireAuth, requireCompanyAccess } from "@/lib/route-guards"

export default async function ProtectedPage({ params }) {
  // Wymaga logowania
  const session = await requireAuth()
  
  // Wymaga dostępu do firmy
  await requireCompanyAccess(params.companyId, ["OWNER"])
  
  return <div>Protected Content</div>
}
```

#### 3. Empty State - Brak Danych

```tsx
import { EmptyState } from "@/components/ui/empty-state"
import { FileText } from "lucide-react"

{items.length === 0 && (
  <EmptyState
    icon={FileText}
    title="Brak elementów"
    description="Nie masz jeszcze żadnych elementów."
    action={{
      label: "Dodaj pierwszy",
      href: "/items/new"
    }}
  />
)}
```

#### 4. Loading States

```tsx
import { LoadingSpinner, LoadingPage } from "@/components/ui/loading-spinner"

// Inline spinner
<LoadingSpinner size="md" />

// Pełna strona
<LoadingPage message="Ładowanie..." />

// Skeletony
<SkeletonText className="w-1/2" />
<SkeletonCard />
```

#### 5. Status Badges

```tsx
import { StatusBadge, KsefStatusBadge } from "@/components/ui/status-badge"

<StatusBadge status="success" label="Gotowe" />
<StatusBadge status="error" label="Błąd" />

// Dla faktur KSeF
<KsefStatusBadge status="VALID" />
```

#### 6. Page Header

```tsx
import { PageHeader } from "@/components/ui/page-header"

<PageHeader
  title="Moja Strona"
  description="Opis strony"
>
  <Button>Akcja</Button>
</PageHeader>
```

#### 7. Format Utilities

```tsx
import { formatDate, formatCurrency, formatNip } from "@/lib/format-utils"

formatDate(new Date()) // "2 grudnia 2025"
formatCurrency(1234.56) // "1 234,56 zł"
formatNip("1234567890") // "123-456-78-90"
formatFileSize(1024000) // "1 MB"
getRelativeTime(pastDate) // "2 dni temu"
```

#### 8. Validation Helpers

```tsx
import { isValidNip, validatePasswordStrength } from "@/lib/validation-helpers"

// Walidacja NIP z sumą kontrolną
if (!isValidNip(nip)) {
  throw new Error("Nieprawidłowy NIP")
}

// Siła hasła
const { isValid, score, feedback } = validatePasswordStrength(password)
```

---

## 📁 Struktura Nowych Plików

```
src/
├── app/
│   ├── not-found.tsx          # Global 404
│   ├── error.tsx              # Global error boundary
│   ├── loading.tsx            # Global loading
│   ├── unauthorized/
│   │   └── page.tsx           # 401 page
│   ├── login/
│   │   └── loading.tsx        # Login loading
│   └── onboarding/
│       └── loading.tsx        # Onboarding loading
│
├── components/
│   ├── ui/
│   │   ├── empty-state.tsx    # Empty state component
│   │   ├── page-header.tsx    # Page header
│   │   ├── loading-spinner.tsx # Loading components
│   │   └── status-badge.tsx   # Status badges
│   └── maintenance-mode.tsx   # Maintenance components
│
├── lib/
│   ├── route-guards.ts        # Route protection
│   ├── format-utils.ts        # Formatting utilities
│   └── validation-helpers.ts  # Validation utilities
│
└── middleware.ts              # Security headers
```

---

## 🎯 Najczęstsze Scenariusze

### Scenariusz 1: Nowa Chroniona Strona

```tsx
// src/app/dashboard/companies/[id]/page.tsx
import { requireAuth, requireCompanyAccess } from "@/lib/route-guards"
import { PageHeader } from "@/components/ui/page-header"
import { notFound } from "next/navigation"

export default async function CompanyPage({ params }) {
  // 1. Sprawdź autentykację
  const session = await requireAuth()
  
  // 2. Sprawdź dostęp do firmy
  await requireCompanyAccess(params.id, ["OWNER", "ACCOUNTANT"])
  
  // 3. Pobierz dane
  const company = await getCompany(params.id)
  if (!company) notFound()
  
  // 4. Wyświetl stronę
  return (
    <div>
      <PageHeader title={company.name} description="Zarządzaj firmą">
        <Button>Edytuj</Button>
      </PageHeader>
      
      {/* Treść */}
    </div>
  )
}
```

### Scenariusz 2: Lista z Empty State

```tsx
import { EmptyState } from "@/components/ui/empty-state"
import { FileText } from "lucide-react"

export default async function InvoicesPage() {
  const invoices = await getInvoices()
  
  if (invoices.length === 0) {
    return (
      <EmptyState
        icon={FileText}
        title="Brak faktur"
        description="Nie masz jeszcze żadnych faktur. Utwórz pierwszą."
        action={{
          label: "Utwórz fakturę",
          href: "/invoices/new"
        }}
      />
    )
  }
  
  return <InvoicesList invoices={invoices} />
}
```

### Scenariusz 3: Formularz z Walidacją

```tsx
"use client"

import { isValidNip, isValidPostalCode } from "@/lib/validation-helpers"

export function CompanyForm() {
  const validateForm = (formData: FormData) => {
    const nip = formData.get("nip") as string
    const postalCode = formData.get("postalCode") as string
    
    const errors: Record<string, string> = {}
    
    if (!isValidNip(nip)) {
      errors.nip = "Nieprawidłowy NIP"
    }
    
    if (!isValidPostalCode(postalCode)) {
      errors.postalCode = "Nieprawidłowy kod pocztowy (XX-XXX)"
    }
    
    return errors
  }
  
  // ... reszta formularza
}
```

### Scenariusz 4: Wyświetlanie Statusu

```tsx
import { KsefStatusBadge } from "@/components/ui/status-badge"
import { formatDate, formatCurrency } from "@/lib/format-utils"

export function InvoiceRow({ invoice }) {
  return (
    <tr>
      <td>{invoice.number}</td>
      <td><KsefStatusBadge status={invoice.ksefStatus} /></td>
      <td>{formatDate(invoice.issueDate)}</td>
      <td>{formatCurrency(invoice.totalGross)}</td>
    </tr>
  )
}
```

---

## 🔧 Konfiguracja

### Middleware (już skonfigurowane)
Middleware automatycznie dodaje security headers do wszystkich requestów.

### TypeScript
Wszystkie nowe komponenty są w pełni otypowane - używaj auto-complete!

---

## 💡 Pro Tips

1. **Zawsze używaj route guards** dla chronionych stron
2. **Używaj PageHeader** dla spójności
3. **Używaj EmptyState** zamiast pustych div'ów
4. **Używaj format utilities** dla dat i walut
5. **Używaj validation helpers** dla wszystkich inputów użytkownika
6. **Dodawaj loading.tsx** dla każdej ważnej trasy
7. **Używaj StatusBadge** dla wszystkich statusów

---

## 📚 Pełna Dokumentacja

- **REFACTORING_SUMMARY.md** - Szczegóły refaktoryzacji
- **DEVELOPER_GUIDE.md** - Przewodnik dla developerów
- **GLOBAL_IMPROVEMENTS.md** - Szczegóły nowych komponentów

---

## ✅ Checklist dla Nowej Funkcji

- [ ] Dodano route guards jeśli potrzebne
- [ ] Dodano loading.tsx
- [ ] Obsłużono empty state
- [ ] Dodano error handling
- [ ] Użyto format utilities
- [ ] Użyto validation helpers
- [ ] Dodano TypeScript types
- [ ] Przetestowano wszystkie scenariusze

---

**Gotowe do użycia! 🎉**

Wszystkie komponenty i utilities są production-ready i w pełni otypowane.

