'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { DetectedObject, AIProcessor } from '@/lib/ai-models';

export interface AIDetectionState {
  isProcessing: boolean;
  isEnabled: boolean;
  objects: DetectedObject[];
  performance: {
    fps: number;
    processingTime: number;
    totalObjectsDetected: number;
  };
  error: string | null;
  confidence: {
    min: number;
    average: number;
    max: number;
  };
}

export interface AIDetectionControls {
  startDetection: () => void;
  stopDetection: () => void;
  processFrame: (imageData: ImageData) => Promise<DetectedObject[]>;
  setConfidenceThreshold: (threshold: number) => void;
  clearObjects: () => void;
  getObjectById: (id: string) => DetectedObject | null;
  getObjectsByLabel: (label: string) => DetectedObject[];
}

export interface AIDetectionOptions {
  confidenceThreshold: number;
  maxObjects: number;
  processingInterval: number;
  enableTracking: boolean;
}

const defaultOptions: AIDetectionOptions = {
  confidenceThreshold: 0.5,
  maxObjects: 20,
  processingInterval: 100,
  enableTracking: true
};

export function useAIDetection(options: Partial<AIDetectionOptions> = {}): [AIDetectionState, AIDetectionControls] {
  const config = { ...defaultOptions, ...options };
  
  const [state, setState] = useState<AIDetectionState>({
    isProcessing: false,
    isEnabled: false,
    objects: [],
    performance: {
      fps: 0,
      processingTime: 0,
      totalObjectsDetected: 0
    },
    error: null,
    confidence: {
      min: 0,
      average: 0,
      max: 0
    }
  });

  const aiProcessorRef = useRef<AIProcessor | null>(null);
  const processingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const performanceRef = useRef({
    lastFrameTime: 0,
    frameCount: 0,
    totalProcessingTime: 0,
    fpsHistory: [] as number[]
  });

  // Inicializa o processador de IA
  useEffect(() => {
    if (!aiProcessorRef.current) {
      aiProcessorRef.current = new AIProcessor();
    }
  }, []);

  // Cleanup ao desmontar
  useEffect(() => {
    return () => {
      if (processingIntervalRef.current) {
        clearInterval(processingIntervalRef.current);
      }
    };
  }, []);

  const updateState = useCallback((updates: Partial<AIDetectionState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  const calculatePerformanceMetrics = useCallback((processingTime: number) => {
    const now = performance.now();
    const deltaTime = now - performanceRef.current.lastFrameTime;
    
    if (deltaTime > 0) {
      const fps = 1000 / deltaTime;
      performanceRef.current.fpsHistory.push(fps);
      
      // Mantém apenas os últimos 30 frames para cálculo de FPS médio
      if (performanceRef.current.fpsHistory.length > 30) {
        performanceRef.current.fpsHistory.shift();
      }
      
      const avgFps = performanceRef.current.fpsHistory.reduce((a, b) => a + b, 0) / performanceRef.current.fpsHistory.length;
      
      performanceRef.current.frameCount++;
      performanceRef.current.totalProcessingTime += processingTime;
      performanceRef.current.lastFrameTime = now;
      
      return {
        fps: Math.round(avgFps),
        processingTime: Math.round(processingTime),
        totalObjectsDetected: performanceRef.current.frameCount
      };
    }
    
    return state.performance;
  }, [state.performance]);

  const calculateConfidenceStats = useCallback((objects: DetectedObject[]) => {
    if (objects.length === 0) {
      return { min: 0, average: 0, max: 0 };
    }
    
    const confidences = objects.map(obj => obj.confidence);
    const min = Math.min(...confidences);
    const max = Math.max(...confidences);
    const average = confidences.reduce((a, b) => a + b, 0) / confidences.length;
    
    return {
      min: Math.round(min * 100) / 100,
      average: Math.round(average * 100) / 100,
      max: Math.round(max * 100) / 100
    };
  }, []);

  const trackObjects = useCallback((newObjects: DetectedObject[], previousObjects: DetectedObject[]): DetectedObject[] => {
    if (!config.enableTracking || previousObjects.length === 0) {
      return newObjects;
    }
    
    const trackedObjects: DetectedObject[] = [];
    
    for (const newObj of newObjects) {
      // Tenta encontrar objeto similar na frame anterior
      const similarObj = previousObjects.find(oldObj => {
        const distance = Math.sqrt(
          Math.pow(newObj.center.x - oldObj.center.x, 2) +
          Math.pow(newObj.center.y - oldObj.center.y, 2)
        );
        
        return oldObj.label === newObj.label && distance < 100; // 100px de tolerância
      });
      
      if (similarObj) {
        // Mantém o ID do objeto para tracking
        trackedObjects.push({
          ...newObj,
          id: similarObj.id
        });
      } else {
        trackedObjects.push(newObj);
      }
    }
    
    return trackedObjects;
  }, [config.enableTracking]);

  const processFrame = useCallback(async (imageData: ImageData): Promise<DetectedObject[]> => {
    if (!aiProcessorRef.current) {
      return [];
    }
    
    const startTime = performance.now();
    
    try {
      updateState({ isProcessing: true, error: null });
      
      // Processa detecção de objetos
      const detectedObjects = await aiProcessorRef.current.detectObjects(imageData);
      
      // Filtra por confiança
      const filteredObjects = detectedObjects
        .filter(obj => obj.confidence >= config.confidenceThreshold)
        .slice(0, config.maxObjects);
      
      // Tracking de objetos
      const trackedObjects = trackObjects(filteredObjects, state.objects);
      
       const processingTime = performance.now() - startTime;
      const performanceMetrics = calculatePerformanceMetrics(processingTime);
      const confidence = calculateConfidenceStats(trackedObjects);
      
       updateState({
        isProcessing: false,
        objects: trackedObjects,
        performance: performanceMetrics,
        confidence
      });
      
      return trackedObjects;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro no processamento de IA';
      updateState({
        isProcessing: false,
        error: errorMessage
      });
      return [];
    }
  }, [config.confidenceThreshold, config.maxObjects, state.objects, trackObjects, updateState, calculatePerformanceMetrics, calculateConfidenceStats]);

  const startDetection = useCallback(() => {
    if (!state.isEnabled) {
      updateState({ 
        isEnabled: true,
        error: null 
      });
      
      // Reset das métricas de performance
      performanceRef.current = {
        lastFrameTime: performance.now(),
        frameCount: 0,
        totalProcessingTime: 0,
        fpsHistory: []
      };
    }
  }, [state.isEnabled, updateState]);

  const stopDetection = useCallback(() => {
    updateState({ 
      isEnabled: false,
      isProcessing: false 
    });
    
    if (processingIntervalRef.current) {
      clearInterval(processingIntervalRef.current);
      processingIntervalRef.current = null;
    }
  }, [updateState]);

  const setConfidenceThreshold = useCallback((threshold: number) => {
    config.confidenceThreshold = Math.max(0, Math.min(1, threshold));
    
    // Re-filtra objetos existentes com o novo threshold
    const filteredObjects = state.objects.filter(obj => 
      obj.confidence >= config.confidenceThreshold
    );
    
    updateState({ objects: filteredObjects });
  }, [config, state.objects, updateState]);

  const clearObjects = useCallback(() => {
    updateState({ 
      objects: [],
      confidence: { min: 0, average: 0, max: 0 }
    });
  }, [updateState]);

  const getObjectById = useCallback((id: string): DetectedObject | null => {
    return state.objects.find(obj => obj.id === id) || null;
  }, [state.objects]);

  const getObjectsByLabel = useCallback((label: string): DetectedObject[] => {
    return state.objects.filter(obj => 
      obj.label.toLowerCase().includes(label.toLowerCase())
    );
  }, [state.objects]);

  const controls: AIDetectionControls = {
    startDetection,
    stopDetection,
    processFrame,
    setConfidenceThreshold,
    clearObjects,
    getObjectById,
    getObjectsByLabel
  };

  return [state, controls];
}