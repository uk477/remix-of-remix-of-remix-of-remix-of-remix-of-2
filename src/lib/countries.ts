/**
 * Static country-name -> ISO 3166-1 alpha-2 map.
 * Static on purpose: `Intl.DisplayNames` is missing/partial in some runtimes
 * (SSR worker, older WebViews), which silently dropped flags for Germany,
 * Serbia and friends.
 */
const RAW = `
Afghanistan:AF|Albania:AL|Algeria:DZ|Andorra:AD|Angola:AO|Antigua & Barbuda:AG|Antigua and Barbuda:AG|Argentina:AR|Armenia:AM|Aruba:AW|Australia:AU|Austria:AT|Azerbaijan:AZ|
Bahamas:BS|Bahrain:BH|Bangladesh:BD|Barbados:BB|Belarus:BY|Belgium:BE|Belize:BZ|Benin:BJ|Bermuda:BM|Bhutan:BT|Bolivia:BO|Bosnia & Herzegovina:BA|Bosnia and Herzegovina:BA|Botswana:BW|Brazil:BR|Brunei:BN|Brunei Darussalam:BN|Bulgaria:BG|Burkina Faso:BF|Burma:MM|Burundi:BI|
Cabo Verde:CV|Cambodia:KH|Cameroon:CM|Canada:CA|Cape Verde:CV|Cayman Islands:KY|Central African Republic:CF|Chad:TD|Chile:CL|China:CN|Colombia:CO|Comoros:KM|Congo:CG|Congo - Brazzaville:CG|Congo - Kinshasa:CD|Congo (DRC):CD|DR Congo:CD|Costa Rica:CR|Croatia:HR|Cuba:CU|Curacao:CW|Curaçao:CW|Cyprus:CY|Czechia:CZ|Czech Republic:CZ|Côte d’Ivoire:CI|Cote d'Ivoire:CI|Ivory Coast:CI|
Denmark:DK|Djibouti:DJ|Dominica:DM|Dominican Republic:DO|
Ecuador:EC|Egypt:EG|El Salvador:SV|Equatorial Guinea:GQ|Eritrea:ER|Estonia:EE|Eswatini:SZ|Swaziland:SZ|Ethiopia:ET|
Fiji:FJ|Finland:FI|France:FR|French Polynesia:PF|
Gabon:GA|Gambia:GM|Georgia:GE|Germany:DE|Ghana:GH|Gibraltar:GI|Greece:GR|Greenland:GL|Grenada:GD|Guadeloupe:GP|Guam:GU|Guatemala:GT|Guernsey:GG|Guinea:GN|Guinea-Bissau:GW|Guyana:GY|
Haiti:HT|Honduras:HN|Hong Kong:HK|Hong Kong SAR China:HK|Hungary:HU|
Iceland:IS|India:IN|Indonesia:ID|Iran:IR|Iraq:IQ|Ireland:IE|Isle of Man:IM|Israel:IL|Italy:IT|
Jamaica:JM|Japan:JP|Jersey:JE|Jordan:JO|
Kazakhstan:KZ|Kenya:KE|Kiribati:KI|Kosovo:XK|Kuwait:KW|Kyrgyzstan:KG|
Laos:LA|Latvia:LV|Lebanon:LB|Lesotho:LS|Liberia:LR|Libya:LY|Liechtenstein:LI|Lithuania:LT|Luxembourg:LU|
Macau:MO|Macao:MO|Macao SAR China:MO|Madagascar:MG|Malawi:MW|Malaysia:MY|Maldives:MV|Mali:ML|Malta:MT|Martinique:MQ|Mauritania:MR|Mauritius:MU|Mexico:MX|Moldova:MD|Monaco:MC|Mongolia:MN|Montenegro:ME|Morocco:MA|Mozambique:MZ|Myanmar:MM|Myanmar (Burma):MM|
Namibia:NA|Nepal:NP|Netherlands:NL|New Caledonia:NC|New Zealand:NZ|Nicaragua:NI|Niger:NE|Nigeria:NG|North Korea:KP|North Macedonia:MK|Macedonia:MK|Norway:NO|
Oman:OM|
Pakistan:PK|Palestine:PS|Palestinian Territories:PS|Panama:PA|Papua New Guinea:PG|Paraguay:PY|Peru:PE|Philippines:PH|Poland:PL|Portugal:PT|Puerto Rico:PR|
Qatar:QA|
Reunion:RE|Réunion:RE|Romania:RO|Russia:RU|Russian Federation:RU|Rwanda:RW|
Saint Kitts & Nevis:KN|Saint Lucia:LC|Saint Vincent & Grenadines:VC|Samoa:WS|San Marino:SM|Saudi Arabia:SA|Senegal:SN|Serbia:RS|Seychelles:SC|Sierra Leone:SL|Singapore:SG|Slovakia:SK|Slovenia:SI|Solomon Islands:SB|Somalia:SO|South Africa:ZA|South Korea:KR|Korea:KR|Korea, Republic of:KR|South Sudan:SS|Spain:ES|Sri Lanka:LK|Sudan:SD|Suriname:SR|Sweden:SE|Switzerland:CH|Syria:SY|
Taiwan:TW|Tajikistan:TJ|Tanzania:TZ|Thailand:TH|Timor-Leste:TL|Togo:TG|Tonga:TO|Trinidad & Tobago:TT|Trinidad and Tobago:TT|Tunisia:TN|Turkey:TR|Turkiye:TR|Türkiye:TR|Turkmenistan:TM|
Uganda:UG|Ukraine:UA|United Arab Emirates:AE|UAE:AE|United Kingdom:GB|UK:GB|Great Britain:GB|England:GB|Scotland:GB|United States:US|United States of America:US|USA:US|Uruguay:UY|Uzbekistan:UZ|
Vanuatu:VU|Vatican City:VA|Venezuela:VE|Vietnam:VN|Viet Nam:VN|Virgin Islands:VI|
Yemen:YE|Zambia:ZM|Zimbabwe:ZW
`;

