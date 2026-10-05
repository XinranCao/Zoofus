import { test as base, expect } from "@playwright/test";

/** What may be blocked without failing, and why (same list as csp.spec.ts). */
const ALLOWED = [
  // zod tests whether `eval` works and falls back when it does not
  /^script-src[^ ]* eval$/,
];

/**
 * `test` for specs that also run on the production build with the enforcing policy (Playwright
 * project "csp"): every page of every context records `securitypolicyviolation`, and the test
 * fails if one other than the allowed ones fired. On the dev server (project "app") the policy
 * is report-only and noisy, so nothing is checked there.
 */
export const test = base.extend<{ cspGuard: void }>({
  cspGuard: [
    async ({ context }, use, testInfo) => {
      const active = testInfo.project.name === "csp";
      if (active)
        await context.addInitScript(() => {
          const w = window as unknown as { __csp?: string[] };
          w.__csp = [];
          document.addEventListener("securitypolicyviolation", (e) => {
            const line = `${e.violatedDirective} ${e.blockedURI}`;
            w.__csp!.push(line);
            console.error(`CSP-VIOLATION ${line}`);
          });
        });
      const found: string[] = [];
      if (active)
        context.on("console", (m) => {
          if (m.text().startsWith("CSP-VIOLATION ")) found.push(m.text().slice(14));
        });
      await use();
      if (active)
        expect(
          [...new Set(found)].filter((v) => !ALLOWED.some((a) => a.test(v))),
          "Content-Security-Policy violations",
        ).toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };
