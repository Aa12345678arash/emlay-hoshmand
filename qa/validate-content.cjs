#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const vm = require("node:vm");

const fail = [];
const assert = (condition, message) => { if (!condition) fail.push(message); };
const suiteSource = fs.readFileSync("lesson1-suite.js", "utf8");
const indexSource = fs.readFileSync("index.html", "utf8");
const inlineScripts = [...indexSource.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)]
  .map(match => match[1]).filter(source => source.trim());
for (let i = 0; i < inlineScripts.length; i++) {
  try { new vm.Script(inlineScripts[i], { filename: "index-inline-" + (i + 1) + ".js" }); }
  catch (error) { console.error("خطای نحو در اسکریپت درون‌صفحه‌ای:", error.message); process.exit(1); }
}



const sandbox = { window: {} };
for (const file of ["lesson-data.js", "word-bank.js", "spelling-quiz.js", "dictation-texts.js", "lesson-notes.js"]) {
  vm.runInNewContext(fs.readFileSync(file, "utf8"), sandbox, { filename: file });
}
const data = sandbox.window;
const practiceSource = fs.readFileSync("practice.js", "utf8");
const practiceRuntimeSource = fs.readFileSync("practice.js", "utf8");
assert(["words", "letters", "listening", "sentence", "challenge"].every(mode => practiceRuntimeSource.includes(mode + ":")), "نام هر پنج شیوه تمرین در موتور ثبت نشده است.");
assert(practiceRuntimeSource.includes("function renderWordHunt") && practiceRuntimeSource.includes("function renderMissingLetter") && practiceRuntimeSource.includes("function renderListening") && practiceRuntimeSource.includes("function renderSentence"), "موتور یکی از چهار نوع پرسش پایه را ندارد.");
assert(practiceRuntimeSource.includes('["words","letters","listening","sentence","words"][questionNumber]'), "چالش پایانی ترکیب پنج‌مرحله‌ای مورد انتظار را ندارد.");
assert(practiceRuntimeSource.includes("function recordAnswer") && practiceRuntimeSource.includes("function finishSession") && practiceRuntimeSource.includes("progress.lessonStats"), "ثبت پاسخ‌ها و خلاصه عملکرد تمرین ناقص است.");
assert(practiceRuntimeSource.includes('window.EMLAY_SPEAKER.stop()'), "خروج از تمرین صدای بومی اندروید را متوقف نمی‌کند.");
const audioSource=fs.readFileSync("audio-helper.js","utf8");
const audioManifestSource=fs.readFileSync("audio-manifest.js","utf8");
assert(audioSource.includes("function findAsset")&&audioSource.includes("new window.Audio(asset)"),"پخش فایل صوتی آفلاین از manifest پیاده‌سازی نشده است.");
assert(audioSource.includes("speakDevice(value,speed)")&&audioSource.includes("activeAudio.onerror"),"جایگزینی فایل صوتی با TTS دستگاه ناقص است.");
assert(audioSource.includes("function pause()")&&audioSource.includes("function resume()"),"کنترل مکث و ادامه صوت کامل نیست.");
assert(audioManifestSource.includes("pending-voice-approval")&&audioManifestSource.includes("assets:{}"),"وضعیت تأیید صدا یا manifest اولیه مشخص نیست.");
assert(indexSource.includes('src="audio-manifest.js"')&&indexSource.indexOf('src="audio-manifest.js"')<indexSource.indexOf('src="audio-helper.js"'),"manifest باید پیش از موتور صوتی بارگذاری شود.");
assert(practiceSource.includes('"word:" + selectedLesson.id + ":" + target'),"تمرین شنیداری به شناسه فایل صوتی واژه متصل نیست.");
const dictationAudioSource=fs.readFileSync("lesson-dictation.js","utf8");
assert(dictationAudioSource.includes('"dictation:" + item.id + ":" + seg'),"جمله‌های املا به شناسه فایل صوتی متصل نیست.");



