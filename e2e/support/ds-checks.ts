import AxeBuilder from "@axe-core/playwright";
import type { Page } from "@playwright/test";

/** Rules from design-system/README.md: flat, torn, tagline-free. Each check returns problems. */
export interface Problem {
  screen: string;
  rule: string;
  detail: string;
}

/** Elements the design allows a radius on: avatar images (round) and the photo (radius-photo 2px). */
const RADIUS_OK = ".zf-avatar__img, .zf-photo, .zf-dropzone, canvas, img";

export async function flatnessProblems(page: Page, screen: string): Promise<Problem[]> {
  const found = await page.evaluate((radiusOk) => {
    const out: { rule: string; detail: string }[] = [];
    const label = (el: Element) =>
      el.tagName.toLowerCase() +
      (el.className && typeof el.className === "string"
        ? "." + el.className.split(" ").slice(0, 2).join(".")
        : "");
    for (const el of Array.from(document.querySelectorAll("body, body *"))) {
      const cs = getComputedStyle(el);
      if (cs.boxShadow !== "none")
        out.push({ rule: "no box-shadow", detail: `${label(el)}: ${cs.boxShadow}` });
      if (cs.textShadow !== "none")
        out.push({ rule: "no text-shadow", detail: `${label(el)}: ${cs.textShadow}` });
      // computed filters list each drop-shadow as "drop-shadow(<colour> <x> <y> <blur>)": blur must be 0
      for (const m of cs.filter.matchAll(/drop-shadow\(([^)]*\)?[^)]*)\)/g)) {
        const lengths = (m[1] ?? "").match(/-?\d+(\.\d+)?px/g) ?? [];
        if (lengths[2] && parseFloat(lengths[2]) > 0)
          out.push({ rule: "no blurred drop-shadow", detail: `${label(el)}: ${m[0]}` });
      }
      const radius = [
        "borderTopLeftRadius",
        "borderTopRightRadius",
        "borderBottomLeftRadius",
        "borderBottomRightRadius",
      ].some((k) => (cs as unknown as Record<string, string>)[k] !== "0px");
      if (radius && !el.matches(radiusOk))
        out.push({ rule: "no border-radius on chrome", detail: label(el) });
      const border = ["Top", "Right", "Bottom", "Left"].some(
        (s) =>
          parseFloat(
            (cs as unknown as Record<string, string>)[`border${s}Width`] ?? "0",
          ) > 0 &&
          (cs as unknown as Record<string, string>)[`border${s}Style`] !== "none",
      );
      if (border) out.push({ rule: "no border on chrome", detail: label(el) });
    }
    return out;
  }, RADIUS_OK);
  return found.map((f) => ({ screen, ...f }));
}

export async function copyProblems(page: Page, screen: string): Promise<Problem[]> {
  const out: Problem[] = [];
  const title = await page.title();
  if (!/^Zoofus( · .+)?$/.test(title))
    out.push({ screen, rule: "title is `Zoofus · <page>`", detail: title });
  const bad = await page.evaluate(() => {
    const text = document.body.innerText;
    const taglines = text.match(/Zoofus\s*[—–:\-|]\s*\S+/g) ?? [];
    const meta =
      document.querySelector('meta[name="description"]')?.getAttribute("content") ?? "";
    const wordmark = document.querySelector(".zf-wordmark")?.textContent ?? "Zoofus";
    return { taglines, meta, wordmark };
  });
  if (bad.taglines.length)
    out.push({
      screen,
      rule: "no tagline next to Zoofus",
      detail: bad.taglines.join(" | "),
    });
  if (bad.meta) out.push({ screen, rule: "no meta tagline", detail: bad.meta });
  if (bad.wordmark !== "Zoofus")
    out.push({ screen, rule: "wordmark is one word", detail: bad.wordmark });
  return out;
}

export async function axeProblems(page: Page, screen: string): Promise<Problem[]> {
  const result = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  return result.violations
    .filter((v) => v.impact === "serious" || v.impact === "critical")
    .map((v) => ({
      screen,
      rule: `axe ${v.id} (${v.impact})`,
      detail: v.nodes
        .slice(0, 3)
        .map((n) => n.target.join(" "))
        .join(" | "),
    }));
}

export async function inspect(
  page: Page,
  screen: string,
  shotPath: string,
): Promise<Problem[]> {
  await page.waitForTimeout(450); // let enter animations settle before the screenshot
  await page.screenshot({ path: shotPath, fullPage: false });
  return [
    ...(await flatnessProblems(page, screen)),
    ...(await copyProblems(page, screen)),
    ...(await axeProblems(page, screen)),
  ];
}
