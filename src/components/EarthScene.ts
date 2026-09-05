import { R, R_OVER, TEX } from "../constants";
import type { Country, LayerState } from "../types";
import { cssHsl, clamp, wrapLon } from "../utils/geo";

export class EarthScene {
  renderer: any;
  scene: any;
  cam: any;
  sun: any;
  cloudMesh: any;
  earthMat: any;

  fillCv: HTMLCanvasElement;
  fillCtx: CanvasRenderingContext2D;
  fillTex: any;

  pickW = 2048;
  pickH = 1024;
  pickData!: Uint8ClampedArray;
  overlayDirty = true;

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
    this.renderer.setSize(innerWidth, innerHeight);
    this.renderer.outputEncoding = (THREE as any).sRGBEncoding;

    this.scene = new THREE.Scene();
    this.cam = new THREE.PerspectiveCamera(42, innerWidth / innerHeight, 0.02, 60);

    this.sun = new THREE.DirectionalLight(0xffffff, 2.35);
    this.scene.add(this.sun, new THREE.AmbientLight(0x223349, 0.9));

    // Earth shader: day + night-lights + ocean specular + soft terminator
    const texL = this.loadTex(TEX.day, true);
    const texN = this.loadTex(TEX.night, true);
    const texB = this.loadTex(TEX.bump, false);

    this.earthMat = new THREE.ShaderMaterial({
      uniforms: {
        dayMap: { value: texL },
        nightMap: { value: texN },
        bumpMap: { value: texB },
        sunDir: { value: new THREE.Vector3(1, 0, 0) },
        useBump: { value: 1.0 },
        useNight: { value: 1.0 },
      },
      vertexShader: `
        varying vec2 vUv; varying vec3 vN; varying vec3 vP;
        void main(){ vUv = uv;
          vN = normalize(mat3(modelMatrix) * normal);
          vec4 wp = modelMatrix * vec4(position,1.0); vP = wp.xyz;
          gl_Position = projectionMatrix * viewMatrix * wp; }`,
      fragmentShader: `
        uniform sampler2D dayMap, nightMap, bumpMap; uniform vec3 sunDir;
        uniform float useBump, useNight;
        varying vec2 vUv; varying vec3 vN; varying vec3 vP;
        void main(){
          vec3 day = texture2D(dayMap, vUv).rgb;
          vec3 night = useNight > 0.5 ? texture2D(nightMap, vUv).rgb : vec3(0.0);
          float bump = useBump > 0.5 ? texture2D(bumpMap, vUv).r : 0.05;
          vec3 sd = normalize(sunDir);
          float lambert = dot(normalize(vN), sd);
          float dayAmt = smoothstep(-0.12, 0.30, lambert);
          vec3 V = normalize(cameraPosition - vP);
          vec3 Hv = normalize(sd + V);
          float ocean = 1.0 - smoothstep(0.045, 0.085, bump);
          float spec = pow(max(dot(normalize(vN), Hv), 0.0), 48.0) * ocean * dayAmt;
          vec3 col = day * (0.34 + 0.85 * dayAmt) + night * (1.0 - dayAmt) * 1.7
                   + vec3(0.9, 0.95, 1.0) * spec * 0.55;
          col += vec3(0.30, 0.52, 0.95) * pow(1.0 - abs(dot(normalize(vN), V)), 3.0) * 0.22;
          gl_FragColor = vec4(col, 1.0);
        }`,
    });
    this.scene.add(new THREE.Mesh(new THREE.SphereGeometry(R, 96, 96), this.earthMat));

