import type { CtrlOpt, Country, V3 } from "../types";
import { R, MIN_DIST, MAX_DIST, START } from "../constants";
import { clamp, lerp, wrapLon, geoToVec3, vecToGeo } from "../utils/geo";

export class GlobeControls {
  cam: any;
  dom: HTMLElement;
  lat = START.lat;
  lon = START.lon;
  dist = START.dist;
  tLat = START.lat;
  tLon = START.lon;
  tDist = START.dist;
  private vLat = 0;
  private vLon = 0;
  private p = new Map<number, { x: number; y: number; t: number }>();
  private pts: { x: number; y: number }[] = [];
  private dragging = false;
  private pinching = false;
  private lastTap = 0;
  private moved = 0;
  private downT = 0;
  private zoomAnim: { f: number; t: number; d0: number; d1: number; c0: V3; c1: V3 } | null = null;
  private opt: CtrlOpt;
  private raf = 0;

  constructor(cam: any, dom: HTMLElement, opt: CtrlOpt) {
    this.cam = cam;
    this.dom = dom;
    this.opt = opt;
    dom.addEventListener("pointerdown", this.onDown);
    window.addEventListener("pointermove", this.onMove);
    window.addEventListener("pointerup", this.onUp);
    window.addEventListener("pointercancel", this.onUp);
    dom.addEventListener("wheel", this.onWheel, { passive: false });
    dom.addEventListener("dblclick", this.onDbl);
    dom.addEventListener("contextmenu", e => e.preventDefault());
  }

  /* ------- helpers ------- */
  private pos(e: PointerEvent) {
    const r = this.dom.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  private focal() {
    const h = this.dom.clientHeight || 1;
    return h / (2 * Math.tan(((this.cam.fov * Math.PI) / 180) / 2));
  }

  cursorGroundPoint(cx: number, cy: number): V3 | null {
    const r = this.dom.getBoundingClientRect();
    const nx = ((cx - r.left) / r.width) * 2 - 1,
      ny = -(((cy - r.top) / r.height) * 2 - 1);
    const ro = this.cam.position.clone();
    const rd = new THREE.Vector3(nx, ny, 0.5).unproject(this.cam).sub(ro).normalize();
    const b = ro.dot(rd),
      c = ro.lengthSq() - R * R,
      disc = b * b - c;
    if (disc < 0) return null;
    return ro.addScaledVector(rd, -b - Math.sqrt(disc));
  }

  screenXY(v: V3): { x: number; y: number } | null {
    const p = v.clone().project(this.cam);
    if (p.z > 1) return null;
    const r = this.dom.getBoundingClientRect();
    return { x: ((p.x + 1) / 2) * r.width, y: ((-p.y + 1) / 2) * r.height };
  }

  /* ------- focus / framing ------- */
  focusGeo(lat: number, lon: number, dist: number, ms = 950) {
    const c0 = geoToVec3(this.tLat, this.tLon, 1),
      c1 = geoToVec3(lat, lon, 1);
    this.zoomAnim = {
      f: performance.now(),
      t: ms,
      d0: this.tDist,
      d1: clamp(dist, MIN_DIST, MAX_DIST),
      c0,
      c1,
    };
    this.vLat = this.vLon = 0;
    this.kick();
  }

  frameCountries(cs: Country[]) {
    if (!cs.length) return;
    let x = 0,
      y = 0,
      z = 0;
    let validPts = 0;
    for (const c of cs) {
      for (const poly of c.polys) {
        for (const [lo, la] of poly) {
          if (isNaN(lo) || isNaN(la)) continue;
          const v = geoToVec3(la, lo, 1);
          x += v.x;
          y += v.y;
          z += v.z;
          validPts++;
        }
      }
    }
    const len = Math.hypot(x, y, z);
    // If scattered across globe or degenerate, fallback to capital-weighted center or start position
    let cen: any;
    if (len < 0.001 || validPts === 0) {
      let wx = 0, wy = 0, wz = 0;
      for (const c of cs) {
        const w = Math.sqrt(Math.max(1, c.meta.pop));
        const v = geoToVec3(c.meta.capLat, c.meta.capLon, 1);
        wx += v.x * w;
        wy += v.y * w;
        wz += v.z * w;
      }
      const wlen = Math.hypot(wx, wy, wz);
      if (wlen > 0.001) {
        cen = new THREE.Vector3(wx / wlen, wy / wlen, wz / wlen);
      } else {
        cen = geoToVec3(22, 12, 1);
      }
    } else {
      cen = new THREE.Vector3(x / len, y / len, z / len);
    }

    const g = vecToGeo(cen);
    let maxA = 0.12;
    for (const c of cs) {
      const v = geoToVec3(c.center[1], c.center[0], 1);
      const dotVal = clamp(v.dot(cen), -1, 1);
      const ang = Math.acos(dotVal) + (c.angRad || 0);
      if (ang > maxA) maxA = ang;
    }
    const d = clamp(
      2.4 + (maxA > 0.4 ? (maxA - 0.4) * 0.75 : 0),
      2.3,
      3.2
    );
    this.focusGeo(g.lat, g.lon, d, 1000);
  }

  /* ------- events ------- */
  private onDown = (e: PointerEvent) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    this.dom.setPointerCapture?.(e.pointerId);
    this.p.set(e.pointerId, { ...this.pos(e), t: performance.now() });
    this.pts = [...this.p.values()].map(q => ({ x: q.x, y: q.y }));
    this.moved = 0;
    this.downT = performance.now();
    this.zoomAnim = null;
    this.vLat = this.vLon = 0;
    if (this.p.size === 2) {
      this.pinching = true;
      this.dragging = false;
      this.panning = false;
    } else if (this.p.size === 1) {
      this.dragging = true;
      this.opt.onDown();
    }
    this.dom.classList.add("dragging");
    this.kick();
  };

