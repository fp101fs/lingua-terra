/* ================================================================================
   language-globe.ts
   "Lingua Terra" — a Google-Earth-style interactive 3D language globe.
   ================================================================================ */

/* ============================== 1. TYPES ======================================= */

interface LangDef { id: string; name: string; native: string; flag: string; countries: string[] }
interface CMeta   { a2: string; name: string; cap: string; capLat: number; capLon: number; pop: number }

interface Country {
  meta: CMeta;
  polys: number[][][];              // [poly][vertex] = [lon, lat]
  center: [number, number];
  angRad: number;                   // angular radius (radians) for framing
  color: [number, number, number];  // HSL 0-1
  langs: string[];                  // language ids
}
interface LangStat { s: string; note?: string }

declare global { const THREE: any; interface Window { THREE: any } }

type V3 = any;

/* ========================= 2. DATASET: LANGUAGES =============================== */

const LANGS: LangDef[] = [
  { id: "en", name: "English",    native: "English",     flag: "🇬🇧", countries: [
      "GB","US","CA","AU","NZ","IE","MT","IN","PK","NG","GH","KE","ZA","SG","PH",
      "JM","TT","GY","BS","BB","AG","BZ","VU","RW","CM","UG","TZ","ZM","ZW","MW",
      "LS","NA","BW","SZ","GM","SL","LR","ER","SS","SD","FJ","PG","WS","TO","KI","MH","FM","KN","LC","VC","GD","DM","SC","MU"] },
  { id: "zh", name: "Chinese",    native: "中文",         flag: "🇨🇳", countries: ["CN","SG","MY"] },
  { id: "es", name: "Spanish",    native: "Español",     flag: "🇪🇸", countries: [
      "ES","MX","GT","HN","SV","NI","CR","PA","CU","DO","PR","CO","VE","EC","PE",
      "BO","PY","UY","AR","CL","GQ"] },
  { id: "fr", name: "French",     native: "Français",    flag: "🇫🇷", countries: [
      "FR","MC","BE","LU","CH","CA","HT","BJ","BF","CI","GA","GN","ML","NE","CG",
      "CD","SN","TG","MG","RW","BI","DJ","CF","TD","KM","SC","MU","VU","LU"] },
  { id: "de", name: "German",     native: "Deutsch",     flag: "🇩🇪", countries: ["DE","AT","LI","CH","BE","NA"] },
  { id: "it", name: "Italian",    native: "Italiano",    flag: "🇮🇹", countries: ["IT","SM","VA","CH"] },
  { id: "ko", name: "Korean",     native: "한국어",       flag: "🇰🇷", countries: ["KR","KP"] },
  { id: "pt", name: "Portuguese", native: "Português",   flag: "🇵🇹", countries: ["PT","BR","AO","MZ","GW","CV","ST","TL","GQ"] },
  { id: "ar", name: "Arabic",     native: "العربية",      flag: "🇸🇦", countries: [
      "SA","EG","JO","LB","SY","IQ","KW","BH","QA","AE","OM","YE","PS","MA","DZ",
      "TN","LY","SD","SO","DJ","KM","MR","TD","IL"] },
  { id: "ru", name: "Russian",    native: "Русский",     flag: "🇷🇺", countries: ["RU","BY","KZ","KG"] },
  { id: "hi", name: "Hindi",      native: "हिन्दी",        flag: "🇮🇳", countries: ["IN","FJ"] },
  { id: "th", name: "Thai",       native: "ไทย",          flag: "🇹🇭", countries: ["TH"] },
];