const CODES: Record<string, string> = {};
RAW.split("|").forEach((pair) => {
  const [name, code] = pair.trim().split(":");
  if (name && code) CODES[name.toLowerCase()] = code;
});

/** Resolve a supplier country label to an ISO alpha-2 code. */
export function countryCode(country: string): string | undefined {
  const key = country.trim().toLowerCase();
  if (!key) return undefined;
  if (CODES[key]) return CODES[key];
  if (/^[a-z]{2}$/.test(key)) return key.toUpperCase();
  // Late fallback for anything not in the table (runtime dependent).
  try {
    const dn = new Intl.DisplayNames(["en"], { type: "region" });
    const A = "A".charCodeAt(0);
    for (let i = 0; i < 26; i += 1) {
      for (let j = 0; j < 26; j += 1) {
        const code = String.fromCharCode(A + i) + String.fromCharCode(A + j);
        const name = dn.of(code);
        if (name && name.toLowerCase() === key) {
          CODES[key] = code;
          return code;
        }
      }
    }
  } catch {
    /* Intl.DisplayNames unavailable */
  }
  return undefined;
}

/** Emoji flag fallback when the CDN image can't load. */
export function flagEmoji(code: string): string {
  return code
    .toUpperCase()
    .replace(/[^A-Z]/g, "")
    .split("")
    .map((char) => String.fromCodePoint(0x1f1e6 + char.charCodeAt(0) - 65))
    .join("");
}

/** Preferred display name per ISO code (first spelling from the table wins). */
const NAMES: Record<string, string> = {};
RAW.split("|").forEach((pair) => {
  const [name, code] = pair.trim().split(":");
  if (name && code && !NAMES[code]) NAMES[code] = name.trim();
});

/**
 * Full country name for a supplier value. Accepts an ISO alpha-2 code ("NL")
 * or an already-spelled name; returns the canonical full name when known.
 */
export function countryName(value: string): string {
  const raw = value.trim();
  if (!raw) return raw;
  const code = countryCode(raw);
  if (code && NAMES[code]) return NAMES[code];
  return raw;
}
