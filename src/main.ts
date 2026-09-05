import "./ui/styles.css";
import type { Country, LayerState } from "./types";
import { START, BORDERS_URL } from "./constants";
import { NUM, LANGS, langName } from "./data/languages";
import { deterministicColor, langColor, decodeTopoCountries, computeWidestLabel, geoToVec3, vecToGeo, wrapLon, clamp } from "./utils/geo";
import { GlobeControls } from "./components/GlobeControls";
import { PinManager } from "./components/PinManager";
import { EarthScene } from "./components/EarthScene";
import { UIManager } from "./ui/UIManager";

class App {
  countries = new Map<string, Country>();
  byCode = new Map<string, Country>();
  sel = { mode: "none" as "none" | "lang" | "all", lang: null as string | null };
  selCountry: Country | null = null;
  colorByLang = false; // default false for non-showAll, true for showAll
  layers: LayerState = {
    borders: true,
    labels: true,
    pins: true,
  };

  private earthScene!: EarthScene;
  private controls!: GlobeControls;
  private pins!: PinManager;
  private ui = new UIManager();

  private hoverCode: string | null = null;
  private lastHoverPx = 0;
  private lastLabelDist = 3.0;
  private frames = 0;
  private fpsT = performance.now();

  async start() {
    const canvas = this.ui.mount();
    this.ui.buildLangButtons(id => this.selectLang(this.sel.lang === id ? null : id));

    try {
      this.ui.setLoadingMessage("Loading three.js engine…");
      await this.loadThree();

      this.ui.setLoadingMessage("Painting the oceans and continents…");
      this.earthScene = new EarthScene(canvas);

      this.controls = new GlobeControls(this.earthScene.cam, canvas, {
        onDown: () => this.ui.hideHint(),
        onHover: (x, y) => this.pickAt(x, y),
        onIdle: () => this.refreshPins(),
      });

      (window as any).__pickByCode = (code: string | null) => {
        const c = code ? this.byCode.get(code) : null;
        if (c) this.selectCountry(c, false);
        else this.selectCountry(null, false);
      };

      addEventListener("resize", () => {
        this.earthScene.onResize(innerWidth, innerHeight);
        this.controls.kick();
      });

      this.ui.setLoadingMessage("Fetching country borders…");
      await this.loadCountries();

      this.ui.setLoadingMessage("Mapping languages…");
      this.earthScene.buildIndexRaster([...this.countries.values()]);
      this.earthScene.buildOverlayTexture(
        [...this.byCode.values()],
        this.activeCodes(),
        this.selCountry,
        this.layers,
        this.earthScene.cam.position.length(),
        this.colorByLang
      );
      this.applySelection(); // Show All on startup

      this.pins = new PinManager(this.earthScene.scene, [...this.byCode.values()]);

      this.ui.buildCountryList([...this.byCode.values()], c => {
        this.selectCountry(c, false);
        this.controls.focusGeo(c.center[1], c.center[0], 2.45, 900);
      });

      this.bindUI();

      this.ui.setLoadingMessage("Ready");
      this.ui.hideLoader();
      this.controls.kick();
      this.loop();
    } catch (err) {
      console.error(err);
      this.ui.setLoadingError(err);
    }
  }

  private loadThree(): Promise<void> {
    return new Promise((res, rej) => {
      const s = document.createElement("script");
      s.src = "https://cdn.jsdelivr.net/npm/three@0.128.0/build/three.min.js";
      s.onload = () => res();
      s.onerror = () => rej(new Error("three.js failed to load from CDN"));
      document.head.appendChild(s);
    });
  }

  private async loadCountries() {
    const res = await fetch(BORDERS_URL);
    if (!res.ok) throw new Error("Border data download failed (HTTP " + res.status + ")");
    const topo = await res.json();
    const geom = decodeTopoCountries(topo);

    geom.forEach((rawPolys, numId) => {
      const meta = NUM[Number(numId)];
      if (!meta) return; // e.g. Antarctica (010) → intentionally skipped
      const [a2, name, cap, capLat, capLon, pop] = meta;
      const polys: number[][][] = [];
      let x = 0,
        y = 0,
        z = 0,
        n = 0;
      for (const ring of rawPolys) {
        if (ring.length < 3) continue;
        polys.push(ring);
        for (const [lo, la] of ring) {
          const v = geoToVec3(la, lo, 1);
          x += v.x;
          y += v.y;
          z += v.z;
          n++;
        }
      }
      if (!polys.length) return;
      const cv = new THREE.Vector3(x / n, y / n, z / n).normalize();
      const cg = vecToGeo(cv);
      let maxAng = 0;
      for (const poly of polys) {
        for (const [lo, la] of poly) {
          const v = geoToVec3(la, lo, 1);
          const a = Math.acos(clamp(v.dot(cv), -1, 1));
          if (a > maxAng) maxAng = a;
        }
      }
      const c: Country = {
        meta: { a2, name, cap, capLat, capLon, pop },
        polys,
        center: [cg.lon, cg.lat],
        angRad: maxAng,
        color: deterministicColor(a2),
        langs: [],
        label: computeWidestLabel(polys, name),
      };
      this.countries.set(numId, c);
      this.byCode.set(a2, c);
    });

    for (const L of LANGS) {
      for (const code of L.countries) {
        const c = this.byCode.get(code);
        if (c && !c.langs.includes(L.id)) c.langs.push(L.id);
      }
    }

    // Assign primary language color for "Color by Language" mode
    for (const c of this.byCode.values()) {
      if (c.langs.length) {
        c.langColor = langColor(c.langs[0]);
      } else {
        c.langColor = c.color;
      }
    }
  }

