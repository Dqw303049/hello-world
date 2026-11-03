export const SAVE_KEY = "guishan-life:v1";
export const HOME_GOAL = 360;

export type ActionId =
  | "tea"
  | "work"
  | "noodles"
  | "shop"
  | "walk"
  | "camp"
  | "rest"
  | "renovate";
export type LocationId =
  | "home"
  | "noodles"
  | "tea"
  | "shop"
  | "workshop"
  | "square"
  | "camp";
export interface JournalEntry {
  id: number;
  day: number;
  minute: number;
  text: string;
}
export interface GameState {
  version: 1;
  day: number;
  minute: number;
  money: number;
  energy: number;
  mood: number;
  renovated: boolean;
  visited: LocationId[];
  actions: number;
  journal: JournalEntry[];
}
export interface Action {
  label: string;
  detail: string;
  money: number;
  energy: number;
  mood: number;
  duration: number;
  location: LocationId;
  story: string;
}

export const ACTIONS: Record<ActionId, Action> = {
  tea: {
    label: "采一篓秋茶",
    detail: "沿着茶垄慢慢走，把山里的清香带回来。",
    money: 45,
    energy: -18,
    mood: 6,
    duration: 120,
    location: "tea",
    story: "采满一篓秋茶，茶农收下了你的劳动，也送来一杯热茶。",
  },
  work: {
    label: "帮木匠做工",
    detail: "打磨一张小木凳，赚一点踏实的生活费。",
    money: 68,
    energy: -24,
    mood: -4,
    duration: 180,
    location: "workshop",
    story: "和周师傅一起打磨木凳，木屑的香气留在了袖口。",
  },
  noodles: {
    label: "来一碗牛肉米粉",
    detail: "热腾腾的常德米粉，配上店家自制的酸豆角。",
    money: -18,
    energy: 28,
    mood: 8,
    duration: 45,
    location: "noodles",
    story: "嗦完一碗热米粉，连汤也喝得干干净净，又有精神了。",
  },
  shop: {
    label: "买一份桂花糕",
    detail: "给自己一点甜，尝尝街坊手作的秋日点心。",
    money: -12,
    energy: 8,
    mood: 15,
    duration: 30,
    location: "shop",
    story: "李婶用油纸包好桂花糕。咬一口，山里的秋天是甜的。",
  },
  walk: {
    label: "在树下歇歇脚",
    detail: "听老人讲小镇旧事，看斑驳的日光落下来。",
    money: 0,
    energy: 8,
    mood: 12,
    duration: 60,
    location: "square",
    story: "在老树下坐了一会儿。没有发生大事，却觉得日子很好。",
  },
  camp: {
    label: "煮一壶溪边茶",
    detail: "租一套茶具，和流水一起发一会儿呆。",
    money: -15,
    energy: 6,
    mood: 20,
    duration: 90,
    location: "camp",
    story: "溪水流过石头，炉上的水慢慢烧开。你把烦恼留在了山外。",
  },
  rest: {
    label: "好好睡一觉",
    detail: "结束今天的旅居，明早八点，满怀精神醒来。",
    money: 0,
    energy: 100,
    mood: 8,
    duration: 0,
    location: "home",
    story: "关上小院的木门，伴着山风入睡。新的一天，又是好天气。",
  },
  renovate: {
    label: "修缮我的小院",
    detail: "换上新窗、种好花草，让这里成为真正的家。",
    money: -HOME_GOAL,
    energy: -10,
    mood: 25,
    duration: 120,
    location: "home",
    story: "小院换上了新窗，门前开满花。从今天起，山里有一个属于你的家。",
  },
};

export function newGame(): GameState {
  return {
    version: 1,
    day: 1,
    minute: 480,
    money: 128,
    energy: 80,
    mood: 75,
    renovated: false,
    visited: [],
    actions: 0,
    journal: [
      {
        id: 0,
        day: 1,
        minute: 480,
        text: "带着 ¥128 和一点期待，来到华南山镇。先去街上走走吧。",
      },
    ],
  };
}

export function blockedReason(state: GameState, id: ActionId): string | null {
  const action = ACTIONS[id];
  if (id === "renovate" && state.renovated)
    return "小院已经修缮好了，安心享受山居生活吧。";
  if (state.money + action.money < 0)
    return `还差 ¥${-(state.money + action.money)}，去茶园或木作坊赚一点吧。`;
  if (state.energy + action.energy < 0)
    return "体力不够了，吃碗米粉，或回家好好休息。";
  if (id !== "rest" && state.minute + action.duration > 21 * 60)
    return "天色渐晚，回家睡一觉，明天再来吧。";
  return null;
}

export function performAction(
  state: GameState,
  id: ActionId,
): { state: GameState; error: string | null } {
  const error = blockedReason(state, id);
  if (error) return { state, error };
  const action = ACTIONS[id];
  const day = id === "rest" ? state.day + 1 : state.day;
  const minute = id === "rest" ? 480 : state.minute + action.duration;
  return {
    error: null,
    state: {
      ...state,
      day,
      minute,
      money: state.money + action.money,
      energy: Math.min(100, state.energy + action.energy),
      mood: Math.max(0, Math.min(100, state.mood + action.mood)),
      renovated: state.renovated || id === "renovate",
      visited: [...new Set([...state.visited, action.location])],
      actions: state.actions + 1,
      journal: [
        { id: state.actions + 1, day, minute, text: action.story },
        ...state.journal,
      ].slice(0, 80),
    },
  };
}

export function formatTime(minute: number): string {
  return `${Math.floor(minute / 60)
    .toString()
    .padStart(2, "0")}:${(minute % 60).toString().padStart(2, "0")}`;
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
export function restoreGame(raw: string | null): GameState {
  if (!raw) return newGame();
  try {
    const value = JSON.parse(raw) as GameState;
    if (
      value.version !== 1 ||
      !Number.isSafeInteger(value.day) ||
      value.day < 1 ||
      !Number.isSafeInteger(value.minute) ||
      value.minute < 480 ||
      value.minute > 1260 ||
      !Number.isSafeInteger(value.money) ||
      value.money < 0 ||
      !Number.isInteger(value.energy) ||
      value.energy < 0 ||
      value.energy > 100 ||
      !Number.isInteger(value.mood) ||
      value.mood < 0 ||
      value.mood > 100 ||
      !Number.isSafeInteger(value.actions) ||
      value.actions < 0 ||
      typeof value.renovated !== "boolean" ||
      !Array.isArray(value.visited) ||
      value.visited.some((id) => !locationIds.includes(id)) ||
      !Array.isArray(value.journal) ||
      value.journal.length > 80 ||
      value.journal.some(
        (entry) =>
          !entry ||
          !Number.isSafeInteger(entry.id) ||
          !Number.isSafeInteger(entry.day) ||
          entry.day < 1 ||
          !Number.isInteger(entry.minute) ||
          entry.minute < 480 ||
          entry.minute > 1260 ||
          typeof entry.text !== "string" ||
          entry.text.length > 500,
      )
    )
      return newGame();
    return value;
  } catch {
    return newGame();
  }
}
