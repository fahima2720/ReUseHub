# ReUseHub small updates

## Changes
- Restore the requested homepage title, description, and eyebrow wording.
- Move the existing password visibility control into a shared component with local visibility state; use it on login, signup, and both reset fields without changing field behavior.
- Add a database migration dropping only the obsolete three-argument `admin_update_ticket` function, then regenerate types to retain the four-argument signature.

## Technical details
- Keep current layout, validation, labels, field names, required flags, and autocomplete values unchanged.
- Record the shared password-field module convention in `AGENTS.md`.