  private onMove = (e: PointerEvent) => {
    const pos = this.pos(e);
    if (!this.p.has(e.pointerId)) {
      // pure hover
      if (e.pointerType === "mouse") {
        const c = this.opt.onHover(
          pos.x + this.dom.getBoundingClientRect().left,
          pos.y + this.dom.getBoundingClientRect().top
        );
        this.dom.classList.toggle("pick", !!c);
      }
      return;
    }
    const prev = this.p.get(e.pointerId)!;
    const dx = pos.x - prev.x,
      dy = pos.y - prev.y;
    this.moved += Math.abs(dx) + Math.abs(dy);
    this.p.set(e.pointerId, { ...pos, t: performance.now() });
    this.pts = [...this.p.values()].map(q => ({ x: q.x, y: q.y }));

    if (this.pinching && this.p.size === 2) {
      const [a, b] = this.pts,
        d = Math.hypot(a.x - b.x, a.y - b.y);
      if ((this as any)._pd) {
        this.tDist = clamp(
          this.tDist * ((this as any)._pd / Math.max(20, d)),
          MIN_DIST,
          MAX_DIST
        );
      }
      (this as any)._pd = d;
      this.kick();
      return;
    }
    if (this.dragging && this.p.size === 1) {
      const f = this.focal();
      const dLon = (-dx / f) * this.tDist * (180 / Math.PI);
      const dLat = (dy / f) * this.tDist * (180 / Math.PI);
      this.tLon = wrapLon(
        this.tLon + dLon / Math.cos((clamp(this.tLat, -85, 85) * Math.PI) / 180)
      );
      this.tLat = clamp(this.tLat + dLat, -85, 85);
      const dt = 16;
      this.vLon = 0.7 * this.vLon + 0.3 * (dLon / dt);
      this.vLat = 0.7 * this.vLat + 0.3 * (dLat / dt);
      this.kick();
    }
  };

  private onUp = (e: PointerEvent) => {
    const was = this.p.has(e.pointerId);
    this.p.delete(e.pointerId);
    (this as any)._pd = 0;
    if (this.p.size < 2) this.pinching = false;
    if (this.p.size === 0) {
      this.dom.classList.remove("dragging");
      const dur = performance.now() - this.downT;
      if (was && this.moved < 8 && dur < 450 && e.pointerType !== "mouse") {
        // touch tap
        const now = performance.now();
        if (now - this.lastTap < 320) {
          this.doubleTapZoom(e);
          this.lastTap = 0;
        } else {
          this.lastTap = now;
          this.tapPick(e);
        }
      }
      this.dragging = false;
    }
    this.kick();
  };

  private tapPick(e: PointerEvent) {
    const r = this.dom.getBoundingClientRect();
    const c = this.opt.onHover(e.clientX, e.clientY);
    if (c) (window as any).__pickByCode?.(c);
    else (window as any).__pickByCode?.(null);
    void r;
  }

