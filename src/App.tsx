import {
  AudioWaveform,
  BadgeCent,
  BookOpen,
  Home,
  Info,
  RotateCcw,
  Shield,
  SkipForward,
  Sparkles,
  Swords,
  Volume2,
  VolumeX,
  Zap,
} from "lucide-react";
import { lazy, Suspense, useEffect, useRef, useState } from "react";
import type { CSSProperties, PointerEvent as ReactPointerEvent, ReactNode } from "react";
import { NODE_DEFS } from "./game/content";
import {
  buyShopCard,
  buyShopRelic,
  cardCost,
  cardDef,
  cardName,
  cardText,
  chooseNode,
  cloneState,
  createGameState,
  endTurn,
  finishCinematic,
  goMap,
  heal,
  hpPercent,
  intentText,
  openRemoveCard,
  openUpgrade,
  playCard,
  removeCard,
  resolveEvent,
  restHeal,
  startRun,
  takeRewardCard,
  upgradeCard,
} from "./game/engine";
import { RitualAudio } from "./game/audio";
import type { CardInstance, CombatState, Difficulty, GameState, NodeType, PlayerState, Screen } from "./game/types";

const DesktopCombatStage = lazy(() => import("./phaser/CombatStage").then((module) => ({ default: module.CombatStage })));

const routeNames = ["县口", "荒村", "井边", "破庙", "林道", "阴市", "山门", "正殿"];
const hudBloodUrl = new URL("../assets/vendor/shushan/icon-blood-orb.png", import.meta.url).href;
const baguaIconUrl = new URL("../assets/vendor/shushan/icon-bagua-gold.png", import.meta.url).href;
const talismanIconUrl = new URL("../assets/vendor/shushan/icon-talisman-paper.png", import.meta.url).href;
const swordFireUrl = new URL("../assets/vendor/shushan/icon-sword-flame.png", import.meta.url).href;
const swordCrossUrl = new URL("../assets/vendor/shushan/icon-sword-cross.png", import.meta.url).href;
const blockBadgeUrl = new URL("../assets/vendor/shushan/badge-shield.png", import.meta.url).href;
const incenseBadgeUrl = new URL("../assets/vendor/shushan/relic-bell.png", import.meta.url).href;
const sealBadgeUrl = new URL("../assets/vendor/shushan/relic-orb-blue.png", import.meta.url).href;
const pileDrawUrl = new URL("../assets/vendor/shushan/badge-scroll.png", import.meta.url).href;
const pileDiscardUrl = new URL("../assets/vendor/shushan/icon-talisman-paper.png", import.meta.url).href;
const relicIconUrl = new URL("../assets/vendor/shushan/relic-umbrella.png", import.meta.url).href;
const goldIconUrl = new URL("../assets/vendor/shushan/icon-bagua-gold.png", import.meta.url).href;
const mapIconUrl = new URL("../assets/vendor/aigei/pile-draw.png", import.meta.url).href;
const gameIconUrl = new URL("../assets/marketing/icon.png", import.meta.url).href;
const costGemUrls: Record<string, string> = {
  empty: new URL("../assets/vendor/shushan/cost/cost-empty.png", import.meta.url).href,
  "0": new URL("../assets/vendor/shushan/cost/cost-0.png", import.meta.url).href,
  "1": new URL("../assets/vendor/shushan/cost/cost-1.png", import.meta.url).href,
  "2": new URL("../assets/vendor/shushan/cost/cost-2.png", import.meta.url).href,
  "3": new URL("../assets/vendor/shushan/cost/cost-3.png", import.meta.url).href,
};
const playerNightPatrolUrl = new URL("../assets/generated/characters/player-night-patrol.png", import.meta.url).href;
const sceneLoopVideoUrl = new URL("../assets/generated/backgrounds/night-temple-loop.mp4", import.meta.url).href;
const enemyArtUrls: Record<string, string> = {
  lantern: new URL("../assets/generated/enemies/lantern.png", import.meta.url).href,
  waterghost: new URL("../assets/generated/enemies/waterghost.png", import.meta.url).href,
  templecorpse: new URL("../assets/generated/enemies/templecorpse.png", import.meta.url).href,
  macaque: new URL("../assets/generated/enemies/macaque.png", import.meta.url).href,
  warlock: new URL("../assets/generated/enemies/warlock.png", import.meta.url).href,
  foxshade: new URL("../assets/generated/enemies/foxshade.png", import.meta.url).href,
  tigerlord: new URL("../assets/generated/enemies/tigerlord.png", import.meta.url).href,
};
const cinematicPosterUrls: Record<string, string> = {
  lantern: new URL("../assets/generated/cinematics/victory-lantern-poster.png", import.meta.url).href,
  waterghost: new URL("../assets/generated/cinematics/victory-waterghost-poster.png", import.meta.url).href,
  templecorpse: new URL("../assets/generated/cinematics/victory-templecorpse-poster.png", import.meta.url).href,
  macaque: new URL("../assets/generated/cinematics/victory-macaque-poster.png", import.meta.url).href,
  warlock: new URL("../assets/generated/cinematics/victory-warlock-poster.png", import.meta.url).href,
  foxshade: new URL("../assets/generated/cinematics/victory-foxshade-poster.png", import.meta.url).href,
  "boss-tigerlord": new URL("../assets/generated/cinematics/victory-boss-tigerlord-poster.png", import.meta.url).href,
};
const cinematicVideoUrls: Record<string, string> = {
  lantern: new URL("../assets/generated/cinematics/victory-lantern.mp4", import.meta.url).href,
  waterghost: new URL("../assets/generated/cinematics/victory-waterghost.mp4", import.meta.url).href,
  macaque: new URL("../assets/generated/cinematics/victory-macaque.mp4", import.meta.url).href,
  warlock: new URL("../assets/generated/cinematics/victory-warlock.mp4", import.meta.url).href,
  foxshade: new URL("../assets/generated/cinematics/victory-foxshade.mp4", import.meta.url).href,
  "boss-tigerlord": new URL("../assets/generated/cinematics/victory-boss-tigerlord.mp4", import.meta.url).href,
};

