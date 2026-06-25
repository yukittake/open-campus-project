import { Container, Graphics } from 'pixi.js';
import { WORLD_HEIGHT, WORLD_WIDTH } from '../constants';

export function drawBackdrop(parent: Container) {
  // Draw the base and top/bottom bands for scenes without a background image.
  const bg = new Graphics({ label: 'backdrop' });
  bg.rect(0, 0, WORLD_WIDTH, WORLD_HEIGHT).fill(0x111719);
  bg.rect(0, 0, WORLD_WIDTH, 88).fill(0x1e2d2d);
  bg.rect(0, 520, WORLD_WIDTH, 80).fill(0x151b1d);
  parent.addChild(bg);
  return bg;
}
