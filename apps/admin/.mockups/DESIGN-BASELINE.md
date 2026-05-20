# Admin mockup design baseline

**Required reading for every `.mockups/` HTML file.** Any mockup that doesn't match this is rejected.

The baseline is extracted from the actual shipped admin app — `apps/admin/src/app/layout/admin-shell.component.ts`, `features/orders/orders-list-page.component.ts`, `features/admin-users/users-list.component.html`. Don't reinvent.

---

## 1. HTML scaffold (copy this exact `<head>`)

Mockups render via Tailwind CDN with the admin's actual `brand` palette injected. **Do not write custom CSS for colors, spacing, or typography** — use Tailwind classes only.

```html
<!doctype html>
<html lang="en" class="h-full">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>v1.5 <FEATURE> — Behbehani CPO Back Office</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      theme: {
        extend: {
          colors: {
            brand: {
              50:  '#eff6ff', 100: '#dbeafe', 200: '#bfdbfe',
              400: '#60a5fa', 500: '#3b82f6', 600: '#2563eb',
              700: '#1d4ed8', 800: '#1e40af', 900: '#1e3a8a',
            },
          },
          fontFamily: {
            sans: ['Inter', 'system-ui', 'sans-serif'],
          },
        },
      },
    };
  </script>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style> body { font-family: 'Inter', system-ui, sans-serif; } </style>
</head>
<body class="h-full bg-slate-50 text-slate-900">
```

## 2. Required layout shell (mockup MUST render inside this)

The mockup is a full-page render that includes the sidebar + topbar. Drop your page content where indicated.

```html
<div class="flex h-screen overflow-hidden">

  <!-- LEFT SIDEBAR — bg-slate-900, w-60 -->
  <aside class="w-60 flex-shrink-0 bg-slate-900 flex flex-col h-full">
    <!-- Brand mark -->
    <div class="flex items-center gap-2.5 px-4 py-4 border-b border-slate-800">
      <div class="w-9 h-9 rounded-lg bg-white flex items-center justify-center flex-shrink-0">
        <svg class="w-6 h-6 text-brand-700" viewBox="0 0 64 40" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linejoin="round">
          <path d="M2 38 L20 4 L38 38 Z"/><path d="M26 38 L44 12 L62 38 Z"/>
        </svg>
      </div>
      <div>
        <p class="text-xs font-bold tracking-widest text-brand-400 uppercase leading-none">Behbehani CPO</p>
        <p class="text-xs text-slate-500 leading-tight mt-0.5">Back Office</p>
      </div>
    </div>
    <!-- Nav: section labels + items -->
    <nav class="flex-1 overflow-y-auto px-2 py-3 space-y-5">
      <!-- Section -->
      <div>
        <p class="px-3 mb-1 text-xs font-semibold tracking-wider text-slate-500 uppercase">SectionName</p>
        <div class="space-y-0.5">
          <!-- ACTIVE item — bg-brand-700 text-white -->
          <a href="#" class="flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium bg-brand-700 text-white">
            <svg class="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><!-- icon --></svg>
            ItemLabel
          </a>
          <!-- INACTIVE item -->
          <a href="#" class="flex items-center gap-2.5 px-3 py-2 rounded-md text-sm text-slate-300 hover:bg-slate-800 hover:text-white transition-colors">
            <svg class="w-4 h-4 flex-shrink-0 text-slate-500" ...>
            ItemLabel
          </a>
          <!-- DISABLED coming-soon -->
          <span aria-disabled="true" class="flex items-center gap-2.5 px-3 py-2 rounded-md text-sm text-slate-500 cursor-not-allowed">
            <svg class="w-4 h-4 flex-shrink-0 text-slate-500" ...>
            ItemLabel
          </span>
        </div>
      </div>
    </nav>
    <!-- User footer -->
    <div class="border-t border-slate-800 px-3 py-3">
      <button class="w-full flex items-center gap-2.5 rounded-md px-2 py-2 hover:bg-slate-800 transition-colors text-left">
        <div class="w-7 h-7 rounded-full bg-brand-700 flex items-center justify-center"><span class="text-xs font-bold text-white">AB</span></div>
        <div class="flex-1 min-w-0">
          <p class="text-xs font-medium text-slate-200 truncate">Ahmed Behbehani</p>
          <p class="text-xs text-slate-500 truncate">Operations Manager</p>
        </div>
      </button>
    </div>
  </aside>

  <!-- MAIN COLUMN -->
  <div class="flex-1 flex flex-col overflow-hidden">

    <!-- TOPBAR — h-14, bg-white -->
    <header class="flex-shrink-0 h-14 bg-white border-b border-slate-200 flex items-center justify-between px-6 gap-4">
      <span class="text-sm font-semibold text-slate-700 hidden sm:block">Behbehani CPO · Back office</span>
      <div class="flex-1"></div>
      <div class="flex items-center gap-3">
        <button class="relative p-2 rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-700">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/></svg>
        </button>
        <span class="hidden lg:inline-flex items-center rounded-full border bg-blue-50 border-blue-200 px-2.5 py-0.5 text-xs font-medium text-blue-700">Staging</span>
        <button class="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-slate-100">
          <div class="w-7 h-7 rounded-full bg-brand-700 flex items-center justify-center"><span class="text-xs font-bold text-white">AB</span></div>
          <span class="hidden md:block text-xs text-slate-700 font-medium">Ahmed Behbehani</span>
        </button>
      </div>
    </header>

    <!-- CONTENT — bg-slate-50, p-6, scrollable. Inner pages use max-w-6xl mx-auto. -->
    <main class="flex-1 overflow-y-auto bg-slate-50 p-6">
      <div class="max-w-6xl mx-auto">

        <!-- ▼▼▼ YOUR PAGE CONTENT GOES HERE ▼▼▼ -->

      </div>
    </main>

  </div>
</div>
```