/* ISO 3166-1 numeric → metadata. Population in millions (2023, approx.). */
const NUM: Record<number, [string, string, string, number, number, number]> = {
   4:["AF","Afghanistan","Kabul",34.6,69.2,41.1],   8:["AL","Albania","Tirana",41.3,19.8,2.8],
  12:["DZ","Algeria","Algiers",36.8,3.1,44.9],     20:["AD","Andorra","Andorra la Vella",42.5,1.5,0.08],
  24:["AO","Angola","Luanda",-8.8,13.2,35.6],      28:["AG","Antigua & Barbuda","St. John's",17.1,-61.8,0.09],
  32:["AR","Argentina","Buenos Aires",-34.6,-58.4,45.8], 36:["AU","Australia","Canberra",-35.3,149.1,26.4],
  40:["AT","Austria","Vienna",48.2,16.4,9.1],      44:["BS","Bahamas","Nassau",25.1,-77.3,0.41],
  48:["BH","Bahrain","Manama",26.2,50.6,1.5],      50:["BD","Bangladesh","Dhaka",23.7,90.4,171.2],
  51:["AM","Armenia","Yerevan",40.2,44.5,2.8],     52:["BB","Barbados","Bridgetown",13.1,-59.6,0.28],
  56:["BE","Belgium","Brussels",50.85,4.35,11.7],  64:["BT","Bhutan","Thimphu",27.5,89.6,0.78],
  68:["BO","Bolivia","Sucre",-19.0,-65.3,12.2],    70:["BA","Bosnia & Herzegovina","Sarajevo",43.9,18.4,3.2],
  72:["BW","Botswana","Gaborone",-24.6,25.9,2.6],  76:["BR","Brazil","Brasília",-15.8,-47.9,216.4],
  84:["BZ","Belize","Belmopan",17.3,-88.8,0.41],   90:["SB","Solomon Islands","Honiara",-9.4,160.0,0.74],
  96:["BN","Brunei","Bandar Seri Begawan",4.9,114.9,0.45],100:["BG","Bulgaria","Sofia",42.7,23.3,6.4],
 104:["MM","Myanmar","Naypyidaw",19.8,96.1,54.2], 108:["BI","Burundi","Gitega",-3.4,29.9,13.2],
 112:["BY","Belarus","Minsk",53.9,27.6,9.2],     116:["KH","Cambodia","Phnom Penh",11.6,104.9,16.9],
 120:["CM","Cameroon","Yaoundé",3.9,11.5,28.6],  124:["CA","Canada","Ottawa",45.4,-75.7,40.1],
 132:["CV","Cape Verde","Praia",14.9,-23.5,0.60],140:["CF","Central African Rep.","Bangui",4.4,18.6,5.7],
 144:["LK","Sri Lanka","Colombo",6.9,79.9,22.0], 148:["TD","Chad","N'Djamena",12.1,15.0,18.3],
 152:["CL","Chile","Santiago",-33.4,-70.7,19.6], 156:["CN","China","Beijing",39.9,116.4,1425.7],
 158:["TW","Taiwan","Taipei",25.0,121.5,23.9],   170:["CO","Colombia","Bogotá",4.7,-74.1,52.1],
 174:["KM","Comoros","Moroni",-11.7,43.3,0.85],  175:["YT","Mayotte","Mamoudzou",-12.8,45.2,0.34],
 178:["CG","Congo (Rep.)","Brazzaville",-4.3,15.3,6.1],180:["CD","Congo (DRC)","Kinshasa",-4.3,15.3,102.3],
 188:["CR","Costa Rica","San José",9.9,-84.1,5.2],191:["HR","Croatia","Zagreb",45.8,16.0,3.9],
 192:["CU","Cuba","Havana",23.1,-82.4,11.2],     196:["CY","Cyprus","Nicosia",35.2,33.4,1.3],
 203:["CZ","Czechia","Prague",50.1,14.4,10.5],   204:["BJ","Benin","Porto-Novo",6.5,2.6,13.7],
 208:["DK","Denmark","Copenhagen",55.7,12.6,5.9],212:["DM","Dominica","Roseau",15.3,-61.4,0.07],
 214:["DO","Dominican Rep.","Santo Domingo",18.5,-69.9,11.3],218:["EC","Ecuador","Quito",-0.2,-78.5,18.2],
 222:["SV","El Salvador","San Salvador",13.7,-89.2,6.4],226:["GQ","Equatorial Guinea","Malabo",3.8,8.8,1.7],
 231:["ET","Ethiopia","Addis Ababa",9.0,38.8,126.5],232:["ER","Eritrea","Asmara",15.3,38.9,3.7],
 233:["EE","Estonia","Tallinn",59.4,24.7,1.4],   242:["FJ","Fiji","Suva",-18.1,178.4,0.94],
 246:["FI","Finland","Helsinki",60.2,24.9,5.6],  250:["FR","France","Paris",48.9,2.35,64.8],
 262:["DJ","Djibouti","Djibouti",11.6,43.1,1.1], 266:["GA","Gabon","Libreville",0.4,9.5,2.4],
 268:["GE","Georgia","Tbilisi",41.7,44.8,3.7],   270:["GM","Gambia","Banjul",13.5,-16.6,2.8],
 276:["DE","Germany","Berlin",52.5,13.4,84.5],   288:["GH","Ghana","Accra",5.6,-0.2,34.1],
 300:["GR","Greece","Athens",38.0,23.7,10.3],    308:["GD","Grenada","St. George's",12.1,-61.7,0.13],
 320:["GT","Guatemala","Guatemala City",14.6,-90.5,17.6],324:["GN","Guinea","Conakry",9.5,-13.7,14.2],
 328:["GY","Guyana","Georgetown",6.8,-58.2,0.81],332:["HT","Haiti","Port-au-Prince",18.5,-72.3,11.7],
 340:["HN","Honduras","Tegucigalpa",14.1,-87.2,10.6],348:["HU","Hungary","Budapest",47.5,19.0,9.6],
 352:["IS","Iceland","Reykjavík",64.1,-21.9,0.39],356:["IN","India","New Delhi",28.6,77.2,1428.6],
 360:["ID","Indonesia","Jakarta",-6.2,106.8,277.5],364:["IR","Iran","Tehran",35.7,51.4,89.2],
 368:["IQ","Iraq","Baghdad",33.3,44.4,45.5],     372:["IE","Ireland","Dublin",53.3,-6.3,5.3],
 376:["IL","Israel","Jerusalem",31.8,35.2,9.2],  380:["IT","Italy","Rome",41.9,12.5,58.8],
 384:["CI","Côte d'Ivoire","Yamoussoukro",6.8,-5.3,28.9],388:["JM","Jamaica","Kingston",18.0,-76.8,2.8],
 392:["JP","Japan","Tokyo",35.7,139.7,123.3],    398:["KZ","Kazakhstan","Astana",51.2,71.4,19.6],
 400:["JO","Jordan","Amman",31.9,35.9,11.3],     404:["KE","Kenya","Nairobi",-1.3,36.8,55.1],
 408:["KP","North Korea","Pyongyang",39.0,125.8,26.2],410:["KR","South Korea","Seoul",37.6,127.0,51.7],
 414:["KW","Kuwait","Kuwait City",29.4,47.98,4.3],417:["KG","Kyrgyzstan","Bishkek",42.9,74.6,6.7],
 418:["LA","Laos","Vientiane",17.97,102.6,7.6],  422:["LB","Lebanon","Beirut",33.9,35.5,5.4],
 426:["LS","Lesotho","Maseru",-29.3,27.5,2.3],   428:["LV","Latvia","Riga",56.9,24.1,1.8],
 430:["LR","Liberia","Monrovia",6.3,-10.8,5.4],  434:["LY","Libya","Tripoli",32.9,13.2,6.9],
 438:["LI","Liechtenstein","Vaduz",47.1,9.5,0.04],440:["LT","Lithuania","Vilnius",54.7,25.3,2.9],
 442:["LU","Luxembourg","Luxembourg",49.6,6.1,0.66],450:["MG","Madagascar","Antananarivo",-18.9,47.5,30.3],
 454:["MW","Malawi","Lilongwe",-13.98,33.8,20.4],458:["MY","Malaysia","Kuala Lumpur",3.15,101.7,34.3],
 462:["MV","Maldives","Malé",4.2,73.5,0.52],     466:["ML","Mali","Bamako",12.6,-8.0,23.3],
 470:["MT","Malta","Valletta",35.9,14.5,0.54],   478:["MR","Mauritania","Nouakchott",18.1,-15.9,4.9],
 480:["MU","Mauritius","Port Louis",-20.2,57.5,1.3],484:["MX","Mexico","Mexico City",19.4,-99.1,128.5],
 492:["MC","Monaco","Monaco",43.73,7.42,0.04],   496:["MN","Mongolia","Ulaanbaatar",47.9,106.9,3.4],
 498:["MD","Moldova","Chișinău",47.0,28.9,2.5],  499:["ME","Montenegro","Podgorica",42.4,19.3,0.62],
 504:["MA","Morocco","Rabat",34.0,-6.8,37.8],    508:["MZ","Mozambique","Maputo",-25.97,32.6,33.9],
 512:["OM","Oman","Muscat",23.6,58.4,4.6],       516:["NA","Namibia","Windhoek",-22.6,17.1,2.6],
 520:["NR","Nauru","Yaren",-0.55,166.9,0.01],    524:["NP","Nepal","Kathmandu",27.7,85.3,30.9],
 528:["NL","Netherlands","Amsterdam",52.4,4.9,17.6],540:["NC","New Caledonia","Nouméa",-22.3,166.5,0.29],
 548:["VU","Vanuatu","Port Vila",-17.7,168.3,0.33],554:["NZ","New Zealand","Wellington",-41.3,174.8,5.2],
 558:["NI","Nicaragua","Managua",12.1,-86.3,7.0],562:["NE","Niger","Niamey",13.5,2.1,27.2],
 566:["NG","Nigeria","Abuja",9.1,7.5,223.8],     578:["NO","Norway","Oslo",59.9,10.75,5.6],
 586:["PK","Pakistan","Islamabad",33.7,73.1,240.5],591:["PA","Panama","Panama City",9.0,-79.5,4.5],
 598:["PG","Papua New Guinea","Port Moresby",-9.5,147.2,10.3],600:["PY","Paraguay","Asunción",-25.3,-57.6,6.9],
 604:["PE","Peru","Lima",-12.05,-77.05,34.4],    608:["PH","Philippines","Manila",14.6,121.0,117.3],
 616:["PL","Poland","Warsaw",52.2,21.0,36.8],    620:["PT","Portugal","Lisbon",38.7,-9.1,10.2],
 624:["GW","Guinea-Bissau","Bissau",11.9,-15.6,2.2],626:["TL","Timor-Leste","Dili",-8.56,125.6,1.4],
 630:["PR","Puerto Rico","San Juan",18.5,-66.1,3.3],634:["QA","Qatar","Doha",25.3,51.5,2.7],
 642:["RO","Romania","Bucharest",44.4,26.1,19.6],643:["RU","Russia","Moscow",55.75,37.6,144.4],
 646:["RW","Rwanda","Kigali",-1.95,30.06,14.1],  659:["KN","St. Kitts & Nevis","Basseterre",17.3,-62.7,0.05],
 660:["AI","Anguilla","The Valley",18.2,-63.1,0.02],662:["LC","St. Lucia","Castries",14.0,-61.0,0.18],
 670:["VC","St. Vincent & Grenadines","Kingstown",13.2,-61.2,0.10],674:["SM","San Marino","San Marino",43.9,12.4,0.03],
 678:["ST","São Tomé & Príncipe","São Tomé",0.33,6.7,0.23],682:["SA","Saudi Arabia","Riyadh",24.7,46.7,36.9],
 686:["SN","Senegal","Dakar",14.7,-17.5,17.8],   688:["RS","Serbia","Belgrade",44.8,20.5,7.1],
 690:["SC","Seychelles","Victoria",-4.6,55.5,0.13],694:["SL","Sierra Leone","Freetown",8.5,-13.2,8.8],
 702:["SG","Singapore","Singapore",1.35,103.8,5.9],703:["SK","Slovakia","Bratislava",48.1,17.1,5.4],
 704:["VN","Vietnam","Hanoi",21.0,105.8,98.9],   705:["SI","Slovenia","Ljubljana",46.1,14.5,2.1],
 706:["SO","Somalia","Mogadishu",2.05,45.3,18.1],710:["ZA","South Africa","Pretoria",-25.75,28.2,60.4],
 716:["ZW","Zimbabwe","Harare",-17.8,31.05,16.7],724:["ES","Spain","Madrid",40.4,-3.7,47.5],
 728:["SS","South Sudan","Juba",4.85,31.6,11.1], 729:["SD","Sudan","Khartoum",15.6,32.5,48.1],
 740:["SR","Suriname","Paramaribo",5.8,-55.2,0.62],748:["SZ","Eswatini","Mbabane",-26.3,31.1,1.2],
 752:["SE","Sweden","Stockholm",59.3,18.1,10.6], 756:["CH","Switzerland","Bern",46.95,7.45,8.8],
 760:["SY","Syria","Damascus",33.5,36.3,23.2],   762:["TJ","Tajikistan","Dushanbe",38.6,68.8,10.1],
 764:["TH","Thailand","Bangkok",13.75,100.5,71.8],768:["TG","Togo","Lomé",6.1,1.2,9.1],
 776:["TO","Tonga","Nukuʻalofa",-21.1,-175.2,0.11],780:["TT","Trinidad & Tobago","Port of Spain",10.7,-61.5,1.5],
 784:["AE","United Arab Emirates","Abu Dhabi",24.45,54.37,9.5],788:["TN","Tunisia","Tunis",36.8,10.18,12.5],
 792:["TR","Türkiye","Ankara",39.9,32.9,85.8],   795:["TM","Turkmenistan","Ashgabat",37.9,58.4,6.5],
 798:["TV","Tuvalu","Funafuti",-8.5,179.2,0.01], 800:["UG","Uganda","Kampala",0.31,32.6,48.6],
 804:["UA","Ukraine","Kyiv",50.45,30.5,36.7],    807:["MK","North Macedonia","Skopje",42.0,21.4,1.8],
 818:["EG","Egypt","Cairo",30.05,31.25,112.7],   826:["GB","United Kingdom","London",51.5,-0.12,67.7],
 834:["TZ","Tanzania","Dodoma",-6.2,35.75,67.4], 840:["US","United States","Washington, D.C.",38.9,-77.04,339.9],
 854:["BF","Burkina Faso","Ouagadougou",12.4,-1.5,23.3],858:["UY","Uruguay","Montevideo",-34.9,-56.2,3.4],
 860:["UZ","Uzbekistan","Tashkent",41.3,69.3,35.2],862:["VE","Venezuela","Caracas",10.5,-66.9,28.8],
 887:["YE","Yemen","Sana'a",15.35,44.2,34.4],    894:["ZM","Zambia","Lusaka",-15.4,28.3,20.6],
};
(NUM as any)[710] = ["ZA","South Africa","Pretoria",-25.75,28.2,60.4];

