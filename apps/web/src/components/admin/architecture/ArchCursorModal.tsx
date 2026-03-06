import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Copy } from 'lucide-react';
import { toast } from 'sonner';

interface ArchCursorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  content: string;
}

export function ArchCursorModal({ open, onOpenChange, title, content }: ArchCursorModalProps) {
  const copy = () => {
    navigator.clipboard.writeText(content);
    toast.success('Prompt copiado para a área de transferência');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>Copie e use no Cursor (Composer)</DialogDescription>
        </DialogHeader>
        <div className="flex-1 min-h-0 flex flex-col gap-2">
          <textarea
            readOnly
            value={content}
            className="flex-1 min-h-[200px] w-full rounded-md border bg-muted/50 p-3 text-sm font-mono resize-none"
          />
          <Button variant="outline" size="sm" onClick={copy} className="gap-2 self-end">
            <Copy className="h-4 w-4" />
            Copiar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
