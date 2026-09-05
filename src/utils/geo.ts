import type { V3 } from "../types";

export const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const wrapLon = (l: number) => ((l + 540) % 360) - 180;
export const hashStr = (s: string) => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return h >>> 0;
};
export const fmtPop = (m: number) =>
  m >= 1 ? `${m.toFixed(m >= 100 ? 0 : 1)} million` : `${Math.round(m * 1000)} k`;

export function geoToVec3(lat: number, lon: number, r: number): V3 {
  const p = (lat * Math.PI) / 180,
    l = (lon * Math.PI) / 180;
  return new THREE.Vector3(
    r * Math.cos(p) * Math.cos(l),
    r * Math.sin(p),
    -r * Math.cos(p) * Math.sin(l)
  );
}

export function vecToGeo(v: V3): { lat: number; lon: number } {
  const r = v.length() || 1;
  return {
    lat: (Math.asin(clamp(v.y / r, -1, 1)) * 180) / Math.PI,
    lon: (Math.atan2(-v.z, v.x) * 180) / Math.PI,
  };
}

export function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  h = ((h % 1) + 1) % 1;
  const f = (n: number) => {
    const k = (n + h * 12) % 12,
      a = s * Math.min(l, 1 - l);
    return l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
  };
  return [f(0), f(8), f(4)];
}

export const cssHsl = (c: [number, number, number], a = 1, dl = 0) =>
  `hsla(${Math.round(c[0] * 360)},${Math.round(c[1] * 100)}%,${clamp(
    Math.round(c[2] * 100) + dl,
    0,
    96
  )}%,${a})`;

export function deterministicColor(a2: string): [number, number, number] {
  const h = hashStr(a2);
  return [
    ((h % 890) / 890 + (h % 7) * 0.013) % 1,
    0.62 + (h % 13) / 90,
    0.47 + ((h >> 4) % 11) / 100,
  ];
}

export function splitAntimeridian(ring: [number, number][]): [number, number][][] {
  if (ring.length < 3) return [ring];
  let crosses = false;
  for (let i = 0; i < ring.length - 1; i++) {
    if (Math.abs(ring[i + 1][0] - ring[i][0]) > 180) {
      crosses = true;
      break;
    }
  }
  if (!crosses) return [ring];

  const segments: [number, number][][] = [];
  let currentSeg: [number, number][] = [ring[0]];
  for (let i = 0; i < ring.length - 1; i++) {
    const p0 = ring[i];
    const p1 = ring[i + 1];
    const dLon = p1[0] - p0[0];
    if (Math.abs(dLon) > 180) {
      const lon0 = p0[0],
        lon1 = p1[0];
      const lat0 = p0[1],
        lat1 = p1[1];
      let t: number, latEdge: number;
      if (lon0 > 0) {
        // Crossing +180 towards -180
        t = (180 - lon0) / (lon1 + 360 - lon0);
        latEdge = lat0 + t * (lat1 - lat0);
        currentSeg.push([180, latEdge]);
        segments.push(currentSeg);
        currentSeg = [[-180, latEdge]];
      } else {
        // Crossing -180 towards +180
        t = (-180 - lon0) / (lon1 - 360 - lon0);
        latEdge = lat0 + t * (lat1 - lat0);
        currentSeg.push([-180, latEdge]);
        segments.push(currentSeg);
        currentSeg = [[180, latEdge]];
      }
    }
    currentSeg.push(p1);
  }
  if (currentSeg.length > 1) {
    segments.push(currentSeg);
  }
  return segments;
}

export function computeWidestLabel(polys: number[][][], name: string): { cx: number; cy: number; angle: number; span: number; fontSize: number } {
  if (!polys.length) return { cx: 0, cy: 0, angle: 0, span: 5, fontSize: 20 };

  // Find the largest polygon by vertex count and bounding box
  let bestPoly = polys[0];
  let maxWeight = 0;
  for (const poly of polys) {
    if (poly.length < 3) continue;
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const [x, y] of poly) {
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
    const weight = (maxX - minX) * (maxY - minY) * poly.length;
    if (weight > maxWeight) {
      maxWeight = weight;
      bestPoly = poly;
    }
  }

  // Calculate centroid of the main polygon
  let cx = 0, cy = 0;
  for (const [x, y] of bestPoly) {
    cx += x;
    cy += y;
  }
  cx /= bestPoly.length;
  cy /= bestPoly.length;

  // Covariance matrix of points projected with latitude scaling
  const cosLat = Math.cos((cy * Math.PI) / 180);
  let sxx = 0, syy = 0, sxy = 0;
  for (const [x, y] of bestPoly) {
    const dx = (x - cx) * cosLat;
    const dy = y - cy;
    sxx += dx * dx;
    syy += dy * dy;
    sxy += dx * dy;
  }
  const n = bestPoly.length;
  // Principal axis angle
  const angle = 0.5 * Math.atan2(2 * sxy, sxx - syy);
  // In canvas coordinates, y increases downward, so invert angle
  let canvasAngle = -angle;
  // Keep text right-side up (-pi/2 to pi/2)
  while (canvasAngle > Math.PI / 2) canvasAngle -= Math.PI;
  while (canvasAngle < -Math.PI / 2) canvasAngle += Math.PI;

  const span = Math.sqrt(Math.max(sxx, syy) / Math.max(1, n));
  // Font size scaled to country span, clamped for legibility on texture
  const fontSize = clamp(Math.round(14 + span * 1.3), 16, 32);

  return { cx, cy, angle: canvasAngle, span, fontSize };
}

export function decodeTopoCountries(topo: any): Map<string, number[][][]> {
  const tf = topo.transform,
    tr = topo.objects.countries.geometries;
  const K = tf ? [tf.scale[0], tf.scale[1]] : [1, 1],
    T = tf ? [tf.translate[0], tf.translate[1]] : [0, 0];
  const arcs: [number, number][][] = topo.arcs.map((arc: number[][]) => {
    let x = 0,
      y = 0;
    return arc.map(pt => {
      x += pt[0];
      y += pt[1];
      return [x * K[0] + T[0], y * K[1] + T[1]];
    });
  });
  const line = (idx: number): [number, number][] =>
    idx >= 0 ? arcs[idx].slice() : arcs[~idx].slice().reverse();

  function ringArcs(ringIdx: number[]): [number, number][] {
    let pts: [number, number][] = [];
    for (const ai of ringIdx) {
      const seg = line(ai);
      if (pts.length) pts.pop(); // shared junction point
      pts = pts.concat(seg);
    }
    return pts;
  }
  const out = new Map<string, number[][][]>();
  for (const g of tr) {
    const id = String(g.id).padStart(3, "0");
    const polys: number[][][] = [];
    const parts = g.type === "Polygon" ? [g.arcs] : g.type === "MultiPolygon" ? g.arcs : [];
    for (const poly of parts) {
      for (const ring of poly.map(ringArcs)) {
        const split = splitAntimeridian(ring as [number, number][]);
        polys.push(...split);
      }
    }
    out.set(id, polys);
  }
  return out;
}
