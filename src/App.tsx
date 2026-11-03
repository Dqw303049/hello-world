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
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  CheckCheck,
  CircleHelp,
  Clock3,
  Coffee,
  Coins,
  Compass,
  Flower2,
  Hammer,
  Heart,
  House,
  Leaf,
  MapPin,
  Maximize2,
  Mountain,
  Move,
  Plus,
  RotateCcw,
  Soup,
  Sparkles,
  Sprout,
  Store,
  Sun,
  TreeDeciduous,
  X,
  Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  ACTIONS,
  HOME_GOAL,
  SAVE_KEY,
  blockedReason,
  formatTime,
  newGame,
  performAction,
  restoreGame,
} from "./game";
import type { ActionId, GameState, LocationId } from "./game";
import { LOCATIONS, getLocation } from "./locations";
import type { TownLocation } from "./locations";
import type { SceneCommand } from "./TownScene";

const TownScene = lazy(() => import("./TownScene"));
const LOCATION_ICONS: Record<LocationId, LucideIcon> = {
  home: House,
  tea: Leaf,
  noodles: Soup,
  workshop: Hammer,
  shop: Store,
  square: TreeDeciduous,
  camp: Coffee,
};

function supportsWebGL(): boolean {
  try {
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("webgl2");
    if (!context) return false;
    context.getExtension("WEBGL_lose_context")?.loseContext();
    return true;
  } catch {
    return false;
  }
}

function MapFallback() {
  return (
    <div className="canvas-fallback">
      <Mountain size={64} strokeWidth={1} />
      <h2>山镇依然在这里</h2>
      <p>
        当前设备无法显示 3D 地图。
        <br />
        你仍可通过下方地点菜单游玩、赚钱和存档。
      </p>
    </div>
  );
}

class SceneBoundary extends Component<
  { children: ReactNode; onError: () => void },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(_error: Error, _info: ErrorInfo) {
    this.props.onError();
  }
  render() {
    return this.state.failed ? <MapFallback /> : this.props.children;
  }
}

function Dialog({
  title,
  onClose,
  children,
  className = "",
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const dialog = ref.current;
    dialog?.querySelector<HTMLElement>("button")?.focus();
    const keydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose();
      }
      if (event.key === "Tab" && dialog) {
        const focusable = Array.from(
          dialog.querySelectorAll<HTMLElement>(
            'button:not(:disabled), a[href], input, [tabindex="0"]',
          ),
        );
        const first = focusable[0],
          last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", keydown);
    return () => {
      document.removeEventListener("keydown", keydown);
      previous?.focus();
    };
  }, [onClose, title]);
  return (
    <div
      className="modal-backdrop"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`modal ${className}`}
      >
        <button
          className="icon-button modal-close"
          onClick={onClose}
          aria-label="关闭弹窗"
        >
          <X size={19} />
        </button>
        {children}
      </div>
    </div>
  );
}

function SpotIllustration({ location }: { location: TownLocation }) {
  const tea = location.id === "tea";
  return (
    <div className={`spot-art spot-${location.id}`} aria-hidden="true">
      <svg viewBox="0 0 320 110" fill="none">
        <circle cx="260" cy="24" r="15" fill="#e7bd71" opacity=".7" />
        <path
          d="M0 90 55 27 115 85 175 12 254 82 290 41 320 80V110H0Z"
          fill="#bec9a6"
        />
        <path d="m0 100 72-43 72 38 66-42 110 43v14H0Z" fill="#a4b58d" />
        {tea ? (
          <>
            {[0, 1, 2].map((i) => (
              <path
                key={i}
                d={`M70 ${85 + i * 10}Q150 ${40 + i * 20} 254 ${79 + i * 13}`}
                stroke={i % 2 ? "#648450" : "#7b965c"}
                strokeWidth="8"
                strokeLinecap="round"
              />
            ))}
          </>
        ) : (
          <>
            <path d="M112 66h82v40h-82z" fill="#f7efda" />
            <path d="m102 67 53-32 49 32z" fill="#667768" />
            <path d="M146 79h17v27h-17z" fill="#a58c66" />
            <path d="M120 78h14v13h-14zm55 0h12v13h-12z" fill="#a0b9ab" />
            <path d="M236 65v42" stroke="#8c805b" strokeWidth="5" />
            <path
              d="m216 76 20-42 24 42z"
              fill={location.id === "square" ? "#c9ac60" : "#7f9a69"}
            />
          </>
        )}
        <path d="M0 107q78-9 142 0t178-3" stroke="#e9e6d0" strokeWidth="7" />
      </svg>
      <span className="art-label">{location.category}</span>
    </div>
  );
}

