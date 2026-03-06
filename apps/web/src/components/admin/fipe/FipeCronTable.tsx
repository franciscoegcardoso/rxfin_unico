import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { FipeAdminSummary } from '@/hooks/useFipeAdminSummary';

interface FipeCronTableProps {
  data: FipeAdminSummary | null;
}

export function FipeCronTable({ data }: FipeCronTableProps) {
  if (!data?.cron?.length) return null;

  const fipeCrons = data.cron.filter((j) => j.name.toLowerCase().includes('fipe'));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cron jobs FIPE</CardTitle>
        <CardDescription>Jobs agendados com "fipe" no nome</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left p-3 font-medium">Nome</th>
                <th className="text-left p-3 font-medium">Schedule</th>
                <th className="text-left p-3 font-medium">Status</th>
                <th className="text-left p-3 font-medium">Último run</th>
                <th className="text-left p-3 font-medium">Falhas 7d</th>
              </tr>
            </thead>
            <tbody>
              {fipeCrons.map((job, i) => (
                <tr key={i} className="border-b last:border-0">
                  <td className="p-3 font-mono text-xs">{job.name}</td>
                  <td className="p-3 font-mono text-xs">{job.schedule}</td>
                  <td className="p-3">
                    <Badge variant={job.active ? 'default' : 'secondary'}>
                      {job.active ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </td>
                  <td className="p-3 text-muted-foreground">
                    {job.last_run?.start_time
                      ? format(new Date(job.last_run.start_time), "dd/MM/yyyy HH:mm", { locale: ptBR })
                      : '—'}
                  </td>
                  <td className="p-3 tabular-nums">{job.failures_7d ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {fipeCrons.length === 0 && (
          <p className="text-sm text-muted-foreground py-4">Nenhum cron com "fipe" no nome.</p>
        )}
      </CardContent>
    </Card>
  );
}
