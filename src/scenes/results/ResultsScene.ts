import { Container, Graphics, Rectangle, Sprite, Texture } from 'pixi.js';
import { CAPACITY, WORLD_HEIGHT, WORLD_WIDTH, items, money } from '../../constants';
import { addText, type TextResolutionProvider } from '../../utils/text';

const LOOT_VIEW_X = 88;
const LOOT_VIEW_Y = 360;
const LOOT_VIEW_WIDTH = 604;
const LOOT_VIEW_HEIGHT = 118;
const LOOT_ITEM_SIZE = 92;
const LOOT_ITEM_GAP = 9;

type ResultsSceneOptions = {
  backgroundTexture: Texture;
  itemTextures: Map<number, Texture>;
  selected: Set<number>;
  textResolution: TextResolutionProvider;
  onBackToTitle: () => void;
};

function selectRandomLabel(labels: string[]): string {
  return labels[Math.floor(Math.random() * labels.length)];
}

function rankFor(score: number) {
  if (score === 15800) return { grade: 'SS', label: selectRandomLabel(['作者\n『想定してません。』', '開発者\n「もうやめてください。」']) };
  if (score >= 15001) return { grade: 'S', label: selectRandomLabel(['警備員\n「退職届、書いてきます…。」', 'インターポールが\n本気を出します。']) }
  if (score >= 14000) return { grade: 'A', label: selectRandomLabel(['警備員\n「あと少しでクビだった…。」', '100%クリア目前。']) };
  if (score >= 12000) return { grade: 'B', label: selectRandomLabel(['警備員\n「ギリ始末書で済みそうです。」', '欲より理性が\n勝ちました。']) };
  if (score >= 10000) return { grade: 'C', label: selectRandomLabel(['警備員\n「まだ本気じゃないですよね？」', '盗みに来て\n赤字は新しい。']) };
  if (score === 0) return { grade: '-', label: selectRandomLabel(['警備員\n「今日も平和でした。」', '下見ですか？'])}
  return { grade: 'D', label: selectRandomLabel(['帰り道で\nコンビニ寄って帰ろう。', '盗みに来たのにお土産しか\n持って帰ってない。']) };
}

export class ResultsScene extends Container {
  private readonly backgroundTexture: Texture;
  private readonly itemTextures: Map<number, Texture>;
  private readonly selected: Set<number>;
  private readonly textResolution: TextResolutionProvider;
  private readonly onBackToTitle: () => void;

  constructor({ backgroundTexture, itemTextures, selected, textResolution, onBackToTitle }: ResultsSceneOptions) {
    super({
      label: 'results-scene',
      boundsArea: new Rectangle(0, 0, WORLD_WIDTH, WORLD_HEIGHT),
    });

    this.backgroundTexture = backgroundTexture;
    this.itemTextures = itemTextures;
    this.selected = selected;
    this.textResolution = textResolution;
    this.onBackToTitle = onBackToTitle;
    this.draw();
  }

  private draw() {
    this.drawBackground();

    const value = this.totalValue();
    const weight = this.totalWeight();
    const rank = rankFor(value);

    addText(this, money.format(value), 307, 164, 42, 0xffd33f, 'bold', this.textResolution);
    addText(this, `${weight.toFixed(1)} kg / ${CAPACITY.toFixed(1)} kg`, 236, 272, 30, 0xfff1cf, 'bold', this.textResolution);
    addText(this, rank.grade, 585, 172, 98, (rank.grade === 'S' || rank.grade === 'SS') ? 0xffd33f : 0x82e2a5, 'bold', this.textResolution);
    addText(this, rank.label, 585, 255, 24, 0xfff1cf, 'bold', this.textResolution);
    this.drawLootStrip();
    this.drawBackButtonHitArea();
  }

  private drawBackground() {
    const background = new Sprite(this.backgroundTexture);
    background.width = WORLD_WIDTH;
    background.height = WORLD_HEIGHT;
    this.addChild(background);
  }

  private drawLootStrip() {
    const loot = this.selectedItems();
    if (!loot.length) {
      addText(this, '盗み出したお宝はありません', 400, 410, 24, 0xfff1cf, 'bold', this.textResolution);
      return;
    }

    const viewport = new Container({ label: 'results-loot-viewport' });
    const content = new Container({ label: 'results-loot-scroll-content' });
    const mask = new Graphics({ label: 'results-loot-mask' });
    const contentWidth = loot.length * LOOT_ITEM_SIZE + (loot.length - 1) * LOOT_ITEM_GAP;
    const maxScroll = Math.max(0, contentWidth - LOOT_VIEW_WIDTH);

    viewport.position.set(LOOT_VIEW_X, LOOT_VIEW_Y);
    viewport.eventMode = 'static';
    viewport.cursor = maxScroll > 0 ? 'grab' : 'default';
    viewport.hitArea = new Rectangle(0, 0, LOOT_VIEW_WIDTH, LOOT_VIEW_HEIGHT);
    mask.rect(LOOT_VIEW_X, LOOT_VIEW_Y, LOOT_VIEW_WIDTH, LOOT_VIEW_HEIGHT).fill(0xffffff);
    viewport.mask = mask;

    loot.forEach((item, index) => {
      const texture = this.itemTextures.get(item.id);
      if (!texture) return;

      const image = new Sprite(texture);
      const scale = Math.min(LOOT_ITEM_SIZE / texture.width, LOOT_ITEM_SIZE / texture.height);
      image.anchor.set(0.5);
      image.position.set(index * (LOOT_ITEM_SIZE + LOOT_ITEM_GAP) + LOOT_ITEM_SIZE / 2, LOOT_VIEW_HEIGHT / 2);
      image.scale.set(scale);
      content.addChild(image);
    });

    let dragging = false;
    let dragStartX = 0;
    let contentStartX = 0;
    const clamp = (value: number) => Math.min(0, Math.max(-maxScroll, value));
    const setScroll = (value: number) => {
      content.x = clamp(value);
    };

    viewport.on('pointerdown', (event) => {
      if (maxScroll <= 0) return;
      dragging = true;
      dragStartX = event.global.x;
      contentStartX = content.x;
      viewport.cursor = 'grabbing';
    });
    viewport.on('pointermove', (event) => {
      if (!dragging) return;
      setScroll(contentStartX + event.global.x - dragStartX);
    });
    const stopDragging = () => {
      dragging = false;
      viewport.cursor = maxScroll > 0 ? 'grab' : 'default';
    };
    viewport.on('pointerup', stopDragging);
    viewport.on('pointerupoutside', stopDragging);
    viewport.on('wheel', (event) => {
      if (maxScroll <= 0) return;
      setScroll(content.x - event.deltaY - event.deltaX);
    });

    viewport.addChild(content);
    this.addChild(mask, viewport);
  }

  private drawBackButtonHitArea() {
    const button = new Container({ label: 'results-back-button' });
    const width = 300;
    const height = 72;
    const hoverGlow = new Graphics({ label: 'results-back-hover-glow' });

    button.position.set(400, 546);
    button.eventMode = 'static';
    button.cursor = 'pointer';
    button.hitArea = new Rectangle(-width / 2, -height / 2, width, height);
    button.on('pointerdown', this.onBackToTitle);
    button.on('pointerover', () => {
      hoverGlow.visible = true;
    });
    button.on('pointerout', () => {
      hoverGlow.visible = false;
    });

    hoverGlow.roundRect(-width / 2, -height / 2, width, height, 8).fill({ color: 0xffffff, alpha: 0.13 });
    hoverGlow.visible = false;
    button.addChild(hoverGlow);
    this.addChild(button);
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
}