const normalize = value => String(value || "").normalize("NFC")
  .replace(/[يى]/g, "ی").replace(/ك/g, "ک")
  .replace(/[\u200c\u200f\u202a-\u202e\sـ]/g, "")
  .replace(/[ًٌٍَُِّْٰـ]/g, "")
  .replace(/[.,،؛:!?؟"'«»()\[\]{}]/g, "");
const matchesSpelling = (answer, expected) => {
  const expectedSeparators = (String(expected).match(/[\u200c\s]/g) || []).length;
  const answerSeparators = (String(answer).match(/[\u200c\s]/g) || []).length;
  return normalize(answer) === normalize(expected) &&
    (expectedSeparators === 0 || answerSeparators >= expectedSeparators);
};

assert(Array.isArray(data.EMLAY_LESSON_DATA) && data.EMLAY_LESSON_DATA.length === 17, "ساختار ۱۷ درس کامل نیست.");
assert(Object.keys(data.EMLAY_LESSON_NOTES || {}).length === 17, "درسنامه همه ۱۷ درس موجود نیست.");
assert(Object.keys(data.EMLAY_DICTATION_TEXTS || {}).length === 17, "متن املا برای همه ۱۷ درس موجود نیست.");
assert(Object.keys(data.EMLAY_SPELLING_QUIZ || {}).length === 17, "بانک شکار واژه‌ها برای همه ۱۷ درس موجود نیست.");
assert(practiceSource.includes("let selectedLesson=null;") &&
  (practiceSource.split("selectedLesson=window.EMLAY_SELECTED_LESSON||null;").length - 1) >= 2,
  "اتصال تمرین‌ها به درس انتخاب‌شده کامل نیست.");
assert(suiteSource.includes("activeLessonId=Number(id)") &&
  suiteSource.includes("lessonId:activeLessonId"),
  "آزمون والدین به شناسه درس انتخاب‌شده متصل نیست.");
assert(indexSource.includes('id="teacherEditor"') &&
  indexSource.includes('const teacherStorageKey = "emlay-teacher-content-v1"') &&
  indexSource.includes("function applyTeacherContent") &&
  indexSource.includes("saved.words.length >= 5") &&
  indexSource.includes("(!lessonData.teacherInput || teacherReady)"),
  "ورود، ذخیره و فعال‌سازی محتوای درس‌های آزاد کامل نیست.");
assert(indexSource.includes('onclick="openWritingTest()"'), "دکمه ورود به آزمون نگارش در صفحه درس وجود ندارد.");
const writingSource = fs.readFileSync("writing-test.js", "utf8");
assert(!writingSource.includes("window.open("), "آزمون نگارش هنوز به پنجره جدید وابسته است.");
assert(writingSource.includes('overlay.id="writingTestOverlay"') && writingSource.includes('setAttribute("role","dialog")') && writingSource.includes('setAttribute("aria-modal","true")'), "نمایش درون‌صفحه‌ای و دسترس‌پذیر آزمون نگارش پیاده‌سازی نشده است.");
assert(writingSource.includes('window.AndroidPrint.printHtml(html)') && writingSource.includes('window.print()'), "مسیر چاپ بومی اندروید و چاپ مرورگر هر دو پیش‌بینی نشده‌اند.");
assert(writingSource.includes('data-action="return"') && writingSource.includes('data-action="exit"') && writingSource.includes('event.key==="Escape"'), "کنترل‌های بازگشت، خروج یا کلید Escape آزمون نگارش ناقص است.");
assert(indexSource.includes("const makeTeacherQuestion = item =>") &&
  indexSource.includes("options:[item.word,...chosen]") &&
  indexSource.includes("const chosen = distractors.slice(0,3)") &&
  indexSource.includes("const errors = chosen.map("),
  "ساخت سه گزینه انحرافی و بازخورد برای آزمون درس‌های آزاد کامل نیست.");

const norm = value => String(value || "").normalize("NFC")
  .replace(/[يى]/g, "ی").replace(/ك/g, "ک")
  .replace(/[\u200c\u200f\u202a-\u202e\sـًٌٍَُِّْٰ]/g, "");
const isCorrect = (answer, expected) => {
  const a=String(answer||"").normalize("NFC"), e=String(expected||"").normalize("NFC");
  const separators=(e.match(/[\u200c\s]/g)||[]).length;
  return norm(a)===norm(e) && (separators===0 || (a.match(/[\u200c\s]/g)||[]).length>=separators);
};
const buildOptions = item => {
  const correct=String(item.word||"").trim(), used=new Set([norm(correct)]), wrong=[];
  const add=value=>{const s=String(value||"").trim(),k=norm(s);if(s&&k&&!used.has(k)&&!isCorrect(s,correct)){used.add(k);wrong.push(s);}};
  (item.errors||[]).forEach(x=>add(x.form));(item.options||[]).forEach(add);
  const chars=Array.from(correct), map={"ا":"آ","آ":"ا","ت":"ط","ط":"ت","ث":"س","س":"ث","ص":"س","ذ":"ز","ز":"ذ","ض":"ظ","ظ":"ض","ح":"ه","ه":"ح","ق":"غ","غ":"ق","ع":"ا","ک":"گ","گ":"ک"};
  chars.forEach((ch,i)=>{if(map[ch])add(chars.map((v,j)=>j===i?map[ch]:v).join(""));if(ch!=="‌"&&!/\s/.test(ch)){add(chars.map((v,j)=>j===i?"":v).join(""));add(chars.map((v,j)=>j===i?v+v:v).join(""));}if(i<chars.length-1&&ch!=="‌"&&chars[i+1]!=="‌"&&!/\s/.test(ch+chars[i+1])){const a=chars.slice();[a[i],a[i+1]]=[a[i+1],a[i]];add(a.join(""));}});
  const letters=["ا","ی","و","ه","ن","ر","م","ت","س","ب","د","ز"];
  for(let i=0;i<=chars.length;i++){if(chars[i-1]==="‌"||chars[i]==="‌")continue;letters.forEach(ch=>add([...chars.slice(0,i),ch,...chars.slice(i)].join("")));}
  return wrong.length>=3?[correct,...wrong.slice(0,3)]:null;
};
for (let id = 1; id <= 17; id++) {
  const passages = data.EMLAY_DICTATION_TEXTS[id] || [];
  assert(passages.length >= 2, "درس " + id + " کمتر از دو متن املا دارد.");
  for (const passage of passages) {
    const text = (passage.segments || []).join(" ");
    assert(text.trim().length > 0, "متن خالی در " + passage.id);
    for (const word of passage.focusWords || []) {
      assert(normalize(text).includes(normalize(word)),
        "واژه هدف در متن پیدا نشد: " + passage.id + " / " + word);
    }
  }
  const questions = data.EMLAY_SPELLING_QUIZ[id] || [];
  assert(questions.length >= 5, "درس " + id + " کمتر از پنج پرسش شکار واژه دارد.");
  for (const item of questions) {
    assert((data.EMLAY_WORD_BANK[id] || []).includes(item.word),
      "واژه پرسش در بانک همان درس نیست: درس " + id + " / " + item.word);
    assert(String(item.meaning || "").trim().length > 0,
      "معنی واژه ثبت نشده: " + item.word);
    for (const error of item.errors || []) {
      assert(!isCorrect(error.form, item.word),
        "صورت پذیرفته‌شده به‌عنوان غلط ثبت شده: " + item.word + " / " + error.form);
    }
    const options = buildOptions(item);
    assert(Array.isArray(options) && options.length === 4,
      "چهار گزینه متمایز برای سؤال ساخته نشد: " + item.word);
    if (options) {
      assert(new Set(options.map(norm)).size === 4,
        "گزینه‌های تکراری یا هم‌ارز در سؤال وجود دارد: " + item.word);
      assert(options.filter(option => norm(option) === norm(item.word)).length === 1,
        "سؤال دقیقاً یک پاسخ درست ندارد: " + item.word);
    }
  }
}
for (let id = 1; id <= 5; id++) {
  assert(Boolean(data.EMLAY_LESSON_NOTES[id] && data.EMLAY_LESSON_NOTES[id].summary),
    "خلاصه اختصاصی درس " + id + " ثبت نشده است.");
}

if (fail.length) {
  console.error("اعتبارسنجی محتوای املای هوشمند ناموفق بود:");
  fail.forEach(message => console.error(" - " + message));
  process.exit(1);
}
console.log("اعتبارسنجی موفق: ۱۷ درس، ۳۴ متن املا، ۸۵ پرسش و چهار گزینه با دقیقاً یک پاسخ درست.");
