/** Friend codes: 8 characters from an alphabet without 0/O/1/I/L, so they can be read aloud and typed. */
export const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export const CODE_LENGTH = 8;
const RE = /^[A-HJ-NP-Z2-9]{8}$/;

export function makeFriendCode(random: (n: number) => number = randomInt): string {
  let out = "";
  for (let i = 0; i < CODE_LENGTH; i++)
    out += CODE_ALPHABET[random(CODE_ALPHABET.length)];
  return out;
}

function randomInt(max: number): number {
  const buf = new Uint32Array(1);
  // rejection sampling: no modulo bias
  const limit = Math.floor(0x100000000 / max) * max;
  do crypto.getRandomValues(buf);
  while (buf[0]! >= limit);
  return buf[0]! % max;
}

/** What a person typed (spaces, dashes, lower case, easily confused letters) as a code, or null. */
export function normalizeCode(input: string): string | null {
  const cleaned = input
    .toUpperCase()
    .replace(/[\s-]+/g, "")
    .replace(/O/g, "0") // no letter O in codes: people mean zero, which is not used either
    .replace(/[IL]/g, "1");
  // 0 and 1 are not in the alphabet, so a code with them cannot be valid
  return RE.test(cleaned) ? cleaned : null;
}

export const isCode = (v: string) => RE.test(v);

/** `ABCD2345` as `ABCD-2345`. */
export const formatCode = (code: string) => `${code.slice(0, 4)}-${code.slice(4)}`;
