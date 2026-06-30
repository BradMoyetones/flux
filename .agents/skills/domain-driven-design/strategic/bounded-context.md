---
type: skill
name: bounded-context
category: ddd/strategic
---

# Bounded Context

## Detect

Scan for these patterns indicating missing or broken Bounded Context:

| Pattern                      | Example                                                        |
| ---------------------------- | -------------------------------------------------------------- |
| Shared database              | Multiple modules read/write same tables                        |
| God class                    | `Customer` with fields for sales, billing, shipping, support   |
| Direct cross-module imports  | `import { Invoice } from '../billing/domain/Invoice'` in sales |
| No boundary in code          | Models from different domains mixed in same folder             |
| Leaking internal models      | Domain entities exported in public API                         |
| Same word, different meaning | "Order" means different things in different modules            |

## Fix

Valid Bounded Context structure:

```
src/
├── sales/                    # Bounded Context: Sales
│   ├── domain/
│   │   ├── Customer.ts       # Sales view of Customer
│   │   ├── Order.ts
│   │   └── Quote.ts
│   ├── application/
│   └── infrastructure/
│
├── fulfillment/              # Bounded Context: Fulfillment
│   ├── domain/
│   │   ├── Shipment.ts
│   │   ├── Order.ts          # Different Order model!
│   │   └── Warehouse.ts
│   ├── application/
│   └── infrastructure/
│
└── shared-kernel/            # Shared (minimal!)
    └── Money.ts
```

Checklist:

- ✅ Explicit boundary (separate modules/packages)
- ✅ Each context owns its data
- ✅ One ubiquitous language per context
- ✅ Communication through events or APIs
- ✅ Only public interface exposed

## Violations

### Shared database between contexts

```
# ❌ Detect: multiple contexts access same tables
┌─────────────┐     ┌─────────────┐
│   Sales     │     │  Billing    │
└──────┬──────┘     └──────┬──────┘
       │                   │
       └───────┬───────────┘
               ▼
        ┌──────────────┐
        │  customers   │  ← Both mutate same table
        └──────────────┘

# ✅ Fix: each context owns its data
┌─────────────┐           ┌─────────────┐
│   Sales     │           │  Billing    │
│  Database   │           │  Database   │
│ (customers) │           │ (accounts)  │
└─────────────┘           └─────────────┘
       │                         │
       └────── Events ───────────┘
```

### One model to rule them all

```typescript
// ❌ Detect: god class with concerns from multiple domains
class Customer {
    id: string;
    name: string;
    // Sales concerns
    salesRepId: string;
    creditLimit: Money;
    // Billing concerns
    paymentMethod: PaymentMethod;
    taxId: string;
    // Fulfillment concerns
    shippingAddresses: Address[];
    // Support concerns
    supportTier: string;
}

// ✅ Fix: each context has its own model
// Sales context
class Customer {
    constructor(
        readonly id: CustomerId,
        private name: CustomerName,
        private salesRepId: SalesRepId,
        private creditLimit: Money
    ) {}
}

// Billing context
class Account {
    constructor(
        readonly id: AccountId,
        readonly customerId: CustomerId,
        private paymentMethod: PaymentMethod
    ) {}
}
```

### Direct cross-context dependencies

```typescript
// ❌ Detect: import from another context's domain
import { Invoice } from '../billing/domain/Invoice';
import { PaymentMethod } from '../billing/domain/PaymentMethod';

class Order {
    constructor(
        private invoice: Invoice,
        private paymentMethod: PaymentMethod
    ) {}
}

// ✅ Fix: communicate through events
class Order {
    place(): void {
        this.status = OrderStatus.Placed;
        this.addDomainEvent(new OrderPlaced(this.id, this.totalAmount));
    }
}

// Billing context listens and reacts independently
```

### No clear boundary in code

```typescript
// ❌ Detect: mixed models in same folder
src/
├── models/
│   ├── Customer.ts
│   ├── Order.ts
│   ├── Invoice.ts
│   └── Shipment.ts
├── services/
│   └── OrderService.ts

// ✅ Fix: explicit boundaries
src/
├── sales/
│   ├── domain/
│   └── index.ts
├── fulfillment/
│   ├── domain/
│   └── index.ts
```

### Leaking internal models

```typescript
// ❌ Detect: internal entities in public exports
// sales/index.ts
export { Customer } from './domain/Customer';
export { Order } from './domain/Order';
export { OrderItem } from './domain/OrderItem';
export { PriceCalculator } from './domain/PriceCalculator';

// ✅ Fix: expose only public interface
// sales/index.ts
export { SalesService } from './application/SalesService';
export type { OrderDto } from './application/dtos/OrderDto';
export type { CreateOrderCommand } from './application/commands';
```

## Skip when

- Small system — one context might be enough
- Same team, same model — don't split artificially
- No language conflicts — if terms mean same thing everywhere
- Early stage — boundaries emerge as system grows
