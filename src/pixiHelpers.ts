import { Container, Graphics, Rectangle, Sprite, Text, Texture } from 'pixi.js';
import { WORLD_HEIGHT, WORLD_WIDTH } from './constants';
import { drawIcon } from './drawing';
import type { Item } from './types';

export type TextResolutionProvider = () => number;

export function addText(
  parent: Container,
  text: string,
  x: number,
  y: number,
  size: number,
  color = 0xffffff,
  weight: 'normal' | 'bold' = 'normal',
  textResolution: TextResolutionProvider,
) {
  const label = new Text({
    text,
    resolution: textResolution(),
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
  parent.addChild(label);
  return label;
}

export function makeButton(
  parent: Container,
  label: string,
  x: number,
  y: number,
  width: number,
  height: number,
  onClick: () => void,
  textResolution: TextResolutionProvider,
  color = 0xbd2f35,
) {
  const button = new Container({ label: 'ui-button' });
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
    resolution: textResolution(),
    style: { fontFamily: 'Inter, Segoe UI, Arial, sans-serif', fontSize: 22, fontWeight: 'bold', fill: 0xffffff },
  });
  text.anchor.set(0.5);
  button.addChild(text);

  button.on('pointerover', () => draw(0xd9433d));
  button.on('pointerout', () => draw(color));
  button.on('pointerdown', onClick);
  parent.addChild(button);
  return button;
}

export function drawBackdrop(parent: Container) {
  const bg = new Graphics({ label: 'backdrop' });
  bg.rect(0, 0, WORLD_WIDTH, WORLD_HEIGHT).fill(0x111719);
  bg.rect(0, 0, WORLD_WIDTH, 88).fill(0x1e2d2d);
  bg.rect(0, 520, WORLD_WIDTH, 80).fill(0x151b1d);
  parent.addChild(bg);
  return bg;
}

export function drawGauge(parent: Container, x: number, y: number, width: number, height: number, ratio: number) {
  const gauge = new Graphics({ label: 'gauge' });
  const clamped = Math.min(1, Math.max(0, ratio));
  gauge.roundRect(x, y, width, height, 6).fill(0x111719);
  gauge.roundRect(x, y, width * clamped, height, 6).fill(ratio > 0.9 ? 0xe0b849 : 0x64c58f);
  gauge.roundRect(x, y, width, height, 6).stroke({ color: 0x526469, width: 2 });
  parent.addChild(gauge);
  return gauge;
}

export function drawItemImage(
  parent: Container,
  item: Item,
  itemTextures: Map<number, Texture>,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  const texture = itemTextures.get(item.id);
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
