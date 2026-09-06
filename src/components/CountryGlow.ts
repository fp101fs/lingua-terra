import type { Country } from "../types";
import { R } from "../constants";
import { geoToVec3, hslToRgb } from "../utils/geo";

export class CountryGlow {
  group: any;
  private borderMesh: any = null;
  private raysMesh: any = null;
  private borderMat: any;
  private raysMat: any;
  private currentCountry: Country | null = null;
  private opacity = 0;
  private targetOpacity = 0;

  constructor(scene: any) {
    this.group = new THREE.Group();
    this.group.renderOrder = 9;
    this.group.visible = false;

    // 1. Shimmering border outline material
    this.borderMat = new THREE.ShaderMaterial({
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
          // Fast shimmering waves traveling around the border
          float w1 = sin(vWorldPos.x * 24.0 + vWorldPos.y * 30.0 + vWorldPos.z * 26.0 + time * 4.2);
          float w2 = cos(vWorldPos.y * 48.0 - vWorldPos.x * 36.0 - time * 5.8);
          float w3 = sin(vWorldPos.z * 56.0 + vWorldPos.x * 20.0 + time * 3.0);

          // Random sparkling shimmer
          float n = fract(sin(dot(vWorldPos.xyz, vec3(12.9898, 78.233, 45.164)) + time * 3.5) * 43758.5453);
          float sparkle = pow(n, 6.0) * 0.95;

          float shimmer = 0.65 + 0.35 * (0.5 * w1 + 0.3 * w2 + 0.2 * w3);
          vec3 col = mix(baseColor, vec3(1.0, 1.0, 1.0), 0.55 * sparkle + 0.25 * max(0.0, w1));
          float alpha = opacity * clamp(shimmer + sparkle * 1.4, 0.0, 1.0);

          gl_FragColor = vec4(col, alpha);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: true,
    });

    // 2. Outward radiating light rays with energy fluctuation
    this.raysMat = new THREE.ShaderMaterial({
      uniforms: {
        baseColor: { value: new THREE.Color(0x3d8bfd) },
        time: { value: 0 },
        opacity: { value: 0 },
      },
      vertexShader: `
        attribute float rayT;
        attribute float raySeed;
        varying vec3 vWorldPos;
        varying float vRayT;
        varying float vRaySeed;

        void main() {
          vRayT = rayT;
          vRaySeed = raySeed;
          vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
          gl_Position = projectionMatrix * viewMatrix * vec4(vWorldPos, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 baseColor;
        uniform float time;
        uniform float opacity;
        varying vec3 vWorldPos;
        varying float vRayT;
        varying float vRaySeed;

        void main() {
          // Independent harmonic oscillation per ray
          float p1 = sin(time * 3.6 + vRaySeed * 0.81);
          float p2 = cos(time * 5.4 - vRaySeed * 1.47);
          float spatial = sin(vWorldPos.x * 22.0 + vWorldPos.y * 28.0 + vWorldPos.z * 24.0 + time * 3.8);

          // Energy fluctuation: clusters of rays surge and fade organically
          float fluctuation = 0.40 * p1 + 0.35 * p2 + 0.25 * spatial;
          float surge = pow(clamp(fluctuation * 1.15, 0.0, 1.0), 2.2);

          // Rapid electrical flare twitch
          float twitch = pow(max(0.0, sin(time * 9.0 + vRaySeed * 3.1)), 5.0) * 0.4;

          // Tip attenuation: soft fade toward the outer tip
          float tipFade = pow(1.0 - vRayT, 1.4);

          float intensity = surge + twitch;
          float alpha = opacity * intensity * tipFade * 1.6;
          if (alpha < 0.01) discard;

          // Radiant white core near border, blending to rich color at tip
          vec3 col = mix(baseColor, vec3(1.0, 1.0, 1.0), (1.0 - vRayT) * 0.65 + twitch * 0.5);

          gl_FragColor = vec4(col, clamp(alpha, 0.0, 1.0));
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

    // Clean up previous meshes
    if (this.borderMesh) {
      this.group.remove(this.borderMesh);
      this.borderMesh.geometry.dispose();
      this.borderMesh = null;
    }
    if (this.raysMesh) {
      this.group.remove(this.raysMesh);
      this.raysMesh.geometry.dispose();
      this.raysMesh = null;
    }

    if (!c) {
      this.targetOpacity = 0;
      return;
    }

    // Set colors
    const baseCol = colorByLang && c.langColor ? c.langColor : c.color;
    const [r, g, b] = hslToRgb(baseCol[0], Math.min(1.0, baseCol[1] * 1.2), Math.max(0.46, baseCol[2]));
    this.borderMat.uniforms.baseColor.value.setRGB(r, g, b);
    this.raysMat.uniforms.baseColor.value.setRGB(Math.min(1, r * 1.25), Math.min(1, g * 1.25), Math.min(1, b * 1.25));

    // 1. Build border outline line vertices
    const borderVertices: number[] = [];
    const radii = [R * 1.0042, R * 1.0065];

    for (const rad of radii) {
      for (const poly of c.polys) {
        for (let i = 0; i < poly.length - 1; i++) {
          const p1 = poly[i];
          const p2 = poly[i + 1];
          if (Math.abs(p2[0] - p1[0]) > 180) continue;

          const v1 = geoToVec3(p1[1], p1[0], rad);
          const v2 = geoToVec3(p2[1], p2[0], rad);
          borderVertices.push(v1.x, v1.y, v1.z, v2.x, v2.y, v2.z);
        }
      }
    }

    if (borderVertices.length) {
      const geom = new THREE.BufferGeometry();
      geom.setAttribute("position", new THREE.Float32BufferAttribute(borderVertices, 3));
      this.borderMesh = new THREE.LineSegments(geom, this.borderMat);
      this.group.add(this.borderMesh);
    }

    // 2. Build radiating light rays emitting from the border
    const rayVertices: number[] = [];
    const rayTArr: number[] = [];
    const raySeedArr: number[] = [];
    let seedCounter = 0;

    const baseRad = R * 1.0048;

    for (const poly of c.polys) {
      for (let i = 0; i < poly.length - 1; i++) {
        const p1 = poly[i];
        const p2 = poly[i + 1];
        if (Math.abs(p2[0] - p1[0]) > 180) continue;

        const v1 = geoToVec3(p1[1], p1[0], baseRad);
        const v2 = geoToVec3(p2[1], p2[0], baseRad);

        const edgeLen = v1.distanceTo(v2);
        if (edgeLen < 0.001) continue;

        // Emit rays spaced regularly along the boundary
        const rayCount = Math.max(1, Math.min(6, Math.round(edgeLen * 90)));
        const edgeDir = v2.clone().sub(v1).normalize();

        for (let s = 0; s < rayCount; s++) {
          const frac = (s + 0.5) / rayCount;
          const root = v1.clone().lerp(v2, frac);

          // Normal of sphere at root
          const norm = root.clone().normalize();

          // Perpendicular tangent along surface
          const perp = new THREE.Vector3().crossVectors(edgeDir, norm).normalize();

          // Emit short rays in outward directions
          for (const dirSign of [1, -1]) {
            seedCounter++;
            const seed = seedCounter % 2000;

            // Randomized ray length: approx 1.2% to 2.4% of globe radius
            const rayLen = R * (0.012 + (Math.sin(seed * 7.31) * 0.5 + 0.5) * 0.014);

            // Ray direction combines surface perpendicular and outward elevation
            const rayDir = perp.clone().multiplyScalar(dirSign * 0.82)
              .addScaledVector(norm, 0.58)
              .normalize();

            const tip = root.clone().addScaledVector(rayDir, rayLen);

            // Root vertex (rayT = 0.0)
            rayVertices.push(root.x, root.y, root.z);
            rayTArr.push(0.0);
            raySeedArr.push(seed);

            // Tip vertex (rayT = 1.0)
            rayVertices.push(tip.x, tip.y, tip.z);
            rayTArr.push(1.0);
            raySeedArr.push(seed);
          }
        }
      }
    }

    if (rayVertices.length) {
      const rayGeom = new THREE.BufferGeometry();
      rayGeom.setAttribute("position", new THREE.Float32BufferAttribute(rayVertices, 3));
      rayGeom.setAttribute("rayT", new THREE.Float32BufferAttribute(rayTArr, 1));
      rayGeom.setAttribute("raySeed", new THREE.Float32BufferAttribute(raySeedArr, 1));
      this.raysMesh = new THREE.LineSegments(rayGeom, this.raysMat);
      this.group.add(this.raysMesh);
    }

    if (borderVertices.length || rayVertices.length) {
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

    this.borderMat.uniforms.time.value = timeSeconds;
    this.borderMat.uniforms.opacity.value = this.opacity;

    this.raysMat.uniforms.time.value = timeSeconds;
    this.raysMat.uniforms.opacity.value = this.opacity;
  }
}
