import AxeBuilder from "@axe-core/playwright";
import type { CDPSession, Page } from "@playwright/test";

/**
 * Design-system rules checked on the real app (see design-system/README.md and
 * `e2e/design-system.spec.ts`). Every check returns a list of problems; empty means it holds.
 */
export interface Problem {
  screen: string;
  rule: string;
  detail: string;
}

export interface ContrastRow {
  screen: string;
  text: string;
  ratio: number;
  min: number;
  fg: string;
  bg: string;
  size: number;
  weight: number;
}

/** Elements the design allows a radius on: avatar images (round), the photo, canvases and images. */
// .zf-google is Google's own button spec: the one deliberate exception (see GoogleButton.tsx)
const RADIUS_OK = ".zf-avatar__img, .zf-photo, .zf-dropzone, canvas, img, .zf-google";

export async function flatnessProblems(page: Page, screen: string): Promise<Problem[]> {
  const found = await page.evaluate((radiusOk) => {
    const out: { rule: string; detail: string }[] = [];
    const label = (el: Element) =>
      el.tagName.toLowerCase() +
      (typeof el.className === "string" && el.className
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
      if (border && !el.matches(".zf-google"))
        out.push({ rule: "no border on chrome", detail: label(el) });
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

/**
 * Reduced motion: every element (and its ::before / ::after) must have no running transition or
 * animation: a 0s duration, or `animation-name: none`.
 */
export async function reducedMotionProblems(
  page: Page,
  screen: string,
): Promise<Problem[]> {
  const found = await page.evaluate(() => {
    const out: string[] = [];
    const zero = (v: string) => v.split(",").every((d) => parseFloat(d) === 0);
    const label = (el: Element, pseudo: string) =>
      el.tagName.toLowerCase() +
      (typeof el.className === "string" && el.className
        ? "." + el.className.split(" ").slice(0, 2).join(".")
        : "") +
      pseudo;
    for (const el of Array.from(document.querySelectorAll("html, body, body *"))) {
      for (const pseudo of ["", "::before", "::after"]) {
        const cs = getComputedStyle(el, pseudo || null);
        if (!zero(cs.transitionDuration))
          out.push(`${label(el, pseudo)} transition ${cs.transitionDuration}`);
        if (!zero(cs.animationDuration) && cs.animationName !== "none")
          out.push(
            `${label(el, pseudo)} animation ${cs.animationName} ${cs.animationDuration}`,
          );
      }
    }
    return out;
  });
  return found
    .slice(0, 8)
    .map((detail) => ({ screen, rule: "reduced motion: no motion", detail }));
}

/** Chinese: every CJK text node renders in a web font we ship, never a system font; nothing overflows. */
export async function cjkProblems(
  page: Page,
  cdp: CDPSession,
  screen: string,
  fontsSeen?: Set<string>,
): Promise<Problem[]> {
  const out: Problem[] = [];
  const count = await page.evaluate(() => {
    document.querySelectorAll("[data-cjk]").forEach((e) => e.removeAttribute("data-cjk"));
    let n = 0;
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      if (
        !new RegExp("[\\u3400-\\u9fff\\uff00-\\uffef\\u3000-\\u303f]").test(
          node.nodeValue ?? "",
        )
      )
        continue;
      const el = node.parentElement;
      if (!el || el.closest("script,style")) continue;
      // Google's button is set in Google's own type (system font stack for Chinese)
      if (el.closest(".zf-google")) continue;
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      el.setAttribute("data-cjk", String(n++));
    }
    return n;
  });
  if (count > 0) {
    await cdp.send("DOM.enable");
    await cdp.send("CSS.enable");
    const { root } = await cdp.send("DOM.getDocument", { depth: 0 });
    const { nodeIds } = await cdp.send("DOM.querySelectorAll", {
      nodeId: root.nodeId,
      selector: "[data-cjk]",
    });
    const seen = new Set<string>();
    for (const nodeId of nodeIds) {
      const { fonts } = await cdp.send("CSS.getPlatformFontsForNode", { nodeId });
      for (const f of fonts) {
        const key = `${f.familyName}|${f.isCustomFont}`;
        if (seen.has(key)) continue;
        seen.add(key);
        fontsSeen?.add(`${f.familyName} (${f.isCustomFont ? "web font" : "system"})`);
        // a system serif or sans (isCustomFont false) would mean no shipped font had the glyph
        if (!f.isCustomFont)
          out.push({
            screen,
            rule: "CJK text uses a shipped web font",
            detail: `system font "${f.familyName}" (${f.glyphCount} glyphs)`,
          });
      }
    }
  }
  const overflow = await page.evaluate(() => {
    const bad: string[] = [];
    const sel = "button, [role=tab], [role=menuitem], [role=radio], .zf-chip, a.zf-btn";
    for (const el of Array.from(document.querySelectorAll<HTMLElement>(sel))) {
      const r = el.getBoundingClientRect();
      if (r.width === 0) continue;
      // an icon-only control has no label to overflow (its hit-area pseudo-element is not text)
      if (!(el.textContent ?? "").trim()) continue;
      // a sticker tile's button wraps a tilted picture, whose corner pokes out by a pixel or two
      if (el.matches(".zf-tile__open")) continue;
      // the language switch is plain text buttons, not torn faces
      if (el.closest(".zf-lang")) continue;
      const face = el.querySelector<HTMLElement>(".zf-face") ?? el;
      // scrollWidth counts text that overflows its box (a label wider than the torn face)
      if (face.scrollWidth > face.clientWidth + 1)
        bad.push((el.textContent ?? "").trim().slice(0, 30));
    }
    return bad;
  });
  for (const t of overflow)
    out.push({ screen, rule: "no label overflows its torn face", detail: t });
  return out;
}

/** Contrast of every visible text, measured against the nearest painted ancestor (the torn face). */
export async function contrastRows(page: Page, screen: string): Promise<ContrastRow[]> {
  const rows = await page.evaluate(() => {
    type RGBA = [number, number, number, number];
    const parse = (c: string): RGBA => {
      const m = c.match(/rgba?\(([^)]+)\)/);
      if (!m) return [0, 0, 0, 0];
      const p = m[1]!
        .split(/[ ,/]+/)
        .filter(Boolean)
        .map(Number);
      return [p[0]!, p[1]!, p[2]!, p[3] ?? 1];
    };
    const over = (top: RGBA, under: RGBA): RGBA => {
      const a = top[3] + under[3] * (1 - top[3]);
      if (a === 0) return [0, 0, 0, 0];
      const ch = (i: number) =>
        (top[i]! * top[3] + under[i]! * under[3] * (1 - top[3])) / a;
      return [ch(0), ch(1), ch(2), a];
    };
    const lum = ([r, g, b]: RGBA) => {
      const f = (v: number) => {
        const s = v / 255;
        return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
      };
      return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
    };
    const ratio = (a: RGBA, b: RGBA) => {
      const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x) as [number, number];
      return (hi + 0.05) / (lo + 0.05);
    };
    const hex = (c: RGBA) =>
      "#" +
      [0, 1, 2].map((i) => Math.round(c[i]!).toString(16).padStart(2, "0")).join("");
    const out: {
      text: string;
      ratio: number;
      min: number;
      fg: string;
      bg: string;
      size: number;
      weight: number;
    }[] = [];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const text = (node.nodeValue ?? "").trim();
      const el = node.parentElement;
      if (!text || !el || el.closest("script,style,canvas,[hidden]")) continue;
      if (el.closest("[disabled],[aria-disabled=true],[data-disabled]")) continue;
      // decorative (aria-hidden) text, such as the giant 404, is exempt from text contrast
      if (el.closest("[aria-hidden=true]")) continue;
      const range = document.createRange();
      range.selectNodeContents(node);
      const r = range.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      if (r.bottom < 0 || r.top > innerHeight || r.right < 0 || r.left > innerWidth)
        continue;
      const cs = getComputedStyle(el);
      if (cs.visibility === "hidden") continue;
      // effective opacity of the text
      let opacity = 1;
      for (let e: Element | null = el; e; e = e.parentElement)
        opacity *= parseFloat(getComputedStyle(e).opacity);
      if (opacity < 0.05) continue; // revealed on hover or focus only
      const fgRaw = parse(cs.color);
      fgRaw[3] *= opacity;
      // background: the painted ancestors, nearest first, until one is opaque
      const layers: RGBA[] = [];
      for (let e: Element | null = el; e; e = e.parentElement) {
        const c = parse(getComputedStyle(e).backgroundColor);
        if (c[3] > 0) layers.push(c);
        if (c[3] >= 1) break;
      }
      let under: RGBA = [251, 246, 238, 1]; // page ground fallback (kraft/sheet)
      if (layers.length && layers[layers.length - 1]![3] >= 1) under = layers.pop()!;
      for (let i = layers.length - 1; i >= 0; i--) under = over(layers[i]!, under);
      const fg = over(fgRaw, under);
      const size = parseFloat(cs.fontSize);
      const weight = parseInt(cs.fontWeight, 10) || 400;
      const large = size >= 24 || (weight >= 700 && size >= 18.66);
      out.push({
        text: text.slice(0, 40),
        ratio: Math.round(ratio(fg, under) * 100) / 100,
        min: large ? 3 : 4.5,
        fg: hex(fg),
        bg: hex(under),
        size,
        weight,
      });
    }
    return out;
  });
  return rows.map((r) => ({ screen, ...r }));
}

