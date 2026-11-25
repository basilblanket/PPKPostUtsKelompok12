self.addEventListener('push',event=>{
  let data={};try{data=event.data.json();}catch{}
  event.waitUntil(self.registration.showNotification(data.title||'Ruang Praktikum',{body:data.body||'Ada informasi praktikum baru.',icon:'/favicon.ico'}));
});
self.addEventListener('notificationclick',event=>{event.notification.close();event.waitUntil(clients.matchAll({type:'window',includeUncontrolled:true}).then(windows=>{const w=windows.find(w=>new URL(w.url).origin===self.location.origin);return w?w.focus():clients.openWindow('/');}));});
