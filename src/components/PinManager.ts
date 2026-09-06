import type { Country } from "../types";
import { R, PIN_SHOW_DIST } from "../constants";
import { clamp, geoToVec3, hslToRgb } from "../utils/geo";

export class PinManager {
  group: any;
  private sprites: any[] = [];
  private tex: any;

  constructor(scene: any, countries: Country[]) {
    this.tex = this.makeTexture();
    this.group = new THREE.Group();
    for (const c of countries) {
      const mat = new THREE.SpriteMaterial({
        map: this.tex,
        depthTest: false,
        depthWrite: false,
        transparent: true,
        opacity: 1.0,
        alphaTest: 0.05,
      });
      // Match the country's fill color (langColor when color-by-language is active) in a darker, richer tone
      const baseColor = c.langColor || c.color;
      const h = baseColor[0];
      const s = Math.min(1.0, baseColor[1] * 1.05);
      const l = Math.max(0.24, baseColor[2] * 0.72);
      mat.color.setRGB(...hslToRgb(h, s, l));

      const sSprite = new THREE.Sprite(mat);
      sSprite.renderOrder = 10; // render on top of atmosphere & clouds for crisp opacity
      sSprite.center.set(0.5, 0.05); // anchor tip at country position
      sSprite.position.copy(geoToVec3(c.center[1], c.center[0], R * 1.013));
      sSprite.userData.code = c.meta.a2;
      sSprite.visible = false;
      this.group.add(sSprite);
      this.sprites.push(sSprite);
    }
    scene.add(this.group);
  }

  private makeTexture() {
    const cv = document.createElement("canvas");
    cv.width = 128;
    cv.height = 128;
    const g = cv.getContext("2d")!;
    g.clearRect(0, 0, 128, 128);
    g.shadowColor = "rgba(0, 0, 0, 0.75)";
    g.shadowBlur = 8;
    g.shadowOffsetY = 4;
    g.beginPath();
    g.arc(64, 40, 28, Math.PI * 0.86, Math.PI * 0.14);
    g.lineTo(64, 118);
    g.closePath();
    g.fillStyle = "#ffffff";
    g.fill();
    g.shadowColor = "transparent";
    g.strokeStyle = "#080d16";
    g.lineWidth = 5;
    g.stroke();
    g.beginPath();
    g.arc(64, 40, 12, 0, Math.PI * 2);
    g.fillStyle = "#0c1524";
    g.fill();
    const t = new THREE.CanvasTexture(cv);
    t.anisotropy = 8;
    return t;
  }

  update(cam: any, active: Set<string>, enabled = true) {
    if (!enabled) {
      for (const s of this.sprites) s.visible = false;
      return;
    }
    const camDist = cam.position.length();
    const showPins = camDist < PIN_SHOW_DIST;
    const camDir = cam.position.clone().normalize();
    // Precise line-of-sight spherical horizon threshold (P · camDir > R^2 / D) plus margin
    const horizonDot = (R * R) / Math.max(camDist, R * 1.01) + 0.04;
    for (const s of this.sprites) {
      const on = showPins && active.has(s.userData.code);
      s.visible = on;
      if (!on) continue;
      s.visible = s.position.dot(camDir) > horizonDot;
      if (!s.visible) continue;
      const d = cam.position.distanceTo(s.position);
      const sc = clamp(d * 0.034, 0.02, 0.095);
      s.scale.set(sc, sc, 1);
    }
  }

  pick(cam: any, cx: number, cy: number, w: number, h: number): string | null {
    const nx = (cx / w) * 2 - 1,
      ny = -(cy / h) * 2 + 1;
    const ro = cam.position.clone();
    const rd = new THREE.Vector3(nx, ny, 0.5).unproject(cam).sub(ro).normalize();
    let best: string | null = null,
      bd = 0.028;
    for (const s of this.sprites) {
      if (!s.visible) continue;
      const t = s.position.clone().sub(ro).dot(rd);
      if (t < 0) continue;
      const d = ro.clone().addScaledVector(rd, t).distanceTo(s.position);
      if (d < bd) {
        bd = d;
        best = s.userData.code;
      }
    }
    return best;
  }
}