/* Per-country legal status of each language. */
const STATUS: Record<string, Record<string, LangStat>> = {
  en:{ US:{s:"Official",note:"de facto at federal level; official in 32 states"},
       GB:{s:"Official",note:"de facto national language"},
       IN:{s:"Co-official",note:"additional official language of the Union"},
       SG:{s:"Co-official",note:"one of 4 official languages"}, ZA:{s:"Co-official",note:"11 official languages"},
       RW:{s:"Co-official",note:"with Kinyarwanda & French"}, CM:{s:"Co-official",note:"with French"},
       CA:{s:"Co-official",note:"with French (federal)"}, PH:{s:"Co-official",note:"with Filipino"},
       FJ:{s:"Co-official",note:"with iTaukei & Hindi"}, VU:{s:"Co-official",note:"with French & Bislama"},
       HN:{s:"Co-official",note:"regional (Bay Islands)"}, BO:{s:"Co-official",note:"regional"} },
  zh:{ MY:{s:"Co-official",note:"recognised in Sarawak"} },
  fr:{ BE:{s:"Co-official",note:"with Dutch & German"}, CH:{s:"Co-official",note:"with German, Italian & Romansh"},
       CA:{s:"Co-official",note:"with English (federal)"}, LU:{s:"Co-official",note:"with German & Luxembourgish"},
       IT:{s:"Co-official",note:"regional (Aosta Valley)"}, VU:{s:"Co-official",note:"with English & Bislama"},
       DJ:{s:"Co-official",note:"with Arabic"}, KM:{s:"Co-official",note:"with Arabic & Comorian"},
       CF:{s:"Co-official",note:"with Sango"}, TD:{s:"Co-official",note:"with Arabic"},
       CG:{s:"Official",note:"national working language"}, RW:{s:"Co-official",note:"with Kinyarwanda & English"},
       BI:{s:"Co-official",note:"with Kirundi"}, MU:{s:"Recognised",note:"official in the National Assembly"},
       SC:{s:"Co-official",note:"with English & Creole"} },
  de:{ BE:{s:"Co-official",note:"German-speaking Community"}, CH:{s:"Co-official",note:"principal official language"},
       IT:{s:"Co-official",note:"regional (South Tyrol)"}, NA:{s:"Official",note:"national language"} },
  it:{ CH:{s:"Co-official",note:"with German, French & Romansh"} },
  ko:{}, ru:{ KZ:{s:"Co-official",note:"officially used, alongside Kazakh"},
              KG:{s:"Co-official",note:"official, alongside Kyrgyz"}, BY:{s:"Co-official",note:"with Belarusian"} },
  ar:{ IL:{s:"Special status",note:"state language; special status for Arabic speakers"},
       TD:{s:"Co-official",note:"with French"}, DJ:{s:"Co-official",note:"with French"},
       SO:{s:"Co-official",note:"with Somali"}, KM:{s:"Co-official",note:"with Comorian & French"},
       ER:{s:"Working language",note:"constitutionally recognised"} },
  hi:{ FJ:{s:"Co-official",note:"with iTaukei & English"} },
  es:{ US:{s:"Co-official",note:"regional (Puerto Rico)"} },
  pt:{}, th:{},
};
function statusOf(langId: string, a2: string): LangStat {
  const s = STATUS[langId]?.[a2];
  if (s) return s;
  if (langId === "en") return { s: "Official language" };
  if (langId === "zh") return { s: "Official language (Mandarin / 普通话)" };
  if (langId === "ru" && a2 === "RU") return { s: "Official language (state language)" };
  if (langId === "ar") return { s: "Official language" };
  if (langId === "hi" && a2 === "IN") return { s: "Official language of the Union", note: "one of two official Union languages; 22 scheduled languages" };
  return { s: "Official language" };
}
function langName(id: string): LangDef { return LANGS.find(l => l.id === id)! }

/* ========================= 3. CONSTANTS & CREDITS ============================= */

const R = 1;                                    // globe radius (world units)
const R_OVER = R * 1.0025;                      // overlay shell
const TEX = {
  day:   "https://unpkg.com/three-globe@2.31.1/example/img/earth-blue-marble.jpg",
  night: "https://unpkg.com/three-globe@2.31.1/example/img/earth-night.jpg",
  bump:  "https://unpkg.com/three-globe@2.31.1/example/img/earth-topology.png",
  clouds:"https://unpkg.com/three-globe@2.31.1/example/img/clouds.png",
};
const BORDERS_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/countries-110m.json";
const CREDIT = "Imagery NASA Blue Marble · Borders Natural Earth · Built with three.js";

const MIN_DIST = 1.32, MAX_DIST = 6.0, PIN_SHOW_DIST = 6.2;
const START = { lat: 22, lon: 12, dist: 3.15 };        // Atlantic / Europe–Africa

/* ========================= 4. SMALL UTILITIES ================================= */

const clamp = (v: number, a: number, b: number) => v < a ? a : v > b ? b : v;
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const wrapLon = (l: number) => ((l + 540) % 360) - 180;
const hashStr = (s: string) => { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return h >>> 0 };
const fmtPop = (m: number) => m >= 1 ? `${m.toFixed(m >= 100 ? 0 : 1)} million` : `${Math.round(m * 1000)} k`;

function geoToVec3(lat: number, lon: number, r: number): V3 {
  const p = lat * Math.PI / 180, l = lon * Math.PI / 180;
  return new THREE.Vector3(r * Math.cos(p) * Math.cos(l), r * Math.sin(p), -r * Math.cos(p) * Math.sin(l));
}
function vecToGeo(v: V3): { lat: number; lon: number } {
  const r = v.length() || 1;
  return { lat: Math.asin(clamp(v.y / r, -1, 1)) * 180 / Math.PI,
           lon: Math.atan2(-v.z, v.x) * 180 / Math.PI };
}
function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  h = ((h % 1) + 1) % 1;
  const f = (n: number) => { const k = (n + h * 12) % 12, a = s * Math.min(l, 1 - l);
    return l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)) };
  return [f(0), f(8), f(4)];
}
const cssHsl = (c: [number, number, number], a = 1, dl = 0) =>
  `hsla(${Math.round(c[0] * 360)},${Math.round(c[1] * 100)}%,${clamp(Math.round(c[2] * 100) + dl, 0, 96)}%,${a})`;

function deterministicColor(a2: string): [number, number, number] {
  const h = hashStr(a2);
  return [((h % 890) / 890 + (h % 7) * 0.013) % 1, 0.62 + (h % 13) / 90, 0.47 + ((h >> 4) % 11) / 100];
}

/* ========================= 5. TOPOJSON DECODER ================================ */

function decodeTopoCountries(topo: any): Map<string, number[][][]> {
  const tf = topo.transform, tr = topo.objects.countries.geometries;
  const K = tf ? [tf.scale[0], tf.scale[1]] : [1, 1], T = tf ? [tf.translate[0], tf.translate[1]] : [0, 0];
  const arcs: [number, number][][] = topo.arcs.map((arc: number[][]) => {
    let x = 0, y = 0;
    return arc.map(pt => { x += pt[0]; y += pt[1]; return [x * K[0] + T[0], y * K[1] + T[1]] });
  });
  const line = (idx: number): [number, number][] =>
    idx >= 0 ? arcs[idx].slice() : arcs[~idx].slice().reverse();

  function ringArcs(ringIdx: number[]): [number, number][] {
    let pts: [number, number][] = [];
    for (const ai of ringIdx) {
      const seg = line(ai);
      if (pts.length) pts.pop();            // shared junction point
      pts = pts.concat(seg);
    }
    return pts;
  }
  const out = new Map<string, number[][][]>();
  for (const g of tr) {
    const id = String(g.id).padStart(3, "0");
    const polys: number[][][] = [];
    const parts = g.type === "Polygon" ? [g.arcs] : g.type === "MultiPolygon" ? g.arcs : [];
    for (const poly of parts) polys.push(...poly.map(ringArcs));
    out.set(id, polys);
  }
  return out;
}

