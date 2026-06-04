import Phaser from "phaser";
import { useEffect, useRef } from "react";
import type { CombatState, PlayerState } from "../game/types";

const nightTempleBattleUrl = new URL("../../assets/generated/backgrounds/night-temple-battle.png", import.meta.url).href;
const playerNightPatrolUrl = new URL("../../assets/generated/characters/player-night-patrol.png", import.meta.url).href;
const lanternUrl = new URL("../../assets/generated/enemies/lantern.png", import.meta.url).href;
const waterghostUrl = new URL("../../assets/generated/enemies/waterghost.png", import.meta.url).href;
const templecorpseUrl = new URL("../../assets/generated/enemies/templecorpse.png", import.meta.url).href;
const macaqueUrl = new URL("../../assets/generated/enemies/macaque.png", import.meta.url).href;
const warlockUrl = new URL("../../assets/generated/enemies/warlock.png", import.meta.url).href;
const foxshadeUrl = new URL("../../assets/generated/enemies/foxshade.png", import.meta.url).href;
const tigerlordUrl = new URL("../../assets/generated/enemies/tigerlord.png", import.meta.url).href;

const ENEMY_ART_URLS: Record<string, string> = {
  lantern: lanternUrl,
  waterghost: waterghostUrl,
  templecorpse: templecorpseUrl,
  macaque: macaqueUrl,
  warlock: warlockUrl,
  foxshade: foxshadeUrl,
  tigerlord: tigerlordUrl,
};

const ENEMY_STAGE_SIZE: Record<string, { width: number; height: number; y: number }> = {
  lantern: { width: 0.19, height: 0.4, y: 0.58 },
  waterghost: { width: 0.22, height: 0.42, y: 0.59 },
  templecorpse: { width: 0.24, height: 0.45, y: 0.59 },
  macaque: { width: 0.3, height: 0.34, y: 0.61 },
  warlock: { width: 0.27, height: 0.47, y: 0.58 },
  foxshade: { width: 0.25, height: 0.46, y: 0.58 },
  tigerlord: { width: 0.39, height: 0.4, y: 0.59 },
};

interface CombatStageProps {
  combat: CombatState;
  player: PlayerState;
}

interface StageSnapshot {
  enemyKey: string;
  enemyName: string;
  enemyHp: number;
  enemyMaxHp: number;
  enemySeal: number;
  enemyBlock: number;
  enemyIntent: string;
  playerHp: number;
  playerMaxHp: number;
  playerBlock: number;
  pulse: number;
  hitTarget: "enemy" | "player" | null;
}

class NightBattleScene extends Phaser.Scene {
  private initialEnemyKey: string;
  private failedTextures = new Set<string>();
  private bg?: Phaser.GameObjects.Image;
  private enemy?: Phaser.GameObjects.Image;
  private player?: Phaser.GameObjects.Container;
  private playerSprite?: Phaser.GameObjects.Image;
  private playerShadow?: Phaser.GameObjects.Ellipse;
  private fog?: Phaser.GameObjects.Particles.ParticleEmitter;
  private sealText?: Phaser.GameObjects.Text;
  private intentText?: Phaser.GameObjects.Text;
  private enemyName?: Phaser.GameObjects.Text;
  private lastEnemyKey = "";
  private lastPulse = 0;
  private playerBaseX = 0;
  private enemyBaseX = 0;
  private playerBaseY = 0;
  private enemyBaseY = 0;
  private snapshot: StageSnapshot | null = null;

  constructor(initialEnemyKey = "lantern") {
    super("NightBattle");
    this.initialEnemyKey = ENEMY_ART_URLS[initialEnemyKey] ? initialEnemyKey : "lantern";
  }

  preload() {
    this.load.on(Phaser.Loader.Events.FILE_LOAD_ERROR, (file: { key?: string }) => {
      if (file.key) this.failedTextures.add(file.key);
    });
    this.load.image("huangmiao-bg", nightTempleBattleUrl);
    this.load.image("player-night-patrol", playerNightPatrolUrl);
    this.load.image(`enemy-${this.initialEnemyKey}`, ENEMY_ART_URLS[this.initialEnemyKey]);
  }

