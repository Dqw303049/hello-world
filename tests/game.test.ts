import test from "node:test";
import assert from "node:assert/strict";
import {
  ACTIONS,
  HOME_GOAL,
  blockedReason,
  formatTime,
  newGame,
  performAction,
  restoreGame,
} from "../src/game.ts";

test("完整生活循环：劳动、消费、过夜、修缮，且修缮不能重复扣款", () => {
  let state = newGame();
  for (const id of [
    "work",
    "tea",
    "noodles",
    "work",
    "tea",
    "rest",
    "tea",
    "renovate",
  ] as const) {
    const result = performAction(state, id);
    assert.equal(result.error, null, id);
    state = result.state;
  }
  assert.equal(state.day, 2);
  assert.equal(state.money, 21);
  assert.equal(state.energy, 72);
  assert.equal(state.renovated, true);
  assert.equal(state.actions, 8);
  assert.equal(new Set(state.visited).size, state.visited.length);
  assert.ok(state.visited.includes("home") && state.visited.includes("tea"));
  assert.match(state.journal[0].text, /小院/);
  const repeat = performAction(state, "renovate");
  assert.ok(repeat.error);
  assert.equal(repeat.state, state);
});

test("金钱、体力和营业时间限制拒绝动作，状态保持不变", () => {
  for (const [state, id] of [
    [{ ...newGame(), money: 10 }, "noodles"],
    [{ ...newGame(), energy: 23 }, "work"],
    [{ ...newGame(), minute: 1200 }, "tea"],
    [{ ...newGame(), money: HOME_GOAL - 1 }, "renovate"],
  ] as const) {
    const result = performAction(state, id);
    assert.ok(result.error);
    assert.equal(result.state, state);
  }
});

test("恰好足够的资源可使用；恢复属性上限为 100", () => {
  let state = { ...newGame(), money: 18, energy: 95, mood: 99 };
  state = performAction(state, "noodles").state;
  assert.equal(state.money, 0);
  assert.equal(state.energy, 100);
  assert.equal(state.mood, 100);
  const late = { ...state, minute: 1260, energy: 0 };
  assert.equal(blockedReason(late, "rest"), null);
  const rested = performAction(late, "rest").state;
  assert.equal(rested.day, 2);
  assert.equal(rested.minute, 480);
  assert.equal(rested.energy, 100);
});

test("存档往返保留进度；损坏、旧版和非法字段安全恢复为新游戏", () => {
  const state = performAction(newGame(), "tea").state;
  assert.deepEqual(restoreGame(JSON.stringify(state)), state);
  for (const raw of [
    null,
    "{bad",
    "null",
    "[]",
    JSON.stringify({ ...state, version: 9 }),
    JSON.stringify({ ...state, money: -1 }),
    JSON.stringify({ ...state, energy: 150 }),
    JSON.stringify({ ...state, visited: ["not-a-location"] }),
    JSON.stringify({ ...state, journal: [null] }),
    JSON.stringify({ ...state, journal: [{ id: 0, text: 12 }] }),
    JSON.stringify({ ...state, minute: 300 }),
  ])
    assert.deepEqual(restoreGame(raw), newGame());
});

test("手账保留最近 80 项，编号保持唯一，动作规则无负时长", () => {
  let state = newGame();
  for (let i = 0; i < 90; i++) state = performAction(state, "rest").state;
  assert.equal(state.journal.length, 80);
  assert.equal(new Set(state.journal.map((entry) => entry.id)).size, 80);
  assert.equal(state.journal[0].id, 90);
  assert.deepEqual(restoreGame(JSON.stringify(state)), state);
  assert.equal(formatTime(480), "08:00");
  assert.equal(formatTime(1005), "16:45");
  for (const action of Object.values(ACTIONS)) assert.ok(action.duration >= 0);
});
