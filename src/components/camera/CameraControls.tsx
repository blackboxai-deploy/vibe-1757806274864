'use client';

import { useState, useEffect } from 'react';
import { useCamera } from '@/hooks/use-camera';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';

export default function CameraControls() {
  const [cameraState, cameraControls] = useCamera();
  const [availableCameras, setAvailableCameras] = useState<MediaDeviceInfo[]>([]);
  const [isCapturing, setIsCapturing] = useState(false);
  const [capturedPhotos, setCapturedPhotos] = useState<string[]>([]);
  const [settings, setSettings] = useState({
    resolution: 'hd',
    flashEnabled: false,
    focusMode: 'auto',
    exposureCompensation: 0
  });

  // Carrega câmeras disponíveis
  useEffect(() => {
    const loadCameras = async () => {
      const cameras = await cameraControls.getAvailableCameras();
      setAvailableCameras(cameras);
    };

    if (cameraState.hasPermission) {
      loadCameras();
    }
  }, [cameraState.hasPermission, cameraControls]);

  const handleCameraSwitch = async (deviceId: string) => {
    if (deviceId !== cameraState.currentCamera) {
      await cameraControls.switchCamera(deviceId);
    }
  };

  const handleCapturePhoto = async () => {
    setIsCapturing(true);
    
    try {
      const photoData = cameraControls.capturePhoto();
      if (photoData) {
        setCapturedPhotos(prev => [photoData, ...prev.slice(0, 4)]); // Mantém apenas as últimas 5
        
        // Simula salvamento/processamento
        await new Promise(resolve => setTimeout(resolve, 300));
      }
    } catch (error) {
      console.error('Erro ao capturar foto:', error);
    } finally {
      setIsCapturing(false);
    }
  };

  const handleDownloadPhoto = (photoData: string, index: number) => {
    const link = document.createElement('a');
    link.download = `ai-camera-photo-${Date.now()}-${index}.jpg`;
    link.href = photoData;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getCameraLabel = (camera: MediaDeviceInfo) => {
    if (camera.label) {
      return camera.label.length > 30 
        ? camera.label.substring(0, 30) + '...' 
        : camera.label;
    }
    return `Câmera ${camera.deviceId.substring(0, 8)}`;
  };

  return (
    <div className="space-y-4">
      {/* Status da Câmera */}
      <Card className="bg-black/20 border-cyan-500/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-cyan-300 text-sm flex items-center justify-between">
            📷 Status da Câmera
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${cameraState.isActive ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className={`text-xs ${cameraState.isActive ? 'text-green-400' : 'text-red-400'}`}>
                {cameraState.isActive ? 'Ativa' : 'Inativa'}
              </span>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {cameraState.capabilities && (
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-slate-400">Resolução:</span>
                <p className="text-white">{cameraState.capabilities.width}x{cameraState.capabilities.height}</p>
              </div>
              <div>
                <span className="text-slate-400">FPS:</span>
                <p className="text-white">{cameraState.capabilities.frameRate}</p>
              </div>
            </div>
          )}
          
          {cameraState.error && (
            <Badge variant="destructive" className="w-full text-center">
              {cameraState.error}
            </Badge>
          )}
          
          <div className="flex space-x-2">
            <Button 
              onClick={cameraState.isActive ? cameraControls.stopCamera : cameraControls.startCamera}
              disabled={cameraState.isLoading}
              size="sm"
              className={`flex-1 ${cameraState.isActive ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}`}
            >
              {cameraState.isLoading ? '⏳' : cameraState.isActive ? '⏹️ Parar' : '▶️ Iniciar'}
            </Button>
            
            <Button 
              onClick={handleCapturePhoto}
              disabled={!cameraState.isActive || isCapturing}
              size="sm"
              className="bg-cyan-600 hover:bg-cyan-700"
            >
              {isCapturing ? '📸' : '📷'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Seleção de Câmera */}
      {availableCameras.length > 1 && (
        <Card className="bg-black/20 border-blue-500/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-blue-300 text-sm">🎥 Selecionar Câmera</CardTitle>
          </CardHeader>
          <CardContent>
            <Select 
              value={cameraState.currentCamera || undefined}
              onValueChange={handleCameraSwitch}
              disabled={cameraState.isLoading}
            >
              <SelectTrigger className="bg-slate-800 border-slate-600">
                <SelectValue placeholder="Selecionar câmera" />
              </SelectTrigger>
              <SelectContent>
                {availableCameras.map((camera) => (
                  <SelectItem key={camera.deviceId} value={camera.deviceId}>
                    {getCameraLabel(camera)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      )}

      {/* Configurações de Captura */}
      <Card className="bg-black/20 border-purple-500/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-purple-300 text-sm">⚙️ Configurações</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Resolução */}
          <div className="space-y-2">
            <Label className="text-slate-300 text-xs">Qualidade de Captura</Label>
            <Select 
              value={settings.resolution}
              onValueChange={(value) => setSettings(prev => ({ ...prev, resolution: value }))}
            >
              <SelectTrigger className="bg-slate-800 border-slate-600 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="hd">HD (720p)</SelectItem>
                <SelectItem value="fhd">Full HD (1080p)</SelectItem>
                <SelectItem value="4k">4K (2160p)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Flash */}
          <div className="flex items-center justify-between">
            <Label className="text-slate-300 text-xs">Flash</Label>
            <Switch 
              checked={settings.flashEnabled}
              onCheckedChange={(checked) => setSettings(prev => ({ ...prev, flashEnabled: checked }))}
            />
          </div>

          <Separator className="bg-slate-700" />

          {/* Compensação de Exposição */}
          <div className="space-y-2">
            <Label className="text-slate-300 text-xs">Exposição: {settings.exposureCompensation}</Label>
            <Slider
              value={[settings.exposureCompensation]}
              onValueChange={([value]) => setSettings(prev => ({ ...prev, exposureCompensation: value }))}
              min={-2}
              max={2}
              step={0.1}
              className="w-full"
            />
          </div>

          {/* Modo de Foco */}
          <div className="space-y-2">
            <Label className="text-slate-300 text-xs">Modo de Foco</Label>
            <Select 
              value={settings.focusMode}
              onValueChange={(value) => setSettings(prev => ({ ...prev, focusMode: value }))}
            >
              <SelectTrigger className="bg-slate-800 border-slate-600 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">Automático</SelectItem>
                <SelectItem value="manual">Manual</SelectItem>
                <SelectItem value="macro">Macro</SelectItem>
                <SelectItem value="infinity">Infinito</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Fotos Capturadas */}
      {capturedPhotos.length > 0 && (
        <Card className="bg-black/20 border-green-500/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-green-300 text-sm">📁 Fotos Recentes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2">
              {capturedPhotos.slice(0, 4).map((photo, index) => (
                <div key={index} className="relative group">
                  <img 
                    src={photo} 
                    alt={`Captura ${index + 1}`}
                    className="w-full h-20 object-cover rounded border border-slate-600 cursor-pointer hover:border-green-400 transition-colors"
                    onClick={() => handleDownloadPhoto(photo, index)}
                  />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded flex items-center justify-center">
                    <Button size="sm" variant="ghost" className="text-white text-xs p-1">
                      💾 Salvar
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            
            {capturedPhotos.length > 4 && (
              <p className="text-xs text-slate-400 mt-2 text-center">
                +{capturedPhotos.length - 4} fotos adicionais
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}