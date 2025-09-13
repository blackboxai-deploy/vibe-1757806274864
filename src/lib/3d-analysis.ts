import { DetectedObject, DepthPoint, MorphologyAnalysis } from './ai-models';

export interface NightVisionEnhancement {
  brightness: number;
  contrast: number;
  gamma: number;
  noiseReduction: number;
  edgeEnhancement: number;
}

export interface Point3D {
  x: number;
  y: number;
  z: number;
}

export interface Mesh3D {
  vertices: Point3D[];
  faces: number[][];
  normals: Point3D[];
  textureCoords: { u: number; v: number }[];
}

export class Analysis3D {
  private imageProcessor: ImageProcessor;

  constructor() {
    this.imageProcessor = new ImageProcessor();
  }

  // Processamento de visão noturna
  async enhanceNightVision(
    imageData: ImageData, 
    settings: Partial<NightVisionEnhancement> = {}
  ): Promise<ImageData> {
    const defaultSettings: NightVisionEnhancement = {
      brightness: 1.5,
      contrast: 1.3,
      gamma: 0.7,
      noiseReduction: 0.8,
      edgeEnhancement: 0.4
    };

    const config = { ...defaultSettings, ...settings };
    let enhanced = new ImageData(
      new Uint8ClampedArray(imageData.data), 
      imageData.width, 
      imageData.height
    );

    enhanced = this.imageProcessor.adjustBrightness(enhanced, config.brightness);
    enhanced = this.imageProcessor.adjustContrast(enhanced, config.contrast);
    enhanced = this.imageProcessor.adjustGamma(enhanced, config.gamma);
    enhanced = this.imageProcessor.denoiseImage(enhanced, config.noiseReduction);
    enhanced = this.imageProcessor.enhanceEdges(enhanced, config.edgeEnhancement);
    enhanced = this.imageProcessor.applyThermalEffect(enhanced);

    return enhanced;
  }

  // Estimativa de profundidade monocular
  async estimateDepth(imageData: ImageData): Promise<DepthPoint[]> {
    const { width, height, data } = imageData;
    const depthPoints: DepthPoint[] = [];
    const step = 20;

    for (let y = 0; y < height; y += step) {
      for (let x = 0; x < width; x += step) {
        const idx = (y * width + x) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        
        const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
        const localContrast = this.calculateLocalContrast(data, x, y, width, height);
        const depth = Math.min(1, luminance * 0.7 + localContrast * 0.3 + Math.random() * 0.1);
        
        depthPoints.push({
          x,
          y,
          depth,
          confidence: 0.6 + Math.random() * 0.4
        });
      }
    }

    return depthPoints;
  }

  // Análise morfológica de objetos detectados
  async analyzeMorphology(object: DetectedObject, depthPoints: DepthPoint[]): Promise<MorphologyAnalysis> {
    const { bbox } = object;
    
    const objectDepthPoints = depthPoints.filter(point => 
      point.x >= bbox.x && point.x <= bbox.x + bbox.width &&
      point.y >= bbox.y && point.y <= bbox.y + bbox.height
    );

    if (objectDepthPoints.length === 0) {
      return this.createDefaultMorphologyAnalysis(object);
    }

    const depths = objectDepthPoints.map(p => p.depth);
    const minDepth = Math.min(...depths);
    const maxDepth = Math.max(...depths);

    const pixelToMeterRatio = 0.001;
    const width3D = bbox.width * pixelToMeterRatio;
    const height3D = bbox.height * pixelToMeterRatio;
    const depth3D = (maxDepth - minDepth) * 2;

    return {
      objectId: object.id,
      volume: width3D * height3D * depth3D,
      surfaceArea: 2 * (width3D * height3D + width3D * depth3D + height3D * depth3D),
      dimensions: {
        width: width3D,
        height: height3D,
        depth: depth3D
      },
      shape: this.classifyShape(bbox, objectDepthPoints),
      complexity: this.calculateComplexity(objectDepthPoints),
      symmetry: this.calculateSymmetry(objectDepthPoints, bbox)
    };
  }

  // Reconstrução de malha 3D
  async reconstructMesh(depthPoints: DepthPoint[], imageData: ImageData): Promise<Mesh3D> {
    const { width, height } = imageData;
    const vertices: Point3D[] = [];
    const faces: number[][] = [];
    const normals: Point3D[] = [];
    const textureCoords: { u: number; v: number }[] = [];

    const depthGrid = this.organizePointsInGrid(depthPoints, width, height);
    
    for (let y = 0; y < height; y += 10) {
      for (let x = 0; x < width; x += 10) {
        const depthPoint = depthGrid[y]?.[x];
        if (depthPoint) {
          const point3D = this.convertTo3D(x, y, depthPoint.depth, width, height);
          vertices.push(point3D);
          textureCoords.push({ u: x / width, v: y / height });
        }
      }
    }

    const gridWidth = Math.floor(width / 10);
    for (let y = 0; y < Math.floor(height / 10) - 1; y++) {
      for (let x = 0; x < gridWidth - 1; x++) {
        const topLeft = y * gridWidth + x;
        const topRight = topLeft + 1;
        const bottomLeft = (y + 1) * gridWidth + x;
        const bottomRight = bottomLeft + 1;

        if (vertices[topLeft] && vertices[topRight] && vertices[bottomLeft] && vertices[bottomRight]) {
          faces.push([topLeft, topRight, bottomLeft]);
          faces.push([topRight, bottomRight, bottomLeft]);
        }
      }
    }

    for (const face of faces) {
      const v1 = vertices[face[0]];
      const v2 = vertices[face[1]];
      const v3 = vertices[face[2]];
      normals.push(this.calculateFaceNormal(v1, v2, v3));
    }

    return { vertices, faces, normals, textureCoords };
  }