export function contrastProblems(rows: ContrastRow[]): Problem[] {
  return rows
    .filter((r) => r.ratio < r.min)
    .map((r) => ({
      screen: r.screen,
      rule: `text contrast ≥ ${r.min}:1`,
      detail: `"${r.text}" ${r.ratio}:1 (${r.fg} on ${r.bg}, ${r.size}px)`,
    }));
}

/** Torn edges: unique tears, a lip, and text that no tear cuts into. */
export async function tornProblems(page: Page, screen: string): Promise<Problem[]> {
  const found = await page.evaluate(() => {
    const out: { rule: string; detail: string }[] = [];
    const visible = (el: Element) => {
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== "hidden";
    };
    const label = (el: Element) =>
      el.tagName.toLowerCase() +
      (typeof el.className === "string"
        ? "." + el.className.split(" ").slice(0, 3).join(".")
        : "") +
      " “" +
      (el.textContent ?? "").trim().slice(0, 20) +
      "”";

    const torn = Array.from(document.querySelectorAll<HTMLElement>(".zf-torn")).filter(
      visible,
    );

    // 1. no two visible torn elements share a tear
    const seen = new Map<string, HTMLElement>();
    for (const el of torn) {
      // quiet buttons have no visible face and share one tear per size
      if (el.classList.contains("quiet")) continue;
      const clip = getComputedStyle(el).getPropertyValue("--clip").trim();
      if (!clip) continue;
      const other = seen.get(clip);
      if (other)
        out.push({
          rule: "unique tear per element",
          detail: `${label(el)} = ${label(other)}`,
        });
      else seen.set(clip, el);
    }

    // 2. the fibre lip exists (quiet buttons are plain text and have none)
    for (const el of torn) {
      const cs = getComputedStyle(el);
      const clip = cs.getPropertyValue("--clip").trim();
      const fclip = cs.getPropertyValue("--fclip").trim();
      if (!clip) continue;
      if (el.classList.contains("quiet") || el.hasAttribute("data-no-fiber")) continue;
      if (fclip === clip) out.push({ rule: "fibre lip present", detail: label(el) });
    }

    // 3. text never meets a tear: measured in layout space (rotation removed)
    const style = document.createElement("style");
    style.textContent =
      "*,*::before,*::after{transform:none!important;rotate:none!important}";
    document.head.append(style);
    try {
      type Pt = [number, number];
      const px = (tok: string, full: number): number => {
        const calc = tok.match(/^calc\(100% - ([\d.]+)px\)$/);
        if (calc) return full - parseFloat(calc[1]!);
        if (tok.endsWith("%")) return (parseFloat(tok) / 100) * full;
        return parseFloat(tok);
      };
      const polygon = (clip: string, w: number, h: number): Pt[] | null => {
        const m = clip.match(/^polygon\((.*)\)$/s);
        if (!m) return null;
        // split on commas that are not inside calc()
        const pts = m[1]!.split(/,(?![^(]*\))/).map((p) => p.trim());
        return pts.map((p) => {
          const toks = p.match(/calc\([^)]*\)|\S+/g) ?? [];
          return [px(toks[0]!, w), px(toks[1]!, h)] as Pt;
        });
      };
      const inside = (pt: Pt, poly: Pt[]) => {
        let c = false;
        for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
          const [xi, yi] = poly[i]!;
          const [xj, yj] = poly[j]!;
          if (
            yi > pt[1] !== yj > pt[1] &&
            pt[0] < ((xj - xi) * (pt[1] - yi)) / (yj - yi) + xi
          )
            c = !c;
        }
        return c;
      };
      const faces = Array.from(
        document.querySelectorAll<HTMLElement>(".zf-torn > .zf-face"),
      ).filter(visible);
      for (const face of faces) {
        // a quiet button has no visible face: it is plain text with a scribble underline
        if (face.parentElement?.classList.contains("quiet")) continue;
        const box = face.getBoundingClientRect();
        const poly = polygon(
          getComputedStyle(face).getPropertyValue("--clip").trim(),
          box.width,
          box.height,
        );
        if (!poly) continue;
        const walker = document.createTreeWalker(face, NodeFilter.SHOW_TEXT);
        for (let node = walker.nextNode(); node; node = walker.nextNode()) {
          if (!(node.nodeValue ?? "").trim()) continue;
          const parent = node.parentElement;
          if (!parent || parent.closest("canvas,[aria-hidden=true],svg,.sr-only")) continue;
          // text belonging to a nested torn element is checked against that element
          if (parent.closest(".zf-face") !== face) continue;
          const range = document.createRange();
          range.selectNodeContents(node);
          // text scrolled out of a dialog's scrolling middle is not on screen: it is not "cut" by a tear
          const scroller = parent.closest(".zf-dialog__scroll");
          const sbox = scroller?.getBoundingClientRect();
          for (const r of Array.from(range.getClientRects())) {
            if (r.width < 1 || r.height < 1) continue;
            if (sbox && (r.top < sbox.top - 1 || r.bottom > sbox.bottom + 1)) continue;
            // glyph ink sits inside the line box (ascender / descender room): trim 18% top and bottom
            const trim = r.height * 0.18;
            const top = r.top + trim - box.top;
            const bottom = r.bottom - trim - box.top;
            const corners: Pt[] = [
              [r.left - box.left, top],
              [r.right - box.left, top],
              [r.left - box.left, bottom],
              [r.right - box.left, bottom],
            ];
            if (corners.some((c) => !inside(c, poly))) {
              out.push({
                rule: "text clear of the tear",
                detail: `“${(node.nodeValue ?? "").trim().slice(0, 24)}” in ${label(face.parentElement!)}`,
              });
              break;
            }
          }
        }
      }
    } finally {
      style.remove();
    }
    return out;
  });
  return found.map((f) => ({ screen, ...f }));
}

