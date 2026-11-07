import {
  ACTIONS,
  advanceClock,
  blockedReason,
  clampNeed,
  newGame,
  performAction,
} from "./game.ts";
import type { ActionId, GameState } from "./game.ts";
import {
  SPOTS,
  SPAWN,
  ROOM_SPAWN,
  INTERACTION_RADIUS,
  distance,
  findPath,
  movePlayer,
  routine,
  spot,
} from "./world.ts";
import type { Point, NpcId, Spot } from "./world.ts";

export interface Actor {
  id: NpcId;
  name: string;
  point: Point;
  yaw: number;
  moving: boolean;
  label: string;
}
export interface Activity {
  id: ActionId;
  target: string;
  elapsed: number;
  seconds: number;
  yaw: number;
}
export interface Interaction {
  id: string;
  name: string;
  point: Point;
  actions: ActionId[];
  icon: Spot["icon"];
  npc?: NpcId;
}
export interface Snapshot {
  state: GameState;
  moving: boolean;
  yaw: number;
  busy: Activity | null;
  paused: boolean;
  path: Point[];
  destination: string | null;
  nearby: Interaction[];
  actors: Actor[];
  notice: { id: number; text: string } | null;
  overview: boolean;
}
export class Simulation {
  state: GameState;
  moving = false;
  yaw = 0;
  busy: Activity | null = null;
  paused = false;
  blocked = false;
  overview = false;
  forward: Point = { x: -0.6, z: -0.8 };
  path: Point[] = [];
  destination: string | null = null;
  actors: Actor[];
  notice: Snapshot["notice"] = null;
  private serial = 0;
  private npcPaths: Partial<Record<NpcId, { goal: string; path: Point[] }>> =
    {};

