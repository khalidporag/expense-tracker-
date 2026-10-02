---
description: Build the app and run the phone-size browser smoke test
---
1. Run `npm run build`.
2. Start `npx vite preview --port 4173` in the background (not with a pkill that could match your own shell).
3. Run `node e2e/smoke.cjs` (set `PW_MODULE` if Playwright isn't resolvable).
4. Report each ✓/✗. For any ✗, determine whether it is a real app bug or a script race before changing anything; fix real bugs at the cause.
