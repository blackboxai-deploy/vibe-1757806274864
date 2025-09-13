'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { CameraManager, CameraConstraints, defaultCameraConstraints } from '@/lib/camera-utils';

export interface CameraState {
  isInitialized: boolean;
  isActive: boolean;
  hasPermission: boolean;
  isLoading: boolean;
  error: string | null;
  availableCameras: MediaDeviceInfo[];
  currentCamera: string | null;
  stream: MediaStream | null;
  capabilities: {
    width: number;
    height: number;
    frameRate: number;
  } | null;
}

export interface CameraControls {
  initialize: (constraints?: CameraConstraints) => Promise<boolean>;
  switchCamera: (deviceId: string) => Promise<boolean>;
  startCamera: () => Promise<boolean>;
  stopCamera: () => void;
  capturePhoto: () => string | null;
  captureFrame: () => ImageData | null;
  requestPermission: () => Promise<boolean>;
  getAvailableCameras: () => Promise<MediaDeviceInfo[]>;
}

export function useCamera(): [CameraState, CameraControls] {
  const [state, setState] = useState<CameraState>({
    isInitialized: false,
    isActive: false,
    hasPermission: false,
    isLoading: false,
    error: null,
    availableCameras: [],
    currentCamera: null,
    stream: null,
    capabilities: null
  });

  const cameraManagerRef = useRef<CameraManager | null>(null);
  const videoElementRef = useRef<HTMLVideoElement | null>(null);

  // Inicializa o gerenciador de câmera
  useEffect(() => {
    if (!cameraManagerRef.current) {
      cameraManagerRef.current = new CameraManager();
    }
  }, []);

  // Cleanup ao desmontar o componente
  useEffect(() => {
    return () => {
      if (cameraManagerRef.current) {
        cameraManagerRef.current.stopCamera();
      }
    };
  }, []);

  const updateState = useCallback((updates: Partial<CameraState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    try {
      updateState({ isLoading: true, error: null });
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: true, 
        audio: false 
      });
      
      // Para o stream imediatamente após obter permissão
      stream.getTracks().forEach(track => track.stop());
      
      updateState({ 
        hasPermission: true, 
        isLoading: false 
      });
      
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro ao solicitar permissão';
      updateState({ 
        hasPermission: false, 
        isLoading: false, 
        error: errorMessage 
      });
      return false;
    }
  }, [updateState]);

  const getAvailableCameras = useCallback(async (): Promise<MediaDeviceInfo[]> => {
    try {
      if (!state.hasPermission) {
        const hasPermission = await requestPermission();
        if (!hasPermission) return [];
      }

      const cameras = await cameraManagerRef.current?.getAvailableCameras() || [];
      updateState({ availableCameras: cameras });
      return cameras;
    } catch (error) {
      console.error('Erro ao obter câmeras disponíveis:', error);
      return [];
    }
  }, [state.hasPermission, requestPermission, updateState]);

  const initialize = useCallback(async (
    constraints: CameraConstraints = defaultCameraConstraints
  ): Promise<boolean> => {
    try {
      updateState({ isLoading: true, error: null });

      if (!cameraManagerRef.current) {
        throw new Error('Gerenciador de câmera não inicializado');
      }

      // Verifica permissão
      if (!state.hasPermission) {
        const hasPermission = await requestPermission();
        if (!hasPermission) {
          throw new Error('Permissão de câmera negada');
        }
      }

      // Inicializa a câmera
      const stream = await cameraManagerRef.current.initializeCamera(constraints);
      const stats = cameraManagerRef.current.getStreamStats();

      updateState({
        isInitialized: true,
        isActive: true,
        isLoading: false,
        stream,
        capabilities: stats
      });

      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro ao inicializar câmera';
      updateState({
        isInitialized: false,
        isActive: false,
        isLoading: false,
        error: errorMessage
      });
      return false;
    }
  }, [state.hasPermission, requestPermission, updateState]);

  const startCamera = useCallback(async (): Promise<boolean> => {
    try {
      if (!state.isInitialized) {
        return await initialize();
      }

      updateState({ isActive: true, error: null });
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro ao iniciar câmera';
      updateState({ error: errorMessage });
      return false;
    }
  }, [state.isInitialized, initialize, updateState]);

  const stopCamera = useCallback(() => {
    try {
      if (cameraManagerRef.current) {
        cameraManagerRef.current.stopCamera();
      }

      updateState({
        isActive: false,
        stream: null,
        capabilities: null
      });
    } catch (error) {
      console.error('Erro ao parar câmera:', error);
    }
  }, [updateState]);

  const switchCamera = useCallback(async (deviceId: string): Promise<boolean> => {
    try {
      updateState({ isLoading: true });

      // Para a câmera atual
      stopCamera();

      // Cria novas constraints com o dispositivo especificado
      const newConstraints: CameraConstraints = {
        ...defaultCameraConstraints,
        video: {
          ...defaultCameraConstraints.video,
          deviceId: { exact: deviceId }
        }
      };

      // Inicializa com o novo dispositivo
      const success = await initialize(newConstraints);
      
      if (success) {
        updateState({ 
          currentCamera: deviceId,
          isLoading: false 
        });
      } else {
        updateState({ isLoading: false });
      }

      return success;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro ao trocar câmera';
      updateState({ 
        isLoading: false, 
        error: errorMessage 
      });
      return false;
    }
  }, [initialize, stopCamera, updateState]);

  const capturePhoto = useCallback((): string | null => {
    try {
      if (!cameraManagerRef.current || !state.isActive) {
        return null;
      }

      return cameraManagerRef.current.capturePhoto();
    } catch (error) {
      console.error('Erro ao capturar foto:', error);
      return null;
    }
  }, [state.isActive]);

  const captureFrame = useCallback((): ImageData | null => {
    try {
      if (!cameraManagerRef.current || !state.isActive) {
        return null;
      }

      return cameraManagerRef.current.captureFrame();
    } catch (error) {
      console.error('Erro ao capturar frame:', error);
      return null;
    }
  }, [state.isActive]);

  // Adiciona referência ao elemento de vídeo quando disponível
  useEffect(() => {
    const videoElement = document.getElementById('camera-video') as HTMLVideoElement;
    if (videoElement && cameraManagerRef.current && state.stream) {
      videoElementRef.current = videoElement;
      cameraManagerRef.current.attachToVideoElement(videoElement);
    }
  }, [state.stream]);

  const controls: CameraControls = {
    initialize,
    switchCamera,
    startCamera,
    stopCamera,
    capturePhoto,
    captureFrame,
    requestPermission,
    getAvailableCameras
  };

  return [state, controls];
}