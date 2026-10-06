/**
 * Turn a `data:` URL into a Blob without `fetch`: the enforcing CSP's `connect-src` does not list
 * `data:`, so `fetch("data:...")` is blocked in production.
 */
export function dataUrlToBlob(link: string): Blob {
  const comma = link.indexOf(",");
  if (!/^data:/i.test(link) || comma < 0) throw new Error("Not a data: URL");
  const head = link.slice(5, comma);
  const body = link.slice(comma + 1);
  const base64 = /;base64$/i.test(head);
  const type = head.replace(/;base64$/i, "").split(";")[0] || "text/plain";
  if (!base64) return new Blob([decodeURIComponent(body)], { type });
  const bin = atob(body);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type });
}
