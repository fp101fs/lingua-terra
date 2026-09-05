import { R, R_OVER, TEX } from "../constants";
import type { Country } from "../types";
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
      },
      vertexShader: `
        varying vec2 vUv; varying vec3 vN; varying vec3 vP;
        void main(){ vUv = uv;
          vN = normalize(mat3(modelMatrix) * normal);
          vec4 wp = modelMatrix * vec4(position,1.0); vP = wp.xyz;
          gl_Position = projectionMatrix * viewMatrix * wp; }`,
      fragmentShader: `
        uniform sampler2D dayMap, nightMap, bumpMap; uniform vec3 sunDir;
        varying vec2 vUv; varying vec3 vN; varying vec3 vP;
        void main(){
          vec3 day = texture2D(dayMap, vUv).rgb;
          vec3 night = texture2D(nightMap, vUv).rgb;
          float bump = texture2D(bumpMap, vUv).r;
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

  private tracePoly(g: CanvasRenderingContext2D, poly: number[][], W: number, H: number, shift: number) {
    g.beginPath();
    for (let i = 0; i < poly.length; i++) {
      const x = ((poly[i][0] + shift + 180) / 360) * W,
        y = ((90 - poly[i][1]) / 180) * H;
      i ? g.lineTo(x, y) : g.moveTo(x, y);
    }
    g.closePath();
  }

  private eachDraw(g: CanvasRenderingContext2D, c: Country, W: number, H: number, fn: (shift: number) => void) {
    fn(0);
    const touchesAntimeridian = c.polys.some(p => p.some(([lo]) => lo > 165 || lo < -165));
    if (touchesAntimeridian) {
      fn(360);
      fn(-360);
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
      this.eachDraw(g, c, W, H, sh => {
        for (const p of c.polys) this.tracePoly(g, p, W, H, sh);
      });
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

  buildOverlayTexture(countries: Country[], active: Set<string>, selCountry: Country | null) {
    const g = this.fillCtx,
      W = this.fillCv.width,
      H = this.fillCv.height;
    g.clearRect(0, 0, W, H);

    // Fills
    for (const c of countries) {
      if (!active.has(c.meta.a2)) continue;
      const em = selCountry === c;
      g.fillStyle = cssHsl(c.color, em ? 0.46 : 0.32);
      this.eachDraw(g, c, W, H, sh => {
        for (const p of c.polys) this.tracePoly(g, p, W, H, sh);
      });
      g.fill("evenodd");
    }

    // Crisp borders — subtle global borders, bright active borders
    g.lineJoin = "round";
    g.lineCap = "round";
    g.strokeStyle = "rgba(255,255,255,0.28)";
    g.lineWidth = 1.6;
    for (const c of countries) {
      this.eachDraw(g, c, W, H, sh => {
        for (const p of c.polys) this.tracePoly(g, p, W, H, sh);
      });
      g.stroke();
    }

    for (const c of countries) {
      if (!active.has(c.meta.a2)) continue;
      const em = selCountry === c;
      g.strokeStyle = cssHsl(c.color, em ? 1 : 0.95, 18);
      g.lineWidth = em ? 4.5 : 3.0;
      this.eachDraw(g, c, W, H, sh => {
        for (const p of c.polys) this.tracePoly(g, p, W, H, sh);
      });
      g.stroke();
    }

    this.fillTex.needsUpdate = true;
    this.overlayDirty = false;
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
