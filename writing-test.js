(function(){
"use strict";
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
let activeOverlay=null;
let previousFocus=null;
function closeWritingTest(){
 if(!activeOverlay)return;
 activeOverlay.remove();
 activeOverlay=null;
 document.body.classList.remove("writing-test-open");
 if(previousFocus&&typeof previousFocus.focus==="function")previousFocus.focus();
 previousFocus=null;
}
function buildPrintDocument(sheetHtml,styleText){
 return '<!doctype html><html lang="fa" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>آزمون نگارش پایه پنجم</title><style>'+styleText+'</style></head><body>'+sheetHtml+'</body></html>';
}
window.closeWritingTest=closeWritingTest;
window.openWritingTest=function(){
 const lesson=window.EMLAY_SELECTED_LESSON;
 if(!lesson){alert("ابتدا یک درس را انتخاب کنید.");return;}
 if(activeOverlay)closeWritingTest();
 const bank=window.EMLAY_WORD_BANK||{};
 const quiz=window.EMLAY_SPELLING_QUIZ||{};
 const words=[...new Set([...(bank[lesson.id]||[]),...(quiz[lesson.id]||[]).map(x=>x.word)].filter(Boolean))].slice(0,6);
 const title=lesson.title||("درس "+lesson.id);
 const list=words.map(w=>"<li>"+esc(w)+"</li>").join("");
 const style='body{font:16px Tahoma,sans-serif;line-height:2;color:#172b49;background:#f2f5fa;margin:0}.sheet{max-width:800px;margin:20px auto;padding:25px;background:#fff;border:1px solid #ccd5e2;box-sizing:border-box}h1{text-align:center;font-size:23px}.meta{display:flex;gap:20px;flex-wrap:wrap;border-bottom:2px solid #234d83;padding:12px 0}.line{display:inline-block;border-bottom:1px dotted #555;min-width:130px}.answer{height:42px;border-bottom:1px dotted #888}.paragraph{height:170px;border:1px solid #aaa;margin:8px 0}.answer-key{border:1px dashed #789;padding:12px;margin-top:18px;background:#f5f8fc}.answer-key summary{font-weight:bold;cursor:pointer}.writing-toolbar{display:flex;justify-content:center;align-items:center;flex-wrap:wrap;gap:8px;margin:16px auto;max-width:850px;padding:12px;background:#eef4fc;border:1px solid #d7e4f5;border-radius:14px}.writing-toolbar button{padding:10px 16px;background:#245da6;color:white;border:0;border-radius:8px;font:inherit;cursor:pointer}.writing-toolbar .return-button{background:#147a58}.writing-toolbar .exit-button{background:#7b8797}.writing-help{text-align:center;color:#536783;font-size:13px;margin:8px auto 22px}';
 const overlay=document.createElement("section");
 overlay.id="writingTestOverlay";
 overlay.setAttribute("role","dialog");
 overlay.setAttribute("aria-modal","true");
 overlay.setAttribute("aria-label","آزمون نگارش پایه پنجم");
 overlay.tabIndex=-1;
 overlay.innerHTML='<style id="writingTestStyles">'+style+'#writingTestOverlay{position:fixed;inset:0;z-index:100000;background:rgba(12,25,45,.72);overflow:auto;padding:12px;box-sizing:border-box}#writingTestOverlay .sheet{box-shadow:0 8px 30px rgba(0,0,0,.18)}body.writing-test-open{overflow:hidden}@media print{body>*:not(#writingTestOverlay){display:none!important}#writingTestOverlay{position:static!important;inset:auto!important;overflow:visible!important;padding:0!important;background:#fff!important}#writingTestOverlay .writing-toolbar,#writingTestOverlay .writing-help{display:none!important}#writingTestOverlay .sheet{max-width:none;margin:0;padding:0;border:0;box-shadow:none}@page{size:A4;margin:14mm}}</style><main class="sheet"><h1>آزمون نگارش پایه پنجم</h1><div style="text-align:center">درس '+esc(lesson.id)+' ـ '+esc(title)+'</div><div class="meta">نام و نام خانوادگی: <i class="line"></i> کلاس: <i class="line" style="min-width:60px"></i> تاریخ: <i class="line" style="min-width:90px"></i></div><p>زمان پیشنهادی: ۲۰ دقیقه</p><h3>۱. واژه‌آموزی</h3><p>واژه‌های زیر را بخوان و معنی دو مورد را بنویس.</p><ol>'+list+'</ol><p>معنی واژه‌ها: <i class="line"></i> و <i class="line"></i></p><h3>۲. جمله‌سازی</h3><p>با دو واژه از فهرست بالا جمله بساز.</p><div class="answer"></div><div class="answer"></div><h3>۳. گسترش جمله</h3><p>یکی از جمله‌های خود را با افزودن زمان، مکان یا ویژگی گسترش بده.</p><div class="answer"></div><h3>۴. بندنویسی</h3><p>درباره موضوع درس «'+esc(title)+'» یک بند پنج‌جمله‌ای بنویس. آغاز، میانه و پایان نوشته را رعایت کن.</p><div class="paragraph"></div><details class="answer-key"><summary>پاسخ‌نامه و معیار سنجش آموزگار</summary><h3>پاسخ‌نامه واژه‌آموزی</h3><p>معنی‌ها با توجه به بافت درس سنجیده شوند؛ پاسخ هم‌معنی و درست پذیرفته است.</p><p>واژه‌های مبنا: '+list+'</p><h3>بارم پیشنهادی از ۲۰</h3><ul><li>معنی دو واژه: ۴ نمره (هر واژه ۲)</li><li>دو جمله‌سازی درست و مرتبط: ۴ نمره (هر جمله ۲)</li><li>گسترش جمله با افزودن اطلاعات مناسب: ۴ نمره</li><li>بند پنج‌جمله‌ای: ۸ نمره؛ ارتباط با موضوع ۲، پیوستگی و ترتیب ۲، جمله‌بندی ۲، املا و نشانه‌گذاری ۲</li></ul><p>در ارزیابی نگارش، خلاقیت و انتقال روشن معنا نیز در نظر گرفته شود؛ خطاهای املایی جداگانه ثبت شوند تا با ضعف محتوایی اشتباه نشوند.</p></details><p style="text-align:center;font-size:12px">سازنده و طراح: آرش سلیمی ـ املای هوشمند پنجم</p></main><div class="writing-toolbar" role="group" aria-label="ابزارهای برگه نگارش"><button type="button" data-action="print">چاپ / ذخیره PDF</button><button type="button" data-action="share">ارسال متن آزمون</button><button type="button" class="return-button" data-action="return">↩ بازگشت به نگارش</button><button type="button" class="exit-button" data-action="exit">✕ خروج از برگه</button></div><p class="writing-help">این برگه درون برنامه باز شده است؛ برای بازگشت، دکمه سبز را بزنید.</p>';
 previousFocus=document.activeElement;
 document.body.appendChild(overlay);
 document.body.classList.add("writing-test-open");
 activeOverlay=overlay;
 overlay.focus();
 overlay.addEventListener("click",event=>{
  const action=event.target.closest("[data-action]")?.dataset.action;
  if(!action)return;
  if(action==="return"||action==="exit"){closeWritingTest();return;}
  const sheet=overlay.querySelector(".sheet");
  if(action==="print"){
   const html=buildPrintDocument(sheet.outerHTML,style);
   if(window.AndroidPrint&&typeof window.AndroidPrint.printHtml==="function"){window.AndroidPrint.printHtml(html);return;}
   window.print();return;
  }
  if(action==="share"){
   const text=sheet.innerText;
   if(navigator.share){navigator.share({title:"آزمون نگارش",text}).catch(()=>{});}
   else if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(text).then(()=>alert("متن آزمون کپی شد.")).catch(()=>alert("امکان کپی خودکار وجود ندارد؛ متن برگه را انتخاب کنید."));}
   else alert("امکان ارسال خودکار در این مرورگر وجود ندارد؛ متن برگه را انتخاب کنید.");
  }
 });
 overlay.addEventListener("keydown",event=>{if(event.key==="Escape"){event.preventDefault();closeWritingTest();}});
};
})();