/* ========================= 6. CSS (injected) ================================== */

const CSS = `
:root{--bg:#04060c;--ink:#eaf2fd;--dim:#9fb2cc;--acc:#6fb7ff;--glass:rgba(9,14,26,.74);
--stroke:rgba(255,255,255,.09);--r:16px}
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:100%;height:100%;overflow:hidden;background:var(--bg);color:var(--ink);
font:14px/1.45 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Inter,"Helvetica Neue",Arial,sans-serif;
-webkit-font-smoothing:antialiased;overscroll-behavior:none}
#app{position:fixed;inset:0}
#gl{position:absolute;inset:0;width:100%;height:100%;display:block;touch-action:none;cursor:grab}
#gl.dragging{cursor:grabbing}#gl.pick{cursor:pointer}
.vignette{position:absolute;inset:0;pointer-events:none;
background:radial-gradient(120% 90% at 50% 42%,transparent 55%,rgba(0,0,10,.42) 100%)}
/* ---------- panels ---------- */
.glass{background:var(--glass);border:1px solid var(--stroke);border-radius:var(--r);
backdrop-filter:blur(18px) saturate(1.35);-webkit-backdrop-filter:blur(18px) saturate(1.35);
box-shadow:0 18px 50px rgba(0,0,0,.55),inset 0 1px 0 rgba(255,255,255,.06)}
/* ---------- language dock ---------- */
#dock{position:absolute;left:16px;top:16px;width:252px;display:flex;flex-direction:column;
max-height:calc(100% - 32px);overflow:hidden;z-index:20}
.dock-head{padding:14px 16px 10px}
.brand{display:flex;align-items:baseline;gap:8px}
.brand .logo{font-size:19px;letter-spacing:.06em;font-weight:800}
.brand .logo em{font-style:normal;color:var(--acc)}
.brand .sub{font-size:10.5px;color:var(--dim);letter-spacing:.14em;text-transform:uppercase}
.dock-sub{margin-top:4px;font-size:12px;color:var(--dim)}
.dock-actions{display:flex;gap:8px;padding:6px 12px 10px}
.chip{flex:1;border:1px solid var(--stroke);background:rgba(255,255,255,.04);color:var(--ink);
border-radius:10px;padding:7px 0;font-size:12px;font-weight:600;cursor:pointer;transition:.18s}
.chip:hover{background:rgba(255,255,255,.1)}
.chip.on{background:linear-gradient(135deg,#3d8bfd,#6a5cff);border-color:transparent;color:#fff}
.langs{overflow-y:auto;padding:2px 8px 10px;scrollbar-width:thin}
.langs::-webkit-scrollbar{width:6px}.langs::-webkit-scrollbar-thumb{background:rgba(255,255,255,.14);border-radius:3px}
.lang{display:flex;align-items:center;gap:10px;width:100%;padding:8px 10px;margin:2px 0;border:0;
border-radius:12px;background:transparent;color:var(--ink);text-align:left;cursor:pointer;transition:.16s}
.lang:hover{background:rgba(255,255,255,.07)}
.lang .fl{font-size:20px;filter:drop-shadow(0 2px 4px rgba(0,0,0,.4))}
.lang .nm{flex:1;display:flex;flex-direction:column;line-height:1.15}
.lang .nm b{font-weight:600;font-size:13.5px}
.lang .nm span{font-size:11px;color:var(--dim)}
.lang .ct{font-size:11px;color:var(--dim);background:rgba(255,255,255,.06);padding:2px 7px;border-radius:20px}
.lang.active{background:linear-gradient(90deg,rgba(61,139,253,.28),rgba(106,92,255,.18));
box-shadow:inset 0 0 0 1px rgba(120,170,255,.35)}
.lang.active .ct{background:rgba(120,170,255,.25);color:#dceaff}
.dock-foot{padding:8px 16px 12px;font-size:10.5px;color:#7d8ea8;border-top:1px solid var(--stroke)}
/* ---------- country card ---------- */
#card{position:absolute;right:16px;top:16px;width:320px;z-index:22;padding:0;overflow:hidden;
opacity:0;transform:translateY(-8px);pointer-events:none;transition:.25s}
#card.show{opacity:1;transform:none;pointer-events:auto}
#card .band{height:5px}
#card .inner{padding:16px 18px 15px}
#card .x{position:absolute;top:10px;right:12px;width:26px;height:26px;border:0;border-radius:8px;
background:rgba(255,255,255,.07);color:var(--dim);font-size:13px;cursor:pointer}
#card .x:hover{background:rgba(255,255,255,.15);color:#fff}
.c-head{display:flex;gap:12px;align-items:center}
.c-head .fl{font-size:38px;line-height:1}
.c-head h2{font-size:18px;font-weight:700;letter-spacing:.01em}
.c-head .code{font-size:11px;color:var(--dim);letter-spacing:.12em}
.c-rows{margin-top:12px;display:flex;flex-direction:column;gap:9px}
.c-row .k{font-size:10px;letter-spacing:.16em;text-transform:uppercase;color:#7d8ea8}
.c-row .v{font-size:13.5px;margin-top:1px}
.c-row .note{font-size:12px;color:var(--dim);margin-top:1px}
.chips{display:flex;flex-wrap:wrap;gap:6px;margin-top:2px}
.lchip{font-size:12px;padding:3px 9px;border-radius:20px;background:rgba(255,255,255,.07);
border:1px solid var(--stroke)}
.lchip.on{background:rgba(61,139,253,.22);border-color:rgba(120,170,255,.5)}
/* ---------- misc HUD ---------- */
#hint{position:absolute;left:50%;bottom:20px;transform:translateX(-50%);z-index:15;
padding:8px 18px;border-radius:30px;font-size:12.5px;color:#cfe0f5;white-space:nowrap;
opacity:.95;transition:opacity .8s}
#hint.gone{opacity:0;pointer-events:none}
#attrib{position:absolute;right:12px;bottom:10px;z-index:10;font-size:10px;color:rgba(230,240,255,.42);pointer-events:none}
#fps{position:absolute;left:12px;bottom:10px;z-index:10;font-size:10px;color:rgba(230,240,255,.35);pointer-events:none}
/* ---------- loading ---------- */
#load{position:absolute;inset:0;z-index:50;display:flex;flex-direction:column;gap:18px;
align-items:center;justify-content:center;background:radial-gradient(90% 90% at 50% 40%,#0a1224 0%,#04060c 70%);
transition:opacity .6s}
#load.gone{opacity:0;pointer-events:none}
.orb{width:74px;height:74px;border-radius:50%;position:relative;
background:radial-gradient(circle at 32% 30%,#2e6fd8,#0a2a66 70%);box-shadow:0 0 60px rgba(60,130,255,.35)}
.orb::after{content:"";position:absolute;inset:-9px;border-radius:50%;border:2px solid transparent;
border-top-color:#7ab6ff;border-right-color:rgba(122,182,255,.3);animation:spin 1.1s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}
#load .t{font-size:20px;font-weight:800;letter-spacing:.08em}
#load .t em{font-style:normal;color:var(--acc)}
#loadmsg{font-size:12.5px;color:var(--dim);letter-spacing:.06em}
#loaderr{max-width:420px;text-align:center;font-size:13px;color:#ffb1a6;display:none}
/* ---------- mobile sheet ---------- */
@media (max-width:860px){
  #dock{left:10px;right:10px;top:auto;bottom:0;width:auto;max-height:62vh;border-radius:18px 18px 0 0;
  transform:translateY(calc(100% - 58px));transition:transform .3s}
  #dock.open{transform:none}
  .dock-head{display:flex;align-items:center;gap:10px;padding:12px 16px;cursor:pointer}
  .brand{flex:1}.dock-sub{display:none}
  .grab{display:block;width:38px;height:4px;border-radius:2px;background:rgba(255,255,255,.25);
  position:absolute;left:50%;top:6px;transform:translateX(-50%)}
  .langs{max-height:44vh}
  #card{left:10px;right:10px;top:10px;width:auto}
  #hint{bottom:74px;font-size:11.5px}
}`;

/* ========================= 7. GLOBE CONTROLS ================================== */

interface CtrlOpt { onDown(): void; onHover(cx: number, cy: number): string | null; onIdle(): void }

class GlobeControls {
  cam: any; dom: HTMLElement;
  lat = START.lat; lon = START.lon; dist = START.dist;
  tLat = START.lat; tLon = START.lon; tDist = START.dist;
  private vLat = 0; private vLon = 0;
  private p = new Map<number, { x: number; y: number; t: number }>();
  private pts: { x: number; y: number }[] = [];
  private dragging = false; private pinching = false; private panning = false;
  private lastTap = 0; private moved = 0; private downT = 0;
  private zoomAnim: { f: number; t: number; d0: number; d1: number; c0: V3; c1: V3 } | null = null;
  private opt: CtrlOpt; private raf = 0; private lastPan = 0;

