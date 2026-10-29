'use strict';
const form=document.getElementById('orderForm'),save=document.getElementById('saveOrder'),statusBox=document.getElementById('status');
let widget,submissionToken;
function token(){return [...crypto.getRandomValues(new Uint8Array(32))].map(n=>n.toString(16).padStart(2,'0')).join('');}
function link(label,href){const a=document.createElement('a');a.textContent=label;a.href=href;return a;}
// Capture prevents the original WhatsApp-only handler from submitting separately.
form.addEventListener('submit',async event=>{
 event.preventDefault();event.stopImmediatePropagation();
 if(!form.reportValidity())return;
 const details={name:form.elements.name.value.trim(),phone:form.elements.whatsapp.value.trim().replace(/[\s()-]/g,''),location:form.elements.location.value.trim(),polish:form.elements.polish.value,bagSize:Number(form.elements.bagSize.value),quantity:Number(form.elements.quantity.value),destination:form.elements.destination.value};
 submissionToken ||= token();
 save.disabled=true;statusBox.textContent='Saving your order…';
 try{
  const response=await fetch('/api/orders',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...details,token:submissionToken,challenge:window.turnstile?.getResponse(widget)||''})});
  const result=await response.json();if(!response.ok)throw Error(result.error);
  const tracking=new URL('track.html',location.href);tracking.hash=submissionToken;
  statusBox.replaceChildren(document.createTextNode(`Order ${result.reference} saved — awaiting confirmation. Keep your tracking link private. `),link('Track my order',tracking.href),document.createElement('br'));
  const message=`GRAINORA order enquiry ${result.reference}\nName: ${details.name}\nCustomer WhatsApp: ${details.phone}\nRice: ${details.polish}\nQuantity: ${details.quantity} × ${details.bagSize} kg (${details.quantity*details.bagSize} kg total)\nDestination: ${details.destination}\nDelivery area: ${details.location}\nPlease confirm price and delivery.\nPrivate tracking link: ${tracking.href}`;
  statusBox.append(link('Send order to RAM on WhatsApp',`https://wa.me/919160871927?text=${encodeURIComponent(message)}`));
  save.textContent='Order saved';
 }catch(error){statusBox.textContent=error.message||'Could not save. Please retry.';save.disabled=false;window.turnstile?.reset(widget);}
},true);
fetch('/api/config').then(r=>r.json()).then(config=>{
 if(!config.siteKey)throw Error('Online ordering is not configured yet. Please use the Ask RAM on WhatsApp link.');
 const script=document.createElement('script');script.src='https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
 script.onload=()=>{widget=window.turnstile.render('#securityCheck',{sitekey:config.siteKey,action:'order'});save.disabled=false;};
 script.onerror=()=>{statusBox.textContent='Security check could not load. Please contact RAM.';};document.head.append(script);
}).catch(error=>{statusBox.textContent=error.message;});
