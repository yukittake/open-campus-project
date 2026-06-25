import { Container, Graphics } from 'pixi.js';

export function drawGauge(parent: Container, x: number, y: number, width: number, height: number, ratio: number) {
  const gauge = new Graphics({ label: 'gauge' });
  const clamped = Math.min(1, Math.max(0, ratio));
  gauge.roundRect(x, y, width, height, 6).fill(0x111719);
  gauge.roundRect(x, y, width * clamped, height, 6).fill(ratio > 0.9 ? 0xe0b849 : 0x64c58f);
  gauge.roundRect(x, y, width, height, 6).stroke({ color: 0x526469, width: 2 });
  parent.addChild(gauge);
  return gauge;
}