  constructor(state: GameState = newGame()) {
    this.state = state;
    this.actors = (["apo", "zhou"] as const).map((id) => ({
      id,
      name: id === "apo" ? "刘阿婆" : "周师傅",
      point: { ...routine(id, state.minute).point },
      yaw: 0,
      moving: false,
      label: routine(id, state.minute).label,
    }));
  }
  notify(text: string) {
    this.notice = { id: ++this.serial, text };
  }
  snapshot(): Snapshot {
    return {
      state: { ...this.state, position: { ...this.state.position } },
      moving: this.moving,
      yaw: this.yaw,
      busy: this.busy ? { ...this.busy } : null,
      paused: this.paused,
      path: this.path.map((p) => ({ ...p })),
      destination: this.destination,
      nearby: this.nearby(),
      actors: this.actors.map((a) => ({ ...a, point: { ...a.point } })),
      notice: this.notice,
      overview: this.overview,
    };
  }
  nearby(): Interaction[] {
    const { scene, position } = this.state;
    const items: Interaction[] = SPOTS.filter((s) => s.scene === scene).map(
      (s) => ({ ...s }),
    );
    if (scene === "town")
      for (const actor of this.actors)
        items.push({
          id: actor.id,
          name: actor.name,
          point: actor.point,
          actions: [actor.id === "apo" ? "chat-apo" : "chat-zhou"],
          icon: "square",
          npc: actor.id,
        });
    return items
      .filter((s) => distance(position, s.point) <= INTERACTION_RADIUS)
      .sort(
        (a, b) => distance(position, a.point) - distance(position, b.point),
      );
  }
  target(id: string): Interaction | undefined {
    const s = spot(id);
    if (s) return { ...s };
    const actor = this.actors.find((a) => a.id === id);
    if (actor && this.state.scene === "town")
      return {
        id,
        name: actor.name,
        point: actor.point,
        actions: [id === "apo" ? "chat-apo" : "chat-zhou"],
        icon: "square",
        npc: actor.id,
      };
  }
  navigate(id: string): boolean {
    const target = this.target(id);
    const s = spot(id);
    if (!target || (s && s.scene !== this.state.scene)) {
      this.notify(
        this.state.scene === "home"
          ? "先走到门口，离开小屋再去镇上。"
          : "先走到小院门口，进入小屋。",
      );
      return false;
    }
    return this.navigatePoint(target.point, target.name);
  }
  navigatePoint(point: Point, label = "路上的位置"): boolean {
    if (this.busy || this.paused || this.blocked) return false;
    const path = findPath(this.state.position, point, this.state.scene);
    if (!path) {
      this.notify("这里走不过去。试试门前的路，过溪请走石桥。");
      return false;
    }
    this.path = path;
    this.destination = label;
    this.overview = false;
    return true;
  }
  cancelNavigation() {
    this.path = [];
    this.destination = null;
    this.moving = false;
  }
  usePassage(id: "door" | "exit"): boolean {
    const s = spot(id)!;
    if (
      this.busy ||
      this.paused ||
      this.blocked ||
      s.scene !== this.state.scene ||
      distance(this.state.position, s.point) > INTERACTION_RADIUS
    )
      return false;
    this.cancelNavigation();
    const scene = id === "door" ? "home" : "town";
    this.state = {
      ...this.state,
      scene,
      position: { ...(scene === "home" ? ROOM_SPAWN : SPAWN) },
      visited: [...new Set([...this.state.visited, "home" as const])],
    };
    this.overview = false;
    this.notify(
      id === "door"
        ? "到家了。走到灶台、洗手池或床边，按 E 互动。"
        : "山风正好，出门走走吧。",
    );
    return true;
  }
  reason(id: ActionId, targetId: string): string | null {
    if (this.busy) return "正在做另一件事，完成或取消后再来。";
    if (this.paused || this.blocked) return "先继续游戏，再开始活动。";
    const target = this.nearby().find((t) => t.id === targetId);
    if (!target || !target.actions.includes(id))
      return "请先走到这里，再靠近互动。";
    if (id === "noodles" || id === "work") {
      const npc = id === "noodles" ? "apo" : "zhou";
      const actor = this.actors.find((a) => a.id === npc)!;
      if (!routine(npc, this.state.minute).working)
        return npc === "apo"
          ? "阿婆现在休息。米粉铺营业：08–12 时、14–19 时。"
          : "周师傅现在休息。木作坊开工：08–12 时、14–18 时。";
      if (distance(actor.point, routine(npc, this.state.minute).point) > 1.2)
        return "街坊正在赶回店里，稍等一会儿。";
    }
    return blockedReason(this.state, id);
  }
  start(id: ActionId, targetId: string): boolean {
    const reason = this.reason(id, targetId);
    if (reason) {
      this.notify(reason);
      return false;
    }
    this.cancelNavigation();
    const a = ACTIONS[id];
    const target = this.target(targetId)!;
    this.busy = {
      id,
      target: targetId,
      elapsed: 0,
      seconds: a.seconds,
      yaw: id === "wash" ? Math.PI / 2 : Math.PI,
    };
    if (target.npc) {
      this.yaw = Math.atan2(
        target.point.x - this.state.position.x,
        target.point.z - this.state.position.z,
      );
      this.busy.yaw = this.yaw;
    } else this.yaw = this.busy.yaw;
    return true;
  }
  cancelActivity() {
    if (!this.busy) return;
    this.busy = null;
    this.notify("先歇一歇。这次活动已取消，没有结算费用或收益。");
  }
  togglePause() {
    this.paused = !this.paused;
    this.moving = false;
  }
  reset() {
    const fresh = new Simulation();
    this.state = fresh.state;
    this.actors = fresh.actors;
    this.busy = null;
    this.npcPaths = {};
    this.paused = false;
    this.overview = false;
    this.cancelNavigation();
    this.notify("新的山居生活开始了。");
  }
  step(seconds: number, input: Point = { x: 0, z: 0 }, sprint = false) {
    if (this.paused || this.blocked || seconds <= 0) {
      this.moving = false;
      return;
    }
    // Collision movement is subdivided in world.ts. A slower renderer should
    // not make walking or a six-second activity take several times longer.
    const dt = Math.min(seconds, 1);
    if (this.busy) {
      this.busy.elapsed += dt;
      this.moving = false;
      if (this.busy.elapsed >= this.busy.seconds) {
        const id = this.busy.id;
        this.busy = null; // clear before committing so a finished activity cannot pay twice
        const result = performAction(this.state, id);
        this.state = result.state;
        this.notify(
          result.error ||
            (id === "rest"
              ? "早安，山镇！精力已恢复，新的一天开始了。"
              : ACTIONS[id].label +
                "完成" +
                (ACTIONS[id].money > 0 ? "，获得 ¥" + ACTIONS[id].money : "") +
                "。"),
        );
      }
    } else {
      const before = this.state.position;
      let next = { ...before };
      const length = Math.hypot(input.x, input.z);
      const speed =
        (sprint ? 5.4 : 3.4) *
        (this.state.energy < 10 || this.state.hunger < 10 ? 0.65 : 1);
      if (length > 0.08) {
        this.path = [];
        this.destination = null;
        this.overview = false;
        const ix = input.x / Math.max(1, length),
          iz = input.z / Math.max(1, length);
        const direction = {
          x: -this.forward.z * ix + this.forward.x * iz,
          z: this.forward.x * ix + this.forward.z * iz,
        };
        next = movePlayer(
          before,
          { x: direction.x * dt * speed, z: direction.z * dt * speed },
          this.state.scene,
        );
      } else if (this.path.length) {
        const waypoint = this.path[0];
        const d = distance(before, waypoint);
        const amount = Math.min(d, speed * dt);
        if (d > 0.001)
          next = movePlayer(
            before,
            {
              x: ((waypoint.x - before.x) / d) * amount,
              z: ((waypoint.z - before.z) / d) * amount,
            },
            this.state.scene,
          );
        if (distance(next, waypoint) < 0.12) this.path.shift();
        if (!this.path.length) this.destination = null;
      }
      this.moving = distance(before, next) > 0.003;
      if (this.moving)
        this.yaw = Math.atan2(next.x - before.x, next.z - before.z);
      this.state = advanceClock({ ...this.state, position: next }, dt * 0.5);
      if (this.moving && sprint)
        this.state.energy = clampNeed(this.state.energy - dt * 0.08);
    }
    for (const actor of this.actors) {
      const schedule = routine(actor.id, this.state.minute);
      actor.label = schedule.label;
      if (this.busy?.id === "chat-" + actor.id) {
        actor.moving = false;
        continue;
      }
      const goal = schedule.point.x + "," + schedule.point.z;
      let nav = this.npcPaths[actor.id];
      if (!nav || nav.goal !== goal) {
        nav = {
          goal,
          path: findPath(actor.point, schedule.point, "town") ?? [],
        };
        this.npcPaths[actor.id] = nav;
      }
      actor.moving = false;
      const next = nav.path[0];
      if (next) {
        const d = distance(actor.point, next),
          amount = Math.min(d, dt * 1.6);
        const previous = actor.point;
        actor.point = movePlayer(
          previous,
          {
            x: ((next.x - previous.x) / (d || 1)) * amount,
            z: ((next.z - previous.z) / (d || 1)) * amount,
          },
          "town",
        );
        actor.moving = distance(previous, actor.point) > 0.001;
        if (actor.moving)
          actor.yaw = Math.atan2(
            actor.point.x - previous.x,
            actor.point.z - previous.z,
          );
        if (distance(actor.point, next) < 0.12) nav.path.shift();
        actor.label = "正在前往：" + schedule.label;
      }
    }
  }
}
