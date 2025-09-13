'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';

export default function AIProcessor() {
  const [processingMode, setProcessingMode] = useState<'auto' | 'manual'>('auto');
  const [aiSettings, setAiSettings] = useState({
    detectionEnabled: true,
    morphologyEnabled: true,
    mappingEnabled: true,
    nightVisionEnabled: false,
    confidenceThreshold: 70,
    processingSpeed: 50,
    analysisDepth: 75
  });

  const [systemStats, setSystemStats] = useState({
    cpuUsage: 45,
    memoryUsage: 32,
    gpuUsage: 78,
    processingQueue: 3
  });

  const aiModules = [
    { 
      name: 'Detecção de Objetos', 
      status: aiSettings.detectionEnabled ? 'active' : 'inactive',
      accuracy: 94.2,
      icon: '🎯'
    },
    { 
      name: 'Análise Morfológica 3D', 
      status: aiSettings.morphologyEnabled ? 'active' : 'inactive',
      accuracy: 87.8,
      icon: '📐'
    },
    { 
      name: 'Mapeamento SLAM', 
      status: aiSettings.mappingEnabled ? 'active' : 'inactive',
      accuracy: 91.5,
      icon: '🗺️'
    },
    { 
      name: 'Visão Noturna', 
      status: aiSettings.nightVisionEnabled ? 'active' : 'inactive',
      accuracy: 89.3,
      icon: '🌙'
    }
  ];

  const handleSettingChange = (setting: string, value: boolean | number) => {
    setAiSettings(prev => ({
      ...prev,
      [setting]: value
    }));
  };

  const optimizePerformance = () => {
    // Simulação de otimização automática
    setSystemStats(prev => ({
      ...prev,
      cpuUsage: Math.max(20, prev.cpuUsage - 15),
      memoryUsage: Math.max(15, prev.memoryUsage - 10),
      processingQueue: Math.max(0, prev.processingQueue - 2)
    }));
  };

  const resetAIModules = () => {
    setAiSettings({
      detectionEnabled: true,
      morphologyEnabled: true,
      mappingEnabled: true,
      nightVisionEnabled: false,
      confidenceThreshold: 70,
      processingSpeed: 50,
      analysisDepth: 75
    });
  };

  return (
    <div className="space-y-4">
      {/* Status do Sistema IA */}
      <Card className="bg-black/20 border-cyan-500/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-cyan-300 text-sm flex items-center justify-between">
            🤖 Sistema de IA
            <Badge className={`${processingMode === 'auto' ? 'bg-green-600' : 'bg-orange-600'}`}>
              {processingMode === 'auto' ? 'Automático' : 'Manual'}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Módulos de IA */}
          <div className="space-y-2">
            {aiModules.map((module, index) => (
              <div key={index} className="flex items-center justify-between p-2 bg-slate-800/50 rounded">
                <div className="flex items-center space-x-2">
                  <span className="text-lg">{module.icon}</span>
                  <div>
                    <p className="text-xs font-medium text-white">{module.name}</p>
                    <p className="text-xs text-slate-400">Precisão: {module.accuracy}%</p>
                  </div>
                </div>
                <div className={`w-2 h-2 rounded-full ${module.status === 'active' ? 'bg-green-500' : 'bg-red-500'}`}></div>
              </div>
            ))}
          </div>

          {/* Controles de Modo */}
          <div className="flex space-x-2">
            <Button 
              onClick={() => setProcessingMode('auto')}
              variant={processingMode === 'auto' ? 'default' : 'outline'}
              size="sm"
              className="flex-1"
            >
              🔄 Auto
            </Button>
            <Button 
              onClick={() => setProcessingMode('manual')}
              variant={processingMode === 'manual' ? 'default' : 'outline'}
              size="sm"
              className="flex-1"
            >
              🎛️ Manual
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Configurações de IA */}
      <Card className="bg-black/20 border-purple-500/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-purple-300 text-sm">⚙️ Configurações de IA</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Switches de Módulos */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-slate-300 text-xs">🎯 Detecção de Objetos</Label>
              <Switch 
                checked={aiSettings.detectionEnabled}
                onCheckedChange={(checked) => handleSettingChange('detectionEnabled', checked)}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <Label className="text-slate-300 text-xs">📐 Análise 3D</Label>
              <Switch 
                checked={aiSettings.morphologyEnabled}
                onCheckedChange={(checked) => handleSettingChange('morphologyEnabled', checked)}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <Label className="text-slate-300 text-xs">🗺️ Mapeamento</Label>
              <Switch 
                checked={aiSettings.mappingEnabled}
                onCheckedChange={(checked) => handleSettingChange('mappingEnabled', checked)}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <Label className="text-slate-300 text-xs">🌙 Visão Noturna</Label>
              <Switch 
                checked={aiSettings.nightVisionEnabled}
                onCheckedChange={(checked) => handleSettingChange('nightVisionEnabled', checked)}
              />
            </div>
          </div>

          <Separator className="bg-slate-700" />

          {/* Sliders de Configuração */}
          <div className="space-y-3">
            <div>
              <Label className="text-slate-300 text-xs">
                Confiança Mínima: {aiSettings.confidenceThreshold}%
              </Label>
              <Slider
                value={[aiSettings.confidenceThreshold]}
                onValueChange={([value]) => handleSettingChange('confidenceThreshold', value)}
                min={30}
                max={95}
                step={5}
                className="mt-2"
              />
            </div>

            <div>
              <Label className="text-slate-300 text-xs">
                Velocidade de Processamento: {aiSettings.processingSpeed}%
              </Label>
              <Slider
                value={[aiSettings.processingSpeed]}
                onValueChange={([value]) => handleSettingChange('processingSpeed', value)}
                min={10}
                max={100}
                step={10}
                className="mt-2"
              />
            </div>

            <div>
              <Label className="text-slate-300 text-xs">
                Profundidade de Análise: {aiSettings.analysisDepth}%
              </Label>
              <Slider
                value={[aiSettings.analysisDepth]}
                onValueChange={([value]) => handleSettingChange('analysisDepth', value)}
                min={25}
                max={100}
                step={25}
                className="mt-2"
              />
            </div>
          </div>

          {/* Botões de Ação */}
          <div className="flex space-x-2">
            <Button 
              onClick={optimizePerformance}
              size="sm"
              variant="outline"
              className="flex-1 text-xs"
            >
              🚀 Otimizar
            </Button>
            <Button 
              onClick={resetAIModules}
              size="sm"
              variant="outline"
              className="flex-1 text-xs"
            >
              🔄 Reset
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Performance do Sistema */}
      <Card className="bg-black/20 border-orange-500/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-orange-300 text-sm">📊 Performance</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-slate-400">CPU</span>
              <span className="text-white">{systemStats.cpuUsage}%</span>
            </div>
            <Progress value={systemStats.cpuUsage} className="h-1" />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-slate-400">Memória</span>
              <span className="text-white">{systemStats.memoryUsage}%</span>
            </div>
            <Progress value={systemStats.memoryUsage} className="h-1" />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-slate-400">GPU</span>
              <span className="text-white">{systemStats.gpuUsage}%</span>
            </div>
            <Progress value={systemStats.gpuUsage} className="h-1" />
          </div>

          <Separator className="bg-slate-700" />

          <div className="flex justify-between items-center">
            <span className="text-slate-400 text-xs">Fila de Processamento</span>
            <Badge variant="secondary" className="text-xs">
              {systemStats.processingQueue} tarefas
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}