function useCompactViewport() {
  const [compact, setCompact] = useState(() => (typeof window === "undefined" ? false : window.matchMedia("(max-width: 680px)").matches));

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const query = window.matchMedia("(max-width: 680px)");
    const update = () => setCompact(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  return compact;
}

export function App() {
  const [game, setGame] = useState<GameState>(() => createGameState());
  const [muted, setMuted] = useState(false);
  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty>("normal");
  const [loadingDifficulty, setLoadingDifficulty] = useState<Difficulty | null>(null);
  const [aboutReturnScreen, setAboutReturnScreen] = useState<Screen>("title");
  const audioRef = useRef<RitualAudio | null>(null);
  const loadingTimerRef = useRef<number | null>(null);

  const audio = () => {
    if (!audioRef.current) audioRef.current = new RitualAudio();
    return audioRef.current;
  };

  const transact = (fn: (draft: GameState) => void, click = true) => {
    if (click) audio().sfx("click");
    setGame((prev) => {
      const next = cloneState(prev);
      next.lastFx = "none";
      fn(next);
      if (next.lastFx !== "none") window.setTimeout(() => audio().sfx(next.lastFx), 0);
      return next;
    });
  };

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    audio().setMuted(next);
  };

  const returnHome = () => {
    audio().sfx("click");
    if (loadingTimerRef.current) window.clearTimeout(loadingTimerRef.current);
    setLoadingDifficulty(null);
    setAboutReturnScreen("title");
    setGame(createGameState());
  };

  const openAbout = () => {
    audio().sfx("click");
    if (loadingTimerRef.current) window.clearTimeout(loadingTimerRef.current);
    setLoadingDifficulty(null);
    setGame((prev) => {
      if (prev.screen !== "about") setAboutReturnScreen(prev.screen);
      return { ...cloneState(prev), screen: "about" };
    });
  };

  const closeAbout = () => {
    audio().sfx("click");
    setGame((prev) => ({ ...cloneState(prev), screen: aboutReturnScreen || "title" }));
  };

  const beginRun = (difficulty: Difficulty) => {
    audio().sfx("click");
    setSelectedDifficulty(difficulty);
    setLoadingDifficulty(difficulty);
    if (loadingTimerRef.current) window.clearTimeout(loadingTimerRef.current);
    loadingTimerRef.current = window.setTimeout(() => {
      setLoadingDifficulty(null);
      transact((draft) => startRun(draft, difficulty), false);
    }, 1450);
  };

  const player = game.player;
  const visibleScreen = loadingDifficulty ? "loading" : game.screen;

  useEffect(() => {
    audio().setMusicMode(game.screen === "title" || game.screen === "about" ? "title" : "game");
  }, [game.screen]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      window.scrollTo(0, 0);
      document.querySelector(".screen")?.scrollTo(0, 0);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [visibleScreen]);

  useEffect(
    () => () => {
      if (loadingTimerRef.current) window.clearTimeout(loadingTimerRef.current);
    },
    [],
  );

  return (
    <div className="app-frame">
      <TopHud
        game={game}
        muted={muted}
        onMute={toggleMute}
        onHome={returnHome}
        onAbout={openAbout}
        onRestart={() => transact((draft) => startRun(draft, game.difficulty || selectedDifficulty))}
      />
      <main className={`screen screen-${visibleScreen}`}>
        {loadingDifficulty && <LoadingScreen difficulty={loadingDifficulty} />}
        {!loadingDifficulty && game.screen === "title" && (
          <TitleScreen
            selectedDifficulty={selectedDifficulty}
            onDifficulty={setSelectedDifficulty}
            onStart={beginRun}
          />
        )}
        {!loadingDifficulty && game.screen === "about" && <AboutScreen onBack={closeAbout} onHome={returnHome} />}
        {player && game.screen === "map" && <MapScreen game={game} onChoose={(nodeId) => transact((draft) => chooseNode(draft, nodeId))} />}
        {player && game.screen === "combat" && game.combat && (
          <CombatScreen
            game={game}
            onPlayCard={(uid) => transact((draft) => playCard(draft, uid), false)}
            onEndTurn={() => transact(endTurn)}
          />
        )}
        {player && game.screen === "cinematic" && game.cinematic && (
          <CinematicScreen game={game} onContinue={() => transact(finishCinematic, false)} />
        )}
        {player && game.screen === "reward" && game.reward && (
          <RewardScreen
            game={game}
            onTake={(uid) => transact((draft) => takeRewardCard(draft, uid))}
            onSkip={() => transact(goMap)}
          />
        )}
        {player && game.screen === "event" && game.event && (
          <EventScreen game={game} onChoice={(choice) => transact((draft) => resolveEvent(draft, choice))} />
        )}
        {player && game.screen === "rest" && (
          <RestScreen
            onHeal={() => transact(restHeal)}
            onUpgrade={() => transact((draft) => openUpgrade(draft, "map"))}
          />
        )}
        {player && game.screen === "shop" && game.shop && (
          <ShopScreen
            game={game}
            onBuyCard={(index) => transact((draft) => buyShopCard(draft, index))}
            onBuyRelic={() => transact(buyShopRelic)}
            onRemove={() => transact((draft) => openRemoveCard(draft, draft.shop?.removeCost || 75, "shop"))}
            onLeave={() => transact(goMap)}
          />
        )}
        {player && game.screen === "remove" && (
          <DeckPickScreen
            title="烧掉一张牌"
            desc={`花费 ${game.pendingRemove?.cost || 0} 金。选中的牌会从牌组中移除。`}
            cards={player.deck}
            actionLabel="烧掉"
            onPick={(uid) => transact((draft) => removeCard(draft, uid))}
          />
        )}
        {player && game.screen === "upgrade" && (
          <DeckPickScreen
            title="升级一张牌"
            desc="朱砂重新落笔，旧符也能生出新锋。"
            cards={player.deck.filter((card) => !card.upgraded && cardDef(card).rarity !== "status")}
            actionLabel="升级"
            onPick={(uid) => transact((draft) => upgradeCard(draft, uid))}
            emptyAction={() => transact(goMap)}
          />
        )}
        {game.screen === "gameover" && <EndScreen title="夜路尽头" body="雾声合拢，城隍残印沉了下去。可荒庙仍在，下一次夜巡会更懂取舍。" onStart={() => transact(startRun)} />}
        {game.screen === "victory" && <EndScreen title="雾散天明" body="山君伏诛，荒庙的门终于被晨光推开。你带回来的不是答案，而是一套在夜里活下来的法门。" onStart={() => transact(startRun)} />}
      </main>
    </div>
  );
}

