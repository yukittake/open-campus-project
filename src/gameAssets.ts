import { Assets, Texture } from 'pixi.js';
import type { Item } from './types';

import gameBackgroundUrl from '../images/in-game/background.png';
import knapsackUrl from '../images/in-game/knapsack.png';
import resultBackgroundUrl from '../images/in-game/result-back-ground.png';
import runAwayUrl from '../images/in-game/run-away.png';
import titleImageUrl from '../images/in-game/title_chatgpt.png';
import uiPanelStackUrl from '../images/in-game/ui-panel-stack.png';

const itemImageUrls = import.meta.glob('../images/in-game/items/item_*.png', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

export type GameAssets = {
  gameBackgroundTexture: Texture;
  knapsackTexture: Texture;
  resultBackgroundTexture: Texture;
  runAwayTexture: Texture;
  titleTexture: Texture;
  uiPanelStackTexture: Texture;
  itemTextures: Map<number, Texture>;
};

export async function loadGameAssets(): Promise<GameAssets> {
  const [gameBackgroundTexture, knapsackTexture, resultBackgroundTexture, runAwayTexture, titleTexture, uiPanelStackTexture, itemTextures] = await Promise.all([
    Assets.load<Texture>(gameBackgroundUrl),
    Assets.load<Texture>(knapsackUrl),
    Assets.load<Texture>(resultBackgroundUrl),
    Assets.load<Texture>(runAwayUrl),
    Assets.load<Texture>(titleImageUrl),
    Assets.load<Texture>(uiPanelStackUrl),
    loadItemTextures(),
  ]);

  return { gameBackgroundTexture, knapsackTexture, resultBackgroundTexture, runAwayTexture, titleTexture, uiPanelStackTexture, itemTextures };
}

async function loadItemTextures() {
  const textures = new Map<Item['id'], Texture>();

  await Promise.all(
    Object.entries(itemImageUrls).map(async ([path, url]) => {
      const match = path.match(/item_(\d+)\.png$/);
      if (!match) return;

      const texture = await Assets.load<Texture>(url);
      textures.set(Number(match[1]), texture);
    }),
  );

  return textures;
}
