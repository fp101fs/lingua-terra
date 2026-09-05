import { CREDIT } from "../constants";
import { LANGS, langName, statusOf, flagOf } from "../data/languages";
import type { Country, LayerState } from "../types";
import { fmtPop, cssHsl } from "../utils/geo";

export interface UIEvents {
  onSelectAll(): void;
  onClear(): void;
  onSelectLang(id: string | null): void;
  onCloseCard(): void;
  onCanvasClick(e: MouseEvent): void;
  onToggleLayer(layer: keyof LayerState): void;
}

export class UIManager {
  el: Record<string, HTMLElement> = {};

  mount(): HTMLCanvasElement {
    document.body.innerHTML = `
      <div id="app">
        <canvas id="gl"></canvas><div class="vignette"></div>
        <div id="dock" class="glass">
          <div class="grab"></div>
          <div class="dock-head" id="dockHead">
            <div class="brand"><span class="logo">LINGUA·<em>TERRA</em></span><span class="sub">world language atlas</span></div>
            <div class="dock-sub">Where the world's languages are official</div>
          </div>
          <div class="dock-layers" id="dockLayers">
            <button class="layer-btn on" data-layer="terrain" title="Terrain Relief & Specular">
              <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2"><path d="m8 3 4 8 5-5 5 15H2L8 3z"/></svg>
              <span>Terrain</span>
            </button>
            <button class="layer-btn on" data-layer="borders" title="Country Borders">
              <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20M12 2a14.5 14.5 0 0 1 0 20M2 12h20"/></svg>
              <span>Borders</span>
            </button>
            <button class="layer-btn on" data-layer="labels" title="Country Names (widest angle)">
              <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2"><path d="m4 19 4.5-12L13 19M5.5 14.5h6M15 9h6M17 6h4M17 12h4"/></svg>
              <span>Names</span>
            </button>
            <button class="layer-btn on" data-layer="pins" title="Language Map Pins">
              <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7z"/><circle cx="12" cy="9" r="2.5"/></svg>
              <span>Pins</span>
            </button>
            <button class="layer-btn on" data-layer="clouds" title="Drifting Cloud Layer">
              <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/></svg>
              <span>Clouds</span>
            </button>
            <button class="layer-btn on" data-layer="night" title="City Night Lights">
              <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>
              <span>Night</span>
            </button>
          </div>
          <div class="dock-actions">
            <button class="chip" id="btnAll">✦ Show all</button>
            <button class="chip" id="btnClear">Reset</button>
          </div>
          <div class="langs" id="langs"></div>
          <div class="dock-foot">${CREDIT}</div>
        </div>
        <div id="card" class="glass"><div class="band"></div>
          <button class="x" id="cardX">✕</button><div class="inner" id="cardIn"></div></div>
        <div id="hint" class="glass">Drag to spin · scroll or pinch to zoom · double-click to dive · click a country</div>
        <div id="attrib">${CREDIT}</div><div id="fps"></div>
        <div id="load"><div class="orb"></div><div class="t">LINGUA·<em>TERRA</em></div>
          <div id="loadmsg">Preparing the planet…</div><div id="loaderr"></div></div>
      </div>`;

    [
      "gl",
      "dock",
      "dockLayers",
      "langs",
      "card",
      "cardIn",
      "cardX",
      "hint",
      "load",
      "loadmsg",
      "loaderr",
      "btnAll",
      "btnClear",
      "dockHead",
      "fps",
      "attrib",
    ].forEach(id => (this.el[id] = document.getElementById(id)!));

    return this.el.gl as HTMLCanvasElement;
  }

  setLoadingMessage(msg: string) {
    if (this.el.loadmsg) this.el.loadmsg.textContent = msg;
  }

  setLoadingError(err: unknown) {
    if (this.el.loadmsg) this.el.loadmsg.textContent = "Could not finish loading.";
    if (this.el.loaderr) {
      this.el.loaderr.style.display = "block";
      this.el.loaderr.textContent =
        `${(err as Error).message ?? err} — check your internet connection and reload. ` +
        `(Textures & borders stream from public CDNs; the page must be served over http(s).)`;
    }
  }

