import type { LangDef, LangStat } from "../types";

export const LANGS: LangDef[] = [
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
export const NUM: Record<number, [string, string, string, number, number, number]> = {
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
export const STATUS: Record<string, Record<string, LangStat>> = {
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

export function statusOf(langId: string, a2: string): LangStat {
  const s = STATUS[langId]?.[a2];
  if (s) return s;
  if (langId === "en") return { s: "Official language" };
  if (langId === "zh") return { s: "Official language (Mandarin / 普通话)" };
  if (langId === "ru" && a2 === "RU") return { s: "Official language (state language)" };
  if (langId === "ar") return { s: "Official language" };
  if (langId === "hi" && a2 === "IN") return { s: "Official language of the Union", note: "one of two official Union languages; 22 scheduled languages" };
  return { s: "Official language" };
}

export function langName(id: string): LangDef {
  return LANGS.find(l => l.id === id)!;
}

export function flagOf(a2: string): string {
  if (a2 === "TW") return "🇹🇼";
  return a2.replace(/./g, ch => String.fromCodePoint(127397 + ch.charCodeAt(0)));
}