/** Layout rules: one primary button per view, few tape pieces, rotations inside the token ranges. */
export async function layoutProblems(page: Page, screen: string): Promise<Problem[]> {
  const found = await page.evaluate(() => {
    const out: { rule: string; detail: string }[] = [];
    const inView = (el: Element) => {
      const r = el.getBoundingClientRect();
      return (
        r.width > 0 &&
        r.height > 0 &&
        r.bottom > 0 &&
        r.top < innerHeight &&
        r.right > 0 &&
        r.left < innerWidth
      );
    };
    const primaries = Array.from(document.querySelectorAll(".zf-btn.primary")).filter(
      inView,
    );
    const inDialog = primaries.filter((p) => p.closest("[role=dialog]"));
    const inPage = primaries.filter((p) => !p.closest("[role=dialog]"));
    // a modal dialog hides the page behind it, so the page's own button does not count then
    const dialogOpen = !!document.querySelector("[role=dialog]");
    if (!dialogOpen && inPage.length > 1)
      out.push({
        rule: "at most one primary button per view",
        detail: `${inPage.length} on the page`,
      });
    if (inDialog.length > 1)
      out.push({
        rule: "at most one primary button per dialog",
        detail: `${inDialog.length} in the dialog`,
      });

    // UI tape only: tapes the user designed (roll, studio stage) are content
    const tapes = Array.from(document.querySelectorAll(".zf-tape")).filter(
      (t) => inView(t) && !t.closest(".zf-roll, .zf-tapetile, [data-user-tape]"),
    );
    if (tapes.length > 6)
      out.push({
        rule: "at most 6 UI tape pieces per viewport",
        detail: `${tapes.length} visible`,
      });

    // rotation of the element itself, from its computed matrix (disabled controls: none)
    const angle = (el: Element) => {
      const t = getComputedStyle(el).transform;
      if (!t || t === "none") return 0;
      const m = t.match(/matrix\(([^)]+)\)/);
      if (!m) return 0;
      const [a, b] = m[1]!.split(",").map(Number) as [number, number];
      return (Math.atan2(b, a) * 180) / Math.PI;
    };
    const limits: [string, number][] = [
      [".zf-btn, .zf-chip, .zf-toast", 0.8],
      [".zf-field, .zf-dialog", 0.4],
      [".zf-tile, .zf-empty", 1.5],
      [".zf-tape", 8],
    ];
    for (const [sel, max] of limits) {
      for (const el of Array.from(document.querySelectorAll(sel))) {
        if (
          !inView(el) ||
          el.closest("[role=dialog][data-state=closed], .zf-roll, [data-user-tape]")
        )
          continue;
        const a = Math.abs(angle(el));
        // dialogs animate in from rot + 1°; allow that while they settle
        if (a > max + 0.05 && !(sel.includes("dialog") && a <= max + 1.05))
          out.push({
            rule: `rotation within ±${max}°`,
            detail: `${(el.className as string).split(" ").slice(0, 2).join(".")} ${a.toFixed(2)}°`,
          });
      }
    }
    for (const el of Array.from(
      document.querySelectorAll("button:disabled, [aria-disabled=true]"),
    )) {
      if (!inView(el) || !(el as HTMLElement).className.toString().includes("zf-"))
        continue;
      const a = Math.abs(angle(el));
      if (a > 0.01)
        out.push({
          rule: "disabled controls sit at 0°",
          detail: `${a.toFixed(2)}° ${(el.textContent ?? "").trim().slice(0, 20)}`,
        });
    }
    return out;
  });
  return found.map((f) => ({ screen, ...f }));
}

