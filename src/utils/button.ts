import { Container, Graphics, Rectangle, Text } from 'pixi.js';
import type { TextResolutionProvider } from './text';

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
