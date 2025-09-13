'use client';

import { useState, useRef, useCallback } from 'react';
import { DetectedObject, DepthPoint, MorphologyAnalysis } from '@/lib/ai-models';
import { Analysis3D, NightVisionEnhancement, Mesh3D } from '@/lib/3d-analysis';

export interface Analysis3DState {
  isAnalyzing: boolean;
  isNightVisionEnabled: boolean;
  depthPoints: DepthPoint[];
  morphologyAnalysis: Map<string, MorphologyAnalysis>;
  meshes: Map<string, Mesh3D>;
  nightVisionSettings: NightVisionEnhancement;
  error: string | null;
  performance: {
    depthEstimationTime: number;
    morphologyAnalysisTime: number;
    meshReconstructionTime: number;
  };
}

export interface Analysis3DControls {
  estimateDepth: (imageData: ImageData) => Promise<DepthPoint[]>;
  analyzeMorphology: (objects: DetectedObject[]) => Promise<Map<string, MorphologyAnalysis>>;
  reconstructMesh: (objectId: string, imageData: ImageData) => Promise<Mesh3D | null>;
  enableNightVision: (enabled: boolean) => void;
  updateNightVisionSettings: (settings: Partial<NightVisionEnhancement>) => void;
  processNightVision: (imageData: ImageData) => Promise<ImageData>;
  clearAnalysis: () => void;
  getObjectMorphology: (objectId: string) => MorphologyAnalysis | null;
  getObjectMesh: (objectId: string) => Mesh3D | null;
  exportAnalysisData: () => object;
}

const defaultNightVisionSettings: NightVisionEnhancement = {
  brightness: 1.5,
  contrast: 1.3,
  gamma: 0.7,
  noiseReduction: 0.8,
  edgeEnhancement: 0.4
};

