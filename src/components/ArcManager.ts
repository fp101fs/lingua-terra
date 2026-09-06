import type { Country } from "../types";
import { R } from "../constants";
import { LANGS, LANG_HUBS, langName } from "../data/languages";
import { geoToVec3, clamp, langColor, hslToRgb } from "../utils/geo";

interface ArcData {
  points: any[]; // THREE.Vector3 array
  length: number;
}

export class ArcManager {
  group: any;
  private lineMesh: any = null;
  private particleMesh: any = null;
  private currentArcs: ArcData[] = [];
  private opacity = 0;
  private targetOpacity = 0;
  private currentColor: [number, number, number] = [0.2, 0.7, 1.0];
  private lineMat: any;
  private particleMat: any;

  constructor(scene: any) {
    this.group = new THREE.Group();
    this.group.renderOrder = 7;
    this.group.visible = false;

    // Glowing additive lines
    this.lineMat = new THREE.LineBasicMaterial({
      color: 0x3d8bfd,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: true,
      linewidth: 1.8,
    });

    // Pulse particles traveling along arcs
    const cv = document.createElement("canvas");
    cv.width = 64;
    cv.height = 64;
    const ctx = cv.getContext("2d")!;
    const rad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    rad.addColorStop(0, "rgba(255, 255, 255, 1)");
    rad.addColorStop(0.35, "rgba(200, 230, 255, 0.9)");
    rad.addColorStop(0.7, "rgba(70, 160, 255, 0.4)");
    rad.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = rad;
    ctx.fillRect(0, 0, 64, 64);
    const particleTex = new THREE.CanvasTexture(cv);

    this.particleMat = new THREE.PointsMaterial({
      size: 0.052,
      map: particleTex,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: true,
    });

    scene.add(this.group);
  }

  setSelection(
    mode: "none" | "lang" | "all",
    langId: string | null,
    byCode: Map<string, Country>
  ) {
    // Clear previous geometries
    if (this.lineMesh) {
      this.group.remove(this.lineMesh);
      this.lineMesh.geometry.dispose();
      this.lineMesh = null;
    }
    if (this.particleMesh) {
      this.group.remove(this.particleMesh);
      this.particleMesh.geometry.dispose();
      this.particleMesh = null;
    }
    this.currentArcs = [];

    if (mode === "none" || (mode === "lang" && !langId)) {
      this.targetOpacity = 0;
      return;
    }

    const arcDefs: { from: Country; to: Country; color: [number, number, number] }[] = [];

    if (mode === "lang" && langId) {
      const L = langName(langId);
      const hubCode = LANG_HUBS[langId] || L.countries[0];
      const hubCountry = byCode.get(hubCode);
      const col = langColor(langId);
      this.currentColor = col;

      if (hubCountry) {
        for (const code of L.countries) {
          if (code === hubCode) continue;
          const target = byCode.get(code);
          if (target) {
            arcDefs.push({ from: hubCountry, to: target, color: col });
          }
        }
      }
    } else if (mode === "all") {
      // Connect major linguistic hubs across the world in an ambient network
      const hubCodes = Object.entries(LANG_HUBS);
      for (let i = 0; i < hubCodes.length; i++) {
        const [lId, cCode] = hubCodes[i];
        const c1 = byCode.get(cCode);
        if (!c1) continue;
        const nextHub = hubCodes[(i + 1) % hubCodes.length];
        const c2 = byCode.get(nextHub[1]);
        if (c2) {
          arcDefs.push({ from: c1, to: c2, color: langColor(lId) });
        }
      }
    }

    if (!arcDefs.length) {
      this.targetOpacity = 0;
      return;
    }

    // Build curve points using Spherical Great-Circle Interpolation (SLERP)
    const lineVertices: number[] = [];
    const lineColors: number[] = [];
    const [r, g, b] = hslToRgb(...this.currentColor);
    this.lineMat.color.setRGB(r, g, b);
    this.particleMat.color.setRGB(Math.min(1, r * 1.3), Math.min(1, g * 1.3), Math.min(1, b * 1.3));

    const rBase = R * 1.008;

    for (const def of arcDefs) {
      const p0 = geoToVec3(def.from.center[1], def.from.center[0], 1.0);
      const p2 = geoToVec3(def.to.center[1], def.to.center[0], 1.0);

      const u0 = p0.clone().normalize();
      const u2 = p2.clone().normalize();

      const dotVal = clamp(u0.dot(u2), -1, 1);
      const angle = Math.acos(dotVal);
      if (angle < 0.04) continue; // skip identical or tiny distance

      // Determine rotation axis for slerp
      let axis: any;
      if (angle > 3.12) {
        axis = Math.abs(u0.x) < 0.8 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0);
        axis.cross(u0).normalize();
      } else {
        axis = new THREE.Vector3().crossVectors(u0, u2).normalize();
      }

      const sinOmega = Math.sin(angle);
      // Elevation factor scales smoothly with great-circle angular distance
      const altitudeFactor = 0.04 + Math.sin(angle / 2) * 0.34;
      const steps = Math.max(28, Math.min(72, Math.round(angle * 26)));
      const pts: any[] = [];

      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        let u: any;
        if (sinOmega < 0.0001) {
          u = u0.clone().applyAxisAngle(axis, angle * t);
        } else {
          const w0 = Math.sin((1 - t) * angle) / sinOmega;
          const w2 = Math.sin(t * angle) / sinOmega;
          u = u0.clone().multiplyScalar(w0).addScaledVector(u2, w2).normalize();
        }

        // Parabolic arc guaranteed to stay strictly above globe surface
        const alt = Math.sin(t * Math.PI) * altitudeFactor;
        const radius = rBase * (1.0 + alt);
        pts.push(u.multiplyScalar(radius));
      }

