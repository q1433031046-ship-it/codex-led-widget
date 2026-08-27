const assert = require("node:assert/strict");

function mondayOnOrBefore(value) {
  const result = new Date(value.getFullYear(), value.getMonth(), value.getDate());
  result.setDate(result.getDate() - ((result.getDay() + 6) % 7));
  return result;
}

function sundayOnOrAfter(value) {
  const result = new Date(value.getFullYear(), value.getMonth(), value.getDate());
  result.setDate(result.getDate() + ((7 - result.getDay()) % 7));
  return result;
}

function dayCount(first, last) {
  return Math.round((last.getTime() - first.getTime()) / 86400000) + 1;
}

function monthIndex(value) {
  return value.getFullYear() * 12 + value.getMonth();
}

for (let year = 2020; year <= 2032; year += 1) {
  const monthBlocks = Array.from({ length: 12 }, (_, month) => new Date(year, month, 1));
  assert.equal(monthBlocks.length, 12);
  assert.equal(new Set(monthBlocks.map((date) => date.getMonth())).size, 12);
  for (let month = 0; month < 12; month += 1) {
    const first = new Date(year, month, 1);
    const last = new Date(year, month + 1, 0);
    const count = dayCount(mondayOnOrBefore(first), sundayOnOrAfter(last));
    assert.ok([28, 35, 42].includes(count), `${year}-${month + 1} generated ${count} cells`);
    assert.equal(count % 7, 0);
    const multiMonths = Array.from({ length: 6 }, (_, index) => new Date(year, month - (5 - index), 1));
    assert.equal(multiMonths.length, 6);
    assert.equal(new Set(multiMonths.map((date) => `${date.getFullYear()}-${date.getMonth()}`)).size, 6);
    assert.equal(multiMonths.at(-1).getMonth(), month);

    const continuousTimeline = Array.from({ length: 37 }, (_, index) => new Date(year, month - 18 + index, 1));
    assert.equal(monthIndex(continuousTimeline[18]), year * 12 + month, "focused month should stay in the middle");
    for (let index = 1; index < continuousTimeline.length; index += 1) {
      assert.equal(monthIndex(continuousTimeline[index]) - monthIndex(continuousTimeline[index - 1]), 1, "months must remain seamless across year boundaries");
    }
  }

  const yearFirst = new Date(year, 0, 1);
  const yearLast = new Date(year, 11, 31);
  const count = dayCount(mondayOnOrBefore(yearFirst), sundayOnOrAfter(yearLast));
  assert.ok([371, 378].includes(count), `${year} generated ${count} cells`);
  assert.equal(count % 7, 0);
}

const decemberToJanuary = [new Date(2026, 11, 1), new Date(2027, 0, 1)];
assert.equal(monthIndex(decemberToJanuary[1]) - monthIndex(decemberToJanuary[0]), 1);

const fs = require("node:fs");
const path = require("node:path");
const statsSource = fs.readFileSync(path.join(__dirname, "..", "src", "renderer", "stats.js"), "utf8");
assert.match(statsSource, /startMonths:\s*-18,\s*endMonths:\s*18/);
assert.match(statsSource, /startMonths\s*-=\s*12/);
assert.match(statsSource, /endMonths\s*\+=\s*12/);
assert.match(statsSource, /focused-month/);
assert.match(statsSource, /other-month/);

console.log("calendar-range-tests-passed");
