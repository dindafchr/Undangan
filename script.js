(function () {
  const $ = (id) => document.getElementById(id);
  const get = (path) => path.split(".").reduce((o, k) => (o ? o[k] : ""), CONFIG);

  // Fill every [data-t="path.in.config"]
  document.querySelectorAll("[data-t]").forEach((el) => (el.textContent = get(el.dataset.t)));

  // Guest name from ?to=Name
  const to = new URLSearchParams(location.search).get("to");
  if (to) $("guest").textContent = to;

  // Optional images: only applied if the file loads
  function tryImage(src, cb) { const i = new Image(); i.onload = () => cb(src); i.src = src; }
  tryImage(CONFIG.heroImage, (s) => { document.documentElement.style.setProperty("--hero", `url(${s})`); document.documentElement.style.setProperty("--cover", `url(${s})`); });
  tryImage(CONFIG.coupleImage, (s) => { const p = $("couplePhoto"); p.src = s; p.hidden = false; });

  // Cover + music
  const audio = $("audio"), musicBtn = $("music");
  audio.src = CONFIG.music;
  audio.addEventListener("loadedmetadata", () => (musicBtn.hidden = false));
  audio.load();
  function setMusic(on) {
    if (on) audio.play().then(() => musicBtn.classList.add("on")).catch(() => {});
    else { audio.pause(); musicBtn.classList.remove("on"); }
  }
  $("open").addEventListener("click", () => {
    $("cover").classList.add("gone");
    document.body.classList.remove("locked");
    setMusic(true);
  });
  musicBtn.addEventListener("click", () => setMusic(audio.paused));

  // Countdown
  const target = new Date(CONFIG.dateTime).getTime();
  function tick() {
    let left = Math.max(0, target - Date.now());
    const d = Math.floor(left / 864e5); left %= 864e5;
    const h = Math.floor(left / 36e5); left %= 36e5;
    const m = Math.floor(left / 6e4), s = Math.floor((left % 6e4) / 1e3);
    $("d").textContent = d; $("h").textContent = h; $("m").textContent = m; $("s").textContent = s;
  }
  tick(); setInterval(tick, 1000);

  // Google Calendar link
  const fmt = (t) => new Date(t).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const end = target + CONFIG.durationHours * 36e5;
  const cal = new URLSearchParams({
    action: "TEMPLATE",
    text: `Wedding of ${CONFIG.bride.short} & ${CONFIG.groom.short}`,
    dates: `${fmt(target)}/${fmt(end)}`,
    location: `${CONFIG.venueName}, ${CONFIG.venueAddress}`,
    details: `You are invited to the wedding of ${CONFIG.bride.full} and ${CONFIG.groom.full}.\nVenue: ${CONFIG.venueName}, ${CONFIG.venueAddress}`
  });
  $("calLink").href = "https://calendar.google.com/calendar/render?" + cal;

  // Google Maps link + embedded map
  const q = encodeURIComponent(`${CONFIG.venueName} ${CONFIG.venueAddress}`);
  $("mapLink").href = "https://www.google.com/maps/search/?api=1&query=" + q;
  $("mapFrame").src = `https://maps.google.com/maps?q=${q}&output=embed`;

  // Hide guest count if not attending
  const form = $("rsvpForm");
  form.addEventListener("change", () => {
    $("guestsWrap").hidden = form.attendance.value === "Not attending";
  });

  // Wishes
  const box = $("wishes");
  const configured = CONFIG.scriptUrl && !CONFIG.scriptUrl.includes("PASTE_");
  function renderWishes(list) {
    if (!list.length) return;
    box.replaceChildren(...list.map((w) => {
      const div = document.createElement("div"); div.className = "wish";
      const b = document.createElement("b"); b.textContent = w.name;
      const p = document.createElement("p"); p.textContent = "“" + w.message + "”";
      div.append(b, p); return div;
    }));
  }
  async function loadWishes() {
    if (!configured) return;
    try {
      const r = await fetch(CONFIG.scriptUrl + "?action=wishes");
      const j = await r.json(); if (j.ok) renderWishes(j.wishes);
    } catch (e) { /* keep existing list */ }
  }
  loadWishes(); setInterval(loadWishes, 20000);

  // RSVP submit
  const status = $("status"), send = $("send");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = form.name.value.trim();
    if (!name) { status.textContent = "Please enter your full name."; form.name.focus(); return; }
    if (!configured) { status.textContent = "RSVP is not connected yet. Add the Apps Script URL in config.js."; return; }
    if (form.website.value) return; // honeypot
    const data = {
      name, attendance: form.attendance.value,
      guests: form.attendance.value === "Attending" ? form.guests.value : "0",
      message: form.message.value.trim()
    };
    send.disabled = true; status.textContent = "Sending…";
    try {
      // text/plain avoids a CORS preflight; Apps Script still receives the body
      await fetch(CONFIG.scriptUrl, { method: "POST", mode: "no-cors", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify(data) });
      status.textContent = "Thank you! Your RSVP has been sent.";
      form.reset(); $("guestsWrap").hidden = false;
      setTimeout(loadWishes, 2500);
    } catch (err) {
      status.textContent = "Could not send. Check your connection and try again.";
    }
    send.disabled = false;
  });

  // Copy account number
  $("copy").addEventListener("click", () => {
    const n = CONFIG.gift.accountNumber;
    (navigator.clipboard ? navigator.clipboard.writeText(n) : Promise.reject()).then(
      () => ($("copy").textContent = "Copied"), () => ($("copy").textContent = "Copy failed"));
    setTimeout(() => ($("copy").textContent = "Copy account number"), 2000);
  });

  // Fade-in on scroll
  const io = new IntersectionObserver((es) => es.forEach((x) => { if (x.isIntersecting) { x.target.classList.add("in"); io.unobserve(x.target); } }), { threshold: 0.15 });
  document.querySelectorAll(".sec").forEach((s) => { s.classList.add("fade"); io.observe(s); });
})();
