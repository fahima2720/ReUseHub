<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Keep hosted data in the existing Lovable Cloud/PostgreSQL integration; `database/` contains independent MySQL teaching materials, not runtime queries, to avoid disrupting the live app.
- Keep pure input validation in `src/lib/validation.ts` and assert business values in focused tests so forms and tests share the same rules.
- Model replies as new inquiry rows with a nullable parent reference; database triggers derive the recipient and require a received parent and available listing, preventing spoofed recipients.
