import { Container, Graphics, Rectangle, Sprite, Text, Texture } from 'pixi.js';
import { CAPACITY, ROUND_SECONDS, WORLD_HEIGHT, WORLD_WIDTH, items, money } from '../../constants';
import { drawBackdrop } from '../../utils/backdrop';
import type { Item } from '../../types';
import { addText, type TextResolutionProvider } from '../../utils/text';
import { drawGauge } from './drawGauge';
import { drawItemImage } from './drawItemImage';

const ITEM_CARD_WIDTH = 78;
const ITEM_CARD_HEIGHT = 110;
const ITEM_CARD_COL_GAP = 78;
const ITEM_CARD_ROW_GAP = 108;
const STATUS_PANEL_FRAME = new Rectangle(220, 40, 1000, 1010);
const STATUS_PANEL_X = 500;
const STATUS_PANEL_Y = 64;
const STATUS_PANEL_WIDTH = 286;
const STATUS_PANEL_SCALE = STATUS_PANEL_WIDTH / STATUS_PANEL_FRAME.width;
const STATUS_CENTER_X = STATUS_PANEL_X + STATUS_PANEL_WIDTH / 2;
const KNAPSACK_STATUS_WIDTH = 400;
const RUN_AWAY_BUTTON_WIDTH = 220;

type GameLayers = {
  staticLayer: Container;
  itemLayer: Container;
  statusLayer: Container;
  overlayLayer: Container;
};

type PlaySceneOptions = {
  backgroundTexture: Texture;
  knapsackTexture: Texture;
  runAwayTexture: Texture;
  uiPanelStackTexture: Texture;
  itemTextures: Map<number, Texture>;
  textResolution: TextResolutionProvider;
  onFinish: (selected: Set<number>) => void;
};

export class PlayScene extends Container {
  private readonly backgroundTexture: Texture;
  private readonly knapsackTexture: Texture;
  private readonly runAwayTexture: Texture;
  private readonly uiPanelStackTexture: Texture;
  private readonly itemTextures: Map<number, Texture>;
  private readonly textResolution: TextResolutionProvider;
  private readonly onFinish: (selected: Set<number>) => void;
  private readonly layers: GameLayers;
  private selected = new Set<number>();
  private timeLeft = ROUND_SECONDS;
  private lastTick = performance.now();
  private hoveredItem: Item | null = null;
  private message = '';
  private messageUntil = 0;
  private timerText: Text | null = null;

  constructor({ backgroundTexture, knapsackTexture, runAwayTexture, uiPanelStackTexture, itemTextures, textResolution, onFinish }: PlaySceneOptions) {
    super({
      label: 'play-scene',
      boundsArea: new Rectangle(0, 0, WORLD_WIDTH, WORLD_HEIGHT),
    });

    this.backgroundTexture = backgroundTexture;
    this.knapsackTexture = knapsackTexture;
    this.runAwayTexture = runAwayTexture;
    this.uiPanelStackTexture = uiPanelStackTexture;
    this.itemTextures = itemTextures;
    this.textResolution = textResolution;
    this.onFinish = onFinish;
    this.layers = this.createLayers();
    this.addChild(this.layers.staticLayer, this.layers.itemLayer, this.layers.statusLayer, this.layers.overlayLayer);
    this.drawScene();
  }

  update(now = performance.now()) {
    const elapsed = (now - this.lastTick) / 1000;
    this.lastTick = now;
    this.timeLeft = Math.max(0, this.timeLeft - elapsed);

    if (this.timeLeft <= 0) {
      this.finish();
      return;
    }

    this.updateTimer();
    this.clearExpiredToast(now);
  }

  private createLayers(): GameLayers {
    return {
      staticLayer: this.createLayer('play-static-layer'),
      itemLayer: this.createLayer('play-item-layer'),
      statusLayer: this.createLayer('play-status-layer'),
      overlayLayer: this.createLayer('play-overlay-layer'),
    };
  }

  private createLayer(label: string) {
    return new Container({
      label,
      boundsArea: new Rectangle(0, 0, WORLD_WIDTH, WORLD_HEIGHT),
    });
  }

  private drawScene() {
    this.drawBackground();
    this.drawItemGrid();
    this.redrawStatusPanel();
    this.redrawOverlayLayer();
  }

