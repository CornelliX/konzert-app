(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const s of document.querySelectorAll('link[rel="modulepreload"]'))r(s);new MutationObserver(s=>{for(const d of s)if(d.type==="childList")for(const c of d.addedNodes)c.tagName==="LINK"&&c.rel==="modulepreload"&&r(c)}).observe(document,{childList:!0,subtree:!0});function n(s){const d={};return s.integrity&&(d.integrity=s.integrity),s.referrerPolicy&&(d.referrerPolicy=s.referrerPolicy),s.crossOrigin==="use-credentials"?d.credentials="include":s.crossOrigin==="anonymous"?d.credentials="omit":d.credentials="same-origin",d}function r(s){if(s.ep)return;s.ep=!0;const d=n(s);fetch(s.href,d)}})();const j="https://cqxpjesovcavarrlljpn.supabase.co",$="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNxeHBqZXNvdmNhdmFycmxsanBuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI0NjI4MjYsImV4cCI6MjA4ODAzODgyNn0._paXbtV1uecR0AA08KUkKLfRkmkQw2k4W3hT5L2y2ho";async function q(){const e=await fetch(`${j}/rest/v1/manual_events?select=*&order=date.asc`,{headers:{apikey:$,Authorization:"Bearer "+$}});return e.ok?(await e.json()).map(n=>({id:n.id,title:n.title,type:n.type,date:n.date,time:n.time,locationId:n.location_id,locationName:n.location_name,locationCity:n.location_city,description:n.description,ticketUrl:n.ticket_url,spotifyUrl:n.spotify_url,source:"manual"})):[]}async function P(e,t,n){return(await fetch(`${j}/rest/v1/manual_events`,{method:"POST",headers:{apikey:$,Authorization:"Bearer "+$,"Content-Type":"application/json",Prefer:"return=minimal"},body:JSON.stringify({id:e.id,title:e.title,type:e.type,date:e.date,time:e.time,location_id:e.locationId,location_name:t,location_city:n,description:e.description,ticket_url:e.ticketUrl,spotify_url:e.spotifyUrl})})).ok}async function R(){const e=new Date().toISOString().split("T")[0];await fetch(`${j}/rest/v1/manual_events?date=lt.${e}`,{method:"DELETE",headers:{apikey:$,Authorization:"Bearer "+$}})}function B(e){const t=localStorage.getItem(e);return t?JSON.parse(t):null}function L(e,t){localStorage.setItem(e,JSON.stringify(t))}function K(){const e=B("locations");if(e)return e;const t=[{id:1,name:"Lido",city:"Berlin",website:"lido-berlin.de",capacity:400},{id:2,name:"SO36",city:"Berlin",website:"so36.com",capacity:600},{id:3,name:"Festsaal Kreuzberg",city:"Berlin",website:"festsaal-kreuzberg.de",capacity:1200},{id:4,name:"Privatclub",city:"Berlin",website:"privatclub-berlin.de",capacity:250},{id:5,name:"Astra Kulturhaus",city:"Berlin",website:"astra-berlin.de",capacity:1800},{id:6,name:"Frannz Club",city:"Berlin",website:"frannz.eu",capacity:350},{id:7,name:"Monarch",city:"Berlin",website:"kottimonarch.de",capacity:150},{id:8,name:"Musik & Frieden",city:"Berlin",website:"musikundfrieden.de",capacity:700},{id:9,name:"Wild at Heart",city:"Berlin",website:"wildatheartberlin.de",capacity:280},{id:10,name:"Columbia Theater",city:"Berlin",website:"columbia-theater.de",capacity:800},{id:11,name:"Schokoladen",city:"Berlin",website:"schokoladen-mitte.de",capacity:150},{id:12,name:"Madame Claude",city:"Berlin",website:"madameclaude.de",capacity:100},{id:13,name:"Conne Island",city:"Leipzig",website:"conne-island.de",capacity:600},{id:14,name:"Werk 2",city:"Leipzig",website:"werk-2.de",capacity:500},{id:15,name:"Täubchenthal",city:"Leipzig",website:"taeubchenthal.com",capacity:1200},{id:16,name:"Felsenkeller",city:"Leipzig",website:"felsenkeller-leipzig.com",capacity:2e3},{id:17,name:"UT Connewitz",city:"Leipzig",website:"utconnewitz.de",capacity:350},{id:18,name:"Moritzbastei",city:"Leipzig",website:"moritzbastei.de",capacity:500},{id:19,name:"Horns Erben",city:"Leipzig",website:"horns-erben.de",capacity:150},{id:20,name:"Ilses Erika",city:"Leipzig",website:"",capacity:200},{id:21,name:"Urban Spree",city:"Berlin",website:"urbanspree.com",capacity:250},{id:22,name:"Gretchen",city:"Berlin",website:"gretchen-club.de",capacity:500},{id:23,name:"Supamolly",city:"Berlin",website:"supamolly.de",capacity:150},{id:24,name:"Kantine am Berghain",city:"Berlin",website:"berghain.berlin",capacity:200},{id:25,name:"Tempodrom",city:"Berlin",website:"tempodrom.de",capacity:4200},{id:26,name:"Heimathafen Neukölln",city:"Berlin",website:"heimathafen-neukoelln.de",capacity:450},{id:27,name:"Bi Nuu",city:"Berlin",website:"binuu.de",capacity:400},{id:28,name:"Mikropol",city:"Berlin",website:"mikropol-berlin.de",capacity:300}];return L("locations",t),t}async function D(){try{const e=await fetch("./events.json"),t=e.ok?await e.json():[],n=await q();return[...t,...n]}catch(e){return console.log("Fehler beim Laden:",e),[]}}let f=K(),v=[],_=null,l={cities:["Berlin","Leipzig"],type:"alle",locationId:"alle",dates:[]},w=B("bookmarked")||[],h=B("going")||[],A=B("seenEvents")||[],E="liste",N=0;async function F(e){_=e,v=await D(),m()}function O(e){return!A.includes(e.id)}function V(){A=v.map(e=>e.id),L("seenEvents",A)}function m(){const e=v.filter(t=>O(t)).length;_.innerHTML=`
  <div id="ptr-indicator" style="text-align:center; height:0; overflow:hidden; transition:height 0.2s; color:rgba(255,255,255,0.5); font-size:13px; display:flex; align-items:center; justify-content:center;">↻ Aktualisieren...</div>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:wght@300;400;500&display=swap');
      * { box-sizing: border-box; }
      body { font-family: 'DM Sans', sans-serif; }
      .syne { font-family: 'Syne', sans-serif; }
      input[type="date"], input[type="time"] { color-scheme: dark; color: rgba(255,255,255,0.4) !important; }
      input[type="date"]:valid, input[type="time"]:valid { color: white !important; }
      .glass {
        background: rgba(8,8,42,0.97);
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
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/flatpickr/dist/flatpickr.min.css">
    <style>
      .flatpickr-calendar { background:#1a1a3a; border:1px solid rgba(255,255,255,0.1); border-radius:16px; }
      .flatpickr-day { color:white; } .flatpickr-day:hover { background:rgba(99,102,241,0.3); }
      .flatpickr-day.selected { background:rgba(99,102,241,0.6); border-color:transparent; }
      .flatpickr-months, .flatpickr-weekdays, span.flatpickr-weekday { background:transparent; color:rgba(255,255,255,0.5); }
      .flatpickr-current-month, .numInputWrapper { color:white; }
      .flatpickr-prev-month svg, .flatpickr-next-month svg { fill:white; }
      .flatpickr-time { background:#1a1a3a !important; border-radius:12px !important; }
      .flatpickr-time input { color:white !important; background:transparent !important; }
      .flatpickr-time .numInputWrapper span { border-color:rgba(255,255,255,0.2) !important; }
      .flatpickr-time .numInputWrapper span svg { fill:white !important; }
      .flatpickr-input { width:100% !important; border-radius:12px !important; padding:10px 14px !important; font-size:14px !important; color:white !important; outline:none !important; background:rgba(255,255,255,0.06) !important; border:1px solid rgba(255,255,255,0.1) !important; font-family:'DM Sans',sans-serif !important; box-sizing:border-box !important; }
    </style>
    <div class="noise min-h-screen" style="background: linear-gradient(180deg, #05053a 0%, #120838 25%, #1e0848 45%, #3a0a52 60%, #52083a 78%, #620a1a 100%);">
      <div style="position:fixed; top:-10%; left:-10%; width:50vw; height:50vw; background:radial-gradient(circle, rgba(60,40,180,0.12) 0%, transparent 70%); pointer-events:none; z-index:0;"></div>
      <div style="position:fixed; bottom:-10%; right:-10%; width:40vw; height:40vw; background:radial-gradient(circle, rgba(140,20,60,0.10) 0%, transparent 70%); pointer-events:none; z-index:0;"></div>

      <div class="relative z-10 max-w-xl mx-auto px-4 pb-16">
        ${W(e)}
        ${J()}
        ${E==="liste"?Y():""}
        ${E==="kalender"?H():""}
        ${E==="gemerkt"?G():""}
      </div>
    </div>
    ${X()}
  `,ee(),e>0&&E==="liste"&&setTimeout(()=>V(),3e3)}function W(e){return`
    <div class="pt-10 pb-6">
      <div class="flex items-center justify-between gap-2">
        <h1 class="syne text-5xl leading-none" style="color: white; letter-spacing: -0.02em; font-weight: 800; line-height: 1; flex-shrink:0;">
          LE.BE<br>LIVE
        </h1>
        ${e>0?`<div style="flex-shrink:0; width:44px; height:44px; border-radius:50%; background:rgba(244,114,182,0.15); border:1px solid rgba(244,114,182,0.25); color:#f472b6; display:flex; flex-direction:column; align-items:center; justify-content:center; line-height:1.2;">
          <span style="font-size:10px; font-weight:700;">${e}</span>
          <span style="font-size:10px; font-weight:600;">neu</span>
        </div>`:""}
        <div class="syne text-right" style="color:rgba(168,85,247,0.9); font-weight:700; font-size:0.65em; line-height:1.25; letter-spacing:0.04em; text-transform:uppercase; white-space:nowrap;">
          KONZERTE<br>UND PARTYS<br>IN LEIPZIG<br>UND BERLIN
        </div>
      </div>
    </div>
  `}function J(){return`
    <div class="flex gap-1.5 mb-6 p-1 rounded-2xl glass">
      ${[{id:"liste",label:"Events"},{id:"kalender",label:"Kalender"},{id:"gemerkt",label:`Gemerkt${w.length+h.length>0?" · "+(w.length+h.length):""}`}].map(t=>`
        <button data-nav="${t.id}" class="flex-1 py-2.5 rounded-xl text-sm font-semibold syne transition-all duration-200 ${E===t.id?"text-white":"text-slate-500 hover:text-slate-300"}" ${E===t.id?'style="background: linear-gradient(135deg, rgba(99,102,241,0.5), rgba(168,85,247,0.5)); border: 1px solid rgba(99,102,241,0.3);"':""}>
          ${t.label}
        </button>
      `).join("")}
      <button data-open-add style="width:38px; flex-shrink:0; border-radius:12px; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1); color:rgba(255,255,255,0.4); font-size:20px; display:flex; align-items:center; justify-content:center; cursor:pointer; transition:all 0.2s;">+</button>
    </div>
  `}function T(){const e=f.filter(t=>l.cities.includes(t.city)).sort((t,n)=>t.name.localeCompare(n.name));return`
    <div class="glass rounded-2xl p-4 mb-5 space-y-3">
      <div class="flex gap-2">
        ${["Berlin","Leipzig"].map(t=>`
          <button data-city="${t}" class="flex-1 py-2 rounded-xl text-sm font-semibold syne transition-all duration-200 ${l.cities.includes(t)?"text-white":"text-slate-600 hover:text-slate-400"}" style="${l.cities.includes(t)?"background: rgba(99,102,241,0.2); border: 1px solid rgba(99,102,241,0.35);":"background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06);"}">
            ${t}
          </button>
        `).join("")}
      </div>
      <div class="flex gap-2">
        ${[{val:"alle",label:"Alle"},{val:"konzert",label:"Konzerte"},{val:"party",label:"Partys"}].map(t=>`
          <button data-type="${t.val}" class="flex-1 py-2 rounded-xl text-xs font-semibold transition-all duration-200 ${l.type===t.val?"text-white":"text-slate-600 hover:text-slate-400"}" style="${l.type===t.val?"background: rgba(168,85,247,0.2); border: 1px solid rgba(168,85,247,0.3);":"background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06);"}">
            ${t.label}
          </button>
        `).join("")}
      </div>
      <div style="position:relative;">
        <div id="filter-loc-selected" style="cursor:pointer; padding:10px 14px; border-radius:12px; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.08); display:flex; justify-content:space-between; align-items:center;">
          <span style="font-size:14px; color:rgba(255,255,255,0.5);">${l.locationId==="alle"?"Alle Locations":f.find(t=>t.id==l.locationId)?.name||"Alle Locations"}</span>
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
  `}function U(){return v.filter(e=>{const t=f.find(r=>r.id===e.locationId),n=t?t.city:e.locationCity||"";return n?!(!l.cities.includes(n)||l.type!=="alle"&&e.type!==l.type||l.locationId!=="alle"&&e.locationId!=l.locationId):!0}).sort((e,t)=>new Date(e.date+"T"+e.time)-new Date(t.date+"T"+t.time))}function Y(){const e=U(),t=new Date;t.setHours(0,0,0,0);const n={};return e.forEach(r=>{const s=new Date(r.date+"T12:00:00"),d=Math.floor((s-t)/864e5);let c;const y=t.getDay()===0?6:t.getDay()-1,g=new Date(t);g.setDate(t.getDate()-y);const b=new Date(g);b.setDate(g.getDate()+7);const p=new Date(b);p.setDate(b.getDate()+7),d===0?c="Heute":d===1?c="Morgen":s<b?c="Diese Woche":s<p?c="Nächste Woche":c=s.toLocaleDateString("de-DE",{month:"long",year:"numeric"}),n[c]||(n[c]=[]),n[c].push(r)}),Object.keys(n).length===0?`${T()}<div class="text-center py-20 text-slate-600"><p class="syne text-2xl mb-2">—</p><p class="text-sm">Keine Events gefunden.</p></div>`:`
    ${T()}
    <div class="space-y-8">
      ${Object.entries(n).map(([r,s])=>`
        <div>
          <div class="flex items-center gap-3 mb-4">
            <div class="h-px flex-1" style="background: rgba(255,255,255,0.06);"></div>
            <span class="syne text-xs tracking-widest uppercase" style="color: rgba(255,255,255,0.25); font-weight:700;">${r}</span>
            <div class="h-px flex-1" style="background: rgba(255,255,255,0.06);"></div>
          </div>
          <div class="space-y-3">${s.map(d=>M(d)).join("")}</div>
        </div>
      `).join("")}
    </div>
  `}function M(e){const t=f.find(p=>p.id===e.locationId),n=w.includes(e.id),r=h.includes(e.id),s=O(e),c=new Date(e.date+"T12:00:00").toLocaleDateString("de-DE",{weekday:"short",day:"numeric",month:"short"}),y=e.type==="konzert",g=y?"#818cf8":"#fb923c";return`
    <div class="card-hover rounded-2xl overflow-hidden" style="background:rgba(8,8,42,0.92); border:1px solid ${r?"rgba(52,211,153,0.3)":(y?"rgba(99,102,241,":"rgba(251,146,60,")+"0.12)"}; box-shadow:0 4px 24px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05);">
      <div style="height:2px; background:linear-gradient(90deg, ${g}, transparent);"></div>
      <div class="p-4">
        <div class="flex justify-between items-start gap-3">
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 mb-2 flex-wrap">
              <span class="syne text-xs" style="color:${g}; font-weight:700;">${c} · ${e.time}</span>
              ${s?'<span class="text-xs font-bold" style="color:#f472b6; letter-spacing:0.05em;">NEW</span>':""}
              ${r?'<span class="text-xs font-semibold" style="color:#34d399;">✓ dabei</span>':""}
            </div>
            <h3 class="syne text-white leading-tight mb-1" style="font-size:1rem; font-weight:700; letter-spacing:-0.01em;">${e.title}</h3>
            <p class="text-xs mb-2" style="color:rgba(255,255,255,0.35);">
              ${t?t.name+' <span style="color:rgba(255,255,255,0.15);">·</span> '+t.city:e.locationName?e.locationName+' <span style="color:rgba(255,255,255,0.15);">·</span> '+(e.locationCity||""):""}
              <span style="margin-left:6px; color:${y?"rgba(99,102,241,0.7)":"rgba(251,146,60,0.7)"};">${y?"Konzert":"Party"}</span>
            </p>
            ${e.description?`<p class="text-xs leading-relaxed mb-3" style="color:rgba(255,255,255,0.4);">${e.description}</p>`:""}
          </div>
          <div class="flex flex-col gap-3 items-center pt-1">
            <button data-bookmark="${e.id}" title="Vormerken" style="color:${n?"#f472b6":"rgba(255,255,255,0.2)"}; background:none; border:none; cursor:pointer; font-size:1.125rem; transition:all 0.2s;">♡</button>
            <button data-going="${e.id}" title="Ich gehe hin" style="color:${r?"#34d399":"rgba(255,255,255,0.2)"}; background:none; border:none; cursor:pointer; font-size:1.125rem; transition:all 0.2s;">✓</button>
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
  `}function H(){const e=new Date,t=new Date(e.getFullYear(),e.getMonth()+N,1),n=t.getFullYear(),r=t.getMonth(),s=new Date(n,r+1,0).getDate(),d=(new Date(n,r,1).getDay()+6)%7,c=t.toLocaleDateString("de-DE",{month:"long",year:"numeric"}),y=U(),g=y.map(p=>p.date),b=y.filter(p=>l.dates.length===0||l.dates.includes(p.date));return`
    ${T()}
    <div class="glass rounded-2xl p-5 mb-5">
      <div class="flex items-center justify-between mb-5">
        <button data-cal-prev class="btn-glass w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-white">‹</button>
        <h2 class="syne font-700 text-white tracking-wide capitalize">${c}</h2>
        <button data-cal-next class="btn-glass w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-white">›</button>
      </div>
      <div class="grid grid-cols-7 gap-1 text-center mb-3">
        ${["Mo","Di","Mi","Do","Fr","Sa","So"].map(p=>`<div class="text-xs font-semibold py-1" style="color:rgba(255,255,255,0.2);">${p}</div>`).join("")}
      </div>
      <div class="grid grid-cols-7 gap-1">
        ${Array(d).fill("<div></div>").join("")}
        ${Array.from({length:s},(p,i)=>{const a=i+1,o=`${n}-${String(r+1).padStart(2,"0")}-${String(a).padStart(2,"0")}`,u=g.includes(o),x=l.dates.includes(o),I=a===e.getDate()&&r===e.getMonth()&&n===e.getFullYear(),z=new Date(o)<e&&!I;return`
            <button data-date="${o}" style="aspect-ratio:1; border-radius:12px; font-size:14px; font-weight:500; display:flex; align-items:center; justify-content:center; position:relative; transition:all 0.15s; ${z?"opacity:0.25;":""} color:${!u&&!x&&!I?"rgba(255,255,255,0.2)":"white"}; background:${x?"rgba(99,102,241,0.5)":u?"rgba(99,102,241,0.12)":"transparent"}; border:${x?"1px solid rgba(99,102,241,0.6)":u?"1px solid rgba(99,102,241,0.25)":I?"1px solid rgba(255,255,255,0.2)":"1px solid transparent"}; padding:4px; cursor:pointer;">
              ${a}
              ${u&&!x?'<span style="position:absolute;bottom:3px;left:50%;transform:translateX(-50%);width:3px;height:3px;border-radius:50%;background:#818cf8;"></span>':""}
            </button>
          `}).join("")}
      </div>
      ${l.dates.length>0?`
        <button data-clear-dates class="mt-4 w-full text-xs py-2 rounded-xl text-slate-500 hover:text-slate-300 transition-all btn-glass">
          Auswahl zurücksetzen (${l.dates.length} ${l.dates.length===1?"Tag":"Tage"})
        </button>
      `:'<p class="text-center text-xs mt-4" style="color:rgba(255,255,255,0.15);">Tage antippen zum Filtern · Mehrfachauswahl möglich</p>'}
    </div>
    <div class="space-y-3">
      ${l.dates.length>0&&b.length===0?'<p class="text-center text-slate-600 py-6 text-sm">Keine Events an den gewählten Tagen.</p>':b.map(p=>M(p)).join("")}
    </div>
  `}function G(){const e=v.filter(r=>w.includes(r.id)&&!h.includes(r.id)),n=[...v.filter(r=>h.includes(r.id)).map(r=>({...r,_status:"dabei"})),...e.map(r=>({...r,_status:"gemerkt"}))].sort((r,s)=>new Date(r.date+"T"+r.time)-new Date(s.date+"T"+s.time));return n.length===0?`
    <div class="text-center py-20 text-slate-600">
      <p class="syne text-2xl mb-2">—</p>
      <p class="text-sm">Noch keine Events gespeichert.</p>
    </div>
  `:`
    <div class="space-y-3 pt-2">
      ${n.map(r=>`
        <div style="position:relative;">
          ${M(r)}
          <div style="position:absolute; top:12px; right:44px;">
            <span style="font-size:10px; font-weight:700; padding:3px 8px; border-radius:20px; ${r._status==="dabei"?"background:rgba(52,211,153,0.15); color:#34d399; border:1px solid rgba(52,211,153,0.25);":"background:rgba(168,85,247,0.15); color:#c084fc; border:1px solid rgba(168,85,247,0.25);"}">
              ${r._status==="dabei"?"✓ dabei":"♥ gemerkt"}
            </span>
          </div>
        </div>
      `).join("")}
    </div>
  `}const k="width:100%; border-radius:12px; padding:10px 14px; font-size:14px; color:white; outline:none; background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.1); font-family:'DM Sans',sans-serif; color-scheme:dark;";function X(){const e=f.slice().sort((t,n)=>t.name.localeCompare(n.name));return`
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
              <input id="new-title" type="text" placeholder="Titel (z.B. Bandname – Releaseshow)" style="${k}" />
              <div class="flex gap-2">
                <button data-etype="konzert" class="flex-1 py-2.5 rounded-xl text-sm font-semibold syne text-white" style="background:rgba(99,102,241,0.4); border:1px solid rgba(99,102,241,0.3);">Konzert</button>
                <button data-etype="party" class="flex-1 py-2.5 rounded-xl text-sm font-semibold syne text-slate-500" style="background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.08);">Party</button>
              </div>
              <input type="hidden" id="new-type" value="konzert" />
              <div class="flex gap-2">
                <div style="flex:1; display:flex; flex-direction:column; gap:4px;">
                  <label style="font-size:11px; color:rgba(255,255,255,0.4); font-family:'DM Sans',sans-serif; padding-left:4px;">Datum</label>
                  <input id="new-date" type="text" style="width:100%; border-radius:12px; padding:10px 14px; font-size:14px; outline:none; background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.2); font-family:'DM Sans',sans-serif; color:white; min-width:0;" />
                </div>
                <div style="flex:1; display:flex; flex-direction:column; gap:4px;">
                  <label style="font-size:11px; color:rgba(255,255,255,0.4); font-family:'DM Sans',sans-serif; padding-left:4px;">Uhrzeit</label>
                  <input id="new-time" type="text" style="width:100%; border-radius:12px; padding:10px 14px; font-size:14px; outline:none; background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.2); font-family:'DM Sans',sans-serif; color:white; min-width:0;" />
                </div>
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
                <input id="new-location-name" type="text" placeholder="Name der neuen Location" style="${k}" />
                <div class="flex gap-2">
                  <button data-city-pick="Berlin" class="flex-1 py-2 rounded-xl text-sm syne font-semibold text-white" style="background:rgba(99,102,241,0.3); border:1px solid rgba(99,102,241,0.3);">Berlin</button>
                  <button data-city-pick="Leipzig" class="flex-1 py-2 rounded-xl text-sm syne font-semibold text-slate-500" style="background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.08);">Leipzig</button>
                </div>
                <input type="hidden" id="new-location-city" value="Berlin" />
              </div>
              <textarea id="new-desc" placeholder="Kurzbeschreibung: Wer? Woher? Musikrichtung?" style="${k} height:70px; resize:none;"></textarea>
              <input id="new-ticket" type="url" placeholder="Ticket-URL (optional)" style="${k}" />
              <input id="new-spotify" type="url" placeholder="Spotify-Link (optional)" style="${k}" />
              <button data-save-event class="w-full py-3 rounded-xl font-bold text-white text-sm syne transition-all hover:opacity-90" style="background:linear-gradient(135deg, rgba(99,102,241,0.7), rgba(168,85,247,0.7)); border:1px solid rgba(99,102,241,0.3);">
                Event speichern
              </button>
            </div>
          </div>

          <div id="add-location-form" class="hidden">
            <div class="space-y-3">
              <input id="new-loc-name" type="text" placeholder="Name der Location" style="${k}" />
              <div class="flex gap-2">
                <button data-loc-city-pick="Berlin" class="flex-1 py-2 rounded-xl text-sm syne font-semibold text-white" style="background:rgba(99,102,241,0.3); border:1px solid rgba(99,102,241,0.3);">Berlin</button>
                <button data-loc-city-pick="Leipzig" class="flex-1 py-2 rounded-xl text-sm syne font-semibold text-slate-500" style="background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.08);">Leipzig</button>
              </div>
              <input type="hidden" id="new-loc-city" value="Berlin" />
              <input id="new-loc-website" type="url" placeholder="Website (optional)" style="${k}" />
              <input id="new-loc-capacity" type="number" placeholder="Kapazität (optional)" style="${k}" />
              <button data-save-location class="w-full py-3 rounded-xl font-bold text-white text-sm syne transition-all hover:opacity-90" style="background:linear-gradient(135deg, rgba(99,102,241,0.7), rgba(168,85,247,0.7)); border:1px solid rgba(99,102,241,0.3);">
                Location speichern
              </button>
            </div>
          </div>

          <button data-close-add class="mt-3 w-full py-2 text-xs text-slate-600 hover:text-slate-400 transition-colors">Abbrechen</button>
        </div>
      </div>
    </div>
  `}function Z(e){const t=f.find(p=>p.id===e.locationId),[n,r]=e.time.split(":").map(Number),s=e.date.replace(/-/g,"")+"T"+String(n).padStart(2,"0")+String(r).padStart(2,"0")+"00",d=e.date.replace(/-/g,"")+"T"+String(n+2).padStart(2,"0")+String(r).padStart(2,"0")+"00",c=["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//KonzertApp//DE","BEGIN:VEVENT","UID:"+e.id+"@konzertapp","SUMMARY:"+e.title,"DTSTART:"+s,"DTEND:"+d,"LOCATION:"+(t?t.name:""),"DESCRIPTION:"+(e.description||""),"END:VEVENT","END:VCALENDAR"].join(`\r
`),y=new Blob([c],{type:"text/calendar;charset=utf-8"}),g=URL.createObjectURL(y),b=document.createElement("a");b.href=g,b.download=e.title.replace(/\s+/g,"-")+".ics",b.click(),setTimeout(()=>URL.revokeObjectURL(g),1e3)}function Q(e){const t=f.find(s=>s.id===e.locationId),n=new Date(e.date+"T12:00:00").toLocaleDateString("de-DE",{weekday:"long",day:"numeric",month:"long",year:"numeric"}),r=`${e.type==="konzert"?"🎸":"🎉"} *${e.title}*
📍 ${t?t.name+", "+t.city:""}
📅 ${n} · ${e.time} Uhr${e.description?`

`+e.description:""}${e.ticketUrl?`

Tickets: `+e.ticketUrl:""}`;window.open("https://wa.me/?text="+encodeURIComponent(r),"_blank")}function ee(){document.querySelectorAll("[data-nav]").forEach(i=>{i.addEventListener("click",()=>{E=i.dataset.nav,m()})}),document.querySelectorAll("[data-city]").forEach(i=>{i.addEventListener("click",()=>{const a=i.dataset.city;l.cities.includes(a)?l.cities.length>1&&(l.cities=l.cities.filter(o=>o!==a)):l.cities.push(a),m()})}),document.querySelectorAll("[data-type]").forEach(i=>{i.addEventListener("click",()=>{l.type=i.dataset.type,m()})});const e=document.getElementById("filter-loc-selected"),t=document.getElementById("filter-loc-dropdown");e?.addEventListener("click",i=>{i.stopPropagation(),t.classList.toggle("hidden")}),document.querySelectorAll("[data-filter-loc]").forEach(i=>{i.addEventListener("click",()=>{l.locationId=i.dataset.filterLoc,t.classList.add("hidden"),m()})});const n=document.querySelector("[data-cal-prev]"),r=document.querySelector("[data-cal-next]");n&&n.addEventListener("click",()=>{N--,m()}),r&&r.addEventListener("click",()=>{N++,m()}),document.querySelectorAll("[data-date]").forEach(i=>{i.addEventListener("click",()=>{const a=i.dataset.date;l.dates=l.dates.includes(a)?l.dates.filter(o=>o!==a):[...l.dates,a],m()})}),document.querySelector("[data-clear-dates]")?.addEventListener("click",()=>{l.dates=[],m()}),document.querySelectorAll("[data-bookmark]").forEach(i=>{i.addEventListener("click",()=>{const a=parseInt(i.dataset.bookmark);w=w.includes(a)?w.filter(o=>o!==a):[...w,a],L("bookmarked",w),m()})}),document.querySelectorAll("[data-going]").forEach(i=>{i.addEventListener("click",()=>{const a=parseInt(i.dataset.going);h=h.includes(a)?h.filter(o=>o!==a):[...h,a],L("going",h),m()})}),document.querySelectorAll("[data-share]").forEach(i=>{i.addEventListener("click",()=>{const a=v.find(o=>o.id===parseInt(i.dataset.share));a&&Q(a)})}),document.querySelectorAll("[data-ics]").forEach(i=>{i.addEventListener("click",()=>{const a=v.find(o=>o.id===parseInt(i.dataset.ics));a&&Z(a)})});const s=document.getElementById("modal-add");document.querySelector("[data-open-add]")?.addEventListener("click",()=>s.classList.remove("hidden")),document.querySelector("[data-close-add]")?.addEventListener("click",()=>s.classList.add("hidden")),document.querySelectorAll("[data-add-tab]").forEach(i=>{i.addEventListener("click",()=>{const a=i.dataset.addTab;document.getElementById("add-event-form").classList.toggle("hidden",a!=="event"),document.getElementById("add-location-form").classList.toggle("hidden",a!=="location"),document.querySelectorAll("[data-add-tab]").forEach(o=>{const u=o.dataset.addTab===a;o.style.background=u?"rgba(99,102,241,0.4)":"transparent",o.style.border=u?"1px solid rgba(99,102,241,0.3)":"none",o.style.color=u?"white":"rgba(255,255,255,0.3)"})})}),document.querySelectorAll("[data-etype]").forEach(i=>{i.addEventListener("click",()=>{document.getElementById("new-type").value=i.dataset.etype,document.querySelectorAll("[data-etype]").forEach(a=>{const o=a.dataset.etype===i.dataset.etype;a.style.background=o?"rgba(99,102,241,0.4)":"rgba(255,255,255,0.04)",a.style.border=o?"1px solid rgba(99,102,241,0.3)":"1px solid rgba(255,255,255,0.08)",a.style.color=o?"white":"rgba(255,255,255,0.3)"})})});const d=document.getElementById("add-loc-selected"),c=document.getElementById("add-loc-dropdown");d?.addEventListener("click",i=>{i.stopPropagation(),c.classList.toggle("hidden")}),document.querySelectorAll("[data-add-loc-option]").forEach(i=>{i.addEventListener("click",()=>{const a=i.dataset.addLocOption;document.getElementById("new-location").value=a==="__new__"?"":a,c.classList.add("hidden");const o=document.getElementById("new-location-custom"),u=document.getElementById("add-loc-text");a==="__new__"?(u.textContent="+ Neue Location eingeben...",u.style.color="#818cf8",o.classList.remove("hidden")):(u.textContent=i.dataset.addLocName||i.textContent.trim(),u.style.color="rgba(255,255,255,0.8)",o.classList.add("hidden"))})}),document.querySelectorAll("[data-city-pick]").forEach(i=>{i.addEventListener("click",()=>{document.getElementById("new-location-city").value=i.dataset.cityPick,document.querySelectorAll("[data-city-pick]").forEach(a=>{const o=a.dataset.cityPick===i.dataset.cityPick;a.style.background=o?"rgba(99,102,241,0.3)":"rgba(255,255,255,0.04)",a.style.border=o?"1px solid rgba(99,102,241,0.3)":"1px solid rgba(255,255,255,0.08)",a.style.color=o?"white":"rgba(255,255,255,0.3)"})})}),document.querySelectorAll("[data-loc-city-pick]").forEach(i=>{i.addEventListener("click",()=>{document.getElementById("new-loc-city").value=i.dataset.locCityPick,document.querySelectorAll("[data-loc-city-pick]").forEach(a=>{const o=a.dataset.locCityPick===i.dataset.locCityPick;a.style.background=o?"rgba(99,102,241,0.3)":"rgba(255,255,255,0.04)",a.style.border=o?"1px solid rgba(99,102,241,0.3)":"1px solid rgba(255,255,255,0.08)",a.style.color=o?"white":"rgba(255,255,255,0.3)"})})}),document.querySelector("[data-save-event]")?.addEventListener("click",async()=>{const i=document.getElementById("new-title").value.trim();let a=document.getElementById("new-date").value,o=document.getElementById("new-time").value;const u=a.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);u&&(a=`${u[3]}-${u[2].padStart(2,"0")}-${u[1].padStart(2,"0")}`),o.match(/^\d{1,2}:\d{2}$/)||(o="20:00");let x=document.getElementById("new-location").value;if(!i||!a||!o){alert("Bitte Titel, Datum und Uhrzeit angeben.");return}if(x)x=parseInt(x);else{const S=document.getElementById("new-location-name")?.value.trim();if(!S){alert("Bitte eine Location wählen oder neue Location eingeben.");return}const C={id:Date.now(),name:S,city:document.getElementById("new-location-city").value,website:"",capacity:0};f.push(C),L("locations",f),x=C.id}const I={id:Date.now(),title:i,type:document.getElementById("new-type").value,date:a,time:o,locationId:x,description:document.getElementById("new-desc").value.trim(),ticketUrl:document.getElementById("new-ticket").value.trim(),spotifyUrl:document.getElementById("new-spotify").value.trim()},z=f.find(S=>S.id===x);await P(I,z?.name||"",z?.city||""),v=await D(),s.classList.add("hidden"),m()}),document.querySelector("[data-save-location]")?.addEventListener("click",()=>{const i=document.getElementById("new-loc-name").value.trim();if(!i){alert("Bitte einen Namen eingeben.");return}const a={id:Date.now(),name:i,city:document.getElementById("new-loc-city").value,website:document.getElementById("new-loc-website").value.trim(),capacity:parseInt(document.getElementById("new-loc-capacity").value)||0};f.push(a),L("locations",f),s.classList.add("hidden"),m()}),document.addEventListener("click",()=>{t?.classList.add("hidden"),c?.classList.add("hidden")});let y=0,g=!1;document.addEventListener("touchstart",i=>{window.scrollY===0&&(y=i.touches[0].clientY,g=!0)},{passive:!0}),document.addEventListener("touchmove",i=>{if(!g)return;const a=i.touches[0].clientY-y,o=document.getElementById("ptr-indicator");o&&a>0&&(o.style.height=Math.min(a/2,50)+"px")},{passive:!0}),document.addEventListener("touchend",async i=>{if(!g)return;g=!1;const a=i.changedTouches[0].clientY-y,o=document.getElementById("ptr-indicator");a>80?(o&&(o.innerHTML="↻ Wird aktualisiert..."),v=await D(),m()):o&&(o.style.height="0")},{passive:!0});const b=document.getElementById("new-date"),p=document.getElementById("new-time");b&&(b.placeholder="TT.MM.JJJJ",b.addEventListener("input",i=>{let a=i.target.value.replace(/\D/g,"");a.length>=3&&(a=a.slice(0,2)+"."+a.slice(2)),a.length>=6&&(a=a.slice(0,5)+"."+a.slice(5,9)),i.target.value=a})),p&&(p.placeholder="20:00",p.addEventListener("input",i=>{let a=i.target.value.replace(/\D/g,"");a.length>=3&&(a=a.slice(0,2)+":"+a.slice(2,4)),i.target.value=a}))}const te=document.getElementById("app");F(te);R();"serviceWorker"in navigator&&location.hostname!=="localhost"&&navigator.serviceWorker.register("/konzert-app/sw.js");
