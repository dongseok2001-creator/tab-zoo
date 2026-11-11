/* global chrome */

const STORAGE_KEY = "tabZooStateV1";
const COLOR_KEY = "tabZooColorCacheV1";
const MAP_KEY = "tabZooMapThemeV1";
const HIDE_EGGS_KEY = "tabZooHideEggsV1";
const TEN_MINUTES = 10 * 60 * 1000;
const SESSION_STALE_MS = 2 * 60 * 1000;

const species = ["sauropod", "trex", "triceratops", "cat", "fox", "duck", "elephant"];
const speciesNames = {
  sauropod: "브라키오",
  trex: "티라노",
  triceratops: "트리케라",
  cat: "고양이",
  fox: "사막여우",
  duck: "오리",
  elephant: "코끼리",
};
const knownSites = {
  youtube: "YouTube",
  naver: "Naver",
  google: "Google",
  gmail: "Gmail",
  github: "GitHub",
  spotify: "Spotify",
  netflix: "Netflix",
  notion: "Notion",
  reddit: "Reddit",
};
const googleServices = {
  accounts: "Google Account",
  books: "Google Books",
  calendar: "Google Calendar",
  chat: "Google Chat",
  cloud: "Google Cloud",
  contacts: "Google Contacts",
  docs: "Google Docs",
  drive: "Google Drive",
  earth: "Google Earth",
  finance: "Google Finance",
  keep: "Google Keep",
  mail: "Gmail",
  maps: "Google Maps",
  meet: "Google Meet",
  messages: "Google Messages",
  news: "Google News",
  photos: "Google Photos",
  play: "Google Play",
  scholar: "Google Scholar",
  sites: "Google Sites",
  translate: "Google Translate",
  voice: "Google Voice",
  workspace: "Google Workspace",
};
const googleServiceColors = {
  calendar: "#4285f4",
  chat: "#34a853",
  docs: "#4285f4",
  drive: "#34a853",
  keep: "#fbbc04",
  mail: "#ea4335",
  maps: "#ea4335",
  meet: "#34a853",
  translate: "#4285f4",
};
const googleDocsProducts = {
  document: { name: "Google Docs", color: "#4285f4" },
  forms: { name: "Google Forms", color: "#a142f4" },
  presentation: { name: "Google Slides", color: "#fbbc04" },
  spreadsheets: { name: "Google Sheets", color: "#34a853" },
};

const spriteParts = `
  <i class="part tail one"></i><i class="part tail two"></i>
  <i class="part neck"></i><i class="part body"></i><i class="part belly"></i>
  <i class="part wing one"></i><i class="part wing two"></i>
  <i class="part head"></i><i class="part snout"></i>
  <i class="part ear one"></i><i class="part ear two"></i>
  <i class="part horn one"></i><i class="part horn two"></i>
  <i class="part arm one"></i><i class="part arm two"></i>
  <i class="part leg one"></i><i class="part leg two"></i><i class="part leg three"></i><i class="part leg four"></i>
  <i class="part mark one"></i><i class="part mark two"></i>
  <i class="part eye one"></i><i class="part eye two"></i><i class="sleep-puff">Z</i>`;

const elements = {
  count: document.querySelector("#tab-count"),
  map: document.querySelector("#zoo-map"),
  mapTheme: document.querySelector("#map-theme"),
  toggleEggs: document.querySelector("#toggle-eggs"),
  reset: document.querySelector("#reset-zoo"),
  creatures: document.querySelector("#creatures"),
  empty: document.querySelector("#empty-state"),
  favicon: document.querySelector("#observed-favicon"),
  name: document.querySelector("#observed-name"),
  domain: document.querySelector("#observed-domain"),
  summary: document.querySelector("#observed-summary"),
};

let renderedModels = [];
let eggsHidden = false;

const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
const mapThemes = new Set(["meadow", "siberia", "desert"]);

function applyMapTheme(value) {
  const migrated = value === "tundra" ? "siberia" : value;
  const theme = mapThemes.has(migrated) ? migrated : "meadow";
  elements.map.dataset.theme = theme;
  elements.mapTheme.value = theme;
  return theme;
}

