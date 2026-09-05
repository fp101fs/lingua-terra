export interface LangDef {
  id: string;
  name: string;
  native: string;
  flag: string;
  countries: string[];
}

export interface CMeta {
  a2: string;
  name: string;
  cap: string;
  capLat: number;
  capLon: number;
  pop: number;
}

export interface CountryLabel {
  cx: number;
  cy: number;
  angle: number; // canvas radians
  span: number; // visual scale / importance
  fontSize: number; // base font size in canvas px
  maxLen: number; // max available pixel length inside boundary
  useCallout: boolean; // if true, draw white leader line to open area
  calloutDx: number; // degrees offset for leader line
  calloutDy: number;
}

export interface Country {
  meta: CMeta;
  polys: number[][][]; // [poly][vertex] = [lon, lat]
  center: [number, number];
  angRad: number; // angular radius (radians) for framing
  color: [number, number, number]; // HSL 0-1
  langs: string[]; // language ids
  label?: CountryLabel;
}

export interface LayerState {
  borders: boolean;
  labels: boolean;
  pins: boolean;
}

export interface LangStat {
  s: string;
  note?: string;
}

export interface CtrlOpt {
  onDown(): void;
  onHover(cx: number, cy: number): string | null;
  onIdle(): void;
}

declare global {
  const THREE: any;
  interface Window {
    THREE: any;
  }
}

export type V3 = any;
