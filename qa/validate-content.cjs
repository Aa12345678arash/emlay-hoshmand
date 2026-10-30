#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const vm = require("node:vm");

const sandbox = { window: {} };
for (const file of ["lesson-data.js", "word-bank.js", "spelling-quiz.js", "dictation-texts.js", "lesson-notes.js"]) {
  vm.runInNewContext(fs.readFileSync(file, "utf8"), sandbox, { filename: file });
}
const data = sandbox.window;
const practiceSource = fs.readFileSync("practice.js", "utf8");
const suiteSource = fs.readFileSync("lesson1-suite.js", "utf8");
const indexSource = fs.readFileSync("index.html", "utf8");
const fail = [];
const assert = (condition, message) => { if (!condition) fail.push(message); };

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
      assert(!matchesSpelling(error.form, item.word),
        "صورت پذیرفته‌شده به‌عنوان غلط ثبت شده: " + item.word + " / " + error.form);
    }

    const chars = Array.from(item.word);
    const generated = [];
    const confusables = {"ا":"آ","آ":"ا","ت":"ط","ط":"ت","ث":"س","س":"ث","ص":"س","ذ":"ز","ز":"ذ","ض":"ظ","ظ":"ض","ح":"ه","ه":"ح","ق":"غ","غ":"ق"};
    chars.forEach((letter, index) => {
      if (confusables[letter]) generated.push(chars.map((ch, i) => i === index ? confusables[letter] : ch).join(""));
      if (letter !== "\u200c" && !/\s/.test(letter)) {
        generated.push(chars.map((ch, i) => i === index ? "" : ch).join(""));
        generated.push(chars.map((ch, i) => i === index ? ch + ch : ch).join(""));
      }
      if (index < chars.length - 1 && letter !== "\u200c" && chars[index + 1] !== "\u200c" && !/\s/.test(letter + chars[index + 1])) {
        const swapped = chars.slice();
        [swapped[index], swapped[index + 1]] = [swapped[index + 1], swapped[index]];
        generated.push(swapped.join(""));
      }
    });
    const insertLetters = ["ا","ی","و","ه","ن","ر","م","ت","س"];
    for (let index = 0; index <= chars.length; index++) {
      if (chars[index - 1] === "\u200c" || chars[index] === "\u200c") continue;
      insertLetters.forEach(letter => generated.push([...chars.slice(0, index), letter, ...chars.slice(index)].join("")));
    }
    const distractors = [...new Set([
      ...(item.errors || []).map(error => error.form),
      ...(item.options || []),
      ...generated
    ])].filter(option => !matchesSpelling(option, item.word) && normalize(option) !== normalize(item.word));
    const options = [item.word, ...distractors].slice(0, 4);
    assert(options.length === 4, "کمتر از چهار گزینه ساخته شد: " + item.word);
    assert(options.filter(option => matchesSpelling(option, item.word)).length === 1,
      "تعداد پاسخ‌های درست باید دقیقاً یک باشد: " + item.word);
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
