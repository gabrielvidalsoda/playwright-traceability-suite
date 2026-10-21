# Playwright Traceability Suite

> Public, sanitized extract of client work. Client identifiers, credentials, environments and evidence have been removed; the harness itself is otherwise unmodified.

A deterministic Playwright E2E suite with **requirement → test case traceability**, dual execution layers (@front mock-backed and @integracao), accessibility checks with axe-core, and structured outputs (HTML, JUnit, PDF, execution history).

## Features

- **Traceability matrix** — link test cases to requirements and export a traceability report.
- **Two layers** — @front runs against mock-backed fixtures; @integracao targets an integration environment.
- **Deterministic execution** — reusable helpers and page objects for stable runs.
- **Reporting** — HTML report, JUnit XML, JSON execution history and PDF summaries.
- **Accessibility** — axe-core integration for basic a11y checks.
- **Version gating** — post-deploy version checks where applicable.

## Quick start

`ash
npm ci
npx playwright install
npx playwright test --grep @front
npx playwright show-report
`

## Scripts

| Script | Purpose |
| --- | --- |
| 
pm test | Run all tests |
| 
pm run test:front | Run mock-backed front tests |
| 
pm run test:integ | Run integration tests |
| 
pm run report | Open the HTML report |

## Configuration

Edit playwright.config.ts to point to your environment. All hostnames in this published copy use placeholders (pp.example.internal).

## Project structure

`
├── dados/        # Test data / fixtures
├── funcoes/      # Helpers
├── paginas/      # Page objects
├── relatorios/   # Reporters / history (generated)
├── testes/       # Specs
└── playwright.config.ts
`

## License

[MIT](LICENSE) © Gabriel Vidal