function durationLabel(minutes: number) {
  if (!minutes) return "明早 08:00";
  return minutes % 60 ? `${minutes} 分钟` : `${minutes / 60} 小时`;
}

function ActionButton({
  id,
  state,
  onAction,
}: {
  id: ActionId;
  state: GameState;
  onAction: (id: ActionId) => void;
}) {
  const action = ACTIONS[id];
  const reason = blockedReason(state, id);
  const complete = id === "renovate" && state.renovated;
  return (
    <div className="action-item">
      <div className="action-detail">
        <span>
          <Clock3 size={12} />
          {durationLabel(action.duration)}
        </span>
        {id !== "rest" && (
          <span className={action.energy < 0 ? "" : "positive"}>
            <Zap size={12} />
            {action.energy > 0 ? "+" : ""}
            {action.energy}
          </span>
        )}
        {action.money !== 0 && (
          <span className={action.money > 0 ? "positive" : ""}>
            <Coins size={12} />
            {action.money > 0 ? "+" : "−"}¥{Math.abs(action.money)}
          </span>
        )}
        {id === "rest" && (
          <span className="positive">
            <Zap size={12} />
            体力回满
          </span>
        )}
      </div>
      <button
        className={`action-button ${id === "renovate" ? "secondary" : ""}`}
        disabled={!!reason}
        onClick={() => onAction(id)}
        title={reason || action.detail}
      >
        <span>
          {complete ? (
            <>
              <Check size={16} /> 小院已修缮
            </>
          ) : (
            action.label
          )}
        </span>
        {!complete && <ArrowRight size={17} />}
      </button>
      {reason && !complete && <p className="action-reason">{reason}</p>}
    </div>
  );
}