function domainFromUrl(url) {
  try {
    const parsed = new URL(url);
    if (!["http:", "https:"].includes(parsed.protocol)) return null;
    return parsed.hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return null;
  }
}

function hashText(text) {
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function googleServiceKey(domain) {
  if (!domain.endsWith(".google.com")) return null;
  return domain.slice(0, -".google.com".length).split(".").pop();
}

function googleDocsProduct(pageUrl) {
  try {
    const segment = new URL(pageUrl).pathname.split("/").filter(Boolean)[0];
    return googleDocsProducts[segment] ?? null;
  } catch {
    return null;
  }
}

function preferredServiceColor(domain, pageUrl) {
  if (domain === "gmail.com") return "#ea4335";
  const service = googleServiceKey(domain);
  if (service === "docs") return googleDocsProduct(pageUrl)?.color ?? googleServiceColors.docs;
  return googleServiceColors[service] ?? null;
}

function rootName(domain, pageUrl) {
  if (/^google\.[a-z.]+$/.test(domain)) return "Google";
  const service = googleServiceKey(domain);
  if (service) {
    if (service === "docs") return googleDocsProduct(pageUrl)?.name ?? googleServices.docs;
    return googleServices[service]
      ?? `Google ${service.charAt(0).toUpperCase()}${service.slice(1)}`;
  }
  const parts = domain.split(".");
  const root = parts.length > 1 ? parts[parts.length - 2] : parts[0];
  return knownSites[root] ?? root.charAt(0).toUpperCase() + root.slice(1);
}

function faviconUrl(pageUrl) {
  const url = new URL(chrome.runtime.getURL("/_favicon/"));
  url.searchParams.set("pageUrl", pageUrl);
  url.searchParams.set("size", "32");
  return url.toString();
}

function fallbackColor(domain) {
  const hue = hashText(domain) % 360;
  return hslToHex(hue / 360, 0.82, 0.56);
}

function rgbToHsl(red, green, blue) {
  const r = red / 255;
  const g = green / 255;
  const b = blue / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const light = (max + min) / 2;
  if (max === min) return [0, 0, light];
  const delta = max - min;
  const saturation = light > 0.5 ? delta / (2 - max - min) : delta / (max + min);
  let hue;
  if (max === r) hue = (g - b) / delta + (g < b ? 6 : 0);
  else if (max === g) hue = (b - r) / delta + 2;
  else hue = (r - g) / delta + 4;
  return [hue / 6, saturation, light];
}

function hslToHex(hue, saturation, light) {
  const hueToRgb = (p, q, t) => {
    let value = t;
    if (value < 0) value += 1;
    if (value > 1) value -= 1;
    if (value < 1 / 6) return p + (q - p) * 6 * value;
    if (value < 1 / 2) return q;
    if (value < 2 / 3) return p + (q - p) * (2 / 3 - value) * 6;
    return p;
  };
  let red;
  let green;
  let blue;
  if (saturation === 0) red = green = blue = light;
  else {
    const q = light < 0.5 ? light * (1 + saturation) : light + saturation - light * saturation;
    const p = 2 * light - q;
    red = hueToRgb(p, q, hue + 1 / 3);
    green = hueToRgb(p, q, hue);
    blue = hueToRgb(p, q, hue - 1 / 3);
  }
  return `#${[red, green, blue].map((value) => Math.round(value * 255).toString(16).padStart(2, "0")).join("")}`;
}

function shiftColor(hex, amount) {
  const value = hex.replace("#", "");
  const channels = [0, 2, 4].map((start) => parseInt(value.slice(start, start + 2), 16));
  return `#${channels.map((channel) => clamp(Math.round(channel + amount), 0, 255).toString(16).padStart(2, "0")).join("")}`;
}

async function loadImage(url) {
  const image = new Image();
  image.src = url;
  await image.decode();
  return image;
}

async function colorFromFavicon(pageUrl, domain) {
  try {
    const image = await loadImage(faviconUrl(pageUrl));
    const canvas = document.createElement("canvas");
    canvas.width = 24;
    canvas.height = 24;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    context.drawImage(image, 0, 0, 24, 24);
    const pixels = context.getImageData(0, 0, 24, 24).data;
    const buckets = new Map();
    for (let index = 0; index < pixels.length; index += 4) {
      const alpha = pixels[index + 3];
      if (alpha < 120) continue;
      const red = pixels[index];
      const green = pixels[index + 1];
      const blue = pixels[index + 2];
      const [, saturation, light] = rgbToHsl(red, green, blue);
      if (light < 0.08 || light > 0.94 || saturation < 0.16) continue;
      const key = `${red >> 5}-${green >> 5}-${blue >> 5}`;
      const bucket = buckets.get(key) ?? { red: 0, green: 0, blue: 0, count: 0, score: 0 };
      bucket.red += red;
      bucket.green += green;
      bucket.blue += blue;
      bucket.count += 1;
      bucket.score += 0.45 + saturation;
      buckets.set(key, bucket);
    }
    const winner = [...buckets.values()].sort((a, b) => b.score - a.score)[0];
    if (!winner) return fallbackColor(domain);
    const [hue, saturation, light] = rgbToHsl(
      winner.red / winner.count,
      winner.green / winner.count,
      winner.blue / winner.count,
    );
    return hslToHex(hue, Math.max(0.74, saturation), clamp(light, 0.46, 0.62));
  } catch {
    return fallbackColor(domain);
  }
}

function median(values) {
  if (!values.length) return 1;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function visualFromMetrics(metrics) {
  const growth = clamp(Math.pow(metrics.total / 120, 0.72));
  const scale = (0.38 + growth * 1.62) * 0.55;
  const eggScale = (0.38 + Math.pow(10 / 120, 0.72) * 1.62) * 0.55;
  const calmness = clamp((Math.log1p(metrics.typical) - Math.log1p(0.25)) / (Math.log1p(45) - Math.log1p(0.25)));
  const restlessness = clamp((metrics.visits / 42) * 1.25 * (1 - calmness * 0.35));
  const charge = clamp(Math.pow(metrics.streak / 90, 0.72));
  const behavioralWidthRatio = clamp(1 + charge * 0.9 - restlessness * 0.7, 0.38, 2.4);
  const hopSpeed = clamp(4.8 - restlessness * 4.05 + calmness * 1.25, 0.55, 5.5);
  const phase = metrics.total < 1 ? "egg" : metrics.total < 5 ? "juvenile" : "adult";
  const widthRatio = phase === "egg" ? 1 : behavioralWidthRatio;
  const stage = metrics.total < 1 ? "알" : metrics.total < 5 ? "유년체" : metrics.total < 60 ? "성체" : metrics.total < 120 ? "거대종" : "최대 크기";
  const asleep = metrics.idle >= 35;
  const drowsy = metrics.idle >= 10 && !asleep;
  const drowsyProgress = drowsy ? clamp((metrics.idle - 10) / 25) : 0;
  return { scale, eggScale, widthRatio, hopSpeed, phase, stage, asleep, drowsy, drowsyProgress };
}

function displayName(model) {
  if (model.visual.phase === "egg") return `${model.siteName} 알`;
  if (model.visual.phase === "juvenile") return `${model.siteName} 유년체`;
  return `${model.siteName} ${speciesNames[model.species]}`;
}

function summaryFor(model) {
  if (model.visual.phase === "egg") {
    return "아직 알 속에 있어 움직이지 않습니다. 관심을 먹으면 유년체로 깨어납니다.";
  }

  const descriptions = {
    sauropod: "긴 목으로 맵 너머를 살피는 느긋한 초식 공룡입니다.",
    trex: "커다란 머리와 짧은 앞발을 지닌 당당한 육식 공룡입니다.",
    triceratops: "세 개의 뿔로 앞길을 헤쳐 나가는 든든한 초식 공룡입니다.",
    cat: "조용한 자리를 찾아 사뿐사뿐 돌아다니는 고양이입니다.",
    fox: "큰 귀를 쫑긋 세우고 맵 곳곳을 누비는 영리한 사막여우입니다.",
    duck: "납작한 부리와 작은 날개를 흔들며 뒤뚱뒤뚱 걷는 오리입니다.",
    elephant: "커다란 귀와 긴 코를 지닌 느긋하고 듬직한 코끼리입니다.",
  };
  const shape = model.visual.widthRatio >= 1.15
    ? " 오래 머물러 몸통이 통통해졌습니다."
    : model.visual.widthRatio <= 0.85
      ? " 탭 사이를 자주 오가 몸통이 날렵해졌습니다."
      : " 균형 잡힌 몸통을 유지하고 있습니다.";
  const rest = model.visual.asleep
    ? " 지금은 편안히 자는 중입니다."
    : model.visual.drowsy
      ? model.visual.drowsyProgress < 0.34
        ? " 눈꺼풀이 조금 무거워졌습니다."
        : model.visual.drowsyProgress < 0.7
          ? " 꾸벅꾸벅 졸고 있습니다."
          : " 곧 잠들 것처럼 많이 졸립니다."
      : "";
  const youth = model.visual.phase === "juvenile" ? " 아직 둥글고 작은 유년체입니다." : "";
  return `${descriptions[model.species]}${youth}${shape}${rest}`;
}

function updateObserver(model) {
  elements.favicon.src = model.favicon;
  elements.name.textContent = displayName(model);
  elements.domain.textContent = model.domain;
  elements.summary.textContent = summaryFor(model);
}

async function focusTab(model) {
  await chrome.tabs.update(model.tab.id, { active: true });
  await chrome.windows.update(model.tab.windowId, { focused: true });
  window.close();
}

function renderCreature(model, index) {
  const hash = hashText(model.domain);
  let x = 6 + (hash % 60);
  let y = 10 + ((hash >>> 8) % 48);
  if (x > 55 && y > 49) {
    y = 44 - (hash % 6);
  }
  const sizeFactor = clamp((model.visual.scale - 0.38) / 0.72);
  const dx = 8 + (hash % 18) + Math.round(sizeFactor * 4);
  const dy = 6 + ((hash >>> 12) % 12) + Math.round(sizeFactor * 3);
  const phaseScale = model.visual.phase === "egg"
    ? model.visual.eggScale * 1.38
    : model.visual.phase === "juvenile"
      ? model.visual.scale * 1.08
      : model.visual.scale;
  const baseHitWidth = model.visual.phase === "egg" ? 36 : model.visual.phase === "juvenile" ? 58 : 92;
  const baseHitHeight = model.visual.phase === "egg" ? 47 : model.visual.phase === "juvenile" ? 44 : 62;
  const hitWidth = clamp(Math.round(baseHitWidth * phaseScale * model.visual.widthRatio + 8), 24, 240);
  const hitHeight = clamp(Math.round(baseHitHeight * phaseScale + 8), 24, 82);
  const drowsyProgress = model.visual.phase === "egg" ? 0 : model.visual.drowsyProgress;
  const hitShift = model.visual.asleep ? 10 : Math.round(drowsyProgress * 5);
  const labelBottom = Math.round(hitShift + hitHeight / 2 - 41);
  const roamSpeed = clamp(model.visual.hopSpeed * 3.5 + sizeFactor * 2, 10, 20) * (1 + drowsyProgress * 0.65);
  const hopSpeed = model.visual.hopSpeed + drowsyProgress * 2.2;
  const drowsyClass = drowsyProgress > 0 ? "drowsy" : "";
  const article = document.createElement("article");
  article.className = `creature ${model.visual.phase === "egg" ? "egg" : ""} ${model.visual.asleep ? "asleep" : ""} ${model.tab.active ? "active" : ""}`;
  article.style.cssText = `--x:${x}%;--y:${y}%;--dx:${dx}px;--dy:${dy}px;--hit-w:${hitWidth}px;--hit-h:${hitHeight}px;--hit-y:${hitShift}px;--label-bottom:${labelBottom}px;--delay:-${index * 2.1}s;--accent:${model.accent};--shade:${model.shade};--mark:${model.mark};--scale:${model.visual.scale.toFixed(3)};--egg-scale:${model.visual.eggScale.toFixed(3)};--width-ratio:${model.visual.widthRatio.toFixed(3)};--hop-speed:${hopSpeed.toFixed(2)}s;--roam-speed:${roamSpeed.toFixed(1)}s;--drowsy-drop:${(drowsyProgress * 5).toFixed(2)}px;--drowsy-tilt:${(-drowsyProgress * 2.5).toFixed(2)}deg;--drowsy-eye-scale:${(1 - drowsyProgress * 0.72).toFixed(3)}`;

  const button = document.createElement("button");
  button.type = "button";
  button.className = "creature-button";
  button.setAttribute("aria-label", `${displayName(model)}, ${model.domain} 탭 열기`);
  button.innerHTML = `
    <span class="sprite-stage"><span class="sprite-scale ${model.visual.phase === "egg" ? "egg-scale" : ""}"><span class="pixel-sprite phase-${model.visual.phase} ${drowsyClass} ${model.visual.asleep ? "sleeping" : ""}" data-species="${model.species}">${spriteParts}</span></span></span>
    <span class="creature-name">${escapeHtml(displayName(model))}</span>`;
  button.addEventListener("mouseenter", () => updateObserver(model));
  button.addEventListener("focus", () => updateObserver(model));
  button.addEventListener("click", () => focusTab(model));
  article.append(button);
  elements.creatures.append(article);
}

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character]);
}

