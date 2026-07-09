import { Container, Graphics, Rectangle, Sprite, Texture } from 'pixi.js';
import { CAPACITY, WORLD_HEIGHT, WORLD_WIDTH, items, money } from '../../constants';
import { submitAndLoadRanking, type RankingEntry, type RankingResult } from '../../utils/api/ranking';
import { addText, type TextResolutionProvider } from '../../utils/text';

const RANKING_LIST_SIZE = 10;
const RANKING_ROW_GAP = 20;
const RANKING_VIEW_Y = 390;
const RANKING_VIEW_HEIGHT = 95;

type ResultsSceneOptions = {
  backgroundTexture: Texture;
  itemTextures: Map<number, Texture>;
  selected: Set<number>;
  textResolution: TextResolutionProvider;
  onBackToTitle: () => void;
};

function rankFor(score: number) {
  if (score >= 15000) return { grade: 'S', label: '伝説の怪盗' };
  if (score >= 14000) return { grade: 'A', label: '一流の盗み' };
  if (score >= 12000) return { grade: 'B', label: 'なかなかの成果' };
  if (score >= 10000) return { grade: 'C', label: 'まずまずの脱出' };
  return { grade: 'D', label: '次はもっと狙おう' };
}

export class ResultsScene extends Container {
  private readonly backgroundTexture: Texture;
  private readonly selected: Set<number>;
  private readonly textResolution: TextResolutionProvider;
  private readonly onBackToTitle: () => void;
  private readonly rankingLayer = new Container({ label: 'results-ranking-layer' });
  private rankingResult: RankingResult | null = null;
  private rankingError: string | null = null;
  private isDisposed = false;

  constructor({ backgroundTexture, selected, textResolution, onBackToTitle }: ResultsSceneOptions) {
    super({
      label: 'results-scene',
      boundsArea: new Rectangle(0, 0, WORLD_WIDTH, WORLD_HEIGHT),
    });

    this.backgroundTexture = backgroundTexture;
    this.selected = selected;
    this.textResolution = textResolution;
    this.onBackToTitle = onBackToTitle;
    this.draw();
  }

  override destroy(options?: Parameters<Container['destroy']>[0]) {
    this.isDisposed = true;
    super.destroy(options);
  }

  private draw() {
    this.drawBackground();
    this.addChild(this.rankingLayer);

    const value = this.totalValue();
    const weight = this.totalWeight();
    const rank = rankFor(value);

    addText(this, money.format(value), 307, 164, 42, 0xffd33f, 'bold', this.textResolution);
    addText(this, `${weight.toFixed(1)} kg / ${CAPACITY.toFixed(1)} kg`, 236, 272, 30, 0xfff1cf, 'bold', this.textResolution);
    addText(this, rank.grade, 585, 172, 98, rank.grade === 'S' ? 0xffd33f : 0x82e2a5, 'bold', this.textResolution);
    addText(this, rank.label, 585, 255, 24, 0xfff1cf, 'bold', this.textResolution);
    this.drawRankingPanel();
    this.drawBackButtonHitArea();
    void this.loadRanking(value, weight);
  }

  private drawBackground() {
    const background = new Sprite(this.backgroundTexture);
    background.width = WORLD_WIDTH;
    background.height = WORLD_HEIGHT;
    this.addChild(background);
  }

  private async loadRanking(score: number, totalWeight: number) {
    try {
      this.rankingResult = await submitAndLoadRanking(score, totalWeight);
      this.rankingError = null;
    } catch (error) {
      this.rankingResult = null;
      this.rankingError = error instanceof Error ? error.message : String(error);
    }

    if (!this.isDisposed) {
      this.drawRankingPanel();
    }
  }

