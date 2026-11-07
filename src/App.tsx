import {
  Component,
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import type { ErrorInfo, ReactNode } from "react";
import {
  ArrowRight,
  BedDouble,
  BookOpen,
  Check,
  CheckCheck,
  CircleHelp,
  Clock3,
  Coins,
  CookingPot,
  Crosshair,
  DoorOpen,
  Droplets,
  Hammer,
  Heart,
  House,
  Leaf,
  Map,
  MapPin,
  Minus,
  Mountain,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Soup,
  Sparkles,
  Sun,
  Users,
  X,
  Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  ACTIONS,
  HOME_GOAL,
  LEGACY_SAVE_KEY,
  SAVE_KEY,
  formatTime,
  restoreGame,
} from "./game";
import type { ActionId } from "./game";
import { Simulation } from "./simulation";
import type { Snapshot } from "./simulation";
import { SPOTS, distance } from "./world";
import type { Point } from "./world";
import type { CameraCommand } from "./LifeScene";

const LifeScene = lazy(() => import("./LifeScene"));
const ICONS: Record<string, LucideIcon> = {
  door: House,
  exit: DoorOpen,
  bed: BedDouble,
  stove: CookingPot,
  sink: Droplets,
  noodles: Soup,
  workshop: Hammer,
  tea: Leaf,
  shop: Coins,
  square: Heart,
  camp: Leaf,
  apo: Users,
  zhou: Users,
};
function supportsWebGL() {
  try {
    const c = document.createElement("canvas").getContext("webgl2");
    if (!c) return false;
    c.getExtension("WEBGL_lose_context")?.loseContext();
    return true;
  } catch {
    return false;
  }
}
class SceneBoundary extends Component<
  { children: ReactNode; onError: () => void },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(_e: Error, _info: ErrorInfo) {
    this.props.onError();
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}
function Dialog({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const old = document.activeElement as HTMLElement | null;
    ref.current?.querySelector<HTMLElement>("button")?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
      if (e.key === "Tab") {
        const items = Array.from(
          ref.current?.querySelectorAll<HTMLElement>(
            "button:not(:disabled),input,a[href]",
          ) ?? [],
        );
        if (e.shiftKey && document.activeElement === items[0]) {
          e.preventDefault();
          items.at(-1)?.focus();
        }
        if (!e.shiftKey && document.activeElement === items.at(-1)) {
          e.preventDefault();
          items[0]?.focus();
        }
      }
    };
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("keydown", key);
      old?.focus();
    };
  }, [onClose, title]);
  return (
    <div
      className="modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <section
        ref={ref}
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <button
          className="icon-button modal-close"
          onClick={onClose}
          aria-label="关闭弹窗"
        >
          <X size={18} />
        </button>
        {children}
      </section>
    </div>
  );
}
function Joystick({ onChange }: { onChange: (p: Point) => void }) {
  const ref = useRef<HTMLDivElement>(null),
    pointer = useRef<number | null>(null);
  const [axis, setAxis] = useState<Point>({ x: 0, z: 0 });
  function reset() {
    pointer.current = null;
    setAxis({ x: 0, z: 0 });
    onChange({ x: 0, z: 0 });
  }
  function update(x: number, y: number) {
    const r = ref.current!.getBoundingClientRect();
    const dx = (x - r.left - r.width / 2) / 30,
      dy = (y - r.top - r.height / 2) / 30;
    const len = Math.max(1, Math.hypot(dx, dy));
    const a = { x: dx / len, z: -dy / len };
    setAxis(a);
    onChange(a);
  }
  return (
    <div
      ref={ref}
      className="joystick"
      role="group"
      aria-label="移动摇杆"
      onPointerDown={(e) => {
        pointer.current = e.pointerId;
        e.currentTarget.setPointerCapture(e.pointerId);
        update(e.clientX, e.clientY);
      }}
      onPointerMove={(e) => {
        if (pointer.current === e.pointerId) update(e.clientX, e.clientY);
      }}
      onPointerUp={reset}
      onPointerCancel={reset}
      onLostPointerCapture={reset}
    >
      <span className="joystick-cross">＋</span>
      <span
        className="joystick-thumb"
        style={{
          transform: "translate(" + axis.x * 25 + "px," + -axis.z * 25 + "px)",
        }}
      />
      <small>移动</small>
    </div>
  );
}
function MiniMap({
  snapshot,
  simulation,
  large = false,
}: {
  snapshot: Snapshot;
  simulation: Simulation;
  large?: boolean;
}) {
  const home = snapshot.state.scene === "home",
    scale = home ? 10 : 42,
    depth = home ? 8 : 30;
  const px = (p: Point) => (p.x / scale + 0.5) * 180,
    pz = (p: Point) => (p.z / depth + 0.5) * 125;
  return (
    <svg
      className={large ? "fallback-map" : "mini-map"}
      viewBox="0 0 180 125"
      role="img"
      aria-label={home ? "小屋平面图" : "小镇位置图"}
    >
      <rect
        x="0"
        y="0"
        width="180"
        height="125"
        rx="14"
        fill={home ? "#e4d8bd" : "#dce3c6"}
      />
      {!home && (
        <>
          <path
            d="M0 61 Q45 78 90 65T180 70"
            fill="none"
            stroke="#9bbdb0"
            strokeWidth="10"
          />
          <path
            d="M95 56V83M20 84H160M30 43H150"
            stroke="#f1ebd6"
            strokeWidth="5"
          />
        </>
      )}
      {SPOTS.filter((s) => s.scene === snapshot.state.scene).map((s) => (
        <g
          key={s.id}
          onClick={() => simulation.navigate(s.id)}
          className="mini-spot"
        >
          <rect
            x={px(s.point) - 3}
            y={pz(s.point) - 3}
            width="6"
            height="6"
            rx="1.5"
            fill={s.id === "door" || s.id === "bed" ? "#ab8d5f" : "#8b9e75"}
          />
          <title>{s.name}</title>
        </g>
      ))}
      {!home &&
        snapshot.actors.map((a) => (
          <circle
            key={a.id}
            cx={px(a.point)}
            cy={pz(a.point)}
            r="2.5"
            fill="#b59a64"
          />
        ))}
      <circle
        cx={px(snapshot.state.position)}
        cy={pz(snapshot.state.position)}
        r="7"
        fill="#fff9dc"
        opacity=".7"
      />
      <circle
        cx={px(snapshot.state.position)}
        cy={pz(snapshot.state.position)}
        r="3.5"
        fill="#365e49"
      />
      <text x="163" y="15" fontSize="8" fill="#788970">
        N
      </text>
    </svg>
  );
}
function Need({
  label,
  value,
  Icon,
  tone,
}: {
  label: string;
  value: number;
  Icon: LucideIcon;
  tone: string;
}) {
  return (
    <div className={"need " + tone}>
      <span>
        <Icon size={13} />
        {label}
      </span>
      <div
        className="need-track"
        role="meter"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(value)}
      >
        <i style={{ width: value + "%" }} />
      </div>
      <strong data-testid={tone}>{Math.round(value)}</strong>
    </div>
  );
}
export default function App() {
  const [simulation] = useState(() => {
    let raw: string | null = null;
    try {
      raw =
        localStorage.getItem(SAVE_KEY) ?? localStorage.getItem(LEGACY_SAVE_KEY);
    } catch {
      /* keep playing if browser storage is disabled */
    }
    return new Simulation(restoreGame(raw));
  });
  const [snapshot, setSnapshot] = useState(() => simulation.snapshot());
  const [unavailable, setUnavailable] = useState(() => !supportsWebGL());
  const [ready, setReady] = useState(unavailable);
  const [context, setContext] = useState<string | null>(null);
  const [modal, setModal] = useState<"help" | "journal" | "reset" | null>(null);
  const [drawer, setDrawer] = useState(false),
    [saved, setSaved] = useState(true);
  const [command, setCommand] = useState<CameraCommand | null>(null);
  const [notice, setNotice] = useState<{ id: number; text: string } | null>(
    null,
  );
  const input = useRef({
    keys: new Set<string>(),
    mobile: { x: 0, z: 0 } as Point,
  });
  const { state, busy, nearby } = snapshot;
  const target = context ? simulation.target(context) : undefined;
  const closeModal = useCallback(() => setModal(null), []);
  const onReady = useCallback(() => setReady(true), []);
  const onUnavailable = useCallback(() => {
    setUnavailable(true);
    setReady(true);
  }, []);
  const interact = useCallback(
    (id?: string) => {
      if (simulation.busy || simulation.paused || simulation.blocked) return;
      const next = simulation.nearby().find((t) => !id || t.id === id);
      if (next) {
        simulation.cancelNavigation();
        setContext(next.id);
      } else simulation.notify("先走近门、家具或街坊，再按 E 互动。");
    },
    [simulation],
  );
  useEffect(() => {
    simulation.blocked = !!modal || !ready;
  }, [modal, ready, simulation]);
  useEffect(() => {
    let frame = 0,
      last = performance.now(),
      emitted = last,
      savedAt = last,
      lastNotice = 0,
      lastScene = simulation.state.scene;
    const persist = () => {
      try {
        localStorage.setItem(SAVE_KEY, JSON.stringify(simulation.state));
        setSaved(true);
      } catch {
        setSaved(false);
      }
    };
    const tick = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      const keys = input.current.keys;
      if (!document.hidden) {
        simulation.step(
          dt,
          {
            x:
              (keys.has("d") || keys.has("arrowright") ? 1 : 0) -
              (keys.has("a") || keys.has("arrowleft") ? 1 : 0) +
              input.current.mobile.x,
            z:
              (keys.has("w") || keys.has("arrowup") ? 1 : 0) -
              (keys.has("s") || keys.has("arrowdown") ? 1 : 0) +
              input.current.mobile.z,
          },
          keys.has("shift"),
        );
      }
      const important =
        lastScene !== simulation.state.scene ||
        lastNotice !== (simulation.notice?.id ?? 0);
      if (now - emitted > 120 || important) {
        setSnapshot(simulation.snapshot());
        emitted = now;
      }
      if (important || now - savedAt > 1500) {
        persist();
        savedAt = now;
      }
      lastNotice = simulation.notice?.id ?? 0;
      lastScene = simulation.state.scene;
      frame = requestAnimationFrame(tick);
    };
    const clear = () => {
      input.current.keys.clear();
      input.current.mobile = { x: 0, z: 0 };
      last = performance.now();
      persist();
    };
    frame = requestAnimationFrame(tick);
    persist();
    window.addEventListener("blur", clear);
    window.addEventListener("pagehide", persist);
    document.addEventListener("visibilitychange", clear);
    return () => {
      cancelAnimationFrame(frame);
      persist();
      window.removeEventListener("blur", clear);
      window.removeEventListener("pagehide", persist);
      document.removeEventListener("visibilitychange", clear);
    };
  }, [simulation]);
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLElement &&
        (e.target.matches("input,textarea,select") ||
          e.target.isContentEditable)
      )
        return;
      const k = e.key.toLowerCase();
      if (
        [
          "w",
          "a",
          "s",
          "d",
          "arrowup",
          "arrowdown",
          "arrowleft",
          "arrowright",
          "shift",
        ].includes(k)
      ) {
        if (!simulation.blocked) {
          e.preventDefault();
          input.current.keys.add(k);
        }
      }
      if (e.repeat) return;
      if (k === "e") {
        e.preventDefault();
        interact();
      }
      if (k === " " || k === "p") {
        if (!simulation.blocked) {
          e.preventDefault();
          simulation.togglePause();
          setSnapshot(simulation.snapshot());
        }
      }
      if (k === "escape" && !simulation.blocked) {
        setContext(null);
        simulation.cancelActivity();
        simulation.cancelNavigation();
      }
    };
    const up = (e: KeyboardEvent) =>
      input.current.keys.delete(e.key.toLowerCase());
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, [simulation, interact]);
  useEffect(() => {
    if (snapshot.notice) {
      setNotice(snapshot.notice);
      const id = setTimeout(() => setNotice(null), 5500);
      return () => clearTimeout(id);
    }
  }, [snapshot.notice?.id]); // only new events should restart the toast lifetime
  useEffect(() => {
    if (context && !nearby.some((t) => t.id === context)) setContext(null);
  }, [context, nearby]);
  const go = (id: string) => {
    setContext(null);
    setDrawer(false);
    simulation.navigate(id);
    setSnapshot(simulation.snapshot());
  };
  const begin = (id: ActionId) => {
    if (context && simulation.start(id, context)) {
      setContext(null);
      setSnapshot(simulation.snapshot());
    }
  };
  const passage = (id: "door" | "exit") => {
    if (simulation.usePassage(id)) {
      setContext(null);
      setSnapshot(simulation.snapshot());
    }
  };
  const camera = (type: CameraCommand["type"]) =>
    setCommand((c) => ({ type, nonce: (c?.nonce ?? 0) + 1 }));
  const reset = () => {
    simulation.reset();
    input.current.keys.clear();
    input.current.mobile = { x: 0, z: 0 };
    setContext(null);
    setModal(null);
    setSnapshot(simulation.snapshot());
  };
  const home = state.scene === "home";
  const checklist = [
    { label: "回到小屋", done: state.visited.includes("home") },
    { label: "做一顿饭", done: state.completed.includes("cook") },
    { label: "洗漱整理", done: state.completed.includes("wash") },
    { label: "帮工赚生活费", done: state.completed.includes("work") },
    { label: "睡个好觉", done: state.completed.includes("rest") },
  ];
  return (
    <div
      className={
        "life-shell " +
        (snapshot.overview ? "is-overview " : "") +
        (home ? "is-home" : "")
      }
      data-scene={state.scene}
    >
      <div className="life-stage" aria-label="可操控的山镇生活场景">
        <SceneBoundary onError={onUnavailable}>
          {!unavailable && (
            <Suspense fallback={null}>
              <LifeScene
                simulation={simulation}
                snapshot={snapshot}
                command={command}
                onReady={onReady}
                onUnavailable={onUnavailable}
                onInteract={interact}
              />
            </Suspense>
          )}
        </SceneBoundary>
        {unavailable && (
          <div className="scene-fallback">
            <span className="eyebrow">二维导览模式 · 3D 不可用</span>
            <h2>山镇依然在这里</h2>
            <MiniMap snapshot={snapshot} simulation={simulation} large />
            <p>用方向键、摇杆或地点导航行走，靠近后互动。</p>
          </div>
        )}
      </div>
      <div className="life-vignette" aria-hidden="true" />
      {!ready && (
        <div className="map-loading" role="status">
          <Mountain size={32} />
          <span>沿着山路，快到家了…</span>
        </div>
      )}
      <header className="life-topbar">
        <button
          className="brand"
          onClick={() => {
            simulation.overview = !simulation.overview;
            setSnapshot(simulation.snapshot());
          }}
          aria-label="切换小镇全景"
        >
          <span className="brand-symbol">
            <Mountain size={26} strokeWidth={1.4} />
            <i />
          </span>
          <span className="brand-wordmark">
            归山<small>GUI SHAN</small>
          </span>
          <span className="brand-place">
            湖南 · 常德<small>华南山镇</small>
          </span>
        </button>
        <div className="time-panel">
          <Sun size={22} strokeWidth={1.5} />
          <span className="time-date">
            秋日晴好
            <small>
              旅居第 <b data-testid="day">{state.day}</b> 天
            </small>
          </span>
          <span className="clock" data-testid="clock">
            {formatTime(state.minute)}
          </span>
          <span className="time-divider" />
          <button
            className="icon-button"
            onClick={() => {
              simulation.togglePause();
              setSnapshot(simulation.snapshot());
            }}
            aria-label={snapshot.paused ? "继续游戏" : "暂停游戏"}
          >
            {snapshot.paused ? <Play size={17} /> : <Pause size={17} />}
          </button>
          <span className="clock-speed">
            {snapshot.paused ? "已暂停" : "慢时光"}
          </span>
        </div>
        <div className="top-actions">
          <span className="save-indicator" title="进度保存在当前浏览器">
            {saved ? <CheckCheck size={14} /> : <CircleHelp size={14} />}
            <span>{saved ? "自动存档" : "无法存档"}</span>
          </span>
          <button
            className="icon-button"
            onClick={() => setModal("journal")}
            aria-label="旅居手账"
          >
            <BookOpen size={20} />
          </button>
          <button
            className="icon-button"
            onClick={() => setModal("help")}
            aria-label="游玩指南"
          >
            <CircleHelp size={20} />
          </button>
        </div>
      </header>
      <div className="world-heading">
        <span className="eyebrow">A LIFE AMONG THE MOUNTAINS</span>
        <h1>{home ? "推门，是自己的小日子。" : "在山里，过自己的日子。"}</h1>
        <p>
          <MapPin size={11} />
          {home ? "外婆的小屋 · 可自由走动" : "华南山镇 · 自由生活"}
        </p>
      </div>
      <aside className="daily-card" aria-label="第一段山居日常">
        <div className="daily-title">
          <span>
            <Sparkles size={14} />
            山居日常 · 01
          </span>
          <b>{checklist.filter((s) => s.done).length}/5</b>
        </div>
        <h2>认真过好这一天</h2>
        <div className="daily-checks">
          {checklist.map((item) => (
            <span key={item.label} className={item.done ? "done" : ""}>
              <i>{item.done ? <Check size={9} /> : null}</i>
              {item.label}
            </span>
          ))}
        </div>
      </aside>
      {snapshot.destination && (
        <div className="destination-pill">
          <span className="live-dot" />
          <span>正在前往 · {snapshot.destination}</span>
          <button
            className="icon-button"
            onClick={() => simulation.cancelNavigation()}
            aria-label="取消行走"
          >
            <X size={13} />
          </button>
        </div>
      )}
      {snapshot.paused && (
        <div className="pause-banner">
          <Pause size={15} />
          小镇已暂停
          <button onClick={() => simulation.togglePause()}>
            继续生活
            <Play size={12} />
          </button>
        </div>
      )}
      <section className="resident-card" aria-label="我的人物与生活需求">
        <div className="resident-header">
          <div className="portrait">
            <svg viewBox="0 0 56 62" aria-hidden="true">
              <path d="M5 62V49q22-19 46 0v13" fill="#63826c" />
              <path d="M22 41v10l6 5 7-5V39" fill="#d5b390" />
              <ellipse cx="28" cy="28" rx="14" ry="18" fill="#d8b693" />
              <path
                d="M13 26V17Q18 1 36 8q10 5 7 21l-5-13-20 3-5 13"
                fill="#544d3c"
              />
              <path d="M10 14h35v7H10z" fill="#d5ceb0" />
              <circle cx="23" cy="29" r="1.1" fill="#514b3a" />
              <circle cx="34" cy="29" r="1.1" fill="#514b3a" />
              <path d="M24 37q5 3 9-1" stroke="#ad8363" fill="none" />
            </svg>
          </div>
          <span className="resident-name">
            <strong>林间客</strong>
            <small>
              {busy
                ? ACTIONS[busy.id].label
                : snapshot.moving
                  ? "沿着山路，慢慢走"
                  : home
                    ? "在自己的小屋"
                    : "山镇新住民"}
            </small>
          </span>
          <div className="money">
            <span>生活费</span>
            <strong data-testid="money">¥{state.money.toLocaleString()}</strong>
          </div>
        </div>
        <div className="needs-grid">
          <Need label="精力" value={state.energy} Icon={Zap} tone="energy" />
          <Need label="饱腹" value={state.hunger} Icon={Soup} tone="hunger" />
          <Need
            label="卫生"
            value={state.hygiene}
            Icon={Droplets}
            tone="hygiene"
          />
          <Need label="心情" value={state.mood} Icon={Heart} tone="mood" />
        </div>
        <div className="resident-footer">
          <span className="live-dot" />
          {home ? "屋里有饭香，也有安心" : "走到哪里，生活就发生在哪里"}
          <small>
            {state.renovated
              ? "小院已修缮"
              : "小院心愿 ¥" + state.money + " / " + HOME_GOAL}
          </small>
        </div>
      </section>
      <div className="action-zone">
        {busy ? (
          <section
            className="activity-card"
            role="status"
            aria-label="正在进行的活动"
          >
            <div>
              <span className="activity-emblem">
                {busy.id === "rest" ? (
                  <BedDouble size={22} />
                ) : busy.id === "work" ? (
                  <Hammer size={22} />
                ) : (
                  <Leaf size={22} />
                )}
              </span>
              <span>
                <strong>{ACTIONS[busy.id].label}</strong>
                <small>
                  {busy.id === "rest"
                    ? "伴着山风，好好睡一觉"
                    : "正在亲手完成，结束后结算"}
                </small>
              </span>
              <button
                className="icon-button"
                onClick={() => simulation.cancelActivity()}
                aria-label="取消当前活动"
              >
                <X size={16} />
              </button>
            </div>
            <div className="activity-track">
              <i
                style={{
                  width:
                    Math.min(100, (busy.elapsed / busy.seconds) * 100) + "%",
                }}
              />
            </div>
            <span className="activity-timing">
              {Math.ceil(Math.max(0, busy.seconds - busy.elapsed))} 秒 · Esc
              可取消
            </span>
          </section>
        ) : (
          <button
            className={
              "interaction-prompt " + (nearby.length ? "available" : "")
            }
            onClick={() => interact()}
            disabled={snapshot.paused}
          >
            <kbd>E</kbd>
            <span>
              <strong>
                {nearby[0] ? nearby[0].name : "沿着小路，走近一点"}
              </strong>
              <small>
                {nearby[0]
                  ? "靠近互动，开始一件生活小事"
                  : "WASD 移动 · 点击地面也可行走"}
              </small>
            </span>
            <ArrowRight size={17} />
          </button>
        )}
        <div className="keyboard-hints">
          <span>
            <kbd>W A S D</kbd> 行走
          </span>
          <span>
            <kbd>Shift</kbd> 小跑
          </span>
          <span>
            <kbd>E</kbd> 互动
          </span>
          <span>
            <kbd>空格</kbd> 暂停
          </span>
        </div>
      </div>
      <div className="map-corner">
        <div className="minimap-header">
          <span>{home ? "自己的小屋" : "华南山镇"}</span>
          <Crosshair size={12} />
        </div>
        <MiniMap snapshot={snapshot} simulation={simulation} />
        <button
          className="route-button"
          onClick={() => setDrawer((d) => !d)}
          aria-expanded={drawer}
        >
          <Map size={14} />
          去哪里逛逛
          <ArrowRight size={13} />
        </button>
      </div>
      <div className="camera-tools">
        <button
          className="icon-button"
          onClick={() => camera("in")}
          aria-label="放大视角"
        >
          <Plus size={18} />
        </button>
        <button
          className="icon-button"
          onClick={() => camera("out")}
          aria-label="缩小视角"
        >
          <Minus size={18} />
        </button>
        <span />
        <button
          className="icon-button"
          onClick={() => camera("follow")}
          aria-label="镜头跟随人物"
        >
          <Crosshair size={17} />
        </button>
      </div>
      <button
        className="mobile-map-button icon-button"
        onClick={() => setDrawer((d) => !d)}
        aria-label="地点导航"
      >
        <Map size={21} />
      </button>
      <Joystick
        onChange={(p) => {
          input.current.mobile = p;
        }}
      />
      <button
        className="mobile-interact"
        onClick={() => interact()}
        disabled={!nearby.length || !!busy || snapshot.paused}
        aria-label="互动"
      >
        <span>E</span>
        <small>互动</small>
      </button>
      {drawer && (
        <section className="places-drawer" aria-label="地点导航">
          <div className="drawer-title">
            <span>
              <Map size={16} />
              想去哪里？
            </span>
            <button
              className="icon-button"
              onClick={() => setDrawer(false)}
              aria-label="关闭地点导航"
            >
              <X size={16} />
            </button>
          </div>
          <p>选好目的地，人物会沿可通行的道路走过去。</p>
          {SPOTS.filter((s) => s.scene === state.scene).map((s) => {
            const Icon = ICONS[s.id] ?? MapPin;
            return (
              <button
                key={s.id}
                className="place-route"
                onClick={() => go(s.id)}
                aria-label={"前往" + s.name}
              >
                <span className="place-icon">
                  <Icon size={18} />
                </span>
                <span>
                  <strong>{s.name}</strong>
                  <small>
                    {Math.ceil(distance(state.position, s.point))} 米 · 步行前往
                  </small>
                </span>
                <ArrowRight size={14} />
              </button>
            );
          })}
          {!home && (
            <div className="npc-routines">
              <span className="eyebrow">街坊们的今天</span>
              {snapshot.actors.map((a) => (
                <button key={a.id} onClick={() => go(a.id)}>
                  <span>
                    {a.name}
                    <small>{a.label}</small>
                  </span>
                  <Heart size={12} />
                  <b>{state.relationships[a.id]}</b>
                </button>
              ))}
            </div>
          )}
        </section>
      )}
      {target && (
        <section className="context-panel" aria-labelledby="context-title">
          <button
            className="icon-button context-close"
            onClick={() => setContext(null)}
            aria-label="关闭互动"
          >
            <X size={17} />
          </button>
          <span className="eyebrow">
            {target.npc
              ? "街坊 · " +
                (target.npc === "apo" ? "阿婆的老街旧事" : "周师傅的木作时光")
              : home
                ? "外婆的小屋 · 日常起居"
                : "华南山镇 · 慢慢生活"}
          </span>
          <h2 id="context-title">{target.name}</h2>
          <p>
            {target.npc
              ? target.npc === "apo"
                ? "“伢儿，山里的日子慢，热米粉要趁早吃。”"
                : "“木头的纹路急不得，日子也一样。”"
              : "你已经走到这里，选一件想做的小事。"}
          </p>
          {target.id === "door" && (
            <button className="primary-button" onClick={() => passage("door")}>
              <DoorOpen size={16} />
              推门进入小屋
              <ArrowRight size={16} />
            </button>
          )}
          {target.id === "exit" && (
            <button className="primary-button" onClick={() => passage("exit")}>
              <DoorOpen size={16} />
              走出小屋
              <ArrowRight size={16} />
            </button>
          )}
          {target.actions.map((id) => {
            const a = ACTIONS[id],
              reason = simulation.reason(id, target.id);
            return (
              <div className="context-action" key={id}>
                <div className="action-meta">
                  <span>
                    <Clock3 size={11} />
                    {a.duration ? a.duration + " 分钟" : "次日 08:00"}
                  </span>
                  {a.money !== 0 && (
                    <span>
                      <Coins size={11} />
                      {a.money > 0 ? "+" : "−"}¥{Math.abs(a.money)}
                    </span>
                  )}
                  <span>{a.seconds} 秒动作</span>
                </div>
                <button
                  className="primary-button"
                  disabled={!!reason}
                  title={reason ?? a.detail}
                  onClick={() => begin(id)}
                >
                  {a.label}
                  <ArrowRight size={15} />
                </button>
                <small className={reason ? "action-reason" : ""}>
                  {reason ?? a.detail}
                </small>
              </div>
            );
          })}
          {nearby
            .filter((t) => t.npc && t.id !== target.id)
            .map((t) => (
              <button
                className="subtle-button nearby-chat"
                key={t.id}
                onClick={() => setContext(t.id)}
              >
                <Users size={14} />和{t.name}聊聊
                <ArrowRight size={13} />
              </button>
            ))}
        </section>
      )}
      {notice && (
        <div className="toast" role="status">
          <Sparkles size={16} />
          <p>{notice.text}</p>
          <button
            className="icon-button"
            onClick={() => setNotice(null)}
            aria-label="关闭提示"
          >
            <X size={13} />
          </button>
        </div>
      )}
      {!saved && (
        <div className="save-warning" role="alert">
          当前浏览器不允许保存进度。请允许本地存储后继续。
        </div>
      )}
      <div className="version-label">归山 · 角色生活版 0.2</div>
      <output className="sr-only" data-testid="player-position">
        {state.position.x.toFixed(2) + "," + state.position.z.toFixed(2)}
      </output>
      <output className="sr-only" data-testid="scene">
        {state.scene}
      </output>
      {modal === "help" && (
        <Dialog title="游玩指南" onClose={closeModal}>
          <span className="modal-emblem">
            <Mountain size={28} />
          </span>
          <span className="eyebrow">WELCOME HOME · 角色生活版</span>
          <h2>这一次，亲自过一天。</h2>
          <p className="modal-intro">
            你可以操控林间客，穿过老街，回到小屋，慢慢认识这里的人。
          </p>
          <div className="help-steps">
            <div>
              <Crosshair size={20} />
              <span>
                <strong>行走与镜头</strong>
                <p>
                  WASD 或方向键移动，Shift
                  小跑。点击地面或地点导航，也能自动步行。右键旋转、滚轮缩放，镜头跟随按钮回到人物。手机用左侧摇杆行走、双指调整镜头。
                </p>
              </span>
            </div>
            <div>
              <DoorOpen size={20} />
              <span>
                <strong>先走近，再互动</strong>
                <p>
                  靠近门、家具或街坊，按
                  E（手机点互动）。在小屋使用床、灶台、洗手池；到米粉铺吃饭，到木作坊帮工。动作结束后才结算费用和收益，Esc
                  可取消。
                </p>
              </span>
            </div>
            <div>
              <Users size={20} />
              <span>
                <strong>街坊也有自己的生活</strong>
                <p>
                  阿婆 08–12、14–19 时开店；周师傅 08–12、14–18
                  时做工。中午去广场休息，晚上回家。每天首次聊天会增进关系。
                </p>
              </span>
            </div>
            <div>
              <Sun size={20} />
              <span>
                <strong>照顾自己的小日常</strong>
                <p>
                  精力、饱腹、卫生、心情随游戏时间变化。空格或顶部按钮暂停。时间在离开页面时停止；晚上回家睡觉开始新一天。完成右侧五件小事，体验完整的一天。
                </p>
              </span>
            </div>
          </div>
          <p className="storage-note">
            进度保存在当前浏览器；旧版生活费与修缮进度会自动迁移。活动进行中刷新视为取消，不会提前结算。地图为常德风物启发的原创山镇。
          </p>
          <button className="primary-button" onClick={closeModal}>
            知道了，出门走走
            <ArrowRight size={16} />
          </button>
        </Dialog>
      )}
      {modal === "journal" && (
        <Dialog title="旅居手账" onClose={closeModal}>
          <span className="eyebrow">NOTES FROM THE MOUNTAINS</span>
          <h2>日子，亲手过才有故事。</h2>
          <div className="journal-summary">
            <span>
              <strong>
                {state.day}
                <small>天</small>
              </strong>
              山间旅居
            </span>
            <span>
              <strong>
                {state.visited.length}
                <small>/7</small>
              </strong>
              走过的地方
            </span>
            <span>
              <strong>
                {state.actions}
                <small>件</small>
              </strong>
              生活小事
            </span>
          </div>
          <div className="friendships">
            {snapshot.actors.map((a) => (
              <span key={a.id}>
                <Users size={14} />
                <strong>{a.name}</strong>
                <Heart size={12} />
                {state.relationships[a.id]}
                <small>
                  {state.chatted[a.id] === state.day
                    ? "今天聊过天了"
                    : "每天聊聊，慢慢熟悉"}
                </small>
              </span>
            ))}
          </div>
          <ol className="journal-list">
            {state.journal.map((e) => (
              <li key={e.id}>
                <i />
                <div>
                  <small>
                    第 {e.day} 天 · {formatTime(e.minute)}
                  </small>
                  <p>{e.text}</p>
                </div>
              </li>
            ))}
          </ol>
          <div className="journal-footer">
            <span>
              <CheckCheck size={13} />
              {saved ? "已保存在当前浏览器" : "当前无法存档"}
            </span>
            <button onClick={() => setModal("reset")}>
              <RotateCcw size={12} />
              开启新生活
            </button>
          </div>
        </Dialog>
      )}
      {modal === "reset" && (
        <Dialog title="重新开始生活" onClose={closeModal}>
          <span className="modal-emblem">
            <Leaf size={28} />
          </span>
          <h2>重新开始一段山居？</h2>
          <p className="modal-intro">
            生活费、关系和手账都会被清空。当前浏览器的旧版存档也会一并移除，避免以后再次迁移。
          </p>
          <div className="reset-actions">
            <button
              className="subtle-button"
              onClick={() => setModal("journal")}
            >
              再想想
            </button>
            <button
              className="primary-button"
              onClick={() => {
                try {
                  localStorage.removeItem(LEGACY_SAVE_KEY);
                } catch {
                  /* storage warning remains visible */
                }
                reset();
              }}
            >
              重新开始
              <ArrowRight size={15} />
            </button>
          </div>
        </Dialog>
      )}
    </div>
  );
}