export default function App() {
  const [state, setState] = useState<GameState>(() => {
    try {
      return restoreGame(localStorage.getItem(SAVE_KEY));
    } catch {
      return newGame();
    }
  });
  const [selected, setSelected] = useState<LocationId | null>(null);
  const [modal, setModal] = useState<"help" | "journal" | "reset" | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [saved, setSaved] = useState(true);
  const [unavailable, setUnavailable] = useState(() => !supportsWebGL());
  const [ready, setReady] = useState(unavailable);
  const [command, setCommand] = useState<SceneCommand | null>(null);
  const [showWelcome, setShowWelcome] = useState(true);
  const closeModal = useCallback(() => setModal(null), []);
  const onSceneReady = useCallback(() => setReady(true), []);
  const onSceneUnavailable = useCallback(() => {
    setUnavailable(true);
    setReady(true);
  }, []);
  const location = selected ? getLocation(selected) : null;
  const goalProgress = state.renovated
    ? 100
    : Math.min(100, (state.money / HOME_GOAL) * 100);

  useEffect(() => {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(state));
      setSaved(true);
    } catch {
      setSaved(false);
    }
  }, [state]);
  useEffect(() => {
    if (!toast) return;
    const timeout = setTimeout(() => setToast(null), 5200);
    return () => clearTimeout(timeout);
  }, [toast]);
  useEffect(() => {
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !modal) setSelected(null);
    };
    window.addEventListener("keydown", escape);
    return () => window.removeEventListener("keydown", escape);
  }, [modal]);

  function selectLocation(id: LocationId) {
    setSelected(id);
    setShowWelcome(false);
  }
  function doAction(id: ActionId) {
    const result = performAction(state, id);
    if (result.error) {
      setToast(result.error);
      return;
    }
    setState(result.state);
    const action = ACTIONS[id];
    setToast(
      id === "rest"
        ? "早安，山镇！新的一天，体力已恢复。"
        : id === "renovate"
          ? "小院修缮完成。欢迎回家，山镇的新主人！"
          : `${action.label}完成${action.money > 0 ? `，获得 ¥${action.money}` : ""}。${action.mood > 0 ? "心情也变好了。" : "辛苦啦，记得休息。"}`,
    );
  }
  function mapCommand(type: SceneCommand["type"]) {
    setCommand((previous) => ({ type, nonce: (previous?.nonce ?? 0) + 1 }));
  }
  function resetGame() {
    setState(newGame());
    setModal(null);
    setSelected(null);
    setShowWelcome(true);
    mapCommand("reset");
    setToast("新的山居生活开始了，慢慢来。");
  }

  return (
    <div className="game-shell">
      <div className="map-stage" aria-label="华南山镇三维地图">
        <SceneBoundary onError={onSceneUnavailable}>
          {unavailable ? (
            <MapFallback />
          ) : (
            <Suspense fallback={null}>
              <TownScene
                selected={selected}
                onSelect={selectLocation}
                command={command}
                renovated={state.renovated}
                onReady={onSceneReady}
                onUnavailable={onSceneUnavailable}
              />
            </Suspense>
          )}
        </SceneBoundary>
      </div>
      <div className="scene-wash" aria-hidden="true" />
      {!ready && (
        <div className="map-loading" role="status">
          <span className="loading-mountain">
            <Mountain size={35} strokeWidth={1.4} />
          </span>
          <span>沿着山路，快到家了…</span>
        </div>
      )}

      <header className="topbar">
        <button
          className="brand"
          onClick={() => {
            setSelected(null);
            setShowWelcome(true);
            mapCommand("reset");
          }}
          aria-label="归山，返回小镇全景"
        >
          <span className="brand-symbol">
            <Mountain size={27} strokeWidth={1.4} />
            <span />
          </span>
          <span className="brand-wordmark">
            归山<small>GUI SHAN</small>
          </span>
          <span className="brand-divider" />
          <span className="brand-place">
            湖南 · 常德<small>华南山镇</small>
          </span>
        </button>
        <nav className="main-nav" aria-label="主导航">
          <button
            className={modal !== "journal" ? "active" : ""}
            onClick={() => {
              setModal(null);
              setSelected(null);
            }}
          >
            <Compass size={16} />
            <span>小镇漫游</span>
          </button>
          <button
            className={modal === "journal" ? "active" : ""}
            onClick={() => setModal("journal")}
          >
            <BookOpen size={16} />
            <span>旅居手账</span>
          </button>
        </nav>
        <div className="topbar-right">
          <div className="weather">
            <Sun size={21} strokeWidth={1.6} />
            <span>
              秋日晴好<small>23° · 微风</small>
            </span>
          </div>
          <span className="top-divider" />
          <button
            className="icon-button help-button"
            onClick={() => setModal("help")}
            aria-label="游玩指南"
          >
            <CircleHelp size={21} strokeWidth={1.6} />
          </button>
          <button
            className="profile-button"
            onClick={() => setModal("journal")}
            aria-label="查看我的旅居手账"
          >
            <span>山</span>
            <i />
          </button>
        </div>
      </header>

      <aside className="left-rail" aria-label="我的山居生活">
        {showWelcome && (
          <section className="welcome-note">
            <span className="eyebrow">
              <span className="tiny-leaf">✦</span> A LITTLE CLOSER TO NATURE
            </span>
            <h1>
              把日子，
              <br />
              还给山野<span>。</span>
            </h1>
            <p>
              在常德的山风里，
              <br />
              找到自己的生活节奏。
            </p>
            <span className="welcome-stamp">山 间 有 你 · 生 活 有 趣</span>
          </section>
        )}
        <section className="life-card">
          <div className="resident-line">
            <span className="resident-avatar">
              <Sprout size={22} strokeWidth={1.6} />
            </span>
            <span>
              <strong>山镇新住民</strong>
              <small>不赶时间，慢慢生活</small>
            </span>
            <span className="day-chip">第 {state.day} 天</span>
          </div>
          <div className="money-line">
            <span>
              <Coins size={15} /> 我的生活费
            </span>
            <strong data-testid="money">¥{state.money.toLocaleString()}</strong>
          </div>
          <div className="vital">
            <span>
              <Zap size={13} />
              体力
            </span>
            <div className="vital-track">
              <i style={{ width: `${state.energy}%` }} />
            </div>
            <strong data-testid="energy">{state.energy}</strong>
          </div>
          <div className="vital mood">
            <span>
              <Heart size={13} />
              心情
            </span>
            <div className="vital-track">
              <i style={{ width: `${state.mood}%` }} />
            </div>
            <strong data-testid="mood">{state.mood}</strong>
          </div>
          <div className="life-card-footer">
            <span>
              <Clock3 size={13} />
              <span data-testid="clock">{formatTime(state.minute)}</span>
              <i />
              {state.minute < 720
                ? "山间早晨"
                : state.minute < 1080
                  ? "悠闲午后"
                  : "暮色将近"}
            </span>
            <span
              className={saved ? "save-indicator" : "save-indicator warning"}
              title={
                saved
                  ? "进度已保存在当前浏览器"
                  : "浏览器禁止存档，关闭后进度将丢失"
              }
            >
              {saved ? <CheckCheck size={13} /> : <CircleHelp size={13} />}
              {saved ? "已存档" : "未保存"}
            </span>
          </div>
        </section>
        <section className={`goal-card ${state.renovated ? "complete" : ""}`}>
          <div className="goal-icon">
            {state.renovated ? (
              <House size={23} strokeWidth={1.5} />
            ) : (
              <Flower2 size={25} strokeWidth={1.4} />
            )}
          </div>
          <div className="goal-content">
            <span className="eyebrow">
              {state.renovated ? "一件小事，慢慢完成" : "山居心愿 · 01"}
            </span>
            <h2>{state.renovated ? "山里，终于有了家" : "给自己一个小院"}</h2>
            <p>
              {state.renovated
                ? "花草已种好，欢迎随时回家。"
                : "攒一点生活费，把外婆的老屋修缮好。"}
            </p>
            <div className="goal-progress">
              <span style={{ width: `${goalProgress}%` }} />
            </div>
            <div className="goal-bottom">
              <span>
                {state.renovated ? (
                  <>
                    <Check size={12} /> 心愿已完成
                  </>
                ) : (
                  `¥${state.money} / ¥${HOME_GOAL}`
                )}
              </span>
              <button onClick={() => selectLocation("home")}>
                去小院看看
                <ArrowRight size={13} />
              </button>
            </div>
          </div>
        </section>
        <p className="place-footnote">
          <MapPin size={11} /> 常德风物灵感 · 原创山镇地图
        </p>
      </aside>

      <div className="world-caption" aria-hidden="true">
        <span>华 南 山 镇</span>
        <small>山有四季，日子有光</small>
      </div>
      <div className="map-tools" aria-label="地图操作">
        <div className="compass-rose" aria-hidden="true">
          <span>N</span>
          <Compass size={34} strokeWidth={1} />
        </div>
        <div className="zoom-buttons">
          <button
            onClick={() => mapCommand("in")}
            aria-label="放大地图"
            disabled={unavailable}
          >
            <Plus size={20} />
          </button>
          <span />
          <button
            onClick={() => mapCommand("out")}
            aria-label="缩小地图"
            disabled={unavailable}
          >
            <span className="minus-sign" />
          </button>
        </div>
        <button
          className="reset-view"
          onClick={() => mapCommand("reset")}
          aria-label="回到小镇全景"
          disabled={unavailable}
        >
          <Maximize2 size={17} />
        </button>
      </div>

      {location && (
        <section
          className="location-panel"
          aria-labelledby="location-title"
          key={location.id}
        >
          <button
            className="icon-button panel-close"
            onClick={() => setSelected(null)}
            aria-label="关闭地点详情"
          >
            <X size={18} />
          </button>
          <SpotIllustration location={location} />
          <div className="location-body">
            <div className="location-kicker">
              <MapPin size={12} />
              华南山镇 · {location.category}
            </div>
            <h2 id="location-title">{location.name}</h2>
            <p className="location-description">{location.description}</p>
            <div className="host-quote">
              <span className="host-avatar">{location.host.slice(0, 1)}</span>
              <div>
                <strong>{location.host}</strong>
                <p>“{location.quote}”</p>
              </div>
            </div>
            <div className="location-actions">
              {location.actions.map((id) => (
                <ActionButton
                  key={id}
                  id={id}
                  state={state}
                  onAction={doAction}
                />
              ))}
            </div>
            <p className="panel-footnote">
              <Leaf size={11} /> 一件小事，也是好好生活。
            </p>
          </div>
        </section>
      )}

      <div className="map-hint">
        <Move size={13} />
        <span>拖动探索</span>
        <i />
        <span>滚轮缩放</span>
        <i />
        <span>右键旋转</span>
      </div>
      <nav className="location-dock" aria-label="小镇地点">
        <div className="dock-heading">
          <span>
            <span className="live-dot" />
            小镇好去处
          </span>
          <span>
            循着烟火气，四处走走
            <ArrowDown size={11} />
          </span>
        </div>
        <div className="dock-locations">
          {LOCATIONS.map((spot) => {
            const Icon = LOCATION_ICONS[spot.id];
            return (
              <button
                key={spot.id}
                className={selected === spot.id ? "active" : ""}
                onClick={() => selectLocation(spot.id)}
                aria-label={`打开${spot.name}`}
                aria-pressed={selected === spot.id}
              >
                <span className="dock-icon">
                  <Icon size={22} strokeWidth={1.55} />
                  {state.visited.includes(spot.id) && <i />}
                </span>
                <span>{spot.short}</span>
              </button>
            );
          })}
        </div>
      </nav>
      <div className="version-label">归山 · 旅居初版 0.1</div>

      {toast && (
        <div className="toast" role="status">
          <span>
            <Sparkles size={17} />
          </span>
          <p>{toast}</p>
          <button
            className="icon-button"
            onClick={() => setToast(null)}
            aria-label="关闭提示"
          >
            <X size={14} />
          </button>
        </div>
      )}
      {!saved && (
        <div className="save-warning" role="alert">
          当前浏览器无法保存进度，请允许本地存储后继续。
        </div>
      )}

      {modal === "help" && (
        <Dialog title="游玩指南" onClose={closeModal}>
          <span className="modal-emblem">
            <Mountain size={29} strokeWidth={1.4} />
          </span>
          <span className="eyebrow">WELCOME TO GUI SHAN</span>
          <h2>初到山镇，请慢慢来。</h2>
          <p className="modal-intro">
            这里没有必须赶上的进度。赚一点钱，吃一碗粉，慢慢安顿自己的小院。
          </p>
          <div className="help-steps">
            <div>
              <Move size={20} />
              <span>
                <strong>先去街上逛逛</strong>
                <p>
                  鼠标拖动地图、滚轮缩放、右键旋转。手机单指拖动，双指缩放和旋转。
                </p>
              </span>
            </div>
            <div>
              <MapPin size={20} />
              <span>
                <strong>点一点，认识这个小镇</strong>
                <p>点击建筑标签或底部地点，打开地点详情，选择想做的事。</p>
              </span>
            </div>
            <div>
              <Leaf size={20} />
              <span>
                <strong>赚生活费，也照顾自己</strong>
                <p>
                  采茶 +¥45，木作
                  +¥68；工作会消耗体力。米粉能补充体力，回家睡觉开启新一天。
                </p>
              </span>
            </div>
            <div>
              <House size={20} />
              <span>
                <strong>完成你的第一个心愿</strong>
                <p>
                  攒够 ¥360，到外婆的小院修缮老屋。做过的事会记在旅居手账里。
                </p>
              </span>
            </div>
          </div>
          <p className="storage-note">
            单机初版 ·
            进度保存在当前浏览器。清除站点数据会丢失存档。地图为常德风物启发的原创布局，“华南山镇”为游戏内地名。
          </p>
          <button className="primary-button" onClick={closeModal}>
            知道了，去山里走走
            <ArrowRight size={16} />
          </button>
        </Dialog>
      )}

      {modal === "journal" && (
        <Dialog title="旅居手账" onClose={closeModal} className="journal-modal">
          <span className="eyebrow">NOTES FROM THE MOUNTAINS</span>
          <h2>把小日子，记下来。</h2>
          <p className="modal-intro">平凡的一天，也有值得留下的瞬间。</p>
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
                <small>/ 7</small>
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
          <ol className="journal-list">
            {state.journal.map((entry) => (
              <li key={entry.id}>
                <span className="journal-dot" />
                <div>
                  <span className="journal-date">
                    第 {entry.day} 天 · {formatTime(entry.minute)}
                  </span>
                  <p>{entry.text}</p>
                </div>
              </li>
            ))}
          </ol>
          <div className="journal-footer">
            <span>
              {saved ? <CheckCheck size={14} /> : <CircleHelp size={14} />}
              {saved ? "已自动保存在当前浏览器" : "当前浏览器无法存档"}
            </span>
            <button onClick={() => setModal("reset")}>
              <RotateCcw size={12} />
              开启新生活
            </button>
          </div>
        </Dialog>
      )}

      {modal === "reset" && (
        <Dialog
          title="重新开始生活"
          onClose={closeModal}
          className="reset-modal"
        >
          <span className="modal-emblem">
            <Sprout size={28} />
          </span>
          <h2>重新开启一段山居？</h2>
          <p className="modal-intro">
            当前的生活费、进度和手账都会被清空。这次，也可以试着换一种生活节奏。
          </p>
          <div className="reset-actions">
            <button
              className="subtle-button"
              onClick={() => setModal("journal")}
            >
              <ArrowLeft size={15} />
              再想想
            </button>
            <button className="primary-button" onClick={resetGame}>
              重新开始
              <ArrowRight size={15} />
            </button>
          </div>
        </Dialog>
      )}
      <span className="sr-only" aria-live="polite">
        旅居第 {state.day} 天，生活费 {state.money} 元，体力 {state.energy}
        ，心情 {state.mood}。
      </span>
    </div>
  );
}