function TopHud({
  game,
  muted,
  onMute,
  onHome,
  onAbout,
  onRestart,
}: {
  game: GameState;
  muted: boolean;
  onMute: () => void;
  onHome: () => void;
  onAbout: () => void;
  onRestart: () => void;
}) {
  const player = game.player;
  return (
    <header className="top-hud">
      <div className="hud-left">
        <div className="hero-seal">
          <img src={baguaIconUrl} alt="" draggable={false} />
        </div>
        {player && (
          <>
            <HudChip icon={<img className="hud-asset-icon" src={hudBloodUrl} alt="" draggable={false} />} label={`${player.hp}/${player.maxHp}`} tone="heart" />
            <HudChip icon={<img className="hud-asset-icon" src={goldIconUrl} alt="" draggable={false} />} label={String(player.gold)} tone="gold" />
          </>
        )}
      </div>
      <div className="hud-center">
        <div className="hud-center-stack">
          <div className="hud-primary-row">
            {player ? (
              <>
            <HudChip icon={<img className="hud-asset-icon" src={pileDrawUrl} alt="" draggable={false} />} label={`牌组 ${player.deck.length}`} />
            <HudChip icon={<img className="hud-asset-icon" src={relicIconUrl} alt="" draggable={false} />} label={`遗物 ${player.relics.length}`} />
            <HudChip icon={<img className="hud-asset-icon hud-map-icon" src={mapIconUrl} alt="" draggable={false} />} label={`地图 ${Math.min(game.floor + 1, 8)}/8`} tone="map" />
              </>
            ) : (
              <span className="hud-title">夜巡录：荒庙篇</span>
            )}
          </div>
          <span className="hud-credit">FF.INC × Codex 联合开发 · 仅供娱乐</span>
        </div>
      </div>
      <div className="hud-right">
        {game.screen !== "title" && (
          <button className="icon-btn" type="button" title="回到首页" onClick={onHome}>
            <Home />
          </button>
        )}
        <button className="icon-btn" type="button" title={muted ? "打开声音" : "静音"} onClick={onMute}>
          {muted ? <VolumeX /> : <Volume2 />}
        </button>
        <button className="icon-btn" type="button" title="关于本作" onClick={onAbout}>
          <Info />
        </button>
        {player && game.screen !== "title" && (
          <button className="icon-btn" type="button" title="重新开始本局" onClick={onRestart}>
            <RotateCcw />
          </button>
        )}
      </div>
    </header>
  );
}

function HudChip({ icon, label, tone }: { icon: ReactNode; label: string; tone?: string }) {
  return (
    <div className={`hud-chip ${tone ? `hud-chip-${tone}` : ""}`}>
      <span>{icon}</span>
      <strong>{label}</strong>
    </div>
  );
}

const difficultyOptions: Array<{
  id: Difficulty;
  name: string;
  tag: string;
  desc: string;
}> = [
  { id: "story", name: "演示", tag: "拍视频", desc: "血量更高，敌人更松，开局多一点循环支撑。" },
  { id: "normal", name: "标准", tag: "推荐", desc: "完整路线体验，数值更稳，不会第一关就太刮人。" },
  { id: "hard", name: "劫难", tag: "挑战", desc: "敌人更硬更痛，适合后面调平衡时压测。" },
];

function TitleScreen({
  selectedDifficulty,
  onDifficulty,
  onStart,
}: {
  selectedDifficulty: Difficulty;
  onDifficulty: (difficulty: Difficulty) => void;
  onStart: (difficulty: Difficulty) => void;
}) {
  const compact = useCompactViewport();
  return (
    <section className="title-view">
      {!compact && <video className="scene-loop-video title-loop-video" src={sceneLoopVideoUrl} autoPlay loop muted playsInline preload="metadata" />}
      <div className="title-copy">
        <p className="eyebrow">React + Phaser prototype</p>
        <div className="title-brand">
          <img src={gameIconUrl} alt="" draggable={false} />
          <h1>荒庙夜巡</h1>
        </div>
        <p>
          永宁县外，夜雾倒流，荒庙重燃残香。你带着半枚城隍印上路，用符箓、剑诀、香火和奇物，在每一次岔路里拼出活下去的法门。
        </p>
        <div className="difficulty-picker" role="radiogroup" aria-label="难度选择">
          {difficultyOptions.map((option) => (
            <button
              key={option.id}
              type="button"
              className={`difficulty-card ${selectedDifficulty === option.id ? "selected" : ""}`}
              onClick={() => onDifficulty(option.id)}
              role="radio"
              aria-checked={selectedDifficulty === option.id}
            >
              <span>{option.tag}</span>
              <strong>{option.name}</strong>
              <em>{option.desc}</em>
            </button>
          ))}
        </div>
        <div className="title-actions">
          <button className="primary-command" type="button" onClick={() => onStart(selectedDifficulty)}>
            <Swords /> 开始夜巡
          </button>
        </div>
      </div>
    </section>
  );
}

