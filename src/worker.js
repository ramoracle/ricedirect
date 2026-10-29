export const statuses = ['Awaiting confirmation','Confirmed','Packed','Dispatched','Delivered','Cancelled'];
export const payments = ['Pending','Paid','Refunded'];
const encoder = new TextEncoder();
export async function hash(value) {return [...new Uint8Array(await crypto.subtle.digest('SHA-256',encoder.encode(value)))].map(x=>x.toString(16).padStart(2,'0')).join('');}
export function validate(b) {
 const clean=(v,n)=>typeof v==='string'&&v.trim().length>0&&v.trim().length<=n;
 return clean(b.name,100)&&clean(b.location,250)&&/^\+?[1-9]\d{7,14}$/.test(b.phone||'')&&
 ['Polished (Fine Grain)','Unpolished (Raw/High Fiber)'].includes(b.polish)&&[10,25].includes(b.bagSize)&&
 Number.isInteger(b.quantity)&&b.quantity>=1&&b.quantity<=4&&['Within India','Outside India'].includes(b.destination)&&/^[a-f0-9]{64}$/.test(b.token||'');
}
function json(data,status=200){return Response.json(data,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'}});}
export function reference(id){return 'GR-'+String(id).padStart(6,'0');}
async function admin(request,env){
 if(!env.ADMIN_KEY||env.ADMIN_KEY.length<43)return false;
 const supplied=request.headers.get('Authorization')||'';
 return await hash(supplied)===await hash('Bearer '+env.ADMIN_KEY);
}
export default {async fetch(request,env){
 const url=new URL(request.url),path=url.pathname;
 if(!path.startsWith('/api/'))return env.ASSETS.fetch(request);
 try {
 if(path==='/api/config'&&request.method==='GET')return json({siteKey:env.TURNSTILE_SITE_KEY||''});
 if(!env.DB)return json({error:'Database is not configured.'},503);
 if(request.method==='POST'){
  if(request.headers.get('Origin')!==url.origin)return json({error:'Invalid request origin.'},403);
  if(!(request.headers.get('Content-Type')||'').startsWith('application/json'))return json({error:'JSON required.'},415);
 }
 if(path.startsWith('/api/admin')){
  if(!await admin(request,env))return json({error:'Not authorized.'},401);
  if(path==='/api/admin/orders'&&request.method==='GET'){
   const before=Number(url.searchParams.get('before')||Number.MAX_SAFE_INTEGER);
   if(!Number.isSafeInteger(before)||before<1)return json({error:'Invalid cursor.'},400);
   const {results}=await env.DB.prepare('SELECT id,name,phone,polish,bag_size,quantity,destination,location,status,payment,total_paise,courier,tracking_number,created_at,updated_at FROM orders WHERE id < ? ORDER BY id DESC LIMIT 50').bind(before).all();
   return json({orders:results.map(r=>({...r,reference:reference(r.id)}))});
  }
  if(path==='/api/admin/update'&&request.method==='POST'){
   const b=await body(request);
   if(!Number.isSafeInteger(b.id)||b.id<1||!statuses.includes(b.status)||!payments.includes(b.payment)||
      !(b.totalPaise===null||(Number.isSafeInteger(b.totalPaise)&&b.totalPaise>=0&&b.totalPaise<=100000000))||
      typeof b.courier!=='string'||b.courier.length>100||typeof b.trackingNumber!=='string'||b.trackingNumber.length>100)return json({error:'Invalid update.'},400);
   const r=await env.DB.prepare("UPDATE orders SET status=?,payment=?,total_paise=?,courier=?,tracking_number=?,updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id=?").bind(b.status,b.payment,b.totalPaise,b.courier.trim(),b.trackingNumber.trim(),b.id).run();
   return r.meta.changes?json({ok:true}):json({error:'Order not found.'},404);
  }
  return json({error:'Not found.'},404);
 }
 if(path==='/api/orders'&&request.method==='POST'){
  const b=await body(request);
  if(!validate(b))return json({error:'Check the order details.'},400);
  if(!env.TURNSTILE_SECRET||!env.TURNSTILE_SITE_KEY)return json({error:'Ordering is not yet configured. Please contact RAM on WhatsApp.'},503);
  const tokenHash=await hash(b.token);
  // Possession of the same secret submission token makes retries safe.
  const old=await env.DB.prepare('SELECT id FROM orders WHERE token_hash=?').bind(tokenHash).first();
  if(old)return json({reference:reference(old.id)});
  if(typeof b.challenge!=='string'||b.challenge.length>2048)return json({error:'Complete the security check.'},400);
  const check=await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify',{method:'POST',body:new URLSearchParams({secret:env.TURNSTILE_SECRET,response:b.challenge})}).then(r=>r.json());
  if(!check.success||check.hostname!==url.hostname||check.action!=='order')return json({error:'Security check expired or failed. Please try again.'},400);
  // Daily cap bounds storage growth on the free tier; admin review is required if reached.
  const count=await env.DB.prepare("SELECT COUNT(*) AS n FROM orders WHERE created_at >= strftime('%Y-%m-%dT00:00:00.000Z','now')").first();
  if(count.n>=200)return json({error:'Online order limit reached today. Please contact RAM.'},429);
  await env.DB.prepare('INSERT INTO orders(token_hash,name,phone,polish,bag_size,quantity,destination,location) VALUES(?,?,?,?,?,?,?,?) ON CONFLICT(token_hash) DO NOTHING').bind(tokenHash,b.name.trim(),b.phone,b.polish,b.bagSize,b.quantity,b.destination,b.location.trim()).run();
  const row=await env.DB.prepare('SELECT id FROM orders WHERE token_hash=?').bind(tokenHash).first();
  return json({reference:reference(row.id)},201);
 }
 if(path==='/api/track'&&request.method==='POST'){
  const b=await body(request);
  if(!/^[a-f0-9]{64}$/.test(b.token||''))return json({error:'Invalid tracking link.'},400);
  const r=await env.DB.prepare('SELECT id,polish,bag_size,quantity,status,payment,total_paise,courier,tracking_number,created_at,updated_at FROM orders WHERE token_hash=?').bind(await hash(b.token)).first();
  return r?json({...r,reference:reference(r.id)}):json({error:'Order not found.'},404);
 }
 return json({error:'Not found.'},404);
 }catch(error){return json({error:error.message==='Invalid body'?'Invalid request body.':'Service unavailable. Please retry or contact RAM.'},error.message==='Invalid body'?400:503);}
}};
async function body(request){const text=await request.text();if(encoder.encode(text).length>8192)throw Error('Invalid body');try{return JSON.parse(text);}catch{throw Error('Invalid body');}}
