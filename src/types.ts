export type Scene = 'TITLE' | 'PLAYING' | 'RESULTS';

export type IconType =
  | 'statue'
  | 'painting'
  | 'ring'
  | 'wine'
  | 'guitar'
  | 'crown'
  | 'silverware'
  | 'urn'
  | 'bust'
  | 'skull'
  | 'chest'
  | 'book'
  | 'rug'
  | 'coins'
  | 'watch';

export type Item = {
  id: number;
  name: string;
  weight: number;
  value: number;
  color: number;
  accent: number;
  icon: IconType;
};