---

## 3. Page header (every page starts with this pattern)

```html
<div class="flex items-start justify-between mb-5 gap-4 flex-wrap">
  <div>
    <h1 class="text-xl font-semibold text-slate-800">Page Title</h1>
    <p class="text-sm text-slate-500 mt-1">42 items total</p>
  </div>
  <!-- Optional primary action -->
  <button type="button" class="inline-flex items-center gap-1.5 rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 transition-colors">
    <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/></svg>
    Primary Action
  </button>
</div>
```

## 4. Filter card

```html
<div class="bg-white rounded-xl border border-slate-200 p-4 mb-4">
  <div class="flex flex-wrap items-end gap-3">
    <!-- Search -->
    <div class="flex-1 min-w-56">
      <label class="block text-xs font-medium text-slate-600 mb-1">Search</label>
      <div class="relative">
        <svg class="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" ...><!-- mag-glass --></svg>
        <input type="search" placeholder="..." class="w-full pl-8 pr-3 py-1.5 text-sm rounded-md border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white placeholder-slate-400">
      </div>
    </div>
    <!-- Filter chips (active state) -->
    <button type="button" class="px-3 py-1.5 rounded-md text-xs font-semibold border bg-brand-600 text-white border-brand-600">All</button>
    <button type="button" class="px-3 py-1.5 rounded-md text-xs font-semibold border bg-white text-slate-600 border-slate-300 hover:bg-slate-50">Pending</button>
    <!-- Reset -->
    <button type="button" class="py-1.5 px-3 text-xs font-medium text-slate-500 hover:text-slate-700 border border-slate-300 rounded-md bg-white hover:bg-slate-50">Reset</button>
  </div>
</div>
```

## 5. Status filter chips (Orders-style — full-width chip strip)

```html
<div class="bg-white rounded-xl border border-slate-200 p-4 mb-4">
  <div class="flex flex-wrap items-center gap-2">
    <span class="text-xs font-medium text-slate-500 mr-1">Status:</span>
    <!-- ACTIVE -->
    <button class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium min-h-[36px] bg-brand-600 text-white">All · 42</button>
    <!-- INACTIVE -->
    <button class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium min-h-[36px] bg-slate-100 text-slate-600">Pending</button>
  </div>
</div>
```

## 6. Table (REQUIRED pattern)

