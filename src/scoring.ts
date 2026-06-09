export const money = new Intl.NumberFormat('ja-JP', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

export function rankFor(score: number) {
  if (score >= 15000) return { grade: 'S', label: '伝説の怪盗' };
  if (score >= 14000) return { grade: 'A', label: '一流の盗み' };
  if (score >= 12000) return { grade: 'B', label: 'なかなかの成果' };
  if (score >= 10000) return { grade: 'C', label: 'まずまずの脱出' };
  return { grade: 'D', label: '次はもっと狙おう' };
}