async function getSnapshot() {
  try {
    const response = await chrome.runtime.sendMessage({ type: "snapshot" });
    if (response?.ok) return response;
  } catch {
    // Fall back to storage when the background worker is restarting.
  }
  const stored = await chrome.storage.local.get(STORAGE_KEY);
  return { state: stored[STORAGE_KEY] ?? { records: {}, seenTabs: {}, registeredTabs: {}, activationGate: false, resetAt: 0, session: null }, now: Date.now() };
}

async function init() {
  const [tabs, snapshot, cached] = await Promise.all([
    chrome.tabs.query({ currentWindow: true }),
    getSnapshot(),
    chrome.storage.local.get([
      COLOR_KEY,
      MAP_KEY,
      HIDE_EGGS_KEY,
    ]),
  ]);
  const selectedTheme = applyMapTheme(cached[MAP_KEY]);
  const state = snapshot.state ?? { records: {}, seenTabs: {}, registeredTabs: {}, activationGate: false, resetAt: 0, session: null };
  const usableTabs = tabs.filter((tab) => {
    const domain = domainFromUrl(tab.url);
    if (!domain) return false;
    const resetAt = state.resetAt ?? 0;
    const registration = state.registeredTabs?.[String(tab.id)];
    const explicitlyOpenedSinceReset = registration?.domain === domain && registration.at >= resetAt;
    if (resetAt > 0) return explicitlyOpenedSinceReset;
    const hasDomainHistory = Boolean(state.records?.[domain]);
    const wasSeen = state.seenTabs?.[String(tab.id)] === domain;
    return tab.active || hasDomainHistory || wasSeen;
  });
  const prioritizedTabs = [...usableTabs].sort((a, b) =>
    Number(b.active) - Number(a.active)
    || (b.lastAccessed ?? 0) - (a.lastAccessed ?? 0)
    || (b.index ?? 0) - (a.index ?? 0)
  );
  const byDomain = new Map();
  for (const tab of prioritizedTabs) {
    const domain = domainFromUrl(tab.url);
    if (!byDomain.has(domain) || tab.active) byDomain.set(domain, tab);
  }
  const grouped = [...byDomain.entries()].slice(0, 10);
  const colorCache = cached[COLOR_KEY] ?? {};
  const now = snapshot.now ?? Date.now();
  const models = [];

  for (const [domain, tab] of grouped) {
    const assignedSpecies = state.speciesMap?.[domain] === "owl" ? "duck" : state.speciesMap?.[domain];
    if (!species.includes(assignedSpecies)) continue;
    const record = state.records?.[domain] ?? { totalMs: 0, sessionsMs: [], visits: [], lastSeen: now };
    const currentSession = state.session?.domain === domain ? state.session : null;
    const lastHeartbeatAt = currentSession
      ? Number.isFinite(currentSession.lastHeartbeatAt)
        ? currentSession.lastHeartbeatAt
        : currentSession.startedAt
      : 0;
    const sessionIsFresh = Boolean(currentSession && now - lastHeartbeatAt <= SESSION_STALE_MS);
    const sessionEnd = currentSession ? (sessionIsFresh ? now : lastHeartbeatAt) : 0;
    const activeExtra = currentSession ? Math.max(0, sessionEnd - currentSession.startedAt) : 0;
    const lastActiveAt = Math.max(record.lastSeen || 0, sessionEnd);
    const recentVisits = (record.visits ?? []).filter((time) => now - time <= TEN_MINUTES);
    const metrics = {
      total: (record.totalMs + activeExtra) / 60000,
      streak: sessionIsFresh ? activeExtra / 60000 : 0,
      typical: median(record.sessionsMs ?? []) / 60000,
      visits: recentVisits.length,
      idle: sessionIsFresh ? 0 : Math.max(0, now - (lastActiveAt || now)) / 60000,
    };
    const serviceColor = preferredServiceColor(domain, tab.url);
    const accent = serviceColor ?? colorCache[domain] ?? await colorFromFavicon(tab.url, domain);
    colorCache[domain] = accent;
    models.push({
      domain,
      tab,
      favicon: faviconUrl(tab.url),
      siteName: rootName(domain, tab.url),
      species: assignedSpecies,
      accent,
      shade: shiftColor(accent, -72),
      mark: shiftColor(accent, 85),
      metrics,
      visual: visualFromMetrics(metrics),
    });
  }

  await chrome.storage.local.set({
    [COLOR_KEY]: colorCache,
    [MAP_KEY]: selectedTheme,
  });
  models.sort((a, b) => Number(b.tab.active) - Number(a.tab.active) || b.metrics.total - a.metrics.total);
  models.forEach(renderCreature);
  renderedModels = models;
  eggsHidden = cached[HIDE_EGGS_KEY] === true;
  applyEggVisibility();
}

