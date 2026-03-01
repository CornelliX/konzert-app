(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const i of document.querySelectorAll('link[rel="modulepreload"]'))o(i);new MutationObserver(i=>{for(const a of i)if(a.type==="childList")for(const n of a.addedNodes)n.tagName==="LINK"&&n.rel==="modulepreload"&&o(n)}).observe(document,{childList:!0,subtree:!0});function s(i){const a={};return i.integrity&&(a.integrity=i.integrity),i.referrerPolicy&&(a.referrerPolicy=i.referrerPolicy),i.crossOrigin==="use-credentials"?a.credentials="include":i.crossOrigin==="anonymous"?a.credentials="omit":a.credentials="same-origin",a}function o(i){if(i.ep)return;i.ep=!0;const a=s(i);fetch(i.href,a)}})();function v(e){const t=localStorage.getItem(e);return t?JSON.parse(t):null}function h(e,t){localStorage.setItem(e,JSON.stringify(t))}function C(){const e=v("locations");if(e)return e;const t=[{id:1,name:"Lido",city:"Berlin",website:"lido-berlin.de",capacity:400},{id:2,name:"SO36",city:"Berlin",website:"so36.com",capacity:600},{id:3,name:"Festsaal Kreuzberg",city:"Berlin",website:"festsaal-kreuzberg.de",capacity:1200},{id:4,name:"Privatclub",city:"Berlin",website:"privatclub-berlin.de",capacity:250},{id:5,name:"Astra Kulturhaus",city:"Berlin",website:"astra-berlin.de",capacity:1800},{id:6,name:"Frannz Club",city:"Berlin",website:"frannz.eu",capacity:350},{id:7,name:"Monarch",city:"Berlin",website:"kottimonarch.de",capacity:150},{id:8,name:"Musik & Frieden",city:"Berlin",website:"musikundfrieden.de",capacity:700},{id:9,name:"Wild at Heart",city:"Berlin",website:"wildatheartberlin.de",capacity:280},{id:10,name:"Columbia Theater",city:"Berlin",website:"columbia-theater.de",capacity:800},{id:11,name:"Schokoladen",city:"Berlin",website:"schokoladen-mitte.de",capacity:150},{id:12,name:"Madame Claude",city:"Berlin",website:"madameclaude.de",capacity:100},{id:13,name:"Conne Island",city:"Leipzig",website:"conne-island.de",capacity:600},{id:14,name:"Werk 2",city:"Leipzig",website:"werk-2.de",capacity:500},{id:15,name:"Täubchenthal",city:"Leipzig",website:"taeubchenthal.com",capacity:1200},{id:16,name:"Felsenkeller",city:"Leipzig",website:"felsenkeller-leipzig.com",capacity:2e3},{id:17,name:"UT Connewitz",city:"Leipzig",website:"utconnewitz.de",capacity:350},{id:18,name:"Moritzbastei",city:"Leipzig",website:"moritzbastei.de",capacity:500},{id:19,name:"Horns Erben",city:"Leipzig",website:"horns-erben.de",capacity:150},{id:20,name:"Ilses Erika",city:"Leipzig",website:"",capacity:200},{id:21,name:"Urban Spree",city:"Berlin",website:"urbanspree.com",capacity:250},{id:22,name:"Gretchen",city:"Berlin",website:"gretchen-club.de",capacity:500},{id:23,name:"Supamolly",city:"Berlin",website:"supamolly.de",capacity:150},{id:24,name:"Kantine am Berghain",city:"Berlin",website:"berghain.berlin",capacity:200},{id:25,name:"Tempodrom",city:"Berlin",website:"tempodrom.de",capacity:4200}];return h("locations",t),t}async function M(){try{const e=await fetch("./events.json");if(e.ok){const t=await e.json(),s=v("manual_events")||[];return[...t,...s]}}catch{console.log("events.json nicht gefunden")}return v("manual_events")||[]}let y=C(),m=[],I=null,l={cities:["Berlin","Leipzig"],type:"alle",locationId:"alle",dates:[]},g=v("bookmarked")||[],f=v("going")||[],S=v("seenEvents")||[],x="liste",z=0;async function O(e){I=e,m=await M(),p()}function T(e){return!S.includes(e.id)}function q(){S=m.map(e=>e.id),h("seenEvents",S)}function p(){const e=m.filter(t=>T(t)).length;I.innerHTML=`
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
      .glass-strong {
        background: rgba(255,255,255,0.07);
        backdrop-filter: blur(40px);
        -webkit-backdrop-filter: blur(40px);
        border: 1px solid rgba(255,255,255,0.12);
      }
      .glow-indigo { box-shadow: 0 0 20px rgba(99,102,241,0.15); }
      .glow-pink { box-shadow: 0 0 20px rgba(244,114,182,0.15); }
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
      .card-hover {
        transition: transform 0.2s ease, box-shadow 0.2s ease;
      }
      .card-hover:hover {
        transform: translateY(-1px);
      }
      input, select, textarea {
        color-scheme: dark;
      }
      input::placeholder, textarea::placeholder {
        color: rgba(255,255,255,0.2);
      }
      .noise {
        position: relative;
      }
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
    </style>

    <div class="noise min-h-screen" style="background: linear-gradient(145deg, #080b14 0%, #0c1120 40%, #0e0818 70%, #07100f 100%);">

      <!-- Ambient glow blobs -->
      <div style="position:fixed; top:-10%; left:-10%; width:50vw; height:50vw; background:radial-gradient(circle, rgba(99,102,241,0.08) 0%, transparent 70%); pointer-events:none; z-index:0;"></div>
      <div style="position:fixed; bottom:-10%; right:-10%; width:40vw; height:40vw; background:radial-gradient(circle, rgba(168,85,247,0.07) 0%, transparent 70%); pointer-events:none; z-index:0;"></div>
      <div style="position:fixed; top:40%; left:30%; width:30vw; height:30vw; background:radial-gradient(circle, rgba(20,184,166,0.04) 0%, transparent 70%); pointer-events:none; z-index:0;"></div>

      <div class="relative z-10 max-w-xl mx-auto px-4 pb-28">
        ${U(e)}
        ${F()}
        ${x==="liste"?K():""}
        ${x==="kalender"?R():""}
        ${x==="gemerkt"?V():""}
      </div>
    </div>
    ${P()}
    ${W()}
  `,J(),e>0&&x==="liste"&&setTimeout(()=>q(),3e3)}function U(e){return`
    <div class="pt-10 pb-6">
      <div class="flex items-start justify-between">
        <div>
          <p class="text-xs font-semibold tracking-[0.25em] uppercase mb-2" style="color: rgba(99,102,241,0.7);">Konzert & Club</p>
          <h1 class="syne text-4xl font-800 leading-none" style="color: white; letter-spacing: -0.02em;">
            Berlin<span style="color: rgba(255,255,255,0.2);">&thinsp;/&thinsp;</span>Leipzig
          </h1>
        </div>
        ${e>0?`
          <div class="mt-1">
            <span class="text-xs font-semibold px-3 py-1.5 rounded-full" style="background: rgba(244,114,182,0.15); border: 1px solid rgba(244,114,182,0.25); color: #f472b6;">
              ${e} neu
            </span>
          </div>
        `:""}
      </div>
    </div>
  `}function F(){return`
    <div class="flex gap-1.5 mb-6 p-1 rounded-2xl glass">
      ${[{id:"liste",label:"Events"},{id:"kalender",label:"Kalender"},{id:"gemerkt",label:`Gemerkt${g.length>0?" · "+g.length:""}`}].map(t=>`
        <button data-nav="${t.id}" class="flex-1 py-2.5 rounded-xl text-sm font-semibold syne transition-all duration-200 ${x===t.id?"text-white":"text-slate-500 hover:text-slate-300"}" ${x===t.id?'style="background: linear-gradient(135deg, rgba(99,102,241,0.5), rgba(168,85,247,0.5)); border: 1px solid rgba(99,102,241,0.3); backdrop-filter: blur(10px);"':""}>
          ${t.label}
        </button>
      `).join("")}
    </div>
  `}function B(){const e=y.filter(t=>l.cities.includes(t.city)).sort((t,s)=>t.name.localeCompare(s.name));return`
    <div class="glass rounded-2xl p-4 mb-5 space-y-3">
      <div class="flex gap-2">
        ${["Berlin","Leipzig"].map(t=>`
          <button data-city="${t}" class="flex-1 py-2 rounded-xl text-sm font-semibold syne tracking-wide transition-all duration-200 ${l.cities.includes(t)?"text-white":"text-slate-600 hover:text-slate-400"}" style="${l.cities.includes(t)?"background: rgba(99,102,241,0.2); border: 1px solid rgba(99,102,241,0.35);":"background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06);"}">
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

      <select data-location-filter class="w-full rounded-xl px-3 py-2.5 text-sm text-slate-400 appearance-none outline-none" style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08); color: rgba(255,255,255,0.6);">
        <option value="alle">Alle Locations</option>
        ${e.map(t=>`<option value="${t.id}" ${l.locationId==t.id?"selected":""}>${t.name} (${t.city})</option>`).join("")}
      </select>
    </div>
  `}function A(){return m.filter(e=>{const t=y.find(s=>s.id===e.locationId);return!(!t||!l.cities.includes(t.city)||l.type!=="alle"&&e.type!==l.type||l.locationId!=="alle"&&e.locationId!=l.locationId)}).sort((e,t)=>new Date(e.date+"T"+e.time)-new Date(t.date+"T"+t.time))}function K(){const e=A(),t=new Date;t.setHours(0,0,0,0);const s={};return e.forEach(o=>{const i=new Date(o.date+"T12:00:00"),a=Math.floor((i-t)/864e5);let n;a===0?n="Heute":a===1?n="Morgen":a<=7?n="Diese Woche":a<=14?n="Nächste Woche":n=i.toLocaleDateString("de-DE",{month:"long",year:"numeric"}),s[n]||(s[n]=[]),s[n].push(o)}),Object.keys(s).length===0?`
      ${B()}
      <div class="text-center py-20 text-slate-600">
        <p class="syne text-2xl mb-2">—</p>
        <p class="text-sm">Keine Events gefunden.</p>
      </div>
    `:`
    ${B()}
    <div class="space-y-8">
      ${Object.entries(s).map(([o,i])=>`
        <div>
          <div class="flex items-center gap-3 mb-4">
            <div class="h-px flex-1" style="background: rgba(255,255,255,0.06);"></div>
            <span class="syne text-xs font-700 tracking-widest uppercase" style="color: rgba(255,255,255,0.25);">${o}</span>
            <div class="h-px flex-1" style="background: rgba(255,255,255,0.06);"></div>
          </div>
          <div class="space-y-3">
            ${i.map(a=>D(a)).join("")}
          </div>
        </div>
      `).join("")}
    </div>
  `}function D(e){const t=y.find(d=>d.id===e.locationId),s=g.includes(e.id),o=f.includes(e.id),i=T(e),n=new Date(e.date+"T12:00:00").toLocaleDateString("de-DE",{weekday:"short",day:"numeric",month:"short"}),r=e.type==="konzert",c=r?"rgba(99,102,241,":"rgba(251,146,60,",u=r?"#818cf8":"#fb923c";return`
    <div class="card-hover rounded-2xl overflow-hidden" style="
      background: rgba(255,255,255,0.03);
      border: 1px solid ${o?"rgba(52,211,153,0.3)":c+"0.12)"};
      box-shadow: 0 4px 24px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05);
    ">
      <!-- Top accent line -->
      <div style="height: 2px; background: linear-gradient(90deg, ${u}, transparent);"></div>

      <div class="p-4">
        <div class="flex justify-between items-start gap-3">
          <div class="flex-1 min-w-0">

            <!-- Date & badges row -->
            <div class="flex items-center gap-2 mb-2 flex-wrap">
              <span class="syne text-xs font-700" style="color: ${u};">${n} · ${e.time}</span>
              ${i?'<span class="text-xs font-bold" style="color: #f472b6; letter-spacing: 0.05em;">NEW</span>':""}
              ${o?'<span class="text-xs font-semibold" style="color: #34d399;">✓ dabei</span>':""}
            </div>

            <!-- Title -->
            <h3 class="syne font-700 text-white leading-tight mb-1" style="font-size: 1rem; letter-spacing: -0.01em;">${e.title}</h3>

            <!-- Location -->
            <p class="text-xs mb-2" style="color: rgba(255,255,255,0.35);">
              ${t?t.name+' <span style="color:rgba(255,255,255,0.15);">·</span> '+t.city:""}
              ${e.type==="konzert"?'<span style="margin-left:6px; color: rgba(99,102,241,0.7);">Konzert</span>':'<span style="margin-left:6px; color: rgba(251,146,60,0.7);">Party</span>'}
            </p>

            <!-- Artist bio -->
            ${e.description?`
              <p class="text-xs leading-relaxed mb-3" style="color: rgba(255,255,255,0.4);">${e.description}</p>
            `:""}

          </div>

          <!-- Action icons -->
          <div class="flex flex-col gap-3 items-center pt-1">
            <button data-bookmark="${e.id}" title="Vormerken" class="text-lg transition-all duration-200 hover:scale-110" style="color: ${s?"#f472b6":"rgba(255,255,255,0.2)"};">♡</button>
            <button data-going="${e.id}" title="Ich gehe hin" class="text-lg transition-all duration-200 hover:scale-110" style="color: ${o?"#34d399":"rgba(255,255,255,0.2)"};">✓</button>
          </div>
        </div>

        <!-- Action buttons -->
        <div class="flex gap-2 flex-wrap mt-1">
          ${e.ticketUrl?`
            <a href="${e.ticketUrl}" target="_blank" class="btn-glass text-xs font-medium px-3 py-1.5 rounded-lg text-slate-400 hover:text-white inline-block">
              Tickets →
            </a>
          `:""}
          ${e.spotifyUrl?`
            <a href="${e.spotifyUrl}" target="_blank" class="btn-glass text-xs font-medium px-3 py-1.5 rounded-lg inline-flex items-center gap-1.5" style="color: #1db954; border-color: rgba(29,185,84,0.2);">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="#1db954"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/></svg>
              Spotify
            </a>
          `:""}
          <button data-share="${e.id}" class="btn-glass text-xs font-medium px-3 py-1.5 rounded-lg text-slate-500 hover:text-slate-300">
            Teilen
          </button>
          ${s?`
            <button data-ics="${e.id}" class="btn-glass text-xs font-medium px-3 py-1.5 rounded-lg text-slate-500 hover:text-slate-300">
              + Kalender
            </button>
          `:""}
        </div>
      </div>
    </div>
  `}function R(){const e=new Date,t=new Date(e.getFullYear(),e.getMonth()+z,1),s=t.getFullYear(),o=t.getMonth(),i=new Date(s,o+1,0).getDate(),a=(new Date(s,o,1).getDay()+6)%7,n=t.toLocaleDateString("de-DE",{month:"long",year:"numeric"}),r=A(),c=r.map(d=>d.date),u=r.filter(d=>l.dates.length===0?!0:l.dates.includes(d.date));return`
    ${B()}
    <div class="glass rounded-2xl p-5 mb-5">
      <div class="flex items-center justify-between mb-5">
        <button data-cal-prev class="btn-glass w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-white">‹</button>
        <h2 class="syne font-700 text-white tracking-wide capitalize">${n}</h2>
        <button data-cal-next class="btn-glass w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-white">›</button>
      </div>

      <div class="grid grid-cols-7 gap-1 text-center mb-3">
        ${["Mo","Di","Mi","Do","Fr","Sa","So"].map(d=>`
          <div class="text-xs font-semibold py-1" style="color: rgba(255,255,255,0.2);">${d}</div>
        `).join("")}
      </div>

      <div class="grid grid-cols-7 gap-1">
        ${Array(a).fill("<div></div>").join("")}
        ${Array.from({length:i},(d,N)=>{const k=N+1,w=`${s}-${String(o+1).padStart(2,"0")}-${String(k).padStart(2,"0")}`,$=c.includes(w),E=l.dates.includes(w),L=k===e.getDate()&&o===e.getMonth()&&s===e.getFullYear(),j=new Date(w)<e&&!L;return`
            <button data-date="${w}" class="aspect-square rounded-xl text-sm font-medium flex items-center justify-center relative transition-all duration-150
              ${j?"opacity-25":""}
              ${!$&&!E&&!L?"text-slate-700":"text-white"}
            " style="${E?"background: rgba(99,102,241,0.5); border: 1px solid rgba(99,102,241,0.6);":$?"background: rgba(99,102,241,0.12); border: 1px solid rgba(99,102,241,0.25);":L?"border: 1px solid rgba(255,255,255,0.2);":""}">
              ${k}
              ${$&&!E?'<span style="position:absolute;bottom:3px;left:50%;transform:translateX(-50%);width:3px;height:3px;border-radius:50%;background:#818cf8;"></span>':""}
            </button>
          `}).join("")}
      </div>

      ${l.dates.length>0?`
        <button data-clear-dates class="mt-4 w-full text-xs py-2 rounded-xl text-slate-500 hover:text-slate-300 transition-all btn-glass">
          Auswahl zurücksetzen (${l.dates.length} ${l.dates.length===1?"Tag":"Tage"})
        </button>
      `:'<p class="text-center text-xs mt-4" style="color: rgba(255,255,255,0.15);">Tage antippen zum Filtern · Mehrfachauswahl möglich</p>'}
    </div>

    <div class="space-y-3">
      ${l.dates.length>0&&u.length===0?'<p class="text-center text-slate-600 py-6 text-sm">Keine Events an den gewählten Tagen.</p>':u.map(d=>D(d)).join("")}
    </div>
  `}function V(){const e=m.filter(o=>g.includes(o.id)),t=m.filter(o=>f.includes(o.id)),s=(o,i,a)=>`
    <div>
      <div class="flex items-center gap-3 mb-4">
        <div class="h-px flex-1" style="background: rgba(255,255,255,0.06);"></div>
        <span class="syne text-xs font-700 tracking-widest uppercase" style="color: rgba(255,255,255,0.25);">${o}</span>
        <div class="h-px flex-1" style="background: rgba(255,255,255,0.06);"></div>
      </div>
      ${i.length===0?`<p class="text-slate-700 text-sm py-4 text-center">${a}</p>`:`<div class="space-y-3">${i.map(n=>D(n)).join("")}</div>`}
    </div>
  `;return`
    <div class="space-y-8 pt-2">
      ${s("Dabei · "+t.length,t,"Noch keine Events.")}
      ${s("Vorgemerkt · "+e.length,e,"Noch keine Events.")}
    </div>
  `}function P(){return`
    <button data-open-add class="fixed bottom-6 right-6 w-14 h-14 text-white rounded-2xl text-2xl shadow-2xl flex items-center justify-center z-50 transition-all hover:scale-105 active:scale-95 syne font-300" style="background: linear-gradient(135deg, rgba(99,102,241,0.8), rgba(168,85,247,0.8)); backdrop-filter: blur(20px); border: 1px solid rgba(255,255,255,0.15); box-shadow: 0 8px 32px rgba(99,102,241,0.3);">
      +
    </button>
  `}const b=`
  width: 100%;
  border-radius: 12px;
  padding: 10px 14px;
  font-size: 14px;
  color: white;
  outline: none;
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.1);
  font-family: 'DM Sans', sans-serif;