  private createDefaultMorphologyAnalysis(object: DetectedObject): MorphologyAnalysis {
    return {
      objectId: object.id,
      volume: 0,
      surfaceArea: 0,
      dimensions: { width: 0, height: 0, depth: 0 },
      shape: 'indefinido',
      complexity: 0,
      symmetry: 0
    };
  }

  private calculateLocalContrast(data: Uint8ClampedArray, x: number, y: number, width: number, height: number): number {
    const radius = 5;
    let sum = 0;
    let count = 0;

    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const nx = x + dx;
        const ny = y + dy;
        
        if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
          const idx = (ny * width + nx) * 4;
          const luminance = (0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2]) / 255;
          sum += luminance;
          count++;
        }
      }
    }

    const avgLuminance = sum / count;
    const centerIdx = (y * width + x) * 4;
    const centerLuminance = (0.299 * data[centerIdx] + 0.587 * data[centerIdx + 1] + 0.114 * data[centerIdx + 2]) / 255;
    
    return Math.abs(centerLuminance - avgLuminance);
  }

  private classifyShape(bbox: { x: number; y: number; width: number; height: number }, depthPoints: DepthPoint[]): string {
    const aspectRatio = bbox.width / bbox.height;
    const depthVariation = this.calculateDepthVariation(depthPoints);
    
    if (aspectRatio > 1.5) return 'retangular';
    if (aspectRatio < 0.7) return 'vertical';
    if (depthVariation < 0.1) return 'plano';
    if (depthVariation > 0.5) return 'irregular';
    return 'cúbico';
  }

  private calculateComplexity(depthPoints: DepthPoint[]): number {
    if (depthPoints.length < 2) return 0;
    
    let complexity = 0;
    for (let i = 1; i < depthPoints.length; i++) {
      const diff = Math.abs(depthPoints[i].depth - depthPoints[i-1].depth);
      complexity += diff;
    }
    
    return Math.min(1, complexity / depthPoints.length);
  }

  private calculateSymmetry(depthPoints: DepthPoint[], bbox: { x: number; y: number; width: number; height: number }): number {
    const centerX = bbox.x + bbox.width / 2;
    const leftPoints = depthPoints.filter(p => p.x < centerX);
    const rightPoints = depthPoints.filter(p => p.x > centerX);
    
    if (leftPoints.length === 0 || rightPoints.length === 0) return 0;
    
    const leftAvgDepth = leftPoints.reduce((a, b) => a + b.depth, 0) / leftPoints.length;
    const rightAvgDepth = rightPoints.reduce((a, b) => a + b.depth, 0) / rightPoints.length;
    
    return Math.max(0, 1 - Math.abs(leftAvgDepth - rightAvgDepth));
  }

  private calculateDepthVariation(depthPoints: DepthPoint[]): number {
    if (depthPoints.length < 2) return 0;
    
    const depths = depthPoints.map(p => p.depth);
    const min = Math.min(...depths);
    const max = Math.max(...depths);
    
    return max - min;
  }

  private organizePointsInGrid(depthPoints: DepthPoint[], width: number, height: number): DepthPoint[][] {
    const grid: DepthPoint[][] = [];
    
    for (let y = 0; y < height; y++) {
      grid[y] = [];
    }
    
    for (const point of depthPoints) {
      const x = Math.floor(point.x);
      const y = Math.floor(point.y);
      
      if (y >= 0 && y < height && x >= 0 && x < width) {
        grid[y][x] = point;
      }
    }
    
    return grid;
  }

  private convertTo3D(x: number, y: number, depth: number, width: number, height: number): Point3D {
    const focalLength = width * 0.5;
    const principalPointX = width * 0.5;
    const principalPointY = height * 0.5;
    
    const z = depth * 10;
    const realX = (x - principalPointX) * z / focalLength;
    const realY = (principalPointY - y) * z / focalLength;
    
    return { x: realX, y: realY, z };
  }

  private calculateFaceNormal(v1: Point3D, v2: Point3D, v3: Point3D): Point3D {
    const u = { x: v2.x - v1.x, y: v2.y - v1.y, z: v2.z - v1.z };
    const v = { x: v3.x - v1.x, y: v3.y - v1.y, z: v3.z - v1.z };
    
    const normal = {
      x: u.y * v.z - u.z * v.y,
      y: u.z * v.x - u.x * v.z,
      z: u.x * v.y - u.y * v.x
    };
    
    const length = Math.sqrt(normal.x ** 2 + normal.y ** 2 + normal.z ** 2);
    
    return {
      x: normal.x / length,
      y: normal.y / length,
      z: normal.z / length
    };
  }
}

