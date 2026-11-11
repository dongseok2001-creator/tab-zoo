/* global chrome */

const STORAGE_KEY = "tabZooStateV1";
const SPECIES_KEY = "tabZooSpeciesMapV1";
const SPECIES_STATE_VERSION = 1;
const species = ["sauropod", "trex", "triceratops", "cat", "fox", "duck", "elephant"];
const TEN_MINUTES = 10 * 60 * 1000;
const MAX_SESSIONS = 20;
const MAX_VISITS = 80;
const IDLE_SECONDS = 5 * 60;
const HEARTBEAT_ALARM = "tab-zoo-heartbeat";
const HEARTBEAT_MINUTES = 1;
const SESSION_STALE_MS = 2 * 60 * 1000;

let taskQueue = Promise.resolve();

function enqueue(task) {
  taskQueue = taskQueue.then(task).catch((error) => console.error("Tab Zoo:", error));
  return taskQueue;
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

function emptyState() {
  return {
    records: {},
    seenTabs: {},
    registeredTabs: {},
    activationGate: false,
    resetAt: 0,
    session: null,
    speciesStateVersion: SPECIES_STATE_VERSION,
    speciesGeneration: 0,
    speciesMap: {},
  };
}

async function readState() {
  const stored = await chrome.storage.local.get([STORAGE_KEY, SPECIES_KEY]);
  const state = stored[STORAGE_KEY] ?? emptyState();
  state.records ??= {};
  state.seenTabs ??= {};
  state.registeredTabs ??= {};
  state.activationGate ??= false;
  state.resetAt ??= 0;
  if (state.speciesStateVersion !== SPECIES_STATE_VERSION) {
    state.speciesMap = stored[SPECIES_KEY] ?? state.speciesMap ?? {};
    state.speciesStateVersion = SPECIES_STATE_VERSION;
  }
  state.speciesGeneration ??= 0;
  state.speciesMap ??= {};
  delete state.resetTabAccess;
  delete state.suppressedTabs;
  state.session ??= null;
  if (state.session && !Number.isFinite(state.session.lastHeartbeatAt)) {
    state.session.lastHeartbeatAt = state.session.startedAt;
  }
  return state;
}

function assignSpecies(state, domain) {
  if (state.speciesMap[domain] === "owl") state.speciesMap[domain] = "duck";
  if (species.includes(state.speciesMap[domain])) return state.speciesMap[domain];
  const assigned = species[Math.floor(Math.random() * species.length)];
  state.speciesMap[domain] = assigned;
  return assigned;
}

async function writeState(state) {
  await chrome.storage.local.set({ [STORAGE_KEY]: state });
}

function ensureRecord(state, domain) {
  state.records[domain] ??= {
    totalMs: 0,
    sessionsMs: [],
    visits: [],
    lastSeen: 0,
    title: "",
    url: "",
  };
  return state.records[domain];
}

function pruneVisits(visits, now) {
  return visits.filter((time) => now - time <= TEN_MINUTES).slice(-MAX_VISITS);
}

function settleSession(state, now) {
  const session = state.session;
  if (!session) return;

  const record = ensureRecord(state, session.domain);
  const endedAt = Math.max(session.startedAt, now);
  const elapsed = endedAt - session.startedAt;
  record.totalMs += elapsed;
  record.lastSeen = endedAt;
  if (elapsed >= 1000) {
    record.sessionsMs = [...record.sessionsMs, elapsed].slice(-MAX_SESSIONS);
  }
  state.session = null;
}

function expireStaleSession(state, now) {
  const session = state.session;
  if (!session) return false;
  const lastHeartbeatAt = Number.isFinite(session.lastHeartbeatAt)
    ? session.lastHeartbeatAt
    : session.startedAt;
  if (now - lastHeartbeatAt <= SESSION_STALE_MS) return false;
  settleSession(state, lastHeartbeatAt);
  return true;
}

async function beginTab(tab, now = Date.now(), { countVisit = true, allowRegistration = false } = {}) {
  const domain = domainFromUrl(tab?.url);
  const idleState = await chrome.idle.queryState(IDLE_SECONDS);
  const shouldTrack = idleState === "active" || (idleState === "idle" && tab?.audible);
  const state = await readState();
  expireStaleSession(state, now);

  if (!domain || !tab?.id || !shouldTrack) {
    settleSession(state, now);
    await writeState(state);
    return state;
  }

  const tabKey = String(tab.id);
  const registrationRequired = state.activationGate || state.resetAt > 0;
  const registration = state.registeredTabs[tabKey];
  const isRegistered = registration?.domain === domain && registration.at >= state.resetAt;
  if (registrationRequired && !isRegistered && !allowRegistration) {
    settleSession(state, now);
    await writeState(state);
    return state;
  }
  if (registrationRequired && allowRegistration) {
    state.registeredTabs[tabKey] = { domain, at: now };
  }

  assignSpecies(state, domain);
  if (state.session?.tabId === tab.id && state.session?.domain === domain) {
    state.session.lastHeartbeatAt = now;
    state.seenTabs[tabKey] = domain;
    const record = ensureRecord(state, domain);
    record.title = tab.title ?? record.title;
    record.url = tab.url ?? record.url;
    record.lastSeen = now;
    await writeState(state);
    return state;
  }

  settleSession(state, now);
  state.seenTabs[tabKey] = domain;
  const record = ensureRecord(state, domain);
  record.visits = pruneVisits(record.visits, now);
  if (countVisit && (!record.visits.length || now - record.visits[record.visits.length - 1] > 3000)) {
    record.visits.push(now);
  }
  record.title = tab.title ?? record.title;
  record.url = tab.url ?? record.url;
  record.lastSeen = now;
  state.session = {
    tabId: tab.id,
    windowId: tab.windowId,
    domain,
    startedAt: now,
    lastHeartbeatAt: now,
  };
  await writeState(state);
  return state;
}

async function focusedTab() {
  const window = await chrome.windows.getLastFocused();
  if (!window?.focused || window.id === chrome.windows.WINDOW_ID_NONE) return null;
  const tabs = await chrome.tabs.query({ active: true, windowId: window.id });
  return tabs[0] ?? null;
}

async function refreshFocusedTab(options = {}) {
  return beginTab(await focusedTab(), Date.now(), options);
}

async function endCurrentSession(now = Date.now()) {
  const state = await readState();
  expireStaleSession(state, now);
  settleSession(state, now);
  await writeState(state);
  return state;
}

async function ensureHeartbeatAlarm() {
  const alarm = await chrome.alarms.get(HEARTBEAT_ALARM);
  if (!alarm) {
    await chrome.alarms.create(HEARTBEAT_ALARM, { periodInMinutes: HEARTBEAT_MINUTES });
  }
}

async function resetTracking() {
  const now = Date.now();
  const previousState = await readState();
  const state = {
    records: {},
    seenTabs: {},
    registeredTabs: {},
    activationGate: true,
    resetAt: now,
    session: null,
    speciesStateVersion: SPECIES_STATE_VERSION,
    speciesGeneration: previousState.speciesGeneration + 1,
    speciesMap: {},
  };
  await Promise.all([
    writeState(state),
    chrome.storage.local.remove(SPECIES_KEY),
  ]);
  return state;
}

chrome.idle.setDetectionInterval(IDLE_SECONDS);
ensureHeartbeatAlarm().catch((error) => console.error("Tab Zoo:", error));

chrome.runtime.onInstalled.addListener(() => {
  enqueue(async () => {
    await ensureHeartbeatAlarm();
    await refreshFocusedTab({ countVisit: false });
  });
});

chrome.runtime.onStartup.addListener(() => {
  enqueue(async () => {
    await ensureHeartbeatAlarm();
    await refreshFocusedTab({ countVisit: false });
  });
});

chrome.tabs.onActivated.addListener(({ tabId }) => {
  enqueue(async () => {
    const tab = await chrome.tabs.get(tabId);
    const window = await chrome.windows.get(tab.windowId);
    if (!window.focused) return;
    await beginTab(tab, Date.now(), { allowRegistration: true });
  });
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (!tab.active) return;
  if (changeInfo.url || changeInfo.status === "loading") {
    enqueue(async () => {
      const window = await chrome.windows.get(tab.windowId);
      if (!window.focused) return;
      await beginTab(tab, Date.now());
    });
    return;
  }
  if (Object.hasOwn(changeInfo, "audible")) {
    enqueue(async () => {
      const window = await chrome.windows.get(tab.windowId);
      if (!window.focused) return;
      await beginTab(tab, Date.now(), {
        countVisit: false,
      });
    });
  }
});

chrome.tabs.onRemoved.addListener((tabId) => {
  enqueue(async () => {
    const state = await readState();
    expireStaleSession(state, Date.now());
    delete state.seenTabs[String(tabId)];
    delete state.registeredTabs[String(tabId)];
    if (state.session?.tabId === tabId) {
      settleSession(state, Date.now());
    }
    await writeState(state);
  });
});

chrome.windows.onFocusChanged.addListener((windowId) => {
  enqueue(async () => {
    if (windowId === chrome.windows.WINDOW_ID_NONE) {
      await endCurrentSession();
      return;
    }
    const tabs = await chrome.tabs.query({ active: true, windowId });
    await beginTab(tabs[0] ?? null, Date.now(), { countVisit: false });
  });
});

chrome.idle.onStateChanged.addListener((newState) => {
  enqueue(async () => {
    if (newState === "locked") {
      await endCurrentSession();
      return;
    }
    await refreshFocusedTab({ countVisit: false });
  });
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name !== HEARTBEAT_ALARM) return;
  enqueue(() => refreshFocusedTab({ countVisit: false }));
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!["snapshot", "reset"].includes(message?.type)) return false;
  enqueue(async () => {
    const state = message.type === "reset"
      ? await resetTracking()
      : await refreshFocusedTab({ countVisit: false, allowRegistration: true });
    sendResponse({ ok: true, state, now: Date.now() });
  });
  return true;
});