function AboutScreen({ onBack, onHome }: { onBack: () => void; onHome: () => void }) {
  const compact = useCompactViewport();
  return (
    <section className="about-view">
      {!compact && <video className="scene-loop-video title-loop-video" src={sceneLoopVideoUrl} autoPlay loop muted playsInline preload="metadata" />}
      <div className="about-panel">
        <p className="eyebrow">About</p>
        <h1>关于《夜巡录：荒庙篇》</h1>
        <p className="about-lead">
          本游戏由 FF.INC 与 Codex 联合开发，是一个志怪题材卡牌构筑 roguelike 原型 demo，仅供娱乐、学习和非商业展示。
        </p>
        <div className="about-grid">
          <article>
            <strong>共同创作</strong>
            <span>FF.INC 提出主题、审美方向、玩法反馈和素材取舍；Codex 负责代码实现、系统迭代、UI 打磨、打包流程和工程文档。</span>
          </article>
          <article>
            <strong>版权声明</strong>
            <span>未经授权，不得移除署名，不得将本项目或其改包版本发布到其它平台，不得用于售卖、广告导流、商业试玩包或其它商业用途。</span>
          </article>
          <article>
            <strong>授权方式</strong>
            <span>除另有说明外，本仓库采用 CC BY-NC 4.0：允许分享和改编，但必须署名，且不得用于商业目的。</span>
          </article>
          <article>
            <strong>素材边界</strong>
            <span>项目包含 AI 生成素材、用户整理素材和原型资源。若进入正式发行或商业化阶段，需要重新确认素材授权或替换为自有资产。</span>
          </article>
        </div>
        <p className="about-notice">署名建议：夜巡录：荒庙篇，由 FF.INC × Codex 联合开发。</p>
        <div className="title-actions">
          <button className="primary-command" type="button" onClick={onBack}>
            <SkipForward /> 返回
          </button>
          <button className="secondary-command title-about-command" type="button" onClick={onHome}>
            <Home /> 回到首页
          </button>
        </div>
      </div>
    </section>
  );
}

function LoadingScreen({ difficulty }: { difficulty: Difficulty }) {
  const option = difficultyOptions.find((item) => item.id === difficulty) || difficultyOptions[1];
  const compact = useCompactViewport();
  return (
    <section className="loading-view">
      {!compact && <video className="scene-loop-video loading-loop-video" src={sceneLoopVideoUrl} autoPlay loop muted playsInline preload="metadata" />}
      <div className="loading-copy">
        <p className="eyebrow">入夜</p>
        <h2>雾门将开</h2>
        <span>{option.name}难度</span>
      </div>
      <div className="loading-thread" />
    </section>
  );
}

function AmbientSceneVideo() {
  const compact = useCompactViewport();
  if (compact) return null;
  return <video className="scene-loop-video ambient-scene-video" src={sceneLoopVideoUrl} autoPlay loop muted playsInline preload="metadata" />;
}

function MapScreen({ game, onChoose }: { game: GameState; onChoose: (nodeId: string) => void }) {
  const rows = routeNames.map((_, row) => game.mapNodes.filter((node) => node.row === row).sort((a, b) => a.lane - b.lane));
  const available = new Set(game.availableNodeIds);
  const visited = new Set(game.visitedNodeIds || []);
  const nodeById = new globalThis.Map(game.mapNodes.map((node) => [node.id, node]));
  const mapWidth = 400;
  const mapHeight = 640;
  const laneX = (lane: number) => 28 + (lane / 4) * (mapWidth - 56);
  const rowY = (row: number) => 26 + (row / (routeNames.length - 1)) * (mapHeight - 52);
  const links = game.mapNodes.flatMap((node) =>
    node.nextIds.flatMap((targetId) => {
      const target = nodeById.get(targetId);
      return target ? [{ from: node, to: target }] : [];
    }),
  );
  return (
    <section className="route-view">
      <div className="route-map-panel">
        <div className="route-header">
          <p className="eyebrow">路线选择</p>
          <h2>夜路分岔</h2>
          <p>每个节点只通向几条后路。想打精英、找休整、进阴市，都要提前看两步。</p>
        </div>
        <div className="branch-map" style={{ "--map-rows": routeNames.length } as CSSProperties}>
          <svg className="branch-links" viewBox={`0 0 ${mapWidth} ${mapHeight}`} preserveAspectRatio="none" aria-hidden="true">
            {links.map(({ from, to }) => {
              const isPast = visited.has(from.id) && visited.has(to.id);
              const isOpen = available.has(from.id) || game.currentNodeId === from.id;
              return (
                <line
                  key={`${from.id}-${to.id}`}
                  className={`branch-link ${isOpen ? "open" : ""} ${isPast ? "past" : ""}`}
                  x1={laneX(from.lane)}
                  y1={rowY(from.row)}
                  x2={laneX(to.lane)}
                  y2={rowY(to.row)}
                />
              );
            })}
          </svg>
          {routeNames.map((name, rowIndex) => (
            <span key={name} className="branch-row-label" style={{ gridColumn: 1, gridRow: rowIndex + 1 }}>
              {name}
            </span>
          ))}
          {rows.flat().map((node) => {
            const isAvailable = available.has(node.id);
            const isCurrent = game.currentNodeId === node.id;
            const isPast = visited.has(node.id) && !isCurrent;
            return (
              <button
                key={node.id}
                type="button"
                className={`map-node map-node-${node.type} ${isAvailable ? "available" : ""} ${isCurrent ? "current" : ""} ${isPast ? "past" : ""}`}
                style={{ gridColumn: node.lane + 2, gridRow: node.row + 1 }}
                disabled={!isAvailable}
                onClick={() => onChoose(node.id)}
                title={NODE_DEFS[node.type].desc}
              >
                {nodeIcon(node.type)}
                <span>{NODE_DEFS[node.type].name}</span>
              </button>
            );
          })}
        </div>
      </div>
      <div className="node-choice-grid">
        {game.availableNodeIds.map((id) => {
          const node = game.mapNodes.find((item) => item.id === id);
          if (!node) return null;
          return (
            <button key={node.id} className={`node-card node-${node.type}`} type="button" onClick={() => onChoose(node.id)}>
              <span className="node-icon">{nodeIcon(node.type)}</span>
              <strong>{NODE_DEFS[node.type].name}</strong>
              <p>{NODE_DEFS[node.type].desc}</p>
            </button>
          );
        })}
      </div>
      <LogRail logs={game.log} />
    </section>
  );
}

function nodeIcon(type: NodeType) {
  if (type === "combat") return <Swords />;
  if (type === "elite") return <Zap />;
  if (type === "event") return <BookOpen />;
  if (type === "rest") return <Sparkles />;
  if (type === "shop") return <BadgeCent />;
  return <AudioWaveform />;
}

