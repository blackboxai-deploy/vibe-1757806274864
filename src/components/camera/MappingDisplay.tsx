'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function MappingDisplay() {
  return (
    <Card className="bg-black/20 border-green-500/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-green-300 text-sm">🗺️ Mapeamento SLAM</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-center py-8 text-slate-400">
          <p className="text-sm">Sistema de mapeamento em desenvolvimento</p>
          <Badge variant="secondary" className="mt-2">Em breve</Badge>
        </div>
      </CardContent>
    </Card>
  );
}