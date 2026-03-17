import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, HelpCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { IrDownloadGuideContent } from '@/components/shared/IrDownloadGuide';

interface IRTutorialGuideProps {
  variant?: 'inline' | 'dialog';
}

export const IRTutorialGuide: React.FC<IRTutorialGuideProps> = ({ variant = 'inline' }) => {
  const [isOpen, setIsOpen] = useState(false);

  if (variant === 'dialog') {
    return (
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <HelpCircle className="h-4 w-4" />
            Como obter o arquivo?
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Como baixar sua declaração do IR
            </DialogTitle>
          </DialogHeader>
          <IrDownloadGuideContent />
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Card className="border-dashed">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <HelpCircle className="h-5 w-5 text-primary" />
              Como baixar sua declaração do IR
            </CardTitle>
            <CardDescription className="mt-1">
              Siga o passo a passo para obter o arquivo no portal Gov.br
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <IrDownloadGuideContent />
      </CardContent>
    </Card>
  );
};