function applyEggVisibility() {
  const visibleModels = eggsHidden
    ? renderedModels.filter((model) => model.visual.phase !== "egg")
    : renderedModels;
  elements.creatures.querySelectorAll(".creature.egg").forEach((creature) => {
    creature.hidden = eggsHidden;
  });
  elements.toggleEggs.setAttribute("aria-pressed", String(eggsHidden));
  elements.toggleEggs.textContent = eggsHidden ? "알 보이기" : "알 숨기기";
  elements.count.textContent = `${visibleModels.length} domains roaming`;
  elements.empty.hidden = visibleModels.length > 0;
  if (visibleModels[0]) {
    updateObserver(visibleModels[0]);
  } else if (renderedModels.length > 0) {
    elements.favicon.removeAttribute("src");
    elements.name.textContent = "알을 숨겼습니다";
    elements.domain.textContent = "";
    elements.summary.textContent = "알 보이기 버튼을 누르면 아직 부화하지 않은 생물을 다시 볼 수 있습니다.";
  }
}

elements.mapTheme.addEventListener("change", async () => {
  const theme = applyMapTheme(elements.mapTheme.value);
  await chrome.storage.local.set({ [MAP_KEY]: theme });
});

elements.toggleEggs.addEventListener("click", async () => {
  eggsHidden = !eggsHidden;
  applyEggVisibility();
  await chrome.storage.local.set({ [HIDE_EGGS_KEY]: eggsHidden });
});

