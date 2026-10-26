const { test } = require("node:test");
const assert = require("node:assert/strict");
const { frontend, helper } = require("./support.cjs");

const logic = require("../birthday-logic.js");
test("leap-day birthdays follow the established February 28 rule", () => {
  const p = logic.normalize({
    people: [{ name: "Sample", date: "2000-02-29" }],
  });
  assert.equal(logic.onDay(p, 2030, 2, 28).length, 1);
  assert.equal(logic.onDay(p, 2032, 2, 28).length, 0);
});
test("region preview renders without a companion module", () => {
  const m = frontend({ preview: true });
  m.start();
  assert.equal(m.sent, undefined);
  assert.match(m.getDom().textContent, /Happy Birthday/);
  assert.match(m.getDom().textContent, /Your Name/);
  m.suspend();
});
test("instance responses remain isolated; birthday data renders the selected date", () => {
  const m = frontend({ debugDate: "2030-01-08" });
  m.start();
  m.socketNotificationReceived("BIRTHDAY_DATA", {
    instanceId: "other",
    data: { people: [] },
  });
  assert.equal(m.birthdayData, null);
  m.socketNotificationReceived("BIRTHDAY_DATA", {
    instanceId: "one",
    data: { people: [{ name: "Sample", date: "2000-01-08" }] },
  });
  assert.match(m.getDom().textContent, /Sample/);
  m.suspend();
});
test("configured timezone determines day and hour at midnight boundaries", () => {
  const m = frontend({ timezone: "America/New_York" }, "2030-01-08T02:00:00Z");
  assert.equal(m.now().getDate(), 7);
  assert.equal(m.now().getHours(), 21);
});
test("helper routes successful and missing-file responses", () => {
  const h = helper({ "birthdays.json": { people: [] } });
  h.socketNotificationReceived("BIRTHDAY_LOAD", { instanceId: "first" });
  assert.equal(h.sent.p.instanceId, "first");
  assert.equal(h.sent.n, "BIRTHDAY_DATA");
  h.socketNotificationReceived("BIRTHDAY_LOAD", {
    instanceId: "second",
    dataFile: "missing.json",
  });
  assert.equal(h.sent.n, "BIRTHDAY_ERROR");
  assert.equal(h.sent.p.instanceId, "second");
});
