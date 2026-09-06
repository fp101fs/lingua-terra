import type { Country } from "../types";
import { R } from "../constants";
import { LANGS, LANG_HUBS, langName } from "../data/languages";
import { geoToVec3, clamp, langColor, hslToRgb } from "../utils/geo";

interface ArcData {
  curve: any;
  points: any[];
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
    this.group.renderOrder = 4;
    this.group.visible = false;

    // Glowing additive lines
    this.lineMat = new THREE.LineBasicMaterial({
      color: 0x3d8bfd,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: true,
      linewidth: 1.5,
    });

    // Pulse particles traveling along arcs
    const cv = document.createElement("canvas");
    cv.width = 64;
    cv.height = 64;
    const ctx = cv.getContext("2d")!;
    const rad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    rad.addColorStop(0, "rgba(255, 255, 255, 1)");
    rad.addColorStop(0.35, "rgba(180, 220, 255, 0.85)");
    rad.addColorStop(0.7, "rgba(70, 150, 255, 0.35)");
    rad.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = rad;
    ctx.fillRect(0, 0, 64, 64);
    const particleTex = new THREE.CanvasTexture(cv);

    this.particleMat = new THREE.PointsMaterial({
      size: 0.045,
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

    // Build curve points
    const lineVertices: number[] = [];
    const lineColors: number[] = [];
    const [r, g, b] = hslToRgb(...this.currentColor);
    this.lineMat.color.setRGB(r, g, b);
    this.particleMat.color.setRGB(Math.min(1, r * 1.3), Math.min(1, g * 1.3), Math.min(1, b * 1.3));

    for (const def of arcDefs) {
      const p0 = geoToVec3(def.from.center[1], def.from.center[0], R * 1.006);
      const p2 = geoToVec3(def.to.center[1], def.to.center[0], R * 1.006);

      const d = p0.distanceTo(p2);
      if (d < 0.05) continue; // skip tiny or self-arcs

      const dotVal = clamp(p0.dot(p2) / (R * 1.006 * R * 1.006), -1, 1);
      const angle = Math.acos(dotVal);

      // Parabolic altitude scales with angular separation
      const altitude = R * (1.012 + Math.sin(angle / 2) * 0.28);
      const mid = p0.clone().add(p2).multiplyScalar(0.5).normalize().multiplyScalar(altitude);

      const curve = new THREE.QuadraticBezierCurve3(p0, mid, p2);
      const steps = Math.max(20, Math.min(60, Math.round(angle * 26)));
      const pts = curve.getPoints(steps);

      this.currentArcs.push({
        curve,
        points: pts,
        length: curve.getLength(),
      });

      const [cr, cg, cb] = hslToRgb(...def.color);
      for (let i = 0; i < pts.length - 1; i++) {
        lineVertices.push(pts[i].x, pts[i].y, pts[i].z);
        lineVertices.push(pts[i + 1].x, pts[i + 1].y, pts[i + 1].z);
        const t1 = Math.sin((i / (pts.length - 1)) * Math.PI);
        const t2 = Math.sin(((i + 1) / (pts.length - 1)) * Math.PI);
        lineColors.push(cr * t1, cg * t1, cb * t1);
        lineColors.push(cr * t2, cg * t2, cb * t2);
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

      this.targetOpacity = 0.85;
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

    this.lineMat.opacity = this.opacity * 0.75;
    this.particleMat.opacity = this.opacity * 0.95;

    // Animate traveling particles along curves
    if (this.particleMesh && this.currentArcs.length) {
      const posAttr = this.particleMesh.geometry.attributes.position;
      const arr = posAttr.array;

      for (let i = 0; i < this.currentArcs.length; i++) {
        const arc = this.currentArcs[i];
        const phase = (timeSeconds * 0.35 + i * 0.19) % 1;
        const pt = arc.curve.getPoint(phase);
        arr[i * 3] = pt.x;
        arr[i * 3 + 1] = pt.y;
        arr[i * 3 + 2] = pt.z;
      }
      posAttr.needsUpdate = true;
    }
  }
}