  create() {
    const { width, height } = this.scale;
    this.bg = this.add.image(width / 2, height / 2, this.safeTexture("huangmiao-bg", "bg")).setDisplaySize(width, height);
    this.add.rectangle(width / 2, height / 2, width, height, 0x050707, 0.18);
    this.add.ellipse(width / 2, height * 0.83, width * 0.82, height * 0.16, 0x080909, 0.36);
    this.createPlayer();
    this.enemy = this.add.image(width * 0.74, height * 0.6, this.safeTexture(`enemy-${this.initialEnemyKey}`, "enemy"));
    this.enemy.setDisplaySize(width * 0.24, height * 0.34);
    this.enemyName = this.add.text(width * 0.74, height * 0.31, "", {
      fontFamily: "serif",
      fontSize: "28px",
      color: "#f8dfad",
      stroke: "#101010",
      strokeThickness: 5,
    }).setOrigin(0.5);
    this.sealText = this.add.text(width * 0.74, height * 0.39, "", {
      fontFamily: "serif",
      fontSize: "22px",
      color: "#ffd46f",
      stroke: "#150909",
      strokeThickness: 5,
    }).setOrigin(0.5);
    this.intentText = this.add.text(width * 0.74, height * 0.24, "", {
      fontFamily: "serif",
      fontSize: "22px",
      color: "#ffd8c8",
      stroke: "#140908",
      strokeThickness: 5,
    }).setOrigin(0.5);
    this.createMist();
    this.refresh();
  }

  update(_time: number, _delta: number) {
    if (this.player) {
      this.player.y = this.playerBaseY + Math.sin(this.time.now / 650) * 3;
    }
    if (this.enemy) {
      this.enemy.y = this.enemyBaseY + Math.sin(this.time.now / 700) * 4;
    }
  }

  setSnapshot(snapshot: StageSnapshot) {
    this.snapshot = snapshot;
    this.refresh();
  }

  private createPlayer() {
    const { width, height } = this.scale;
    const group = this.add.container(width * 0.28, height * 0.66);
    const shadow = this.add.ellipse(0, 8, 210, 40, 0x050505, 0.48);
    const glow = this.add.circle(20, -110, 92, 0x7bd6ce, 0.08);
    const sprite = this.add.image(0, 8, this.safeTexture("player-night-patrol", "player")).setOrigin(0.5, 1);
    group.add([shadow, glow, sprite]);
    this.player = group;
    this.playerSprite = sprite;
    this.playerShadow = shadow;
  }

  private createMist() {
    const { width, height } = this.scale;
    const particles = this.add.particles(0, 0, "huangmiao-bg", {
      x: { min: -120, max: width + 120 },
      y: { min: height * 0.25, max: height * 0.72 },
      lifespan: 9000,
      speedX: { min: 8, max: 22 },
      speedY: { min: -4, max: 6 },
      alpha: { start: 0.032, end: 0 },
      scale: { start: 0.08, end: 0.18 },
      quantity: 1,
      frequency: 420,
      blendMode: Phaser.BlendModes.ADD,
    });
    this.fog = particles;
  }

  private refresh() {
    if (!this.snapshot || !this.enemy || !this.bg) return;
    const { width, height } = this.scale;
    this.bg.setDisplaySize(width, height).setPosition(width / 2, height / 2);
    if (this.snapshot.enemyKey !== this.lastEnemyKey) {
      this.enemy.setTexture(this.safeTexture(`enemy-${this.snapshot.enemyKey}`, "enemy"));
      this.lastEnemyKey = this.snapshot.enemyKey;
    }
    const enemySize = ENEMY_STAGE_SIZE[this.snapshot.enemyKey] || ENEMY_STAGE_SIZE.lantern;
    this.enemyBaseY = height * enemySize.y;
    this.enemyBaseX = width * 0.74;
    this.playerBaseX = width * 0.28;
    this.playerBaseY = height * 0.66;
    this.enemy.setPosition(this.enemyBaseX, this.enemyBaseY);
    this.enemy.setDisplaySize(width * enemySize.width, height * enemySize.height);
    this.player?.setPosition(this.playerBaseX, this.playerBaseY);
    this.playerSprite?.setDisplaySize(width * 0.2, height * 0.48).setFlipX(true);
    this.playerShadow?.setSize(width * 0.18, height * 0.055);
    const compactText = width < 520;
    this.enemyName?.setText(this.snapshot.enemyName).setPosition(width * 0.74, height * 0.3).setVisible(!compactText);
    this.sealText
      ?.setText(`符印 ${this.snapshot.enemySeal}   格挡 ${this.snapshot.enemyBlock}`)
      .setPosition(width * 0.74, height * 0.38)
      .setVisible(!compactText);
    this.intentText?.setText(this.snapshot.enemyIntent).setPosition(width * 0.74, height * 0.22).setVisible(!compactText);
    if (this.snapshot.pulse !== this.lastPulse) {
      this.lastPulse = this.snapshot.pulse;
      this.cameras.main.shake(110, 0.004);
      this.shakeTarget(this.snapshot.hitTarget);
    }
    this.fog?.setPosition(0, 0);
  }

