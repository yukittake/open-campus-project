import { Application, Container, Graphics, Rectangle, Text } from 'pixi.js';
import { CAPACITY, ROUND_SECONDS, WORLD_HEIGHT, WORLD_WIDTH } from './constants';
import { drawBag, drawIcon } from './drawing';
import { items } from './items';
import { money, rankFor } from './scoring';
import type { Item, Scene } from './types';

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
    this.world.removeChildren();
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
    this.drawBackdrop();
    this.addText('ナップサック・シーフ', 400, 145, 52, 0xffd56b, 'bold');
    this.addText('制限時間内に、もっとも価値の高い宝を盗み出そう。', 400, 215, 22, 0xd7e4df);
    this.addText('容量: 50.0 kg   制限時間: 60秒', 400, 252, 20, 0x9ec6bc);
    this.drawTreasurePile(400, 350, 1.35);
    this.makeButton('ゲーム開始', 400, 505, 210, 58, () => this.startGame(), 0xb93431);
  }

  private drawGame() {
    this.clearWorld();
    this.drawBackdrop();

    const shelf = new Graphics();
    shelf.roundRect(28, 102, 490, 390, 6).fill(0x2d2118);
    shelf.roundRect(44, 118, 458, 358, 4).fill(0x43301f);
    for (let i = 0; i < 3; i += 1) {
      shelf.rect(50, 202 + i * 91, 446, 10).fill(0x24180f);
    }
    this.world.addChild(shelf);

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

    card.position.set(75 + col * 88, 153 + row * 91);
    card.eventMode = 'static';
    card.cursor = 'pointer';
    card.hitArea = new Rectangle(-32, -29, 64, 58);

    const bg = new Graphics();
    bg.roundRect(-32, -29, 64, 58, 6).fill(active ? 0x264d3e : 0x1b2324);
    bg.roundRect(-32, -29, 64, 58, 6).stroke({ color: hover ? 0xffe08a : active ? 0x67d19b : 0x516064, width: hover ? 3 : 2 });
    card.addChild(bg);

    drawIcon(card, item, 0, -2, 0.82);

    if (active) {
      const check = new Graphics();
      check.circle(24, -22, 9).fill(0x67d19b);
      check.moveTo(19, -22).lineTo(23, -18).lineTo(30, -27).stroke({ color: 0x102015, width: 2.5 });
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
      drawIcon(icon, item, 0, 0, 1);
      pile.addChild(icon);
    });
  }
}
