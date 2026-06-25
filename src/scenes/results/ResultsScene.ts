import { Container, Rectangle, Text } from 'pixi.js';
import { CAPACITY, WORLD_HEIGHT, WORLD_WIDTH, items, money } from '../../constants';
import { drawBackdrop } from '../../utils/backdrop';
import { makeButton } from '../../utils/button';
import { addText, type TextResolutionProvider } from '../../utils/text';

type ResultsSceneOptions = {
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
  private readonly selected: Set<number>;
  private readonly textResolution: TextResolutionProvider;
  private readonly onBackToTitle: () => void;

  constructor({ selected, textResolution, onBackToTitle }: ResultsSceneOptions) {
    super({
      label: 'results-scene',
      boundsArea: new Rectangle(0, 0, WORLD_WIDTH, WORLD_HEIGHT),
    });

    this.selected = selected;
    this.textResolution = textResolution;
    this.onBackToTitle = onBackToTitle;
    this.draw();
  }

  private draw() {
    drawBackdrop(this);

    const value = this.totalValue();
    const weight = this.totalWeight();
    const rank = rankFor(value);

    addText(this, '脱出成功', 400, 80, 44, 0xffd56b, 'bold', this.textResolution);
    addText(this, rank.grade, 400, 165, 82, rank.grade === 'S' ? 0xffde68 : 0x82e2a5, 'bold', this.textResolution);
    addText(this, rank.label, 400, 220, 24, 0xd7e4df, 'normal', this.textResolution);
    addText(this, `スコア ${money.format(value)}`, 400, 275, 34, 0x82e2a5, 'bold', this.textResolution);
    addText(this, `重量 ${weight.toFixed(1)} kg / ${CAPACITY.toFixed(1)} kg`, 400, 314, 22, 0xd7e4df, 'normal', this.textResolution);
    this.drawLootList();
    makeButton(this, 'タイトルへ戻る', 400, 535, 210, 50, this.onBackToTitle, this.textResolution, 0x365d62);
  }

  private drawLootList() {
    const loot = this.selectedItems();
    const list = loot.length ? loot.map((item) => `${item.name}  ${money.format(item.value)}`).join('\n') : '盗み出した宝はありません';
    const lootText = new Text({
      text: list,
      resolution: this.textResolution(),
      style: { fontFamily: 'Inter, Segoe UI, Arial, sans-serif', fontSize: 17, fill: 0xd7e4df, align: 'center', lineHeight: 24 },
    });
    lootText.anchor.set(0.5, 0);
    lootText.position.set(400, 345);
    this.addChild(lootText);
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