  private drawBackground() {
    if (this.backgroundTexture) {
      const background = new Sprite(this.backgroundTexture);
      background.width = WORLD_WIDTH;
      background.height = WORLD_HEIGHT;
      this.layers.staticLayer.addChild(background);
      return;
    }

    drawBackdrop(this.layers.staticLayer);
  }

  private updateTimer() {
    if (!this.timerText) return;

    const text = this.timerLabel();
    if (this.timerText.text !== text) {
      this.timerText.text = text;
    }
    this.timerText.style.fill = this.timerColor();
  }

  private timerLabel() {
    return `残り ${Math.ceil(this.timeLeft)}秒`;
  }

  private timerColor() {
    return this.timeLeft <= 10 ? 0xff746b : 0xffd56b;
  }

  private drawItemGrid() {
    this.layers.itemLayer.removeChildren();
    items.forEach((item, index) => this.drawItemCard(item, index));
  }

  private drawItemCard(item: Item, index: number) {
    const { x, y } = this.itemCardPosition(index);
    const active = this.selected.has(item.id);
    const card = new Container({ label: `item-card-${item.id}` });

    card.position.set(x, y);
    card.eventMode = 'static';
    card.cursor = 'pointer';
    card.hitArea = new Rectangle(-ITEM_CARD_WIDTH / 2, -ITEM_CARD_HEIGHT / 2, ITEM_CARD_WIDTH, ITEM_CARD_HEIGHT);
    drawItemImage(card, item, this.itemTextures, 0, 0, ITEM_CARD_WIDTH, ITEM_CARD_HEIGHT);

    if (active) {
      card.addChild(this.createItemActiveOutline(), this.createItemCheckMark());
    }

    card.on('pointerover', () => this.setHoveredItem(item));
    card.on('pointerout', () => this.setHoveredItem(null));
    card.on('pointerdown', () => this.toggleItem(item));
    this.layers.itemLayer.addChild(card);
  }

  private itemCardPosition(index: number) {
    const col = index % 5;
    const row = Math.floor(index / 5);

    return {
      x: 75 + col * ITEM_CARD_COL_GAP,
      y: 153 + row * ITEM_CARD_ROW_GAP,
    };
  }

  private createItemActiveOutline() {
    return new Graphics({ label: 'item-active-outline' })
      .roundRect(-ITEM_CARD_WIDTH / 2, -ITEM_CARD_HEIGHT / 2, ITEM_CARD_WIDTH, ITEM_CARD_HEIGHT, 3)
      .stroke({ color: 0x67d19b, width: 2 });
  }

  private createItemCheckMark() {
    const check = new Graphics({ label: 'item-check-mark' });
    const checkX = ITEM_CARD_WIDTH / 2 - 8;
    const checkY = -ITEM_CARD_HEIGHT / 2 + 8;

    check.circle(checkX, checkY, 9).fill(0x67d19b);
    check
      .moveTo(checkX - 5, checkY)
      .lineTo(checkX - 1, checkY + 4)
      .lineTo(checkX + 6, checkY - 5)
      .stroke({ color: 0x102015, width: 2.5 });

    return check;
  }

  private setHoveredItem(item: Item | null) {
    this.hoveredItem = item;
    this.redrawStatusPanel();
    this.redrawOverlayLayer();
  }

  private redrawStatusPanel() {
    this.layers.statusLayer.removeChildren();
    this.drawStatusPanel();
  }

  private drawStatusPanel() {
    const panelTexture = new Texture({
      source: this.uiPanelStackTexture.source,
      frame: STATUS_PANEL_FRAME,
    });
    const panel = new Sprite(panelTexture);
    panel.position.set(STATUS_PANEL_X, STATUS_PANEL_Y);
    panel.scale.set(STATUS_PANEL_SCALE);
    this.layers.statusLayer.addChild(panel);

    this.timerText = addText(
      this.layers.statusLayer,
      this.timerLabel(),
      STATUS_CENTER_X,
      116,
      27,
      this.timerColor(),
      'bold',
      this.textResolution,
    );

    const weight = this.totalWeight();
    addText(
      this.layers.statusLayer,
      `${weight.toFixed(1)} kg / ${CAPACITY.toFixed(1)} kg`,
      STATUS_CENTER_X,
      213,
      20,
      weight > 47 ? 0xffd56b : 0xd7e4df,
      'bold',
      this.textResolution,
    );
    drawGauge(this.layers.statusLayer, 558, 235, 170, 18, weight / CAPACITY);
    addText(this.layers.statusLayer, money.format(this.totalValue()), STATUS_CENTER_X, 331, 31, 0x82e2a5, 'bold', this.textResolution);
    this.drawStatusKnapsack();
    this.drawRunAwayButton();
  }