      let arcLength = 0;
      for (let i = 0; i < pts.length - 1; i++) {
        arcLength += pts[i].distanceTo(pts[i + 1]);
      }

      this.currentArcs.push({
        points: pts,
        length: arcLength,
      });

      const [cr, cg, cb] = hslToRgb(...def.color);
      for (let i = 0; i < pts.length - 1; i++) {
        lineVertices.push(pts[i].x, pts[i].y, pts[i].z);
        lineVertices.push(pts[i + 1].x, pts[i + 1].y, pts[i + 1].z);
        // Soft fade near launch and landing points
        const t1 = Math.sin((i / (pts.length - 1)) * Math.PI);
        const t2 = Math.sin(((i + 1) / (pts.length - 1)) * Math.PI);
        lineColors.push(cr * (0.2 + 0.8 * t1), cg * (0.2 + 0.8 * t1), cb * (0.2 + 0.8 * t1));
        lineColors.push(cr * (0.2 + 0.8 * t2), cg * (0.2 + 0.8 * t2), cb * (0.2 + 0.8 * t2));
      }
    }

    if (lineVertices.length) {
      const lineGeom = new THREE.BufferGeometry();
      lineGeom.setAttribute("position", new THREE.Float32BufferAttribute(lineVertices, 3));
      lineGeom.setAttribute("color", new THREE.Float32BufferAttribute(lineColors, 3));
      this.lineMat.vertexColors = true;
      this.lineMesh = new THREE.LineSegments(lineGeom, this.lineMat);
      this.group.add(this.lineMesh);

      // Setup particle points
      const particlePositions = new Float32Array(this.currentArcs.length * 3);
      const particleGeom = new THREE.BufferGeometry();
      particleGeom.setAttribute("position", new THREE.BufferAttribute(particlePositions, 3));
      this.particleMesh = new THREE.Points(particleGeom, this.particleMat);
      this.group.add(this.particleMesh);

      this.targetOpacity = 0.88;
      this.group.visible = true;
    }
  }

  update(timeSeconds: number) {
    if (this.opacity < this.targetOpacity) {
      this.opacity = Math.min(this.targetOpacity, this.opacity + 0.05);
    } else if (this.opacity > this.targetOpacity) {
      this.opacity = Math.max(this.targetOpacity, this.opacity - 0.05);
      if (this.opacity <= 0.01) {
        this.group.visible = false;
        return;
      }
    }

    if (!this.group.visible) return;

    this.lineMat.opacity = this.opacity * 0.78;
    this.particleMat.opacity = this.opacity * 0.95;

    // Animate traveling particles along great-circle points
    if (this.particleMesh && this.currentArcs.length) {
      const posAttr = this.particleMesh.geometry.attributes.position;
      const arr = posAttr.array;

      for (let i = 0; i < this.currentArcs.length; i++) {
        const arc = this.currentArcs[i];
        const pts = arc.points;
        if (!pts.length) continue;
        const phase = (timeSeconds * 0.35 + i * 0.19) % 1;
        const idx = phase * (pts.length - 1);
        const i0 = Math.floor(idx);
        const i1 = Math.min(pts.length - 1, i0 + 1);
        const frac = idx - i0;

        const px = pts[i0].x + (pts[i1].x - pts[i0].x) * frac;
        const py = pts[i0].y + (pts[i1].y - pts[i0].y) * frac;
        const pz = pts[i0].z + (pts[i1].z - pts[i0].z) * frac;

        arr[i * 3] = px;
        arr[i * 3 + 1] = py;
        arr[i * 3 + 2] = pz;
      }
      posAttr.needsUpdate = true;
    }
  }
}
