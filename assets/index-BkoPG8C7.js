(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const i of document.querySelectorAll('link[rel="modulepreload"]'))o(i);new MutationObserver(i=>{for(const a of i)if(a.type==="childList")for(const n of a.addedNodes)n.tagName==="LINK"&&n.rel==="modulepreload"&&o(n)}).observe(document,{childList:!0,subtree:!0});function l(i){const a={};return i.integrity&&(a.integrity=i.integrity),i.referrerPolicy&&(a.referrerPolicy=i.referrerPolicy),i.crossOrigin==="use-credentials"?a.credentials="include":i.crossOrigin==="anonymous"?a.credentials="omit":a.credentials="same-origin",a}function o(i){if(i.ep)return;i.ep=!0;const a=l(i);fetch(i.href,a)}})();function w(e){const t=localStorage.getItem(e);return t?JSON.parse(t):null}function h(e,t){localStorage.setItem(e,JSON.stringify(t))}function U(){const e=w("locations");if(e)return e;const t=[{id:1,name:"Lido",city:"Berlin",website:"lido-berlin.de",capacity:400},{id:2,name:"SO36",city:"Berlin",website:"so36.com",capacity:600},{id:3,name:"Festsaal Kreuzberg",city:"Berlin",website:"festsaal-kreuzberg.de",capacity:1200},{id:4,name:"Privatclub",city:"Berlin",website:"privatclub-berlin.de",capacity:250},{id:5,name:"Astra Kulturhaus",city:"Berlin",website:"astra-berlin.de",capacity:1800},{id:6,name:"Frannz Club",city:"Berlin",website:"frannz.eu",capacity:350},{id:7,name:"Monarch",city:"Berlin",website:"kottimonarch.de",capacity:150},{id:8,name:"Musik & Frieden",city:"Berlin",website:"musikundfrieden.de",capacity:700},{id:9,name:"Wild at Heart",city:"Berlin",website:"wildatheartberlin.de",capacity:280},{id:10,name:"Columbia Theater",city:"Berlin",website:"columbia-theater.de",capacity:800},{id:11,name:"Schokoladen",city:"Berlin",website:"schokoladen-mitte.de",capacity:150},{id:12,name:"Madame Claude",city:"Berlin",website:"madameclaude.de",capacity:100},{id:13,name:"Conne Island",city:"Leipzig",website:"conne-island.de",capacity:600},{id:14,name:"Werk 2",city:"Leipzig",website:"werk-2.de",capacity:500},{id:15,name:"Täubchenthal",city:"Leipzig",website:"taeubchenthal.com",capacity:1200},{id:16,name:"Felsenkeller",city:"Leipzig",website:"felsenkeller-leipzig.com",capacity:2e3},{id:17,name:"UT Connewitz",city:"Leipzig",website:"utconnewitz.de",capacity:350},{id:18,name:"Moritzbastei",city:"Leipzig",website:"moritzbastei.de",capacity:500},{id:19,name:"Horns Erben",city:"Leipzig",website:"horns-erben.de",capacity:150},{id:20,name:"Ilses Erika",city:"Leipzig",website:"",capacity:200},{id:21,name:"Urban Spree",city:"Berlin",website:"urbanspree.com",capacity:250},{id:22,name:"Gretchen",city:"Berlin",website:"gretchen-club.de",capacity:500},{id:23,name:"Supamolly",city:"Berlin",website:"supamolly.de",capacity:150},{id:24,name:"Kantine am Berghain",city:"Berlin",website:"berghain.berlin",capacity:200},{id:25,name:"Tempodrom",city:"Berlin",website:"tempodrom.de",capacity:4200}];return h("locations",t),t}async function q(){try{const e=await fetch("./events.json");if(e.ok){const t=await e.json(),l=w("manual_events")||[];return[...t,...l]}}catch{console.log("events.json nicht gefunden")}return w("manual_events")||[]}let f=U(),g=[],T=null,s={cities:["Berlin","Leipzig"],type:"alle",locationId:"alle",dates:[]},y=w("bookmarked")||[],v=w("going")||[],S=w("seenEvents")||[],x="liste",I=0;async function M(e){T=e,g=await q(),r()}function A(e){return!S.includes(e.id)}function C(){S=g.map(e=>e.id),h("seenEvents",S)}function r(){const e=g.filter(t=>A(t)).length;T.innerHTML=`
    <div class="min-h-screen" style="background: linear-gradient(135deg, #0a0e1a 0%, #0d1530 50%, #0a1628 100%);">
      <div class="max-w-2xl mx-auto px-4 pb-24">
        ${F(e)}
        ${K()}
        ${x==="liste"?R():""}
        ${x==="kalender"?P():""}
        ${x==="gemerkt"?H():""}
      </div>
    </div>
    ${W()}
    ${G()}
  `,X(),e>0&&x==="liste"&&setTimeout(()=>C(),3e3)}function F(e){return`
    <div class="py-8">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-3xl font-bold text-white tracking-tight">
            <span style="background: linear-gradient(90deg, #818cf8, #c084fc, #f472b6); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">Konzert & Club</span>
          </h1>
          <p class="text-slate-400 text-sm mt-1 tracking-wide uppercase">Berlin · Leipzig</p>
        </div>
        ${e>0?`
          <div class="flex flex-col items-end">
            <span class="text-xs font-bold px-3 py-1.5 rounded-full text-white" style="background: linear-gradient(90deg, #818cf8, #f472b6);">
              ${e} neue Events
            </span>
          </div>
        `:""}
      </div>
    </div>
  `}function K(){return`
    <div class="flex gap-2 mb-6 p-1 rounded-2xl" style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08);">
      ${[{id:"liste",icon:"◈",label:"Events"},{id:"kalender",icon:"◷",label:"Kalender"},{id:"gemerkt",icon:"◆",label:`Gemerkt${y.length>0?" · "+y.length:""}`}].map(t=>`
        <button data-nav="${t.id}" class="flex-1 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${x===t.id?"text-white shadow-lg":"text-slate-400 hover:text-slate-200"}" ${x===t.id?'style="background: linear-gradient(135deg, #3730a3, #7c3aed);"':""}>
          ${t.icon} ${t.label}
        </button>
      `).join("")}
    </div>
  `}function B(){const e=f.filter(t=>s.cities.includes(t.city)).sort((t,l)=>t.name.localeCompare(l.name));return`
    <div class="rounded-2xl p-4 mb-5 space-y-3" style="background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08);">
      <!-- Städte -->
      <div class="flex gap-2">
        ${["Berlin","Leipzig"].map(t=>`
          <button data-city="${t}" class="flex-1 py-2 rounded-xl text-sm font-semibold tracking-wide transition-all duration-200 ${s.cities.includes(t)?"text-white":"text-slate-500 hover:text-slate-300"}" ${s.cities.includes(t)?'style="background: linear-gradient(135deg, #1e3a5f, #1e40af);"':'style="background: rgba(255,255,255,0.04);"'}>
            ${t==="Berlin"?"🏙":"🏛"} ${t}
          </button>
        `).join("")}
      </div>

      <!-- Typ -->
      <div class="flex gap-2">
        ${[{val:"alle",icon:"✦",label:"Alle"},{val:"konzert",icon:"🎸",label:"Konzerte"},{val:"party",icon:"🎉",label:"Partys"}].map(t=>`
          <button data-type="${t.val}" class="flex-1 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${s.type===t.val?"text-white":"text-slate-500 hover:text-slate-300"}" ${s.type===t.val?'style="background: linear-gradient(135deg, #3730a3, #6d28d9);"':'style="background: rgba(255,255,255,0.04);"'}>
            ${t.icon} ${t.label}
          </button>
        `).join("")}
      </div>

      <!-- Location -->
      <select data-location-filter class="w-full rounded-xl px-3 py-2.5 text-sm text-slate-300 appearance-none" style="background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1);">
        <option value="alle">📍 Alle Locations</option>
        ${e.map(t=>`<option value="${t.id}" ${s.locationId==t.id?"selected":""}>${t.name} (${t.city})</option>`).join("")}
      </select>
    </div>
  `}function N(){return g.filter(e=>{const t=f.find(l=>l.id===e.locationId);return!(!t||!s.cities.includes(t.city)||s.type!=="alle"&&e.type!==s.type||s.locationId!=="alle"&&e.locationId!=s.locationId)}).sort((e,t)=>new Date(e.date+"T"+e.time)-new Date(t.date+"T"+t.time))}function R(){const e=N(),t=new Date;t.setHours(0,0,0,0);const l={};return e.forEach(o=>{const i=new Date(o.date+"T12:00:00"),a=Math.floor((i-t)/864e5);let n;a===0?n="— Heute —":a===1?n="— Morgen —":a<=7?n="— Diese Woche —":a<=14?n="— Nächste Woche —":n="— "+i.toLocaleDateString("de-DE",{month:"long",year:"numeric"})+" —",l[n]||(l[n]=[]),l[n].push(o)}),Object.keys(l).length===0?`
      ${B()}
      <div class="text-center py-16 text-slate-500">
        <div class="text-4xl mb-3">🎵</div>
        <p>Keine Events gefunden.</p>
      </div>
    `:`
    ${B()}
    <div class="space-y-6">
      ${Object.entries(l).map(([o,i])=>`
        <div>
          <div class="text-xs font-bold tracking-widest uppercase text-slate-500 text-center mb-3">${o}</div>
          <div class="space-y-3">
            ${i.map(a=>D(a)).join("")}
          </div>
        </div>
      `).join("")}
    </div>
  `}function D(e){const t=f.find(c=>c.id===e.locationId),l=y.includes(e.id),o=v.includes(e.id),i=A(e),n=new Date(e.date+"T12:00:00").toLocaleDateString("de-DE",{weekday:"short",day:"numeric",month:"short"}),d=e.type==="konzert";return`
    <div class="rounded-2xl overflow-hidden transition-all duration-200" style="background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,${o?"0.2":"0.07"});">
      <!-- Farbiger Streifen oben -->
      <div class="h-0.5 w-full" style="background: linear-gradient(90deg, ${d?"#3730a3, #818cf8":"#7c2d12, #f97316"});"></div>

      <div class="p-4">
        <div class="flex justify-between items-start gap-3">
          <div class="flex-1 min-w-0">
            <!-- Badge + Neu -->
            <div class="flex items-center gap-2 mb-1.5 flex-wrap">
              <span class="text-xs font-semibold px-2 py-0.5 rounded-full ${d?"text-indigo-300":"text-orange-300"}" style="background: ${d?"rgba(99,102,241,0.15)":"rgba(249,115,22,0.15)"};">
                ${d?"🎸 Konzert":"🎉 Party"}
              </span>
              ${i?'<span class="text-xs font-bold text-pink-400 animate-pulse">● NEU</span>':""}
              ${o?'<span class="text-xs font-bold text-emerald-400">✓ Ich gehe hin</span>':""}
            </div>

            <!-- Titel -->
            <h3 class="font-bold text-white text-base leading-tight truncate">${e.title}</h3>

            <!-- Location & Stadt -->
            <p class="text-slate-400 text-sm mt-0.5">${t?t.name+' <span class="text-slate-600">·</span> '+t.city:""}</p>

            <!-- Datum -->
            <p class="text-sm font-semibold mt-1" style="color: #818cf8;">${n} · ${e.time} Uhr</p>
          </div>

          <!-- Aktions-Icons -->
          <div class="flex flex-col gap-2 items-center">
            <button data-bookmark="${e.id}" title="Vormerken" class="text-xl transition-all duration-200 hover:scale-110 ${l?"opacity-100":"opacity-25 hover:opacity-60"}">🔖</button>
            <button data-going="${e.id}" title="Ich gehe hin" class="text-xl transition-all duration-200 hover:scale-110 ${o?"opacity-100":"opacity-25 hover:opacity-60"}">✅</button>
          </div>
        </div>

        ${e.description?`<p class="text-slate-500 text-sm mt-2 leading-relaxed">${e.description}</p>`:""}
        ${e.spotifyUrl?V(e.spotifyUrl):""}

        <!-- Buttons -->
        <div class="flex gap-2 mt-3 flex-wrap">
          ${e.ticketUrl?`
            <a href="${e.ticketUrl}" target="_blank" class="text-xs font-medium px-3 py-1.5 rounded-lg text-slate-300 transition-all hover:text-white" style="background: rgba(255,255,255,0.07); border: 1px solid rgba(255,255,255,0.1);">
              🎟 Tickets
            </a>
          `:""}
          <button data-share="${e.id}" class="text-xs font-medium px-3 py-1.5 rounded-lg text-slate-300 transition-all hover:text-white" style="background: rgba(255,255,255,0.07); border: 1px solid rgba(255,255,255,0.1);">
            📤 Teilen
          </button>
          ${l?`
            <button data-ics="${e.id}" class="text-xs font-medium px-3 py-1.5 rounded-lg text-slate-300 transition-all hover:text-white" style="background: rgba(255,255,255,0.07); border: 1px solid rgba(255,255,255,0.1);">
              📅 Kalender
            </button>
          `:""}
        </div>
      </div>
    </div>
  `}function V(e){const l=e.split("/").pop().split("?")[0];return`
    <div class="mt-3 rounded-xl overflow-hidden">
      <iframe src="https://open.spotify.com/embed/${e.includes("/track/")?"track":e.includes("/album/")?"album":"artist"}/${l}"
        width="100%" height="80" frameborder="0"
        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture">
      </iframe>
    </div>
  `}function P(){const e=new Date,t=new Date(e.getFullYear(),e.getMonth()+I,1),l=t.getFullYear(),o=t.getMonth(),i=new Date(l,o+1,0).getDate(),a=(new Date(l,o,1).getDay()+6)%7,n=t.toLocaleDateString("de-DE",{month:"long",year:"numeric"}),d=N(),c=d.map(m=>m.date),b=d.filter(m=>s.dates.length===0?!0:s.dates.includes(m.date));return`
    ${B()}
    <div class="rounded-2xl p-4 mb-5" style="background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08);">

      <!-- Monats-Navigation -->
      <div class="flex items-center justify-between mb-4">
        <button data-cal-prev class="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-white transition-all" style="background: rgba(255,255,255,0.06);">‹</button>
        <h2 class="font-bold text-white tracking-wide">${n}</h2>
        <button data-cal-next class="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-white transition-all" style="background: rgba(255,255,255,0.06);">›</button>
      </div>

      <!-- Wochentage -->
      <div class="grid grid-cols-7 gap-1 text-center text-xs font-semibold tracking-wide mb-2" style="color: rgba(255,255,255,0.25);">
        ${["Mo","Di","Mi","Do","Fr","Sa","So"].map(m=>`<div>${m}</div>`).join("")}
      </div>

      <!-- Tage -->
      <div class="grid grid-cols-7 gap-1">
        ${Array(a).fill("<div></div>").join("")}
        ${Array.from({length:i},(m,j)=>{const L=j+1,$=`${l}-${String(o+1).padStart(2,"0")}-${String(L).padStart(2,"0")}`,k=c.includes($),E=s.dates.includes($),z=L===e.getDate()&&o===e.getMonth()&&l===e.getFullYear(),O=new Date($)<e&&!z;return`
            <button data-date="${$}" class="
              aspect-square rounded-xl text-sm font-medium flex items-center justify-center relative transition-all duration-150
              ${O?"opacity-30":""}
              ${!k&&!E?"text-slate-600 cursor-default":""}
              ${k&&!E?"text-white hover:opacity-80":""}
            " style="${E?"background: linear-gradient(135deg, #4f46e5, #7c3aed); color: white;":k?"background: rgba(99,102,241,0.2); border: 1px solid rgba(99,102,241,0.4);":z?"border: 1px solid rgba(99,102,241,0.5);":""}">
              ${L}
              ${k&&!E?'<span class="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full" style="background: #818cf8;"></span>':""}
            </button>
          `}).join("")}
      </div>

      ${s.dates.length>0?`
        <button data-clear-dates class="mt-4 w-full text-xs text-slate-400 hover:text-white py-2 rounded-xl transition-all" style="background: rgba(255,255,255,0.04);">
          ✕ Auswahl zurücksetzen (${s.dates.length} ${s.dates.length===1?"Tag":"Tage"} gewählt)
        </button>
      `:'<p class="text-center text-xs mt-3" style="color: rgba(255,255,255,0.2);">Tippe auf markierte Tage zum Filtern · Mehrfachauswahl möglich</p>'}
    </div>

    <!-- Events zur Auswahl -->
    <div class="space-y-3">
      ${s.dates.length>0&&b.length===0?'<p class="text-center text-slate-500 py-6">Keine Events an den gewählten Tagen.</p>':b.map(m=>D(m)).join("")}
    </div>
  `}function H(){const e=g.filter(o=>y.includes(o.id)),t=g.filter(o=>v.includes(o.id)),l=(o,i,a)=>`
    <div>
      <h2 class="text-sm font-bold tracking-widest uppercase mb-3" style="color: rgba(255,255,255,0.4);">${o}</h2>
      ${i.length===0?`<p class="text-slate-600 text-sm py-4 text-center">${a}</p>`:`<div class="space-y-3">${i.map(n=>D(n)).join("")}</div>`}
    </div>
  `;return`
    <div class="space-y-8">
      ${l("✓ Ich gehe hin · "+t.length,t,"Noch keine Events markiert.")}
      ${l("◆ Vorgemerkt · "+e.length,e,"Noch keine Events vorgemerkt.")}
    </div>
  `}function W(){return`
    <button data-open-add class="fixed bottom-6 right-6 w-14 h-14 text-white rounded-2xl text-2xl shadow-2xl flex items-center justify-center z-50 transition-all hover:scale-105 active:scale-95" style="background: linear-gradient(135deg, #4f46e5, #7c3aed);">
      +
    </button>
  `}function G(){return`
    <div id="modal-add" class="hidden fixed inset-0 z-50 overflow-y-auto" style="background: rgba(0,0,0,0.85);">
      <div class="max-w-lg mx-auto mt-8 mb-12 rounded-3xl mx-4 overflow-hidden" style="background: #0d1530; border: 1px solid rgba(255,255,255,0.1);">
        <!-- Modal-Header -->
        <div class="px-6 py-5" style="background: linear-gradient(135deg, rgba(79,70,229,0.3), rgba(124,58,237,0.3)); border-bottom: 1px solid rgba(255,255,255,0.08);">
          <h2 class="text-xl font-bold text-white">Hinzufügen</h2>
          <p class="text-slate-400 text-sm mt-0.5">Event oder Location eintragen</p>
        </div>

        <div class="p-6">
          <!-- Tabs -->
          <div class="flex gap-2 mb-5 p-1 rounded-xl" style="background: rgba(255,255,255,0.05);">
            <button data-add-tab="event" id="tab-event" class="flex-1 py-2 rounded-lg text-sm font-semibold text-white" style="background: linear-gradient(135deg, #4f46e5, #7c3aed);">🎸 Event</button>
            <button data-add-tab="location" id="tab-location" class="flex-1 py-2 rounded-lg text-sm font-semibold text-slate-400">📍 Location</button>
          </div>

          <div id="add-event-form">${_()}</div>
          <div id="add-location-form" class="hidden">${Y()}</div>

          <button data-close-add class="mt-4 w-full py-2 text-slate-500 hover:text-slate-300 text-sm transition-colors">Abbrechen</button>
        </div>
      </div>
    </div>
  `}const u="w-full rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:ring-2 focus:ring-indigo-500",p="background: rgba(255,255,255,0.07); border: 1px solid rgba(255,255,255,0.1);";function _(){return`
    <div class="space-y-3">
      <input id="new-title" type="text" placeholder="Titel (z.B. Bandname – Releaseshow)" class="${u}" style="${p}" />
      <div class="flex gap-2">
        <select id="new-type" class="${u} flex-1" style="${p}">
          <option value="konzert">🎸 Konzert</option>
          <option value="party">🎉 Party</option>
        </select>
      </div>
      <div class="flex gap-2">
        <input id="new-date" type="date" class="${u} flex-1" style="${p}" />
        <input id="new-time" type="time" class="${u} flex-1" style="${p}" />
      </div>
      <select id="new-location" class="${u}" style="${p}">
        <option value="">Location wählen...</option>
        ${f.sort((e,t)=>e.name.localeCompare(t.name)).map(e=>`<option value="${e.id}">${e.name} (${e.city})</option>`).join("")}
      </select>
      <textarea id="new-desc" placeholder="Beschreibung (optional)" class="${u} h-20 resize-none" style="${p}"></textarea>
      <input id="new-ticket" type="url" placeholder="Ticket-URL (optional)" class="${u}" style="${p}" />
      <input id="new-spotify" type="url" placeholder="Spotify-Link (optional)" class="${u}" style="${p}" />
      <button data-save-event class="w-full py-3 rounded-xl font-bold text-white text-sm transition-all hover:opacity-90 active:scale-98" style="background: linear-gradient(135deg, #4f46e5, #7c3aed);">
        Event speichern
      </button>
    </div>
  `}function Y(){return`
    <div class="space-y-3">
      <input id="new-loc-name" type="text" placeholder="Name der Location" class="${u}" style="${p}" />
      <select id="new-loc-city" class="${u}" style="${p}">
        <option value="Berlin">🏙 Berlin</option>
        <option value="Leipzig">🏛 Leipzig</option>
      </select>
      <input id="new-loc-website" type="url" placeholder="Website (optional)" class="${u}" style="${p}" />
      <input id="new-loc-capacity" type="number" placeholder="Kapazität (optional)" class="${u}" style="${p}" />
      <button data-save-location class="w-full py-3 rounded-xl font-bold text-white text-sm transition-all hover:opacity-90" style="background: linear-gradient(135deg, #4f46e5, #7c3aed);">
        Location speichern
      </button>
    </div>
  `}function J(e){const t=f.find(m=>m.id===e.locationId),[l,o]=e.time.split(":").map(Number),i=e.date.replace(/-/g,"")+"T"+String(l).padStart(2,"0")+String(o).padStart(2,"0")+"00",a=e.date.replace(/-/g,"")+"T"+String(l+2).padStart(2,"0")+String(o).padStart(2,"0")+"00",n=["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//KonzertApp//DE","BEGIN:VEVENT","UID:"+e.id+"@konzertapp","SUMMARY:"+e.title,"DTSTART:"+i,"DTEND:"+a,"LOCATION:"+(t?t.name:""),"DESCRIPTION:"+(e.description||""),"END:VEVENT","END:VCALENDAR"].join(`\r
`),d=new Blob([n],{type:"text/calendar;charset=utf-8"}),c=URL.createObjectURL(d),b=document.createElement("a");b.href=c,b.download=e.title.replace(/\s+/g,"-")+".ics",b.click(),setTimeout(()=>URL.revokeObjectURL(c),1e3)}function Q(e){const t=f.find(i=>i.id===e.locationId),l=new Date(e.date+"T12:00:00").toLocaleDateString("de-DE",{weekday:"long",day:"numeric",month:"long",year:"numeric"}),o=`${e.type==="konzert"?"🎸":"🎉"} *${e.title}*
📍 ${t?t.name+", "+t.city:""}
📅 ${l} · ${e.time} Uhr${e.description?`

`+e.description:""}${e.ticketUrl?`

🎟 Tickets: `+e.ticketUrl:""}`;window.open("https://wa.me/?text="+encodeURIComponent(o),"_blank")}function X(){document.querySelectorAll("[data-nav]").forEach(a=>{a.addEventListener("click",()=>{x=a.dataset.nav,r()})}),document.querySelectorAll("[data-city]").forEach(a=>{a.addEventListener("click",()=>{const n=a.dataset.city;s.cities.includes(n)?s.cities.length>1&&(s.cities=s.cities.filter(d=>d!==n)):s.cities.push(n),r()})}),document.querySelectorAll("[data-type]").forEach(a=>{a.addEventListener("click",()=>{s.type=a.dataset.type,r()})});const e=document.querySelector("[data-location-filter]");e&&e.addEventListener("change",()=>{s.locationId=e.value,r()});const t=document.querySelector("[data-cal-prev]"),l=document.querySelector("[data-cal-next]");t&&t.addEventListener("click",()=>{I--,r()}),l&&l.addEventListener("click",()=>{I++,r()}),document.querySelectorAll("[data-date]").forEach(a=>{a.addEventListener("click",()=>{const n=a.dataset.date;s.dates.includes(n)?s.dates=s.dates.filter(d=>d!==n):s.dates.push(n),r()})});const o=document.querySelector("[data-clear-dates]");o&&o.addEventListener("click",()=>{s.dates=[],r()}),document.querySelectorAll("[data-bookmark]").forEach(a=>{a.addEventListener("click",()=>{const n=parseInt(a.dataset.bookmark);y=y.includes(n)?y.filter(d=>d!==n):[...y,n],h("bookmarked",y),r()})}),document.querySelectorAll("[data-going]").forEach(a=>{a.addEventListener("click",()=>{const n=parseInt(a.dataset.going);v=v.includes(n)?v.filter(d=>d!==n):[...v,n],h("going",v),r()})}),document.querySelectorAll("[data-share]").forEach(a=>{a.addEventListener("click",()=>{const n=g.find(d=>d.id===parseInt(a.dataset.share));n&&Q(n)})}),document.querySelectorAll("[data-ics]").forEach(a=>{a.addEventListener("click",()=>{const n=g.find(d=>d.id===parseInt(a.dataset.ics));n&&J(n)})});const i=document.getElementById("modal-add");document.querySelector("[data-open-add]")?.addEventListener("click",()=>i.classList.remove("hidden")),document.querySelector("[data-close-add]")?.addEventListener("click",()=>i.classList.add("hidden")),document.querySelectorAll("[data-add-tab]").forEach(a=>{a.addEventListener("click",()=>{const n=a.dataset.addTab;document.getElementById("add-event-form").classList.toggle("hidden",n!=="event"),document.getElementById("add-location-form").classList.toggle("hidden",n!=="location"),document.querySelectorAll("[data-add-tab]").forEach(d=>{const c=d.dataset.addTab===n;d.className=`flex-1 py-2 rounded-lg text-sm font-semibold ${c?"text-white":"text-slate-400"}`,d.style.background=c?"linear-gradient(135deg, #4f46e5, #7c3aed)":"transparent"})})}),document.querySelector("[data-save-event]")?.addEventListener("click",()=>{const a=document.getElementById("new-title").value.trim(),n=document.getElementById("new-date").value,d=document.getElementById("new-time").value,c=parseInt(document.getElementById("new-location").value);if(!a||!n||!d||!c){alert("Bitte Titel, Datum, Uhrzeit und Location angeben.");return}const b={id:Date.now(),title:a,type:document.getElementById("new-type").value,date:n,time:d,locationId:c,description:document.getElementById("new-desc").value.trim(),ticketUrl:document.getElementById("new-ticket").value.trim(),spotifyUrl:document.getElementById("new-spotify").value.trim(),isNew:!0,savedAt:new Date().toISOString()};g.push(b),h("events",g),i.classList.add("hidden"),r()}),document.querySelector("[data-save-location]")?.addEventListener("click",()=>{const a=document.getElementById("new-loc-name").value.trim();if(!a){alert("Bitte einen Namen eingeben.");return}const n={id:Date.now(),name:a,city:document.getElementById("new-loc-city").value,website:document.getElementById("new-loc-website").value.trim(),capacity:parseInt(document.getElementById("new-loc-capacity").value)||0};f.push(n),h("locations",f),i.classList.add("hidden"),r()})}const Z=document.getElementById("app");M(Z);
