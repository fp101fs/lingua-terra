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

export const LANG_COLORS: Record<string, [number, number, number]> = {
  en: [198 / 360, 0.95, 0.58], // Vivid Electric Cyan-Blue (UK, US, Canada, Australia, etc.)
  es: [35 / 360, 0.82, 0.52],  // Amber / Warm Orange (Spain, Mexico, Argentina, etc.)
  fr: [280 / 360, 0.72, 0.54], // Purple / Violet (France, Senegal, DRC, etc.)
  zh: [0 / 360, 0.78, 0.52],   // Crimson Red (China, Singapore)
  ar: [145 / 360, 0.72, 0.48], // Emerald Green (Egypt, Saudi Arabia, etc.)
  pt: [175 / 360, 0.74, 0.48], // Teal (Brazil, Portugal, Angola, Mozambique)
  ru: [345 / 360, 0.75, 0.52], // Rose / Magenta (Russia, Belarus, Kazakhstan)
  de: [48 / 360, 0.84, 0.50],  // Gold / Yellow (Germany, Austria, Switzerland)
  hi: [22 / 360, 0.85, 0.53],  // Saffron (India, Fiji)
  it: [310 / 360, 0.72, 0.52], // Orchid (Italy)
  ko: [240 / 360, 0.76, 0.54], // Indigo (Korea)
  th: [190 / 360, 0.78, 0.50], // Cyan (Thailand)
};

export function langColor(langId: string | null): [number, number, number] {
  if (langId && LANG_COLORS[langId]) return LANG_COLORS[langId];
  return [0.6, 0.65, 0.5];
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
      // If both points are already on the antimeridian (e.g. [180, y] to [-180, y]), avoid 0-division
      if (Math.abs(Math.abs(lon0) - 180) < 1e-4 && Math.abs(Math.abs(lon1) - 180) < 1e-4) {
        if (currentSeg.length) segments.push(currentSeg);
        currentSeg = [p1];
        continue;
      }
      let t: number, latEdge: number;
      if (lon0 > 0) {
        // Crossing +180 towards -180
        const denom = lon1 + 360 - lon0;
        t = Math.abs(denom) < 1e-6 ? 0.5 : (180 - lon0) / denom;
        latEdge = lat0 + t * (lat1 - lat0);
        currentSeg.push([180, latEdge]);
        segments.push(currentSeg);
        currentSeg = [[-180, latEdge]];
      } else {
        // Crossing -180 towards +180
        const denom = lon1 - 360 - lon0;
        t = Math.abs(denom) < 1e-6 ? 0.5 : (-180 - lon0) / denom;
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

export type CountryLabel = {
  cx: number;
  cy: number;
  angle: number;
  span: number;
  fontSize: number;
  maxLen: number;
};

export function computeWidestLabel(
  polys: [number, number][][],
  name: string
): CountryLabel {
  if (!polys.length || !polys[0].length) {
    return {
      cx: 0,
      cy: 0,
      angle: 0,
      span: 5,
      fontSize: 18,
      maxLen: 100,
    };
  }

  // Find the largest polygon by vertex count and bounding box
  let bestPoly = polys[0];
  let maxWeight = 0;
  for (const poly of polys) {
    if (poly.length < 3) continue;
    let minX = Infinity,
      maxX = -Infinity,
      minY = Infinity,
      maxY = -Infinity;
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
  let cx = 0,
    cy = 0;
  for (const [x, y] of bestPoly) {
    cx += x;
    cy += y;
  }
  cx /= bestPoly.length;
  cy /= bestPoly.length;

  // Covariance matrix of points projected with latitude scaling
  const cosLat = Math.cos((cy * Math.PI) / 180);
  let sxx = 0,
    syy = 0,
    sxy = 0;
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

  // Compute extents along principal axis u and orthogonal axis v
  let minU = Infinity,
    maxU = -Infinity,
    minV = Infinity,
    maxV = -Infinity;
  for (const [x, y] of bestPoly) {
    const dx = (x - cx) * cosLat;
    const dy = y - cy;
    const u = dx * Math.cos(angle) + dy * Math.sin(angle);
    const v = -dx * Math.sin(angle) + dy * Math.cos(angle);
    if (u < minU) minU = u;
    if (u > maxU) maxU = u;
    if (v < minV) minV = v;
    if (v > maxV) maxV = v;
  }

  // Also test extents at horizontal angle (0 degrees)
  let minX0 = Infinity,
    maxX0 = -Infinity,
    minY0 = Infinity,
    maxY0 = -Infinity;
  for (const [x, y] of bestPoly) {
    const dx = (x - cx) * cosLat;
    const dy = y - cy;
    if (dx < minX0) minX0 = dx;
    if (dx > maxX0) maxX0 = dx;
    if (dy < minY0) minY0 = dy;
    if (dy > maxY0) maxY0 = dy;
  }

  const uLenPCA = maxU - minU;
  const vLenPCA = maxV - minV;
  const uLen0 = maxX0 - minX0;
  const vLen0 = maxY0 - minY0;
  const ratioPCA = uLenPCA / Math.max(0.01, vLenPCA);

  // Available pixel space at PCA vs horizontal (0°)
  const pxLen0 = uLen0 * 11.38 * 0.8;
  const pxHei0 = vLen0 * 11.38 * 0.8;
  const maxFont0 = Math.min(
    Math.floor(pxLen0 / Math.max(1, name.length * 0.60)),
    Math.floor(pxHei0 * 0.82)
  );

  const pxLenPCA = uLenPCA * 11.38 * 0.8;
  const pxHeiPCA = vLenPCA * 11.38 * 0.8;
  const maxFontPCA = Math.min(
    Math.floor(pxLenPCA / Math.max(1, name.length * 0.60)),
    Math.floor(pxHeiPCA * 0.82)
  );

  // For countries whose names fit well within the borders at horizontal (e.g. Brazil, France, India, US, China),
  // or compact/equidimensional countries, display at an even horizontal angle (0°)
  let finalAngle = canvasAngle;
  let pxLen = pxLenPCA;
  let fitFont = maxFontPCA;

  if (Math.abs(canvasAngle) < 0.18) {
    finalAngle = 0;
    pxLen = pxLen0;
    fitFont = maxFont0;
  } else if (ratioPCA < 1.45 && maxFont0 >= 10) {
    // Equidimensional or compact country (e.g. Brazil, France, India)
    finalAngle = 0;
    pxLen = pxLen0;
    fitFont = maxFont0;
  } else if (ratioPCA < 2.0 && maxFont0 >= 18 && maxFont0 >= maxFontPCA * 0.80) {
    // Large country where horizontal text fits comfortably
    finalAngle = 0;
    pxLen = pxLen0;
    fitFont = maxFont0;
  }

  const targetFont = Math.round(13 + span * 1.1);
  const fontSize = clamp(Math.min(targetFont, fitFont), 8, 28);
  const maxLen = Math.max(16, pxLen);

  return {
    cx,
    cy,
    angle: finalAngle,
    span,
    fontSize,
    maxLen,
  };
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
