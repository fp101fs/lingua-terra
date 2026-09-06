import type { Country } from "../types";
import { R } from "../constants";
import { geoToVec3, hslToRgb } from "../utils/geo";

export class CountryGlow {
  group: any;
  private lineMesh: any = null;
  private mat: any;
  private currentCountry: Country | null = null;
  private opacity = 0;
  private targetOpacity = 0;

  constructor(scene: any) {
    this.group = new THREE.Group();
    this.group.renderOrder = 8;
    this.group.visible = false;

    this.mat = new THREE.ShaderMaterial({
      uniforms: {
        baseColor: { value: new THREE.Color(0x3d8bfd) },
        time: { value: 0 },
        opacity: { value: 0 },
      },
      vertexShader: `
        varying vec3 vWorldPos;
        void main() {
          vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
          gl_Position = projectionMatrix * viewMatrix * vec4(vWorldPos, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 baseColor;
        uniform float time;
        uniform float opacity;
        varying vec3 vWorldPos;

        void main() {
          // Multi-frequency wave shimmer moving along boundaries
          float w1 = sin(vWorldPos.x * 26.0 + vWorldPos.y * 32.0 + vWorldPos.z * 28.0 + time * 3.8);
          float w2 = cos(vWorldPos.y * 50.0 - vWorldPos.x * 38.0 - time * 5.5);
          float w3 = sin(vWorldPos.z * 60.0 + vWorldPos.x * 18.0 + time * 2.8);

          // Random sparkle shimmer effect
          float n = fract(sin(dot(vWorldPos.xyz, vec3(12.9898, 78.233, 45.164)) + time * 3.2) * 43758.5453);
          float sparkle = pow(n, 6.5) * 0.9;

          float shimmer = 0.65 + 0.35 * (0.5 * w1 + 0.3 * w2 + 0.2 * w3);
          vec3 col = mix(baseColor, vec3(1.0, 1.0, 1.0), 0.5 * sparkle + 0.22 * max(0.0, w1));
          float alpha = opacity * clamp(shimmer + sparkle * 1.3, 0.0, 1.0);

          gl_FragColor = vec4(col, alpha);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: true,
    });

    scene.add(this.group);
  }

  setCountry(c: Country | null, colorByLang = true) {
    if (this.currentCountry === c) return;
    this.currentCountry = c;

    if (this.lineMesh) {
      this.group.remove(this.lineMesh);
      this.lineMesh.geometry.dispose();
      this.lineMesh = null;
    }

    if (!c) {
      this.targetOpacity = 0;
      return;
    }

    // Set color matching country / language
    const baseCol = colorByLang && c.langColor ? c.langColor : c.color;
    const [r, g, b] = hslToRgb(baseCol[0], Math.min(1.0, baseCol[1] * 1.15), Math.max(0.48, baseCol[2]));
    this.mat.uniforms.baseColor.value.setRGB(r, g, b);

    // Build boundary line vertices
    const vertices: number[] = [];

    // Two elevation heights for rich 3D aura depth
    const radii = [R * 1.0042, R * 1.0068];

    for (const rad of radii) {
      for (const poly of c.polys) {
        for (let i = 0; i < poly.length - 1; i++) {
          const p1 = poly[i];
          const p2 = poly[i + 1];

          // Skip antimeridian seam jumps
          if (Math.abs(p2[0] - p1[0]) > 180) continue;

          const v1 = geoToVec3(p1[1], p1[0], rad);
          const v2 = geoToVec3(p2[1], p2[0], rad);

          vertices.push(v1.x, v1.y, v1.z);
          vertices.push(v2.x, v2.y, v2.z);
        }
      }
    }

    if (vertices.length) {
      const geom = new THREE.BufferGeometry();
      geom.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
      this.lineMesh = new THREE.LineSegments(geom, this.mat);
      this.group.add(this.lineMesh);
      this.targetOpacity = 1.0;
      this.group.visible = true;
    } else {
      this.targetOpacity = 0;
    }
  }

  update(timeSeconds: number) {
    if (this.opacity < this.targetOpacity) {
      this.opacity = Math.min(this.targetOpacity, this.opacity + 0.08);
    } else if (this.opacity > this.targetOpacity) {
      this.opacity = Math.max(this.targetOpacity, this.opacity - 0.08);
      if (this.opacity <= 0.01) {
        this.group.visible = false;
        return;
      }
    }

    if (!this.group.visible) return;

    this.mat.uniforms.time.value = timeSeconds;
    this.mat.uniforms.opacity.value = this.opacity;
  }
}