export function use3DAnalysis(): [Analysis3DState, Analysis3DControls] {
  const [state, setState] = useState<Analysis3DState>({
    isAnalyzing: false,
    isNightVisionEnabled: false,
    depthPoints: [],
    morphologyAnalysis: new Map(),
    meshes: new Map(),
    nightVisionSettings: defaultNightVisionSettings,
    error: null,
    performance: {
      depthEstimationTime: 0,
      morphologyAnalysisTime: 0,
      meshReconstructionTime: 0
    }
  });

  const analysis3DRef = useRef<Analysis3D | null>(null);

  // Inicializa o analisador 3D
  if (!analysis3DRef.current) {
    analysis3DRef.current = new Analysis3D();
  }

  const updateState = useCallback((updates: Partial<Analysis3DState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  const estimateDepth = useCallback(async (imageData: ImageData): Promise<DepthPoint[]> => {
    if (!analysis3DRef.current) return [];

    const startTime = performance.now();
    
    try {
      updateState({ isAnalyzing: true, error: null });

      const depthPoints = await analysis3DRef.current.estimateDepth(imageData);
      const estimationTime = performance.now() - startTime;

      updateState({
        isAnalyzing: false,
        depthPoints,
        performance: {
          ...state.performance,
          depthEstimationTime: Math.round(estimationTime)
        }
      });

      return depthPoints;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro na estimativa de profundidade';
      updateState({
        isAnalyzing: false,
        error: errorMessage
      });
      return [];
    }
  }, [updateState, state.performance]);

  const analyzeMorphology = useCallback(async (objects: DetectedObject[]): Promise<Map<string, MorphologyAnalysis>> => {
    if (!analysis3DRef.current) return new Map();

    const startTime = performance.now();
    
    try {
      updateState({ isAnalyzing: true, error: null });

      const morphologyMap = new Map<string, MorphologyAnalysis>();
      
      for (const object of objects) {
        const analysis = await analysis3DRef.current.analyzeMorphology(object, state.depthPoints);
        morphologyMap.set(object.id, analysis);
      }

      const analysisTime = performance.now() - startTime;

      updateState({
        isAnalyzing: false,
        morphologyAnalysis: morphologyMap,
        performance: {
          ...state.performance,
          morphologyAnalysisTime: Math.round(analysisTime)
        }
      });

      return morphologyMap;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro na análise morfológica';
      updateState({
        isAnalyzing: false,
        error: errorMessage
      });
      return new Map();
    }
  }, [updateState, state.depthPoints, state.performance]);

  const reconstructMesh = useCallback(async (objectId: string, imageData: ImageData): Promise<Mesh3D | null> => {
    if (!analysis3DRef.current) return null;

    const startTime = performance.now();
    
    try {
      updateState({ isAnalyzing: true, error: null });

      const mesh = await analysis3DRef.current.reconstructMesh(state.depthPoints, imageData);
      const reconstructionTime = performance.now() - startTime;

      const newMeshes = new Map(state.meshes);
      newMeshes.set(objectId, mesh);

      updateState({
        isAnalyzing: false,
        meshes: newMeshes,
        performance: {
          ...state.performance,
          meshReconstructionTime: Math.round(reconstructionTime)
        }
      });

      return mesh;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro na reconstrução de malha';
      updateState({
        isAnalyzing: false,
        error: errorMessage
      });
      return null;
    }
  }, [updateState, state.depthPoints, state.meshes, state.performance]);

  const enableNightVision = useCallback((enabled: boolean) => {
    updateState({ isNightVisionEnabled: enabled });
  }, [updateState]);

  const updateNightVisionSettings = useCallback((settings: Partial<NightVisionEnhancement>) => {
    const newSettings = { ...state.nightVisionSettings, ...settings };
    updateState({ nightVisionSettings: newSettings });
  }, [updateState, state.nightVisionSettings]);

  const processNightVision = useCallback(async (imageData: ImageData): Promise<ImageData> => {
    if (!analysis3DRef.current || !state.isNightVisionEnabled) {
      return imageData;
    }

    try {
      return await analysis3DRef.current.enhanceNightVision(imageData, state.nightVisionSettings);
    } catch (error) {
      console.error('Erro no processamento de visão noturna:', error);
      return imageData;
    }
  }, [state.isNightVisionEnabled, state.nightVisionSettings]);

  const clearAnalysis = useCallback(() => {
    updateState({
      depthPoints: [],
      morphologyAnalysis: new Map(),
      meshes: new Map(),
      error: null,
      performance: {
        depthEstimationTime: 0,
        morphologyAnalysisTime: 0,
        meshReconstructionTime: 0
      }
    });
  }, [updateState]);

  const getObjectMorphology = useCallback((objectId: string): MorphologyAnalysis | null => {
    return state.morphologyAnalysis.get(objectId) || null;
  }, [state.morphologyAnalysis]);

  const getObjectMesh = useCallback((objectId: string): Mesh3D | null => {
    return state.meshes.get(objectId) || null;
  }, [state.meshes]);

  const exportAnalysisData = useCallback(() => {
    const morphologyData: Record<string, MorphologyAnalysis> = {};
    state.morphologyAnalysis.forEach((value, key) => {
      morphologyData[key] = value;
    });

    const meshData: Record<string, object> = {};
    state.meshes.forEach((mesh, key) => {
      meshData[key] = {
        vertexCount: mesh.vertices.length,
        faceCount: mesh.faces.length,
        boundingBox: {
          min: {
            x: Math.min(...mesh.vertices.map(v => v.x)),
            y: Math.min(...mesh.vertices.map(v => v.y)),
            z: Math.min(...mesh.vertices.map(v => v.z))
          },
          max: {
            x: Math.max(...mesh.vertices.map(v => v.x)),
            y: Math.max(...mesh.vertices.map(v => v.y)),
            z: Math.max(...mesh.vertices.map(v => v.z))
          }
        }
      };
    });

    return {
      timestamp: new Date().toISOString(),
      depthPointCount: state.depthPoints.length,
      morphologyAnalysis: morphologyData,
      meshes: meshData,
      performance: state.performance,
      nightVisionSettings: state.nightVisionSettings
    };
  }, [state]);

  const controls: Analysis3DControls = {
    estimateDepth,
    analyzeMorphology,
    reconstructMesh,
    enableNightVision,
    updateNightVisionSettings,
    processNightVision,
    clearAnalysis,
    getObjectMorphology,
    getObjectMesh,
    exportAnalysisData
  };

  return [state, controls];
}