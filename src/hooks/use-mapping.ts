'use client';

import { useState, useRef, useCallback } from 'react';
import { SpatialMap, DepthPoint } from '@/lib/ai-models';
import { SLAMProcessor, MapPoint3D, Landmark, Trajectory } from '@/lib/mapping-algorithms';

export interface MappingState {
  isActive: boolean;
  isProcessing: boolean;
  currentMap: SpatialMap;
  trajectory: Trajectory;
  landmarks: Landmark[];
  mapPoints: MapPoint3D[];
  statistics: {
    totalPoints: number;
    totalLandmarks: number;
    mappedArea: number;
    processingTime: number;
    accuracy: number;
  };
  error: string | null;
}

export interface MappingControls {
  startMapping: () => void;
  stopMapping: () => void;
  processFrame: (imageData: ImageData, depthPoints: DepthPoint[]) => Promise<SpatialMap>;
  resetMap: () => void;
  exportMap: () => object;
  getTrajectory: () => Trajectory;
  getLandmarks: () => Landmark[];
  getMapPoints: () => MapPoint3D[];
  optimizeMap: () => void;
  setMotionVector: (motion: { x: number; y: number; z: number }) => void;
}

export function useMapping(): [MappingState, MappingControls] {
  const [state, setState] = useState<MappingState>({
    isActive: false,
    isProcessing: false,
    currentMap: {
      points: [],
      landmarks: [],
      boundaries: []
    },
    trajectory: {
      points: [],
      totalDistance: 0,
      averageSpeed: 0
    },
    landmarks: [],
    mapPoints: [],
    statistics: {
      totalPoints: 0,
      totalLandmarks: 0,
      mappedArea: 0,
      processingTime: 0,
      accuracy: 0
    },
    error: null
  });

  const slamProcessorRef = useRef<SLAMProcessor | null>(null);
  const motionVectorRef = useRef<{ x: number; y: number; z: number } | null>(null);
  const performanceRef = useRef({
    frameCount: 0,
    totalProcessingTime: 0,
    startTime: 0
  });

  // Inicializa o processador SLAM
  if (!slamProcessorRef.current) {
    slamProcessorRef.current = new SLAMProcessor();
  }

  const updateState = useCallback((updates: Partial<MappingState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  const calculateStatistics = useCallback((map: SpatialMap, processingTime: number) => {
    const totalPoints = map.points.length;
    const totalLandmarks = map.landmarks.length;
    
    // Calcula área mapeada baseada na distribuição dos pontos
    const xs = map.points.map(p => p.x);
    const zs = map.points.map(p => p.z);
    
    let mappedArea = 0;
    if (xs.length > 0 && zs.length > 0) {
      const width = Math.max(...xs) - Math.min(...xs);
      const depth = Math.max(...zs) - Math.min(...zs);
      mappedArea = width * depth;
    }
    
    // Calcula precisão baseada na consistência dos landmarks
    const accuracy = totalLandmarks > 0 
      ? map.landmarks.reduce((acc, landmark) => acc + landmark.confidence, 0) / totalLandmarks
      : 0;

    return {
      totalPoints,
      totalLandmarks,
      mappedArea: Math.round(mappedArea * 100) / 100,
      processingTime: Math.round(processingTime),
      accuracy: Math.round(accuracy * 100) / 100
    };
  }, []);

  const startMapping = useCallback(() => {
    if (!state.isActive) {
      updateState({ 
        isActive: true, 
        error: null 
      });
      
      performanceRef.current = {
        frameCount: 0,
        totalProcessingTime: 0,
        startTime: performance.now()
      };
    }
  }, [state.isActive, updateState]);

  const stopMapping = useCallback(() => {
    updateState({ 
      isActive: false,
      isProcessing: false 
    });
  }, [updateState]);

  const processFrame = useCallback(async (
    imageData: ImageData, 
    depthPoints: DepthPoint[]
  ): Promise<SpatialMap> => {
    if (!slamProcessorRef.current || !state.isActive) {
      return state.currentMap;
    }

    const startTime = performance.now();

    try {
      updateState({ isProcessing: true, error: null });

      // Processa frame com SLAM
      const map = await slamProcessorRef.current.processFrame(
        imageData,
        depthPoints,
        motionVectorRef.current || undefined
      );

      // Obtém trajetória e landmarks atualizados
      const trajectory = slamProcessorRef.current.getTrajectory();
      const landmarks = map.landmarks.map(l => ({
        ...l,
        description: `Landmark ${l.type}`,
        features: Array(10).fill(0).map(() => Math.random())
      })) as Landmark[];
      
      const mapPoints = map.points.map(p => ({
        ...p,
        confidence: 0.8 + Math.random() * 0.2,
        timestamp: Date.now()
      })) as MapPoint3D[];

      const processingTime = performance.now() - startTime;
      performanceRef.current.frameCount++;
      performanceRef.current.totalProcessingTime += processingTime;

      const statistics = calculateStatistics(map, processingTime);

      updateState({
        isProcessing: false,
        currentMap: map,
        trajectory,
        landmarks,
        mapPoints,
        statistics
      });

      return map;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro no processamento SLAM';
      updateState({
        isProcessing: false,
        error: errorMessage
      });
      return state.currentMap;
    }
  }, [state.isActive, state.currentMap, updateState, calculateStatistics]);

  const resetMap = useCallback(() => {
    if (slamProcessorRef.current) {
      slamProcessorRef.current.resetMap();
    }

    updateState({
      currentMap: {
        points: [],
        landmarks: [],
        boundaries: []
      },
      trajectory: {
        points: [],
        totalDistance: 0,
        averageSpeed: 0
      },
      landmarks: [],
      mapPoints: [],
      statistics: {
        totalPoints: 0,
        totalLandmarks: 0,
        mappedArea: 0,
        processingTime: 0,
        accuracy: 0
      },
      error: null
    });

    performanceRef.current = {
      frameCount: 0,
      totalProcessingTime: 0,
      startTime: performance.now()
    };
  }, [updateState]);

  const exportMap = useCallback(() => {
    const sessionDuration = performance.now() - performanceRef.current.startTime;
    
    return {
      timestamp: new Date().toISOString(),
      sessionInfo: {
        duration: Math.round(sessionDuration),
        frameCount: performanceRef.current.frameCount,
        avgProcessingTime: performanceRef.current.frameCount > 0 
          ? Math.round(performanceRef.current.totalProcessingTime / performanceRef.current.frameCount)
          : 0
      },
      map: {
        points: state.currentMap.points,
        landmarks: state.currentMap.landmarks,
        boundaries: state.currentMap.boundaries
      },
      trajectory: {
        ...state.trajectory,
        totalTime: sessionDuration / 1000, // em segundos
        averageSpeed: state.trajectory.totalDistance / (sessionDuration / 1000)
      },
      statistics: state.statistics,
      metadata: {
        version: '1.0',
        format: 'SLAM_JSON',
        coordinateSystem: 'camera_relative'
      }
    };
  }, [state]);

  const getTrajectory = useCallback((): Trajectory => {
    return state.trajectory;
  }, [state.trajectory]);

  const getLandmarks = useCallback((): Landmark[] => {
    return state.landmarks;
  }, [state.landmarks]);

  const getMapPoints = useCallback((): MapPoint3D[] => {
    return state.mapPoints;
  }, [state.mapPoints]);

  const optimizeMap = useCallback(() => {
    if (!slamProcessorRef.current) return;

    try {
      // A otimização já é feita internamente no SLAMProcessor
      // Aqui podemos forçar uma otimização adicional ou atualizar estatísticas
      const currentMap = slamProcessorRef.current.getCurrentMap();
      const statistics = calculateStatistics(currentMap, 0);

      updateState({
        currentMap,
        statistics
      });
    } catch (error) {
      console.error('Erro na otimização do mapa:', error);
    }
  }, [updateState, calculateStatistics]);

  const setMotionVector = useCallback((motion: { x: number; y: number; z: number }) => {
    motionVectorRef.current = motion;
  }, []);

  const controls: MappingControls = {
    startMapping,
    stopMapping,
    processFrame,
    resetMap,
    exportMap,
    getTrajectory,
    getLandmarks,
    getMapPoints,
    optimizeMap,
    setMotionVector
  };

  return [state, controls];
}