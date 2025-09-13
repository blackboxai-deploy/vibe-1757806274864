'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function NightVisionMode() {
  return (
    <Card className="bg-black/20 border-red-500/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-red-300 text-sm">🌙 Visão Noturna</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-center py-8 text-slate-400">
          <p className="text-sm">Processamento de visão noturna em desenvolvimento</p>
          <Badge variant="secondary" className="mt-2">Em breve</Badge>
        </div>
      </CardContent>
    </Card>
  );
}