`;function W(){return`
    <div id="modal-add" class="hidden fixed inset-0 z-50 overflow-y-auto scrollbar-hide" style="background: rgba(0,0,0,0.8); backdrop-filter: blur(8px);">
      <div class="max-w-lg mx-auto mt-8 mb-12 mx-4 rounded-3xl overflow-hidden" style="background: rgba(12,17,32,0.95); border: 1px solid rgba(255,255,255,0.1); box-shadow: 0 24px 80px rgba(0,0,0,0.6);">

        <div class="px-6 py-5" style="background: linear-gradient(135deg, rgba(99,102,241,0.15), rgba(168,85,247,0.15)); border-bottom: 1px solid rgba(255,255,255,0.06);">
          <h2 class="syne text-xl font-800 text-white">Hinzufügen</h2>
          <p class="text-xs mt-0.5" style="color: rgba(255,255,255,0.35);">Event oder Location eintragen</p>
        </div>

        <div class="p-6">
          <div class="flex gap-1.5 mb-5 p-1 rounded-xl glass">
            <button data-add-tab="event" id="tab-event" class="flex-1 py-2 rounded-lg text-sm font-semibold syne text-white" style="background: rgba(99,102,241,0.4); border: 1px solid rgba(99,102,241,0.3);">Event</button>
            <button data-add-tab="location" id="tab-location" class="flex-1 py-2 rounded-lg text-sm font-semibold syne text-slate-500">Location</button>
          </div>

          <div id="add-event-form">${_()}</div>
          <div id="add-location-form" class="hidden">${H()}</div>

          <button data-close-add class="mt-3 w-full py-2 text-xs text-slate-600 hover:text-slate-400 transition-colors">Abbrechen</button>
        </div>
      </div>
    </div>
  `}function _(){return`
    <div class="space-y-3">
      <input id="new-title" type="text" placeholder="Titel (z.B. Bandname – Releaseshow)" style="${b}" />
      <div class="flex gap-2">
        <select id="new-type" style="${b}">
          <option value="konzert">Konzert</option>
          <option value="party">Party</option>
        </select>
      </div>
      <div class="flex gap-2">
        <input id="new-date" type="date" style="${b} flex: 1;" />
        <input id="new-time" type="time" style="${b} flex: 1;" />
      </div>
      <select id="new-location" style="${b}">
        <option value="">Location wählen...</option>
        ${y.sort((e,t)=>e.name.localeCompare(t.name)).map(e=>`<option value="${e.id}">${e.name} (${e.city})</option>`).join("")}
      </select>
      <textarea id="new-desc" placeholder="Kurzbeschreibung: Wer? Woher? Musikrichtung?" style="${b} height: 70px; resize: none;"></textarea>
      <input id="new-ticket" type="url" placeholder="Ticket-URL (optional)" style="${b}" />
      <input id="new-spotify" type="url" placeholder="Spotify-Link (optional)" style="${b}" />
      <button data-save-event class="w-full py-3 rounded-xl font-bold text-white text-sm syne transition-all hover:opacity-90" style="background: linear-gradient(135deg, rgba(99,102,241,0.7), rgba(168,85,247,0.7)); border: 1px solid rgba(99,102,241,0.3);">
        Event speichern
      </button>
    </div>
  `}function H(){return`
    <div class="space-y-3">
      <input id="new-loc-name" type="text" placeholder="Name der Location" style="${b}" />
      <select id="new-loc-city" style="${b}">
        <option value="Berlin">Berlin</option>
        <option value="Leipzig">Leipzig</option>
      </select>
      <input id="new-loc-website" type="url" placeholder="Website (optional)" style="${b}" />
      <input id="new-loc-capacity" type="number" placeholder="Kapazität (optional)" style="${b}" />
      <button data-save-location class="w-full py-3 rounded-xl font-bold text-white text-sm syne transition-all hover:opacity-90" style="background: linear-gradient(135deg, rgba(99,102,241,0.7), rgba(168,85,247,0.7)); border: 1px solid rgba(99,102,241,0.3);">
        Location speichern
      </button>
    </div>
  `}function G(e){const t=y.find(d=>d.id===e.locationId),[s,o]=e.time.split(":").map(Number),i=e.date.replace(/-/g,"")+"T"+String(s).padStart(2,"0")+String(o).padStart(2,"0")+"00",a=e.date.replace(/-/g,"")+"T"+String(s+2).padStart(2,"0")+String(o).padStart(2,"0")+"00",n=["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//KonzertApp//DE","BEGIN:VEVENT","UID:"+e.id+"@konzertapp","SUMMARY:"+e.title,"DTSTART:"+i,"DTEND:"+a,"LOCATION:"+(t?t.name:""),"DESCRIPTION:"+(e.description||""),"END:VEVENT","END:VCALENDAR"].join(`\r
