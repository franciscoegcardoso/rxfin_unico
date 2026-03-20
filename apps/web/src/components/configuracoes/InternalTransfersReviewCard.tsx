import React, { useState } from 'react'
import { ArrowLeftRight, Loader2, ScanSearch, Wand2 } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { toast } from 'sonner'
import { invalidateAfterInternalTransferToggle } from '@/lib/invalidateAfterInternalTransfer'
import { useAuth } from '@/contexts/AuthContext'
import type { Json } from '@/integrations/supabase/types'

function parsePreviewRows(data: Json | null): { rows: Array<Record<string, unknown>>; text: string } {
  if (data === null || data === undefined) {
    return { rows: [], text: '—' }
  }
  if (Array.isArray(data)) {
    const rows = data.filter((x) => x && typeof x === 'object') as Array<Record<string, unknown>>
    return { rows, text: JSON.stringify(data, null, 2) }
  }
  if (typeof data === 'object') {
    const o = data as Record<string, unknown>
    const nested =
      o.candidates ??
      o.transactions ??
      o.rows ??
      o.data ??
      (Array.isArray(o.preview) ? o.preview : null)
    if (Array.isArray(nested)) {
      const rows = nested.filter((x) => x && typeof x === 'object') as Array<Record<string, unknown>>
      return { rows, text: JSON.stringify(data, null, 2) }
    }
    return { rows: [], text: JSON.stringify(data, null, 2) }
  }
  return { rows: [], text: String(data) }
}

function rowLabel(row: Record<string, unknown>): string {
  const id = row.transaction_id ?? row.id ?? row.p_transaction_id
  const desc = row.description ?? row.memo ?? row.nome ?? row.title
  const parts = [id, desc].filter(Boolean)
  return parts.length ? String(parts[0]) + (parts[1] ? ` — ${parts[1]}` : '') : JSON.stringify(row)
}

export const InternalTransfersReviewCard: React.FC = () => {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewText, setPreviewText] = useState('')
  const [previewRows, setPreviewRows] = useState<Array<Record<string, unknown>>>([])
  const [previewLoading, setPreviewLoading] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [applyLoading, setApplyLoading] = useState(false)

  const runDryRun = async () => {
    setPreviewLoading(true)
    setPreviewOpen(true)
    setPreviewText('')
    setPreviewRows([])
    try {
      const { data, error } = await supabase.rpc('detect_and_mark_internal_transfers', {
        p_dry_run: true,
      })
      if (error) throw error
      const { rows, text } = parsePreviewRows(data as Json)
      setPreviewRows(rows)
      setPreviewText(text)
      if (rows.length === 0 && !text.trim()) {
        toast.message('Nenhum candidato retornado na pré-visualização.')
      }
    } catch (e) {
      console.error(e)
      toast.error('Não foi possível carregar a pré-visualização.')
      setPreviewOpen(false)
    } finally {
      setPreviewLoading(false)
    }
  }

  const runApplyAll = async () => {
    setApplyLoading(true)
    try {
      const { error } = await supabase.rpc('detect_and_mark_internal_transfers', {
        p_dry_run: false,
      })
      if (error) throw error
      toast.success('Transferências internas marcadas automaticamente.')
      await invalidateAfterInternalTransferToggle(queryClient, user?.id)
      setConfirmOpen(false)
    } catch (e) {
      console.error(e)
      toast.error('Não foi possível aplicar a detecção.')
    } finally {
      setApplyLoading(false)
    }
  }

  return (
    <>
      <Card className="border-dashed">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
              <ArrowLeftRight className="h-4 w-4 text-muted-foreground" />
            </div>
            <div>
              <CardTitle className="text-base">Transferências internas detectadas</CardTitle>
              <CardDescription>
                Pré-visualize ou marque automaticamente transferências entre suas contas (excluídas do fluxo de
                caixa).
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button type="button" variant="secondary" disabled={previewLoading} onClick={() => void runDryRun()}>
            {previewLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <ScanSearch className="mr-2 h-4 w-4" />
            )}
            Revisar transferências detectadas
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={applyLoading}
            onClick={() => setConfirmOpen(true)}
          >
            <Wand2 className="mr-2 h-4 w-4" />
            Marcar todas automaticamente
          </Button>
        </CardContent>
      </Card>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Pré-visualização (dry run)</DialogTitle>
            <DialogDescription>
              Candidatos que seriam marcados como transferência interna. Confirme na listagem de movimentações ou
              use &quot;Marcar todas automaticamente&quot;.
            </DialogDescription>
          </DialogHeader>
          {previewLoading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : previewRows.length > 0 ? (
            <ScrollArea className="max-h-64 rounded-md border">
              <ul className="divide-y p-2 text-sm">
                {previewRows.map((row, i) => (
                  <li key={i} className="py-2 px-1">
                    {rowLabel(row)}
                  </li>
                ))}
              </ul>
            </ScrollArea>
          ) : (
            <pre className="max-h-48 overflow-auto rounded-md bg-muted p-3 text-xs whitespace-pre-wrap">
              {previewText || '—'}
            </pre>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Marcar todas as transferências detectadas?</AlertDialogTitle>
            <AlertDialogDescription>
              Isso executa a detecção sem dry run e atualiza os totais de fluxo de caixa. Você pode ajustar
              depois em Movimentações.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={applyLoading}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={applyLoading}
              onClick={(e) => {
                e.preventDefault()
                void runApplyAll()
              }}
            >
              {applyLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirmar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
