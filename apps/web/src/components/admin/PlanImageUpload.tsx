import { useState, useRef } from 'react';
import { Upload, X, Image as ImageIcon, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface PlanImageUploadProps {
  currentImageUrl: string | null;
  planSlug: string;
  onImageChange: (url: string | null) => void;
}

const ACCEPTED_FORMATS = ['image/png', 'image/jpeg', 'image/webp'];
const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
const RECOMMENDED_SIZE = '512x512';

export function PlanImageUpload({ currentImageUrl, planSlug, onImageChange }: PlanImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentImageUrl);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate format
    if (!ACCEPTED_FORMATS.includes(file.type)) {
      toast.error('Formato não suportado', {
        description: 'Use PNG, JPG ou WEBP',
      });
      return;
    }

    // Validate size
    if (file.size > MAX_FILE_SIZE) {
      toast.error('Arquivo muito grande', {
        description: 'O tamanho máximo é 2MB',
      });
      return;
    }

    setIsUploading(true);

    try {
      // Create unique filename
      const timestamp = Date.now();
      const extension = file.name.split('.').pop();
      const fileName = `${planSlug || 'plan'}-${timestamp}.${extension}`;
      const filePath = `plans/${fileName}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('plan-assets')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('plan-assets')
        .getPublicUrl(filePath);

      setPreviewUrl(publicUrl);
      onImageChange(publicUrl);
      toast.success('Imagem carregada com sucesso!');
    } catch (error: any) {
      console.error('Error uploading image:', error);
      toast.error('Erro ao carregar imagem', {
        description: error.message,
      });
    } finally {
      setIsUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveImage = () => {
    setPreviewUrl(null);
    onImageChange(null);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <ImageIcon className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">Imagem do Plano</span>
      </div>
      
      <div className="flex items-start gap-4">
        {/* Preview area */}
        <div className={cn(
          "relative w-24 h-24 rounded-lg border-2 border-dashed flex items-center justify-center overflow-hidden",
          previewUrl ? "border-primary/30 bg-primary/5" : "border-muted-foreground/30 bg-muted/50"
        )}>
          {previewUrl ? (
            <>
              <img 
                src={previewUrl} 
                alt="Preview" 
                className="w-full h-full object-contain"
              />
              <button
                type="button"
                onClick={handleRemoveImage}
                className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 shadow-md hover:bg-destructive/80"
              >
                <X className="h-3 w-3" />
              </button>
            </>
          ) : (
            <ImageIcon className="h-8 w-8 text-muted-foreground/50" />
          )}
        </div>

        {/* Upload button and info */}
        <div className="flex-1 space-y-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".png,.jpg,.jpeg,.webp"
            onChange={handleFileSelect}
            className="hidden"
          />
          
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
          >
            {isUploading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Carregando...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                {previewUrl ? 'Trocar imagem' : 'Carregar imagem'}
              </>
            )}
          </Button>

          <div className="text-xs text-muted-foreground space-y-1">
            <p>• Formatos: PNG, JPG, WEBP</p>
            <p>• Tamanho recomendado: {RECOMMENDED_SIZE}px</p>
            <p>• Máximo: 2MB</p>
          </div>
        </div>
      </div>
    </div>
  );
}