/** Tracks font files fetched, so English pages can be shown not to download any CJK font. */
export function watchFonts(page: Page): string[] {
  const urls: string[] = [];
  page.on("request", (req) => {
    const u = req.url();
    if (/\.(woff2?|ttf|otf)(\?|$)/i.test(u)) urls.push(u);
  });
  return urls;
}

/** A CJK font slice. The 1.7 KB `xiaolai-core` subset (中文昵称, used on English pages) is allowed. */
export const isCjkFont = (url: string) =>
  !/xiaolai-core/i.test(url) &&
  /xiaolai|lxgw|noto-serif-sc|\/L\d_[0-9a-f]+_\d+\.woff2/i.test(url);

export interface InspectOptions {
  shotPath: string;
  cdp?: CDPSession;
  reduced?: boolean;
  zh?: boolean;
  contrast?: ContrastRow[];
  /** collects `family (web font | system)` for every font CJK text rendered in */
  fontsSeen?: Set<string>;
}

export async function inspect(
  page: Page,
  screen: string,
  opts: InspectOptions,
): Promise<Problem[]> {
  // let enter animations settle, and let web fonts finish loading (a late CJK slice would
  // otherwise be measured in its wider fallback)
  await page.waitForTimeout(450);
  for (let i = 0; i < 2; i++) {
    await page.evaluate(() =>
      document.fonts.ready.then(() => new Promise(requestAnimationFrame)),
    );
  }
  await page.screenshot({ path: opts.shotPath, fullPage: false });
  const problems = [
    ...(await flatnessProblems(page, screen)),
    ...(await copyProblems(page, screen)),
    ...(await axeProblems(page, screen)),
    ...(await tornProblems(page, screen)),
    ...(await layoutProblems(page, screen)),
  ];
  const rows = await contrastRows(page, screen);
  opts.contrast?.push(...rows);
  problems.push(...contrastProblems(rows));
  if (opts.reduced) problems.push(...(await reducedMotionProblems(page, screen)));
  if (opts.zh && opts.cdp)
    problems.push(...(await cjkProblems(page, opts.cdp, screen, opts.fontsSeen)));
  return problems;
}
