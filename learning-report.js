"use strict";
/* گزارش سراسری: داده‌های تمام درس‌ها و خروجی رنگی قابل چاپ/دریافت. */
(function(){
 const css=`
 .report-overlay{position:fixed;inset:0;z-index:1300;overflow:auto;padding:14px;background:linear-gradient(145deg,#17356b,#2878df 58%,#28a9b9)}
 .report-sheet{max-width:760px;margin:10px auto;padding:22px;border-radius:24px;background:#fff;box-shadow:0 18px 48px #071a3b55}
 .report-head{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap}
 .report-head h2{margin:0;color:#17356b}.report-kpis{display:grid;grid-template-columns:repeat(3,1fr);gap:9px;margin:18px 0}
 .report-kpi{padding:14px;border-radius:16px;background:linear-gradient(145deg,#edf5ff,#fff);box-shadow:0 4px 12px #1b4e8818;text-align:center}
 .report-kpi b{display:block;font-size:23px;color:#1e70c5}.report-kpi span{font-size:11px;color:#60718b}
 .report-section{margin:20px 0}.report-section h3{color:#1b4d83;font-size:16px}
 .report-bar{display:grid;grid-template-columns:115px 1fr 42px;gap:8px;align-items:center;margin:10px 0;font-size:12px}
 .report-track{height:13px;border-radius:20px;background:#edf1f7;overflow:hidden}.report-fill{height:100%;border-radius:20px;background:linear-gradient(90deg,#26b77b,#f5c24e,#2878df)}
 .report-errors{display:flex;flex-wrap:wrap;gap:8px}.report-chip{padding:7px 11px;border-radius:18px;background:#fff0e8;color:#a34a2e;font-size:12px}
 .report-actions{display:flex;gap:9px;flex-wrap:wrap}.report-actions button{border:0;border-radius:13px;padding:11px 16px;background:linear-gradient(135deg,#1d63b7,#279bb6);color:white;font:inherit;font-weight:bold}
 .report-actions .secondary{background:#edf3ff;color:#1d4d87}
 .report-foot{margin-top:20px;padding-top:12px;border-top:1px solid #e5ebf3;text-align:center;color:#60718b;font-size:11px}
 @media(max-width:480px){.report-kpis{grid-template-columns:1fr 1fr}.report-bar{grid-template-columns:88px 1fr 35px}}
 @media print{body{background:#fff!important}.report-overlay{position:static;overflow:visible;padding:0;background:#fff}.report-sheet{max-width:none;margin:0;padding:8mm;border-radius:0;box-shadow:none}.report-actions,.report-close{display:none!important}.report-kpi,.report-fill{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
 `;
 const st=document.createElement("style");st.textContent=css;document.head.append(st);
 function open(){
   const p=window.EMLAY_GET_PROGRESS?window.EMLAY_GET_PROGRESS():{};
   const stats=p.lessonStats||{},history=p.answerHistory||[],errors=p.errorLog||[];
   const attempts=history.length,correct=history.filter(x=>x.correct).length,accuracy=attempts?Math.round(correct/attempts*100):0;
   const names=(window.EMLAY_LESSON_DATA||[]);
   const rows=names.map(l=>{const s=stats[l.id]||{};const pct=s.attempts?Math.round((s.correct||0)/s.attempts*100):0;return {name:l.title,pct,attempts:s.attempts||0};});
   const counts={};errors.forEach(e=>{const k=e.target||"خطای ثبت‌شده";counts[k]=(counts[k]||0)+1;});
   const top=Object.entries(counts).sort((a,b)=>b[1]-a[1]).slice(0,8);
   const el=document.createElement("section");el.className="report-overlay";el.dir="rtl";
   el.innerHTML=`<div class="report-sheet"><div class="report-head"><h2>📊 گزارش پیشرفت املای هوشمند</h2><button class="back-button report-close">بستن</button></div><p class="practice-muted">گزارش بر پایه تمرین‌هایی است که در همین دستگاه ذخیره شده‌اند.</p><div class="report-kpis"><div class="report-kpi"><b>${attempts.toLocaleString("fa-IR")}</b><span>پاسخ ثبت‌شده</span></div><div class="report-kpi"><b>${accuracy.toLocaleString("fa-IR")}٪</b><span>درصد پاسخ درست</span></div><div class="report-kpi"><b>${(p.points||0).toLocaleString("fa-IR")}</b><span>امتیاز کسب‌شده</span></div></div><section class="report-section"><h3>عملکرد درس‌های آزمایشی</h3><div id="reportBars"></div></section><section class="report-section"><h3>واژه‌هایی که نیاز به مرور دارند</h3><div class="report-errors" id="reportErrors"></div></section><section class="report-section"><h3>پیشنهاد آموزشی</h3><p id="reportAdvice" class="practice-muted"></p></section><div class="report-actions"><button id="reportPrint">🖨️ چاپ / ذخیره PDF</button><button class="secondary" id="reportExport">دریافت گزارش رنگی</button><button class="secondary" id="reportClose2">بازگشت</button></div><div class="report-foot">املای هوشمند پنجم · سازنده و معرفی‌کننده: آرش سلیمی</div></div>`;
   document.body.append(el);
   const bars=el.querySelector("#reportBars");
   rows.forEach(r=>{const row=document.createElement("div");row.className="report-bar";row.innerHTML=`<span>${r.name}</span><div class="report-track"><div class="report-fill" style="width:${r.pct}%"></div></div><b>${r.pct.toLocaleString("fa-IR")}٪</b>`;bars.append(row);});
   const err=el.querySelector("#reportErrors");if(top.length)top.forEach(([w,n])=>{const x=document.createElement("span");x.className="report-chip";x.textContent=w+" · "+n+" بار";err.append(x);});else err.textContent="هنوز خطایی برای مرور ثبت نشده است.";
   el.querySelector("#reportAdvice").textContent=attempts?accuracy>=85?"عملکرد خوبی داری؛ برای ماندگاری یادگیری، واژه‌های دشوار را فردا و سه روز دیگر دوباره مرور کن.":"واژه‌های ثبت‌شده در بخش مرور را با صدای بلند بخوان، سپس بدون نگاه‌کردن بنویس و دوباره تمرین کن.":"با شروع تمرین‌ها، گزارش پیشرفت و پیشنهادهای شخصی اینجا نمایش داده می‌شود.";
   const close=()=>el.remove();el.querySelector(".report-close").onclick=close;el.querySelector("#reportClose2").onclick=close;
   el.querySelector("#reportPrint").onclick=()=>{
     const clone=el.querySelector(".report-sheet").cloneNode(true);
     clone.querySelectorAll(".report-actions,.report-close").forEach(x=>x.remove());
     const printHtml=`<!doctype html><html lang="fa" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>گزارش پیشرفت املای هوشمند</title><style>
       *{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}
       body{font-family:Tahoma,Arial,sans-serif;background:#fff;color:#20324f;line-height:2;padding:8mm;margin:0}
       .report-sheet{max-width:100%;margin:0;padding:0;background:#fff}
       .report-head{display:flex;justify-content:space-between;align-items:center}.report-head h2{color:#17356b}
       .report-kpis{display:grid;grid-template-columns:repeat(3,1fr);gap:9px;margin:18px 0}
       .report-kpi{padding:12px;border-radius:14px;background:#edf5ff;text-align:center;border:1px solid #dce8fa}
       .report-kpi b{display:block;color:#1e70c5;font-size:22px}.report-section{margin:18px 0;break-inside:avoid}
       .report-section h3{color:#1b4d83}.report-bar{display:grid;grid-template-columns:125px 1fr 42px;gap:8px;align-items:center;margin:9px 0;font-size:12px;break-inside:avoid}
       .report-track{height:13px;background:#edf1f7;border-radius:20px;overflow:hidden}.report-fill{height:100%;background:linear-gradient(90deg,#26b77b,#f5c24e,#2878df)}
       .report-chip{display:inline-block;margin:4px;padding:7px 10px;border-radius:18px;background:#fff0e8;color:#a34a2e;font-size:12px}
       .report-foot{border-top:1px solid #e5ebf3;margin-top:18px;text-align:center;color:#60718b;font-size:11px}
       @page{size:A4;margin:8mm}
     </style></head><body>${clone.outerHTML}</body></html>`;
     if(window.AndroidPrint&&typeof window.AndroidPrint.printHtml==="function")window.AndroidPrint.printHtml(printHtml);
     else window.print();
   };
   el.querySelector("#reportExport").onclick=()=>{
     const clone=el.querySelector(".report-sheet").cloneNode(true);
     clone.querySelectorAll(".report-actions").forEach(x=>x.remove());
     const html='<!doctype html><html lang="fa" dir="rtl"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>گزارش پیشرفت املای هوشمند</title><style>body{font-family:Tahoma,Arial,sans-serif;background:#f2f6fc;color:#20324f;line-height:2;padding:18px;max-width:900px;margin:auto}.report-sheet{background:white;padding:22px;border-radius:20px}.report-head h2{color:#17356b}.report-kpis{display:grid;grid-template-columns:repeat(3,1fr);gap:9px;margin:18px 0}.report-kpi{padding:14px;border-radius:14px;background:linear-gradient(145deg,#edf5ff,#fff);text-align:center}.report-kpi b{display:block;color:#1e70c5;font-size:22px}.report-section{margin:20px 0}.report-bar{display:grid;grid-template-columns:130px 1fr 45px;gap:8px;align-items:center;margin:10px 0;font-size:12px}.report-track{height:13px;background:#edf1f7;border-radius:20px;overflow:hidden}.report-fill{height:100%;background:linear-gradient(90deg,#26b77b,#f5c24e,#2878df)}.report-chip{display:inline-block;margin:5px;padding:7px 11px;border-radius:18px;background:#fff0e8;color:#a34a2e;font-size:12px}.report-foot{border-top:1px solid #e5ebf3;margin-top:20px;text-align:center;color:#60718b;font-size:11px}@media(max-width:550px){.report-kpis{grid-template-columns:repeat(2,1fr)}}</style><body>'+clone.outerHTML+'</body></html>';
     const blob=new Blob(["\\ufeff"+html],{type:"text/html;charset=utf-8"}),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download="gozaresh-ravand-omla.html";document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);
   };
 }
 window.openLearningReport=open;
})();