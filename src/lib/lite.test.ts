import { beforeEach, describe, expect, it } from "vitest";
import { initLite, isLite, renderScale } from "./lite";

describe("lite drawing", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove("zf-lite");
    window.history.replaceState({}, "", "/");
    Object.defineProperty(window, "devicePixelRatio", { value: 2, configurable: true });
    Object.defineProperty(navigator, "webdriver", { value: true, configurable: true });
  });

  it("draws at up to twice the pixels normally", () => {
    initLite();
    expect(isLite()).toBe(false);
    expect(renderScale()).toBe(2);
  });

  it("?lite=1 turns it on, remembers it, and draws at one pixel per pixel", () => {
    window.history.replaceState({}, "", "/?lite=1");
    initLite();
    expect(isLite()).toBe(true);
    expect(document.documentElement.classList.contains("zf-lite")).toBe(true);
    expect(renderScale()).toBe(1);
    // a later visit without the parameter keeps it
    window.history.replaceState({}, "", "/");
    initLite();
    expect(isLite()).toBe(true);
  });

  it("?lite=0 turns it back off", () => {
    localStorage.setItem("zf-lite", "1");
    window.history.replaceState({}, "", "/?lite=0");
    initLite();
    expect(isLite()).toBe(false);
    expect(document.documentElement.classList.contains("zf-lite")).toBe(false);
  });
});
