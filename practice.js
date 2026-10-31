(function () {
  const wordBank = window.EMLAY_WORD_BANK || {};
  const modeNames = {words:"شکار واژه‌ها",letters:"کامل کردن واژه",listening:"گوش کن و بنویس",sentence:"املا در جمله",challenge:"چالش پایانی"};
  let selectedLesson=null;
  let currentMode="words", target="", questionNumber=0, correctCount=0, sessionPoints=0, sessionWords=[], currentQuestionMode="words";
  const style=document.createElement("style");
  style.textContent=".practice-overlay{position:fixed;inset:0;z-index:1000;overflow:auto;padding:16px;background:linear-gradient(180deg,rgba(239,249,255,.80),rgba(255,255,255,.72)),url('practice-world.svg') center/cover fixed,linear-gradient(145deg,#dcecff,#f8f4ff 48%,#e4fbf1)}.practice-overlay:after{content:'🌟　اَ　ب　پ　ت　✦　🌈　ث　ج　چ　★';position:fixed;inset:0;z-index:-1;pointer-events:none;white-space:pre-wrap;line-height:5.5;font-size:clamp(22px,5vw,42px);letter-spacing:12px;color:#2466a516;animation:wordCloudDrift 18s ease-in-out infinite alternate}@keyframes wordCloudDrift{from{transform:translate3d(-12px,-10px,0) rotate(-2deg)}to{transform:translate3d(18px,20px,0) rotate(2deg)}}.practice-overlay:before{content:'✦　✧　✦';position:fixed;top:8%;left:4%;font-size:44px;color:#2878df22;pointer-events:none;animation:practiceFloat 7s ease-in-out infinite alternate}.practice-card{position:relative;max-width:620px;margin:20px auto;background:linear-gradient(145deg,#fff,#f7fbff);border:1px solid #dce8fa;border-radius:25px;padding:20px;box-shadow:0 9px 0 #d8e6f7,0 18px 38px #142b5230}@keyframes practiceFloat{to{transform:translateY(18px) rotate(8deg)}}.practice-top{display:flex;justify-content:space-between;align-items:center;gap:10px}.practice-question{font-size:19px;font-weight:bold;margin:22px 0 14px}.practice-options{display:grid;gap:10px;margin:16px 0}.practice-option,.practice-action{border:1px solid #dfe7f3;border-radius:16px;background:linear-gradient(145deg,#fff,#edf5ff);padding:13px;font:inherit;text-align:center;width:100%;color:#192b45;box-shadow:0 5px 0 #dce7f5,0 9px 16px #1b4e8818;transition:transform .14s,box-shadow .14s}.practice-option:active,.practice-action:active{transform:translateY(3px);box-shadow:0 2px 0 #dce7f5}.practice-action{background:linear-gradient(135deg,#1d63b7,#28a4b8);color:#fff;border:0;box-shadow:0 5px 0 #174f91,0 10px 18px #1b4e8830}.practice-option{font-size:20px}.practice-input{width:100%;padding:13px;border:1px solid #ccd7e7;border-radius:12px;font:inherit;font-size:18px;text-align:center;margin:8px 0}.practice-action{background:#2864c5;color:white;border:0;font-weight:bold;margin-top:12px}.practice-feedback{padding:12px;border-radius:12px;margin-top:14px;background:#edf3ff}.practice-feedback.good{background:#e8f7ef;color:#176c4e}.practice-feedback.bad{background:#fff0ed;color:#9b392d}.practice-muted{color:#718096;font-size:13px}.missing-word-view{display:flex;flex-direction:row;justify-content:center;align-items:center;gap:6px;flex-wrap:wrap;margin:18px 0 8px;direction:rtl}.missing-word-view span{display:inline-flex;align-items:center;justify-content:center;min-width:38px;height:46px;padding:4px;border:1px solid #d5deeb;border-radius:9px;background:#f8faff;font-size:23px;font-weight:bold}.missing-word-view .missing-letter-cell{border:2px dashed #2864c5;background:#eaf1ff;color:#2864c5}.missing-word-view .missing-letter-separator{min-width:5px;width:5px;padding:0;border:0;background:transparent}.missing-letter-hint{text-align:center;font-weight:bold;margin:4px 0 12px}";
  document.head.appendChild(style);
  const overlay=document.createElement("section");
  overlay.className="practice-overlay"; overlay.hidden=true; overlay.dir="rtl";
  overlay.innerHTML='<div class="practice-card"><div class="practice-top"><button type="button" class="back-button" id="practiceExit">← خروج از تمرین</button><span class="practice-muted" id="practiceCounter"></span></div><h2 id="practiceTitle">تمرین</h2><div class="practice-question" id="practiceQuestion"></div><div id="practiceBody"></div><div id="practiceFeedback" class="practice-feedback" hidden aria-live="polite"></div><button type="button" class="practice-action" id="practiceContinue" hidden>ادامه</button></div>';
  document.body.appendChild(overlay);
  const $=id=>document.getElementById(id), body=$("practiceBody");
  function normalizeText(value){
    return String(value||"").normalize("NFC")
      .replace(/[يى]/g,"ی").replace(/ك/g,"ک")
      .replace(/[\u200c\u200f\u202a-\u202e\sـ]/g,"")
      .replace(/[ًٌٍَُِّْٰـ]/g,"")
      .replace(/[.,،؛:!?؟"'«»()\[\]{}]/g,"");
  }
  // فاصله معمولی و نیم‌فاصله را برای واژه‌های مرکب معادل می‌گیرد،
  // اما واژه چسبیده (بدون هیچ جداکننده‌ای) را درست اعلام نمی‌کند.
  function matchesSpelling(answer, expected){
    const rawExpected=String(expected||"").normalize("NFC");
    const rawAnswer=String(answer||"").normalize("NFC");
    const expectedSeparators=(rawExpected.match(/[\u200c\s]/g)||[]).length;
    const answerSeparators=(rawAnswer.match(/[\u200c\s]/g)||[]).length;
    return normalizeText(rawAnswer)===normalizeText(rawExpected) &&
      (expectedSeparators===0 || answerSeparators>=expectedSeparators);
  }
  function containsTargetPhrase(text, expected){
    const tokens=String(text||"").normalize("NFC")
      .replace(/[يى]/g,"ی").replace(/ك/g,"ک")
      .split(/[\s]+/).filter(Boolean);
    if(!normalizeText(expected))return false;
    for(let start=0;start<tokens.length;start++){
      let joined="";
      for(let end=start;end<Math.min(tokens.length,start+4);end++){
        joined+=(end===start?"":" ")+tokens[end];
        if(matchesSpelling(joined,expected))return true;
      }
    }
    return false;
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
  function buildWordHuntOptions(item){
    const correct=String(item.word||"").trim();
    const used=new Set([normalizeText(correct)]);
    const distractors=[];
    const add=value=>{
      const candidate=String(value||"").trim();
      const key=normalizeText(candidate);
      if(!candidate || !key || used.has(key) || matchesSpelling(candidate,correct))return;
      used.add(key);distractors.push(candidate);
    };
    (item.errors||[]).forEach(error=>add(error.form));
    (item.options||[]).forEach(option=>add(option));
    const chars=Array.from(correct);
    const confusables={"ا":"آ","آ":"ا","ت":"ط","ط":"ت","ث":"س","س":"ث","ص":"س","ذ":"ز","ز":"ذ","ض":"ظ","ظ":"ض","ح":"ه","ه":"ح","ق":"غ","غ":"ق","ع":"ا","غ":"ق","ک":"گ","گ":"ک"};
    chars.forEach((letter,index)=>{
      if(confusables[letter])add(chars.map((ch,i)=>i===index?confusables[letter]:ch).join(""));
      if(letter!=="‌" && !/\\s/.test(letter)){
        add(chars.map((ch,i)=>i===index?"":ch).join(""));
        add(chars.map((ch,i)=>i===index?ch+ch:ch).join(""));
      }
      if(index<chars.length-1 && letter!=="‌" && chars[index+1]!=="‌" && !/\\s/.test(letter+chars[index+1])){
        const swapped=chars.slice();[swapped[index],swapped[index+1]]=[swapped[index+1],swapped[index]];add(swapped.join(""));
      }
    });
    const insertLetters=["ا","ی","و","ه","ن","ر","م","ت","س","ب","د","ز"];
    for(let index=0;index<=chars.length;index++){
      if(chars[index-1]==="‌" || chars[index]==="‌")continue;
      insertLetters.forEach(letter=>add([...chars.slice(0,index),letter,...chars.slice(index)].join("")));
    }
    if(distractors.length<3)return null;
    return shuffle([correct,...distractors.slice(0,3)]);
  }

  function optionKey(value){
    return normalizeText(value).replace(/[ۀة]/g,"ه").replace(/[ؤ]/g,"و").replace(/[أإٱ]/g,"ا").replace(/[ئ]/g,"ی");
  }
  function buildWordOptions(item){
    const targetKey=optionKey(item.word), candidates=[];
    (item.errors||[]).forEach(x=>candidates.push(x.form));
    (item.options||[]).forEach(x=>candidates.push(x));
    const chars=Array.from(item.word);
    const confusables={"ا":"آ","آ":"ا","ت":"ط","ط":"ت","ث":"س","س":"ث","ص":"س","ذ":"ز","ز":"ذ","ض":"ظ","ظ":"ض","ح":"ه","ه":"ح","ق":"غ","غ":"ق","ک":"ق","ق":"ک","ی":"ئ","ئ":"ی","ع":"ا"};
    chars.forEach((letter,index)=>{
      if(confusables[letter])candidates.push(chars.map((ch,i)=>i===index?confusables[letter]:ch).join(""));
      if(letter!=="‌"&&!/\s/.test(letter)){candidates.push(chars.map((ch,i)=>i===index?"":ch).join(""));candidates.push(chars.map((ch,i)=>i===index?ch+ch:ch).join(""));}
      if(index<chars.length-1&&letter!=="‌"&&chars[index+1]!=="‌"&&!/\s/.test(letter+chars[index+1])){const s=chars.slice();[s[index],s[index+1]]=[s[index+1],s[index]];candidates.push(s.join(""));}
    });
    const inserts=["ا","ی","و","ه","ن","ر","م","ت","س","ط","ذ","ز","ص","ث"];
    for(let i=0;i<=chars.length;i++){if(chars[i-1]==="‌"||chars[i]==="‌")continue;inserts.forEach(ch=>candidates.push([...chars.slice(0,i),ch,...chars.slice(i)].join("")));}
    const seen=new Set([targetKey]),wrong=[];
    for(const raw of candidates){const value=String(raw||"").trim(),key=optionKey(value);if(!value||!key||seen.has(key))continue;seen.add(key);wrong.push(value);if(wrong.length===3)break;}
    return wrong.length===3?shuffle([item.word,...wrong]):[];
  }
  function renderWordHunt(){
    const item=((window.EMLAY_SPELLING_QUIZ||{})[selectedLesson.id]||[]).find(x=>optionKey(x.word)===optionKey(target));
    if(!item){$("practiceQuestion").textContent="برای این واژه پرسش بازبینی‌شده‌ای وجود ندارد.";showFeedback("این سؤال تا تکمیل پاسخ درست نمایش داده نمی‌شود.",false);return;}
    const options=buildWordOptions(item);
    if(options.length!==4||new Set(options.map(optionKey)).size!==4||options.filter(x=>optionKey(x)===optionKey(item.word)).length!==1){
      $("practiceQuestion").textContent="این سؤال نیازمند بازبینی است.";showFeedback("برای جلوگیری از سؤال بی‌پاسخ یا چندپاسخی، این مورد نمایش داده نمی‌شود.",false);return;
    }
    $("practiceQuestion").textContent="معنی را بخوان؛ سپس شکل درست واژه را از میان گزینه‌ها پیدا کن:";
    const meaning=document.createElement("p");meaning.className="practice-muted";meaning.style.fontSize="17px";meaning.style.lineHeight="2";meaning.textContent="💡 معنی واژه: "+item.meaning;
    const hint=document.createElement("p");hint.className="practice-muted";hint.textContent="به ترتیب حروف و شکل درست نوشتاری توجه کن.";
    const list=document.createElement("div");list.className="practice-options";body.append(meaning,hint,list);
    options.forEach(option=>{const b=document.createElement("button");b.className="practice-option";b.type="button";b.textContent=option;b.onclick=()=>{
      [...list.children].forEach(x=>x.disabled=true);const ok=optionKey(option)===optionKey(item.word);finishQuestion(ok,option);
      const error=(item.errors||[]).find(x=>optionKey(x.form)===optionKey(option));
      let detail=ok?"آفرین! شکل درست را پیدا کردی. ":"این بار شکل درست را انتخاب نکردی. ";
      if(error)detail+="نوع خطا: "+error.type+"؛ "+error.why;else if(ok)detail+=item.explanation||"به شکل نوشتاری واژه دقت کن.";
      showFeedback(detail+" املای درست: «"+item.word+"».",ok);
    };list.appendChild(b);});
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
    const b=document.createElement("button");b.className="practice-action";b.textContent="بررسی پاسخ";b.onclick=()=>{input.disabled=true;b.disabled=true;finishQuestion(matchesSpelling(input.value,target), input.value);};
    body.append(play,input,b);speakTarget();input.focus();
  }
  function speakTarget(){
    showFeedback("در حال آماده‌سازی واژه‌خوان…",false);
    const ok=window.EMLAY_SPEAKER && window.EMLAY_SPEAKER.speak(target,.72,(event,message)=>{
      if(event==="start")showFeedback("🔊 در حال خواندن واژه؛ با دقت گوش کن.",true);
      if(event==="done")showFeedback("خواندن واژه تمام شد. برای تکرار، دکمه پخش را بزن.",true);
      if(event==="error")showFeedback(message||"پخش صدا انجام نشد؛ صدای فارسی گوشی را بررسی کن.",false);
    });
    if(!ok){
      const status=window.EMLAY_SPEAKER?window.EMLAY_SPEAKER.status():"";
      showFeedback(status||"واژه‌خوان در دسترس نیست. موتور گفتار و صدای فارسی گوشی را فعال کن.",false);
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
      const hasTarget=containsTargetPhrase(raw,target);
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
  window.openDictationTexts=function(){
    selectedLesson=window.EMLAY_SELECTED_LESSON||null;
    if(!selectedLesson)return;
    const items=(window.EMLAY_DICTATION_TEXTS||{})[String(selectedLesson.id)]||[];
    resetQuestion();
    $("practiceTitle").textContent="متن‌های املا | "+selectedLesson.title;
    $("practiceQuestion").textContent="متن‌های املا تألیفی‌اند و با موضوع درس هماهنگ شده‌اند؛ یکی را انتخاب کن. متن در بخش‌های کوتاه نمایش داده می‌شود.";
    if(!items.length){showFeedback("متن این درس هنوز آماده نشده است.",false);overlay.hidden=false;return;}
    const list=document.createElement("div");list.className="practice-options";
    items.forEach((item,index)=>{
      const b=document.createElement("button");b.type="button";b.className="practice-option";
      b.textContent=(index+1)+". "+item.title;
      b.onclick=()=>{
        resetQuestion();
        $("practiceQuestion").textContent=item.title;
        let part=0;
        const reader=document.createElement("div");
        reader.style.cssText="padding:18px;border-radius:18px;background:linear-gradient(145deg,#fff,#eef6ff);font-size:19px;line-height:2.4;min-height:130px;box-shadow:0 7px 18px rgba(31,75,135,.12)";
        const progressBar=document.createElement("div");
        progressBar.style.cssText="height:8px;background:#e5edf8;border-radius:20px;margin:12px 0;overflow:hidden";
        const fill=document.createElement("div");fill.style.cssText="height:100%;background:linear-gradient(90deg,#26b77b,#2878df);width:0%;transition:width .2s";progressBar.appendChild(fill);
        const focus=document.createElement("p");focus.className="practice-muted";
        const status=document.createElement("p");status.className="practice-muted";
        const controls=document.createElement("div");controls.className="practice-options";
        const play=document.createElement("button");play.className="practice-action";play.textContent="🔊 خواندن بخش";
        const next=document.createElement("button");next.className="practice-option";next.textContent="بخش بعدی";
        body.append(reader,progressBar,focus,status,controls);controls.append(play,next);
        function showPart(){
          const text=item.segments[part];reader.textContent="";status.textContent="متن در حال ظاهر شدن است…";
          focus.textContent="واژه‌های هدف: "+item.focusWords.join("، ");
          fill.style.width=((part+1)/item.segments.length*100)+"%";
          next.disabled=part===item.segments.length-1;
          let pos=0;
          const timer=window.setInterval(()=>{
            reader.textContent=text.slice(0,pos);pos+=1;
            if(pos>=text.length){window.clearInterval(timer);reader.textContent=text;status.textContent="این بخش آماده است؛ می‌توانی آن را گوش کنی یا بخوانی."}
          },85);
        }
        function speak(){
          const speaker=window.EMLAY_SPEAKER;
          if(!speaker){status.textContent="موتور خواندن در برنامه بارگذاری نشده است.";return;}
          const accepted=speaker.speak(item.segments[part],.82,(event,message)=>{
            if(event==="start")status.textContent="در حال خواندن متن…";
            if(event==="done")status.textContent="خواندن این بخش تمام شد.";
            if(event==="error")status.textContent=message||speaker.status()||"پخش صدا انجام نشد؛ تنظیمات گفتار فارسی گوشی را بررسی کن.";
          });
          if(!accepted)status.textContent=speaker.status()||"موتور گفتار فارسی در دسترس نیست.";
        }
        play.onclick=speak;next.onclick=()=>{if(part<item.segments.length-1){part++;showPart()}};
        showPart();
      };
      list.appendChild(b);
    });
    body.appendChild(list);overlay.hidden=false;
  };
  window.startPractice=function(mode){
    selectedLesson=window.EMLAY_SELECTED_LESSON||null;
    if(!selectedLesson) return;
    if(selectedLesson.teacherInput){
      const n=document.getElementById("modeNotice");
      n.className="notice";
      n.textContent="این درس آزاد است؛ فعلاً از محتوای نمونه استفاده می‌کنی. پیش از استفاده کلاسی، آموزگار باید متن و واژه‌ها را با محتوای بومی منتخب هماهنگ کند.";
    }
    if(!(wordBank[selectedLesson.id]||[]).length){
      const n=document.getElementById("modeNotice");
      n.className="notice";
      n.textContent="برای این درس هنوز واژه‌ای به بانک آموزشی متصل نشده است.";
      return;
    }
    if(!Object.prototype.hasOwnProperty.call(modeNames,mode)){return;}
    if(mode==="challenge" && ((window.EMLAY_SPELLING_QUIZ || {})[selectedLesson.id] || []).length < 5){
      const n=document.getElementById("modeNotice");
      n.className="notice";
      n.textContent="برای چالش پایانی این درس هنوز پنج پرسش معنی‌محور آماده نشده است.";
      return;
    }
    if(mode==="words" && !((window.EMLAY_SPELLING_QUIZ || {})[selectedLesson.id] || []).length){
      const n=document.getElementById("modeNotice");
      n.className="notice";
      n.textContent="برای این درس هنوز پرسش معنی‌محورِ بازبینی‌شده آماده نشده است.";
      return;
    }
    currentMode=mode;questionNumber=0;correctCount=0;sessionPoints=0;
    sessionWords=(currentMode==="words" || currentMode==="challenge")
      ? shuffle(((window.EMLAY_SPELLING_QUIZ || {})[selectedLesson.id] || []).map(item=>item.word)).slice(0,5)
      : shuffle(wordBank[selectedLesson.id]||[]).slice(0,5);
    $("practiceTitle").textContent=modeNames[mode]||"تمرین";$("practiceContinue").textContent="ادامه";overlay.hidden=false;renderQuestion();
  };
  $("practiceExit").addEventListener("click",closePractice);
})();