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
    for (const poly of parts) polys.push(...poly.map(ringArcs));
    out.set(id, polys);
  }
  return out;
}