  constructor(cam: any, dom: HTMLElement, opt: CtrlOpt) {
    this.cam = cam; this.dom = dom; this.opt = opt;
    dom.addEventListener("pointerdown", this.onDown);
    window.addEventListener("pointermove", this.onMove);
    window.addEventListener("pointerup", this.onUp);
    window.addEventListener("pointercancel", this.onUp);
    dom.addEventListener("wheel", this.onWheel, { passive: false });
    dom.addEventListener("dblclick", this.onDbl);
    dom.addEventListener("contextmenu", e => e.preventDefault());
  }
  /* ------- helpers ------- */
  private pos(e: PointerEvent) { const r = this.dom.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top } }
  private focal() { const h = this.dom.clientHeight || 1; return h / (2 * Math.tan((this.cam.fov * Math.PI / 180) / 2)) }
  cursorGroundPoint(cx: number, cy: number): V3 | null {
    const r = this.dom.getBoundingClientRect();
    const nx = ((cx - r.left) / r.width) * 2 - 1, ny = -(((cy - r.top) / r.height) * 2 - 1);
    const ro = this.cam.position.clone();
    const rd = new THREE.Vector3(nx, ny, 0.5).unproject(this.cam).sub(ro).normalize();
    const b = ro.dot(rd), c = ro.lengthSq() - R * R, disc = b * b - c;
    if (disc < 0) return null;
    return ro.addScaledVector(rd, -b - Math.sqrt(disc));
  }
  screenXY(v: V3): { x: number; y: number } | null {
    const p = v.clone().project(this.cam);
    if (p.z > 1) return null;
    const r = this.dom.getBoundingClientRect();
    return { x: (p.x + 1) / 2 * r.width, y: (-p.y + 1) / 2 * r.height };
  }
  /* ------- focus / framing ------- */
  focusGeo(lat: number, lon: number, dist: number, ms = 950) {
    const c0 = geoToVec3(this.tLat, this.tLon, 1), c1 = geoToVec3(lat, lon, 1);
    this.zoomAnim = { f: performance.now(), t: ms, d0: this.tDist, d1: clamp(dist, MIN_DIST, MAX_DIST), c0, c1 };
    this.vLat = this.vLon = 0; this.kick();
  }
  frameCountries(cs: Country[]) {
    if (!cs.length) return;
    let x = 0, y = 0, z = 0;
    for (const c of cs) for (const poly of c.polys) for (const [lo, la] of poly) {
      const v = geoToVec3(la, lo, 1); x += v.x; y += v.y; z += v.z;
    }
    const cen = new THREE.Vector3(x, y, z).normalize();
    const g = vecToGeo(cen);
    let maxA = 0.12;
    for (const c of cs) {
      const v = geoToVec3(c.center[1], c.center[0], 1);
      const ang = Math.acos(clamp(v.dot(cen), -1, 1)) + c.angRad;
      if (ang > maxA) maxA = ang;
    }
    const d = clamp(R / Math.sin(Math.min(Math.PI / 2 - 0.06, maxA * 1.22)) * 1.06, MIN_DIST + 0.06, 4.6);
    this.focusGeo(g.lat, g.lon, d, 1100);
  }
  /* ------- events ------- */
  private onDown = (e: PointerEvent) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    this.dom.setPointerCapture?.(e.pointerId);
    this.p.set(e.pointerId, { ...this.pos(e), t: performance.now() });
    this.pts = [...this.p.values()].map(q => ({ x: q.x, y: q.y }));
    this.moved = 0; this.downT = performance.now();
    this.zoomAnim = null; this.vLat = this.vLon = 0;
    if (this.p.size === 2) { this.pinching = true; this.dragging = false; this.panning = false; }
    else if (this.p.size === 1) { this.dragging = true; this.opt.onDown(); }
    this.dom.classList.add("dragging"); this.kick();
  };
  private onMove = (e: PointerEvent) => {
    const pos = this.pos(e);
    if (!this.p.has(e.pointerId)) {                       // pure hover
      if (e.pointerType === "mouse") {
        const c = this.opt.onHover(pos.x + this.dom.getBoundingClientRect().left,
                                   pos.y + this.dom.getBoundingClientRect().top);
        this.dom.classList.toggle("pick", !!c);
      }
      return;
    }
    const prev = this.p.get(e.pointerId)!;
    const dx = pos.x - prev.x, dy = pos.y - prev.y;
    this.moved += Math.abs(dx) + Math.abs(dy);
    this.p.set(e.pointerId, { ...pos, t: performance.now() });
    this.pts = [...this.p.values()].map(q => ({ x: q.x, y: q.y }));

    if (this.pinching && this.p.size === 2) {
      const [a, b] = this.pts, d = Math.hypot(a.x - b.x, a.y - b.y);
      if ((this as any)._pd) {
        const f = this.focal();
        this.tDist = clamp(this.tDist * ((this as any)._pd / Math.max(20, d)), MIN_DIST, MAX_DIST);
        const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
        const pmx = (this as any)._pmx, pmy = (this as any)._pmy;
        if (performance.now() - this.lastPan > 40) {
          this.tLon = wrapLon(this.tLon - (mx - pmx) / f * this.tDist / Math.cos(clamp(this.tLat, -85, 85) * Math.PI / 180) * 180 / Math.PI);
          this.tLat = clamp(this.tLat + (my - pmy) / f * this.tDist * 180 / Math.PI, -85, 85);
          this.lastPan = performance.now();
        }
      }
      (this as any)._pd = d; (this as any)._pmx = (a.x + b.x) / 2; (this as any)._pmy = (a.y + b.y) / 2;
      this.kick(); return;
    }
    if (this.dragging && this.p.size === 1) {
      const f = this.focal();
      const dLon = -dx / f * this.tDist * 180 / Math.PI;
      const dLat = dy / f * this.tDist * 180 / Math.PI;
      this.tLon = wrapLon(this.tLon + dLon / Math.cos(clamp(this.tLat, -85, 85) * Math.PI / 180));
      this.tLat = clamp(this.tLat + dLat, -85, 85);
      const dt = 16;
      this.vLon = 0.7 * this.vLon + 0.3 * (dLon / dt);
      this.vLat = 0.7 * this.vLat + 0.3 * (dLat / dt);
      this.kick();
    }
  };
  private onUp = (e: PointerEvent) => {
    const was = this.p.has(e.pointerId);
    this.p.delete(e.pointerId); (this as any)._pd = 0;
    if (this.p.size < 2) this.pinching = false;
    if (this.p.size === 0) {
      this.dom.classList.remove("dragging");
      const dur = performance.now() - this.downT;
      if (was && this.moved < 8 && dur < 450 && e.pointerType !== "mouse") {   // touch tap
        const now = performance.now();
        if (now - this.lastTap < 320) { this.doubleTapZoom(e); this.lastTap = 0; }
        else { this.lastTap = now; this.tapPick(e); }
      }
      this.dragging = false;
    }
    this.kick();
  };
  private tapPick(e: PointerEvent) {
    const r = this.dom.getBoundingClientRect();
    const c = this.opt.onHover(e.clientX, e.clientY);
    if (c) (window as any).__pickByCode?.(c); else (window as any).__pickByCode?.(null);
    void r;
  }
  private doubleTapZoom(e: PointerEvent) {
    const g = this.cursorGroundPoint(e.clientX, e.clientY);
    if (!g) return;
    const { lat, lon } = vecToGeo(g);
    this.focusGeo(lat, lon, Math.max(MIN_DIST + 0.08, this.tDist / 2.4), 750);
  }
  private onWheel = (e: WheelEvent) => {
    e.preventDefault();
    this.zoomAnim = null;
    if (e.ctrlKey || e.metaKey) {                              // trackpad pinch
      const k = Math.pow(1.012, e.deltaY);
      this.zoomAt(e.clientX, e.clientY, this.tDist * k);
    } else if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {      // two-finger horizontal: rotate
      this.tLon = wrapLon(this.tLon - e.deltaX * 0.03 * (this.tDist / 3));
      this.tLat = clamp(this.tLat - e.deltaY * 0.03 * (this.tDist / 3), -85, 85);
    } else {                                                    // wheel / two-finger vertical
      let dy = clamp(e.deltaY, -260, 260);
      if (e.deltaMode === 1) dy *= 32;
      const k = Math.pow(1.0015, dy);
      this.zoomAt(e.clientX, e.clientY, this.tDist * k);
    }
    this.kick();
  };
  private zoomAt(cx: number, cy: number, nd: number) {
    nd = clamp(nd, MIN_DIST, MAX_DIST);
    const g = this.cursorGroundPoint(cx, cy);
    if (g) {
      const { lat, lon } = vecToGeo(g);
      const cosL = Math.max(0.12, Math.cos(lat * Math.PI / 180));
      const r = this.dom.getBoundingClientRect();
      const fx = cx - r.left - r.width / 2, fy = -(cy - r.top - r.height / 2);
      const f = this.focal(), ratio = nd / this.tDist - 1;
      const dLon = -fx / f * ratio * (180 / Math.PI) / cosL * 0.9;
      const dLat = fy / f * ratio * (180 / Math.PI) * 0.9;
      this.tLon = wrapLon(lon + dLon); this.tLat = clamp(lat + dLat, -85, 85);
    }
    this.tDist = nd;
  }
  private onDbl = (e: MouseEvent) => {
    e.preventDefault();
    const g = this.cursorGroundPoint(e.clientX, e.clientY);
    if (!g) return;
    const { lat, lon } = vecToGeo(g);
    this.focusGeo(lat, lon, Math.max(MIN_DIST + 0.08, this.tDist / 2.6), 800);
    if (this.moved < 8) (window as any).__pickByCode?.(this.opt.onHover(e.clientX, e.clientY));
  };
  /* ------- integration loop ------- */
  kick() { if (!this.raf) this.raf = requestAnimationFrame(this.step) }
  private step = () => {
    this.raf = 0;
    let again = false;
    if (this.zoomAnim) {
      const a = this.zoomAnim, t = clamp((performance.now() - a.f) / a.t, 0, 1);
      const e = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      const c = a.c0.clone().lerp(a.c1, e).normalize();
      const g = vecToGeo(c);
      this.lat = this.tLat = g.lat; this.lon = this.tLon = wrapLon(g.lon);
      this.dist = this.tDist = lerp(a.d0, a.d1, e);
      if (t < 1) again = true; else this.zoomAnim = null;
    } else {
      if (this.dragging && this.p.size === 1) {
        this.lon = this.tLon; this.lat = this.tLat; this.dist = this.tDist;
        again = true;
      } else if (this.pinching) {
        this.dist = this.tDist;
        this.lon = lerp(this.lon, this.tLon, 0.35); this.lat = lerp(this.lat, this.tLat, 0.35);
        again = true;
      } else {
        if (Math.abs(this.vLon) > 0.0015 || Math.abs(this.vLat) > 0.0015) {   // inertia
          this.tLon = wrapLon(this.tLon + this.vLon * 16);
          this.tLat = clamp(this.tLat + this.vLat * 16, -85, 85);
          this.vLon *= 0.93; this.vLat *= 0.93;
          if (Math.abs(this.vLon) <= 0.0015) this.vLon = 0;
          if (Math.abs(this.vLat) <= 0.0015) this.vLat = 0;
          again = true;
        }
        const s = 0.16;
        const nLon = this.lon + (this.tLon - this.lon) * s;
        this.lat = lerp(this.lat, this.tLat, s);
        this.dist = lerp(this.dist, this.tDist, 0.14);
        let dl = this.tLon - this.lon; dl = ((dl + 540) % 360) - 180;
        this.lon = wrapLon(this.lon + dl * s); void nLon;
        if (Math.abs(this.tLat - this.lat) > 0.0004 || Math.abs(this.tDist - this.dist) > 0.0004 || Math.abs(dl) > 0.0004) again = true;
        else { this.lat = this.tLat; this.dist = this.tDist; this.lon = this.tLon; }
      }
    }
    const p = this.cam.position;
    const cp = Math.cos(this.lat * Math.PI / 180);
    p.set(this.dist * cp * Math.cos(this.lon * Math.PI / 180),
          this.dist * Math.sin(this.lat * Math.PI / 180),
          -this.dist * cp * Math.sin(this.lon * Math.PI / 180));
    this.cam.lookAt(0, 0, 0);
    this.cam.updateMatrixWorld();
    if (again) this.raf = requestAnimationFrame(this.step); else this.opt.onIdle();
  };
}