```html
<div class="bg-white rounded-xl border border-slate-200 overflow-hidden">
  <div class="overflow-x-auto">
    <table class="w-full text-sm text-left">
      <thead>
        <tr class="bg-slate-50 border-b border-slate-200">
          <th class="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Column</th>
          <th class="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide text-right">Amount</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-slate-100">
        <tr class="hover:bg-slate-50 transition-colors cursor-pointer">
          <td class="px-4 py-3 font-mono text-xs text-brand-700 font-semibold"><a href="#" class="hover:underline">abc12345…</a></td>
          <td class="px-4 py-3 text-right text-slate-700 font-medium tabular-nums">KWD 4,500.000</td>
        </tr>
      </tbody>
    </table>
  </div>
  <!-- Pagination footer below — see §8 -->
</div>
```

## 7. Status pills (use these EXACT tokens, no others)

```html
<!-- neutral / pending -->
<span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border bg-slate-100 text-slate-600 border-slate-200">Pending</span>
<!-- brand / info -->
<span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border bg-brand-50 text-brand-700 border-brand-200">In review</span>
<!-- warn -->
<span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border bg-yellow-50 text-yellow-700 border-yellow-200">Awaiting</span>
<!-- amber (mock-mode banner only) -->
<span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border bg-amber-50 text-amber-700 border-amber-200">Mock</span>
<!-- positive -->
<span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border bg-green-50 text-green-700 border-green-200">Approved</span>
<!-- danger -->
<span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border bg-red-50 text-red-600 border-red-200">Rejected</span>
```

## 8. Pagination footer

```html
<div class="flex items-center justify-between px-4 py-3 border-t border-slate-200 flex-wrap gap-2">
  <p class="text-xs text-slate-500">1–20 of 42</p>
  <div class="flex items-center gap-1">
    <button class="px-2 py-1 text-xs rounded border border-slate-300 bg-white text-slate-500 hover:bg-slate-50 min-h-[36px]">‹</button>
    <button class="px-2.5 py-1 text-xs rounded border font-semibold min-h-[36px] min-w-[36px] border-brand-600 bg-brand-600 text-white">1</button>
    <button class="px-2.5 py-1 text-xs rounded border font-semibold min-h-[36px] min-w-[36px] border-slate-300 bg-white text-slate-700">2</button>
    <button class="px-2 py-1 text-xs rounded border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 min-h-[36px]">›</button>
  </div>
</div>
```

## 9. Empty state

```html
<div class="p-16 flex flex-col items-center justify-center text-center">
  <div class="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
    <svg class="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><!-- relevant icon --></svg>
  </div>
  <h3 class="text-base font-semibold text-slate-700 mb-1">No <items> found</h3>
  <p class="text-sm text-slate-400 max-w-xs mb-5">Try adjusting your filters.</p>
  <button class="text-sm font-medium text-brand-600 hover:underline">Reset filters</button>
</div>
```

## 10. Action menu (kebab)

```html
<div class="relative inline-block">
  <button class="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
    <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z"/></svg>
  </button>
  <!-- Dropdown — show by default in mockup for review -->
  <div class="absolute right-0 z-20 mt-1 w-48 rounded-md bg-white shadow-lg border border-slate-200 py-1 text-sm">
    <a href="#" class="flex items-center gap-2 px-3 py-1.5 text-slate-700 hover:bg-slate-50">Edit</a>
    <a href="#" class="flex items-center gap-2 px-3 py-1.5 text-slate-700 hover:bg-slate-50">View audit log</a>
    <hr class="my-1 border-slate-100">
    <button class="flex w-full items-center gap-2 px-3 py-1.5 text-red-600 hover:bg-red-50">Reject</button>
  </div>
</div>
```

## 11. Slide-in drawer (right side)

```html
<!-- backdrop -->
<div class="fixed inset-0 bg-slate-900/40 z-30"></div>
<!-- drawer -->
<aside class="fixed inset-y-0 right-0 w-[480px] bg-white shadow-xl z-40 flex flex-col">
  <div class="h-14 flex-shrink-0 border-b border-slate-200 flex items-center justify-between px-5">
    <h2 class="text-base font-semibold text-slate-800">Detail title</h2>
    <button class="p-1.5 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600">
      <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
    </button>
  </div>
  <div class="flex-1 overflow-y-auto p-5 space-y-4"><!-- content --></div>
  <div class="h-16 flex-shrink-0 border-t border-slate-200 flex items-center justify-end gap-2 px-5">
    <button class="py-1.5 px-3 text-sm font-medium text-slate-500 hover:text-slate-700 border border-slate-300 rounded-md bg-white hover:bg-slate-50">Cancel</button>
    <button class="rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700">Confirm</button>
  </div>
</aside>
```

