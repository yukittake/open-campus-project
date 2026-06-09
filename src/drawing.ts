import { Container, Graphics } from 'pixi.js';
import type { Item } from './types';

export function drawIcon(parent: Container, item: Item, x: number, y: number, scale: number) {
  const g = new Graphics();
  g.position.set(x, y);
  g.scale.set(scale);
  parent.addChild(g);

  const c = item.color;
  const a = item.accent;

  switch (item.icon) {
    case 'statue':
      g.circle(0, -12, 9).fill(a);
      g.rect(-9, -3, 18, 26).fill(c);
      g.rect(-18, 23, 36, 7).fill(a);
      break;
    case 'painting':
      g.rect(-24, -20, 48, 36).fill(c);
      g.rect(-18, -14, 36, 24).fill(a);
      g.circle(-5, -3, 8).fill(0xf5d083);
      break;
    case 'ring':
      g.circle(0, 8, 15).stroke({ color: a, width: 6 });
      g.poly([-10, -7, 0, -22, 10, -7, 0, 2]).fill(c).stroke({ color: 0xffffff, width: 1 });
      break;
    case 'wine':
      g.roundRect(-8, -24, 16, 45, 7).fill(c);
      g.rect(-4, -34, 8, 14).fill(a);
      break;
    case 'guitar':
      g.ellipse(-7, 8, 13, 17).fill(c);
      g.ellipse(7, 5, 11, 14).fill(0xe2923f);
      g.rect(9, -27, 7, 35).fill(a);
      break;
    case 'crown':
      g.poly([-24, 13, -18, -14, -6, 5, 0, -18, 8, 5, 20, -14, 24, 13]).fill(c);
      g.rect(-22, 13, 44, 8).fill(a);
      break;
    case 'silverware':
      g.rect(-14, -24, 5, 48).fill(c);
      g.rect(8, -24, 5, 48).fill(a);
      g.circle(-12, -28, 7).fill(c);
      break;
    case 'urn':
      g.ellipse(0, 2, 19, 26).fill(c);
      g.rect(-13, -26, 26, 9).fill(a);
      g.rect(-10, 23, 20, 6).fill(a);
      break;
    case 'bust':
      g.circle(0, -16, 11).fill(c);
      g.roundRect(-13, -5, 26, 26, 5).fill(c);
      g.rect(-22, 21, 44, 8).fill(a);
      break;
    case 'skull':
      g.circle(0, -8, 19).fill(c);
      g.rect(-11, 6, 22, 16).fill(c);
      g.circle(-7, -9, 4).fill(0x12353b);
      g.circle(7, -9, 4).fill(0x12353b);
      break;
    case 'chest':
      g.roundRect(-25, -16, 50, 34, 5).fill(c);
      g.rect(-25, -1, 50, 5).fill(a);
      g.rect(-4, -5, 8, 10).fill(0xffe6a1);
      break;
    case 'book':
      g.roundRect(-20, -25, 40, 48, 4).fill(c);
      g.rect(-14, -18, 28, 5).fill(a);
      g.rect(-14, -7, 23, 4).fill(a);
      break;
    case 'rug':
      g.roundRect(-25, -18, 50, 36, 4).fill(c);
      g.rect(-18, -10, 36, 20).stroke({ color: a, width: 4 });
      break;
    case 'coins':
      g.roundRect(-18, -9, 36, 30, 12).fill(c);
      for (let i = 0; i < 5; i += 1) g.circle(-14 + i * 7, -16 + (i % 2) * 5, 7).fill(a);
      break;
    case 'watch':
      g.circle(0, 1, 19).fill(c).stroke({ color: a, width: 4 });
      g.rect(-4, -27, 8, 9).fill(a);
      g.moveTo(0, 1).lineTo(0, -10).moveTo(0, 1).lineTo(9, 6).stroke({ color: 0x3d2b15, width: 3 });
      break;
  }
}

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
