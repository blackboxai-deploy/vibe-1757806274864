'use client';

import { useEffect, useRef, useState } from 'react';
import { useCamera } from '@/hooks/use-camera';
import { useAIDetection } from '@/hooks/use-ai-detection';
import { use3DAnalysis } from '@/hooks/use-3d-analysis';
import { useMapping } from '@/hooks/use-mapping';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface CameraViewProps {
  showDetection?: boolean;
  showDepth?: boolean;
  showMapping?: boolean;
  nightVision?: boolean;
}

export default function CameraView({ 
  showDetection = false, 
  showDepth = false, 
  showMapping = false, 
  nightVision = false 
}: CameraViewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  
  const [cameraState, cameraControls] = useCamera();
  const [aiState, aiControls] = useAIDetection();
  const [analysisState, analysisControls] = use3DAnalysis();
  const [mappingState, mappingControls] = useMapping();
  
  const [viewportSize, setViewportSize] = useState({ width: 640, height: 480 });

  // Inicialização da câmera
  useEffect(() => {
    const initCamera = async () => {
      const success = await cameraControls.initialize();
      if (success && videoRef.current) {
        videoRef.current.id = 'camera-video';
      }
    };

    initCamera();
  }, [cameraControls]);

   // Configuração do canvas overlay
  useEffect(() => {
    const updateCanvasSize = () => {
      if (videoRef.current && canvasRef.current && overlayCanvasRef.current) {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        const overlay = overlayCanvasRef.current;
        
        const rect = video.getBoundingClientRect();
        const width = video.videoWidth || rect.width;
        const height = video.videoHeight || rect.height;
        
        canvas.width = width;
        canvas.height = height;
        overlay.width = width;
        overlay.height = height;
        
        setViewportSize({ width, height });
      }
    };

    const video = videoRef.current;
    if (video) {
      video.addEventListener('loadedmetadata', updateCanvasSize);
      video.addEventListener('resize', updateCanvasSize);
      
      return () => {
        video.removeEventListener('loadedmetadata', updateCanvasSize);
        video.removeEventListener('resize', updateCanvasSize);
      };
    }
    
    return undefined;
  }, [cameraState.stream]);

  // Configuração dos modos de análise
  useEffect(() => {
    if (showDetection) {
      aiControls.startDetection();
    } else {
      aiControls.stopDetection();
    }
  }, [showDetection, aiControls]);

  useEffect(() => {
    analysisControls.enableNightVision(nightVision);
  }, [nightVision, analysisControls]);

  useEffect(() => {
    if (showMapping) {
      mappingControls.startMapping();
    } else {
      mappingControls.stopMapping();
    }
  }, [showMapping, mappingControls]);

  // Loop principal de processamento
  useEffect(() => {
    const renderOverlays = () => {
      const overlay = overlayCanvasRef.current;
      if (!overlay) return;

      const ctx = overlay.getContext('2d');
      if (!ctx) return;

      ctx.clearRect(0, 0, overlay.width, overlay.height);

      // Overlay de detecção de objetos
      if (showDetection && aiState.objects.length > 0) {
        renderObjectDetection(ctx);
      }

      // Overlay de profundidade
      if (showDepth && analysisState.depthPoints.length > 0) {
        renderDepthVisualization(ctx);
      }

      // Overlay de mapeamento
      if (showMapping && mappingState.mapPoints.length > 0) {
        renderMappingVisualization(ctx);
      }
    };

    const processFrame = async () => {
      if (!videoRef.current || !canvasRef.current || !cameraState.isActive) {
        animationFrameRef.current = requestAnimationFrame(processFrame);
        return;
      }

      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      
      if (!ctx || video.readyState !== video.HAVE_ENOUGH_DATA) {
        animationFrameRef.current = requestAnimationFrame(processFrame);
        return;
      }

      // Captura frame atual
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

      // Processamento de visão noturna
      let processedImageData = imageData;
      if (nightVision) {
        processedImageData = await analysisControls.processNightVision(imageData);
        ctx.putImageData(processedImageData, 0, 0);
      }

      // Processamento de detecção de objetos
      if (showDetection && aiState.isEnabled) {
        await aiControls.processFrame(processedImageData);
      }

      // Processamento de análise 3D
      if (showDepth) {
        await analysisControls.estimateDepth(processedImageData);
      }

      // Processamento de mapeamento
      if (showMapping && mappingState.isActive) {
        const depthPoints = analysisState.depthPoints;
        await mappingControls.processFrame(processedImageData, depthPoints);
      }

      // Renderiza overlays
      renderOverlays();

      animationFrameRef.current = requestAnimationFrame(processFrame);
    };

    if (cameraState.isActive) {
      processFrame();
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [cameraState.isActive, showDetection, showDepth, showMapping, nightVision, aiState.isEnabled, aiState.objects, mappingState.isActive, mappingState.mapPoints, analysisState.depthPoints, aiControls, analysisControls, mappingControls]);



  const renderObjectDetection = (ctx: CanvasRenderingContext2D) => {
    ctx.strokeStyle = '#00ffff';
    ctx.fillStyle = '#00ffff';
    ctx.lineWidth = 2;
    ctx.font = '14px Inter, sans-serif';

    for (const obj of aiState.objects) {
      const { bbox, label, confidence } = obj;
      
      // Bounding box
      ctx.strokeRect(bbox.x, bbox.y, bbox.width, bbox.height);
      
      // Label background
      const labelText = `${label} (${(confidence * 100).toFixed(1)}%)`;
      const textMetrics = ctx.measureText(labelText);
      const labelWidth = textMetrics.width + 10;
      const labelHeight = 20;
      
      ctx.fillStyle = 'rgba(0, 255, 255, 0.8)';
      ctx.fillRect(bbox.x, bbox.y - labelHeight, labelWidth, labelHeight);
      
      // Label text
      ctx.fillStyle = '#000000';
      ctx.fillText(labelText, bbox.x + 5, bbox.y - 5);
      
      // Center point
      ctx.fillStyle = '#00ffff';
      ctx.beginPath();
      ctx.arc(obj.center.x, obj.center.y, 3, 0, 2 * Math.PI);
      ctx.fill();
    }
  };

  const renderDepthVisualization = (ctx: CanvasRenderingContext2D) => {
    for (const point of analysisState.depthPoints) {
      const intensity = 1 - point.depth;
      const alpha = point.confidence;
      
      ctx.fillStyle = `rgba(255, ${Math.floor(intensity * 255)}, 0, ${alpha * 0.7})`;
      ctx.fillRect(point.x - 1, point.y - 1, 2, 2);
    }
  };

  const renderMappingVisualization = (ctx: CanvasRenderingContext2D) => {
    // Renderiza pontos do mapa
    ctx.fillStyle = 'rgba(0, 255, 0, 0.5)';
    for (const point of mappingState.mapPoints.slice(0, 1000)) { // Limita para performance
      const x = (point.x + 5) * (viewportSize.width / 10); // Normaliza coordenadas
      const y = viewportSize.height - ((point.y + 5) * (viewportSize.height / 10));
      
      if (x >= 0 && x < viewportSize.width && y >= 0 && y < viewportSize.height) {
        ctx.fillRect(x, y, 1, 1);
      }
    }

    // Renderiza landmarks
    ctx.fillStyle = 'rgba(255, 255, 0, 0.8)';
    ctx.font = '12px Inter, sans-serif';
    
    for (const landmark of mappingState.landmarks.slice(0, 10)) { // Limita para performance
      const x = (landmark.position[0] + 5) * (viewportSize.width / 10);
      const y = viewportSize.height - ((landmark.position[1] + 5) * (viewportSize.height / 10));
      
      if (x >= 0 && x < viewportSize.width && y >= 0 && y < viewportSize.height) {
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, 2 * Math.PI);
        ctx.fill();
        ctx.fillText(landmark.type, x + 8, y + 4);
      }
    }
  };

  const startCamera = async () => {
    await cameraControls.startCamera();
  };

  if (!cameraState.hasPermission) {
    return (
      <Card className="aspect-video bg-slate-900/50 border-red-500/30">
        <CardContent className="flex items-center justify-center h-full">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto">
              <span className="text-red-400 text-2xl">📷</span>
            </div>
            <h3 className="text-lg font-semibold text-white">Acesso à Câmera Necessário</h3>
            <p className="text-slate-300 text-sm max-w-sm">
              Para usar os recursos de IA, precisamos acessar sua câmera. Clique no botão abaixo para conceder permissão.
            </p>
            <Button 
              onClick={cameraControls.requestPermission}
              className="bg-cyan-600 hover:bg-cyan-700"
            >
              Permitir Acesso à Câmera
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (cameraState.error) {
    return (
      <Card className="aspect-video bg-red-900/20 border-red-500/30">
        <CardContent className="flex items-center justify-center h-full">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto">
              <span className="text-red-400 text-2xl">⚠</span>
            </div>
            <h3 className="text-lg font-semibold text-red-400">Erro na Câmera</h3>
            <p className="text-red-300 text-sm max-w-sm">{cameraState.error}</p>
            <Button 
              onClick={startCamera}
              variant="destructive"
            >
              Tentar Novamente
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden">
      {/* Video Element */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="w-full h-full object-cover"
      />
      
      {/* Hidden Canvas for Processing */}
      <canvas
        ref={canvasRef}
        className="hidden"
      />
      
      {/* Overlay Canvas */}
      <canvas
        ref={overlayCanvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none"
      />
      
      {/* Status Badges */}
      <div className="absolute top-4 left-4 flex flex-wrap gap-2">
        {showDetection && (
          <Badge className="bg-blue-600/80 backdrop-blur-sm">
            🎯 Detecção: {aiState.objects.length} objetos
          </Badge>
        )}
        {showDepth && (
          <Badge className="bg-purple-600/80 backdrop-blur-sm">
            📐 Profundidade: {analysisState.depthPoints.length} pontos
          </Badge>
        )}
        {showMapping && (
          <Badge className="bg-green-600/80 backdrop-blur-sm">
            🗺️ Mapa: {mappingState.mapPoints.length} pontos
          </Badge>
        )}
        {nightVision && (
          <Badge className="bg-red-600/80 backdrop-blur-sm">
            🌙 Visão Noturna Ativa
          </Badge>
        )}
      </div>

      {/* Performance Info */}
      <div className="absolute top-4 right-4">
        <Badge className="bg-black/60 backdrop-blur-sm text-cyan-300">
          FPS: {aiState.performance.fps} | Processamento: {aiState.performance.processingTime}ms
        </Badge>
      </div>

      {/* Loading State */}
      {(cameraState.isLoading || !cameraState.isActive) && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
          <div className="text-center space-y-3">
            <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-cyan-300 text-sm">
              {cameraState.isLoading ? 'Inicializando câmera...' : 'Câmera inativa'}
            </p>
            {!cameraState.isActive && cameraState.hasPermission && (
              <Button 
                onClick={startCamera} 
                size="sm"
                className="bg-cyan-600 hover:bg-cyan-700"
              >
                Iniciar Câmera
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}