## 12. Modal (centered, use for confirm + reject-reason)

```html
<div class="fixed inset-0 bg-slate-900/50 z-30 flex items-center justify-center p-4">
  <div class="bg-white rounded-xl shadow-xl max-w-md w-full">
    <div class="p-5 border-b border-slate-100">
      <h2 class="text-base font-semibold text-slate-800">Reject reason</h2>
    </div>
    <div class="p-5 space-y-3">
      <p class="text-sm text-slate-600">Explain why this is being rejected.</p>
      <!-- canned-reason chips -->
      <div class="flex flex-wrap gap-1.5">
        <button class="px-2.5 py-1 rounded-full text-xs font-semibold border bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200">Blurry</button>
        <button class="px-2.5 py-1 rounded-full text-xs font-semibold border bg-brand-100 border-brand-300 text-brand-700">Expired</button>
      </div>
      <textarea class="w-full px-3 py-2 text-sm rounded-md border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500" rows="3"></textarea>
    </div>
    <div class="p-4 border-t border-slate-100 flex justify-end gap-2">
      <button class="py-1.5 px-3 text-sm font-medium text-slate-500 border border-slate-300 rounded-md bg-white hover:bg-slate-50">Cancel</button>
      <button class="rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700">Reject</button>
    </div>
  </div>
</div>
```

## 13. Banner (info, warn, danger)

```html
<!-- info / brand -->
<div class="mb-4 rounded-lg border border-brand-200 bg-brand-50 px-4 py-3 flex items-start gap-3">
  <svg class="w-4 h-4 text-brand-600 flex-shrink-0 mt-0.5" ...></svg>
  <div class="flex-1 min-w-0">
    <p class="text-sm font-semibold text-brand-800">Title</p>
    <p class="text-xs text-brand-700 mt-0.5">Body copy.</p>
  </div>
</div>

<!-- warn (amber — exception allowed for mock-mode warning) -->
<div class="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 ...">...</div>

<!-- danger -->
<div class="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">Error message</div>
```

---

## 14. Hard rules — NEVER do

- ❌ Don't write custom CSS for colors. Use only Tailwind classes with `brand-*` or `slate-*` palette.
- ❌ Don't use purple, teal, orange, pink — only brand-* (blues), slate-*, red-*, green-*, yellow-*, amber-*, blue-*, indigo-* (rare).
- ❌ Don't omit the sidebar + topbar. Mockup must show the full page in context.
- ❌ Don't use `rounded-lg` on cards — use `rounded-xl`. (Buttons + chips use `rounded-md` / `rounded-full`.)
- ❌ Don't use sans-serif other than Inter (handled by the CDN config above).
- ❌ Don't use icon-only buttons smaller than 36px touch target (the existing app uses `min-h-[36px]` consistently).
- ❌ Don't paint headings on dark backgrounds without explicit `text-white` — global styles force text-ink on h1/h2/h3 in the real app.

---

## 15. Sidebar nav: where to add the new feature

For mockup purposes, show the new feature highlighted in the nav:

- **KYC review** → under "Customers" group, label "KYC Review". Active state highlighted.
- **Documents approval queue** → under "Operations" group (sibling to Inspections, Buy Offers, Orders), label "Documents".
- **Payment reconciliation** → under "Finance" group, label "Payments". Active state highlighted. (Note: Finance group already exists in shell with disabled coming-soon items — make this one active.)

When listing other nav items in the sidebar (for context), copy the **exact** items from `admin-shell.component.ts` — Dashboard, Inventory (Listings/Brands & Models/Body Types/Pipeline), Settings (Pricing Rules), Sales (Orders + disabled Reservations/Trade-Ins), Operations (Inspections, Buy Offers, + disabled Deliveries/Maintenance/Returns), Customers (Users/Reviews/Support — disabled), Finance, Insights (disabled), Reports (Inventory Aging), Admin (Users, Audit Log, + disabled Roles & Permissions, Settings).
