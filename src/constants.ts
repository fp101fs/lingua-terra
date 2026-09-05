export const R = 1; // globe radius (world units)
export const R_OVER = R * 1.0025; // overlay shell
export const TEX = {
  day: "https://unpkg.com/three-globe@2.31.1/example/img/earth-blue-marble.jpg",
  night: "https://unpkg.com/three-globe@2.31.1/example/img/earth-night.jpg",
  bump: "https://unpkg.com/three-globe@2.31.1/example/img/earth-topology.png",
  clouds: "https://unpkg.com/three-globe@2.31.1/example/img/clouds.png",
};
export const BORDERS_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/countries-110m.json";
export const CREDIT = "Imagery NASA Blue Marble · Borders Natural Earth · Built with three.js";

export const MIN_DIST = 1.32;
export const MAX_DIST = 6.0;
export const PIN_SHOW_DIST = 6.2;
export const START = { lat: 22, lon: 12, dist: 3.15 }; // Atlantic / Europe–Africa
