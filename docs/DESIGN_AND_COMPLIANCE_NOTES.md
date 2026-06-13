# Design and Compliance Notes

## Design direction

The original black/green direction was too dark and visually aggressive for a mixed B2B/B2C service business. This rebuild uses a Material 3 / M3 Expressive-inspired light system:

- Warm near-white base surfaces instead of black backgrounds
- Tonal surface containers instead of heavy shadows
- Earthy green primary color for trust and electric lawn positioning
- Teal tertiary color for A/C and technical/automotive services
- Amber/stone secondary tone for mechanical warmth
- Large rounded cards, calm motion, and clear CTA hierarchy
- Friendly homeowner language plus manager-grade operational language

## UX strategy

This site is built around two conversion paths:

1. B2C homeowner path: Book a mobile visit quickly.
2. B2B manager path: Request a quote with service mix, site count, and route area.

Copy is intentionally practical and trust-heavy rather than flashy. The customer should feel: “This person will diagnose the issue, tell me the scope, and not create a second problem.”

## Accessibility scaffold

Implemented:

- Skip link
- Semantic landmarks
- Keyboard-visible focus states
- Native dialog modals
- Escape/overlay close support
- Required field validation with aria-invalid
- Reduced-motion support
- Large touch targets
- Color contrast-aware palette
- Labels bound to fields by nesting

Still recommended before production:

- Run axe, Lighthouse, WAVE, and manual keyboard/screen-reader tests
- Add server-side validation messages tied to specific fields
- Test color contrast after any brand palette changes
- Add captions/transcripts if video content is added

## Privacy and CCPA/CPRA scaffold

Implemented:

- Cookie consent banner
- Consent logging endpoint
- Privacy rights request modal
- Admin privacy request inbox
- Privacy request status updates

Still recommended before production:

- Final privacy policy written by qualified counsel
- Confirm whether CCPA/CPRA applies based on revenue, data volume, data sale/share, and California business activity
- Add data retention schedule
- Add identity verification workflow for privacy requests
- Add “Do Not Sell or Share My Personal Information” link if applicable

## Disaster Recovery Plan scaffold

Implemented:

- DRP modal
- RTO/RPO settings
- Audit log
- JSON-file persistence

Still recommended before production:

- Automated encrypted backups
- Offsite backup copies
- Restore test every month
- Move to SQLite/Postgres before meaningful production traffic
- Add admin 2FA and role-based access

## Business compliance cautions

This website intentionally phrases some services as intake/readiness until licensing, certification, insurance, and equipment scope are verified.

Review before paid launch:

- EPA 609/608 scope for refrigerant handling/recovery
- Local/state requirements for mobile mechanic work
- Locksmith/key-programming authorization and licensing requirements
- Automotive tuning/emissions compliance
- Insurance coverage for mobile work, vehicles, property, keys, and data
- Local ordinances for lawn care, noise, pesticide/herbicide, waste, and business licensing