/* ========================= 8. PIN MANAGER ===================================== */

class PinManager {
  group: any; private sprites: any[] = []; private tex: any;
  constructor(scene: any, countries: Country[]) {
    this.tex = this.makeTexture();
    this.group = new THREE.Group();
    for (const c of countries) {
      const mat = new THREE.SpriteMaterial({
        map: this.tex,
        depthTest: true,
        depthWrite: false,
        transparent: true,
        alphaTest: 0.02,
      });
      mat.color.setRGB(...hslToRgb(c.color[0], 0.75, 0.62));
      const s = new THREE.Sprite(mat);
      s.center.set(0.5, 0.05); // anchor tip at country position
      s.position.copy(geoToVec3(c.center[1], c.center[0], R * 1.013));
      s.userData.code = c.meta.a2;
      s.visible = false;
      this.group.add(s); this.sprites.push(s);
    }
    scene.add(this.group);
  }
  private makeTexture() {
    const cv = document.createElement("canvas"); cv.width = 64; cv.height = 64;
    const g = cv.getContext("2d")!;
    g.clearRect(0, 0, 64, 64);
    g.shadowColor = "rgba(0, 0, 0, 0.45)";
    g.shadowBlur = 4;
    g.shadowOffsetY = 2;
    g.beginPath();
    g.arc(32, 20, 14, Math.PI * 0.88, Math.PI * 0.12);
    g.lineTo(32, 59);
    g.closePath();
    g.fillStyle = "#ffffff";
    g.fill();
    g.shadowColor = "transparent";
    g.strokeStyle = "rgba(20, 30, 45, 0.85)";
    g.lineWidth = 2.5;
    g.stroke();
    g.beginPath();
    g.arc(32, 20, 6, 0, Math.PI * 2);
    g.fillStyle = "rgba(10, 18, 30, 0.9)";
    g.fill();
    const t = new THREE.CanvasTexture(cv);
    t.anisotropy = 4;
    return t;
  }
  update(cam: any, active: Set<string>) {
    const showPins = cam.position.length() < PIN_SHOW_DIST;
    const camDir = cam.position.clone().normalize();
    for (const s of this.sprites) {
      const on = showPins && active.has(s.userData.code);
      s.visible = on;
      if (!on) continue;
      s.visible = s.position.dot(camDir) > -0.06;
      const d = cam.position.distanceTo(s.position);
      const sc = clamp(d * 0.030, 0.016, 0.085);
      s.scale.set(sc, sc, 1);
    }
  }
  pick(cam: any, cx: number, cy: number, w: number, h: number): string | null {
    const nx = (cx / w) * 2 - 1, ny = -(cy / h) * 2 + 1;
    const ro = cam.position.clone();
    const rd = new THREE.Vector3(nx, ny, 0.5).unproject(cam).sub(ro).normalize();
    let best: string | null = null, bd = 0.028;
    for (const s of this.sprites) {
      if (!s.visible) continue;
      const t = s.position.clone().sub(ro).dot(rd);
      if (t < 0) continue;
      const d = ro.clone().addScaledVector(rd, t).distanceTo(s.position);
      if (d < bd) { bd = d; best = s.userData.code; }
    }
    return best;
  }
}

/* ========================= 9. MAIN APPLICATION ================================ */

class App {
  renderer: any; scene: any; cam: any;
  countries = new Map<string, Country>();
  byCode = new Map<string, Country>();
  sel = { mode: "none" as "none" | "lang" | "all", lang: null as string | null };
  selCountry: Country | null = null;
  private controls!: GlobeControls; private pins!: PinManager;
  private fillCv = document.createElement("canvas"); private fillCtx!: CanvasRenderingContext2D;
  private fillTex: any; private pickData!: Uint8ClampedArray;
  private pickW = 2048; private pickH = 1024;
  private overlayDirty = true; private cloudMesh: any; private sun: any;
  private hoverCode: string | null = null; private lastHoverPx = 0;
  private frames = 0; private fpsT = performance.now();
  private el: Record<string, HTMLElement> = {};