function CombatScreen({ game, onPlayCard, onEndTurn }: { game: GameState; onPlayCard: (uid: string) => void; onEndTurn: () => void }) {
  const combat = game.combat!;
  const player = game.player!;
  const enemy = combat.enemy;
  const compact = useCompactViewport();
  const [drag, setDrag] = useState<{
    uid: string;
    originX: number;
    originY: number;
    dx: number;
    dy: number;
  } | null>(null);
  const [burst, setBurst] = useState<{
    id: number;
    target: "player" | "enemy";
    kind: "shield" | "strike";
  } | null>(null);
  const draggedCard = drag ? combat.hand.find((card) => card.uid === drag.uid) : null;
  const expectedTarget = draggedCard ? dropTargetForCard(draggedCard) : null;
  const dragPoint = drag ? { x: drag.originX + drag.dx, y: drag.originY + drag.dy } : null;
  const hoverTarget = dragPoint ? dragHitTarget(dragPoint) : null;
  const targetHot = Boolean(expectedTarget && hoverTarget === expectedTarget);
  const dropHint = expectedTarget === "enemy" ? "拖到妖物身上施放" : expectedTarget === "player" ? "拖到自己身上施放" : "拖到目标身上施放";

  const beginDrag = (card: CardInstance, event: ReactPointerEvent<HTMLButtonElement>) => {
    if (cardDef(card).unplayable) return;
    const cost = cardCost(card);
    if (typeof cost !== "number" || player.energy < cost) return;
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // Window-level pointer listeners below keep drag release reliable even if capture is unavailable.
    }
    setDrag({ uid: card.uid, originX: event.clientX, originY: event.clientY, dx: 0, dy: 0 });
  };

  const moveDrag = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (!drag) return;
    setDrag({ ...drag, dx: event.clientX - drag.originX, dy: event.clientY - drag.originY });
  };

  const releaseDragAt = (uid: string, point: { x: number; y: number }) => {
    const card = combat.hand.find((item) => item.uid === uid);
    const target = card ? dropTargetForCard(card) : null;
    if (!target || dragHitTarget(point) !== target) return;
    const id = Date.now();
    setBurst({ id, target, kind: target === "enemy" ? "strike" : "shield" });
    window.setTimeout(() => {
      setBurst((current) => (current?.id === id ? null : current));
    }, 520);
    onPlayCard(uid);
  };

  const endDrag = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (!drag) return;
    const uid = drag.uid;
    setDrag(null);
    releaseDragAt(uid, { x: event.clientX, y: event.clientY });
  };

  useEffect(() => {
    if (!drag) return;

    const handleMove = (event: PointerEvent) => {
      setDrag((current) => {
        if (!current || current.uid !== drag.uid) return current;
        return { ...current, dx: event.clientX - current.originX, dy: event.clientY - current.originY };
      });
    };
    const handleEnd = (event: PointerEvent) => {
      const uid = drag.uid;
      setDrag(null);
      releaseDragAt(uid, { x: event.clientX, y: event.clientY });
    };
    const handleCancel = () => setDrag(null);

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleEnd);
    window.addEventListener("pointercancel", handleCancel);
    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleEnd);
      window.removeEventListener("pointercancel", handleCancel);
    };
  }, [combat.hand, drag, onPlayCard]);

  return (
    <section className="combat-view">
      {compact ? (
        <MobileCombatStage combat={combat} player={player} />
      ) : (
        <Suspense fallback={<div className="desktop-stage-fallback" aria-hidden="true" />}>
          <DesktopCombatStage combat={combat} player={player} />
        </Suspense>
      )}
      {!compact && <video className="combat-scene-loop" src={sceneLoopVideoUrl} autoPlay loop muted playsInline preload="metadata" />}
      <div className={`combat-overlay ${drag ? "drag-active" : ""} ${expectedTarget ? `expects-${expectedTarget}` : ""} ${targetHot ? "target-hot" : ""}`}>
        <div className={`play-drop-zone ${drag ? "visible" : ""} ${targetHot ? "hot" : ""}`}>{targetHot ? "松手施放" : dropHint}</div>
        <div className={`target-ghost target-player ${expectedTarget === "player" ? "visible" : ""} ${targetHot && hoverTarget === "player" ? "hot" : ""}`}>
          <Shield />
          <span>加护预备</span>
        </div>
        <div className={`target-ghost target-enemy ${expectedTarget === "enemy" ? "visible" : ""} ${targetHot && hoverTarget === "enemy" ? "hot" : ""}`}>
          <Swords />
          <span>受击预热</span>
        </div>
        {burst && (
          <div key={burst.id} className={`target-burst target-burst-${burst.target} burst-${burst.kind}`}>
            {burst.kind === "shield" ? <Shield /> : <Swords />}
          </div>
        )}
        <div className={`actor-panel player-panel ${expectedTarget === "player" ? "preview-target" : ""} ${targetHot && hoverTarget === "player" ? "target-hot" : ""}`}>
          <HealthStrip current={player.hp} max={player.maxHp} />
          <div className="status-stack">
            <StatusBadge icon={<img src={blockBadgeUrl} alt="" draggable={false} />} text={`格挡 ${player.block}`} />
            <StatusBadge icon={<img src={incenseBadgeUrl} alt="" draggable={false} />} text={`香火 ${player.incense}`} />
            {player.weak > 0 && <StatusBadge text={`虚弱 ${player.weak}`} />}
            {player.powers.nightEye && <StatusBadge text="夜眼" />}
            {player.powers.citygod && <StatusBadge text="城隍" />}
          </div>
        </div>
        <div className={`actor-panel enemy-panel ${expectedTarget === "enemy" ? "preview-target" : ""} ${targetHot && hoverTarget === "enemy" ? "target-hot" : ""}`}>
          <div className="intent-plaque">
            <span>意图</span>
            <strong>{intentText(enemy.intent)}</strong>
          </div>
          <HealthStrip current={enemy.hp} max={enemy.maxHp} enemy />
          <div className="status-stack">
            <StatusBadge icon={<img src={sealBadgeUrl} alt="" draggable={false} />} text={`符印 ${enemy.seal}`} />
            <StatusBadge icon={<img src={blockBadgeUrl} alt="" draggable={false} />} text={`格挡 ${enemy.block}`} />
            {enemy.strength > 0 && <StatusBadge text={`力量 ${enemy.strength}`} />}
            {enemy.weak > 0 && <StatusBadge text={`虚弱 ${enemy.weak}`} />}
            {enemy.vulnerable > 0 && <StatusBadge text={`易伤 ${enemy.vulnerable}`} />}
          </div>
        </div>
        <div className="energy-orb">
          <strong>{player.energy}</strong>
          <span>/{player.maxEnergy}</span>
        </div>
        <button className="end-turn" type="button" onClick={onEndTurn}>
          <SkipForward /> 结束回合
        </button>
        <div className="pile-counters pile-left" title={`已弃牌 ${combat.discardPile.length}`} aria-label={`已弃牌 ${combat.discardPile.length}`}>
          <img src={pileDiscardUrl} alt="" draggable={false} />
          <span>已弃牌</span>
          <strong>{combat.discardPile.length}</strong>
        </div>
        <div className="pile-counters pile-right" title={`牌库 ${combat.drawPile.length}`} aria-label={`牌库 ${combat.drawPile.length}`}>
          <img src={pileDrawUrl} alt="" draggable={false} />
          <span>牌库</span>
          <strong>{combat.drawPile.length}</strong>
        </div>
        <div className="hand-fan" style={{ "--hand-count": combat.hand.length } as CSSProperties}>
          {combat.hand.map((card, index) => {
            const cost = cardCost(card);
            const disabled = cardDef(card).unplayable || typeof cost !== "number" || player.energy < cost;
            const isDragging = drag?.uid === card.uid;
            return (
              <GameCard
                key={card.uid}
                card={card}
                mode="hand"
                index={index}
                count={combat.hand.length}
                disabled={disabled}
                dragOffset={isDragging ? { x: drag.dx, y: drag.dy } : undefined}
                dragging={isDragging}
                onPointerDown={(event) => beginDrag(card, event)}
                onPointerMove={moveDrag}
                onPointerUp={endDrag}
                onPointerCancel={() => setDrag(null)}
              />
            );
          })}
        </div>
      </div>
    </section>
  );
}