  private doubleTapZoom(e: PointerEvent) {
    const g = this.cursorGroundPoint(e.clientX, e.clientY);
    if (!g) return;
    const { lat, lon } = vecToGeo(g);
    this.focusGeo(lat, lon, Math.max(MIN_DIST + 0.08, this.tDist / 2.4), 750);
  }

  private onWheel = (e: WheelEvent) => {
    e.preventDefault();
    this.zoomAnim = null;
    let factor = 1;
    if (e.ctrlKey || e.metaKey) {
      // trackpad pinch gesture
      factor = Math.pow(1.012, e.deltaY);
    } else {
      // trackpad two-finger vertical scroll or mouse wheel
      let dy = clamp(e.deltaY, -260, 260);
      if (e.deltaMode === 1) dy *= 32;
      factor = Math.pow(1.0015, dy);
    }
    this.tDist = clamp(this.tDist * factor, MIN_DIST, MAX_DIST);
    this.kick();
  };

  private onDbl = (e: MouseEvent) => {
    e.preventDefault();
    const g = this.cursorGroundPoint(e.clientX, e.clientY);
    if (!g) return;
    const { lat, lon } = vecToGeo(g);
    this.focusGeo(lat, lon, Math.max(MIN_DIST + 0.08, this.tDist / 2.6), 800);
    if (this.moved < 8) (window as any).__pickByCode?.(this.opt.onHover(e.clientX, e.clientY));
  };

  /* ------- integration loop ------- */
  kick() {
    if (!this.raf) this.raf = requestAnimationFrame(this.step);
  }

  private step = () => {
    this.raf = 0;
    let again = false;
    if (this.zoomAnim) {
      const a = this.zoomAnim,
        t = clamp((performance.now() - a.f) / a.t, 0, 1);
      const e = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      const c = a.c0.clone().lerp(a.c1, e).normalize();
      const g = vecToGeo(c);
      this.lat = this.tLat = g.lat;
      this.lon = this.tLon = wrapLon(g.lon);
      this.dist = this.tDist = lerp(a.d0, a.d1, e);
      if (t < 1) again = true;
      else this.zoomAnim = null;
    } else {
      if (this.dragging && this.p.size === 1) {
        this.lon = this.tLon;
        this.lat = this.tLat;
        this.dist = this.tDist;
        again = true;
      } else if (this.pinching) {
        this.dist = this.tDist;
        this.lon = lerp(this.lon, this.tLon, 0.35);
        this.lat = lerp(this.lat, this.tLat, 0.35);
        again = true;
      } else {
        if (Math.abs(this.vLon) > 0.0015 || Math.abs(this.vLat) > 0.0015) {
          // inertia
          this.tLon = wrapLon(this.tLon + this.vLon * 16);
          this.tLat = clamp(this.tLat + this.vLat * 16, -85, 85);
          this.vLon *= 0.93;
          this.vLat *= 0.93;
          if (Math.abs(this.vLon) <= 0.0015) this.vLon = 0;
          if (Math.abs(this.vLat) <= 0.0015) this.vLat = 0;
          again = true;
        }
        const s = 0.16;
        const nLon = this.lon + (this.tLon - this.lon) * s;
        this.lat = lerp(this.lat, this.tLat, s);
        this.dist = lerp(this.dist, this.tDist, 0.14);
        let dl = this.tLon - this.lon;
        dl = ((dl + 540) % 360) - 180;
        this.lon = wrapLon(this.lon + dl * s);
        void nLon;
        if (
          Math.abs(this.tLat - this.lat) > 0.0004 ||
          Math.abs(this.tDist - this.dist) > 0.0004 ||
          Math.abs(dl) > 0.0004
        )
          again = true;
        else {
          this.lat = this.tLat;
          this.dist = this.tDist;
          this.lon = this.tLon;
        }
      }
    }
    const p = this.cam.position;
    const cp = Math.cos((this.lat * Math.PI) / 180);
    p.set(
      this.dist * cp * Math.cos((this.lon * Math.PI) / 180),
      this.dist * Math.sin((this.lat * Math.PI) / 180),
      -this.dist * cp * Math.sin((this.lon * Math.PI) / 180)
    );
    this.cam.lookAt(0, 0, 0);
    this.cam.updateMatrixWorld();
    if (again) this.raf = requestAnimationFrame(this.step);
    else this.opt.onIdle();
  };
}
