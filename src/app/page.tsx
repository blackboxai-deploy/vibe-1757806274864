'use client';

import { useState, useEffect } from 'react';
import CameraView from '@/components/camera/CameraView';
import CameraControls from '@/components/camera/CameraControls';
import ObjectDetection from '@/components/camera/ObjectDetection';
import MorphologyAnalysis from '@/components/camera/MorphologyAnalysis';
import MappingDisplay from '@/components/camera/MappingDisplay';
import NightVisionMode from '@/components/camera/NightVisionMode';
import AIProcessor from '@/components/analysis/AIProcessor';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function CameraApp() {
  const [activeTab, setActiveTab] = useState<string>('camera');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [systemStatus, setSystemStatus] = useState<'initializing' | 'ready' | 'error'>('initializing');

  // Inicialização do sistema
  useEffect(() => {
    const initializeSystem = async () => {
      try {
        // Simula inicialização dos sistemas de IA
        await new Promise(resolve => setTimeout(resolve, 2000));
        setSystemStatus('ready');
      } catch (error) {
        console.error('Erro na inicialização:', error);
        setSystemStatus('error');
      }
    };

    initializeSystem();
  }, []);

  const toggleFullscreen = async () => {
    try {
      if (!isFullscreen) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
      setIsFullscreen(!isFullscreen);
    } catch (error) {
      console.error('Erro ao alternar fullscreen:', error);
    }
  };

  if (systemStatus === 'initializing') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900">
        <div className="text-center space-y-6">
          <div className="w-16 h-16 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-white">AI Camera</h1>
            <p className="text-cyan-300">Inicializando sistemas de inteligência artificial...</p>
            <div className="flex justify-center space-x-2 mt-4">
              <Badge variant="secondary" className="bg-blue-900/50 text-blue-300">Detecção de Objetos</Badge>
              <Badge variant="secondary" className="bg-purple-900/50 text-purple-300">Análise 3D</Badge>
              <Badge variant="secondary" className="bg-green-900/50 text-green-300">Mapeamento SLAM</Badge>
              <Badge variant="secondary" className="bg-red-900/50 text-red-300">Visão Noturna</Badge>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (systemStatus === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-red-950 to-slate-900">
        <Card className="w-96 bg-red-900/20 border-red-500/30">
          <CardContent className="p-6 text-center space-y-4">
            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto">
              <span className="text-red-400 text-2xl">⚠</span>
            </div>
            <h1 className="text-xl font-bold text-red-400">Erro no Sistema</h1>
            <p className="text-red-300 text-sm">
              Falha na inicialização dos sistemas de IA. Verifique se o dispositivo suporta os recursos necessários.
            </p>
            <Button 
              onClick={() => window.location.reload()} 
              variant="destructive"
              className="w-full"
            >
              Tentar Novamente
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900">
      {/* Header */}
      <header className="border-b border-cyan-500/20 bg-black/20 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-8 h-8 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">AI</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">AI Camera</h1>
              <p className="text-xs text-cyan-300">Detecção • Análise 3D • Mapeamento • Visão Noturna</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <div className="flex space-x-1">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-xs text-green-400">Sistema Online</span>
            </div>
            <Button 
              onClick={toggleFullscreen}
              variant="ghost" 
              size="sm"
              className="text-cyan-300 hover:text-cyan-100"
            >
              {isFullscreen ? '⤓' : '⤢'}
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          {/* Navigation Tabs */}
          <TabsList className="grid w-full grid-cols-5 bg-black/40 border border-cyan-500/20">
            <TabsTrigger 
              value="camera" 
              className="data-[state=active]:bg-cyan-600 data-[state=active]:text-white"
            >
              📷 Câmera
            </TabsTrigger>
            <TabsTrigger 
              value="detection"
              className="data-[state=active]:bg-blue-600 data-[state=active]:text-white"
            >
              🎯 Detecção
            </TabsTrigger>
            <TabsTrigger 
              value="3d-analysis"
              className="data-[state=active]:bg-purple-600 data-[state=active]:text-white"
            >
              📐 Análise 3D
            </TabsTrigger>
            <TabsTrigger 
              value="mapping"
              className="data-[state=active]:bg-green-600 data-[state=active]:text-white"
            >
              🗺️ Mapeamento
            </TabsTrigger>
            <TabsTrigger 
              value="night-vision"
              className="data-[state=active]:bg-red-600 data-[state=active]:text-white"
            >
              🌙 Visão Noturna
            </TabsTrigger>
          </TabsList>

          {/* Camera Tab */}
          <TabsContent value="camera" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {/* Main Camera View */}
              <div className="lg:col-span-3">
                <Card className="bg-black/20 border-cyan-500/20 overflow-hidden">
                  <CardContent className="p-0">
                    <CameraView />
                  </CardContent>
                </Card>
              </div>
              
              {/* Camera Controls */}
              <div className="space-y-4">
                <CameraControls />
                <AIProcessor />
              </div>
            </div>
          </TabsContent>

          {/* Object Detection Tab */}
          <TabsContent value="detection" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <Card className="bg-black/20 border-blue-500/20">
                  <CardContent className="p-0">
                    <CameraView showDetection={true} />
                  </CardContent>
                </Card>
              </div>
              <div>
                <ObjectDetection />
              </div>
            </div>
          </TabsContent>

          {/* 3D Analysis Tab */}
          <TabsContent value="3d-analysis" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <Card className="bg-black/20 border-purple-500/20">
                  <CardContent className="p-0">
                    <CameraView showDepth={true} />
                  </CardContent>
                </Card>
              </div>
              <div>
                <MorphologyAnalysis />
              </div>
            </div>
          </TabsContent>

          {/* Mapping Tab */}
          <TabsContent value="mapping" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="bg-black/20 border-green-500/20">
                <CardContent className="p-0">
                  <CameraView showMapping={true} />
                </CardContent>
              </Card>
              <MappingDisplay />
            </div>
          </TabsContent>

          {/* Night Vision Tab */}
          <TabsContent value="night-vision" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <Card className="bg-black/20 border-red-500/20">
                  <CardContent className="p-0">
                    <CameraView nightVision={true} />
                  </CardContent>
                </Card>
              </div>
              <div>
                <NightVisionMode />
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </main>

      {/* Footer Status Bar */}
      <footer className="border-t border-cyan-500/20 bg-black/20 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-2">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center space-x-4">
              <Badge variant="outline" className="border-cyan-500/30 text-cyan-300">
                FPS: 30
              </Badge>
              <Badge variant="outline" className="border-blue-500/30 text-blue-300">
                Objetos: 0
              </Badge>
              <Badge variant="outline" className="border-purple-500/30 text-purple-300">
                Profundidade: Ativa
              </Badge>
              <Badge variant="outline" className="border-green-500/30 text-green-300">
                Mapa: 0 pontos
              </Badge>
            </div>
            <div className="text-slate-400">
              AI Camera v1.0 | ${window.location.origin} | Desenvolvido com Next.js
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}