function MobileCombatStage({ combat, player }: { combat: CombatState; player: PlayerState }) {
  const enemy = combat.enemy;
  return (
    <div className={`mobile-combat-stage hit-${combat.hitTarget || "none"}`} aria-hidden="true">
      <div className="mobile-stage-sky" />
      <div className="mobile-stage-ground" />
      <div className="mobile-stage-line line-a" />
      <div className="mobile-stage-line line-b" />
      <MobileActorFigure kind="player" name={player.name} />
      <MobileActorFigure kind="enemy" name={enemy.name} />
    </div>
  );
}

function MobileActorFigure({ kind, name }: { kind: "player" | "enemy"; name: string }) {
  return (
    <div className={`mobile-actor mobile-${kind}-figure`} data-name={name}>
      <span className="mobile-actor-halo" />
      <span className="mobile-actor-head" />
      <span className="mobile-actor-body" />
      <span className="mobile-actor-staff" />
    </div>
  );
}

function HealthStrip({ current, max, enemy = false }: { current: number; max: number; enemy?: boolean }) {
  return (
    <div className={`health-strip ${enemy ? "enemy-health" : ""}`}>
      <div className="health-fill" style={{ width: `${Math.max(0, Math.min(100, (current / max) * 100))}%` }} />
      <strong>
        {current}/{max}
      </strong>
    </div>
  );
}

function StatusBadge({ icon, text }: { icon?: ReactNode; text: string }) {
  return (
    <span className="status-badge">
      {icon}
      {text}
    </span>
  );
}

function GameCard({
  card,
  mode,
  index = 0,
  count = 1,
  disabled,
  dragging,
  dragOffset,
  onClick,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
}: {
  card: CardInstance;
  mode?: "hand" | "reward" | "pick";
  index?: number;
  count?: number;
  disabled?: boolean;
  dragging?: boolean;
  dragOffset?: { x: number; y: number };
  onClick?: () => void;
  onPointerDown?: (event: ReactPointerEvent<HTMLButtonElement>) => void;
  onPointerMove?: (event: ReactPointerEvent<HTMLButtonElement>) => void;
  onPointerUp?: (event: ReactPointerEvent<HTMLButtonElement>) => void;
  onPointerCancel?: () => void;
}) {
  const def = cardDef(card);
  const costKey = typeof def.cost === "number" ? String(Math.min(def.cost, 3)) : "empty";
  const center = (count - 1) / 2;
  const rotate = (index - center) * 5.5;
  const lift = Math.abs(index - center) * 9;
  const offset = (index - center) * 78;
  const style =
    mode === "hand"
      ? ({
          "--card-rot": `${rotate}deg`,
          "--card-x": `${offset}px`,
          "--card-y": `${lift}px`,
          "--drag-x": `${dragOffset?.x || 0}px`,
          "--drag-y": `${dragOffset?.y || 0}px`,
          zIndex: 20 + index,
        } as CSSProperties)
      : undefined;

  return (
    <button
      type="button"
      className={`game-card card-${def.type} ${disabled ? "disabled" : ""} ${dragging ? "is-dragging" : ""} ${mode ? `card-mode-${mode}` : ""}`}
      style={style}
      disabled={disabled}
      onClick={onClick}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
    >
      <div className={`card-cost card-cost-${costKey}`}>
        <img src={costGemUrls[costKey]} alt="" draggable={false} />
        <strong>{def.cost}</strong>
      </div>
      <div className="card-title">{cardName(card)}</div>
      <div className="card-art-window">
        <img className={`card-art-icon card-art-icon-${def.type}`} src={cardArtImage(card)} alt="" draggable={false} />
        <div className="sigil-lines" />
      </div>
      <div className="card-kind">{typeLabel(def.type)}</div>
      <p>{cardText(card)}</p>
    </button>
  );
}

function cardArtImage(card: CardInstance) {
  const def = cardDef(card);
  if (def.type === "attack") {
    return ["strike", "taomu", "paperBlade"].includes(def.id) ? swordCrossUrl : swordFireUrl;
  }
  if (def.type === "power") return baguaIconUrl;
  if (def.type === "status") return hudBloodUrl;
  return talismanIconUrl;
}

