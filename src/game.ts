import { SPAWN, ROOM_SPAWN, walkable } from "./world.ts";
import type { Point, SceneId } from "./world.ts";

export const SAVE_KEY = "guishan-life:v2";
export const LEGACY_SAVE_KEY = "guishan-life:v1";
export const HOME_GOAL = 360;
export type ActionId =
  | "tea"
  | "work"
  | "noodles"
  | "shop"
  | "walk"
  | "camp"
  | "rest"
  | "renovate"
  | "cook"
  | "porridge"
  | "wash"
  | "chat-apo"
  | "chat-zhou";
export type LocationId =
  | "home"
  | "noodles"
  | "tea"
  | "shop"
  | "workshop"
  | "square"
  | "camp";
export type AnimationKind =
  | "gather"
  | "craft"
  | "eat"
  | "sit"
  | "sleep"
  | "cook"
  | "wash"
  | "talk";
export interface JournalEntry {
  id: number;
  day: number;
  minute: number;
  text: string;
}
export interface GameState {
  version: 2;
  day: number;
  minute: number;
  money: number;
  energy: number;
  mood: number;
  hunger: number;
  hygiene: number;
  renovated: boolean;
  visited: LocationId[];
  actions: number;
  journal: JournalEntry[];
  scene: SceneId;
  position: Point;
  relationships: { apo: number; zhou: number };
  chatted: { apo: number; zhou: number };
  completed: ActionId[];
}
export interface Action {
  label: string;
  detail: string;
  money: number;
  energy: number;
  mood: number;
  hunger: number;
  hygiene: number;
  duration: number;
  seconds: number;
  location: LocationId;
  story: string;
  animation: AnimationKind;
}
export const ACTIONS: Record<ActionId, Action> = {
  tea: {
    label: "采一篓秋茶",
    detail: "沿茶垄采摘，赚一份山间的生活费。",
    money: 45,
    energy: -18,
    mood: 6,
    hunger: -14,
    hygiene: -8,
    duration: 120,
    seconds: 6,
    location: "tea",
    animation: "gather",
    story: "亲手采满一篓秋茶。茶农收下茶叶，也送来一杯热茶。",
  },
  work: {
    label: "帮木匠做工",
    detail: "在工作台前打磨木凳，完成后结算报酬。",
    money: 68,
    energy: -24,
    mood: -4,
    hunger: -22,
    hygiene: -18,
    duration: 180,
    seconds: 8,
    location: "workshop",
    animation: "craft",
    story: "和周师傅一起打磨木凳，木屑的香气留在了袖口。",
  },
  noodles: {
    label: "来一碗牛肉米粉",
    detail: "坐下来，趁热嗦完一碗常德米粉。",
    money: -18,
    energy: 14,
    mood: 8,
    hunger: 65,
    hygiene: 0,
    duration: 45,
    seconds: 6,
    location: "noodles",
    animation: "eat",
    story: "在阿婆的米粉铺坐下，嗦完一碗热米粉，又有了精神。",
  },
  shop: {
    label: "买一份桂花糕",
    detail: "在街角尝一份桂花糕。",
    money: -12,
    energy: 8,
    mood: 15,
    hunger: 18,
    hygiene: 0,
    duration: 30,
    seconds: 4,
    location: "shop",
    animation: "eat",
    story: "桂花糕用油纸包得整整齐齐。咬一口，山里的秋天是甜的。",
  },
  walk: {
    label: "在树下歇歇脚",
    detail: "坐一会儿，听风吹过老银杏。",
    money: 0,
    energy: 8,
    mood: 12,
    hunger: -5,
    hygiene: 0,
    duration: 60,
    seconds: 5,
    location: "square",
    animation: "sit",
    story: "在老树下坐了一会儿。没有发生大事，却觉得日子很好。",
  },
  camp: {
    label: "煮一壶溪边茶",
    detail: "坐在溪边，让水慢慢烧开。",
    money: -15,
    energy: 6,
    mood: 20,
    hunger: -8,
    hygiene: 0,
    duration: 90,
    seconds: 6,
    location: "camp",
    animation: "sit",
    story: "溪水绕过青石，炉上的茶慢慢煮开。烦恼留在了山外。",
  },
  rest: {
    label: "好好睡一觉",
    detail: "躺到木床上，次日八点满怀精神地醒来。",
    money: 0,
    energy: 100,
    mood: 8,
    hunger: -20,
    hygiene: -5,
    duration: 0,
    seconds: 8,
    location: "home",
    animation: "sleep",
    story: "伴着山风入睡，早上在熟悉的小屋里醒来。新的一天开始了。",
  },
  renovate: {
    label: "修缮我的小院",
    detail: "换上新窗、种好花草，让这里成为真正的家。",
    money: -HOME_GOAL,
    energy: -10,
    mood: 25,
    hunger: -10,
    hygiene: -8,
    duration: 120,
    seconds: 8,
    location: "home",
    animation: "craft",
    story: "小院换上了新窗，门前开满花。山里终于有了自己的家。",
  },
  cook: {
    label: "做一份家常饭",
    detail: "用 ¥6 置办的家常食材，给自己做一顿热饭。",
    money: -6,
    energy: 6,
    mood: 6,
    hunger: 55,
    hygiene: -5,
    duration: 40,
    seconds: 6,
    location: "home",
    animation: "cook",
    story: "在小屋的灶台前做了一顿家常饭。能照顾自己，也是一种踏实。",
  },
  porridge: {
    label: "用家里的米煮清粥",
    detail: "外婆留下的米缸总有余粮。不花钱，也能先照顾好自己。",
    money: 0,
    energy: 3,
    mood: 2,
    hunger: 30,
    hygiene: 0,
    duration: 30,
    seconds: 4,
    location: "home",
    animation: "cook",
    story: "用米缸里的余粮煮了一碗清粥。日子再紧，也能先让自己吃饱。",
  },
  wash: {
    label: "洗漱整理",
    detail: "洗把脸，洗净手上的尘土。",
    money: 0,
    energy: -2,
    mood: 4,
    hunger: -2,
    hygiene: 75,
    duration: 20,
    seconds: 4,
    location: "home",
    animation: "wash",
    story: "用清凉的水洗漱，抹去一天的尘土，整个人都清爽了。",
  },
  "chat-apo": {
    label: "和阿婆聊聊",
    detail: "听她说说米粉铺和老街的旧事。每天首次聊天增进关系。",
    money: 0,
    energy: 0,
    mood: 6,
    hunger: -2,
    hygiene: 0,
    duration: 15,
    seconds: 3.5,
    location: "noodles",
    animation: "talk",
    story: "刘阿婆说，老街的门总是为回来的人开着。你们又熟悉了一点。",
  },
  "chat-zhou": {
    label: "和周师傅聊聊",
    detail: "聊聊手艺和山镇。每天首次聊天增进关系。",
    money: 0,
    energy: 0,
    mood: 6,
    hunger: -2,
    hygiene: 0,
    duration: 15,
    seconds: 3.5,
    location: "workshop",
    animation: "talk",
    story: "周师傅讲起年轻时学木工的事。做手艺和过日子，都要有耐心。",
  },
};
export const clampNeed = (n: number) => Math.max(0, Math.min(100, n));
export function newGame(): GameState {
  return {
    version: 2,
    day: 1,
    minute: 480,
    money: 128,
    energy: 80,
    mood: 75,
    hunger: 65,
    hygiene: 70,
    renovated: false,
    visited: [],
    actions: 0,
    scene: "town",
    position: { ...SPAWN },
    relationships: { apo: 0, zhou: 0 },
    chatted: { apo: 0, zhou: 0 },
    completed: [],
    journal: [
      {
        id: 0,
        day: 1,
        minute: 480,
        text: "带着 ¥128 回到华南山镇。走到小院门口，推门进去看看吧。",
      },
    ],
  };
}
export function blockedReason(state: GameState, id: ActionId): string | null {
  const action = ACTIONS[id];
  if (id === "renovate" && state.renovated)
    return "小院已经修缮好了，安心享受山居生活吧。";
  if (state.money + action.money < 0)
    return (
      "还差 ¥" + -(state.money + action.money) + "，去茶园或木作坊赚一点吧。"
    );
  if (state.energy + action.energy < 0)
    return "体力不够了，先吃点东西，或回家好好睡一觉。";
  if ((id === "work" || id === "tea") && state.hunger < 10)
    return "肚子太饿了，先吃一顿热饭，再来劳动吧。";
  if (id !== "rest" && state.minute + action.duration > 1260)
    return "天色渐晚，回家睡一觉，明天再来吧。";
  return null;
}
export function performAction(
  state: GameState,
  id: ActionId,
): { state: GameState; error: string | null } {
  const error = blockedReason(state, id);
  if (error) return { state, error };
  const a = ACTIONS[id];
  const day = id === "rest" ? state.day + 1 : state.day;
  const minute = id === "rest" ? 480 : state.minute + a.duration;
  const relationships = { ...state.relationships },
    chatted = { ...state.chatted };
  if (id === "chat-apo" || id === "chat-zhou") {
    const npc = id === "chat-apo" ? "apo" : "zhou";
    if (chatted[npc] !== state.day) {
      relationships[npc] = clampNeed(relationships[npc] + 8);
      chatted[npc] = state.day;
    }
  }
  return {
    error: null,
    state: {
      ...state,
      day,
      minute,
      money: state.money + a.money,
      energy: clampNeed(state.energy + a.energy),
      mood: clampNeed(state.mood + a.mood),
      hunger: clampNeed(state.hunger + a.hunger),
      hygiene: clampNeed(state.hygiene + a.hygiene),
      renovated: state.renovated || id === "renovate",
      visited: [...new Set([...state.visited, a.location])],
      completed: [...new Set([...state.completed, id])],
      relationships,
      chatted,
      actions: state.actions + 1,
      journal: [
        {
          id: state.actions + 1,
          day,
          minute: Math.floor(minute),
          text: a.story,
        },
        ...state.journal,
      ].slice(0, 80),
    },
  };
}
export function advanceClock(state: GameState, minutes: number): GameState {
  const elapsed = Math.max(0, Math.min(minutes, 1260 - state.minute));
  if (!elapsed) return state;
  const hunger = clampNeed(state.hunger - elapsed * 0.15);
  return {
    ...state,
    minute: state.minute + elapsed,
    energy: clampNeed(state.energy - elapsed * 0.025),
    hunger,
    hygiene: clampNeed(state.hygiene - elapsed * 0.06),
    mood: clampNeed(state.mood - (hunger < 15 ? elapsed * 0.12 : 0)),
  };
}
export function formatTime(minute: number): string {
  const m = Math.floor(minute);
  return (
    String(Math.floor(m / 60)).padStart(2, "0") +
    ":" +
    String(m % 60).padStart(2, "0")
  );
}
const locationIds: LocationId[] = [
  "home",
  "noodles",
  "tea",
  "shop",
  "workshop",
  "square",
  "camp",
];
function validBase(v: GameState): boolean {
  return (
    !!v &&
    Number.isSafeInteger(v.day) &&
    v.day >= 1 &&
    Number.isFinite(v.minute) &&
    v.minute >= 480 &&
    v.minute <= 1260 &&
    Number.isSafeInteger(v.money) &&
    v.money >= 0 &&
    Number.isFinite(v.energy) &&
    v.energy >= 0 &&
    v.energy <= 100 &&
    Number.isFinite(v.mood) &&
    v.mood >= 0 &&
    v.mood <= 100 &&
    Number.isSafeInteger(v.actions) &&
    v.actions >= 0 &&
    typeof v.renovated === "boolean" &&
    Array.isArray(v.visited) &&
    v.visited.every((id) => locationIds.includes(id)) &&
    Array.isArray(v.journal) &&
    v.journal.length <= 80 &&
    v.journal.every(
      (e) =>
        e &&
        Number.isSafeInteger(e.id) &&
        Number.isSafeInteger(e.day) &&
        e.day >= 1 &&
        Number.isFinite(e.minute) &&
        e.minute >= 480 &&
        e.minute <= 1260 &&
        typeof e.text === "string" &&
        e.text.length <= 500,
    )
  );
}
export function restoreGame(raw: string | null): GameState {
  if (!raw) return newGame();
  try {
    const v = JSON.parse(raw);
    if ((v.version !== 1 && v.version !== 2) || !validBase(v)) return newGame();
    if (v.version === 1)
      return {
        ...newGame(),
        ...v,
        version: 2,
        hunger: 65,
        hygiene: 70,
        scene: "town",
        position: { ...SPAWN },
        relationships: { apo: 0, zhou: 0 },
        chatted: { apo: 0, zhou: 0 },
        completed: v.renovated ? ["renovate"] : [],
      };
    if (
      ![v.hunger, v.hygiene, v.relationships?.apo, v.relationships?.zhou].every(
        (n) => Number.isFinite(n) && n >= 0 && n <= 100,
      ) ||
      ![v.chatted?.apo, v.chatted?.zhou].every(
        (n) => Number.isSafeInteger(n) && n >= 0,
      ) ||
      !Array.isArray(v.completed) ||
      v.completed.some((id: string) => !Object.hasOwn(ACTIONS, id)) ||
      !["town", "home"].includes(v.scene)
    )
      return newGame();
    if (!v.position || !walkable(v.position, v.scene))
      v.position = v.scene === "home" ? { ...ROOM_SPAWN } : { ...SPAWN };
    return v;
  } catch {
    return newGame();
  }
}
