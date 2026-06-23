import { Application, Assets, BlurFilter, Container, Graphics, Rectangle, Sprite, Text, Texture } from 'pixi.js';
import { CAPACITY, ROUND_SECONDS, WORLD_HEIGHT, WORLD_WIDTH } from './constants';
import { drawBag, drawIcon } from './drawing';
import { items } from './items';
import { money, rankFor } from './scoring';
import type { Item, Scene } from './types';
import gameBackgroundUrl from '../images/game/background.png';
import titleImageUrl from '../images/title_chatgpt.png';

const itemImageUrls = import.meta.glob('../images/game/items/item_*.png', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

const ITEM_CARD_WIDTH = 78;
const ITEM_CARD_HEIGHT = 110;
const ITEM_CARD_COL_GAP = 78;
const ITEM_CARD_ROW_GAP = 108;

export class KnapsackThiefGame {
  private readonly app = new Application();
  private readonly world = new Container();
  private scene: Scene = 'TITLE';
  private selected = new Set<number>();
  private timeLeft = ROUND_SECONDS;
  private lastTick = performance.now();
  private hoveredItem: Item | null = null;
  private message = '';
  private messageUntil = 0;
  private currentScale = 1;
  private gameBackgroundTexture: Texture | null = null;
  private titleTexture: Texture | null = null;
  private itemTextures = new Map<number, Texture>();
  private titleSparkles: any[] = [];
  private sharpContainer: Container | null = null;
  private glowContainer: Container | null = null;

  async start(root: HTMLDivElement) {
    await this.app.init({
      width: WORLD_WIDTH,
      height: WORLD_HEIGHT,
      antialias: true,
      autoDensity: true,
      background: '#101416',
      resolution: Math.min(window.devicePixelRatio || 1, 2),
    });

    root.appendChild(this.app.canvas);
    this.app.stage.addChild(this.world);
    this.drawBackdrop();
    [this.gameBackgroundTexture, this.titleTexture] = await Promise.all([
      Assets.load<Texture>(gameBackgroundUrl),
      Assets.load<Texture>(titleImageUrl),
    ]);
    await this.loadItemTextures();

    window.addEventListener('resize', () => {
      this.resize();
      this.redrawScene();
    });

    this.app.ticker.add(() => this.tick());
    this.resize();
    this.drawTitle();
  }

  private selectedItems() {
    return items.filter((item) => this.selected.has(item.id));
  }

  private totalWeight() {
    return this.selectedItems().reduce((sum, item) => sum + item.weight, 0);
  }

  private totalValue() {
    return this.selectedItems().reduce((sum, item) => sum + item.value, 0);
  }

  private resize() {
    const scale = Math.min(window.innerWidth / WORLD_WIDTH, window.innerHeight / WORLD_HEIGHT);
    const width = Math.floor(WORLD_WIDTH * scale);
    const height = Math.floor(WORLD_HEIGHT * scale);
    const resolution = Math.min(window.devicePixelRatio || 1, 2);

    this.currentScale = scale;
    this.app.renderer.resize(width, height, resolution);
    this.app.canvas.style.width = `${width}px`;
    this.app.canvas.style.height = `${height}px`;
    this.world.scale.set(scale);
    this.world.position.set(0, 0);
  }

  private textResolution() {
    return Math.max(1, Math.min((window.devicePixelRatio || 1) * this.currentScale, 4));
  }

  private tick() {
    if (this.scene === 'TITLE') {
      this.updateTitleEffects();
      return;
    }
    if (this.scene !== 'PLAYING') return;

    const now = performance.now();
    const elapsed = (now - this.lastTick) / 1000;
    this.lastTick = now;
    this.timeLeft = Math.max(0, this.timeLeft - elapsed);

    if (this.timeLeft <= 0) {
      this.finishGame();
      return;
    }

    this.drawGame();
  }

  private redrawScene() {
    if (this.scene === 'TITLE') this.drawTitle();
    if (this.scene === 'PLAYING') this.drawGame();
    if (this.scene === 'RESULTS') this.drawResults();
  }

  private clearWorld() {
    if (this.titleSparkles && this.titleSparkles.length > 0) {
      this.titleSparkles.forEach((sp) => {
        sp.sharpGfx.destroy();
        sp.glowGfx.destroy();
      });
      this.titleSparkles = [];
    }
    this.sharpContainer = null;
    this.glowContainer = null;
    this.world.removeChildren();
  }

  private async loadItemTextures() {
    await Promise.all(
      Object.entries(itemImageUrls).map(async ([path, url]) => {
        const match = path.match(/item_(\d+)\.png$/);
        if (!match) return;

        const texture = await Assets.load<Texture>(url);
        this.itemTextures.set(Number(match[1]), texture);
      }),
    );
  }

  private drawItemImage(parent: Container, item: Item, x: number, y: number, width: number, height: number) {
    const texture = this.itemTextures.get(item.id);
    if (!texture) {
      drawIcon(parent, item, x, y, 0.82);
      return;
    }

    const image = new Sprite(texture);
    image.anchor.set(0.5);
    image.position.set(x, y);
    image.width = width;
    image.height = height;
    parent.addChild(image);
  }

  private addText(text: string, x: number, y: number, size: number, color = 0xffffff, weight: 'normal' | 'bold' = 'normal') {
    const label = new Text({
      text,
      resolution: this.textResolution(),
      style: {
        fontFamily: 'Inter, Segoe UI, Arial, sans-serif',
        fontSize: size,
        fontWeight: weight,
        fill: color,
        align: 'center',
      },
    });
    label.anchor.set(0.5);
    label.position.set(x, y);
    this.world.addChild(label);
    return label;
  }

  private makeButton(label: string, x: number, y: number, width: number, height: number, onClick: () => void, color = 0xbd2f35) {
    const button = new Container();
    button.position.set(x, y);
    button.eventMode = 'static';
    button.cursor = 'pointer';
    button.hitArea = new Rectangle(-width / 2, -height / 2, width, height);

    const bg = new Graphics();
    const draw = (fill: number) => {
      bg.clear();
      bg.roundRect(-width / 2, -height / 2, width, height, 7).fill(fill);
      bg.roundRect(-width / 2, -height / 2, width, height, 7).stroke({ color: 0xffd1ba, width: 2, alpha: 0.32 });
    };
    draw(color);
    button.addChild(bg);

    const text = new Text({
      text: label,
      resolution: this.textResolution(),
      style: { fontFamily: 'Inter, Segoe UI, Arial, sans-serif', fontSize: 22, fontWeight: 'bold', fill: 0xffffff },
    });
    text.anchor.set(0.5);
    button.addChild(text);

    button.on('pointerover', () => draw(0xd9433d));
    button.on('pointerout', () => draw(color));
    button.on('pointerdown', onClick);
    this.world.addChild(button);
  }

  private drawBackdrop() {
    const bg = new Graphics();
    bg.rect(0, 0, WORLD_WIDTH, WORLD_HEIGHT).fill(0x111719);
    bg.rect(0, 0, WORLD_WIDTH, 88).fill(0x1e2d2d);
    bg.rect(0, 520, WORLD_WIDTH, 80).fill(0x151b1d);
    this.world.addChild(bg);
  }

  private drawTitle() {
    this.scene = 'TITLE';
    this.clearWorld();
    if (!this.titleTexture) {
      this.drawBackdrop();
      return;
    }

    const title = new Sprite(this.titleTexture);
    title.width = WORLD_WIDTH;
    title.height = WORLD_HEIGHT;
    this.world.addChild(title);

    this.initTitleEffects();

    const button = new Container();
    button.position.set(400, 509);
    button.eventMode = 'static';
    button.cursor = 'pointer';
    button.hitArea = new Rectangle(-158, -46, 316, 92);

    button.on('pointerdown', () => this.startGame());
    this.world.addChild(button);
  }

  private drawGame() {
    this.clearWorld();
    if (this.gameBackgroundTexture) {
      const background = new Sprite(this.gameBackgroundTexture);
      background.width = WORLD_WIDTH;
      background.height = WORLD_HEIGHT;
      this.world.addChild(background);
    } else {
      this.drawBackdrop();
    }

    this.addText('宝物庫', 273, 68, 30, 0xffd56b, 'bold');
    this.addText(`残り ${Math.ceil(this.timeLeft)}秒`, 650, 70, 32, this.timeLeft <= 10 ? 0xff746b : 0xffd56b, 'bold');

    items.forEach((item, index) => this.drawItemCard(item, index));
    this.drawStatusPanel();

    if (this.message && performance.now() < this.messageUntil) {
      const toast = new Graphics();
      toast.roundRect(250, 512, 300, 38, 7).fill({ color: 0x681f28, alpha: 0.94 });
      this.world.addChild(toast);
      this.addText(this.message, 400, 531, 17, 0xffffff, 'bold');
    }
  }

  private drawItemCard(item: Item, index: number) {
    const col = index % 5;
    const row = Math.floor(index / 5);
    const active = this.selected.has(item.id);
    const hover = this.hoveredItem?.id === item.id;
    const card = new Container();

    card.position.set(75 + col * ITEM_CARD_COL_GAP, 153 + row * ITEM_CARD_ROW_GAP);
    card.eventMode = 'static';
    card.cursor = 'pointer';
    card.hitArea = new Rectangle(-ITEM_CARD_WIDTH / 2, -ITEM_CARD_HEIGHT / 2, ITEM_CARD_WIDTH, ITEM_CARD_HEIGHT);

    this.drawItemImage(card, item, 0, 0, ITEM_CARD_WIDTH, ITEM_CARD_HEIGHT);

    if (hover || active) {
      const outline = new Graphics();
      outline
        .roundRect(-ITEM_CARD_WIDTH / 2, -ITEM_CARD_HEIGHT / 2, ITEM_CARD_WIDTH, ITEM_CARD_HEIGHT, 3)
        .stroke({ color: hover ? 0xffe08a : 0x67d19b, width: hover ? 3 : 2 });
      card.addChild(outline);
    }

    if (active) {
      const check = new Graphics();
      const checkX = ITEM_CARD_WIDTH / 2 - 8;
      const checkY = -ITEM_CARD_HEIGHT / 2 + 8;
      check.circle(checkX, checkY, 9).fill(0x67d19b);
      check
        .moveTo(checkX - 5, checkY)
        .lineTo(checkX - 1, checkY + 4)
        .lineTo(checkX + 6, checkY - 5)
        .stroke({ color: 0x102015, width: 2.5 });
      card.addChild(check);
    }

    card.on('pointerover', () => {
      this.hoveredItem = item;
      this.drawGame();
    });
    card.on('pointerout', () => {
      this.hoveredItem = null;
      this.drawGame();
    });
    card.on('pointerdown', () => this.toggleItem(item));
    this.world.addChild(card);
  }

  private drawStatusPanel() {
    const panel = new Graphics();
    panel.roundRect(542, 104, 226, 388, 6).fill(0x20282a);
    panel.roundRect(542, 104, 226, 388, 6).stroke({ color: 0x486065, width: 2 });
    this.world.addChild(panel);

    this.addText('バッグ', 655, 132, 26, 0xffd56b, 'bold');
    drawBag(this.world, 655, 218, 1.35);

    const weight = this.totalWeight();
    const value = this.totalValue();
    this.addText(`${weight.toFixed(1)} kg / ${CAPACITY.toFixed(1)} kg`, 655, 304, 20, weight > 47 ? 0xffd56b : 0xd7e4df, 'bold');
    this.drawGauge(570, 326, 170, 18, weight / CAPACITY);
    this.addText(money.format(value), 655, 377, 34, 0x82e2a5, 'bold');

    const info = this.hoveredItem
      ? `${this.hoveredItem.name}\n${this.hoveredItem.weight.toFixed(1)} kg  ${money.format(this.hoveredItem.value)}`
      : this.selected.size > 0
        ? `${this.selected.size}個の宝を収納中`
        : '宝にカーソルを合わせてください';

    const hint = new Text({
      text: info,
      resolution: this.textResolution(),
      style: { fontFamily: 'Inter, Segoe UI, Arial, sans-serif', fontSize: 16, fill: 0xc9d8d4, align: 'center', lineHeight: 22 },
    });
    hint.anchor.set(0.5);
    hint.position.set(655, 421);
    this.world.addChild(hint);

    this.makeButton('脱出する', 655, 465, 150, 44, () => this.finishGame(), 0xb93431);
  }

  private drawGauge(x: number, y: number, width: number, height: number, ratio: number) {
    const gauge = new Graphics();
    const clamped = Math.min(1, Math.max(0, ratio));
    gauge.roundRect(x, y, width, height, 6).fill(0x111719);
    gauge.roundRect(x, y, width * clamped, height, 6).fill(ratio > 0.9 ? 0xe0b849 : 0x64c58f);
    gauge.roundRect(x, y, width, height, 6).stroke({ color: 0x526469, width: 2 });
    this.world.addChild(gauge);
  }

  private toggleItem(item: Item) {
    if (this.selected.has(item.id)) {
      this.selected.delete(item.id);
      this.drawGame();
      return;
    }

    if (this.totalWeight() + item.weight > CAPACITY) {
      this.message = 'バッグの容量を超えています！';
      this.messageUntil = performance.now() + 1200;
      this.drawGame();
      return;
    }

    this.selected.add(item.id);
    this.drawGame();
  }

  private startGame() {
    this.selected = new Set<number>();
    this.timeLeft = ROUND_SECONDS;
    this.lastTick = performance.now();
    this.hoveredItem = null;
    this.message = '';
    this.scene = 'PLAYING';
    this.drawGame();
  }

  private finishGame() {
    this.scene = 'RESULTS';
    this.drawResults();
  }

  private drawResults() {
    this.clearWorld();
    this.drawBackdrop();

    const value = this.totalValue();
    const weight = this.totalWeight();
    const rank = rankFor(value);

    this.addText('脱出成功', 400, 80, 44, 0xffd56b, 'bold');
    this.addText(rank.grade, 400, 165, 82, rank.grade === 'S' ? 0xffde68 : 0x82e2a5, 'bold');
    this.addText(rank.label, 400, 220, 24, 0xd7e4df);
    this.addText(`スコア ${money.format(value)}`, 400, 275, 34, 0x82e2a5, 'bold');
    this.addText(`重量 ${weight.toFixed(1)} kg / ${CAPACITY.toFixed(1)} kg`, 400, 314, 22, 0xd7e4df);

    const loot = this.selectedItems();
    const list = loot.length ? loot.map((item) => `${item.name}  ${money.format(item.value)}`).join('\n') : '盗み出した宝はありません';
    const lootText = new Text({
      text: list,
      resolution: this.textResolution(),
      style: { fontFamily: 'Inter, Segoe UI, Arial, sans-serif', fontSize: 17, fill: 0xd7e4df, align: 'center', lineHeight: 24 },
    });
    lootText.anchor.set(0.5, 0);
    lootText.position.set(400, 345);
    this.world.addChild(lootText);

    this.makeButton('タイトルへ戻る', 400, 535, 210, 50, () => this.drawTitle(), 0x365d62);
  }

  private drawTreasurePile(x: number, y: number, scale: number) {
    const pile = new Container();
    pile.position.set(x, y);
    pile.scale.set(scale);
    this.world.addChild(pile);

    [items[2], items[5], items[10], items[13], items[14]].forEach((item, index) => {
      const icon = new Container();
      icon.position.set((index - 2) * 45, Math.abs(index - 2) * 12);
      this.drawItemImage(icon, item, 0, 0, 36, 51);
      pile.addChild(icon);
    });
  }

  private initTitleEffects() {
    this.titleSparkles = [];

    this.glowContainer = new Container();
    const blur = new BlurFilter({ strength: 5, quality: 3 });
    this.glowContainer.filters = [blur];
    this.glowContainer.blendMode = 'add';
    this.world.addChild(this.glowContainer);

    this.sharpContainer = new Container();
    this.world.addChild(this.sharpContainer);

    for (let i = 0; i < 12; i += 1) {
      this.spawnTitleSparkle(true);
    }
  }

  private spawnTitleSparkle(randomizeAge = false) {
    // Treasures are in the bottom-right: roughly X: 540 to 760, Y: 400 to 560
    const x = 540 + Math.random() * 210;
    const y = 400 + Math.random() * 140;

    const sharpGfx = new Graphics();
    const glowGfx = new Graphics();

    const type = Math.floor(Math.random() * 2);
    const color = [0xffffff, 0xffd56b, 0xffea85, 0xfff3cc][Math.floor(Math.random() * 4)];

    if (type === 0) {
      // 4-pointed star
      sharpGfx.star(0, 0, 4, 8, 2).fill(color);
      glowGfx.star(0, 0, 4, 10, 3).fill(color);
    } else {
      // Soft circle
      sharpGfx.circle(0, 0, 3.5).fill(color);
      glowGfx.circle(0, 0, 5.5).fill(color);
    }

    sharpGfx.position.set(x, y);
    glowGfx.position.set(x, y);

    sharpGfx.alpha = 0;
    glowGfx.alpha = 0;

    const scale = 0.35 + Math.random() * 0.45;
    sharpGfx.scale.set(scale);
    glowGfx.scale.set(scale);

    this.sharpContainer?.addChild(sharpGfx);
    this.glowContainer?.addChild(glowGfx);

    const maxLife = 60 + Math.random() * 80;
    const currentLife = randomizeAge ? Math.floor(Math.random() * maxLife) : 0;

    const vx = (Math.random() - 0.5) * 0.15;
    const vy = (Math.random() - 0.5) * 0.15 - 0.08; // float upwards slower

    this.titleSparkles.push({
      sharpGfx,
      glowGfx,
      x,
      y,
      vx,
      vy,
      scale,
      life: currentLife,
      maxLife,
      rotSpeed: (Math.random() - 0.5) * 0.03,
    });
  }

  private updateTitleEffects() {
    if (!this.sharpContainer || !this.glowContainer) return;

    for (let i = this.titleSparkles.length - 1; i >= 0; i -= 1) {
      const sp = this.titleSparkles[i];
      sp.life += 1;

      if (sp.life >= sp.maxLife) {
        this.sharpContainer.removeChild(sp.sharpGfx);
        this.glowContainer.removeChild(sp.glowGfx);
        sp.sharpGfx.destroy();
        sp.glowGfx.destroy();
        this.titleSparkles.splice(i, 1);
        this.spawnTitleSparkle(false);
        continue;
      }

      sp.x += sp.vx;
      sp.y += sp.vy;
      sp.sharpGfx.position.set(sp.x, sp.y);
      sp.glowGfx.position.set(sp.x, sp.y);

      sp.sharpGfx.rotation += sp.rotSpeed;
      sp.glowGfx.rotation += sp.rotSpeed;

      const progress = sp.life / sp.maxLife;
      let alpha = 0;
      if (progress < 0.2) {
        alpha = progress / 0.2;
      } else if (progress > 0.8) {
        alpha = (1.0 - progress) / 0.2;
      } else {
        alpha = 1.0;
      }

      const shimmer = 0.9 + Math.random() * 0.1;
      sp.sharpGfx.alpha = alpha * 0.5 * shimmer;
      sp.glowGfx.alpha = alpha * 0.2 * shimmer;

      const currentScale = sp.scale * (0.8 + Math.sin(progress * Math.PI) * 0.3);
      sp.sharpGfx.scale.set(currentScale);
      sp.glowGfx.scale.set(currentScale * 1.2);
    }
  }
}
