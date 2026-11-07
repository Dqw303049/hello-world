import type { ActionId, LocationId } from "./game.ts";

export type SceneId = "town" | "home";
export type NpcId = "apo" | "zhou";
export interface Point {
  x: number;
  z: number;
}
export interface Rect {
  x: number;
  z: number;
  w: number;
  d: number;
}
export interface Spot {
  id: string;
  name: string;
  scene: SceneId;
  point: Point;
  actions: ActionId[];
  icon:
    | "home"
    | "bed"
    | "stove"
    | "sink"
    | "noodles"
    | "work"
    | "tea"
    | "shop"
    | "square"
    | "camp"
    | "exit";
}
export const SPAWN: Point = { x: -8, z: 10.6 };
export const ROOM_SPAWN: Point = { x: 0, z: 2.9 };
export const PLAYER_RADIUS = 0.24;
export const INTERACTION_RADIUS = 1.65;
export const SPOTS: Spot[] = [
  {
    id: "door",
    name: "外婆的小院",
    scene: "town",
    point: { x: -8, z: 9.7 },
    actions: ["renovate"],
    icon: "home",
  },
  {
    id: "noodles",
    name: "阿婆米粉铺",
    scene: "town",
    point: { x: -1.1, z: 10 },
    actions: ["noodles"],
    icon: "noodles",
  },
  {
    id: "workshop",
    name: "周记木作坊",
    scene: "town",
    point: { x: 4.75, z: -2.75 },
    actions: ["work"],
    icon: "work",
  },
  {
    id: "tea",
    name: "云边茶园",
    scene: "town",
    point: { x: -10.5, z: -4.3 },
    actions: ["tea"],
    icon: "tea",
  },
  {
    id: "shop",
    name: "山南杂货铺",
    scene: "town",
    point: { x: 6.5, z: 8.8 },
    actions: ["shop"],
    icon: "shop",
  },
  {
    id: "square",
    name: "老树广场",
    scene: "town",
    point: { x: -2.2, z: -0.8 },
    actions: ["walk"],
    icon: "square",
  },
  {
    id: "camp",
    name: "听溪茶寮",
    scene: "town",
    point: { x: 12.6, z: -0.7 },
    actions: ["camp"],
    icon: "camp",
  },
  {
    id: "bed",
    name: "小屋 · 木床",
    scene: "home",
    point: { x: -1.35, z: -1 },
    actions: ["rest"],
    icon: "bed",
  },
  {
    id: "stove",
    name: "小屋 · 灶台",
    scene: "home",
    point: { x: 2.15, z: -0.8 },
    actions: ["cook", "porridge"],
    icon: "stove",
  },
  {
    id: "sink",
    name: "小屋 · 洗手池",
    scene: "home",
    point: { x: 2.8, z: 1.1 },
    actions: ["wash"],
    icon: "sink",
  },
  {
    id: "exit",
    name: "走出小屋",
    scene: "home",
    point: { x: 0, z: 3.1 },
    actions: [],
    icon: "exit",
  },
];
export function spot(id: string): Spot | undefined {
  return SPOTS.find((s) => s.id === id);
}
export const LOCATION_SPOTS: Record<LocationId, string> = {
  home: "door",
  noodles: "noodles",
  tea: "tea",
  shop: "shop",
  workshop: "workshop",
  square: "square",
  camp: "camp",
};
export const TOWN_RECTS: Rect[] = [
  { x: -8, z: 7.5, w: 4.2, d: 3.6 },
  { x: -2.5, z: 7, w: 3.9, d: 3.7 },
  { x: 6.5, z: 6, w: 4.1, d: 3.9 },
  { x: 6, z: -6, w: 4, d: 3.4 },
  { x: -5.8, z: -5.4, w: 3.2, d: 2.9 },
  { x: 10, z: 10.6, w: 3.5, d: 3.3 },
  { x: -13, z: 7.8, w: 2.9, d: 2.6 },
  { x: 1, z: -11.2, w: 3.8, d: 3.5 },
  { x: -3.3, z: 12, w: 2.7, d: 2.9 },
  { x: -11.5, z: -8.9, w: 7.8, d: 6.1 },
  { x: -0.5, z: -2.5, w: 1, d: 1 },
  { x: 4.75, z: -3.9, w: 1.6, d: 0.95 },
];
export const HOME_RECTS: Rect[] = [
  { x: -3.1, z: -1, w: 2.25, d: 3 },
  { x: 2.8, z: -2.5, w: 3.1, d: 1.1 },
  { x: 3.85, z: 1.1, w: 1.25, d: 1.25 },
  { x: -0.1, z: 0.25, w: 1.45, d: 1 },
];
export function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.z - b.z);
}
export function riverZ(x: number): number {
  return 1.7 + Math.sin(x / 6) * 1.3;
}
export function onBridge(p: Point): boolean {
  return Math.abs(p.x - 1.3) < 0.87 && p.z > -1.25 && p.z < 4.7;
}
export function groundY(scene: SceneId, p: Point): number {
  if (scene === "home") return 0.17;
  return onBridge(p) ? 1.42 : 1;
}
export function walkable(p: Point, scene: SceneId): boolean {
  if (!Number.isFinite(p.x) || !Number.isFinite(p.z)) return false;
  if (scene === "town") {
    if (
      Math.abs(p.x) > 18.3 ||
      p.z < -11 ||
      p.z > 13.6 ||
      (p.x / 21) ** 2 + (p.z / 16.3) ** 2 > 0.98
    )
      return false;
    if (Math.abs(p.z - riverZ(p.x)) < 1.48 && !onBridge(p)) return false;
  } else if (Math.abs(p.x) > 4.55 || Math.abs(p.z) > 3.6) return false;
  const rects = scene === "town" ? TOWN_RECTS : HOME_RECTS;
  return !rects.some(
    (r) =>
      Math.abs(p.x - r.x) < r.w / 2 + PLAYER_RADIUS &&
      Math.abs(p.z - r.z) < r.d / 2 + PLAYER_RADIUS,
  );
}
export function movePlayer(from: Point, delta: Point, scene: SceneId): Point {
  let p = { ...from };
  const steps = Math.max(1, Math.ceil(Math.hypot(delta.x, delta.z) / 0.1));
  for (let i = 0; i < steps; i++) {
    const x = { x: p.x + delta.x / steps, z: p.z };
    if (walkable(x, scene)) p = x;
    const z = { x: p.x, z: p.z + delta.z / steps };
    if (walkable(z, scene)) p = z;
  }
  return p;
}
export function clearLine(a: Point, b: Point, scene: SceneId): boolean {
  const steps = Math.max(1, Math.ceil(distance(a, b) / 0.12));
  for (let i = 1; i <= steps; i++) {
    if (
      !walkable(
        {
          x: a.x + ((b.x - a.x) * i) / steps,
          z: a.z + ((b.z - a.z) * i) / steps,
        },
        scene,
      )
    )
      return false;
  }
  return true;
}
// A* uses the same collision predicate as keyboard movement. Diagonals cannot
// cut building corners, and the creek can only be crossed on the stone bridge.
export function findPath(
  from: Point,
  to: Point,
  scene: SceneId,
): Point[] | null {
  if (!walkable(to, scene)) return null;
  if (clearLine(from, to, scene)) return [{ ...to }];
  const step = 0.45;
  const key = (x: number, z: number) => x + "," + z;
  let startX = Math.round(from.x / step),
    startZ = Math.round(from.z / step);
  // The closest grid point may lie INSIDE a wall when the player is standing
  // just outside it. Start from a reachable cell, not a rounded blocked cell.
  let closest = Infinity;
  const roundedX = startX,
    roundedZ = startZ;
  for (let dx = -2; dx <= 2; dx++)
    for (let dz = -2; dz <= 2; dz++) {
      const candidate = {
        x: (roundedX + dx) * step,
        z: (roundedZ + dz) * step,
      };
      const d = distance(from, candidate);
      if (
        d < closest &&
        walkable(candidate, scene) &&
        clearLine(from, candidate, scene)
      ) {
        startX = roundedX + dx;
        startZ = roundedZ + dz;
        closest = d;
      }
    }
  if (!Number.isFinite(closest)) return null;
  const endX = Math.round(to.x / step),
    endZ = Math.round(to.z / step);
  const start = key(startX, startZ);
  const open = [{ x: startX, z: startZ, g: 0, f: 0, k: start }];
  const costs = new Map<string, number>([[start, 0]]);
  const parents = new Map<string, string>();
  const closed = new Set<string>();
  let end = "";
  while (open.length && closed.size < 9000) {
    let index = 0;
    for (let i = 1; i < open.length; i++)
      if (open[i].f < open[index].f) index = i;
    const node = open.splice(index, 1)[0];
    if (closed.has(node.k)) continue;
    closed.add(node.k);
    const world = { x: node.x * step, z: node.z * step };
    if (distance(world, to) < step * 1.6 && clearLine(world, to, scene)) {
      end = node.k;
      break;
    }
    for (let dx = -1; dx <= 1; dx++)
      for (let dz = -1; dz <= 1; dz++) {
        if (!dx && !dz) continue;
        const x = node.x + dx,
          z = node.z + dz,
          k = key(x, z);
        const point = { x: x * step, z: z * step };
        if (
          closed.has(k) ||
          !walkable(point, scene) ||
          !clearLine(world, point, scene)
        )
          continue;
        const g = node.g + Math.hypot(dx, dz);
        if (g >= (costs.get(k) ?? Infinity)) continue;
        costs.set(k, g);
        parents.set(k, node.k);
        open.push({ x, z, k, g, f: g + Math.hypot(x - endX, z - endZ) });
      }
  }
  if (!end) return null;
  const path: Point[] = [{ ...to }];
  while (end !== start) {
    const [x, z] = end.split(",").map(Number);
    path.unshift({ x: x * step, z: z * step });
    end = parents.get(end) ?? start;
  }
  path.unshift({ x: startX * step, z: startZ * step });
  const smooth: Point[] = [];
  let anchor = from,
    at = 0;
  while (at < path.length) {
    let next = at;
    while (next + 1 < path.length && clearLine(anchor, path[next + 1], scene))
      next++;
    smooth.push(path[next]);
    anchor = path[next];
    at = next + 1;
  }
  return smooth;
}
export interface Routine {
  point: Point;
  label: string;
  working: boolean;
}
export function routine(id: NpcId, minute: number): Routine {
  if (
    minute < 720 ||
    (minute >= 840 && minute < (id === "apo" ? 1140 : 1080))
  ) {
    return {
      point: id === "apo" ? { x: -4.4, z: 9.7 } : { x: 6.1, z: -3.2 },
      label: id === "apo" ? "在米粉铺备餐" : "在木作坊打磨",
      working: true,
    };
  }
  if (minute < 840)
    return {
      point: id === "apo" ? { x: -2.5, z: -0.7 } : { x: 1.6, z: -2.4 },
      label: "在老树广场歇脚",
      working: false,
    };
  return {
    point: id === "apo" ? { x: -12.7, z: 10 } : { x: -10.6, z: 11.8 },
    label: "回家休息",
    working: false,
  };
}
