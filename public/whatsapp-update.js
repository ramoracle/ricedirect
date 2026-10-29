export function whatsappUpdateUrl(o) {
 const phone=String(o.phone||'').trim().replace(/[\s()+-]/g,'');
 if(!/^[1-9]\d{7,14}$/.test(phone))throw Error('Customer phone must include a valid country code.');
 const message=['🌾 *GRAINORA — ORDER UPDATE*',`Hello ${o.name},`,`Order ID: ${o.reference}`,`Order status: ${o.status}`,`Rice: ${o.polish}`,`Quantity: ${o.quantity} × ${o.bag_size} kg (${o.quantity*o.bag_size} kg total)`,`Total including delivery: ${o.total_paise==null?'Awaiting quotation':`₹${(o.total_paise/100).toFixed(2)}`}`,`Payment status: ${o.payment}`,...(o.courier?[`Courier: ${o.courier}`]:[]),...(o.tracking_number?[`Courier tracking number: ${o.tracking_number}`]:[]),'','For questions, please reply to RAM here. Thank you for choosing GRAINORA!'].join('\n');
 return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}
