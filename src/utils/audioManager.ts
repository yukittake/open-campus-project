export type SceneType = 'title' | 'play' | 'results';

export class AudioManager {
  private static instance: AudioManager;
  private audioElements: Map<SceneType, HTMLAudioElement> = new Map();
  private currentScene: SceneType | null = null;
  private soundPaths: Map<SceneType, string> = new Map();

  private constructor() {
    this.audioElements.set('title', new Audio(import.meta.env.BASE_URL + "sounds/title-music.mp3"));
    this.audioElements.set('play', new Audio(import.meta.env.BASE_URL + "sounds/play-music.mp3"));
    this.audioElements.set('results', new Audio(import.meta.env.BASE_URL + "sounds/results-music.mp3"));
  }

  static getInstance(): AudioManager {
    if (!AudioManager.instance) {
      AudioManager.instance = new AudioManager();
    }
    return AudioManager.instance;
  }

  async loadSound(sceneType: SceneType, soundPath: string): Promise<void> {
    try {
      const audio = this.audioElements.get(sceneType);
      if (audio) {
        // Viteのpublic folderで相対パスを使用
        audio.src = soundPath;
        audio.preload = 'auto';
        this.soundPaths.set(sceneType, soundPath);
        console.log(`✓ Sound loaded for ${sceneType}: ${soundPath}`);
      }
    } catch (error) {
      console.error(`✗ Failed to load sound for ${sceneType}:`, error);
    }
  }

  playScene(sceneType: SceneType, loop: boolean = true): void {
    // 前のシーンの音を停止
    if (this.currentScene && this.currentScene !== sceneType) {
      const previousAudio = this.audioElements.get(this.currentScene);
      if (previousAudio) {
        previousAudio.pause();
        previousAudio.currentTime = 0;
      }
    }

    // 新しいシーンの音を再生
    const audio = this.audioElements.get(sceneType);
    if (audio) {
      audio.loop = loop;
      audio.currentTime = 0;
      console.log(`▶ Playing ${sceneType}: ${this.soundPaths.get(sceneType)}`);
      audio.play().catch((error) => {
        console.error(`✗ Failed to play sound for ${sceneType}:`, error);
      });
    } else {
      console.warn(`⚠ Audio element not found for ${sceneType}`);
    }

    this.currentScene = sceneType;
  }

  stopScene(sceneType: SceneType): void {
    const audio = this.audioElements.get(sceneType);
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
  }

  stopAll(): void {
    this.audioElements.forEach((audio) => {
      audio.pause();
      audio.currentTime = 0;
    });
    this.currentScene = null;
  }

  setVolume(sceneType: SceneType, volume: number): void {
    const audio = this.audioElements.get(sceneType);
    if (audio) {
      audio.volume = Math.max(0, Math.min(1, volume));
    }
  }

  setMasterVolume(volume: number): void {
    this.audioElements.forEach((audio) => {
      audio.volume = Math.max(0, Math.min(1, volume));
    });
  }
}