  private drawStatusKnapsack() {
    const knapsack = new Sprite(this.knapsackTexture);
    knapsack.anchor.set(0.5);
    knapsack.position.set(STATUS_CENTER_X, 463);
    knapsack.scale.set(KNAPSACK_STATUS_WIDTH / this.knapsackTexture.width);
    this.layers.statusLayer.addChild(knapsack);
  }

  private drawRunAwayButton() {
    const button = new Container({ label: 'run-away-button' });
    const sprite = new Sprite(this.runAwayTexture);
    const scale = RUN_AWAY_BUTTON_WIDTH / this.runAwayTexture.width;
    const width = RUN_AWAY_BUTTON_WIDTH;
    const height = this.runAwayTexture.height * scale;
    const hoverGlow = new Graphics({ label: 'run-away-hover-glow' });

    button.position.set(STATUS_CENTER_X, 528);
    button.eventMode = 'static';
    button.cursor = 'pointer';
    button.hitArea = new Rectangle(-width / 2, -height / 2, width, height);
    button.on('pointerdown', () => this.finish());
    button.on('pointerover', () => {
      hoverGlow.visible = true;
    });
    button.on('pointerout', () => {
      hoverGlow.visible = false;
    });
    sprite.anchor.set(0.5);
    sprite.scale.set(scale);
    hoverGlow.rect(-width / 2 + 4, -height / 2 + 4, width - 8, height - 8).fill({ color: 0xffffff, alpha: 0.18 });
    hoverGlow.visible = false;
    button.addChild(sprite, hoverGlow);
    this.layers.statusLayer.addChild(button);
  }

  private redrawOverlayLayer() {
    this.layers.overlayLayer.removeChildren();
    this.drawToast();
    this.drawHoveredItemFrame();
  }

  private drawToast() {
    if (!this.message || performance.now() >= this.messageUntil) return;

    const toast = new Graphics({ label: 'toast' });
    toast.roundRect(250, 512, 300, 38, 7).fill({ color: 0x681f28, alpha: 0.94 });
    this.layers.overlayLayer.addChild(toast);
    addText(this.layers.overlayLayer, this.message, 400, 531, 17, 0xffffff, 'bold', this.textResolution);
  }

  private drawHoveredItemFrame() {
    if (!this.hoveredItem) return;

    const index = items.findIndex((item) => item.id === this.hoveredItem?.id);
    if (index < 0) return;

    const { x, y } = this.itemCardPosition(index);
    const frame = new Graphics({ label: 'hovered-item-frame' });
    frame
      .roundRect(x - ITEM_CARD_WIDTH / 2, y - ITEM_CARD_HEIGHT / 2, ITEM_CARD_WIDTH, ITEM_CARD_HEIGHT, 3)
      .stroke({ color: 0xffe08a, width: 3 });
    this.layers.overlayLayer.addChild(frame);
  }

  private toggleItem(item: Item) {
    if (this.selected.has(item.id)) {
      this.selected.delete(item.id);
      this.redrawSelectionState();
      return;
    }

    if (this.totalWeight() + item.weight > CAPACITY) {
      this.message = 'バッグの容量を超えています';
      this.messageUntil = performance.now() + 1200;
      this.redrawOverlayLayer();
      return;
    }

    this.selected.add(item.id);
    this.redrawSelectionState();
  }

  private redrawSelectionState() {
    this.drawItemGrid();
    this.redrawStatusPanel();
    this.redrawOverlayLayer();
  }

  private clearExpiredToast(now = performance.now()) {
    if (!this.message || now < this.messageUntil) return;

    this.message = '';
    this.redrawOverlayLayer();
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

  private finish() {
    this.onFinish(new Set(this.selected));
  }
}
