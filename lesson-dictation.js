"use strict";
(function(){
 const css=`
 .guided-overlay{position:fixed;inset:0;z-index:1200;overflow:auto;padding:14px;background:radial-gradient(circle at 8% 8%,#fff0bd,transparent 28%),linear-gradient(145deg,#17356b,#267ac8 55%,#27a9b7)}
 .guided-card{max-width:720px;margin:10px auto;padding:18px;border-radius:26px;background:rgba(255,255,255,.97);box-shadow:0 18px 50px #081b3e55}
 .guided-head{display:flex;align-items:center;justify-content:space-between;gap:8px}.guided-title{font-size:19px;color:#17356b;font-weight:900}
 .guided-stage{margin:16px 0;padding:20px 16px;min-height:190px;border-radius:23px;background:linear-gradient(145deg,#f0f7ff,#fff8e6);box-shadow:inset 0 2px 4px #fff,0 8px 18px #17356b18;font-size:22px;line-height:2.5;text-align:justify}
 .guided-word{display:inline;border-radius:8px;padding:2px 1px;transition:background .15s,color .15s,box-shadow .15s}
 .guided-word.focus-word{color:#174c9b;font-weight:900;text-decoration:underline;text-decoration-color:#f3b72e;text-decoration-thickness:2px;text-underline-offset:5px}
 .guided-word.active-word{background:linear-gradient(120deg,#ffe28a,#ffc34e);color:#17356b;box-shadow:0 3px 0 #e2a52e,0 0 0 3px #ffdf8a66;padding:3px 5px}
 .guided-controls{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}
 .guided-controls button{border:0;border-radius:14px;padding:12px;background:linear-gradient(135deg,#1d63b7,#2c9fbc);color:white;font:inherit;font-weight:bold}
 .guided-controls button.secondary{background:#edf3ff;color:#1d4d87;border:1px solid #d8e5fa}
 .guided-speed{display:flex;align-items:center;gap:10px;margin:13px 0;padding:10px 13px;border-radius:14px;background:#f3f7ff;color:#24456f;font-size:13px}
 .guided-speed input{flex:1;accent-color:#2878df}
 .guided-focus{display:flex;flex-wrap:wrap;gap:7px;margin:10px 0}
 .guided-chip{padding:5px 10px;border-radius:20px;background:#fff0c5;color:#805600;font-size:12px;font-weight:bold}
 .guided-status{font-size:12px;color:#60718b;min-height:24px}
 @media print{.guided-overlay{display:none!important}}
 `;
 const style=document.createElement("style");style.textContent=css;document.head.append(style);
 let overlay=null,activeUtterance=null,playing=false,tokenTimer=null,wordIndex=0,rate=0.72,activeWords=[],wordSpans=[];
 const norm=s=>String(s||"").replace(/[يى]/g,"ی").replace(/ك/g,"ک").replace(/[ًٌٍَُِّْٰـ]/g,"").replace(/[\u200c\s]/g,"");
 function duck(on){if(typeof window.EMLAY_DUCK_MUSIC==="function")window.EMLAY_DUCK_MUSIC(on);}
 function getVoice(){const vs=speechSynthesis.getVoices();return vs.find(v=>/^fa(-|_)/i.test(v.lang))||vs.find(v=>/persian|فارسی/i.test(v.name))||null;}
 function stop(){playing=false;if(tokenTimer)clearInterval(tokenTimer);tokenTimer=null;if("speechSynthesis"in window)speechSynthesis.cancel();activeUtterance=null;duck(false);}
 function buildStage(text,focusWords){
   const stage=overlay.querySelector(".guided-stage");stage.innerHTML="";wordSpans=[];
   const tokens=text.match(/\s+|[^\s]+/g)||[];
   tokens.forEach(token=>{if(/^\s+$/.test(token)){stage.append(document.createTextNode(token));return;}
     const span=document.createElement("span");span.className="guided-word";span.textContent=token;
     if(focusWords.some(w=>norm(token.replace(/[،؛.!؟:»«()]/g,""))===norm(w)))span.classList.add("focus-word");
     stage.append(span);wordSpans.push(span);
   });
 }
 function clearActive(){wordSpans.forEach(s=>s.classList.remove("active-word"));}
 function highlight(i){clearActive();if(wordSpans[i]){wordSpans[i].classList.add("active-word");wordSpans[i].scrollIntoView({block:"nearest",behavior:"smooth"});}}
 function fallbackHighlight(totalMs){
   if(tokenTimer)clearInterval(tokenTimer);wordIndex=0;const step=Math.max(250,totalMs/Math.max(1,wordSpans.length));
   highlight(0);tokenTimer=setInterval(()=>{wordIndex++;if(wordIndex>=wordSpans.length){clearInterval(tokenTimer);tokenTimer=null;return;}highlight(wordIndex);},step);
 }
 function speak(text){
   if(!("speechSynthesis"in window)||typeof SpeechSynthesisUtterance!=="function"){overlay.querySelector(".guided-status").textContent="گفتار فارسی در این گوشی در دسترس نیست؛ صدای فارسی سیستم را نصب یا فعال کن.";return;}
   stop();playing=true;duck(true);const status=overlay.querySelector(".guided-status");
   const u=new SpeechSynthesisUtterance(text);activeUtterance=u;u.lang="fa-IR";u.rate=rate;u.pitch=1;
   const voice=getVoice();if(voice)u.voice=voice;
   const estimated=Math.max(2200,(text.split(/\s+/).length*430)/rate);
   fallbackHighlight(estimated);
   u.onboundary=e=>{if(e.name==="word"&&typeof e.charIndex==="number"){let count=0;for(let i=0;i<wordSpans.length;i++){const pos=wordSpans[i].textContent;const ix=text.indexOf(pos,count);if(ix>=0){count=ix+pos.length;if(ix<=e.charIndex){highlight(i);}}}}};
   u.onend=()=>{stop();status.textContent="خواندن این بخش تمام شد؛ می‌توانی دوباره گوش بدهی یا به بخش بعد بروی.";};
   u.onerror=()=>{stop();status.textContent="پخش صدا متوقف شد. صدای فارسی گوشی را بررسی کن.";};
   status.textContent="هم‌زمان با خواندن، واژه‌های مهم را دنبال کن.";speechSynthesis.speak(u);
 }
 function open(){
   if(!window.EMLAY_DICTATION_TEXTS||!window.EMLAY_SELECTED_LESSON){alert("ابتدا یک درس را انتخاب کن.");return;}
   const lesson=window.EMLAY_SELECTED_LESSON,items=window.EMLAY_DICTATION_TEXTS[String(lesson.id)]||[];
   if(!items.length){alert("متن آموزشی این درس آماده نیست.");return;}
   stop();overlay=document.createElement("section");overlay.className="guided-overlay";overlay.dir="rtl";
   overlay.innerHTML=`<div class="guided-card"><div class="guided-head"><span class="guided-title">🌟 آموزش شنیداری و دیداری املا</span><button class="back-button" id="guidedExit">خروج</button></div><p class="practice-muted">درس ${lesson.id}: ${lesson.title} · متن آرام ظاهر می‌شود و واژه‌های املایی برجسته می‌شوند.</p><div class="guided-focus" id="guidedFocus"></div><div class="guided-stage" id="guidedStage"></div><div class="guided-speed"><span>سرعت نمایش و خواندن</span><input id="guidedRate" type="range" min=".45" max="1" step=".05" value=".72"><b id="guidedRateLabel">آرام</b></div><div class="guided-controls"><button id="guidedPlay">▶ خواندن و نمایش هماهنگ</button><button class="secondary" id="guidedPause">Ⅱ مکث</button><button class="secondary" id="guidedPrev">بخش قبل</button><button class="secondary" id="guidedNext">بخش بعد</button></div><p class="guided-status" aria-live="polite"></p></div>`;
   document.body.append(overlay);let idx=0;
   const status=overlay.querySelector(".guided-status");
   function show(){stop();const item=items[idx];overlay.querySelector(".guided-title").textContent="🌟 "+item.title;overlay.querySelector("#guidedFocus").innerHTML="";
     (item.focusWords||[]).forEach(w=>{const chip=document.createElement("span");chip.className="guided-chip";chip.textContent=w;overlay.querySelector("#guidedFocus").append(chip);});
     buildStage(item.segments[0],item.focusWords||[]);status.textContent="بخش "+(idx+1)+" از "+items.length+"؛ برای شروع، دکمه خواندن را بزن.";
     overlay.dataset.segment="0";overlay.dataset.item=String(idx);
   }
   overlay.querySelector("#guidedPlay").onclick=()=>{const item=items[idx];const seg=Number(overlay.dataset.segment||0);buildStage(item.segments[seg],item.focusWords||[]);speak(item.segments[seg]);};
   overlay.querySelector("#guidedPause").onclick=()=>{if(speechSynthesis.speaking){speechSynthesis.pause();playing=false;if(tokenTimer)clearInterval(tokenTimer);status.textContent="مکث شد؛ برای ادامه دوباره خواندن را بزن.";duck(false);}};
   overlay.querySelector("#guidedPrev").onclick=()=>{idx=Math.max(0,idx-1);show();};
   overlay.querySelector("#guidedNext").onclick=()=>{if(idx<items.length-1){idx++;show();}else status.textContent="آفرین! همه بخش‌های این متن را مرور کردی.";};
   overlay.querySelector("#guidedExit").onclick=()=>{stop();overlay.remove();overlay=null;};
   overlay.querySelector("#guidedRate").oninput=e=>{rate=Number(e.target.value);overlay.querySelector("#guidedRateLabel").textContent=rate<.6?"خیلی آرام":rate<.82?"آرام":"معمولی";};
   show();
 }
 window.openGuidedLesson=open;
 window.EMLAY_SELECTED_LESSON=null;
})();