    // Overlay shell (country fills & borders)
    this.fillCv = document.createElement("canvas");
    this.fillCv.width = 4096;
    this.fillCv.height = 2048;
    this.fillCtx = this.fillCv.getContext("2d")!;
    this.fillTex = new THREE.CanvasTexture(this.fillCv);
    this.fillTex.wrapS = THREE.RepeatWrapping;
    this.fillTex.minFilter = THREE.LinearFilter;
    this.fillTex.magFilter = THREE.LinearFilter;
    this.fillTex.generateMipmaps = false;
    this.fillTex.anisotropy = this.renderer.capabilities.getMaxAnisotropy();
    const ovMat = new THREE.MeshBasicMaterial({ map: this.fillTex, transparent: true, depthWrite: false });
    const ov = new THREE.Mesh(new THREE.SphereGeometry(R_OVER, 96, 96), ovMat);
    ov.renderOrder = 2;
    this.scene.add(ov);

    // Clouds
    const cl = this.loadTex(TEX.clouds, false);
    this.cloudMesh = new THREE.Mesh(
      new THREE.SphereGeometry(R * 1.028, 64, 64),
      new THREE.MeshBasicMaterial({ map: cl, transparent: true, opacity: 0.5, depthWrite: false })
    );
    this.cloudMesh.renderOrder = 3;
    this.scene.add(this.cloudMesh);

