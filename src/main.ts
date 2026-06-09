import { KnapsackThiefGame } from './game';
import './styles.css';

const root = document.querySelector<HTMLDivElement>('#app');

if (!root) {
  throw new Error('#app が見つかりません');
}

const game = new KnapsackThiefGame();

game.start(root).catch((error: unknown) => {
  root.textContent = `ナップサック・シーフの起動に失敗しました: ${error instanceof Error ? error.message : String(error)}`;
  root.classList.add('startup-error');
});
