const SLUG='mobile-sprite-pack'; const TOKEN_KEY=`sb_license:${SLUG}`; const VERDICT_KEY=`sb_license_verdict:${SLUG}`;
const API='https://api.sociobot.in/api/v1';
type Verdict={ valid:boolean; checkedAt:number; reason?:string };

export function captureLicenseFromUrl(){ const url=new URL(location.href); const token=url.searchParams.get('license'); if(token){localStorage.setItem(TOKEN_KEY,token);url.searchParams.delete('license');history.replaceState({},'',url.pathname+url.search+url.hash);} return token; }
export function isProCached(){ const verdict=JSON.parse(localStorage.getItem(VERDICT_KEY) || 'null') as Verdict|null; return Boolean(localStorage.getItem(TOKEN_KEY) && verdict?.valid); }
export async function verifyLicense(force=false):Promise<Verdict>{
  const token=localStorage.getItem(TOKEN_KEY); if(!token)return{valid:false,checkedAt:Date.now(),reason:'missing'};
  const cached=JSON.parse(localStorage.getItem(VERDICT_KEY)||'null') as Verdict|null;
  if(!force && cached && Date.now()-cached.checkedAt<86_400_000)return cached;
  try{const response=await fetch(`${API}/products/${SLUG}/verify?license=${encodeURIComponent(token)}`);if(!response.ok)throw new Error('verify unavailable');const data=await response.json() as {valid:boolean;reason?:string};const verdict={valid:data.valid,reason:data.reason,checkedAt:Date.now()};localStorage.setItem(VERDICT_KEY,JSON.stringify(verdict));return verdict;}catch{return cached ?? {valid:false,reason:'offline',checkedAt:0};}
}
export function storeLicense(token:string){localStorage.setItem(TOKEN_KEY,token.trim());localStorage.removeItem(VERDICT_KEY);}