  hideLoader() {
    this.el.load?.classList.add("gone");
    setTimeout(() => this.el.hint?.classList.add("gone"), 8000);
  }

  hideHint() {
    this.el.hint?.classList.add("gone");
  }

  updateFPS(fpsText: string) {
    if (this.el.fps) this.el.fps.textContent = fpsText;
  }

  buildLangButtons(onSelect: (id: string) => void) {
    const box = this.el.langs;
    box.innerHTML = LANGS.map(
      L => `
      <button class="lang" data-id="${L.id}">
        <span class="fl">${L.flag}</span>
        <span class="nm"><b>${L.name}</b><span>${L.native}</span></span>
        <span class="ct">${L.countries.length}</span>
      </button>`
    ).join("");

    box.querySelectorAll(".lang").forEach(b =>
      b.addEventListener("click", () => {
        const id = (b as HTMLElement).dataset.id!;
        onSelect(id);
      })
    );
  }

  updateDockState(mode: "none" | "lang" | "all", selectedLang: string | null, byCode: Map<string, Country>) {
    this.el.langs.querySelectorAll(".lang").forEach(b => {
      const id = (b as HTMLElement).dataset.id!;
      b.classList.toggle("active", mode === "lang" && selectedLang === id);
      const ct = b.querySelector(".ct")!;
      if (byCode.size) {
        ct.textContent = String(langName(id).countries.filter(c => byCode.has(c)).length);
      }
    });
    this.el.btnAll.classList.toggle("on", mode === "all");
  }

  showCountryCard(c: Country | null, mode: "none" | "lang" | "all", selectedLang: string | null) {
    const card = this.el.card;
    if (!c) {
      card.classList.remove("show");
      return;
    }
    const inSel = (langId: string) => (mode === "all" ? true : selectedLang === langId);
    const rows = c.langs
      .map(lid => {
        const L = langName(lid),
          st = statusOf(lid, c.meta.a2);
        return `<div class="c-row"><div class="k">${L.flag} ${L.name} — status</div>
        <div class="v">${st.s}</div>${st.note ? `<div class="note">${st.note}</div>` : ""}</div>`;
      })
      .join("");
    const chips = c.langs
      .map(lid => {
        const L = langName(lid);
        return `<span class="lchip ${inSel(lid) ? "on" : ""}">${L.flag} ${L.name}</span>`;
      })
      .join("");

    this.el.cardIn.innerHTML = `
      <div class="c-head"><span class="fl">${flagOf(c.meta.a2)}</span>
        <div><h2>${c.meta.name}</h2><div class="code">ISO ${c.meta.a2} · ${fmtPop(c.meta.pop)} people</div></div></div>
      <div class="c-rows">
        <div class="c-row"><div class="k">Capital</div><div class="v">${c.meta.cap}</div></div>
        <div class="c-row"><div class="k">Official languages (of the 12 tracked)</div><div class="chips">${chips}</div></div>
        ${rows}
      </div>`;
    (card.querySelector(".band") as HTMLElement).style.background = `linear-gradient(90deg, ${cssHsl(
      c.color,
      1
    )}, ${cssHsl(c.color, 0.25, 18)})`;
    card.classList.add("show");
  }

  updateLayersState(layers: LayerState) {
    const box = this.el.dockLayers;
    if (!box) return;
    box.querySelectorAll(".layer-btn").forEach(btn => {
      const l = (btn as HTMLElement).dataset.layer as keyof LayerState;
      if (l in layers) {
        btn.classList.toggle("on", !!layers[l]);
      }
    });
  }

  bindEvents(events: UIEvents) {
    this.el.btnAll.addEventListener("click", () => events.onSelectAll());
    this.el.btnClear.addEventListener("click", () => events.onClear());
    this.el.cardX.addEventListener("click", () => events.onCloseCard());
    this.el.dockHead.addEventListener("click", () => {
      if (matchMedia("(max-width:860px)").matches) this.el.dock.classList.toggle("open");
    });
    (this.el.gl as HTMLCanvasElement).addEventListener("click", e => events.onCanvasClick(e));

    this.el.dockLayers.querySelectorAll(".layer-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const layer = (btn as HTMLElement).dataset.layer as keyof LayerState;
        events.onToggleLayer(layer);
      });
    });
  }
}
