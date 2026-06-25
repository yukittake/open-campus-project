import { Container, Text } from 'pixi.js';

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