  private drawRankingPanel() {
    this.rankingLayer.removeChildren();

    if (this.rankingError) {
      addText(this.rankingLayer, 'ランキングを取得できませんでした', 400, 422, 22, 0xffaaa0, 'bold', this.textResolution);
      return;
    }

    if (!this.rankingResult) {
      addText(this.rankingLayer, 'ランキング送信中...', 400, 422, 22, 0xfff1cf, 'bold', this.textResolution);
      return;
    }

    const { current, entries } = this.rankingResult;
    addText(this.rankingLayer, '順位', 153, 370, 16, 0xc9b48d, 'bold', this.textResolution);
    addText(this.rankingLayer, '名前', 292, 370, 16, 0xc9b48d, 'bold', this.textResolution);
    addText(this.rankingLayer, 'スコア', 470, 370, 16, 0xc9b48d, 'bold', this.textResolution);
    addText(this.rankingLayer, '重量', 623, 370, 16, 0xc9b48d, 'bold', this.textResolution);

    const visibleEntries = entries.slice(0, RANKING_LIST_SIZE);
    const viewport = new Container({ label: 'results-ranking-viewport' });
    const content = new Container({ label: 'results-ranking-scroll-content' });
    const mask = new Graphics({ label: 'results-ranking-mask' });
    const contentHeight = Math.max(0, (visibleEntries.length - 1) * RANKING_ROW_GAP + 18);
    const maxScroll = Math.max(0, contentHeight - RANKING_VIEW_HEIGHT);
    const scrollbarTrack = new Graphics({ label: 'results-ranking-scrollbar-track' });
    const scrollbarThumb = new Graphics({ label: 'results-ranking-scrollbar-thumb' });
    const scrollbarX = 708;
    const scrollbarY = RANKING_VIEW_Y - 8;
    const thumbHeight = Math.max(
      24,
      Math.min(RANKING_VIEW_HEIGHT, RANKING_VIEW_HEIGHT * (RANKING_VIEW_HEIGHT / Math.max(contentHeight, RANKING_VIEW_HEIGHT))),
    );
    const thumbTravel = RANKING_VIEW_HEIGHT - thumbHeight;

    viewport.position.set(0, RANKING_VIEW_Y);
    viewport.eventMode = 'static';
    viewport.cursor = maxScroll > 0 ? 'grab' : 'default';
    viewport.hitArea = new Rectangle(80, -8, 640, RANKING_VIEW_HEIGHT);
    mask.rect(80, RANKING_VIEW_Y - 8, 640, RANKING_VIEW_HEIGHT).fill(0xffffff);
    viewport.mask = mask;

    visibleEntries.forEach((entry, index) => {
      this.drawRankingRow(content, entry, index + 1, index * RANKING_ROW_GAP, entry.id === current.id);
    });

    scrollbarTrack.roundRect(scrollbarX, scrollbarY, 6, RANKING_VIEW_HEIGHT, 3).fill({ color: 0xc9b48d, alpha: 0.25 });
    scrollbarThumb.roundRect(0, 0, 8, thumbHeight, 4).fill({ color: 0xfff1cf, alpha: 0.9 });
    scrollbarThumb.position.set(scrollbarX - 1, scrollbarY);
    scrollbarTrack.visible = maxScroll > 0;
    scrollbarThumb.visible = maxScroll > 0;

    let dragging = false;
    let dragStartY = 0;
    let contentStartY = 0;
    const setScroll = (value: number) => {
      content.y = Math.min(0, Math.max(-maxScroll, value));
      scrollbarThumb.y = scrollbarY + (maxScroll > 0 ? (-content.y / maxScroll) * thumbTravel : 0);
    };
    viewport.on('pointerdown', (event) => {
      if (maxScroll <= 0) return;
      dragging = true;
      dragStartY = event.global.y;
      contentStartY = content.y;
      viewport.cursor = 'grabbing';
    });
    viewport.on('pointermove', (event) => {
      if (!dragging) return;
      setScroll(contentStartY + event.global.y - dragStartY);
    });
    const stopDragging = () => {
      dragging = false;
      viewport.cursor = maxScroll > 0 ? 'grab' : 'default';
    };
    viewport.on('pointerup', stopDragging);
    viewport.on('pointerupoutside', stopDragging);
    viewport.on('wheel', (event) => {
      if (maxScroll <= 0) return;
      setScroll(content.y - event.deltaY);
    });

    if (maxScroll > 0) {
      let draggingThumb = false;
      let thumbDragStartY = 0;
      let thumbStartY = 0;

      scrollbarTrack.eventMode = 'static';
      scrollbarTrack.cursor = 'pointer';
      scrollbarTrack.hitArea = new Rectangle(scrollbarX - 5, scrollbarY, 16, RANKING_VIEW_HEIGHT);
      scrollbarTrack.on('pointerdown', (event) => {
        const localY = this.rankingLayer.toLocal(event.global).y;
        const ratio = Math.min(1, Math.max(0, (localY - scrollbarY - thumbHeight / 2) / thumbTravel));
        setScroll(-ratio * maxScroll);
      });

      scrollbarThumb.eventMode = 'static';
      scrollbarThumb.cursor = 'grab';
      scrollbarThumb.hitArea = new Rectangle(-4, 0, 16, thumbHeight);
      scrollbarThumb.on('pointerdown', (event) => {
        draggingThumb = true;
        thumbDragStartY = event.global.y;
        thumbStartY = scrollbarThumb.y;
        scrollbarThumb.cursor = 'grabbing';
      });
      scrollbarThumb.on('pointermove', (event) => {
        if (!draggingThumb) return;
        const nextY = Math.min(scrollbarY + thumbTravel, Math.max(scrollbarY, thumbStartY + event.global.y - thumbDragStartY));
        setScroll(-((nextY - scrollbarY) / thumbTravel) * maxScroll);
      });
      const stopDraggingThumb = () => {
        draggingThumb = false;
        scrollbarThumb.cursor = 'grab';
      };
      scrollbarThumb.on('pointerup', stopDraggingThumb);
      scrollbarThumb.on('pointerupoutside', stopDraggingThumb);
    }

    viewport.addChild(content);
    this.rankingLayer.addChild(mask, viewport, scrollbarTrack, scrollbarThumb);
  }

  private drawRankingRow(parent: Container, entry: RankingEntry, rank: number, y: number, current: boolean) {
    const color = current ? 0xffd33f : 0xfff1cf;
    const name = entry.player_name || 'Guest';

    addText(parent, `${rank}`, 153, y, 17, color, 'bold', this.textResolution);
    addText(parent, name.length > 12 ? `${name.slice(0, 12)}...` : name, 292, y, 17, color, 'bold', this.textResolution);
    addText(parent, money.format(entry.score), 470, y, 17, color, 'bold', this.textResolution);
    addText(parent, `${Number(entry.total_weight).toFixed(1)} kg`, 623, y, 17, color, 'bold', this.textResolution);
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
