"use strict";
(function () {
  const wordBank = window.EMLAY_WORD_BANK || {};
  const modeNames = {words:"شکار واژه‌ها",letters:"کامل کردن واژه",listening:"گوش کن و بنویس",sentence:"املا در جمله",challenge:"چالش پایانی"};
  let currentMode="words", target="", questionNumber=0, correctCount=0, sessionPoints=0, sessionWords=[], currentQuestionMode="words";
  const style=document.createElement("style");
  style.textContent=".practice-overlay{position:fixed;inset:0;z-index:1000;background:#f5f7fc;overflow:auto;padding:16px}.practice-card{max-width:620px;margin:20px auto;background:white;border-radius:22px;padding:20px;box-shadow:0 8px 30px #142b5218}.practice-top{display:flex;justify-content:space-between;align-items:center;gap:10px}.practice-question{font-size:19px;font-weight:bold;margin:22px 0 14px}.practice-options{display:grid;gap:10px;margin:16px 0}.practice-option,.practice-action{border:1px solid #dfe7f3;border-radius:13px;background:#f8faff;padding:13px;font:inherit;text-align:center;width:100%;color:#192b45}.practice-option{font-size:20px}.practice-input{width:100%;padding:13px;border:1px solid #ccd7e7;border-radius:12px;font:inherit;font-size:18px;text-align:center;margin:8px 0}.practice-action{background:#2864c5;color:white;border:0;font-weight:bold;margin-top:12px}.practice-feedback{padding:12px;border-radius:12px;margin-top:14px;background:#edf3ff}.practice-feedback.good{background:#e8f7ef;color:#176c4e}.practice-feedback.bad{background:#fff0ed;color:#9b392d}.practice-muted{color:#718096;font-size:13px}.missing-word-view{display:flex;flex-direction:row;justify-content:center;align-items:center;gap:6px;flex-wrap:wrap;margin:18px 0 8px;direction:rtl}.missing-word-view span{display:inline-flex;align-items:center;justify-content:center;min-width:38px;height:46px;padding:4px;border:1px solid #d5deeb;border-radius:9px;background:#f8faff;font-size:23px;font-weight:bold}.missing-word-view .missing-letter-cell{border:2px dashed #2864c5;background:#eaf1ff;color:#2864c5}.missing-word-view .missing-letter-separator{min-width:5px;width:5px;padding:0;border:0;background:transparent}.missing-letter-hint{text-align:center;font-weight:bold;margin:4px 0 12px}";
  document.head.appendChild(style);
  const overlay=document.createElement("section");
  overlay.className="practice-overlay"; overlay.hidden=true; overlay.dir="rtl";
  overlay.innerHTML='<div class="practice-card"><div class="practice-top"><button type="button" class="back-button" id="practiceExit">← خروج از تمرین</button><span class="practice-muted" id="practiceCounter"></span></div><h2 id="practiceTitle">تمرین</h2><div class="practice-question" id="practiceQuestion"></div><div id="practiceBody"></div><div id="practiceFeedback" class="practice-feedback" hidden aria-live="polite"></div><button type="button" class="practice-action" id="practiceContinue" hidden>ادامه</button></div>';
  document.body.appendChild(overlay);
  const $=id=>document.getElementById(id), body=$("practiceBody");
  function normalizeText(value){
    return String(value||"").normalize("NFC")
      .replace(/[يى]/g,"ی").replace(/ك/g,"ک")
      // نیم‌فاصله (U+200C) عمداً حفظ می‌شود تا خطای املایی نادیده گرفته نشود.
      .replace(/[\u200f\u202a-\u202e\sـ]/g,"")
      .replace(/[.,،؛:!?؟"'«»()\[\]{}]/g,"");
  }
  function shuffle(items){
    const a=[...items];
    for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}
    return a;
  }
  function showFeedback(message,good){const box=$("practiceFeedback");box.hidden=false;box.className="practice-feedback "+(good?"good":"bad");box.textContent=message;}
  function nextButton(fn){const b=$("practiceContinue");b.hidden=false;b.onclick=fn;}
  function resetQuestion(){$("practiceFeedback").hidden=true;$("practiceContinue").hidden=true;body.innerHTML="";}
  function recordAnswer(ok, answer) {
    progress.errorLog = Array.isArray(progress.errorLog) ? progress.errorLog : [];
    const entry = {
      lessonId: selectedLesson.id,
      mode: currentQuestionMode,
      target,
      answer: String(answer || "").slice(0, 240),
      correct: Boolean(ok),
      at: new Date().toISOString()
    };
    if (!ok) {
      progress.errorLog.unshift(entry);
      progress.errorLog = progress.errorLog.slice(0, 200);
    }
    progress.answerHistory = Array.isArray(progress.answerHistory) ? progress.answerHistory : [];
    progress.answerHistory.unshift(entry);
    progress.answerHistory = progress.answerHistory.slice(0, 300);
    saveProgress();
  }
  function finishQuestion(ok, answer){
    questionNumber++;
    recordAnswer(ok, answer);
    if(ok){correctCount++;sessionPoints+=10;progress.points=(progress.points||0)+10;saveProgress();showFeedback("آفرین! پاسخ درست بود. ۱۰ امتیاز گرفتی.",true);}
    else showFeedback("پاسخ درست «"+target+"» بود. آن را یک بار با دقت بخوان و دوباره تمرین کن.",false);
    $("practiceCounter").textContent="پاسخ درست: "+toPersianNumber(correctCount);
    nextButton(()=>{if(questionNumber<sessionWords.length)renderQuestion();else finishSession();});
  }
  function renderQuestion(){
    resetQuestion();
    const pool=wordBank[selectedLesson.id] || [];
    target=sessionWords[questionNumber] || pool[Math.floor(Math.random()*pool.length)];
    $("practiceCounter").textContent="سؤال "+toPersianNumber(questionNumber+1);
    let mode=currentMode==="challenge"?["words","letters","listening","sentence","words"][questionNumber]:currentMode;
    currentQuestionMode=mode;
    if(mode==="words")renderWordHunt(pool);
    if(mode==="letters")renderMissingLetter();
    if(mode==="listening")renderListening();
    if(mode==="sentence")renderSentence();
  }
  function renderWordHunt(){
    const item=((window.EMLAY_SPELLING_QUIZ || {})[selectedLesson.id] || []).find(entry=>normalizeText(entry.word)===normalizeText(target));
    if(!item){
      $("practiceQuestion").textContent="برای این واژه پرسش معنی‌محورِ بازبینی‌شده وجود ندارد.";
      return;
    }
    $("practiceQuestion").textContent="معنی را بخوان و املای درست واژه را انتخاب کن:";
    const meaning=document.createElement("p");
    meaning.className="practice-muted";
    meaning.style.fontSize="17px";
    meaning.style.lineHeight="2";
    meaning.textContent=item.meaning;
    const focus=document.createElement("p");
    focus.className="practice-muted";
    focus.textContent="به شکل نوشتاری واژه دقت کن.";
    const list=document.createElement("div");list.className="practice-options";
    body.append(meaning,focus,list);
    shuffle(item.options).forEach(option=>{
      const b=document.createElement("button");b.className="practice-option";b.type="button";b.textContent=option;
      b.onclick=()=>{
        [...list.children].forEach(x=>x.disabled=true);
        const ok=normalizeText(option)===normalizeText(item.word);
        finishQuestion(ok,option);
        showFeedback((ok?"آفرین! ":"این بار درست نبود. ")+"املای درست: «"+item.word+"». "+item.explanation,true===ok);
      };
      list.appendChild(b);
    });
  }
  function renderMissingLetter(){
    const chars=Array.from(target);
    const letterPositions=chars.map((c,i)=>({c,i})).filter(x=>x.c!=="‌" && !/\s/.test(x.c));
    if(!letterPositions.length){
      $("practiceQuestion").textContent="برای این واژه امکان ساخت سؤال وجود ندارد.";
      return;
    }
    const chosen=letterPositions[Math.floor(Math.random()*letterPositions.length)];
    const index=chosen.i, answer=chosen.c;
    const position=letterPositions.findIndex(x=>x.i===index)+1;
    $("practiceQuestion").textContent="حرف جاافتاده را در جای درست قرار بده:";
    const wordView=document.createElement("div");
    wordView.className="missing-word-view";
    wordView.setAttribute("aria-label","واژه با یک حرف حذف‌شده");
    chars.forEach((c,i)=>{
      const cell=document.createElement("span");
      if(i===index){
        cell.className="missing-letter-cell";
        cell.textContent="؟";
        cell.setAttribute("aria-label","جای حرف جاافتاده");
      }else if(c==="‌"){
        cell.className="missing-letter-separator";
        cell.textContent="‌";
        cell.setAttribute("aria-hidden","true");
      }else{
        cell.className="letter-cell";
        cell.textContent=c;
      }
      wordView.appendChild(cell);
    });
    body.appendChild(wordView);
    const hint=document.createElement("p");
    hint.className="practice-muted missing-letter-hint";
    hint.textContent="جای حرف حذف‌شده: حرف "+toPersianNumber(position)+" از سمت راست";
    body.appendChild(hint);
    const input=document.createElement("input");input.className="practice-input";input.maxLength=2;input.placeholder="فقط حرف جاافتاده را بنویس";input.setAttribute("aria-label","حرف جاافتاده");
    const b=document.createElement("button");b.className="practice-action";b.textContent="بررسی پاسخ";b.onclick=()=>{input.disabled=true;b.disabled=true;finishQuestion(normalizeText(input.value)===normalizeText(answer), input.value);};
    body.append(input,b);input.focus();
  }
  function renderListening(){
    $("practiceQuestion").textContent="به واژه گوش کن و آن را بنویس.";
    const play=document.createElement("button");play.className="practice-option";play.textContent="🔊 پخش دوباره واژه";play.onclick=speakTarget;
    const input=document.createElement("input");input.className="practice-input";input.placeholder="واژه را بنویس";
    const b=document.createElement("button");b.className="practice-action";b.textContent="بررسی پاسخ";b.onclick=()=>{input.disabled=true;b.disabled=true;finishQuestion(normalizeText(input.value)===normalizeText(target), input.value);};
    body.append(play,input,b);speakTarget();input.focus();
  }
  function speakTarget(){
    const synth=window.speechSynthesis;
    if(!synth || typeof window.SpeechSynthesisUtterance!=="function"){
      showFeedback("قابلیت پخش گفتار در این مرورگر فعال نیست. لطفاً صفحه را با Chrome باز کنید.",false);
      return;
    }
    showFeedback("در حال آماده‌سازی پخش واژه…",false);
    try{
      synth.cancel();
      synth.resume();
      const u=new SpeechSynthesisUtterance(target);
      u.lang="fa-IR";
      u.rate=.82;
      u.pitch=1;
      const voices=synth.getVoices();
      const faVoice=voices.find(v=>/^fa(-|_)/i.test(v.lang)) ||
        voices.find(v=>/persian|فارسی/i.test(v.name));
      if(faVoice)u.voice=faVoice;
      u.onstart=()=>showFeedback("در حال پخش واژه؛ با دقت گوش کن.",true);
      u.onend=()=>showFeedback("پخش واژه تمام شد. برای شنیدن دوباره دکمه پخش را بزن.",true);
      u.onerror=(event)=>{
        const reason=event && event.error ? event.error : "نامشخص";
        showFeedback("پخش صدا انجام نشد ("+reason+"). بررسی کنید موتور تبدیل متن به گفتار و صدای فارسی در گوشی فعال باشد.",false);
      };
      synth.speak(u);
      if(!voices.length){
        setTimeout(()=>{
          if(synth.speaking || synth.pending)return;
          showFeedback("مرورگر صدایی برای پخش پیدا نکرد. تنظیمات تبدیل متن به گفتار و نصب صدای فارسی گوشی را بررسی کنید.",false);
        },1800);
      }
    }catch(error){
      showFeedback("هنگام پخش صدا خطایی رخ داد. یک بار صفحه را تازه‌سازی کنید.",false);
    }
  }
  function renderSentence(){
    $("practiceQuestion").textContent="با واژه «"+target+"» یک جملهٔ کامل و معنادار بنویس.";
    const input=document.createElement("textarea");input.className="practice-input";input.rows=3;input.style.textAlign="right";input.placeholder="جمله‌ات را اینجا بنویس...";
    const checklist=document.createElement("p");checklist.className="practice-muted";
    checklist.textContent="پیش از بررسی، خودت کنترل کن: واژهٔ خواسته‌شده را درست نوشته‌ام؛ جمله دست‌کم سه واژه دارد؛ جمله با نشانهٔ پایان مناسب تمام شده؛ معنی جمله روشن و روان است.";
    const b=document.createElement("button");b.className="practice-action";b.textContent="بررسی ساختار جمله";b.onclick=()=>{
      const raw=input.value.trim();
      const words=raw.split(/[\s،؛,.!?؟]+/).map(normalizeText).filter(Boolean);
      const t=normalizeText(target);
      const hasTarget=words.includes(t);
      const enoughWords=words.length>=3;
      const hasEnding=/[.!؟?]$/.test(raw);
      const valid=hasTarget && enoughWords && hasEnding;
      input.disabled=true;b.disabled=true;
      finishQuestion(valid,raw);
      const detail=document.createElement("p");detail.className="practice-muted";
      detail.textContent="این بررسی فقط وجود واژهٔ هدف، تعداد واژه‌ها و نشانهٔ پایان را کنترل می‌کند؛ درستی معنایی و روانی جمله را خودت بازبینی کن.";
      body.appendChild(detail);
    };
    body.append(input,checklist,b);input.focus();
  }
  function finishSession(){
    resetQuestion();$("practiceQuestion").textContent="تمرین به پایان رسید! 🌟";
    const p=document.createElement("p");p.textContent="تعداد پاسخ‌های درست: "+toPersianNumber(correctCount)+" از "+toPersianNumber(questionNumber)+" ("+toPersianNumber(Math.round(correctCount/Math.max(1,questionNumber)*100))+"٪)";
    const p2=document.createElement("p");p2.textContent="امتیاز این نوبت: "+toPersianNumber(sessionPoints);
    const note=document.createElement("p");note.className="practice-muted";
    note.textContent=correctCount===5?"فوق‌العاده! هر پنج سؤال را درست پاسخ دادی.":"پاسخ‌های نادرست را دوباره بخوان و فردا یک دور دیگر تمرین کن.";
    progress.lessonStats=progress.lessonStats||{};
    const stat=progress.lessonStats[selectedLesson.id]||{sessions:0,attempts:0,correct:0,best:0};
    stat.sessions++;stat.attempts+=questionNumber;stat.correct+=correctCount;
    stat.best=Math.max(stat.best,Math.round(correctCount/Math.max(1,questionNumber)*100));
    stat.lastPlayed=new Date().toISOString();progress.lessonStats[selectedLesson.id]=stat;saveProgress();
    body.append(p,p2,note);
    if(correctCount>=4 && questionNumber===5 && !progress.completed.includes(selectedLesson.id)){
      progress.completed.push(selectedLesson.id);saveProgress();renderLessons();
    }
    $("practiceCounter").textContent="پایان تمرین";nextButton(closePractice);$("practiceContinue").textContent="بازگشت به درس";
  }
  function closePractice(){if("speechSynthesis" in window)speechSynthesis.cancel();overlay.hidden=true;$("practiceContinue").textContent="ادامه";}
  window.startPractice=function(mode){
    if(!selectedLesson) return;
    if(selectedLesson.teacherInput){
      const n=document.getElementById("modeNotice");
      n.className="notice";
      n.textContent="این درس آزاد است؛ ابتدا باید واژه‌های متن بومی کلاس در بخش «املای معلم» ثبت شوند.";
      return;
    }
    if(!(wordBank[selectedLesson.id]||[]).length){
      const n=document.getElementById("modeNotice");
      n.className="notice";
      n.textContent="برای این درس هنوز واژه‌ای به بانک آموزشی متصل نشده است.";
      return;
    }
    if(!Object.prototype.hasOwnProperty.call(modeNames,mode)){return;}
    if(mode==="challenge"){
      const n=document.getElementById("modeNotice");
      n.className="notice";
      n.textContent="چالش پایانی پس از آماده‌شدن پنج پرسش معنی‌محورِ بازبینی‌شده فعال می‌شود.";
      return;
    }
    if(mode==="words" && !((window.EMLAY_SPELLING_QUIZ || {})[selectedLesson.id] || []).length){
      const n=document.getElementById("modeNotice");
      n.className="notice";
      n.textContent="برای این درس هنوز پرسش معنی‌محورِ بازبینی‌شده آماده نشده است.";
      return;
    }
    currentMode=mode;questionNumber=0;correctCount=0;sessionPoints=0;
    sessionWords=currentMode==="words"
      ? shuffle(((window.EMLAY_SPELLING_QUIZ || {})[selectedLesson.id] || []).map(item=>item.word)).slice(0,5)
      : shuffle(wordBank[selectedLesson.id]||[]).slice(0,5);
    $("practiceTitle").textContent=modeNames[mode]||"تمرین";$("practiceContinue").textContent="ادامه";overlay.hidden=false;renderQuestion();
  };
  $("practiceExit").addEventListener("click",closePractice);
})();