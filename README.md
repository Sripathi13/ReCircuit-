# ReCircuit — Smart Electronic Device Reuse, Collection and Recycling Marketplace

ReCircuit is a full-stack web application connecting individual owners of unused electronic devices with administrator-verified local electronics repair shops, refurbishers, second-hand dealers, and authorized e-waste recycling partners.

## 1. Architecture & Technology Stack

- **Frontend**: React 19, Vite, TypeScript, Tailwind CSS, Lucide React, Recharts.
- **Backend**: Node.js, Express.js REST API (`server.ts`), HTTP-only cookie & Bearer session tokens + Firebase Google Authentication (`firebase`, `firebase-admin`), `bcryptjs` password hashing.
- **Database**: Google Cloud SQL for PostgreSQL managed via Drizzle ORM (`src/db/schema.ts`, `src/db/index.ts`, `src/db/drizzle.config.ts`).

## 2. Database Setup, Schema Migrations & Seeding

1. **Cloud SQL Connection**: The application connects to PostgreSQL using the platform-injected `SQL_HOST`, `SQL_DB_NAME`, `SQL_USER`, `SQL_PASSWORD`, `SQL_ADMIN_USER`, and `SQL_ADMIN_PASSWORD` variables.
2. **Schema Push**: Defined in `src/db/schema.ts` (18 normalized tables: `users`, `user_profiles`, `shops`, `shop_verification_documents`, `devices`, `device_images`, `saved_devices`, `device_interests`, `offers`, `transactions`, `transaction_events`, `conversations`, `conversation_participants`, `messages`, `notifications`, `reports`, `support_requests`, `audit_logs`).
3. **Seed Data**: Automatically seeded on initial request via `ensureSeeded()` in `src/db/seed.ts` (or via `POST /api/seed`). All sample records are explicitly labeled `[DEMO]`.

### Development Demonstration Accounts

| Role | Name / Business | Email | Password |
| :--- | :--- | :--- | :--- |
| **USER** | Arjun Nair (Device Owner) | `arjun.nair@demo.recircuit.org` | `DemoPass#2026` |
| **SHOP (Approved)** | Covai Mobile Care & Refurb Hub | `priya@covaimobilecare.demo.recircuit.org` | `DemoPass#2026` |
| **SHOP (Approved)** | SiliconFix Laptop & Compute Studio | `karthik@siliconfix.demo.recircuit.org` | `DemoPass#2026` |
| **SHOP (Approved)** | EcoCircuit Authorized E-Waste Recyclers | `compliance@ecocircuitrecycle.demo.recircuit.org` | `DemoPass#2026` |
| **SHOP (Pending)** | Metro Second-Hand Electronics | `rahul@metrodevices.demo.recircuit.org` | `DemoPass#2026` |
| **ADMIN** | Platform Administrator | `admin@recircuit.org` | `ReCircuitAdmin#2026` |

## 3. Running Tests

With the server running on port 3000:
```bash
RUN_E2E=true npx tsx tests/recircuit.test.ts
```

## 4. Optional External Service Configuration

- **External Email Delivery (`EMAIL_PROVIDER_API_KEY`)**: All notifications are persisted in PostgreSQL (`notifications` table) and delivered immediately in-app. To enable external SMTP/transactional email delivery, configure `EMAIL_PROVIDER_API_KEY` and `EMAIL_FROM_ADDRESS`.
- **External Object Storage (`OBJECT_STORAGE_*`)**: Device photographs are validated for MIME type and size and persisted safely for immediate rendering. Shop verification documents are stored with private storage keys and restricted to administrators and the submitting shop.