function dropTargetForCard(card: CardInstance): "player" | "enemy" | null {
  const type = cardDef(card).type;
  if (type === "attack") return "enemy";
  if (type === "skill" || type === "power") return "player";
  return null;
}

function dragHitTarget(point: { x: number; y: number }): "player" | "enemy" | null {
  if (typeof window === "undefined") return null;
  const inBattleBand = point.y > 120 && point.y < window.innerHeight * 0.78;
  if (!inBattleBand) return null;
  if (point.x < window.innerWidth * 0.48) return "player";
  if (point.x > window.innerWidth * 0.52) return "enemy";
  return null;
}

function typeLabel(type: string) {
  if (type === "attack") return "攻击";
  if (type === "skill") return "技能";
  if (type === "power") return "法门";
  return "状态";
}

function CinematicScreen({ game, onContinue }: { game: GameState; onContinue: () => void }) {
  const cinematic = game.cinematic!;
  const reward = game.reward;
  const compact = useCompactViewport();
  const [videoFailed, setVideoFailed] = useState(false);
  const [videoStarted, setVideoStarted] = useState(false);
  const enemyArt = enemyArtUrls[cinematic.enemyArtKey] || enemyArtUrls.lantern;
  const mediaKey = cinematic.combatType === "boss" ? `boss-${cinematic.enemyId}` : cinematic.enemyId;
  const videoSrc = cinematicVideoUrls[mediaKey];
  const posterSrc = cinematicPosterUrls[mediaKey] || cinematic.posterUrl;
  const isBoss = cinematic.combatType === "boss";
  const isElite = cinematic.combatType === "elite";
  const shouldTryVideo = !compact && Boolean(videoSrc) && !videoFailed;
  const playerName = game.player?.name || "夜巡人";

  useEffect(() => {
    setVideoFailed(false);
    setVideoStarted(false);
  }, [cinematic.enemyId, cinematic.combatType]);

  return (
    <section
      className={`cinematic-view ${isBoss ? "cinematic-boss" : ""}`}
      data-video-slot={videoSrc || cinematic.videoUrl}
      data-poster-slot={posterSrc}
    >
      <div className="cinematic-scene" aria-label={`${cinematic.enemyName}结算过场参考画面`}>
        <div className="cinematic-moon" />
        {compact ? (
          <div className="mobile-cinematic-duel" aria-hidden="true">
            <MobileActorFigure kind="player" name={playerName} />
            <MobileActorFigure kind="enemy" name={cinematic.enemyName} />
          </div>
        ) : (
          <>
            <img className="cinematic-player" src={playerNightPatrolUrl} alt="" draggable={false} />
            <img className={`cinematic-enemy enemy-${cinematic.enemyArtKey}`} src={enemyArt} alt="" draggable={false} />
          </>
        )}
        <div className="cinematic-slash" />
        <div className="cinematic-caption">
          <p className="eyebrow">{isBoss ? "Boss Clear" : isElite ? "Elite Clear" : "Encounter Clear"}</p>
          <h2>{cinematic.title}</h2>
          <span>{cinematic.subtitle}</span>
        </div>
        {shouldTryVideo && (
          <video
            className={`cinematic-video ${videoStarted ? "is-playing" : ""}`}
            src={videoSrc}
            poster={posterSrc}
            autoPlay
            playsInline
            onPlay={() => setVideoStarted(true)}
            onEnded={onContinue}
            onError={() => setVideoFailed(true)}
          />
        )}
        {(videoFailed || !videoStarted) && (
          <div className="cinematic-static-card">
            <strong>{cinematic.enemyName}</strong>
            <span>{isBoss ? "殿门外的雾终于开始退去。" : "残火停在半空，铜钱在灰里发亮。"}</span>
          </div>
        )}
      </div>
      <aside className="settlement-panel">
        <p className="eyebrow">战斗结算</p>
        <h3>{isBoss ? "第一大关完成" : "战利品待领取"}</h3>
        <div className="settlement-line">
          <img src={goldIconUrl} alt="" draggable={false} />
          <span>{cinematic.rewardSummary ? `获得 ${cinematic.rewardSummary.gold} 金` : "山君伏诛，雾散天明"}</span>
        </div>
        {cinematic.rewardSummary?.relicName && (
          <div className="settlement-line">
            <Sparkles />
            <span>遗物：{cinematic.rewardSummary.relicName}</span>
          </div>
        )}
        {reward && (
          <div className="settlement-card-peek">
            {reward.cards.map((card) => (
              <span key={card.uid}>{cardName(card)}</span>
            ))}
          </div>
        )}
        <div className="settlement-flavor">
          <strong>夜巡记</strong>
          <span>{isBoss ? "正殿梁上落下第一缕晨光，旧香灰没有再动。" : "妖气退开，地上只剩几枚温热的铜钱。"}</span>
        </div>
        <button className="primary-command" type="button" onClick={onContinue}>
          <SkipForward /> {isBoss ? "进入通关页" : "领取战利品"}
        </button>
      </aside>
    </section>
  );
}

function RewardScreen({ game, onTake, onSkip }: { game: GameState; onTake: (uid: string) => void; onSkip: () => void }) {
  const reward = game.reward!;
  return (
    <section className="choice-view">
      <AmbientSceneVideo />
      <div className="choice-header">
        <p className="eyebrow">战斗奖励</p>
        <h2>{reward.title}</h2>
        <p>获得 {reward.gold} 金。{reward.relic ? `遗物 ${reward.relic.name} 已入囊。` : "这次没有遗物。"} 选一张牌，或让牌组保持清瘦。</p>
      </div>
      {reward.relic && <div className="relic-banner"><strong>{reward.relic.name}</strong>{reward.relic.text}</div>}
      <div className="reward-row">
        {reward.cards.map((card) => (
          <GameCard key={card.uid} card={card} mode="reward" onClick={() => onTake(card.uid)} />
        ))}
      </div>
      <button className="secondary-command" type="button" onClick={onSkip}>跳过卡牌</button>
      <LogRail logs={game.log} />
    </section>
  );
}

