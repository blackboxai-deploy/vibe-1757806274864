'use client';

import { useState } from 'react';
import { useAIDetection } from '@/hooks/use-ai-detection';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';

export default function ObjectDetection() {
  const [aiState, aiControls] = useAIDetection();
  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null);

  const objectCategories = [
    { name: 'Pessoas', count: 0, color: 'bg-blue-500' },
    { name: 'Veículos', count: 0, color: 'bg-green-500' },
    { name: 'Objetos', count: 0, color: 'bg-purple-500' },
    { name: 'Outros', count: 0, color: 'bg-orange-500' }
  ];

  // Categoriza objetos detectados
  const categorizedObjects = aiState.objects.reduce((acc, obj) => {
    const category = getCategoryForObject(obj.label);
    acc[category] = (acc[category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  function getCategoryForObject(label: string): string {
    const lowerLabel = label.toLowerCase();
    if (lowerLabel.includes('pessoa') || lowerLabel.includes('face')) return 'Pessoas';
    if (lowerLabel.includes('carro') || lowerLabel.includes('moto') || lowerLabel.includes('bicicleta')) return 'Veículos';
    if (lowerLabel.includes('telefone') || lowerLabel.includes('computador') || lowerLabel.includes('mesa')) return 'Objetos';
    return 'Outros';
  }

  // Atualiza contadores das categorias
  objectCategories.forEach(category => {
    category.count = categorizedObjects[category.name] || 0;
  });

  return (
    <div className="space-y-4">
      {/* Status da Detecção */}
      <Card className="bg-black/20 border-blue-500/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-blue-300 text-sm flex items-center justify-between">
            🎯 Detecção de Objetos
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${aiState.isEnabled ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
              <span className={`text-xs ${aiState.isEnabled ? 'text-green-400' : 'text-red-400'}`}>
                {aiState.isEnabled ? 'Ativa' : 'Inativa'}
              </span>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Estatísticas Gerais */}
          <div className="grid grid-cols-2 gap-3">
            <div className="text-center p-3 bg-slate-800/50 rounded">
              <p className="text-2xl font-bold text-cyan-400">{aiState.objects.length}</p>
              <p className="text-xs text-slate-400">Objetos Detectados</p>
            </div>
            <div className="text-center p-3 bg-slate-800/50 rounded">
              <p className="text-2xl font-bold text-green-400">{aiState.performance.fps}</p>
              <p className="text-xs text-slate-400">FPS de Processamento</p>
            </div>
          </div>

          {/* Performance */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-slate-400">Tempo de Processamento</span>
              <span className="text-white">{aiState.performance.processingTime}ms</span>
            </div>
            <Progress value={Math.min(100, aiState.performance.processingTime / 2)} className="h-1" />
          </div>

          {/* Confiança Média */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-slate-400">Confiança Média</span>
              <span className="text-white">{(aiState.confidence.average * 100).toFixed(1)}%</span>
            </div>
            <Progress value={aiState.confidence.average * 100} className="h-1" />
          </div>

          {/* Controles */}
          <div className="flex space-x-2">
            <Button 
              onClick={aiState.isEnabled ? aiControls.stopDetection : aiControls.startDetection}
              size="sm"
              className={`flex-1 ${aiState.isEnabled ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}`}
            >
              {aiState.isEnabled ? '⏹️ Parar' : '▶️ Iniciar'}
            </Button>
            <Button 
              onClick={aiControls.clearObjects}
              size="sm"
              variant="outline"
              className="flex-1"
            >
              🗑️ Limpar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Categorias de Objetos */}
      <Card className="bg-black/20 border-cyan-500/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-cyan-300 text-sm">📊 Categorias</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {objectCategories.map((category, index) => (
              <div key={index} className="flex items-center justify-between p-2 bg-slate-800/30 rounded">
                <div className="flex items-center space-x-2">
                  <div className={`w-3 h-3 rounded-full ${category.color}`}></div>
                  <span className="text-xs text-white">{category.name}</span>
                </div>
                <Badge variant="secondary" className="text-xs">
                  {category.count}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Lista de Objetos Detectados */}
      <Card className="bg-black/20 border-green-500/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-green-300 text-sm">🔍 Objetos Detectados</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-48">
            {aiState.objects.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                <p className="text-sm">Nenhum objeto detectado</p>
                <p className="text-xs mt-1">Inicie a detecção para ver os resultados</p>
              </div>
            ) : (
              <div className="space-y-2">
                {aiState.objects.map((object) => (
                  <div 
                    key={object.id}
                    className={`p-3 rounded border cursor-pointer transition-all ${
                      selectedObjectId === object.id 
                        ? 'bg-blue-900/30 border-blue-500' 
                        : 'bg-slate-800/30 border-slate-600 hover:border-slate-500'
                    }`}
                    onClick={() => setSelectedObjectId(selectedObjectId === object.id ? null : object.id)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-white capitalize">{object.label}</p>
                        <p className="text-xs text-slate-400">
                          Confiança: {(object.confidence * 100).toFixed(1)}%
                        </p>
                      </div>
                      <div className="text-right">
                        <Badge 
                          variant="secondary" 
                          className={`text-xs ${
                            object.confidence > 0.8 ? 'bg-green-600' : 
                            object.confidence > 0.6 ? 'bg-yellow-600' : 'bg-red-600'
                          }`}
                        >
                          {object.confidence > 0.8 ? 'Alta' : 
                           object.confidence > 0.6 ? 'Média' : 'Baixa'}
                        </Badge>
                      </div>
                    </div>
                    
                    {selectedObjectId === object.id && (
                      <div className="mt-3 pt-3 border-t border-slate-600 text-xs text-slate-300 space-y-1">
                        <p>Posição: ({object.center.x.toFixed(0)}, {object.center.y.toFixed(0)})</p>
                        <p>Dimensões: {object.bbox.width.toFixed(0)} × {object.bbox.height.toFixed(0)}px</p>
                        <p>Área: {object.area.toFixed(0)}px²</p>
                        <p>ID: {object.id.substring(0, 8)}...</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Configurações Rápidas */}
      <Card className="bg-black/20 border-purple-500/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-purple-300 text-sm">⚙️ Configurações Rápidas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <Button 
              onClick={() => aiControls.setConfidenceThreshold(0.5)}
              size="sm" 
              variant="outline"
              className="text-xs"
            >
              Baixa Precisão
            </Button>
            <Button 
              onClick={() => aiControls.setConfidenceThreshold(0.7)}
              size="sm" 
              variant="outline"
              className="text-xs"
            >
              Média Precisão
            </Button>
            <Button 
              onClick={() => aiControls.setConfidenceThreshold(0.85)}
              size="sm" 
              variant="outline"
              className="text-xs"
            >
              Alta Precisão
            </Button>
            <Button 
              onClick={() => aiControls.setConfidenceThreshold(0.95)}
              size="sm" 
              variant="outline"
              className="text-xs"
            >
              Máxima Precisão
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}