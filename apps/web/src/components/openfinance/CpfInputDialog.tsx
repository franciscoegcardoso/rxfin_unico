import React, { useState, useCallback } from 'react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, ShieldCheck } from 'lucide-react';

interface CpfInputDialogProps {
  open: boolean;
  isLoading: boolean;
  onSubmit: (cpf: string) => void;
  onCancel: () => void;
}

function formatCpf(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

function isValidCpf(cpf: string): boolean {
  const digits = cpf.replace(/\D/g, '');
  if (digits.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(digits)) return false;

  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(digits[i]) * (10 - i);
  let rem = (sum * 10) % 11;
  if (rem === 10) rem = 0;
  if (rem !== parseInt(digits[9])) return false;

  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(digits[i]) * (11 - i);
  rem = (sum * 10) % 11;
  if (rem === 10) rem = 0;
  return rem === parseInt(digits[10]);
}

export const CpfInputDialog: React.FC<CpfInputDialogProps> = ({
  open,
  isLoading,
  onSubmit,
  onCancel,
}) => {
  const [cpf, setCpf] = useState('');
  const [error, setError] = useState('');

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCpf(e.target.value);
    setCpf(formatted);
    setError('');
  }, []);

  const handleSubmit = useCallback(() => {
    const digits = cpf.replace(/\D/g, '');
    if (digits.length !== 11) {
      setError('Digite os 11 dígitos do CPF.');
      return;
    }
    if (!isValidCpf(digits)) {
      setError('CPF inválido. Verifique os dígitos.');
      return;
    }
    onSubmit(digits);
  }, [cpf, onSubmit]);

  return (
    <AlertDialog open={open}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Informe seu CPF</AlertDialogTitle>
          <AlertDialogDescription>
            Seu CPF é necessário para conectar via Open Finance. Ele será salvo de forma criptografada e preenchido automaticamente nas próximas conexões.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="py-2 space-y-3">
          <Input
            placeholder="000.000.000-00"
            value={cpf}
            onChange={handleChange}
            maxLength={14}
            inputMode="numeric"
            disabled={isLoading}
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>Armazenado com criptografia de ponta a ponta</span>
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel} disabled={isLoading}>
            Cancelar
          </AlertDialogCancel>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Salvando...
              </>
            ) : (
              'Salvar e Continuar'
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
