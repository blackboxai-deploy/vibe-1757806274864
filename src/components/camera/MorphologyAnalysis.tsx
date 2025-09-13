'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function MorphologyAnalysis() {
  return (
    <Card className="bg-black/20 border-purple-500/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-purple-300 text-sm">📐 Análise Morfológica 3D</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-center py-8 text-slate-400">
          <p className="text-sm">Análise 3D em desenvolvimento</p>
          <Badge variant="secondary" className="mt-2">Em breve</Badge>
        </div>
      </CardContent>
    </Card>
  );
}