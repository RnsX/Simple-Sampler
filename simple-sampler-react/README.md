# Simple Sampler React

Open source React application for building, inspecting, and generating synthetic **SEPA Instant Credit Transfer** payment samples.

The app has two main modes:

- **Builder**: create and edit a single `SepaInstantPayment`
- **Generator**: load CSV data, synthesize people, generate many payment samples, edit them, and export them as JSON, XML, or ZIP

## Features

### Payment Builder

- Edit a full SEPA payment through a form-based UI
- Preview the payment model as formatted JSON
- Preview generated SEPA XML
- Copy JSON and XML previews
- Load a payment from JSON
- Generate fresh IDs for payment identifier fields
- Generate IBAN numeric parts while keeping the country/prefix intact

### Payment Generator

- Load company data from CSV
- Load person name data from CSV
- Generate synthetic full names from `Given` and `Surname` source rows
- Generate batches of sample payments
- Randomize debtor and creditor roles across:
  - person -> person
  - person -> company
  - company -> person
  - company -> company
- Browse generated payments in a paginated table
- Edit any generated payment in a modal using the shared builder editor
- Download each payment as JSON
- Download each payment as SEPA XML
- Download all generated payments in a single ZIP archive

## SEPA Model

The payment model lives in [src/SEPA/SEPA.ts](src/SEPA/SEPA.ts).

The main exported type is:

- `SepaInstantPayment`

It contains the payment header, parties, accounts, amount, remittance data, regulatory reporting, and identifier fields used by the app.

## XML Generation

SEPA XML serialization is implemented in [src/SEPA/SEPA_SCT_INST_serializer.ts](src/SEPA/SEPA_SCT_INST_serializer.ts).

The app currently generates a `pacs.008.001.08`-style XML document preview from the in-memory payment model. The builder and generator both use the same serializer, so previewed XML and downloaded XML come from the same code path.

Relevant behavior:

- Optional sections are omitted when the corresponding data is not present
- XML preview is compacted to remove empty lines
- Party address data is emitted as `AdrLine` plus country when available

## CSV Loading

### Company CSV

Company import expects the following header:

```csv
Name,Address,Country
```

Fields:

- `Name`: company name
- `Address`: free-form address line
- `Country`: ISO2 country code, for example `LV`, `LT`, `EE`, `DE`

### Person CSV

Person import expects the following header:

```csv
id,Locality,Type,Value
```

Fields:

- `id`: source identifier
- `Locality`: locality or country-style label such as `Latvia`, `Lithuania`, `Estonia`, `Russia`
- `Type`: row kind, currently expected as `Given` or `Surname`
- `Value`: actual name value

Example:

```csv
id,Locality,Type,Value
1,Latvia,Given,Anna
2,Latvia,Surname,Ozola
3,Lithuania,Given,Jonas
4,Lithuania,Surname,Kazlauskas
```

Import behavior:

- All `"` characters are stripped from loaded CSV cells
- Parsing is intentionally simple and split on commas
- Quoted CSV with embedded commas is not fully supported

## Synthetic Name Generation

The generator creates synthetic people by combining:

- one random `Given` row
- one random `Surname` row

The resulting synthetic person is stored as a generated full name and can then be used as a payment party.

## Payment Generation

When generating payments, the app:

1. Loads companies from company CSV
2. Loads person name rows from person CSV
3. Optionally generates synthetic full names
4. Creates payment samples using randomized parties and identifiers
5. Builds valid `SepaInstantPayment` objects from shared builder state logic

Generated payments reuse the same editing and serialization pipeline as the Builder view.

## Navigation and State

The app provides a left sidebar with:

- `Builder`
- `Generator`

Both views stay mounted, so switching between them preserves local UI state during the session.

## Project Structure

```text
src/
  App.tsx
  SEPA/
    SEPA.ts
    SEPA_SCT_INST_serializer.ts
  paymentBuilder/
    PaymentEditor.tsx
    sepa_builder.ts
    state.ts
  paymentGenerator/
    generator.tsx
    model.ts
```

Key modules:

- `paymentBuilder/state.ts`: shared payment editing state and model mapping
- `paymentBuilder/PaymentEditor.tsx`: reusable editor UI used by Builder and Generator
- `paymentGenerator/generator.tsx`: CSV loading, synthetic data generation, pagination, downloads, ZIP export

## Development

### Requirements

- Node.js
- npm

### Install

```bash
npm install
```

### Run locally

```bash
npm run dev
```

### Build

```bash
npm run build
```

### Lint

```bash
npx eslint .
```

Note: the repository currently contains an older serializer file that still uses `any`, so strict full-project linting may require follow-up cleanup if you want a completely warning-free lint pass across every source file.

## Tech Stack

- React 19
- TypeScript
- Vite
- Radix UI primitives
- JSZip

## Open Source Notes

This project is intended to be understandable and hackable:

- UI behavior is implemented in small local modules
- Payment state mapping is centralized in one place
- Builder and generator share the same payment editing logic
- Export behavior is deterministic and easy to extend

If you want to contribute, the best entry points are:

- improving CSV parsing
- adding validation rules for SEPA fields
- expanding payment generation rules
- improving XML serializer typing
- adding automated tests
