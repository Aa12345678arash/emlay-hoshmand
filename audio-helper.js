(function () {
"use strict";
let callback=null, utterance=null, activeAudio=null, fallbackTimer=null;
let lastStatus="موتور گفتار در حال بررسی است.";
function notify(event,message){if(typeof callback==="function"){try{callback(event,message||"");}catch(e){}}}
function clearFallback(){if(fallbackTimer)clearTimeout(fallbackTimer);fallbackTimer=null;}
window.EMLAY_NATIVE_SPEECH_EVENT=function(event,message){if(event==="done"||event==="error")clearFallback();notify(event,message||"");};
function nativeReady(){try{return !!(window.AndroidTTS&&window.AndroidTTS.isReady());}catch(e){return false;}}
function findAsset(key){const m=window.EMLAY_AUDIO_MANIFEST||{};const src=key&&m.assets&&m.assets[key];return typeof src==="string"&&/^audio\/[a-zA-Z0-9_./-]+\.mp3$/.test(src)?src:"";}
function status(){if(activeAudio)return "فایل صوتی اختصاصی برنامه در حال استفاده است.";try{if(window.AndroidTTS){lastStatus=window.AndroidTTS.status()||lastStatus;if(nativeReady())return "صدای فارسی گوشی آماده است.";return lastStatus;}}catch(e){}if("speechSynthesis"in window)return "گفتار دستگاه در دسترس است؛ صدای فارسی ممکن است نیاز به نصب داشته باشد.";return "موتور گفتار در این دستگاه در دسترس نیست.";}
function stop(){clearFallback();if(activeAudio){try{activeAudio.pause();activeAudio.currentTime=0;}catch(e){}activeAudio=null;}try{if(window.AndroidTTS)window.AndroidTTS.stop();}catch(e){}try{if("speechSynthesis"in window)window.speechSynthesis.cancel();}catch(e){}utterance=null;}
function speakDevice(value,speed){if(window.AndroidTTS){try{if(nativeReady()&&window.AndroidTTS.speak(value,speed)){fallbackTimer=setTimeout(()=>notify("error","خواندن صوتی پاسخ نداد؛ وضعیت موتور گفتار فارسی گوشی را بررسی کن."),Math.max(15000,value.length*450));return true;}lastStatus=window.AndroidTTS.status()||lastStatus;}catch(e){lastStatus="ارتباط با موتور گفتار اندروید برقرار نشد.";}}
if("speechSynthesis"in window&&typeof SpeechSynthesisUtterance==="function"){try{utterance=new SpeechSynthesisUtterance(value);utterance.lang="fa-IR";utterance.rate=speed;const vs=window.speechSynthesis.getVoices();const v=vs.find(x=>/^fa(-|_)/i.test(x.lang))||vs.find(x=>/persian|فارسی/i.test(x.name));if(v)utterance.voice=v;utterance.onstart=()=>notify("start","");utterance.onend=()=>notify("done","");utterance.onerror=()=>notify("error","پخش صدا ناموفق بود؛ صدای فارسی دستگاه را بررسی کن.");window.speechSynthesis.speak(utterance);return true;}catch(e){}}
notify("error",status());return false;}
function speak(text,rate,onEvent,assetKey){const value=String(text||"").trim();if(!value)return false;stop();callback=typeof onEvent==="function"?onEvent:null;const speed=Math.max(.4,Math.min(1.2,Number(rate)||.82));const asset=findAsset(assetKey);
if(asset&&typeof window.Audio==="function"){try{activeAudio=new window.Audio(asset);activeAudio.playbackRate=speed;activeAudio.onplay=()=>notify("start","audio");activeAudio.onended=()=>{activeAudio=null;notify("done","audio");};activeAudio.onerror=()=>{activeAudio=null;notify("fallback","فایل صوتی اختصاصی پیدا نشد؛ موتور گفتار جایگزین فعال می‌شود.");speakDevice(value,speed);};const p=activeAudio.play();if(p&&typeof p.catch==="function")p.catch(()=>{activeAudio=null;notify("fallback","پخش فایل اختصاصی ممکن نشد؛ موتور گفتار جایگزین فعال می‌شود.");speakDevice(value,speed);});return true;}catch(e){activeAudio=null;}}
return speakDevice(value,speed);}
function pause(){clearFallback();if(activeAudio){try{activeAudio.pause();}catch(e){}return;}try{if("speechSynthesis"in window)window.speechSynthesis.pause();}catch(e){}try{if(window.AndroidTTS)window.AndroidTTS.stop();}catch(e){}}
function resume(){if(activeAudio){try{const p=activeAudio.play();if(p&&p.catch)p.catch(()=>{});}catch(e){}return;}try{if("speechSynthesis"in window)window.speechSynthesis.resume();}catch(e){}}
window.EMLAY_SPEAKER={speak,stop,pause,resume,status,isReady:nativeReady};
})();