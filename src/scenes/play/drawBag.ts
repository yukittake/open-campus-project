import { Container, Graphics } from 'pixi.js';

export function drawBag(parent: Container, x: number, y: number, scale: number) {
  const bag = new Graphics();
  bag.position.set(x, y);
  bag.scale.set(scale);
  bag.roundRect(-36, -24, 72, 62, 16).fill(0x5d3b27);
  bag.ellipse(0, -28, 23, 11).fill(0x2d1c14);
  bag.rect(-24, -33, 48, 8).fill(0xb88c4f);
  bag.circle(-15, -4, 5).fill(0xe0b849);
  bag.circle(4, 5, 5).fill(0xe0b849);
  bag.circle(18, -2, 5).fill(0xe0b849);
  parent.addChild(bag);
}
