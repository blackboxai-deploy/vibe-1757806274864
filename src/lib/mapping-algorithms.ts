import { DepthPoint, SpatialMap } from './ai-models';

export interface MapPoint3D {
  x: number;
  y: number;
  z: number;
  color: [number, number, number];
  confidence: number;
  timestamp: number;
}

export interface Landmark {
  id: string;
  position: [number, number, number];
  type: string;
  confidence: number;
  description: string;
  features: number[];
}

export interface Trajectory {
  points: Array<{
    position: [number, number, number];
    timestamp: number;
    confidence: number;
  }>;
  totalDistance: number;
  averageSpeed: number;
}

export class SLAMProcessor {
  private mapPoints: MapPoint3D[] = [];
  private landmarks: Landmark[] = [];
  private trajectory: Trajectory = {
    points: [],
    totalDistance: 0,
    averageSpeed: 0
  };
  private lastPosition: [number, number, number] = [0, 0, 0];

  constructor() {
    this.initializeCoordinateSystem();
  }

  private initializeCoordinateSystem() {
    // Sistema de coordenadas: X (direita), Y (cima), Z (frente)
    this.lastPosition = [0, 0, 0];
  }

  // Processamento SLAM principal
  async processFrame(
    imageData: ImageData, 
    depthPoints: DepthPoint[], 
    motionVector?: { x: number; y: number; z: number }
  ): Promise<SpatialMap> {
    // Estima movimento da câmera
    const cameraMovement = this.estimateCameraMovement(motionVector);
    
    // Atualiza posição atual
    this.updateTrajectory(cameraMovement);
    
    // Converte pontos de profundidade para coordenadas 3D
    const new3DPoints = this.convertDepthTo3D(depthPoints, imageData);
    
    // Adiciona novos pontos ao mapa
    this.addPointsToMap(new3DPoints);
    
    // Detecta e adiciona landmarks
    await this.detectLandmarks(new3DPoints);
    
    // Otimiza o mapa (remove pontos redundantes)
    this.optimizeMap();
    
    return this.getCurrentMap();
  }

  private estimateCameraMovement(motionVector?: { x: number; y: number; z: number }): [number, number, number] {
    if (motionVector) {
      return [motionVector.x * 0.01, motionVector.y * 0.01, motionVector.z * 0.01];
    }
    
    // Simulação de movimento baseado no tempo
    const time = Date.now();
    const movement: [number, number, number] = [
      Math.sin(time * 0.001) * 0.02,
      Math.cos(time * 0.0015) * 0.01,
      Math.sin(time * 0.0008) * 0.03
    ];
    
    return movement;
  }

  private updateTrajectory(movement: [number, number, number]) {
    const newPosition: [number, number, number] = [
      this.lastPosition[0] + movement[0],
      this.lastPosition[1] + movement[1],
      this.lastPosition[2] + movement[2]
    ];
    
    const distance = Math.sqrt(
      Math.pow(movement[0], 2) + 
      Math.pow(movement[1], 2) + 
      Math.pow(movement[2], 2)
    );
    
    this.trajectory.points.push({
      position: [...newPosition],
      timestamp: Date.now(),
      confidence: 0.8 + Math.random() * 0.2
    });
    
    this.trajectory.totalDistance += distance;
    
    // Mantém apenas os últimos 1000 pontos de trajetória
    if (this.trajectory.points.length > 1000) {
      this.trajectory.points.shift();
    }
    
    this.lastPosition = newPosition;
  }

  private convertDepthTo3D(depthPoints: DepthPoint[], imageData: ImageData): MapPoint3D[] {
    const { width, height, data } = imageData;
    const points: MapPoint3D[] = [];
    const focalLength = width * 0.5; // Estimativa da distância focal
    
    for (const depthPoint of depthPoints) {
      // Converte coordenadas de tela para coordenadas 3D da câmera
      const x_cam = (depthPoint.x - width / 2) / focalLength * depthPoint.depth;
      const y_cam = (height / 2 - depthPoint.y) / focalLength * depthPoint.depth;
      const z_cam = depthPoint.depth;
      
      // Transforma para coordenadas globais (adiciona posição da câmera)
      const x_global = this.lastPosition[0] + x_cam;
      const y_global = this.lastPosition[1] + y_cam;
      const z_global = this.lastPosition[2] + z_cam;
      
      // Obtém cor do pixel
      const pixelIndex = (depthPoint.y * width + depthPoint.x) * 4;
      const color: [number, number, number] = [
        data[pixelIndex] || 0,
        data[pixelIndex + 1] || 0,
        data[pixelIndex + 2] || 0
      ];
      
      points.push({
        x: x_global,
        y: y_global,
        z: z_global,
        color,
        confidence: depthPoint.confidence,
        timestamp: Date.now()
      });
    }
    
    return points;
  }

