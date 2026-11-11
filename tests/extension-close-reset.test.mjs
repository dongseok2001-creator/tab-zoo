import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const extensionRoot = new URL("../extension/", import.meta.url);

function eventSlot() {
  return { addListener(listener) { this.listener = listener; } };
}

function record(totalMs) {
  return { totalMs, sessionsMs: [totalMs], visits: [], lastSeen: 1, title: "", url: "" };
}

async function loadBackground({ openTabs, state }) {
  const data = { tabZooStateV1: state, tabZooSpeciesMapV1: { "legacy.com": "cat" } };
  const chrome = {
    storage: {
      local: {
        async get(key) {
          return typeof key === "string" ? { [key]: data[key] } : { ...data };
        },
        async set(values) { Object.assign(data, values); },
        async remove(key) { delete data[key]; },
      },
    },
    idle: {
      setDetectionInterval() {},
      async queryState() { return "active"; },
      onStateChanged: eventSlot(),
    },
    alarms: {
      async get() { return { name: "tab-zoo-heartbeat" }; },
      async create() {},
      onAlarm: eventSlot(),
    },
    runtime: {
      onInstalled: eventSlot(),
      onStartup: eventSlot(),
      onMessage: eventSlot(),
    },
    tabs: {
      async query() { return openTabs; },
      onActivated: eventSlot(),
      onUpdated: eventSlot(),
      onRemoved: eventSlot(),
    },
    windows: {
      WINDOW_ID_NONE: -1,
      async getLastFocused() { return { id: -1, focused: false }; },
      onFocusChanged: eventSlot(),
    },
  };

  const source = await readFile(new URL("background.js", extensionRoot), "utf8");
  const context = vm.createContext({ chrome, console, URL });
  vm.runInContext(source, context);
  return { chrome, data, drain: () => vm.runInContext("taskQueue", context) };
}

function baseState() {
  return {
    records: { "a.com": record(60000), "b.com": record(120000) },
    seenTabs: { 1: "a.com", 2: "b.com", 3: "b.com" },
    registeredTabs: {},
    activationGate: false,
    resetAt: 0,
    session: null,
    speciesStateVersion: 1,
    speciesGeneration: 0,
    speciesMap: { "a.com": "fox", "b.com": "duck" },
  };
}

test("closing the last tab of a site resets that site's animal", async () => {
  const openTabs = [
    { id: 2, url: "https://b.com/" },
    { id: 3, url: "https://b.com/x" },
  ];
  const { chrome, data, drain } = await loadBackground({ openTabs, state: baseState() });

  chrome.tabs.onRemoved.listener(1, { windowId: 1, isWindowClosing: false });
  await drain();

  const state = data.tabZooStateV1;
  assert.equal(state.records["a.com"], undefined);
  assert.equal(state.speciesMap["a.com"], undefined);
  assert.equal(state.records["b.com"].totalMs, 120000);
  assert.equal(state.speciesMap["b.com"], "duck");
});

test("a site still open in another tab keeps its animal", async () => {
  const openTabs = [
    { id: 1, url: "https://a.com/" },
    { id: 3, url: "https://b.com/x" },
  ];
  const { chrome, data, drain } = await loadBackground({ openTabs, state: baseState() });

  chrome.tabs.onRemoved.listener(2, { windowId: 1, isWindowClosing: false });
  await drain();

  assert.equal(data.tabZooStateV1.records["b.com"].totalMs, 120000);
  assert.equal(data.tabZooStateV1.speciesMap["b.com"], "duck");
});

test("closing a window resets every site that was only open there", async () => {
  const openTabs = [];
  const { chrome, data, drain } = await loadBackground({ openTabs, state: baseState() });

  for (const tabId of [1, 2, 3]) {
    chrome.tabs.onRemoved.listener(tabId, { windowId: 1, isWindowClosing: true });
  }
  await drain();

  assert.deepEqual(Object.keys(data.tabZooStateV1.records), []);
  assert.deepEqual(Object.keys(data.tabZooStateV1.speciesMap), []);
});

test("restarting the browser starts a fresh zoo", async () => {
  const openTabs = [{ id: 10, url: "https://a.com/" }];
  const state = { ...baseState(), session: { tabId: 1, windowId: 1, domain: "a.com", startedAt: 1, lastHeartbeatAt: 1 } };
  const { chrome, data, drain } = await loadBackground({ openTabs, state });

  chrome.runtime.onStartup.listener();
  await drain();

  const next = data.tabZooStateV1;
  assert.deepEqual(Object.keys(next.records), []);
  assert.deepEqual(Object.keys(next.speciesMap), []);
  assert.deepEqual(Object.keys(next.seenTabs), []);
  assert.equal(next.session, null);
  assert.equal(data.tabZooSpeciesMapV1, undefined);
});
