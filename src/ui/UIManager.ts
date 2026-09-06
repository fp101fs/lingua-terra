import { LANGS, langName, statusOf, flagOf, LANG_AUDIO, playLanguageAudio } from "../data/languages";
import type { Country, LayerState } from "../types";
import { fmtPop, cssHsl } from "../utils/geo";

export interface UIEvents {
  onSelectAll(): void;
  onClear(): void;
  onSelectLang(id: string | null): void;
  onCloseCard(): void;
  onCanvasClick(e: MouseEvent): void;
  onToggleLayer(layer: keyof LayerState): void;
  onToggleColorByLang(): void;
}

export class UIManager {
  el: Record<string, HTMLElement> = {};

  mount(): HTMLCanvasElement {
    document.body.innerHTML = `
      <div id="app">
        <canvas id="gl"></canvas><div class="vignette"></div>
        <div id="dock" class="glass">
          <div class="dock-head" id="dockHead">
            <div class="grab" id="dockGrab" aria-hidden="true">
              <svg width="48" height="5" viewBox="0 0 48 5" fill="none" xmlns="http://www.w3.org/2000/svg" style="display:block;width:100%;height:100%;">
                <rect width="48" height="5" rx="2.5" fill="#FFFFFF" />
              </svg>
            </div>
            <div class="brand">
              <div class="logo">LINGUA·<em>TERRA</em></div>
              <div class="sub">world language atlas</div>
            </div>
          </div>
          <div class="dock-tabs">
            <button class="dock-tab active" id="tabLangs" data-tab="langs">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="m5 8 6 6M4 14l6-6 2-3M2 5h12M7 2h1M22 22l-5-10-5 10M14 18h6"/></svg>
              <span>Languages</span>
            </button>
            <button class="dock-tab" id="tabCountries" data-tab="countries">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20M12 2a14.5 14.5 0 0 1 0 20M2 12h20"/></svg>
              <span>Countries</span>
              <span class="tab-badge" id="countryBadge">0</span>
            </button>
          </div>
          <div id="tabContentLangs" class="tab-content active">
            <div class="dock-actions">
              <button class="chip" id="btnAll">✦ Show all</button>
              <button class="chip" id="btnClear">Reset</button>
            </div>
            <div class="langs" id="langs"></div>
          </div>
          <div id="tabContentCountries" class="tab-content">
            <div class="countries-search-wrap">
              <input type="text" id="countrySearch" class="country-search" placeholder="Search countries…" autocomplete="off" />
            </div>
            <div class="countries-list" id="countriesList"></div>
          </div>
        </div>
        <div id="card" class="glass"><div class="band"></div>
          <button class="x" id="cardX">✕</button><div class="inner" id="cardIn"></div></div>
        <div id="hint" class="glass">Drag to spin · scroll or pinch to zoom · double-click to dive · click a country</div>
        <div id="fps"></div>
        <div id="load"><div class="orb"></div><div class="t">LINGUA·<em>TERRA</em></div>
          <div id="loadmsg">Preparing the planet…</div><div id="loaderr"></div></div>
      </div>`;

    [
      "gl",
      "dock",
      "tabLangs",
      "tabCountries",
      "tabContentLangs",
      "tabContentCountries",
      "langs",
      "countryBadge",
      "countrySearch",
      "countriesList",
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
      "dockGrab",
      "fps",
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
      <div class="lang" data-id="${L.id}">
        <div class="lang-main" data-id="${L.id}">
          <span class="fl">${L.flag}</span>
          <span class="nm"><b>${L.name}</b><span>${L.native}</span></span>
          <span class="ct">${L.countries.length}</span>
        </div>
        <button class="lang-audio-btn" data-lang="${L.id}" title="Pronounce ${L.name}" aria-label="Listen to ${L.name}">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
            <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
          </svg>
        </button>
      </div>`
    ).join("");

    box.querySelectorAll(".lang-main").forEach(b =>
      b.addEventListener("click", () => {
        const id = (b as HTMLElement).dataset.id!;
        onSelect(id);
      })
    );

    box.querySelectorAll(".lang-audio-btn").forEach(b =>
      b.addEventListener("click", e => {
        e.stopPropagation();
        const id = (b as HTMLElement).dataset.lang!;
        b.classList.add("playing");
        playLanguageAudio(id, () => {
          b.classList.remove("playing");
        });
      })
    );
  }

  updateDockState(
    mode: "none" | "lang" | "all",
    selectedLang: string | null,
    byCode: Map<string, Country>,
    colorByLang: boolean
  ) {
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

    const primaryLangId = c.langs[0];
    const primaryLangDef = primaryLangId ? langName(primaryLangId) : null;
    const audio = primaryLangId ? LANG_AUDIO[primaryLangId] : null;

    let audioBadgeHtml = "";
    if (audio && primaryLangDef) {
      audioBadgeHtml = `
        <div class="c-audio-badge" id="cAudioBadge">
          <div class="c-audio-text">
            <div class="c-audio-top">
              <span class="c-audio-native">${audio.greeting}</span>
              <span class="c-audio-phonetic">/${audio.phonetic}/</span>
            </div>
            <div class="c-audio-sub"><span class="c-audio-autonym">${primaryLangDef.native}</span> · "${audio.meaning}"</div>
          </div>
          <button class="c-audio-play-btn" id="cAudioPlayBtn" data-lang="${primaryLangId}" title="Pronounce greeting in ${primaryLangDef.name}" aria-label="Listen">
            <svg class="audio-speaker" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
              <path class="wave wave-1" d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
              <path class="wave wave-2" d="M19.07 4.93a10 10 0 0 1 0 14.14"></path>
            </svg>
            <div class="audio-waves">
              <span></span><span></span><span></span>
            </div>
          </button>
        </div>`;
    }

    const primaryLangName = primaryLangDef ? primaryLangDef.name : "";
    const learnBtnHtml = primaryLangName
      ? `<div class="c-cta-wrap">
          <a href="#" class="c-learn-btn" id="cardLearnBtn" title="Learn ${primaryLangName}">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path>
              <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>
            </svg>
            <span>Learn ${primaryLangName}</span>
            <span class="cta-arrow">→</span>
          </a>
        </div>`
      : "";

    this.el.cardIn.innerHTML = `
      <div class="c-head"><span class="fl">${flagOf(c.meta.a2)}</span>
        <div><h2>${c.meta.name}</h2><div class="code">ISO ${c.meta.a2} · ${fmtPop(c.meta.pop)} people</div></div></div>
      ${audioBadgeHtml}
      <div class="c-rows">
        <div class="c-row"><div class="k">Capital</div><div class="v">${c.meta.cap}</div></div>
        <div class="c-row"><div class="k">Official languages (of the 12 tracked)</div><div class="chips">${chips}</div></div>
        ${rows}
      </div>
      ${learnBtnHtml}`;

    const playBtn = card.querySelector("#cAudioPlayBtn") as HTMLElement;
    if (playBtn && primaryLangId) {
      playBtn.addEventListener("click", e => {
        e.stopPropagation();
        playBtn.classList.add("playing");
        playLanguageAudio(primaryLangId, () => {
          playBtn.classList.remove("playing");
        });
      });
    }

    (card.querySelector(".band") as HTMLElement).style.background = `linear-gradient(90deg, ${cssHsl(
      c.color,
      1
    )}, ${cssHsl(c.color, 0.25, 18)})`;
    card.classList.add("show");

    // Highlight country in country list if open
    this.el.countriesList?.querySelectorAll(".country-item").forEach(item => {
      item.classList.toggle("active", (item as HTMLElement).dataset.code === c.meta.a2);
    });
  }

  buildCountryList(countries: Country[], onSelect: (c: Country) => void) {
    const list = this.el.countriesList;
    const badge = this.el.countryBadge;
    const sorted = [...countries].sort((a, b) => a.meta.name.localeCompare(b.meta.name));
    if (badge) badge.textContent = String(sorted.length);

    const render = (items: Country[]) => {
      list.innerHTML = items
        .map(
          c => `
          <button class="country-item" data-code="${c.meta.a2}">
            <span class="c-flag">${flagOf(c.meta.a2)}</span>
            <div class="c-text">
              <span class="c-name">${c.meta.name}</span>
              <span class="c-sub">${c.meta.cap} · ${fmtPop(c.meta.pop)}</span>
            </div>
          </button>`
        )
        .join("");

      list.querySelectorAll(".country-item").forEach(btn => {
        btn.addEventListener("click", () => {
          const code = (btn as HTMLElement).dataset.code!;
          const c = countries.find(item => item.meta.a2 === code);
          if (c) onSelect(c);
        });
      });
    };

    render(sorted);

    // Search filter
    const searchInput = this.el.countrySearch as HTMLInputElement;
    if (searchInput) {
      searchInput.addEventListener("input", () => {
        const q = searchInput.value.trim().toLowerCase();
        if (!q) {
          render(sorted);
        } else {
          const filtered = sorted.filter(
            c =>
              c.meta.name.toLowerCase().includes(q) ||
              c.meta.a2.toLowerCase().includes(q) ||
              c.meta.cap.toLowerCase().includes(q)
          );
          render(filtered);
        }
      });
    }
  }

  updateLayersState(_layers: LayerState) {}

  bindEvents(events: UIEvents) {
    this.el.btnAll.addEventListener("click", () => events.onSelectAll());
    this.el.btnClear.addEventListener("click", () => events.onClear());
    this.el.cardX.addEventListener("click", () => events.onCloseCard());
    const toggleDock = () => {
      if (matchMedia("(max-width:860px)").matches) this.el.dock.classList.toggle("open");
    };
    this.el.dockHead.addEventListener("click", toggleDock);
    this.el.dockGrab?.addEventListener("click", toggleDock);

    // Touch swipe gestures on mobile dock header
    let touchStartY = 0;
    this.el.dockHead.addEventListener("touchstart", (e: TouchEvent) => {
      touchStartY = e.touches[0].clientY;
    }, { passive: true });

    this.el.dockHead.addEventListener("touchend", (e: TouchEvent) => {
      const touchEndY = e.changedTouches[0].clientY;
      const diffY = touchStartY - touchEndY;
      if (diffY > 30) {
        // Swiped up -> open
        this.el.dock.classList.add("open");
      } else if (diffY < -30) {
        // Swiped down -> close
        this.el.dock.classList.remove("open");
      }
    }, { passive: true });

    (this.el.gl as HTMLCanvasElement).addEventListener("click", e => events.onCanvasClick(e));

    // Tab switching: Languages vs Countries
    this.el.tabLangs.addEventListener("click", () => {
      this.el.tabLangs.classList.add("active");
      this.el.tabCountries.classList.remove("active");
      this.el.tabContentLangs.classList.add("active");
      this.el.tabContentCountries.classList.remove("active");
    });
    this.el.tabCountries.addEventListener("click", () => {
      this.el.tabCountries.classList.add("active");
      this.el.tabLangs.classList.remove("active");
      this.el.tabContentCountries.classList.add("active");
      this.el.tabContentLangs.classList.remove("active");
    });
  }
}
