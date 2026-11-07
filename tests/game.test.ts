import test from "node:test";
import assert from "node:assert/strict";
import {
  ACTIONS,
  SAVE_KEY,
  advanceClock,
  blockedReason,
  newGame,
  performAction,
  restoreGame,
  formatTime,
} from "../src/game.ts";
import { Simulation } from "../src/simulation.ts";
import {
  SPOTS,
  SPAWN,
  ROOM_SPAWN,
  clearLine,
  distance,
  findPath,
  movePlayer,
  riverZ,
  routine,
  walkable,
} from "../src/world.ts";

function run(sim: Simulation, seconds: number) {
  for (let t = 0; t < seconds; t += 0.1) sim.step(0.1);
}
function at(id: string) {
  const point = SPOTS.find((s) => s.id === id)!;
  return new Simulation({
    ...newGame(),
    scene: point.scene,
    position: { ...point.point },
  });
}
test("小镇与小屋的每一个互动点都可从出生点真实步行到达", () => {
  for (const target of SPOTS) {
    const start = target.scene === "town" ? SPAWN : ROOM_SPAWN;
    const path = findPath(start, target.point, target.scene);
    assert.ok(path, target.id);
    let previous = start;
    for (const p of path) {
      assert.ok(walkable(p, target.scene), target.id);
      assert.ok(clearLine(previous, p, target.scene), target.id);
      previous = p;
    }
    assert.equal(distance(path.at(-1)!, target.point), 0);
  }
});
test("贴着墙停下也能重新自动寻路，网格取整不会把起点放进墙里", () => {
  const sim = new Simulation({ ...newGame(), position: { x: -4.7, z: 8.67 } });
  assert.ok(walkable(sim.state.position, "town"));
  assert.equal(sim.navigate("door"), true);
  run(sim, 15);
  assert.ok(
    distance(sim.state.position, SPOTS.find((s) => s.id === "door")!.point) <
      0.2,
  );
});
test("低帧率仍按经过的时间移动与完成动作，碰撞保持有效", () => {
  const sim = new Simulation({ ...newGame(), position: { x: 12, z: 7 } });
  sim.forward = { x: 0, z: 1 };
  sim.step(0.5, { x: 0, z: -1 });
  assert.ok(Math.abs(sim.state.position.z - 5.3) < 0.01);
  const food = at("stove");
  food.start("cook", "stove");
  for (let i = 0; i < 7; i++) food.step(1);
  assert.equal(food.state.money, 122);
});
test("生活费和饱腹都耗尽仍可回家煮清粥，再恢复工作", () => {
  const sim = at("stove");
  sim.state.money = 0;
  sim.state.hunger = 0;
  assert.equal(sim.start("porridge", "stove"), true);
  run(sim, 4.2);
  assert.equal(sim.state.money, 0);
  assert.ok(sim.state.hunger > 29);
  assert.equal(blockedReason(sim.state, "work"), null);
});
test("碰撞阻止穿墙、过水和越界，大步长也不会穿透", () => {
  const wall = movePlayer({ x: -8, z: 10.6 }, { x: 0, z: -15 }, "town");
  assert.ok(wall.z >= 9.53);
  const creek = movePlayer({ x: 10, z: 5 }, { x: 0, z: -12 }, "town");
  assert.ok(creek.z > riverZ(10) + 1.45);
  const bridge = movePlayer({ x: 1.3, z: 4.6 }, { x: 0, z: -5 }, "town");
  assert.ok(bridge.z < 0);
  assert.equal(findPath(SPAWN, { x: -8, z: 7.5 }, "town"), null);
  assert.equal(walkable({ x: 99, z: 0 }, "town"), false);
});
test("自动寻路会实际移动，不能隔空互动", () => {
  const sim = new Simulation();
  assert.equal(sim.start("work", "workshop"), false);
  assert.equal(sim.state.money, 128);
  assert.equal(sim.navigate("workshop"), true);
  const initial = { ...sim.state.position };
  run(sim, 0.5);
  assert.ok(distance(initial, sim.state.position) > 0.5);
  run(sim, 40);
  assert.equal(sim.path.length, 0);
  assert.ok(
    distance(
      sim.state.position,
      SPOTS.find((s) => s.id === "workshop")!.point,
    ) < 0.15,
  );
  assert.equal(sim.start("work", "workshop"), true);
});
test("动作期间锁定行走；只有完成动作才结算，完成后不会重复支付", () => {
  const sim = at("workshop");
  assert.equal(sim.start("work", "workshop"), true);
  const p = { ...sim.state.position };
  for (let t = 0; t < 2; t += 0.1) sim.step(0.1, { x: 1, z: 0 });
  assert.deepEqual(sim.state.position, p);
  assert.equal(sim.state.money, 128);
  run(sim, 7);
  assert.equal(sim.busy, null);
  assert.equal(sim.state.money, 196);
  assert.equal(sim.state.actions, 1);
  run(sim, 2);
  assert.equal(sim.state.money, 196);
});
test("取消动作没有收益或扣费，刷新也不保存半完成的奖励", () => {
  const sim = at("noodles");
  assert.equal(sim.start("noodles", "noodles"), true);
  run(sim, 2);
  sim.cancelActivity();
  assert.equal(sim.state.money, 128);
  assert.equal(sim.state.actions, 0);
  const restored = new Simulation(restoreGame(JSON.stringify(sim.state)));
  assert.equal(restored.busy, null);
  assert.equal(restored.state.money, 128);
});
test("室内只能靠近门进出，不能在室外隔空使用家具", () => {
  const sim = new Simulation();
  assert.equal(sim.start("cook", "stove"), false);
  assert.equal(sim.usePassage("door"), true);
  assert.equal(sim.state.scene, "home");
  assert.ok(sim.state.visited.includes("home"));
  assert.equal(sim.start("rest", "bed"), false);
  assert.equal(sim.usePassage("exit"), true);
  assert.equal(sim.state.scene, "town");
  sim.state.position = { x: 13, z: 10 };
  assert.equal(sim.usePassage("door"), false);
});
test("做饭、洗漱与睡眠形成完整室内日常，过夜恢复精力", () => {
  const sim = at("stove");
  sim.state.hunger = 20;
  assert.equal(sim.start("cook", "stove"), true);
  run(sim, 6.2);
  assert.equal(sim.state.money, 122);
  assert.ok(sim.state.hunger > 74.9 && sim.state.hunger <= 75);
  sim.state.position = { ...SPOTS.find((s) => s.id === "sink")!.point };
  assert.equal(sim.start("wash", "sink"), true);
  run(sim, 4.2);
  assert.ok(sim.state.hygiene > 99.9);
  sim.state.position = { ...SPOTS.find((s) => s.id === "bed")!.point };
  assert.equal(sim.start("rest", "bed"), true);
  run(sim, 8.2);
  assert.equal(sim.state.day, 2);
  assert.ok(sim.state.energy > 99);
  assert.equal(formatTime(sim.state.minute), "08:00");
  for (const id of ["cook", "wash", "rest"] as const)
    assert.ok(sim.state.completed.includes(id));
});
test("暂停与弹窗阻止时间和行走，21点仍可回家休息", () => {
  const sim = new Simulation(),
    p = { ...sim.state.position };
  sim.togglePause();
  sim.step(0.2, { x: 1, z: 0 });
  assert.deepEqual(sim.state.position, p);
  assert.equal(sim.state.minute, 480);
  sim.togglePause();
  sim.blocked = true;
  sim.step(0.2, { x: 1, z: 0 });
  assert.deepEqual(sim.state.position, p);
  const late = { ...newGame(), minute: 1260 };
  assert.ok(blockedReason(late, "work"));
  assert.equal(blockedReason(late, "rest"), null);
});
test("饱腹与卫生随游戏时间衰减，体力和金钱不足时拒绝活动", () => {
  const later = advanceClock(newGame(), 60);
  assert.equal(later.minute, 540);
  assert.equal(later.hunger, 56);
  assert.ok(later.hygiene < 70);
  for (const [patch, id] of [
    [{ money: 0 }, "cook"],
    [{ energy: 10 }, "work"],
    [{ hunger: 9 }, "tea"],
  ] as const) {
    const state = { ...newGame(), ...patch };
    const result = performAction(state, id);
    assert.ok(result.error);
    assert.equal(result.state, state);
  }
});
test("两位NPC按时间改变日程，通过可通行的路走向广场", () => {
  assert.equal(routine("apo", 480).working, true);
  assert.equal(routine("apo", 750).working, false);
  assert.equal(routine("zhou", 1000).working, true);
  assert.equal(routine("zhou", 1100).working, false);
  const sim = new Simulation();
  const before = sim.actors.map((a) => ({ ...a.point }));
  sim.state.minute = 720;
  run(sim, 2);
  sim.actors.forEach((a, i) => {
    assert.ok(distance(a.point, before[i]) > 0.1, a.name);
    assert.ok(walkable(a.point, "town"));
    assert.match(a.label, /前往/);
  });
  const closed = at("workshop");
  closed.state.minute = 750;
  assert.match(closed.reason("work", "workshop")!, /休息/);
});
test("每天首次聊天增加关系，重复聊天不会刷关系，次日可继续", () => {
  let state = newGame();
  state = performAction(state, "chat-apo").state;
  assert.equal(state.relationships.apo, 8);
  state = performAction(state, "chat-apo").state;
  assert.equal(state.relationships.apo, 8);
  state = { ...state, day: 2 };
  state = performAction(state, "chat-apo").state;
  assert.equal(state.relationships.apo, 16);
  assert.equal(state.relationships.zhou, 0);
});
test("旧存档迁移保留生活费、天数与小院进度，新存档往返保存人物和关系", () => {
  const old = { ...newGame(), version: 1, money: 400, day: 4, renovated: true };
  const migrated = restoreGame(JSON.stringify(old));
  assert.equal(migrated.version, 2);
  assert.equal(migrated.money, 400);
  assert.equal(migrated.day, 4);
  assert.equal(migrated.renovated, true);
  assert.equal(migrated.scene, "town");
  assert.deepEqual(migrated.position, SPAWN);
  const save = {
    ...migrated,
    scene: "home" as const,
    position: { ...ROOM_SPAWN },
    relationships: { apo: 32, zhou: 16 },
  };
  assert.deepEqual(restoreGame(JSON.stringify(save)), save);
  assert.equal(SAVE_KEY, "guishan-life:v2");
});
test("非法存档安全恢复，落在墙内的坐标复位，手账只保留80条且编号唯一", () => {
  for (const raw of [
    "{broken",
    "null",
    JSON.stringify({ ...newGame(), money: -1 }),
    JSON.stringify({ ...newGame(), hunger: NaN }),
    JSON.stringify({ ...newGame(), scene: "unknown" }),
  ])
    assert.deepEqual(restoreGame(raw), newGame());
  const repaired = restoreGame(
    JSON.stringify({ ...newGame(), position: { x: -8, z: 7.5 } }),
  );
  assert.deepEqual(repaired.position, SPAWN);
  let state = newGame();
  for (let i = 0; i < 90; i++) state = performAction(state, "rest").state;
  assert.equal(state.journal.length, 80);
  assert.equal(new Set(state.journal.map((e) => e.id)).size, 80);
  for (const a of Object.values(ACTIONS)) assert.ok(a.seconds > 0);
});