`),r=new Blob([n],{type:"text/calendar;charset=utf-8"}),c=URL.createObjectURL(r),u=document.createElement("a");u.href=c,u.download=e.title.replace(/\s+/g,"-")+".ics",u.click(),setTimeout(()=>URL.revokeObjectURL(c),1e3)}function Y(e){const t=y.find(i=>i.id===e.locationId),s=new Date(e.date+"T12:00:00").toLocaleDateString("de-DE",{weekday:"long",day:"numeric",month:"long",year:"numeric"}),o=`${e.type==="konzert"?"🎸":"🎉"} *${e.title}*
📍 ${t?t.name+", "+t.city:""}
📅 ${s} · ${e.time} Uhr${e.description?`

`+e.description:""}${e.ticketUrl?`

Tickets: `+e.ticketUrl:""}`;window.open("https://wa.me/?text="+encodeURIComponent(o),"_blank")}function J(){document.querySelectorAll("[data-nav]").forEach(a=>{a.addEventListener("click",()=>{x=a.dataset.nav,p()})}),document.querySelectorAll("[data-city]").forEach(a=>{a.addEventListener("click",()=>{const n=a.dataset.city;l.cities.includes(n)?l.cities.length>1&&(l.cities=l.cities.filter(r=>r!==n)):l.cities.push(n),p()})}),document.querySelectorAll("[data-type]").forEach(a=>{a.addEventListener("click",()=>{l.type=a.dataset.type,p()})});const e=document.querySelector("[data-location-filter]");e&&e.addEventListener("change",()=>{l.locationId=e.value,p()});const t=document.querySelector("[data-cal-prev]"),s=document.querySelector("[data-cal-next]");t&&t.addEventListener("click",()=>{z--,p()}),s&&s.addEventListener("click",()=>{z++,p()}),document.querySelectorAll("[data-date]").forEach(a=>{a.addEventListener("click",()=>{const n=a.dataset.date;l.dates.includes(n)?l.dates=l.dates.filter(r=>r!==n):l.dates.push(n),p()})});const o=document.querySelector("[data-clear-dates]");o&&o.addEventListener("click",()=>{l.dates=[],p()}),document.querySelectorAll("[data-bookmark]").forEach(a=>{a.addEventListener("click",()=>{const n=parseInt(a.dataset.bookmark);g=g.includes(n)?g.filter(r=>r!==n):[...g,n],h("bookmarked",g),p()})}),document.querySelectorAll("[data-going]").forEach(a=>{a.addEventListener("click",()=>{const n=parseInt(a.dataset.going);f=f.includes(n)?f.filter(r=>r!==n):[...f,n],h("going",f),p()})}),document.querySelectorAll("[data-share]").forEach(a=>{a.addEventListener("click",()=>{const n=m.find(r=>r.id===parseInt(a.dataset.share));n&&Y(n)})}),document.querySelectorAll("[data-ics]").forEach(a=>{a.addEventListener("click",()=>{const n=m.find(r=>r.id===parseInt(a.dataset.ics));n&&G(n)})});const i=document.getElementById("modal-add");document.querySelector("[data-open-add]")?.addEventListener("click",()=>i.classList.remove("hidden")),document.querySelector("[data-close-add]")?.addEventListener("click",()=>i.classList.add("hidden")),document.querySelectorAll("[data-add-tab]").forEach(a=>{a.addEventListener("click",()=>{const n=a.dataset.addTab;document.getElementById("add-event-form").classList.toggle("hidden",n!=="event"),document.getElementById("add-location-form").classList.toggle("hidden",n!=="location"),document.querySelectorAll("[data-add-tab]").forEach(r=>{const c=r.dataset.addTab===n;r.style.background=c?"rgba(99,102,241,0.4)":"transparent",r.style.border=c?"1px solid rgba(99,102,241,0.3)":"none",r.style.color=c?"white":"rgba(255,255,255,0.3)"})})}),document.querySelector("[data-save-event]")?.addEventListener("click",()=>{const a=document.getElementById("new-title").value.trim(),n=document.getElementById("new-date").value,r=document.getElementById("new-time").value,c=parseInt(document.getElementById("new-location").value);if(!a||!n||!r||!c){alert("Bitte Titel, Datum, Uhrzeit und Location angeben.");return}const u={id:Date.now(),title:a,type:document.getElementById("new-type").value,date:n,time:r,locationId:c,description:document.getElementById("new-desc").value.trim(),ticketUrl:document.getElementById("new-ticket").value.trim(),spotifyUrl:document.getElementById("new-spotify").value.trim(),source:"manual"},d=v("manual_events")||[];d.push(u),h("manual_events",d),m.push(u),i.classList.add("hidden"),p()}),document.querySelector("[data-save-location]")?.addEventListener("click",()=>{const a=document.getElementById("new-loc-name").value.trim();if(!a){alert("Bitte einen Namen eingeben.");return}const n={id:Date.now(),name:a,city:document.getElementById("new-loc-city").value,website:document.getElementById("new-loc-website").value.trim(),capacity:parseInt(document.getElementById("new-loc-capacity").value)||0};y.push(n),h("locations",y),i.classList.add("hidden"),p()})}const X=document.getElementById("app");O(X);
