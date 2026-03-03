(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const s of document.querySelectorAll('link[rel="modulepreload"]'))l(s);new MutationObserver(s=>{for(const c of s)if(c.type==="childList")for(const p of c.addedNodes)p.tagName==="LINK"&&p.rel==="modulepreload"&&l(p)}).observe(document,{childList:!0,subtree:!0});function n(s){const c={};return s.integrity&&(c.integrity=s.integrity),s.referrerPolicy&&(c.referrerPolicy=s.referrerPolicy),s.crossOrigin==="use-credentials"?c.credentials="include":s.crossOrigin==="anonymous"?c.credentials="omit":c.credentials="same-origin",c}function l(s){if(s.ep)return;s.ep=!0;const c=n(s);fetch(s.href,c)}})();const A="https://cqxpjesovcavarrlljpn.supabase.co",E="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNxeHBqZXNvdmNhdmFycmxsanBuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI0NjI4MjYsImV4cCI6MjA4ODAzODgyNn0._paXbtV1uecR0AA08KUkKLfRkmkQw2k4W3hT5L2y2ho";async function _(){const e=await fetch(`${A}/rest/v1/manual_events?select=*&order=date.asc`,{headers:{apikey:E,Authorization:"Bearer "+E}});return e.ok?(await e.json()).map(n=>({id:n.id,title:n.title,type:n.type,date:n.date,time:n.time,locationId:n.location_id,locationName:n.location_name,locationCity:n.location_city,description:n.description,ticketUrl:n.ticket_url,spotifyUrl:n.spotify_url,source:"manual"})):[]}async function M(e,t,n){return(await fetch(`${A}/rest/v1/manual_events`,{method:"POST",headers:{apikey:E,Authorization:"Bearer "+E,"Content-Type":"application/json",Prefer:"return=minimal"},body:JSON.stringify({id:e.id,title:e.title,type:e.type,date:e.date,time:e.time,location_id:e.locationId,location_name:t,location_city:n,description:e.description,ticket_url:e.ticketUrl,spotify_url:e.spotifyUrl})})).ok}async function q(){const e=new Date().toISOString().split("T")[0];await fetch(`${A}/rest/v1/manual_events?date=lt.${e}`,{method:"DELETE",headers:{apikey:E,Authorization:"Bearer "+E}})}function I(e){const t=localStorage.getItem(e);return t?JSON.parse(t):null}function k(e,t){localStorage.setItem(e,JSON.stringify(t))}function U(){const e=I("locations");if(e)return e;const t=[{id:1,name:"Lido",city:"Berlin",website:"lido-berlin.de",capacity:400},{id:2,name:"SO36",city:"Berlin",website:"so36.com",capacity:600},{id:3,name:"Festsaal Kreuzberg",city:"Berlin",website:"festsaal-kreuzberg.de",capacity:1200},{id:4,name:"Privatclub",city:"Berlin",website:"privatclub-berlin.de",capacity:250},{id:5,name:"Astra Kulturhaus",city:"Berlin",website:"astra-berlin.de",capacity:1800},{id:6,name:"Frannz Club",city:"Berlin",website:"frannz.eu",capacity:350},{id:7,name:"Monarch",city:"Berlin",website:"kottimonarch.de",capacity:150},{id:8,name:"Musik & Frieden",city:"Berlin",website:"musikundfrieden.de",capacity:700},{id:9,name:"Wild at Heart",city:"Berlin",website:"wildatheartberlin.de",capacity:280},{id:10,name:"Columbia Theater",city:"Berlin",website:"columbia-theater.de",capacity:800},{id:11,name:"Schokoladen",city:"Berlin",website:"schokoladen-mitte.de",capacity:150},{id:12,name:"Madame Claude",city:"Berlin",website:"madameclaude.de",capacity:100},{id:13,name:"Conne Island",city:"Leipzig",website:"conne-island.de",capacity:600},{id:14,name:"Werk 2",city:"Leipzig",website:"werk-2.de",capacity:500},{id:15,name:"Täubchenthal",city:"Leipzig",website:"taeubchenthal.com",capacity:1200},{id:16,name:"Felsenkeller",city:"Leipzig",website:"felsenkeller-leipzig.com",capacity:2e3},{id:17,name:"UT Connewitz",city:"Leipzig",website:"utconnewitz.de",capacity:350},{id:18,name:"Moritzbastei",city:"Leipzig",website:"moritzbastei.de",capacity:500},{id:19,name:"Horns Erben",city:"Leipzig",website:"horns-erben.de",capacity:150},{id:20,name:"Ilses Erika",city:"Leipzig",website:"",capacity:200},{id:21,name:"Urban Spree",city:"Berlin",website:"urbanspree.com",capacity:250},{id:22,name:"Gretchen",city:"Berlin",website:"gretchen-club.de",capacity:500},{id:23,name:"Supamolly",city:"Berlin",website:"supamolly.de",capacity:150},{id:24,name:"Kantine am Berghain",city:"Berlin",website:"berghain.berlin",capacity:200},{id:25,name:"Tempodrom",city:"Berlin",website:"tempodrom.de",capacity:4200},{id:26,name:"Heimathafen Neukölln",city:"Berlin",website:"heimathafen-neukoelln.de",capacity:450},{id:27,name:"Bi Nuu",city:"Berlin",website:"binuu.de",capacity:400},{id:28,name:"Mikropol",city:"Berlin",website:"mikropol-berlin.de",capacity:300}];return k("locations",t),t}async function P(){try{const e=await fetch("./events.json"),t=e.ok?await e.json():[],n=await _();return[...t,...n]}catch(e){return console.log("Fehler beim Laden:",e),[]}}let g=U(),f=[],T=null,r={cities:["Berlin","Leipzig"],type:"alle",locationId:"alle",dates:[]},m=I("bookmarked")||[],h=I("going")||[],z=I("seenEvents")||[],v="liste",B=0;async function K(e){T=e,f=await P(),u()}function j(e){return!z.includes(e.id)}function R(){z=f.map(e=>e.id),k("seenEvents",z)}function u(){const e=f.filter(t=>j(t)).length;T.innerHTML=`
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:wght@300;400;500&display=swap');
      * { box-sizing: border-box; }
      body { font-family: 'DM Sans', sans-serif; }
      .syne { font-family: 'Syne', sans-serif; }
      .glass {
        background: rgba(255,255,255,0.04);
        backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px);
        border: 1px solid rgba(255,255,255,0.08);
      }
      .btn-glass {
        background: rgba(255,255,255,0.07);
        border: 1px solid rgba(255,255,255,0.1);
        transition: all 0.2s ease;
        cursor: pointer;
      }
      .btn-glass:hover {
        background: rgba(255,255,255,0.12);
        border-color: rgba(255,255,255,0.2);
      }
      .card-hover { transition: transform 0.2s ease; }
      .card-hover:hover { transform: translateY(-1px); }
      input, textarea { color-scheme: dark; }
      input::placeholder, textarea::placeholder { color: rgba(255,255,255,0.2); }
      .noise { position: relative; }
      .noise::after {
        content: '';
        position: fixed;
        inset: 0;
        background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.03'/%3E%3C/svg%3E");
        pointer-events: none;
        z-index: 0;
      }
      .scrollbar-hide { scrollbar-width: none; }
      .scrollbar-hide::-webkit-scrollbar { display: none; }
      .loc-option:hover { background: rgba(255,255,255,0.06) !important; }
    </style>

    <div class="noise min-h-screen" style="background: linear-gradient(145deg, #080b14 0%, #0c1120 40%, #0e0818 70%, #07100f 100%);">
      <div style="position:fixed; top:-10%; left:-10%; width:50vw; height:50vw; background:radial-gradient(circle, rgba(99,102,241,0.08) 0%, transparent 70%); pointer-events:none; z-index:0;"></div>
      <div style="position:fixed; bottom:-10%; right:-10%; width:40vw; height:40vw; background:radial-gradient(circle, rgba(168,85,247,0.07) 0%, transparent 70%); pointer-events:none; z-index:0;"></div>

      <div class="relative z-10 max-w-xl mx-auto px-4 pb-16">
        ${F(e)}
        ${V()}
        ${v==="liste"?W():""}
        ${v==="kalender"?J():""}
        ${v==="gemerkt"?H():""}
      </div>
    </div>
    ${Y()}
  `,Z(),e>0&&v==="liste"&&setTimeout(()=>R(),3e3)}function F(e){return`
    <div class="pt-10 pb-6">
      <div class="flex items-start justify-between">
        <div>
          <p class="text-xs font-semibold tracking-[0.25em] uppercase mb-2" style="color: rgba(99,102,241,0.7);">Konzert & Club</p>
          <h1 class="syne text-4xl leading-none" style="color: white; letter-spacing: -0.02em; font-weight: 800;">
            Berlin<span style="color: rgba(255,255,255,0.2);">&thinsp;/&thinsp;</span>Leipzig
          </h1>
        </div>
        <div class="flex items-center gap-3 mt-1">
          ${e>0?`<span class="text-xs font-semibold px-3 py-1.5 rounded-full" style="background: rgba(244,114,182,0.15); border: 1px solid rgba(244,114,182,0.25); color: #f472b6;">${e} neu</span>`:""}
        </div>
      </div>
    </div>
  `}function V(){return`
    <div class="flex gap-1.5 mb-6 p-1 rounded-2xl glass">
      ${[{id:"liste",label:"Events"},{id:"kalender",label:"Kalender"},{id:"gemerkt",label:`Gemerkt${m.length>0?" · "+m.length:""}`}].map(t=>`
        <button data-nav="${t.id}" class="flex-1 py-2.5 rounded-xl text-sm font-semibold syne transition-all duration-200 ${v===t.id?"text-white":"text-slate-500 hover:text-slate-300"}" ${v===t.id?'style="background: linear-gradient(135deg, rgba(99,102,241,0.5), rgba(168,85,247,0.5)); border: 1px solid rgba(99,102,241,0.3);"':""}>
          ${t.label}
        </button>
      `).join("")}
      <button data-open-add style="width:38px; flex-shrink:0; border-radius:12px; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1); color:rgba(255,255,255,0.4); font-size:20px; display:flex; align-items:center; justify-content:center; cursor:pointer; transition:all 0.2s;">+</button>
    </div>
  `}function D(){const e=g.filter(t=>r.cities.includes(t.city)).sort((t,n)=>t.name.localeCompare(n.name));return`
    <div class="glass rounded-2xl p-4 mb-5 space-y-3">
      <div class="flex gap-2">
        ${["Berlin","Leipzig"].map(t=>`
          <button data-city="${t}" class="flex-1 py-2 rounded-xl text-sm font-semibold syne transition-all duration-200 ${r.cities.includes(t)?"text-white":"text-slate-600 hover:text-slate-400"}" style="${r.cities.includes(t)?"background: rgba(99,102,241,0.2); border: 1px solid rgba(99,102,241,0.35);":"background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06);"}">
            ${t}
          </button>
        `).join("")}
      </div>
      <div class="flex gap-2">
        ${[{val:"alle",label:"Alle"},{val:"konzert",label:"Konzerte"},{val:"party",label:"Partys"}].map(t=>`
          <button data-type="${t.val}" class="flex-1 py-2 rounded-xl text-xs font-semibold transition-all duration-200 ${r.type===t.val?"text-white":"text-slate-600 hover:text-slate-400"}" style="${r.type===t.val?"background: rgba(168,85,247,0.2); border: 1px solid rgba(168,85,247,0.3);":"background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06);"}">
            ${t.label}
          </button>
        `).join("")}
      </div>
      <div style="position:relative;">
        <div id="filter-loc-selected" style="cursor:pointer; padding:10px 14px; border-radius:12px; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.08); display:flex; justify-content:space-between; align-items:center;">
          <span style="font-size:14px; color:rgba(255,255,255,0.5);">${r.locationId==="alle"?"Alle Locations":g.find(t=>t.id==r.locationId)?.name||"Alle Locations"}</span>
          <span style="color:rgba(255,255,255,0.3); font-size:12px;">▾</span>
        </div>
        <div id="filter-loc-dropdown" class="hidden scrollbar-hide" style="position:absolute; z-index:100; width:100%; max-height:200px; overflow-y:auto; border-radius:12px; background:#0d1530; border:1px solid rgba(255,255,255,0.12); margin-top:4px;">
          <div data-filter-loc="alle" class="loc-option" style="padding:10px 14px; cursor:pointer; color:rgba(255,255,255,0.7); font-size:14px;">Alle Locations</div>
          ${e.map(t=>`
            <div data-filter-loc="${t.id}" class="loc-option" style="padding:10px 14px; cursor:pointer; color:rgba(255,255,255,0.7); font-size:14px; border-top:1px solid rgba(255,255,255,0.04);">
              ${t.name} <span style="color:rgba(255,255,255,0.3); font-size:12px;">${t.city}</span>
            </div>
          `).join("")}
        </div>
      </div>
    </div>
  `}function C(){return f.filter(e=>{const t=g.find(n=>n.id===e.locationId);return!(!t||!r.cities.includes(t.city)||r.type!=="alle"&&e.type!==r.type||r.locationId!=="alle"&&e.locationId!=r.locationId)}).sort((e,t)=>new Date(e.date+"T"+e.time)-new Date(t.date+"T"+t.time))}function W(){const e=C(),t=new Date;t.setHours(0,0,0,0);const n={};return e.forEach(l=>{const s=new Date(l.date+"T12:00:00"),c=Math.floor((s-t)/864e5);let p;c===0?p="Heute":c===1?p="Morgen":c<=7?p="Diese Woche":c<=14?p="Nächste Woche":p=s.toLocaleDateString("de-DE",{month:"long",year:"numeric"}),n[p]||(n[p]=[]),n[p].push(l)}),Object.keys(n).length===0?`${D()}<div class="text-center py-20 text-slate-600"><p class="syne text-2xl mb-2">—</p><p class="text-sm">Keine Events gefunden.</p></div>`:`
    ${D()}
    <div class="space-y-8">
      ${Object.entries(n).map(([l,s])=>`
        <div>
          <div class="flex items-center gap-3 mb-4">
            <div class="h-px flex-1" style="background: rgba(255,255,255,0.06);"></div>
            <span class="syne text-xs tracking-widest uppercase" style="color: rgba(255,255,255,0.25); font-weight:700;">${l}</span>
            <div class="h-px flex-1" style="background: rgba(255,255,255,0.06);"></div>
          </div>
          <div class="space-y-3">${s.map(c=>N(c)).join("")}</div>
        </div>
      `).join("")}
    </div>
  `}function N(e){const t=g.find(d=>d.id===e.locationId),n=m.includes(e.id),l=h.includes(e.id),s=j(e),p=new Date(e.date+"T12:00:00").toLocaleDateString("de-DE",{weekday:"short",day:"numeric",month:"short"}),a=e.type==="konzert",i=a?"#818cf8":"#fb923c";return`
    <div class="card-hover rounded-2xl overflow-hidden" style="background:rgba(255,255,255,0.03); border:1px solid ${l?"rgba(52,211,153,0.3)":(a?"rgba(99,102,241,":"rgba(251,146,60,")+"0.12)"}; box-shadow:0 4px 24px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05);">
      <div style="height:2px; background:linear-gradient(90deg, ${i}, transparent);"></div>
      <div class="p-4">
        <div class="flex justify-between items-start gap-3">
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 mb-2 flex-wrap">
              <span class="syne text-xs" style="color:${i}; font-weight:700;">${p} · ${e.time}</span>
              ${s?'<span class="text-xs font-bold" style="color:#f472b6; letter-spacing:0.05em;">NEW</span>':""}
              ${l?'<span class="text-xs font-semibold" style="color:#34d399;">✓ dabei</span>':""}
            </div>
            <h3 class="syne text-white leading-tight mb-1" style="font-size:1rem; font-weight:700; letter-spacing:-0.01em;">${e.title}</h3>
            <p class="text-xs mb-2" style="color:rgba(255,255,255,0.35);">
              ${t?t.name+' <span style="color:rgba(255,255,255,0.15);">·</span> '+t.city:""}
              <span style="margin-left:6px; color:${a?"rgba(99,102,241,0.7)":"rgba(251,146,60,0.7)"};">${a?"Konzert":"Party"}</span>
            </p>
            ${e.description?`<p class="text-xs leading-relaxed mb-3" style="color:rgba(255,255,255,0.4);">${e.description}</p>`:""}
          </div>
          <div class="flex flex-col gap-3 items-center pt-1">
            <button data-bookmark="${e.id}" title="Vormerken" style="color:${n?"#f472b6":"rgba(255,255,255,0.2)"}; background:none; border:none; cursor:pointer; font-size:1.125rem; transition:all 0.2s;">♡</button>
            <button data-going="${e.id}" title="Ich gehe hin" style="color:${l?"#34d399":"rgba(255,255,255,0.2)"}; background:none; border:none; cursor:pointer; font-size:1.125rem; transition:all 0.2s;">✓</button>
          </div>
        </div>
        <div class="flex gap-2 flex-wrap mt-1">
          ${e.ticketUrl?`<a href="${e.ticketUrl}" target="_blank" class="btn-glass text-xs font-medium px-3 py-1.5 rounded-lg text-slate-400 hover:text-white inline-block">Tickets →</a>`:""}
          ${e.spotifyUrl?`<a href="${e.spotifyUrl}" target="_blank" class="btn-glass text-xs font-medium px-3 py-1.5 rounded-lg inline-flex items-center gap-1.5" style="color:#1db954; border-color:rgba(29,185,84,0.2);"><svg width="12" height="12" viewBox="0 0 24 24" fill="#1db954"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/></svg>Spotify</a>`:""}
          <button data-share="${e.id}" class="btn-glass text-xs font-medium px-3 py-1.5 rounded-lg text-slate-500 hover:text-slate-300">Teilen</button>
          ${n?`<button data-ics="${e.id}" class="btn-glass text-xs font-medium px-3 py-1.5 rounded-lg text-slate-500 hover:text-slate-300">+ Kalender</button>`:""}
        </div>
      </div>
    </div>
  `}function J(){const e=new Date,t=new Date(e.getFullYear(),e.getMonth()+B,1),n=t.getFullYear(),l=t.getMonth(),s=new Date(n,l+1,0).getDate(),c=(new Date(n,l,1).getDay()+6)%7,p=t.toLocaleDateString("de-DE",{month:"long",year:"numeric"}),a=C(),i=a.map(d=>d.date),o=a.filter(d=>r.dates.length===0||r.dates.includes(d.date));return`
    ${D()}
    <div class="glass rounded-2xl p-5 mb-5">
      <div class="flex items-center justify-between mb-5">
        <button data-cal-prev class="btn-glass w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-white">‹</button>
        <h2 class="syne font-700 text-white tracking-wide capitalize">${p}</h2>
        <button data-cal-next class="btn-glass w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-white">›</button>
      </div>
      <div class="grid grid-cols-7 gap-1 text-center mb-3">
        ${["Mo","Di","Mi","Do","Fr","Sa","So"].map(d=>`<div class="text-xs font-semibold py-1" style="color:rgba(255,255,255,0.2);">${d}</div>`).join("")}
      </div>
      <div class="grid grid-cols-7 gap-1">
        ${Array(c).fill("<div></div>").join("")}
        ${Array.from({length:s},(d,$)=>{const w=$+1,y=`${n}-${String(l+1).padStart(2,"0")}-${String(w).padStart(2,"0")}`,x=i.includes(y),L=r.dates.includes(y),S=w===e.getDate()&&l===e.getMonth()&&n===e.getFullYear(),O=new Date(y)<e&&!S;return`
            <button data-date="${y}" style="aspect-ratio:1; border-radius:12px; font-size:14px; font-weight:500; display:flex; align-items:center; justify-content:center; position:relative; transition:all 0.15s; ${O?"opacity:0.25;":""} color:${!x&&!L&&!S?"rgba(255,255,255,0.2)":"white"}; background:${L?"rgba(99,102,241,0.5)":x?"rgba(99,102,241,0.12)":"transparent"}; border:${L?"1px solid rgba(99,102,241,0.6)":x?"1px solid rgba(99,102,241,0.25)":S?"1px solid rgba(255,255,255,0.2)":"1px solid transparent"}; padding:4px; cursor:pointer;">
              ${w}
              ${x&&!L?'<span style="position:absolute;bottom:3px;left:50%;transform:translateX(-50%);width:3px;height:3px;border-radius:50%;background:#818cf8;"></span>':""}
            </button>
          `}).join("")}
      </div>
      ${r.dates.length>0?`
        <button data-clear-dates class="mt-4 w-full text-xs py-2 rounded-xl text-slate-500 hover:text-slate-300 transition-all btn-glass">
          Auswahl zurücksetzen (${r.dates.length} ${r.dates.length===1?"Tag":"Tage"})
        </button>
      `:'<p class="text-center text-xs mt-4" style="color:rgba(255,255,255,0.15);">Tage antippen zum Filtern · Mehrfachauswahl möglich</p>'}
    </div>
    <div class="space-y-3">
      ${r.dates.length>0&&o.length===0?'<p class="text-center text-slate-600 py-6 text-sm">Keine Events an den gewählten Tagen.</p>':o.map(d=>N(d)).join("")}
    </div>
  `}function H(){const e=f.filter(l=>m.includes(l.id)),t=f.filter(l=>h.includes(l.id)),n=(l,s,c)=>`
    <div>
      <div class="flex items-center gap-3 mb-4">
        <div class="h-px flex-1" style="background:rgba(255,255,255,0.06);"></div>
        <span class="syne text-xs tracking-widest uppercase" style="color:rgba(255,255,255,0.25); font-weight:700;">${l}</span>
        <div class="h-px flex-1" style="background:rgba(255,255,255,0.06);"></div>
      </div>
      ${s.length===0?`<p class="text-slate-700 text-sm py-4 text-center">${c}</p>`:`<div class="space-y-3">${s.map(p=>N(p)).join("")}</div>`}
    </div>
  `;return`
    <div class="space-y-8 pt-2">
      ${n("Dabei · "+t.length,t,"Noch keine Events.")}
      ${n("Vorgemerkt · "+e.length,e,"Noch keine Events.")}
    </div>
  `}const b="width:100%; border-radius:12px; padding:10px 14px; font-size:14px; color:white; outline:none; background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.1); font-family:'DM Sans',sans-serif;";function Y(){const e=g.slice().sort((t,n)=>t.name.localeCompare(n.name));return`
    <div id="modal-add" class="hidden fixed inset-0 z-50 overflow-y-auto scrollbar-hide" style="background:rgba(0,0,0,0.8); backdrop-filter:blur(8px);">
      <div class="max-w-lg mx-auto mt-8 mb-12 mx-4 rounded-3xl overflow-hidden" style="background:rgba(12,17,32,0.97); border:1px solid rgba(255,255,255,0.1); box-shadow:0 24px 80px rgba(0,0,0,0.6);">
        <div class="px-6 py-5" style="background:linear-gradient(135deg, rgba(99,102,241,0.15), rgba(168,85,247,0.15)); border-bottom:1px solid rgba(255,255,255,0.06);">
          <h2 class="syne text-xl text-white" style="font-weight:800;">Hinzufügen</h2>
          <p class="text-xs mt-0.5" style="color:rgba(255,255,255,0.35);">Event oder Location eintragen</p>
        </div>
        <div class="p-6">
          <div class="flex gap-1.5 mb-5 p-1 rounded-xl glass">
            <button data-add-tab="event" class="flex-1 py-2 rounded-lg text-sm font-semibold syne text-white" style="background:rgba(99,102,241,0.4); border:1px solid rgba(99,102,241,0.3);">Event</button>
            <button data-add-tab="location" class="flex-1 py-2 rounded-lg text-sm font-semibold syne text-slate-500">Location</button>
          </div>

          <div id="add-event-form">
            <div class="space-y-3">
              <input id="new-title" type="text" placeholder="Titel (z.B. Bandname – Releaseshow)" style="${b}" />
              <div class="flex gap-2">
                <button data-etype="konzert" class="flex-1 py-2.5 rounded-xl text-sm font-semibold syne text-white" style="background:rgba(99,102,241,0.4); border:1px solid rgba(99,102,241,0.3);">Konzert</button>
                <button data-etype="party" class="flex-1 py-2.5 rounded-xl text-sm font-semibold syne text-slate-500" style="background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.08);">Party</button>
              </div>
              <input type="hidden" id="new-type" value="konzert" />
              <div class="flex gap-2">
                <input id="new-date" type="date" style="${b} flex:1;" />
                <input id="new-time" type="time" style="${b} flex:1;" />
              </div>
              <div style="position:relative;">
                <div id="add-loc-selected" style="cursor:pointer; padding:10px 14px; border-radius:12px; background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.1); display:flex; justify-content:space-between; align-items:center;">
                  <span id="add-loc-text" style="font-size:14px; color:rgba(255,255,255,0.3);">Location wählen...</span>
                  <span style="color:rgba(255,255,255,0.3); font-size:12px;">▾</span>
                </div>
                <input type="hidden" id="new-location" value="" />
                <div id="add-loc-dropdown" class="hidden scrollbar-hide" style="position:absolute; z-index:200; width:100%; max-height:180px; overflow-y:auto; border-radius:12px; background:#0d1530; border:1px solid rgba(255,255,255,0.12); margin-top:4px;">
                  <div data-add-loc-option="__new__" class="loc-option" style="padding:10px 14px; cursor:pointer; color:#818cf8; font-size:14px; border-bottom:1px solid rgba(255,255,255,0.06);">+ Neue Location eingeben...</div>
                  ${e.map(t=>`<div data-add-loc-option="${t.id}" data-add-loc-name="${t.name}" class="loc-option" style="padding:10px 14px; cursor:pointer; color:rgba(255,255,255,0.8); font-size:14px; border-top:1px solid rgba(255,255,255,0.04);">${t.name} <span style="color:rgba(255,255,255,0.35); font-size:12px;">${t.city}</span></div>`).join("")}
                </div>
              </div>
              <div id="new-location-custom" class="hidden space-y-2">
                <input id="new-location-name" type="text" placeholder="Name der neuen Location" style="${b}" />
                <div class="flex gap-2">
                  <button data-city-pick="Berlin" class="flex-1 py-2 rounded-xl text-sm syne font-semibold text-white" style="background:rgba(99,102,241,0.3); border:1px solid rgba(99,102,241,0.3);">Berlin</button>
                  <button data-city-pick="Leipzig" class="flex-1 py-2 rounded-xl text-sm syne font-semibold text-slate-500" style="background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.08);">Leipzig</button>
                </div>
                <input type="hidden" id="new-location-city" value="Berlin" />
              </div>
              <textarea id="new-desc" placeholder="Kurzbeschreibung: Wer? Woher? Musikrichtung?" style="${b} height:70px; resize:none;"></textarea>
              <input id="new-ticket" type="url" placeholder="Ticket-URL (optional)" style="${b}" />
              <input id="new-spotify" type="url" placeholder="Spotify-Link (optional)" style="${b}" />
              <button data-save-event class="w-full py-3 rounded-xl font-bold text-white text-sm syne transition-all hover:opacity-90" style="background:linear-gradient(135deg, rgba(99,102,241,0.7), rgba(168,85,247,0.7)); border:1px solid rgba(99,102,241,0.3);">
                Event speichern
              </button>
            </div>
          </div>

          <div id="add-location-form" class="hidden">
            <div class="space-y-3">
              <input id="new-loc-name" type="text" placeholder="Name der Location" style="${b}" />
              <div class="flex gap-2">
                <button data-loc-city-pick="Berlin" class="flex-1 py-2 rounded-xl text-sm syne font-semibold text-white" style="background:rgba(99,102,241,0.3); border:1px solid rgba(99,102,241,0.3);">Berlin</button>
                <button data-loc-city-pick="Leipzig" class="flex-1 py-2 rounded-xl text-sm syne font-semibold text-slate-500" style="background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.08);">Leipzig</button>
              </div>
              <input type="hidden" id="new-loc-city" value="Berlin" />
              <input id="new-loc-website" type="url" placeholder="Website (optional)" style="${b}" />
              <input id="new-loc-capacity" type="number" placeholder="Kapazität (optional)" style="${b}" />
              <button data-save-location class="w-full py-3 rounded-xl font-bold text-white text-sm syne transition-all hover:opacity-90" style="background:linear-gradient(135deg, rgba(99,102,241,0.7), rgba(168,85,247,0.7)); border:1px solid rgba(99,102,241,0.3);">
                Location speichern
              </button>
            </div>
          </div>

          <button data-close-add class="mt-3 w-full py-2 text-xs text-slate-600 hover:text-slate-400 transition-colors">Abbrechen</button>
        </div>
      </div>
    </div>
  `}function G(e){const t=g.find(d=>d.id===e.locationId),[n,l]=e.time.split(":").map(Number),s=e.date.replace(/-/g,"")+"T"+String(n).padStart(2,"0")+String(l).padStart(2,"0")+"00",c=e.date.replace(/-/g,"")+"T"+String(n+2).padStart(2,"0")+String(l).padStart(2,"0")+"00",p=["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//KonzertApp//DE","BEGIN:VEVENT","UID:"+e.id+"@konzertapp","SUMMARY:"+e.title,"DTSTART:"+s,"DTEND:"+c,"LOCATION:"+(t?t.name:""),"DESCRIPTION:"+(e.description||""),"END:VEVENT","END:VCALENDAR"].join(`\r
`),a=new Blob([p],{type:"text/calendar;charset=utf-8"}),i=URL.createObjectURL(a),o=document.createElement("a");o.href=i,o.download=e.title.replace(/\s+/g,"-")+".ics",o.click(),setTimeout(()=>URL.revokeObjectURL(i),1e3)}function X(e){const t=g.find(s=>s.id===e.locationId),n=new Date(e.date+"T12:00:00").toLocaleDateString("de-DE",{weekday:"long",day:"numeric",month:"long",year:"numeric"}),l=`${e.type==="konzert"?"🎸":"🎉"} *${e.title}*
📍 ${t?t.name+", "+t.city:""}
📅 ${n} · ${e.time} Uhr${e.description?`

`+e.description:""}${e.ticketUrl?`

Tickets: `+e.ticketUrl:""}`;window.open("https://wa.me/?text="+encodeURIComponent(l),"_blank")}function Z(){document.querySelectorAll("[data-nav]").forEach(a=>{a.addEventListener("click",()=>{v=a.dataset.nav,u()})}),document.querySelectorAll("[data-city]").forEach(a=>{a.addEventListener("click",()=>{const i=a.dataset.city;r.cities.includes(i)?r.cities.length>1&&(r.cities=r.cities.filter(o=>o!==i)):r.cities.push(i),u()})}),document.querySelectorAll("[data-type]").forEach(a=>{a.addEventListener("click",()=>{r.type=a.dataset.type,u()})});const e=document.getElementById("filter-loc-selected"),t=document.getElementById("filter-loc-dropdown");e?.addEventListener("click",a=>{a.stopPropagation(),t.classList.toggle("hidden")}),document.querySelectorAll("[data-filter-loc]").forEach(a=>{a.addEventListener("click",()=>{r.locationId=a.dataset.filterLoc,t.classList.add("hidden"),u()})});const n=document.querySelector("[data-cal-prev]"),l=document.querySelector("[data-cal-next]");n&&n.addEventListener("click",()=>{B--,u()}),l&&l.addEventListener("click",()=>{B++,u()}),document.querySelectorAll("[data-date]").forEach(a=>{a.addEventListener("click",()=>{const i=a.dataset.date;r.dates=r.dates.includes(i)?r.dates.filter(o=>o!==i):[...r.dates,i],u()})}),document.querySelector("[data-clear-dates]")?.addEventListener("click",()=>{r.dates=[],u()}),document.querySelectorAll("[data-bookmark]").forEach(a=>{a.addEventListener("click",()=>{const i=parseInt(a.dataset.bookmark);m=m.includes(i)?m.filter(o=>o!==i):[...m,i],k("bookmarked",m),u()})}),document.querySelectorAll("[data-going]").forEach(a=>{a.addEventListener("click",()=>{const i=parseInt(a.dataset.going);h=h.includes(i)?h.filter(o=>o!==i):[...h,i],k("going",h),u()})}),document.querySelectorAll("[data-share]").forEach(a=>{a.addEventListener("click",()=>{const i=f.find(o=>o.id===parseInt(a.dataset.share));i&&X(i)})}),document.querySelectorAll("[data-ics]").forEach(a=>{a.addEventListener("click",()=>{const i=f.find(o=>o.id===parseInt(a.dataset.ics));i&&G(i)})});const s=document.getElementById("modal-add");document.querySelector("[data-open-add]")?.addEventListener("click",()=>s.classList.remove("hidden")),document.querySelector("[data-close-add]")?.addEventListener("click",()=>s.classList.add("hidden")),document.querySelectorAll("[data-add-tab]").forEach(a=>{a.addEventListener("click",()=>{const i=a.dataset.addTab;document.getElementById("add-event-form").classList.toggle("hidden",i!=="event"),document.getElementById("add-location-form").classList.toggle("hidden",i!=="location"),document.querySelectorAll("[data-add-tab]").forEach(o=>{const d=o.dataset.addTab===i;o.style.background=d?"rgba(99,102,241,0.4)":"transparent",o.style.border=d?"1px solid rgba(99,102,241,0.3)":"none",o.style.color=d?"white":"rgba(255,255,255,0.3)"})})}),document.querySelectorAll("[data-etype]").forEach(a=>{a.addEventListener("click",()=>{document.getElementById("new-type").value=a.dataset.etype,document.querySelectorAll("[data-etype]").forEach(i=>{const o=i.dataset.etype===a.dataset.etype;i.style.background=o?"rgba(99,102,241,0.4)":"rgba(255,255,255,0.04)",i.style.border=o?"1px solid rgba(99,102,241,0.3)":"1px solid rgba(255,255,255,0.08)",i.style.color=o?"white":"rgba(255,255,255,0.3)"})})});const c=document.getElementById("add-loc-selected"),p=document.getElementById("add-loc-dropdown");c?.addEventListener("click",a=>{a.stopPropagation(),p.classList.toggle("hidden")}),document.querySelectorAll("[data-add-loc-option]").forEach(a=>{a.addEventListener("click",()=>{const i=a.dataset.addLocOption;document.getElementById("new-location").value=i==="__new__"?"":i,p.classList.add("hidden");const o=document.getElementById("new-location-custom"),d=document.getElementById("add-loc-text");i==="__new__"?(d.textContent="+ Neue Location eingeben...",d.style.color="#818cf8",o.classList.remove("hidden")):(d.textContent=a.dataset.addLocName||a.textContent.trim(),d.style.color="rgba(255,255,255,0.8)",o.classList.add("hidden"))})}),document.querySelectorAll("[data-city-pick]").forEach(a=>{a.addEventListener("click",()=>{document.getElementById("new-location-city").value=a.dataset.cityPick,document.querySelectorAll("[data-city-pick]").forEach(i=>{const o=i.dataset.cityPick===a.dataset.cityPick;i.style.background=o?"rgba(99,102,241,0.3)":"rgba(255,255,255,0.04)",i.style.border=o?"1px solid rgba(99,102,241,0.3)":"1px solid rgba(255,255,255,0.08)",i.style.color=o?"white":"rgba(255,255,255,0.3)"})})}),document.querySelectorAll("[data-loc-city-pick]").forEach(a=>{a.addEventListener("click",()=>{document.getElementById("new-loc-city").value=a.dataset.locCityPick,document.querySelectorAll("[data-loc-city-pick]").forEach(i=>{const o=i.dataset.locCityPick===a.dataset.locCityPick;i.style.background=o?"rgba(99,102,241,0.3)":"rgba(255,255,255,0.04)",i.style.border=o?"1px solid rgba(99,102,241,0.3)":"1px solid rgba(255,255,255,0.08)",i.style.color=o?"white":"rgba(255,255,255,0.3)"})})}),document.querySelector("[data-save-event]")?.addEventListener("click",async()=>{const a=document.getElementById("new-title").value.trim(),i=document.getElementById("new-date").value,o=document.getElementById("new-time").value;let d=document.getElementById("new-location").value;if(!a||!i||!o){alert("Bitte Titel, Datum und Uhrzeit angeben.");return}if(d)d=parseInt(d);else{const y=document.getElementById("new-location-name")?.value.trim();if(!y){alert("Bitte eine Location wählen oder neue Location eingeben.");return}const x={id:Date.now(),name:y,city:document.getElementById("new-location-city").value,website:"",capacity:0};g.push(x),k("locations",g),d=x.id}const $={id:Date.now(),title:a,type:document.getElementById("new-type").value,date:i,time:o,locationId:d,description:document.getElementById("new-desc").value.trim(),ticketUrl:document.getElementById("new-ticket").value.trim(),spotifyUrl:document.getElementById("new-spotify").value.trim(),source:"manual"},w=g.find(y=>y.id===d);await M($,w?.name||"",w?.city||""),f.push($),s.classList.add("hidden"),u()}),document.querySelector("[data-save-location]")?.addEventListener("click",()=>{const a=document.getElementById("new-loc-name").value.trim();if(!a){alert("Bitte einen Namen eingeben.");return}const i={id:Date.now(),name:a,city:document.getElementById("new-loc-city").value,website:document.getElementById("new-loc-website").value.trim(),capacity:parseInt(document.getElementById("new-loc-capacity").value)||0};g.push(i),k("locations",g),s.classList.add("hidden"),u()}),document.addEventListener("click",()=>{t?.classList.add("hidden"),p?.classList.add("hidden")})}const Q=document.getElementById("app");K(Q);q();"serviceWorker"in navigator&&location.hostname!=="localhost"&&navigator.serviceWorker.register("/konzert-app/sw.js");