function showClearedZoo() {
  renderedModels = [];
  elements.creatures.replaceChildren();
  elements.count.textContent = "0 domains roaming";
  elements.empty.hidden = false;
  elements.favicon.removeAttribute("src");
  elements.name.textContent = "서식지가 비어 있습니다";
  elements.domain.textContent = "";
  elements.summary.textContent = "웹 탭을 다시 선택하거나 새로 열면 새로운 알이 등록됩니다.";
}

elements.reset.addEventListener("click", async () => {
  const approved = window.confirm("모든 동물과 사이트별 동물 배정, 성장·체류·왕복 기록을 삭제할까요? 현재 맵과 사이트 색은 유지됩니다.");
  if (!approved) return;
  elements.reset.disabled = true;
  try {
    const response = await chrome.runtime.sendMessage({ type: "reset" });
    if (!response?.ok) throw new Error("초기화 응답을 받지 못했습니다.");
    showClearedZoo();
    elements.reset.disabled = false;
  } catch (error) {
    console.error(error);
    elements.reset.disabled = false;
    window.alert("동물 상태를 초기화하지 못했습니다. 확장 프로그램을 다시 로드한 뒤 재시도해 주세요.");
  }
});

init().catch((error) => {
  console.error(error);
  elements.count.textContent = "불러오기 실패";
  elements.empty.hidden = false;
});