  /* ---------- boot ---------- */
  async start() {
    document.head.insertAdjacentHTML("beforeend", `<style>${CSS}</style>`);
    document.body.innerHTML = `
      <div id="app">
        <canvas id="gl"></canvas><div class="vignette"></div>
        <div id="dock" class="glass">
          <div class="grab"></div>
          <div class="dock-head" id="dockHead">
            <div class="brand"><span class="logo">LINGUA·<em>TERRA</em></span><span class="sub">world language atlas</span></div>
            <div class="dock-sub">Where the world's languages are official</div>
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
    ["gl", "dock", "langs", "card", "cardIn", "cardX", "hint", "load", "loadmsg", "loaderr",
     "btnAll", "btnClear", "dockHead", "fps", "attrib"].forEach(id => this.el[id] = document.getElementById(id)!);
    this.buildLangButtons();

    const msg = (t: string) => { this.el.loadmsg.textContent = t };
    try {
      msg("Loading three.js engine…");
      await this.loadThree();
      msg("Painting the oceans and continents…");
      this.initScene();
      msg("Fetching country borders…");
      await this.loadCountries();
      msg("Mapping languages…");
      this.buildIndexRaster();
      this.buildOverlayTexture();
      this.applySelection();                       // Show All on startup
      this.buildPins();
      this.bindUI();
      msg("Ready");
      this.el.load.classList.add("gone");
      this.controls.kick();
      this.loop();
      setTimeout(() => this.el.hint.classList.add("gone"), 8000);
    } catch (err) {
      console.error(err);
      this.el.loadmsg.textContent = "Could not finish loading.";
      this.el.loaderr.style.display = "block";
      this.el.loaderr.textContent =
        `${(err as Error).message ?? err} — check your internet connection and reload. ` +
        `(Textures & borders stream from public CDNs; the page must be served over http(s).)`;
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

  /* ---------- scene ---------- */
  private initScene() {
    const cv = this.el.gl as HTMLCanvasElement;
    this.renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
    this.renderer.setSize(innerWidth, innerHeight);
    this.renderer.outputEncoding = (THREE as any).sRGBEncoding;

    this.scene = new THREE.Scene();
    this.cam = new THREE.PerspectiveCamera(42, innerWidth / innerHeight, 0.02, 60);

    this.sun = new THREE.DirectionalLight(0xffffff, 2.35);
    this.scene.add(this.sun, new THREE.AmbientLight(0x223349, 0.9));

    // Earth shader: day + night-lights + ocean specular + soft terminator
    const texL = this.loadTex(TEX.day, true), texN = this.loadTex(TEX.night, true), texB = this.loadTex(TEX.bump, false);
    const earthMat = new THREE.ShaderMaterial({
      uniforms: {
        dayMap: { value: texL }, nightMap: { value: texN }, bumpMap: { value: texB },
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
    this.scene.add(new THREE.Mesh(new THREE.SphereGeometry(R, 96, 96), earthMat));
    (this as any).earthMat = earthMat;

    // overlay shell (country fills & borders)
    this.fillCv.width = 4096; this.fillCv.height = 2048;
    this.fillCtx = this.fillCv.getContext("2d")!;
    this.fillTex = new THREE.CanvasTexture(this.fillCv);
    this.fillTex.wrapS = THREE.RepeatWrapping;
    this.fillTex.minFilter = THREE.LinearFilter;
    this.fillTex.magFilter = THREE.LinearFilter;
    this.fillTex.generateMipmaps = false;
    this.fillTex.anisotropy = this.renderer.capabilities.getMaxAnisotropy();
    const ovMat = new THREE.MeshBasicMaterial({ map: this.fillTex, transparent: true, depthWrite: false });
    const ov = new THREE.Mesh(new THREE.SphereGeometry(R_OVER, 96, 96), ovMat);
    ov.renderOrder = 2; this.scene.add(ov);

    // clouds
    const cl = this.loadTex(TEX.clouds, false);
    this.cloudMesh = new THREE.Mesh(new THREE.SphereGeometry(R * 1.028, 64, 64),
      new THREE.MeshBasicMaterial({ map: cl, transparent: true, opacity: 0.5, depthWrite: false }));
    this.cloudMesh.renderOrder = 3; this.scene.add(this.cloudMesh);

    // atmosphere halo
    const atmo = new THREE.Mesh(new THREE.SphereGeometry(R * 1.16, 64, 64), new THREE.ShaderMaterial({
      side: THREE.BackSide, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      vertexShader: `varying vec3 vN; void main(){ vN = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: `varying vec3 vN; void main(){
        float i = pow(0.72 - dot(vN, vec3(0.,0.,-1.)), 4.0);
        gl_FragColor = vec4(0.35, 0.58, 1.0, 1.0) * i; }`,
    }));
    atmo.renderOrder = 1; this.scene.add(atmo);

    // stars
    const N = 750, pos = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      const v = new THREE.Vector3().randomDirection ? new THREE.Vector3().randomDirection()
        : new THREE.Vector3(Math.random() - .5, Math.random() - .5, Math.random() - .5).normalize();
      v.multiplyScalar(30 + Math.random() * 8); pos.set([v.x, v.y, v.z], i * 3);
    }
    const sg = new THREE.BufferGeometry();
    sg.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    this.scene.add(new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xbfd6ff, size: 0.05, transparent: true, opacity: 0.8 })));

    addEventListener("resize", () => {
      this.cam.aspect = innerWidth / innerHeight; this.cam.updateProjectionMatrix();
      this.renderer.setSize(innerWidth, innerHeight); this.controls.kick();
    });

    this.controls = new GlobeControls(this.cam, cv, {
      onDown: () => this.el.hint.classList.add("gone"),
      onHover: (x, y) => this.pickAt(x, y),
      onIdle: () => this.refreshPins(),
    });
    (window as any).__pickByCode = (code: string | null) => {
      const c = code ? this.byCode.get(code) : null;
      if (c) this.selectCountry(c, false); else this.selectCountry(null, false);
    };
  }

  private loadTex(url: string, srgb: boolean) {
    const t = new THREE.TextureLoader().load(url);
    if (srgb) t.encoding = (THREE as any).sRGBEncoding;
    t.anisotropy = 8; return t;
  }

  /* ---------- country data ---------- */
  private async loadCountries() {
    const res = await fetch(BORDERS_URL);
    if (!res.ok) throw new Error("Border data download failed (HTTP " + res.status + ")");
    const topo = await res.json();
    const geom = decodeTopoCountries(topo);

    geom.forEach((rawPolys, numId) => {
      const meta = NUM[Number(numId)];
      if (!meta) return;                                 // e.g. Antarctica (010) → intentionally skipped
      const [a2, name, cap, capLat, capLon, pop] = meta;
      const polys: number[][][] = [];
      let x = 0, y = 0, z = 0, n = 0;
      for (const ring of rawPolys) {
        if (ring.length < 3) continue;
        const first = ring[0];
        const off = wrapLon(first[0]) - first[0];       // normalize ring across antimeridian
        const poly = ring.map(([lo, la]) => [wrapLon(lo + off), la]);
        polys.push(poly);
        for (const [lo, la] of poly) { const v = geoToVec3(la, lo, 1); x += v.x; y += v.y; z += v.z; n++ }
      }
      if (!polys.length) return;
      const cv = new THREE.Vector3(x / n, y / n, z / n).normalize();
      const cg = vecToGeo(cv);
      let maxAng = 0;
      for (const poly of polys) for (const [lo, la] of poly) {
        const v = geoToVec3(la, lo, 1);
        const a = Math.acos(clamp(v.dot(cv), -1, 1));
        if (a > maxAng) maxAng = a;
      }
      const c: Country = {
        meta: { a2, name, cap, capLat, capLon, pop }, polys,
        center: [cg.lon, cg.lat], angRad: maxAng,
        color: deterministicColor(a2), langs: [],
      };
      this.countries.set(numId, c); this.byCode.set(a2, c);
    });

    for (const L of LANGS) for (const code of L.countries) {
      const c = this.byCode.get(code);
      if (c && !c.langs.includes(L.id)) c.langs.push(L.id);
    }
  }

  /* ---------- equirectangular rasters ---------- */
  private tracePoly(g: CanvasRenderingContext2D, poly: number[][], W: number, H: number, shift: number) {
    g.beginPath();
    for (let i = 0; i < poly.length; i++) {
      const x = ((poly[i][0] + shift + 180) / 360) * W, y = ((90 - poly[i][1]) / 180) * H;
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

  private buildIndexRaster() {
    const W = this.pickW, H = this.pickH;
    const cv = document.createElement("canvas"); cv.width = W; cv.height = H;
    const g = cv.getContext("2d", { willReadFrequently: true })!;
    g.fillStyle = "#000000"; g.fillRect(0, 0, W, H);
    let i = 1;
    const list = [...this.countries.values()];
    g.globalCompositeOperation = "source-over";
    for (const c of list) {
      const r = i & 255, gg = (i >> 8) & 255, b = (i >> 16) & 255;
      g.fillStyle = `rgb(${r},${gg},${b})`;
      this.eachDraw(g, c, W, H, sh => { for (const p of c.polys) this.tracePoly(g, p, W, H, sh) });
      g.fill("evenodd");
      i++;
    }
    this.pickData = g.getImageData(0, 0, W, H).data;
  }
  private countryAtGeo(lat: number, lon: number): Country | null {
    const W = this.pickW, H = this.pickH;
    let x = Math.floor(((wrapLon(lon) + 180) / 360) * W) % W; if (x < 0) x += W;
    const y = clamp(Math.floor(((90 - lat) / 180) * H), 0, H - 1);
    const o = (y * W + x) * 4, d = this.pickData;
    const idx = d[o] | (d[o + 1] << 8) | (d[o + 2] << 16);
    if (!idx) return null;
    return [...this.countries.values()][idx - 1];
  }

  private buildOverlayTexture() {
    const g = this.fillCtx, W = this.fillCv.width, H = this.fillCv.height;
    g.clearRect(0, 0, W, H);
    const active = this.activeCodes();
    // fills
    for (const c of this.byCode.values()) {
      if (!active.has(c.meta.a2)) continue;
      const em = this.selCountry === c;
      g.fillStyle = cssHsl(c.color, em ? 0.46 : 0.32);
      this.eachDraw(g, c, W, H, sh => { for (const p of c.polys) this.tracePoly(g, p, W, H, sh) });
      g.fill("evenodd");
    }
    // crisp borders — subtle global borders, bright active borders
    g.lineJoin = "round";
    g.lineCap = "round";
    g.strokeStyle = "rgba(255,255,255,0.28)";
    g.lineWidth = 1.6;
    for (const c of this.byCode.values()) {
      this.eachDraw(g, c, W, H, sh => { for (const p of c.polys) this.tracePoly(g, p, W, H, sh) });
      g.stroke();
    }
    for (const c of this.byCode.values()) {
      if (!active.has(c.meta.a2)) continue;
      const em = this.selCountry === c;
      g.strokeStyle = cssHsl(c.color, em ? 1 : 0.95, 18);
      g.lineWidth = em ? 4.5 : 3.0;
      this.eachDraw(g, c, W, H, sh => { for (const p of c.polys) this.tracePoly(g, p, W, H, sh) });
      g.stroke();
    }
    this.fillTex.needsUpdate = true;
    this.overlayDirty = false;
  }

  /* ---------- selection model ---------- */
  activeCodes(): Set<string> {
    const s = new Set<string>();
    if (this.sel.mode === "all") { for (const c of this.byCode.values()) if (c.langs.length) s.add(c.meta.a2) }
    else if (this.sel.mode === "lang") {
      const L = langName(this.sel.lang!);
      for (const code of L.countries) if (this.byCode.has(code)) s.add(code);
    }
    return s;
  }
  selectLang(id: string | null) {
    if (id === null) this.sel = { mode: "none", lang: null };
    else this.sel = { mode: "lang", lang: id };
    this.applySelection();
    if (id) {
      const L = langName(id);
      const cs = L.countries.map(c => this.byCode.get(c)).filter(Boolean) as Country[];
      this.controls.frameCountries(cs);
    }
  }
  selectAll() {
    this.sel = { mode: "all", lang: null };
    this.applySelection();
    this.controls.focusGeo(18, 15, 3.3, 1000);
  }
  private applySelection() {
    this.overlayDirty = true;
    this.updateDockState();
    if (this.selCountry && !this.activeCodes().has(this.selCountry.meta.a2)) this.selectCountry(null, true);
    this.controls.kick();
  }
  selectCountry(c: Country | null, silent = false) {
    if (this.selCountry === c) return;
    this.selCountry = c;
    this.overlayDirty = true;
    const card = this.el.card;
    if (!c) { card.classList.remove("show"); return }
    const inSel = (langId: string) =>
      this.sel.mode === "all" ? true : this.sel.lang === langId;
    const rows = c.langs.map(lid => {
      const L = langName(lid), st = statusOf(lid, c.meta.a2);
      return `<div class="c-row"><div class="k">${L.flag} ${L.name} — status</div>
        <div class="v">${st.s}</div>${st.note ? `<div class="note">${st.note}</div>` : ""}</div>`;
    }).join("");
    const chips = c.langs.map(lid => {
      const L = langName(lid);
      return `<span class="lchip ${inSel(lid) ? "on" : ""}">${L.flag} ${L.name}</span>`;
    }).join("");
    this.el.cardIn.innerHTML = `
      <div class="c-head"><span class="fl">${flagOf(c.meta.a2)}</span>
        <div><h2>${c.meta.name}</h2><div class="code">ISO ${c.meta.a2} · ${fmtPop(c.meta.pop)} people</div></div></div>
      <div class="c-rows">
        <div class="c-row"><div class="k">Capital</div><div class="v">${c.meta.cap}</div></div>
        <div class="c-row"><div class="k">Official languages (of the 12 tracked)</div><div class="chips">${chips}</div></div>
        ${rows}
      </div>`;
    (card.querySelector(".band") as HTMLElement).style.background =
      `linear-gradient(90deg, ${cssHsl(c.color, 1)}, ${cssHsl(c.color, 0.25, 18)})`;
    card.classList.add("show");
    if (!silent) this.controls.kick();
  }

  /* ---------- picking ---------- */
  pickAt(cx: number, cy: number): string | null {
    if (!this.controls) return null;
    const now = performance.now();
    if (now - this.lastHoverPx < 24) return this.hoverCode;      // cheap throttle
    this.lastHoverPx = now;
    const r = (this.el.gl as HTMLCanvasElement).getBoundingClientRect();
    const pin = this.pins?.pick(this.cam, cx - r.left, cy - r.top, r.width, r.height);
    if (pin) { this.hoverCode = pin; return pin }
    const g = this.controls.cursorGroundPoint(cx, cy);
    if (!g) { this.hoverCode = null; return null }
    const { lat, lon } = vecToGeo(g);
    const c = this.countryAtGeo(lat, lon);
    const code = c && this.activeCodes().has(c.meta.a2) ? c.meta.a2 : null;
    this.hoverCode = code; return code;
  }

  /* ---------- pins ---------- */
  private buildPins() {
    this.pins = new PinManager(this.scene, [...this.byCode.values()]);
  }
  private refreshPins() { this.pins?.update(this.cam, this.activeCodes()) }

  /* ---------- UI ---------- */
  private buildLangButtons() {
    const box = this.el.langs;
    box.innerHTML = LANGS.map(L => `
      <button class="lang" data-id="${L.id}">
        <span class="fl">${L.flag}</span>
        <span class="nm"><b>${L.name}</b><span>${L.native}</span></span>
        <span class="ct">${L.countries.filter(c => this.byCode.size ? this.byCode.has(c) : true).length || L.countries.length}</span>
      </button>`).join("");
    box.querySelectorAll(".lang").forEach(b =>
      b.addEventListener("click", () => {
        const id = (b as HTMLElement).dataset.id!;
        this.selectLang(this.sel.lang === id ? null : id);
      }));
  }
  private updateDockState() {
    this.el.langs.querySelectorAll(".lang").forEach(b => {
      const id = (b as HTMLElement).dataset.id!;
      b.classList.toggle("active", this.sel.mode === "lang" && this.sel.lang === id);
      const ct = b.querySelector(".ct")!;
      if (this.byCode.size)
        ct.textContent = String(langName(id).countries.filter(c => this.byCode.has(c)).length);
    });
    this.el.btnAll.classList.toggle("on", this.sel.mode === "all");
  }
  private bindUI() {
    this.el.btnAll.addEventListener("click", () => this.selectAll());
    this.el.btnClear.addEventListener("click", () => {
      this.selectLang(null);
      this.controls.focusGeo(START.lat, START.lon, START.dist, 900);
    });
    this.el.cardX.addEventListener("click", () => this.selectCountry(null));
    this.el.dockHead.addEventListener("click", () => {
      if (matchMedia("(max-width:860px)").matches) this.el.dock.classList.toggle("open");
    });
    (this.el.gl as HTMLCanvasElement).addEventListener("click", (e) => {
      const code = this.pickAt(e.clientX, e.clientY);
      this.selectCountry(code ? this.byCode.get(code)! : null);
    });
  }

  /* ---------- frame loop ---------- */
  private loop = () => {
    requestAnimationFrame(this.loop);
    if (this.overlayDirty) this.buildOverlayTexture();
    if (this.cloudMesh) this.cloudMesh.rotation.y += 0.00011;
    // keep the sun in view-space for pleasing, stable shading
    const fwd = new THREE.Vector3(); this.cam.getWorldDirection(fwd);
    const right = new THREE.Vector3().crossVectors(fwd, new THREE.Vector3(0, 1, 0)).normalize();
    this.sun.position.copy(fwd.multiplyScalar(-1).add(right.multiplyScalar(0.6)).add(new THREE.Vector3(0, 0.4, 0)).normalize().multiplyScalar(5));
    (this as any).earthMat.uniforms.sunDir.value.copy(this.sun.position).normalize();
    this.refreshPins();
    this.renderer.render(this.scene, this.cam);
    this.frames++;
    const now = performance.now();
    if (now - this.fpsT > 1000) {
      this.el.fps.textContent = `${Math.round(this.frames * 1000 / (now - this.fpsT))} fps`;
      this.frames = 0; this.fpsT = now;
    }
  };
}

/* ---------- flag from ISO alpha-2 ---------- */
function flagOf(a2: string): string {
  if (a2 === "TW") return "🇹🇼";
  return a2.replace(/./g, ch => String.fromCodePoint(127397 + ch.charCodeAt(0)));
}

/* ---------- go ---------- */
new App().start();

export {};