  activeCodes(): Set<string> {
    const s = new Set<string>();
    if (this.sel.mode === "all") {
      for (const c of this.byCode.values()) if (c.langs.length) s.add(c.meta.a2);
    } else if (this.sel.mode === "lang") {
      const L = langName(this.sel.lang!);
      for (const code of L.countries) if (this.byCode.has(code)) s.add(code);
    }
    return s;
  }

  selectLang(id: string | null) {
    if (id === null) {
      this.sel = { mode: "none", lang: null };
      this.colorByLang = false; // off is default for non-showAll
    } else {
      this.sel = { mode: "lang", lang: id };
      this.colorByLang = false; // off is default for non-showAll
    }
    this.applySelection();
    if (id) {
      const L = langName(id);
      const cs = L.countries.map(c => this.byCode.get(c)).filter(Boolean) as Country[];
      this.controls.frameCountries(cs);
    }
  }

  selectAll() {
    this.sel = { mode: "all", lang: null };
    this.colorByLang = true; // on is default for Show All
    this.applySelection();
    this.controls.focusGeo(18, 15, 3.3, 1000);
  }

  toggleColorByLang() {
    this.colorByLang = !this.colorByLang;
    this.earthScene.overlayDirty = true;
    this.ui.updateDockState(this.sel.mode, this.sel.lang, this.byCode, this.colorByLang);
    this.controls.kick();
  }

  private applySelection() {
    this.earthScene.overlayDirty = true;
    this.ui.updateDockState(this.sel.mode, this.sel.lang, this.byCode, this.colorByLang);
    if (this.selCountry && !this.activeCodes().has(this.selCountry.meta.a2)) {
      this.selectCountry(null, true);
    }
    this.controls.kick();
  }

  selectCountry(c: Country | null, silent = false) {
    if (this.selCountry === c) return;
    this.selCountry = c;
    this.earthScene.overlayDirty = true;
    this.ui.showCountryCard(c, this.sel.mode, this.sel.lang);
    if (!silent) this.controls.kick();
  }

  pickAt(cx: number, cy: number): string | null {
    if (!this.controls) return null;
    const now = performance.now();
    if (now - this.lastHoverPx < 24) return this.hoverCode; // cheap throttle
    this.lastHoverPx = now;
    const r = (this.earthScene.renderer.domElement as HTMLCanvasElement).getBoundingClientRect();
    const pin = this.pins?.pick(this.earthScene.cam, cx - r.left, cy - r.top, r.width, r.height);
    if (pin) {
      this.hoverCode = pin;
      return pin;
    }
    const g = this.controls.cursorGroundPoint(cx, cy);
    if (!g) {
      this.hoverCode = null;
      return null;
    }
    const { lat, lon } = vecToGeo(g);
    const c = this.earthScene.countryAtGeo(lat, lon, [...this.countries.values()]);
    const code = c && this.activeCodes().has(c.meta.a2) ? c.meta.a2 : null;
    this.hoverCode = code;
    return code;
  }

  private refreshPins() {
    this.pins?.update(this.earthScene.cam, this.activeCodes(), this.layers.pins);
  }

  toggleLayer(layer: keyof LayerState) {
    this.layers[layer] = !this.layers[layer];
    this.earthScene.setLayer(layer, this.layers[layer]);
    if (layer === "pins") {
      this.refreshPins();
    }
    this.earthScene.overlayDirty = true;
    this.ui.updateLayersState(this.layers);
    this.controls.kick();
  }

  private bindUI() {
    this.ui.bindEvents({
      onSelectAll: () => this.selectAll(),
      onClear: () => {
        this.selectLang(null);
        this.controls.focusGeo(START.lat, START.lon, START.dist, 900);
      },
      onSelectLang: id => this.selectLang(this.sel.lang === id ? null : id),
      onCloseCard: () => this.selectCountry(null),
      onCanvasClick: e => {
        const code = this.pickAt(e.clientX, e.clientY);
        this.selectCountry(code ? this.byCode.get(code)! : null);
      },
      onToggleLayer: layer => this.toggleLayer(layer),
      onToggleColorByLang: () => this.toggleColorByLang(),
    });
  }

  private loop = () => {
    requestAnimationFrame(this.loop);
    const camDist = this.earthScene.cam.position.length();
    if (Math.abs(camDist - this.lastLabelDist) > 0.35) {
      this.lastLabelDist = camDist;
      this.earthScene.overlayDirty = true;
    }
    if (this.earthScene.overlayDirty) {
      this.earthScene.buildOverlayTexture(
        [...this.byCode.values()],
        this.activeCodes(),
        this.selCountry,
        this.layers,
        camDist,
        this.colorByLang
      );
    }
    this.earthScene.updateSunAndClouds();
    this.refreshPins();
    this.earthScene.render();
    this.frames++;
    const now = performance.now();
    if (now - this.fpsT > 1000) {
      this.ui.updateFPS(`${Math.round((this.frames * 1000) / (now - this.fpsT))} fps`);
      this.frames = 0;
      this.fpsT = now;
    }
  };
}

new App().start();
