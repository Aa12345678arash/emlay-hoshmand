"use strict";
(function () {
  const approvedWords = {1:["لطیف","طبیعت","محکم"]};
  const modeNames = {words:"شکار واژه‌ها",letters:"کامل کردن واژه",listening:"گوش کن و بنویس",sentence:"املا در جمله",challenge:"چالش پایانی"};
  let currentMode="words", target="", questionNumber=0, correctCount=0, sessionPoints=0;
  const style=document.createElement("style");
  style.textContent=".practice-overlay{position:fixed;inset:0;z-index:1000;background:#f5f7fc;overflow:auto;padding:16px}.practice-card{max-width:620px;margin:20px auto;background:white;border-radius:22px;padding:20px;box-shadow:0 8px 30px #142b5218}.practice-top{display:flex;justify-content:space-between;align-items:center;gap:10px}.practice-question{font-size:19px;font-weight:bold;margin:22px 0 14px}.practice-options{display:grid;gap:10px;margin:16px 0}.practice-option,.practice-action{border:1px solid #dfe7f3;border-radius:13px;background:#f8faff;padding:13px;font:inherit;text-align:center;width:100%;color:#192b45}.practice-option{font-size:20px}.practice-input{width:100%;padding:13px;border:1px solid #ccd7e7;border-radius:12px;font:inherit;font-size:18px;text-align:center;margin:8px 0}.practice-action{background:#2864c5;color:white;border:0;font-weight:bold;margin-top:12px}.practice-feedback{padding:12px;border-radius:12px;margin-top:14px;background:#edf3ff}.practice-feedback.good{background:#e8f7ef;color:#176c4e}.practice-feedback.bad{background:#fff0ed;color:#9b392d}.practice-muted{color:#718096;font-size:13px}";
  document.head.appendChild(style);
  const overlay=document.createElement("section");
  overlay.className="practice-overlay"; overlay.hidden=true; overlay.dir="rtl";
  overlay.innerHTML='<div class="practice-card"><div class="practice-top"><button type="button" class="back-button" id="practiceExit">← خروج از تمرین</button><span class="practice-muted" id="practiceCounter"></span></div><h2 id="practiceTitle">تمرین</h2><div class="practice-question" id="practiceQuestion"></div><div id="practiceBody"></div><div id="practiceFeedback" class="practice-feedback" hidden aria-live="polite"></div><button type="button" class="practice-action" id="practiceContinue" hidden>ادامه</button></div>';
  document.body.appendChild(overlay);
  const $=id=>document.getElementById(id), body=$("practiceBody");
  function showFeedback(message,good){const box=$("practiceFeedback");box.hidden=false;box.className="practice-feedback "+(good?"good":"bad");box.textContent=message;}
  function nextButton(fn){const b=$("practiceContinue");b.hidden=false;b.onclick=fn;}
  function resetQuestion(){$("practiceFeedback").hidden=true;$("practiceContinue").hidden=true;body.innerHTML="";}
  function finishQuestion(ok){
    questionNumber++;
    if(ok){correctCount++;sessionPoints+=10;progress.points=(progress.points||0)+10;saveProgress();showFeedback("آفرین! پاسخ درست بود. ۱۰ امتیاز گرفتی.",true);}
    else showFeedback("این بار درست نبود. پاسخ را ببین و دوباره تمرین کن.",false);
    $("practiceCounter").textContent="پاسخ درست: "+toPersianNumber(correctCount);
    nextButton(()=>{if(currentMode==="challenge"&&questionNumber<5)renderQuestion();else finishSession();});
  }
  function renderQuestion(){
    resetQuestion();
    const pool=approvedWords[selectedLesson.id];
    target=pool[Math.floor(Math.random()*pool.length)];
    $("practiceCounter").textContent="سؤال "+toPersianNumber(questionNumber+1);
    let mode=currentMode==="challenge"?["words","letters","listening","sentence","words"][questionNumber]:currentMode;
    if(mode==="words")renderWordHunt(pool);
    if(mode==="letters")renderMissingLetter();
    if(mode==="listening")renderListening();
    if(mode==="sentence")renderSentence();
  }
  function renderWordHunt(pool){
    $("practiceQuestion").textContent="واژه «"+target+"» را پیدا کن.";
    const list=document.createElement("div");list.className="practice-options";
    pool.slice().sort(()=>Math.random()-.5).forEach(word=>{const b=document.createElement("button");b.className="practice-option";b.textContent=word;b.onclick=()=>{[...list.children].forEach(x=>x.disabled=true);finishQuestion(word===target);};list.appendChild(b);});
    body.appendChild(list);
  }
  function renderMissingLetter(){
    const chars=Array.from(target), index=Math.floor(Math.random()*chars.length), answer=chars[index];
    $("practiceQuestion").textContent="حرف جاافتاده را کامل کن: "+chars.map((c,i)=>i===index?"ـ":c).join("");
    const input=document.createElement("input");input.className="practice-input";input.maxLength=2;input.placeholder="حرف درست را بنویس";
    const b=document.createElement("button");b.className="practice-action";b.textContent="بررسی پاسخ";b.onclick=()=>{input.disabled=true;b.disabled=true;finishQuestion(input.value.trim()===answer);};
    body.append(input,b);input.focus();
  }
  function renderListening(){
    $("practiceQuestion").textContent="به واژه گوش کن و آن را بنویس.";
    const play=document.createElement("button");play.className="practice-option";play.textContent="🔊 پخش دوباره واژه";play.onclick=speakTarget;
    const input=document.createElement("input");input.className="practice-input";input.placeholder="واژه را بنویس";
    const b=document.createElement("button");b.className="practice-action";b.textContent="بررسی پاسخ";b.onclick=()=>{input.disabled=true;b.disabled=true;finishQuestion(input.value.trim().replace(/\\u200c/g,"")===target.replace(/\\u200c/g,""));};
    body.append(play,input,b);speakTarget();input.focus();
  }
  function speakTarget(){
    if(!("speechSynthesis" in window)){showFeedback("پخش صوت در این مرورگر در دسترس نیست.",false);return;}
    speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(target);u.lang="fa-IR";u.rate=.78;speechSynthesis.speak(u);
  }
  function renderSentence(){
    $("practiceQuestion").textContent="با واژه «"+target+"» یک جمله بنویس.";
    const input=document.createElement("textarea");input.className="practice-input";input.rows=3;input.style.textAlign="right";input.placeholder="جمله‌ات را اینجا بنویس...";
    const b=document.createElement("button");b.className="practice-action";b.textContent="بررسی جمله";b.onclick=()=>{input.disabled=true;b.disabled=true;const v=input.value.trim().replace(/\\u200c/g,"");finishQuestion(v.includes(target.replace(/\\u200c/g,""))&&v.length>target.length);};
    body.append(input,b);input.focus();
  }
  function finishSession(){
    resetQuestion();$("practiceQuestion").textContent="تمرین به پایان رسید! 🌟";
    const p=document.createElement("p");p.textContent="تعداد پاسخ‌های درست: "+toPersianNumber(correctCount)+" از "+toPersianNumber(questionNumber);
    const p2=document.createElement("p");p2.textContent="امتیاز این نوبت: "+toPersianNumber(sessionPoints);
    const note=document.createElement("p");note.className="practice-muted";note.textContent="فهرست هر ۱۷ درس در برنامه بارگذاری شده است؛ تمرین خودکار فقط با واژه‌های تأییدشده فعال می‌شود.";
    body.append(p,p2,note);
    if(correctCount>0&&!progress.completed.includes(selectedLesson.id)){progress.completed.push(selectedLesson.id);saveProgress();renderLessons();}
    $("practiceCounter").textContent="پایان تمرین";nextButton(closePractice);$("practiceContinue").textContent="بازگشت به درس";
  }
  function closePractice(){if("speechSynthesis" in window)speechSynthesis.cancel();overlay.hidden=true;$("practiceContinue").textContent="ادامه";}
  window.startPractice=function(mode){
    if(!selectedLesson||!approvedWords[selectedLesson.id]){
      const n=document.getElementById("modeNotice");n.className="notice";n.textContent="برای این درس هنوز واژه تأییدشده‌ای به موتور تمرین متصل نیست. پس از تأیید واژه‌ها، پنج روش تمرین فعال می‌شوند.";return;
    }
    currentMode=mode;questionNumber=0;correctCount=0;sessionPoints=0;
    $("practiceTitle").textContent=modeNames[mode]||"تمرین";$("practiceContinue").textContent="ادامه";overlay.hidden=false;renderQuestion();
  };
  $("practiceExit").addEventListener("click",closePractice);
})();