class ImageProcessor {
  adjustBrightness(imageData: ImageData, factor: number): ImageData {
    const data = new Uint8ClampedArray(imageData.data);
    
    for (let i = 0; i < data.length; i += 4) {
      data[i] = Math.min(255, data[i] * factor);
      data[i + 1] = Math.min(255, data[i + 1] * factor);
      data[i + 2] = Math.min(255, data[i + 2] * factor);
    }
    
    return new ImageData(data, imageData.width, imageData.height);
  }

  adjustContrast(imageData: ImageData, factor: number): ImageData {
    const data = new Uint8ClampedArray(imageData.data);
    const contrast = (factor - 1) * 255;
    const factorContrast = (259 * (contrast + 255)) / (255 * (259 - contrast));
    
    for (let i = 0; i < data.length; i += 4) {
      data[i] = Math.max(0, Math.min(255, factorContrast * (data[i] - 128) + 128));
      data[i + 1] = Math.max(0, Math.min(255, factorContrast * (data[i + 1] - 128) + 128));
      data[i + 2] = Math.max(0, Math.min(255, factorContrast * (data[i + 2] - 128) + 128));
    }
    
    return new ImageData(data, imageData.width, imageData.height);
  }

  adjustGamma(imageData: ImageData, gamma: number): ImageData {
    const data = new Uint8ClampedArray(imageData.data);
    const gammaCorrection = 1 / gamma;
    
    for (let i = 0; i < data.length; i += 4) {
      data[i] = Math.min(255, 255 * Math.pow(data[i] / 255, gammaCorrection));
      data[i + 1] = Math.min(255, 255 * Math.pow(data[i + 1] / 255, gammaCorrection));
      data[i + 2] = Math.min(255, 255 * Math.pow(data[i + 2] / 255, gammaCorrection));
    }
    
    return new ImageData(data, imageData.width, imageData.height);
  }

  denoiseImage(imageData: ImageData, strength: number): ImageData {
    const { width, height } = imageData;
    const data = new Uint8ClampedArray(imageData.data);
    const output = new Uint8ClampedArray(data);
    
    const kernel = [[1, 2, 1], [2, 4, 2], [1, 2, 1]];
    const kernelWeight = 16;
    
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        for (let c = 0; c < 3; c++) {
          let sum = 0;
          
          for (let ky = -1; ky <= 1; ky++) {
            for (let kx = -1; kx <= 1; kx++) {
              const idx = ((y + ky) * width + (x + kx)) * 4 + c;
              sum += data[idx] * kernel[ky + 1][kx + 1];
            }
          }
          
          const originalIdx = (y * width + x) * 4 + c;
          const filtered = sum / kernelWeight;
          output[originalIdx] = data[originalIdx] * (1 - strength) + filtered * strength;
        }
      }
    }
    
    return new ImageData(output, width, height);
  }

  enhanceEdges(imageData: ImageData, strength: number): ImageData {
    const { width, height } = imageData;
    const data = new Uint8ClampedArray(imageData.data);
    const output = new Uint8ClampedArray(data);
    
    const sobelX = [[-1, 0, 1], [-2, 0, 2], [-1, 0, 1]];
    const sobelY = [[-1, -2, -1], [0, 0, 0], [1, 2, 1]];
    
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        let gx = 0, gy = 0;
        
        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            const idx = ((y + ky) * width + (x + kx)) * 4;
            const luminance = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
            
            gx += luminance * sobelX[ky + 1][kx + 1];
            gy += luminance * sobelY[ky + 1][kx + 1];
          }
        }
        
        const magnitude = Math.sqrt(gx * gx + gy * gy);
        const originalIdx = (y * width + x) * 4;
        
        for (let c = 0; c < 3; c++) {
          const enhanced = Math.min(255, data[originalIdx + c] + magnitude * strength);
          output[originalIdx + c] = enhanced;
        }
      }
    }
    
    return new ImageData(output, width, height);
  }

  applyThermalEffect(imageData: ImageData): ImageData {
    const data = new Uint8ClampedArray(imageData.data);
    
    for (let i = 0; i < data.length; i += 4) {
      const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      const normalized = gray / 255;
      
      if (normalized < 0.25) {
        data[i] = 0;
        data[i + 1] = Math.floor(normalized * 4 * 100);
        data[i + 2] = Math.floor(255 - normalized * 4 * 100);
      } else if (normalized < 0.5) {
        data[i] = 0;
        data[i + 1] = Math.floor(255 - (normalized - 0.25) * 4 * 155);
        data[i + 2] = Math.floor((normalized - 0.25) * 4 * 255);
      } else if (normalized < 0.75) {
        data[i] = Math.floor((normalized - 0.5) * 4 * 255);
        data[i + 1] = 255;
        data[i + 2] = 0;
      } else {
        data[i] = 255;
        data[i + 1] = Math.floor(255 - (normalized - 0.75) * 4 * 255);
        data[i + 2] = 0;
      }
    }
    
    return new ImageData(data, imageData.width, imageData.height);
  }
}