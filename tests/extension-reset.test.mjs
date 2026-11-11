import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const extensionRoot = new URL("../extension/", import.meta.url);

function eventSlot() {
  return { addListener(listener) { this.listener = listener; } };
}

test("repeated resets clear the current species map and tracking records", async () => {
  const data = {
    tabZooSpeciesMapV1: { "example.com": "cat" },
  };
  const runtimeMessage = eventSlot();
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
      onMessage: runtimeMessage,
    },
    tabs: {
      onActivated: eventSlot(),
      onUpdated: eventSlot(),
      onRemoved: eventSlot(),
    },
    windows: {
      WINDOW_ID_NONE: -1,
      onFocusChanged: eventSlot(),
    },
  };

  const source = await readFile(new URL("background.js", extensionRoot), "utf8");
  const context = vm.createContext({ chrome, console, URL });
  vm.runInContext(source, context);

  const reset = () => new Promise((resolve) => {
    const handled = runtimeMessage.listener({ type: "reset" }, {}, resolve);
    assert.equal(handled, true);
  });

  await reset();
  assert.equal(data.tabZooSpeciesMapV1, undefined);
  assert.equal(Object.keys(data.tabZooStateV1.records).length, 0);
  assert.equal(data.tabZooStateV1.speciesGeneration, 1);
  assert.equal(Object.keys(data.tabZooStateV1.speciesMap).length, 0);

  // Simulate an old popup writing its stale, separate map after reset.
  data.tabZooSpeciesMapV1 = { "example.com": "duck" };
  const stateAfterStaleWrite = await vm.runInContext("readState()", context);
  assert.equal(Object.keys(stateAfterStaleWrite.speciesMap).length, 0);

  await reset();
  assert.equal(data.tabZooSpeciesMapV1, undefined);
  assert.equal(Object.keys(data.tabZooStateV1.records).length, 0);
  assert.equal(data.tabZooStateV1.speciesGeneration, 2);
  assert.equal(Object.keys(data.tabZooStateV1.speciesMap).length, 0);
});

test("a new assignment selects from the complete species list", async () => {
  const source = await readFile(new URL("background.js", extensionRoot), "utf8");
  const functionSource = source.match(/function assignSpecies\([\s\S]*?\n}/)?.[0];
  assert.ok(functionSource, "assignSpecies function should be present");

  const species = ["sauropod", "trex", "triceratops", "cat", "fox", "duck", "elephant"];
  for (const [index, expected] of species.entries()) {
    const state = { speciesMap: {} };
    const math = Object.create(Math);
    math.random = () => (index + 0.5) / species.length;
    const assigned = vm.runInNewContext(
      `${functionSource}; assignSpecies(state, "example.com")`,
      { species, state, Math: math },
    );
    assert.equal(assigned, expected);
    assert.equal(state.speciesMap["example.com"], assigned);
  }
});