  private shakeTarget(target: StageSnapshot["hitTarget"]) {
    if (target === "enemy" && this.enemy) {
      this.tweens.killTweensOf(this.enemy);
      this.enemy.setX(this.enemyBaseX);
      this.tweens.add({
        targets: this.enemy,
        x: this.enemyBaseX + 18,
        scaleX: this.enemy.scaleX * 1.04,
        scaleY: this.enemy.scaleY * 1.04,
        duration: 58,
        yoyo: true,
        repeat: 2,
        ease: "Sine.easeInOut",
        onComplete: () => this.enemy?.setPosition(this.enemyBaseX, this.enemyBaseY),
      });
    }
    if (target === "player" && this.player) {
      this.tweens.killTweensOf(this.player);
      this.player.setX(this.playerBaseX);
      this.tweens.add({
        targets: this.player,
        x: this.playerBaseX - 16,
        duration: 54,
        yoyo: true,
        repeat: 2,
        ease: "Sine.easeInOut",
        onComplete: () => this.player?.setPosition(this.playerBaseX, this.playerBaseY),
      });
    }
  }

  private safeTexture(key: string, kind: "bg" | "player" | "enemy") {
    if (!this.failedTextures.has(key) && this.textures.exists(key)) return key;
    const fallbackKey = `${key}-fallback`;
    if (this.textures.exists(fallbackKey)) return fallbackKey;
    const size = kind === "bg" ? { w: 900, h: 620 } : kind === "player" ? { w: 220, h: 420 } : { w: 240, h: 320 };
    const texture = this.textures.createCanvas(fallbackKey, size.w, size.h);
    if (!texture) return key;
    const ctx = texture.getContext();
    ctx.clearRect(0, 0, size.w, size.h);

    if (kind === "bg") {
      const bg = ctx.createLinearGradient(0, 0, 0, size.h);
      bg.addColorStop(0, "#10201f");
      bg.addColorStop(0.58, "#07100f");
      bg.addColorStop(1, "#050707");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, size.w, size.h);
      ctx.fillStyle = "rgba(130, 213, 199, 0.08)";
      ctx.beginPath();
      ctx.arc(size.w * 0.32, size.h * 0.38, size.w * 0.18, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(255, 226, 173, 0.08)";
      ctx.fillRect(size.w * 0.52, size.h * 0.34, size.w * 0.3, size.h * 0.34);
    } else {
      const glow = kind === "player" ? "rgba(130, 213, 199, 0.3)" : "rgba(232, 95, 75, 0.28)";
      const body = kind === "player" ? "rgba(23, 52, 48, 0.92)" : "rgba(70, 26, 22, 0.88)";
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.ellipse(size.w * 0.5, size.h * 0.72, size.w * 0.34, size.h * 0.12, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = glow;
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.moveTo(size.w * 0.5, size.h * 0.18);
      ctx.lineTo(size.w * 0.5, size.h * 0.82);
      ctx.moveTo(size.w * 0.28, size.h * 0.42);
      ctx.lineTo(size.w * 0.72, size.h * 0.42);
      ctx.stroke();
      ctx.fillStyle = body;
      ctx.fillRect(size.w * 0.36, size.h * 0.28, size.w * 0.28, size.h * 0.56);
      ctx.fillStyle = "rgba(255, 226, 173, 0.72)";
      ctx.beginPath();
      ctx.arc(size.w * 0.5, size.h * 0.19, size.w * 0.13, 0, Math.PI * 2);
      ctx.fill();
    }

    texture.refresh();
    return fallbackKey;
  }
}

export function CombatStage({ combat, player }: CombatStageProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const gameRef = useRef<Phaser.Game | null>(null);

  useEffect(() => {
    if (!hostRef.current || gameRef.current) return;
    gameRef.current = new Phaser.Game({
      type: Phaser.AUTO,
      parent: hostRef.current,
      backgroundColor: "#07100f",
      transparent: true,
      scale: {
        mode: Phaser.Scale.RESIZE,
        width: "100%",
        height: "100%",
      },
      render: {
        antialias: true,
      },
      scene: new NightBattleScene(combat.enemy.artKey),
    });
    return () => {
      gameRef.current?.destroy(true);
      gameRef.current = null;
    };
  }, []);

  useEffect(() => {
    const snapshot: StageSnapshot = {
      enemyKey: combat.enemy.artKey,
      enemyName: combat.enemy.name,
      enemyHp: combat.enemy.hp,
      enemyMaxHp: combat.enemy.maxHp,
      enemySeal: combat.enemy.seal,
      enemyBlock: combat.enemy.block,
      enemyIntent: combat.enemy.intent?.label || "敌意未明",
      playerHp: player.hp,
      playerMaxHp: player.maxHp,
      playerBlock: player.block,
      pulse: combat.pulse,
      hitTarget: combat.hitTarget,
    };

    const push = () => {
      const scene = gameRef.current?.scene.getScene("NightBattle") as NightBattleScene | undefined;
      scene?.setSnapshot(snapshot);
    };

    push();
    const id = window.setTimeout(push, 80);
    return () => window.clearTimeout(id);
  }, [combat, player]);

  return <div ref={hostRef} className="phaser-stage" aria-hidden="true" />;
}