  private addPointsToMap(newPoints: MapPoint3D[]) {
    // Adiciona pontos com filtro de densidade para evitar redundância
    for (const point of newPoints) {
      const nearbyPoints = this.mapPoints.filter(existing => 
        this.euclideanDistance3D(point, existing) < 0.05 // 5cm de tolerância
      );
      
      if (nearbyPoints.length === 0) {
        this.mapPoints.push(point);
      } else {
        // Atualiza ponto existente se o novo tem maior confiança
        const bestExisting = nearbyPoints.reduce((a, b) => 
          a.confidence > b.confidence ? a : b
        );
        
        if (point.confidence > bestExisting.confidence) {
          const index = this.mapPoints.indexOf(bestExisting);
          this.mapPoints[index] = point;
        }
      }
    }
  }

  private euclideanDistance3D(a: MapPoint3D, b: MapPoint3D): number {
    return Math.sqrt(
      Math.pow(a.x - b.x, 2) + 
      Math.pow(a.y - b.y, 2) + 
      Math.pow(a.z - b.z, 2)
    );
  }

  private async detectLandmarks(points: MapPoint3D[]) {
    // Detecta características geométricas interessantes como landmarks
    const clusters = this.clusterPoints(points);
    
    for (const cluster of clusters) {
      if (cluster.length < 10) continue; // Muito pequeno para ser um landmark
      
      const centeroid = this.calculateCentroid(cluster);
      const landmarkType = this.classifyLandmark(cluster);
      
      // Verifica se já existe um landmark próximo
      const existingLandmark = this.landmarks.find(landmark => 
        this.euclideanDistance(landmark.position, centeroid) < 0.2
      );
      
      if (!existingLandmark) {
        const newLandmark: Landmark = {
          id: `landmark_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          position: centeroid,
          type: landmarkType,
          confidence: 0.7 + Math.random() * 0.3,
          description: this.generateLandmarkDescription(landmarkType, cluster),
          features: this.extractLandmarkFeatures(cluster)
        };
        
        this.landmarks.push(newLandmark);
      }
    }
    
    // Mantém apenas os landmarks mais recentes e confiáveis
    this.landmarks = this.landmarks
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 50);
  }

  private clusterPoints(points: MapPoint3D[]): MapPoint3D[][] {
    const clusters: MapPoint3D[][] = [];
    const visited = new Set<MapPoint3D>();
    const threshold = 0.1; // 10cm de distância para agrupamento
    
    for (const point of points) {
      if (visited.has(point)) continue;
      
      const cluster = this.expandCluster(point, points, threshold, visited);
      if (cluster.length > 5) {
        clusters.push(cluster);
      }
    }
    
    return clusters;
  }

  private expandCluster(
    point: MapPoint3D, 
    points: MapPoint3D[], 
    threshold: number, 
    visited: Set<MapPoint3D>
  ): MapPoint3D[] {
    const cluster = [point];
    visited.add(point);
    
    const neighbors = points.filter(p => 
      !visited.has(p) && this.euclideanDistance3D(point, p) < threshold
    );
    
    for (const neighbor of neighbors) {
      visited.add(neighbor);
      cluster.push(neighbor);
      
      // Expansão recursiva simplificada
      const subNeighbors = points.filter(p => 
        !visited.has(p) && this.euclideanDistance3D(neighbor, p) < threshold
      );
      
      for (const subNeighbor of subNeighbors.slice(0, 3)) { // Limita recursão
        if (!visited.has(subNeighbor)) {
          visited.add(subNeighbor);
          cluster.push(subNeighbor);
        }
      }
    }
    
    return cluster;
  }

  private calculateCentroid(points: MapPoint3D[]): [number, number, number] {
    const sum = points.reduce(
      (acc, point) => [acc[0] + point.x, acc[1] + point.y, acc[2] + point.z],
      [0, 0, 0]
    );
    
    return [
      sum[0] / points.length,
      sum[1] / points.length,
      sum[2] / points.length
    ];
  }

  private classifyLandmark(cluster: MapPoint3D[]): string {
    const types = ['parede', 'canto', 'objeto', 'superfície', 'estrutura'];
    
    // Análise simplificada baseada na distribuição dos pontos
    const bounds = this.calculateBounds(cluster);
    const volume = bounds.width * bounds.height * bounds.depth;
    
    if (bounds.width > bounds.height && bounds.width > bounds.depth) {
      return 'parede';
    } else if (volume < 0.01) {
      return 'superfície';
    } else {
      return types[Math.floor(Math.random() * types.length)];
    }
  }

  private calculateBounds(points: MapPoint3D[]) {
    const xs = points.map(p => p.x);
    const ys = points.map(p => p.y);
    const zs = points.map(p => p.z);
    
    return {
      minX: Math.min(...xs),
      maxX: Math.max(...xs),
      minY: Math.min(...ys),
      maxY: Math.max(...ys),
      minZ: Math.min(...zs),
      maxZ: Math.max(...zs),
      width: Math.max(...xs) - Math.min(...xs),
      height: Math.max(...ys) - Math.min(...ys),
      depth: Math.max(...zs) - Math.min(...zs)
    };
  }

  private generateLandmarkDescription(type: string, cluster: MapPoint3D[]): string {
    const size = cluster.length;
    const bounds = this.calculateBounds(cluster);
    
    return `${type} detectado com ${size} pontos, dimensões aproximadas: ${bounds.width.toFixed(2)}m x ${bounds.height.toFixed(2)}m x ${bounds.depth.toFixed(2)}m`;
  }

  private extractLandmarkFeatures(cluster: MapPoint3D[]): number[] {
    // Extrai características numéricas do landmark para reconhecimento
    const bounds = this.calculateBounds(cluster);
    const centroid = this.calculateCentroid(cluster);
    const avgColor = this.calculateAverageColor(cluster);
    
    return [
      bounds.width,
      bounds.height,
      bounds.depth,
      centroid[0],
      centroid[1],
      centroid[2],
      cluster.length,
      avgColor[0] / 255,
      avgColor[1] / 255,
      avgColor[2] / 255
    ];
  }

  private calculateAverageColor(points: MapPoint3D[]): [number, number, number] {
    const sum = points.reduce(
      (acc, point) => [
        acc[0] + point.color[0],
        acc[1] + point.color[1],
        acc[2] + point.color[2]
      ],
      [0, 0, 0]
    );
    
    return [
      sum[0] / points.length,
      sum[1] / points.length,
      sum[2] / points.length
    ];
  }

  private euclideanDistance(a: [number, number, number], b: [number, number, number]): number {
    return Math.sqrt(
      Math.pow(a[0] - b[0], 2) + 
      Math.pow(a[1] - b[1], 2) + 
      Math.pow(a[2] - b[2], 2)
    );
  }

  private optimizeMap() {
    // Remove pontos muito antigos ou com baixa confiança
    const now = Date.now();
    const maxAge = 30000; // 30 segundos
    
    this.mapPoints = this.mapPoints.filter(point => 
      now - point.timestamp < maxAge && point.confidence > 0.3
    );
    
    // Mantém no máximo 10000 pontos para performance
    if (this.mapPoints.length > 10000) {
      this.mapPoints = this.mapPoints
        .sort((a, b) => b.confidence - a.confidence)
        .slice(0, 10000);
    }
  }

  getCurrentMap(): SpatialMap {
    return {
      points: this.mapPoints.map(point => ({
        x: point.x,
        y: point.y,
        z: point.z,
        color: point.color
      })),
      landmarks: this.landmarks.map(landmark => ({
        id: landmark.id,
        position: landmark.position,
        type: landmark.type,
        confidence: landmark.confidence
      })),
      boundaries: this.generateBoundaries()
    };
  }

  private generateBoundaries(): Array<{
    points: Array<[number, number, number]>;
    type: 'wall' | 'floor' | 'ceiling' | 'object';
  }> {
    // Implementação simplificada de detecção de limites
    const boundaries = [];
    
    // Detecta plano do chão (pontos com Y baixo)
    const floorPoints = this.mapPoints
      .filter(p => p.y < this.lastPosition[1] - 0.5)
      .slice(0, 100);
      
    if (floorPoints.length > 10) {
      boundaries.push({
        points: floorPoints.map(p => [p.x, p.y, p.z] as [number, number, number]),
        type: 'floor' as const
      });
    }
    
    return boundaries;
  }

  getTrajectory(): Trajectory {
    return this.trajectory;
  }

  resetMap() {
    this.mapPoints = [];
    this.landmarks = [];
    this.trajectory = { points: [], totalDistance: 0, averageSpeed: 0 };
    this.lastPosition = [0, 0, 0];
  }
}