function EventScreen({ game, onChoice }: { game: GameState; onChoice: (choice: string) => void }) {
  const event = game.event!;
  return (
    <section className="choice-view event-view">
      <AmbientSceneVideo />
      <div className="choice-header">
        <p className="eyebrow">怪事</p>
        <h2>{event.title}</h2>
        <p>{event.body}</p>
      </div>
      <div className="decision-grid">
        {event.choices.map((choice) => (
          <button key={choice.id} type="button" className="decision-card" onClick={() => onChoice(choice.id)}>
            <strong>{choice.title}</strong>
            <span>{choice.desc}</span>
          </button>
        ))}
      </div>
      <LogRail logs={game.log} />
    </section>
  );
}

function RestScreen({ onHeal, onUpgrade }: { onHeal: () => void; onUpgrade: () => void }) {
  return (
    <section className="choice-view">
      <AmbientSceneVideo />
      <div className="choice-header">
        <p className="eyebrow">休整</p>
        <h2>残灯休整</h2>
        <p>夜风暂止，破灯还亮。你可以疗伤，也可以把一张牌磨到更顺手。</p>
      </div>
      <div className="decision-grid">
        <button type="button" className="decision-card" onClick={onHeal}><strong>静坐调息</strong><span>回复最大生命 30%。</span></button>
        <button type="button" className="decision-card" onClick={onUpgrade}><strong>朱砂重描</strong><span>升级 1 张牌。</span></button>
      </div>
    </section>
  );
}

function ShopScreen({
  game,
  onBuyCard,
  onBuyRelic,
  onRemove,
  onLeave,
}: {
  game: GameState;
  onBuyCard: (index: number) => void;
  onBuyRelic: () => void;
  onRemove: () => void;
  onLeave: () => void;
}) {
  const shop = game.shop!;
  const gold = game.player!.gold;
  return (
    <section className="choice-view">
      <AmbientSceneVideo />
      <div className="choice-header">
        <p className="eyebrow">商店</p>
        <h2>阴市灯摊</h2>
        <p>摊主戴着没有眼孔的面具，算盘珠子自己响。你有 {gold} 金。</p>
      </div>
      <div className="shop-grid">
        {shop.cards.map((item, index) => (
          <button key={item.card.uid} className="shop-card" type="button" disabled={item.sold || gold < item.cost} onClick={() => onBuyCard(index)}>
            <strong>{cardName(item.card)}</strong>
            <span>{cardText(item.card)}</span>
            <em>{item.sold ? "已售" : `${item.cost} 金`}</em>
          </button>
        ))}
        <button className="shop-card relic-shop-card" type="button" disabled={shop.relic.sold || !shop.relic.relic || gold < shop.relic.cost} onClick={onBuyRelic}>
          <strong>{shop.relic.relic?.name || "空摊"}</strong>
          <span>{shop.relic.relic?.text || "没有新的遗物。"}</span>
          <em>{shop.relic.sold ? "已售" : `${shop.relic.cost} 金`}</em>
        </button>
        <button className="shop-card" type="button" disabled={gold < shop.removeCost} onClick={onRemove}>
          <strong>烧旧牌</strong>
          <span>请摊主替你烧掉一张不再需要的牌。</span>
          <em>{shop.removeCost} 金</em>
        </button>
      </div>
      <button className="secondary-command" type="button" onClick={onLeave}>离开阴市</button>
    </section>
  );
}

function DeckPickScreen({
  title,
  desc,
  cards,
  actionLabel,
  onPick,
  emptyAction,
}: {
  title: string;
  desc: string;
  cards: CardInstance[];
  actionLabel: string;
  onPick: (uid: string) => void;
  emptyAction?: () => void;
}) {
  return (
    <section className="choice-view">
      <AmbientSceneVideo />
      <div className="choice-header">
        <p className="eyebrow">牌组</p>
        <h2>{title}</h2>
        <p>{desc}</p>
      </div>
      {cards.length ? (
        <div className="deck-grid">
          {cards.map((card) => (
            <button key={card.uid} type="button" className="deck-card" onClick={() => onPick(card.uid)}>
              <strong>{cardName(card)}</strong>
              <span>{cardText(card)}</span>
              <em>{actionLabel}</em>
            </button>
          ))}
        </div>
      ) : (
        <div className="empty-panel">
          <p>没有可选择的牌。</p>
          {emptyAction && <button type="button" onClick={emptyAction}>继续</button>}
        </div>
      )}
    </section>
  );
}

function logTone(log: string) {
  if (/获得|买下|金币|遗物|卡牌|金/.test(log)) return { label: "收获", tone: "gain" };
  if (/造成|攻击|伤害|虚弱|易伤|符印|格挡|力量|塞入/.test(log)) return { label: "战斗", tone: "combat" };
  if (/回复|升级|烧掉|休整|残灯/.test(log)) return { label: "整备", tone: "ready" };
  if (/狐|井|书生|纸契|怪事|阴市/.test(log)) return { label: "怪事", tone: "event" };
  return { label: "行路", tone: "route" };
}

function LogRail({ logs }: { logs: string[] }) {
  return (
    <aside className="log-rail">
      <strong>夜巡札记</strong>
      {logs.length === 0 && <span className="log-entry log-route"><small>行路</small><b>纸灯未亮，夜路还没有留下痕迹。</b></span>}
      {logs.map((log, index) => {
        const meta = logTone(log);
        return (
          <span className={`log-entry log-${meta.tone}`} key={`${log}-${index}`}>
            <small>{meta.label}</small>
            <b>{log}</b>
          </span>
        );
      })}
    </aside>
  );
}

function EndScreen({ title, body, onStart }: { title: string; body: string; onStart: () => void }) {
  return (
    <section className="title-view">
      <div className="title-copy">
        <p className="eyebrow">终局</p>
        <h1>{title}</h1>
        <p>{body}</p>
        <div className="title-actions">
          <button className="primary-command" type="button" onClick={onStart}>
            <Swords /> 再巡一夜
          </button>
        </div>
      </div>
    </section>
  );
}
