export function joinOpenPathsToClosedRings(paths, threshold = 10) {
  const rings = [];
  const used = new Array(paths.length).fill(false);

  for (let i = 0; i < paths.length; i++) {
    if (used[i]) continue;
    let ring = [...paths[i]];
    let joined = [i];

    let changed = true;
    while (changed) {
      changed = false;
      for (let j = 0; j < paths.length; j++) {
        if (joined.includes(j) || i === j) continue;
        const endX = ring[ring.length - 2];
        const endY = ring[ring.length - 1];
        const startX = paths[j][0];
        const startY = paths[j][1];
        const dist = Math.hypot(endX - startX, endY - startY);
        if (dist < threshold) {
          ring = ring.concat(paths[j].slice(2));
          joined.push(j);
          changed = true;
        }
      }
    }
    const startX = ring[0];
    const startY = ring[1];
    const endX = ring[ring.length - 2];
    const endY = ring[ring.length - 1];
    const dist = Math.hypot(endX - startX, endY - startY);
    if (dist < threshold && ring.length >= 6) {
      rings.push(ring);
      joined.forEach((idx) => {
        used[idx] = true;
      });
    }
  }
  return { rings, used };
}
