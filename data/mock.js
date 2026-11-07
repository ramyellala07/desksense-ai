/* ==========================================================================
   DeskSense AI — mock data
   One deterministic day of desk-sensor readings plus the records the demo
   pages read. Field names are stable so this file can later be swapped for
   a real API response.

   Hardware in this version: ultrasonic distance, LDR light, temperature +
   humidity, IR presence. No camera, no wearable, no head-tilt sensor.
   ========================================================================== */
window.DeskSenseData = (function () {
  "use strict";

  /* ---------- deterministic pseudo-random ---------- */
  function mulberry32(seed) {
    return function () {
      seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
      var t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  var rnd = mulberry32(20261107);

  function clamp(v, lo, hi) { return Math.min(hi, Math.max(lo, v)); }
  function round1(v) { return Math.round(v * 10) / 10; }
  function pad(n) { return n < 10 ? "0" + n : "" + n; }
  function hhmm(minutes) { return pad(Math.floor(minutes / 60)) + ":" + pad(minutes % 60); }

  /* ---------- the 8-hour workday, one row per minute (09:00–17:00) ---------- */
  var N = 480;              // 09:00 through 16:59
  var START = 9 * 60;

  function presenceAt(minute) {
    if (minute >= 750 && minute <= 795) return 0;  // lunch 12:30–13:15
    if (minute >= 645 && minute <= 654) return 0;  // short break 10:45–10:54
    if (minute >= 960 && minute <= 967) return 0;  // short break 16:00–16:07
    return 1;
  }

  var readings = [];
  for (var i = 0; i < N; i++) {
    var minute = START + i;
    var t = i / (N - 1);                     // 0 at 09:00, 1 at 16:59
    var presence = presenceAt(minute);

    // Distance drifts closer through the day, with a sharper lean-in late
    // afternoon as fatigue sets in (a realistic 38 cm at the end).
    var distance = 61 - 12 * t
      + 5 * Math.sin(i / 47)
      + 3 * Math.sin(i / 13 + 1.7)
      + (rnd() - 0.5) * 3;
    if (t > 0.95) {
      var lean = (t - 0.95) / 0.05;
      distance -= 9.5 * lean * lean;
    }
    distance = clamp(round1(distance), 30, 80);

    // LDR: bright morning, cloudy dip 13:30–15:15, dimmer late afternoon.
    var light = 820
      + 90 * Math.sin(i / 75 - 0.6)
      + 35 * Math.sin(i / 16)
      + (rnd() - 0.5) * 20;
    if (minute >= 810 && minute <= 915) {
      var dip = Math.sin((Math.PI * (minute - 810)) / 105);
      light *= 1 - 0.62 * dip;
    }
    if (t > 0.72) light *= 1 - (0.55 * (t - 0.72)) / 0.28;
    light = clamp(Math.round(light), 0, 1023);

    // Room warms up through the day; humidity falls as it warms.
    var temp = 24.1
      + 6.4 * Math.pow(t, 0.8)
      + 0.35 * Math.sin(i / 38)
      + (rnd() - 0.5) * 0.3;
    temp = clamp(round1(temp), 24, 31);

    var humidity = 65
      - 21 * Math.pow(t, 0.9)
      + 2.5 * Math.sin(i / 52 + 1)
      + (rnd() - 0.5) * 1.6;
    humidity = clamp(round1(humidity), 40, 70);

    readings.push({
      time: hhmm(minute),
      distance: distance,
      light: light,
      temp: temp,
      humidity: humidity,
      presence: presence,
      bad_posture: presence && distance < 45 ? 1 : 0
    });
  }

  /* ---------- derived helpers ---------- */
  function postureScore(rows, windowMinutes) {
    windowMinutes = windowMinutes || 45;
    var slice = rows.slice(-windowMinutes).filter(function (r) { return r.presence; });
    if (!slice.length) return null;
    var good = slice.filter(function (r) { return !r.bad_posture; }).length;
    return Math.round((good / slice.length) * 100);
  }

  function goodPosturePct(rows) {
    var present = rows.filter(function (r) { return r.presence; });
    if (!present.length) return 0;
    var good = present.filter(function (r) { return !r.bad_posture; }).length;
    return Math.round((good / present.length) * 100);
  }

  function sittingStreak(rows) {
    var count = 0;
    for (var j = rows.length - 1; j >= 0; j--) {
      if (!rows[j].presence) break;
      count++;
    }
    return count;
  }

  function presentMinutes(rows) {
    return rows.filter(function (r) { return r.presence; }).length;
  }

  function countBreaks(rows) {
    var breaks = 0;
    for (var j = 1; j < rows.length; j++) {
      if (rows[j - 1].presence === 1 && rows[j].presence === 0) breaks++;
    }
    return breaks;
  }

  var last = readings[readings.length - 1];
  var score = postureScore(readings, 45);
  var pctGood = goodPosturePct(readings);
  var sitting = sittingStreak(readings);
  var present = presentMinutes(readings);

  /* Normalised 0–100 comfort values for the radar chart */
  function normDistance(d) {
    if (d >= 50 && d <= 70) return 100;
    if (d < 50) return clamp(Math.round(((d - 25) / 25) * 100), 0, 100);
    return clamp(Math.round(100 - (d - 70) * 4), 0, 100);
  }
  function normLight(l) { return clamp(Math.round((l / 1023) * 100), 0, 100); }
  function normTemp(v) {
    if (v >= 23 && v <= 27) return 100;
    if (v < 23) return clamp(Math.round(100 - (23 - v) * 12), 0, 100);
    return clamp(Math.round(100 - (v - 27) * 12), 0, 100);
  }
  function normHumidity(h) {
    if (h >= 40 && h <= 60) return 100;
    if (h < 40) return clamp(Math.round(100 - (40 - h) * 5), 0, 100);
    return clamp(Math.round(100 - (h - 60) * 2.5), 0, 100);
  }

  var derived = {
    postureScore: score,
    goodPosturePct: pctGood,
    badPosturePct: 100 - pctGood,
    goodPostureMin: Math.round((present * pctGood) / 100),
    badPostureMin: present - Math.round((present * pctGood) / 100),
    sittingMinutes: sitting,
    presentMinutes: present,
    sessionMinutes: N - 1,
    sessionProgressPct: Math.round((sitting / 60) * 100),
    breaksTaken: countBreaks(readings) - 1, // lunch excluded from "movement breaks"
    lastReading: last,
    radarLabels: ["Distance", "Light", "Temperature", "Humidity", "Posture"],
    radarValues: [
      normDistance(last.distance),
      normLight(last.light),
      normTemp(last.temp),
      normHumidity(last.humidity),
      score
    ]
  };

  /* ---------- last 7 days of sessions ---------- */
  var DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  var MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  var today = new Date();

  function dayLabel(date, withYear) {
    return DAYS[date.getDay()] + " " + date.getDate() + " " + MONTHS[date.getMonth()];
  }

  var sessions = [];
  for (var d = 6; d >= 0; d--) {
    var date = new Date(today.getFullYear(), today.getMonth(), today.getDate() - d);
    var isToday = d === 0;
    var durationMin = isToday ? present : 355 + Math.round(rnd() * 115);
    var breaks = isToday ? derived.breaksTaken : 2 + Math.floor(rnd() * 3);
    var goodPct = isToday ? pctGood : 54 + Math.round(rnd() * 32);
    sessions.push({
      id: "ses-" + date.getFullYear() + pad(date.getMonth() + 1) + pad(date.getDate()),
      date: dayLabel(date),
      dateShort: DAYS[date.getDay()],
      isToday: isToday,
      start: "09:0" + Math.floor(rnd() * 6),
      end: isToday ? "in progress" : "17:0" + Math.floor(rnd() * 6),
      durationMin: durationMin,
      breaks: breaks,
      goodPosturePct: goodPct,
      status: goodPct >= 78 ? "good" : goodPct >= 64 ? "warn" : "bad"
    });
  }

  /* ---------- preferences ---------- */
  var preferences = {
    preferredDistance: { min: 50, max: 70 },
    temperature: { min: 23, max: 27 },
    humidity: { min: 40, max: 60 },
    breakIntervalMin: 50,
    lighting: "Warm",
    monitoringEnabled: true,
    monitoringSchedule: { start: "09:00", end: "17:00" },
    retentionDays: 30,
    notifications: { break: true, environment: true, device: true, digest: true },
    adaptiveControls: { smartLamp: true, fan: false }
  };

  /* ---------- desk unit + optional controls ---------- */
  var devices = [
    {
      id: "hub-01",
      name: "DeskSense Desk Unit",
      model: "ESP8266 · Unit 01",
      location: "Home desk",
      firmware: "1.4.2",
      wifi: { ssid: "HomeNet-5G", rssi: -58, ip: "192.168.1.42" },
      lastSeen: "just now",
      uptime: "7h 59m",
      sensors: [
        { key: "distance", label: "Ultrasonic distance", value: last.distance + " cm", status: last.distance < 45 ? "warn" : "good" },
        { key: "light", label: "Light (LDR)", value: last.light + " / 1023", status: last.light < 350 ? "warn" : "good" },
        { key: "temp", label: "Temperature", value: last.temp + " °C", status: last.temp > 27 ? "warn" : "good" },
        { key: "humidity", label: "Humidity", value: last.humidity + " %", status: "good" },
        { key: "presence", label: "IR presence", value: last.presence ? "Present" : "Away", status: "good" }
      ]
    }
  ];

  var adaptiveControls = [
    {
      id: "lamp",
      name: "Smart lamp (demo)",
      detail: "Warm bedside lamp · simulated",
      type: "lamp",
      connected: true,
      on: true,
      brightness: 70
    },
    {
      id: "fan",
      name: "Fan (demo)",
      detail: "Desk fan · simulated",
      type: "fan",
      connected: true,
      on: false,
      brightness: 0
    }
  ];

  /* ---------- alerts / notification centre ---------- */
  var at1405 = readings.filter(function (r) { return r.time === "14:05"; })[0] || last;
  var yesterdayGood = sessions.length > 1 ? sessions[sessions.length - 2].goodPosturePct : pctGood;
  var postureDelta = pctGood - yesterdayGood;
  var postureDeltaText = postureDelta >= 0
    ? "improved by " + postureDelta + " points"
    : "fell by " + Math.abs(postureDelta) + " points";

  var alerts = [
    {
      id: "alt-01",
      category: "break",
      title: "Break due — 52 minutes of sitting",
      body: "Your last movement break ended at 16:08. A short walk would reset your posture streak.",
      time: "16:58",
      severity: "warn",
      status: "open"
    },
    {
      id: "alt-02",
      category: "environment",
      title: "Room temperature above your preferred range",
      body: last.temp + " °C now with " + last.humidity + "% humidity. Your range is 23–27 °C — consider ventilation or a cooler setting.",
      time: "16:40",
      severity: "warn",
      status: "open"
    },
    {
      id: "alt-03",
      category: "device",
      title: "Light sensor reading unstable",
      body: "LDR fell 42% in five minutes, then recovered. Check for a shadow or loose jumper wire.",
      time: "15:12",
      severity: "bad",
      status: "open"
    },
    {
      id: "alt-04",
      category: "break",
      title: "Missed break reminder",
      body: "The 15:30 movement reminder was dismissed without a break.",
      time: "15:30",
      severity: "bad",
      status: "missed"
    },
    {
      id: "alt-05",
      category: "digest",
      title: "Daily digest · 7 h 59 m monitored",
      body: "You took " + derived.breaksTaken + " breaks today, and your posture score " +
        postureDeltaText + " versus yesterday.",
      time: "17:00",
      severity: "good",
      status: "open"
    },
    {
      id: "alt-06",
      category: "device",
      title: "Desk unit reconnected",
      body: "Wi-Fi dropped for 40 seconds and recovered. No readings were lost.",
      time: "11:22",
      severity: "good",
      status: "dismissed"
    },
    {
      id: "alt-07",
      category: "environment",
      title: "Low ambient light",
      body: "LDR read " + at1405.light + " / 1023 during the cloudy afternoon. Desk lamp recommended.",
      time: "14:05",
      severity: "warn",
      status: "dismissed"
    },
    {
      id: "alt-08",
      category: "break",
      title: "Lunch break logged",
      body: "Presence sensor recorded 46 minutes away from the desk.",
      time: "13:15",
      severity: "good",
      status: "dismissed"
    }
  ];

  /* ---------- recommendations ---------- */
  var baseRecommendations = [
    {
      id: "rec-posture",
      priority: "high",
      icon: "posture",
      condition: "Prolonged sitting with screen too close",
      readings: [
        "Sitting " + sitting + " min",
        "Distance " + last.distance + " cm (preferred 50–70 cm)",
        "Posture score " + score + "/100"
      ],
      reason: "Your distance has stayed below your preferred range while your sitting streak passed the 50-minute break interval.",
      action: "Stand up for a short walk, then move the monitor back to keep 50–70 cm.",
      mode: "Refresh",
      learned: false,
      state: "active"
    },
    {
      id: "rec-light",
      priority: "medium",
      icon: "light",
      condition: "Ambient light below your comfort level",
      readings: [
        "LDR " + last.light + " / 1023",
        "Preferred minimum: 400",
        "Cloudy afternoon dip detected"
      ],
      reason: "Light has been falling since 15:15 and is now roughly half your usual working brightness.",
      action: "Turn on the desk lamp or open the blinds. Warm light is set for the evening.",
      mode: "Calm",
      learned: false,
      state: "active"
    },
    {
      id: "rec-temp",
      priority: "medium",
      icon: "temp",
      condition: "Room temperature above your preferred range",
      readings: [
        last.temp + " °C (preferred 23–27 °C)",
        last.humidity + "% humidity",
        "Rising since 13:00"
      ],
      reason: "The room has warmed steadily through the afternoon and is now outside your comfort range.",
      action: "Improve ventilation or turn on the fan. Keep water nearby.",
      mode: "Refresh",
      learned: false,
      state: "active"
    },
    {
      id: "rec-pattern",
      priority: "low",
      icon: "pattern",
      condition: "Recurring afternoon posture slump",
      readings: [
        "4 of the last 5 days",
        "Posture score drops ~18 points after 15:00",
        "Distance drifts 12 cm closer on average"
      ],
      reason: "DeskSense compared your own posture history across this week. No other data is used for this pattern.",
      action: "Try a 2-minute stretch at 15:00, or move your afternoon break 30 minutes earlier.",
      mode: null,
      learned: true,
      learnedNote: "Your posture tends to worsen after 3 p.m.",
      state: "active"
    }
  ];

  /* ---------- saved state (browser only) ---------- */
  var STORE_RECS = "desksense.recs";
  var STORE_FEEDBACK = "desksense.feedback";

  function readJSON(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) { return fallback; }
  }
  function writeJSON(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* storage blocked */ }
  }

  function getRecommendations() {
    var saved = readJSON(STORE_RECS, {});
    return baseRecommendations.map(function (rec) {
      var copy = JSON.parse(JSON.stringify(rec));
      if (saved[rec.id]) copy.state = saved[rec.id];
      return copy;
    });
  }

  function setRecommendationState(id, state) {
    var saved = readJSON(STORE_RECS, {});
    saved[id] = state;
    writeJSON(STORE_RECS, saved);
  }

  var baseFeedback = [
    { date: "Today", time: "14:20", feeling: "Tired" },
    { date: "Today", time: "11:05", feeling: "Okay" },
    { date: "Yesterday", time: "16:10", feeling: "Stressed" },
    { date: "Yesterday", time: "10:40", feeling: "Okay" },
    { date: "Mon 3 Nov", time: "15:25", feeling: "Tired" }
  ];

  function getFeedback() {
    var saved = readJSON(STORE_FEEDBACK, []);
    return saved.concat(baseFeedback);
  }

  function addFeedback(feeling) {
    var saved = readJSON(STORE_FEEDBACK, []);
    var now = new Date();
    var entry = {
      date: "Today",
      time: pad(now.getHours()) + ":" + pad(now.getMinutes()),
      feeling: feeling
    };
    saved.unshift(entry);
    writeJSON(STORE_FEEDBACK, saved);
    return entry;
  }

  function feedbackRecommendation(feeling) {
    if (feeling === "Tired") {
      return {
        condition: "You reported feeling tired",
        readings: ["Self-reported check-in: Tired", "Sitting " + sitting + " min", "Light " + last.light + " / 1023"],
        reason: "Your own check-in is the only signal used here. DeskSense does not read feelings from your face.",
        action: "Try Refresh mode: brighter light, a short walk, and a screen break.",
        mode: "Refresh"
      };
    }
    if (feeling === "Stressed") {
      return {
        condition: "You reported feeling stressed",
        readings: ["Self-reported check-in: Stressed", "Sitting " + sitting + " min", last.temp + " °C"],
        reason: "Your own check-in is the only signal used here. DeskSense does not read feelings from your face.",
        action: "Try Calm mode: softer warm light and a slow breathing exercise.",
        mode: "Calm"
      };
    }
    return {
      condition: "You reported feeling okay",
      readings: ["Self-reported check-in: Okay", "Posture score " + score + "/100", last.temp + " °C"],
      reason: "Your check-in suggests no extra comfort support is needed right now.",
      action: "Keep your current setup. DeskSense will only interrupt for breaks.",
      mode: "Focus"
    };
  }

  /* ---------- modes ---------- */
  var modes = [
    {
      id: "calm",
      name: "Calm",
      glow: "139,124,199",
      tagline: "Softer light, slower pace.",
      description: "Lowers visual intensity and offers an optional breathing exercise. Built for winding down after a demanding block.",
      lighting: "Warm 2700 K · 40%",
      actions: ["Dim desk lamp to 40%", "Offer a 60-second breathing exercise", "Suggest a 5-minute screen break"]
    },
    {
      id: "focus",
      name: "Focus",
      glow: "111,211,165",
      tagline: "Steady task light, fewer interruptions.",
      description: "Sets a cool task-light recommendation and one configurable focus block with a movement reminder at the end.",
      lighting: "Cool 4000 K · 80%",
      actions: ["Raise task light to 80%", "Start a 50-minute focus block", "Schedule a movement reminder"]
    },
    {
      id: "refresh",
      name: "Refresh",
      glow: "242,196,109",
      tagline: "Brighter room, new activity.",
      description: "For tired afternoons: brightens the space, suggests movement and a change of task.",
      lighting: "Neutral 3500 K · 90%",
      actions: ["Brighten lamp to 90%", "Suggest a 3-minute stretch", "Offer a screen break"]
    },
    {
      id: "mindfulness",
      name: "Mindfulness",
      glow: "185,169,240",
      tagline: "Intentional pause, low light.",
      description: "A quiet environment suggestion with optional guided breathing and user-selected ambient audio.",
      lighting: "Warm 2400 K · 30%",
      actions: ["Dim lamp to 30%", "Offer guided breathing", "Silence notifications for 10 minutes"]
    }
  ];

  /* ---------- feedback-driven recommendation for the popup ---------- */
  return {
    readings: readings,
    derived: derived,
    sessions: sessions,
    alerts: alerts,
    preferences: preferences,
    devices: devices,
    adaptiveControls: adaptiveControls,
    modes: modes,
    feedbackHistory: baseFeedback,
    helpers: {
      hhmm: hhmm,
      clamp: clamp,
      postureScore: postureScore,
      goodPosturePct: goodPosturePct,
      sittingStreak: sittingStreak
    },
    getRecommendations: getRecommendations,
    setRecommendationState: setRecommendationState,
    getFeedback: getFeedback,
    addFeedback: addFeedback,
    feedbackRecommendation: feedbackRecommendation,
    get __seed() { return 20261107; }
  };
})();
