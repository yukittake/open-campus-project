import { Application, Container, Rectangle } from 'pixi.js';
import { WORLD_HEIGHT, WORLD_WIDTH } from './constants';
import { loadGameAssets, type GameAssets } from './gameAssets';
import { drawBackdrop } from './utils/backdrop';
import { PlayScene } from './scenes/play/PlayScene';
import { ResultsScene } from './scenes/results/ResultsScene';
import { TitleScene } from './scenes/title/TitleScene';
import { AudioManager } from './utils/audioManager';

type GameScene = Container & {
  update?: () => void;
};

export class KnapsackThiefGame {
  private readonly app = new Application();
  private readonly world = new Container({
    label: 'world',
    boundsArea: new Rectangle(0, 0, WORLD_WIDTH, WORLD_HEIGHT),
  });
  private readonly audioManager = AudioManager.getInstance();
  private currentScene: GameScene | null = null;
  private assets: GameAssets | null = null;
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
    drawBackdrop(this.world);
    this.assets = await loadGameAssets();

    // サウンドをロード（ユーザー操作後に再生します）
    await this.audioManager.loadSound('title', import.meta.env.BASE_URL + "sounds/title-music.mp3");
    await this.audioManager.loadSound('play', import.meta.env.BASE_URL + "sounds/play-music.mp3");
    await this.audioManager.loadSound('results', import.meta.env.BASE_URL + "sounds/results-music.mp3");

    window.addEventListener('resize', () => {
      this.resize();
    });

    this.app.ticker.add(() => this.tick());
    this.resize();
    this.showTitle();
    this.audioManager.playScene('title');
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
    this.currentScene?.update?.();
  }

  private showTitle() {
    if (!this.assets) return;

    this.setScene(
      new TitleScene({
        titleTexture: this.assets.titleTexture,
        onStart: () => this.showPlay(),
      }),
    );

    this.audioManager.playScene('title');
  }

  private showPlay() {
    if (!this.assets) return;

    // ゲーム画面に移行してから音声を再生
    this.setScene(
      new PlayScene({
        backgroundTexture: this.assets.gameBackgroundTexture,
        knapsackTexture: this.assets.knapsackTexture,
        runAwayTexture: this.assets.runAwayTexture,
        uiPanelStackTexture: this.assets.uiPanelStackTexture,
        itemTextures: this.assets.itemTextures,
        textResolution: () => this.textResolution(),
        onFinish: (selected) => this.showResults(selected),
      }),
    );
    // ユーザー操作後なのでオートプレイ制限の影響を受けない
    this.audioManager.playScene('play');
  }

  private showResults(selected: Set<number>) {
    if (!this.assets) return;

    this.setScene(
      new ResultsScene({
        backgroundTexture: this.assets.resultBackgroundTexture,
        itemTextures: this.assets.itemTextures,
        selected,
        textResolution: () => this.textResolution(),
        onBackToTitle: () => this.showTitle(),
      }),
    );
    // ユーザー操作後なのでオートプレイ制限の影響を受けない
    this.audioManager.playScene('results');
  }

  private setScene(scene: GameScene) {
    this.currentScene?.destroy({ children: true });
    this.currentScene = scene;
    this.world.removeChildren();
    this.world.addChild(scene);
  }
}
