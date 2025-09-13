export interface CameraConstraints {
  video: {
    width: { ideal: number };
    height: { ideal: number };
    facingMode?: "user" | "environment";
    frameRate: { ideal: number };
    deviceId?: { exact: string };
  };
  audio: boolean;
}

export interface CameraCapabilities {
  hasMultipleCameras: boolean;
  supportedResolutions: { width: number; height: number }[];
  maxFrameRate: number;
  hasFlash: boolean;
  hasZoom: boolean;
}

export class CameraManager {
  private stream: MediaStream | null = null;
  private videoElement: HTMLVideoElement | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;

  constructor() {
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d');
  }

  async getAvailableCameras(): Promise<MediaDeviceInfo[]> {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      return devices.filter(device => device.kind === 'videoinput');
    } catch (error) {
      console.error('Erro ao obter câmeras disponíveis:', error);
      return [];
    }
  }

   async initializeCamera(constraints: CameraConstraints): Promise<MediaStream> {
    try {
      if (this.stream) {
        this.stopCamera();
      }

      this.stream = await navigator.mediaDevices.getUserMedia(constraints);
      return this.stream;
    } catch (error) {
      console.error('Erro ao inicializar câmera:', error);
      throw new Error('Não foi possível acessar a câmera');
    }
  }

  attachToVideoElement(videoElement: HTMLVideoElement) {
    if (this.stream && videoElement) {
      this.videoElement = videoElement;
      videoElement.srcObject = this.stream;
      videoElement.play();
    }
  }

  captureFrame(): ImageData | null {
    if (!this.videoElement || !this.canvas || !this.ctx) return null;

    const { videoWidth, videoHeight } = this.videoElement;
    this.canvas.width = videoWidth;
    this.canvas.height = videoHeight;

    this.ctx.drawImage(this.videoElement, 0, 0, videoWidth, videoHeight);
    return this.ctx.getImageData(0, 0, videoWidth, videoHeight);
  }

  capturePhoto(): string | null {
    if (!this.videoElement || !this.canvas || !this.ctx) return null;

    const { videoWidth, videoHeight } = this.videoElement;
    this.canvas.width = videoWidth;
    this.canvas.height = videoHeight;

    this.ctx.drawImage(this.videoElement, 0, 0, videoWidth, videoHeight);
    return this.canvas.toDataURL('image/jpeg', 0.9);
  }

  stopCamera() {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    if (this.videoElement) {
      this.videoElement.srcObject = null;
    }
  }

  getStreamStats(): { width: number; height: number; frameRate: number } | null {
    if (!this.stream) return null;

    const videoTrack = this.stream.getVideoTracks()[0];
    if (!videoTrack) return null;

    const settings = videoTrack.getSettings();
    return {
      width: settings.width || 0,
      height: settings.height || 0,
      frameRate: settings.frameRate || 0
    };
  }
}

export const defaultCameraConstraints: CameraConstraints = {
  video: {
    width: { ideal: 1920 },
    height: { ideal: 1080 },
    facingMode: "environment",
    frameRate: { ideal: 30 }
  },
  audio: false
};

export const mobileCameraConstraints: CameraConstraints = {
  video: {
    width: { ideal: 1280 },
    height: { ideal: 720 },
    facingMode: "environment",
    frameRate: { ideal: 24 }
  },
  audio: false
};