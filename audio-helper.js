(function () {
  "use strict";
  let callback = null;
  let utterance = null;
  let fallbackTimer = null;
  let lastStatus = "موتور گفتار در حال بررسی است.";

  function notify(event, message) {
    if (typeof callback === "function") {
      try { callback(event, message || ""); } catch (e) {}
    }
  }

  window.EMLAY_NATIVE_SPEECH_EVENT = function (event, message) {
    if (event === "done" || event === "error") {
      if (fallbackTimer) clearTimeout(fallbackTimer);
      fallbackTimer = null;
    }
    notify(event, message || "");
  };

  function nativeReady() {
    try { return !!(window.AndroidTTS && window.AndroidTTS.isReady()); }
    catch (e) { return false; }
  }

  function status() {
    try {
      if (window.AndroidTTS) {
        lastStatus = window.AndroidTTS.status() || lastStatus;
        if (nativeReady()) return "صدای فارسی آماده است.";
        return lastStatus;
      }
    } catch (e) {}
    if ("speechSynthesis" in window) return "گفتار دستگاه در دسترس است؛ صدای فارسی ممکن است نیاز به نصب داشته باشد.";
    return "موتور گفتار در این دستگاه در دسترس نیست.";
  }

  function stop() {
    if (fallbackTimer) clearTimeout(fallbackTimer);
    fallbackTimer = null;
    try { if (window.AndroidTTS) window.AndroidTTS.stop(); } catch (e) {}
    try { if ("speechSynthesis" in window) window.speechSynthesis.cancel(); } catch (e) {}
    utterance = null;
  }

  function speak(text, rate, onEvent) {
    const value = String(text || "").trim();
    if (!value) return false;
    stop();
    callback = typeof onEvent === "function" ? onEvent : null;
    const speed = Math.max(0.4, Math.min(1.2, Number(rate) || 0.82));

    if (window.AndroidTTS) {
      try {
        if (nativeReady()) {
          const accepted = window.AndroidTTS.speak(value, speed);
          if (accepted) {
            fallbackTimer = setTimeout(function () {
              notify("error", "خواندن صوتی پاسخ نداد؛ وضعیت موتور گفتار فارسی گوشی را بررسی کن.");
            }, Math.max(15000, value.length * 450));
            return true;
          }
        } else {
          lastStatus = window.AndroidTTS.status() || lastStatus;
        }
      } catch (e) { lastStatus = "ارتباط با موتور گفتار اندروید برقرار نشد."; }
    }

    if ("speechSynthesis" in window && typeof SpeechSynthesisUtterance === "function") {
      try {
        utterance = new SpeechSynthesisUtterance(value);
        utterance.lang = "fa-IR";
        utterance.rate = speed;
        const voices = window.speechSynthesis.getVoices();
        const voice = voices.find(v => /^fa(-|_)/i.test(v.lang)) || voices.find(v => /persian|فارسی/i.test(v.name));
        if (voice) utterance.voice = voice;
        utterance.onstart = () => notify("start", "");
        utterance.onend = () => notify("done", "");
        utterance.onerror = () => notify("error", "پخش صدا ناموفق بود؛ صدای فارسی دستگاه را بررسی کن.");
        window.speechSynthesis.speak(utterance);
        return true;
      } catch (e) {}
    }
    notify("error", status());
    return false;
  }

  window.EMLAY_SPEAKER = { speak, stop, pause: stop, status, isReady: nativeReady };
})();