    // Atmosphere halo
    const atmo = new THREE.Mesh(
      new THREE.SphereGeometry(R * 1.16, 64, 64),
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        vertexShader: `varying vec3 vN; void main(){ vN = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
        fragmentShader: `varying vec3 vN; void main(){
          float i = pow(0.72 - dot(vN, vec3(0.,0.,-1.)), 4.0);
          gl_FragColor = vec4(0.35, 0.58, 1.0, 1.0) * i; }`,
      })
    );
    atmo.renderOrder = 1;
    this.scene.add(atmo);

    // Stars
    const N = 750,
      pos = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      const v = new THREE.Vector3().randomDirection
        ? new THREE.Vector3().randomDirection()
        : new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize();
      v.multiplyScalar(30 + Math.random() * 8);
      pos.set([v.x, v.y, v.z], i * 3);
    }
    const sg = new THREE.BufferGeometry();
    sg.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    this.scene.add(
      new THREE.Points(
        sg,
        new THREE.PointsMaterial({ color: 0xbfd6ff, size: 0.05, transparent: true, opacity: 0.8 })
      )
    );
  }

  private loadTex(url: string, srgb: boolean) {
    const t = new THREE.TextureLoader().load(url);
    if (srgb) t.encoding = (THREE as any).sRGBEncoding;
    t.anisotropy = 8;
    return t;
  }

  onResize(w: number, h: number) {
    this.cam.aspect = w / h;
    this.cam.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  private tracePoly(g: CanvasRenderingContext2D, poly: number[][], W: number, H: number) {
    if (poly.length < 2) return;
    for (let i = 0; i < poly.length; i++) {
      const x = ((poly[i][0] + 180) / 360) * W,
        y = ((90 - poly[i][1]) / 180) * H;
      i ? g.lineTo(x, y) : g.moveTo(x, y);
    }
    const d0 = poly[0], d1 = poly[poly.length - 1];
    if (Math.hypot(d0[0] - d1[0], d0[1] - d1[1]) < 1.0) {
      g.closePath();
    }
  }

  buildIndexRaster(countries: Country[]) {
    const W = this.pickW,
      H = this.pickH;
    const cv = document.createElement("canvas");
    cv.width = W;
    cv.height = H;
    const g = cv.getContext("2d", { willReadFrequently: true })!;
    g.fillStyle = "#000000";
    g.fillRect(0, 0, W, H);
    let i = 1;
    g.globalCompositeOperation = "source-over";
    for (const c of countries) {
      const r = i & 255,
        gg = (i >> 8) & 255,
        b = (i >> 16) & 255;
      g.fillStyle = `rgb(${r},${gg},${b})`;
      g.beginPath();
      for (const p of c.polys) this.tracePoly(g, p, W, H);
      g.fill("evenodd");
      i++;
    }
    this.pickData = g.getImageData(0, 0, W, H).data;
  }

  countryAtGeo(lat: number, lon: number, countries: Country[]): Country | null {
    const W = this.pickW,
      H = this.pickH;
    let x = Math.floor(((wrapLon(lon) + 180) / 360) * W) % W;
    if (x < 0) x += W;
    const y = clamp(Math.floor(((90 - lat) / 180) * H), 0, H - 1);
    const o = (y * W + x) * 4,
      d = this.pickData;
    const idx = d[o] | (d[o + 1] << 8) | (d[o + 2] << 16);
    if (!idx) return null;
    return countries[idx - 1] ?? null;
  }

  buildOverlayTexture(
    countries: Country[],
    active: Set<string>,
    selCountry: Country | null,
    layers: LayerState = { borders: true, labels: true, pins: true },
    camDist = 3.0
  ) {
    const g = this.fillCtx,
      W = this.fillCv.width,
      H = this.fillCv.height;
    g.clearRect(0, 0, W, H);

    // 1. Fills
    for (const c of countries) {
      if (!active.has(c.meta.a2)) continue;
      const em = selCountry === c;
      g.fillStyle = cssHsl(c.color, em ? 0.46 : 0.32);
      g.beginPath();
      for (const p of c.polys) this.tracePoly(g, p, W, H);
      g.fill("evenodd");
    }

    // 2. Borders (if enabled)
    if (layers.borders) {
      g.lineJoin = "round";
      g.lineCap = "round";
      g.strokeStyle = "rgba(255,255,255,0.28)";
      g.lineWidth = 1.6;
      for (const c of countries) {
        g.beginPath();
        for (const p of c.polys) this.tracePoly(g, p, W, H);
        g.stroke();
      }

      // Active / highlighted borders
      for (const c of countries) {
        if (!active.has(c.meta.a2)) continue;
        const em = selCountry === c;
        g.strokeStyle = cssHsl(c.color, em ? 1 : 0.95, 18);
        g.lineWidth = em ? 4.5 : 3.0;
        g.beginPath();
        for (const p of c.polys) this.tracePoly(g, p, W, H);
        g.stroke();
      }
    }

    // 3. Country Names / Labels (if enabled)
    if (layers.labels) {
      for (const c of countries) {
        if (!c.label) continue;
        const isActive = active.has(c.meta.a2);
        const isSelected = selCountry === c;

        // Visibility filter based on country size / span and zoom distance
        if (!isActive && !isSelected) {
          if (camDist > 3.8 && c.label.span < 7.0 && !c.label.useCallout) continue;
          if (camDist > 3.2 && c.label.span < 2.5 && !c.label.useCallout) continue;
          if (c.label.span < 0.6) continue;
        }

        const x = ((c.label.cx + 180) / 360) * W;
        const y = ((90 - c.label.cy) / 180) * H;

        if (c.label.useCallout) {
          this.drawCountryCallout(g, c.meta.name, x, y, c.label, isSelected, isActive);
        } else {
          this.drawCountryLabel(g, c.meta.name, x, y, c.label.angle, c.label.fontSize, c.label.maxLen, isSelected, isActive);
        }

        // Near map edges, also render wrapped label so text near 180° meridian is never clipped
        if (x < 300) {
          if (c.label.useCallout) {
            this.drawCountryCallout(g, c.meta.name, x + W, y, c.label, isSelected, isActive);
          } else {
            this.drawCountryLabel(g, c.meta.name, x + W, y, c.label.angle, c.label.fontSize, c.label.maxLen, isSelected, isActive);
          }
        } else if (x > W - 300) {
          if (c.label.useCallout) {
            this.drawCountryCallout(g, c.meta.name, x - W, y, c.label, isSelected, isActive);
          } else {
            this.drawCountryLabel(g, c.meta.name, x - W, y, c.label.angle, c.label.fontSize, c.label.maxLen, isSelected, isActive);
          }
        }
      }
    }

    this.fillTex.needsUpdate = true;
    this.overlayDirty = false;
  }

  private drawCountryLabel(
    g: CanvasRenderingContext2D,
    name: string,
    x: number,
    y: number,
    angle: number,
    fontSize: number,
    maxLen: number,
    isSelected: boolean,
    isActive: boolean
  ) {
    g.save();
    g.translate(x, y);
    g.rotate(angle);
    g.textAlign = "center";
    g.textBaseline = "middle";

    // Guarantee text never exceeds internal country border
    let actualFontSize = fontSize;
    g.font = `${isSelected ? 800 : isActive ? 700 : 600} ${actualFontSize}px Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
    let measuredWidth = g.measureText(name).width;
    if (measuredWidth > maxLen && maxLen > 15) {
      actualFontSize = Math.max(9, Math.floor(actualFontSize * (maxLen / measuredWidth)));
      g.font = `${isSelected ? 800 : isActive ? 700 : 600} ${actualFontSize}px Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
    }

    // Crisp high-contrast outline
    g.strokeStyle = "rgba(4, 8, 16, 0.95)";
    g.lineWidth = Math.max(3, actualFontSize * 0.22);
    g.lineJoin = "round";
    g.strokeText(name, 0, 0);

    // Text fill
    if (isSelected) {
      g.fillStyle = "#ffffff";
    } else if (isActive) {
      g.fillStyle = "#e0f2fe";
    } else {
      g.fillStyle = "rgba(224, 238, 255, 0.88)";
    }
    g.fillText(name, 0, 0);
    g.restore();
  }

  private drawCountryCallout(
    g: CanvasRenderingContext2D,
    name: string,
    x: number,
    y: number,
    label: CountryLabel,
    isSelected: boolean,
    isActive: boolean
  ) {
    const W = this.fillCv.width,
      H = this.fillCv.height;
    const dxPx = (label.calloutDx / 360) * W;
    const dyPx = (-label.calloutDy / 180) * H;
    const targetX = x + dxPx;
    const targetY = y + dyPx;
    const isLeft = dxPx < 0;
    const tickLen = isLeft ? -14 : 14;

    // White dot at country center
    g.beginPath();
    g.arc(x, y, 2.2, 0, Math.PI * 2);
    g.fillStyle = "rgba(255, 255, 255, 0.95)";
    g.fill();

    // Clean leader line to open space
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(targetX, targetY);
    g.lineTo(targetX + tickLen, targetY);
    g.strokeStyle = "rgba(255, 255, 255, 0.82)";
    g.lineWidth = 1.3;
    g.lineCap = "round";
    g.lineJoin = "round";
    g.stroke();

    // Country name at end of leader line
    const textX = targetX + tickLen + (isLeft ? -4 : 4);
    const textY = targetY;
    g.save();
    g.textAlign = isLeft ? "right" : "left";
    g.textBaseline = "middle";
    const fSize = 13;
    g.font = `${isSelected ? 800 : isActive ? 700 : 600} ${fSize}px Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;

    g.strokeStyle = "rgba(4, 8, 16, 0.95)";
    g.lineWidth = 3.5;
    g.strokeText(name, textX, textY);

    g.fillStyle = isSelected ? "#ffffff" : isActive ? "#e0f2fe" : "rgba(235, 245, 255, 0.92)";
    g.fillText(name, textX, textY);
    g.restore();
  }

  setLayer(name: keyof LayerState, val: boolean) {
    if (name === "borders" || name === "labels") {
      this.overlayDirty = true;
    }
  }

  updateSunAndClouds() {
    if (this.cloudMesh) this.cloudMesh.rotation.y += 0.00011;
    const fwd = new THREE.Vector3();
    this.cam.getWorldDirection(fwd);
    const right = new THREE.Vector3().crossVectors(fwd, new THREE.Vector3(0, 1, 0)).normalize();
    this.sun.position.copy(
      fwd
        .multiplyScalar(-1)
        .add(right.multiplyScalar(0.6))
        .add(new THREE.Vector3(0, 0.4, 0))
        .normalize()
        .multiplyScalar(5)
    );
    this.earthMat.uniforms.sunDir.value.copy(this.sun.position).normalize();
  }

  render() {
    this.renderer.render(this.scene, this.cam);
  }
}
