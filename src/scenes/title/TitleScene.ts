import { BlurFilter, Container, Graphics, Rectangle, Sprite, Texture } from 'pixi.js';
import { WORLD_HEIGHT, WORLD_WIDTH } from '../../constants';
import { drawBackdrop } from '../../utils/backdrop';

const SPARKLE_COUNT = 12;
const SPARKLE_AREA = new Rectangle(520, 380, 260, 190);

type TitleSparkle = {
  sharpGfx: Graphics;
  glowGfx: Graphics;
  x: number;
  y: number;
  vx: number;
  vy: number;
  scale: number;
  life: number;
  maxLife: number;
  rotSpeed: number;
};

type TitleSceneOptions = {
  titleTexture: Texture;
  onStart: () => void;
};

export class TitleScene extends Container {
  private readonly sparkles: TitleSparkle[] = [];
  private readonly glowLayer = new Container({
    label: 'title-sparkle-glow-layer',
    boundsArea: SPARKLE_AREA,
  });
  private readonly sharpLayer = new Container({
    label: 'title-sparkle-sharp-layer',
    boundsArea: SPARKLE_AREA,
  });

  constructor({ titleTexture, onStart }: TitleSceneOptions) {
    super({
      label: 'title-scene',
      boundsArea: new Rectangle(0, 0, WORLD_WIDTH, WORLD_HEIGHT),
    });

    this.drawBackground(titleTexture);
    this.initSparkles();
    this.addStartButton(onStart);
  }

  update() {
    for (let i = this.sparkles.length - 1; i >= 0; i -= 1) {
      const sparkle = this.sparkles[i];
      sparkle.life += 1;

      if (sparkle.life >= sparkle.maxLife) {
        this.removeSparkle(i);
        this.spawnSparkle(false);
        continue;
      }

      this.updateSparkle(sparkle);
    }
  }

  private drawBackground(titleTexture: Texture) {
    if (!titleTexture) {
      drawBackdrop(this);
      return;
    }

    const title = new Sprite(titleTexture);
    title.width = WORLD_WIDTH;
    title.height = WORLD_HEIGHT;
    this.addChild(title);
  }

  private addStartButton(onStart: () => void) {
    const button = new Container({ label: 'title-start-button' });
    button.position.set(400, 509);
    button.eventMode = 'static';
    button.cursor = 'pointer';
    button.hitArea = new Rectangle(-158, -46, 316, 92);
    button.on('pointerdown', onStart);
    this.addChild(button);
  }

  private initSparkles() {
    const blur = new BlurFilter({ strength: 5, quality: 3 });
    this.glowLayer.filterArea = SPARKLE_AREA;
    this.glowLayer.filters = [blur];
    this.glowLayer.blendMode = 'add';
    this.addChild(this.glowLayer, this.sharpLayer);

    for (let i = 0; i < SPARKLE_COUNT; i += 1) {
      this.spawnSparkle(true);
    }
  }

  private spawnSparkle(randomizeAge = false) {
    const x = 540 + Math.random() * 210;
    const y = 400 + Math.random() * 140;
    const sharpGfx = new Graphics({ label: 'title-sparkle-sharp' });
    const glowGfx = new Graphics({ label: 'title-sparkle-glow' });
    const type = Math.floor(Math.random() * 2);
    const color = [0xffffff, 0xffd56b, 0xffea85, 0xfff3cc][Math.floor(Math.random() * 4)];

    if (type === 0) {
      sharpGfx.star(0, 0, 4, 8, 2).fill(color);
      glowGfx.star(0, 0, 4, 10, 3).fill(color);
    } else {
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
    this.sharpLayer.addChild(sharpGfx);
    this.glowLayer.addChild(glowGfx);

    const maxLife = 60 + Math.random() * 80;
    this.sparkles.push({
      sharpGfx,
      glowGfx,
      x,
      y,
      vx: (Math.random() - 0.5) * 0.15,
      vy: (Math.random() - 0.5) * 0.15 - 0.08,
      scale,
      life: randomizeAge ? Math.floor(Math.random() * maxLife) : 0,
      maxLife,
      rotSpeed: (Math.random() - 0.5) * 0.03,
    });
  }

  private updateSparkle(sparkle: TitleSparkle) {
    sparkle.x += sparkle.vx;
    sparkle.y += sparkle.vy;
    sparkle.sharpGfx.position.set(sparkle.x, sparkle.y);
    sparkle.glowGfx.position.set(sparkle.x, sparkle.y);
    sparkle.sharpGfx.rotation += sparkle.rotSpeed;
    sparkle.glowGfx.rotation += sparkle.rotSpeed;

    const progress = sparkle.life / sparkle.maxLife;
    const alpha = this.sparkleAlpha(progress);
    const shimmer = 0.9 + Math.random() * 0.1;
    sparkle.sharpGfx.alpha = alpha * 0.5 * shimmer;
    sparkle.glowGfx.alpha = alpha * 0.2 * shimmer;

    const currentScale = sparkle.scale * (0.8 + Math.sin(progress * Math.PI) * 0.3);
    sparkle.sharpGfx.scale.set(currentScale);
    sparkle.glowGfx.scale.set(currentScale * 1.2);
  }

  private sparkleAlpha(progress: number) {
    if (progress < 0.2) return progress / 0.2;
    if (progress > 0.8) return (1 - progress) / 0.2;
    return 1;
  }

  private removeSparkle(index: number) {
    const sparkle = this.sparkles[index];
    this.sharpLayer.removeChild(sparkle.sharpGfx);
    this.glowLayer.removeChild(sparkle.glowGfx);
    sparkle.sharpGfx.destroy();
    sparkle.glowGfx.destroy();
    this.sparkles.splice(index, 1);
  }
}
