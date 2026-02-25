import React, { useState, useRef, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Shield, CheckCircle2, Loader2, AlertTriangle, QrCode } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface AdminMfaEnrollmentProps {
  isEnrolled: boolean;
  onMfaComplete: () => void;
}

type Step = 'start' | 'qr' | 'verify' | 'success';

export const AdminMfaEnrollment: React.FC<AdminMfaEnrollmentProps> = ({ isEnrolled, onMfaComplete }) => {
  const [step, setStep] = useState<Step>(isEnrolled ? 'verify' : 'start');
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when verify step is active
  useEffect(() => {
    if (step === 'verify') {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [step]);

  // Load existing factor if enrolled
  useEffect(() => {
    if (isEnrolled && !factorId) {
      supabase.auth.mfa.listFactors().then(({ data }) => {
        const totp = data?.totp?.[0];
        if (totp) setFactorId(totp.id);
      });
    }
  }, [isEnrolled, factorId]);

  const handleEnroll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: 'RXfin Admin',
      });
      if (error) throw error;
      setQrCode(data.totp.qr_code);
      setFactorId(data.id);
      setStep('qr');
    } catch (err: any) {
      setError(err.message || 'Erro ao gerar QR Code');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleVerify = useCallback(async () => {
    if (!factorId || code.length !== 6) return;
    setLoading(true);
    setError(null);
    try {
      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({ factorId });
      if (challengeError) throw challengeError;

      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challengeData.id,
        code,
      });
      if (verifyError) throw verifyError;

      await supabase.auth.refreshSession();

      setStep('success');
      setTimeout(() => onMfaComplete(), 1500);
    } catch (err: any) {
      setError(err.message || 'Código inválido');
      setCode('');
      setTimeout(() => inputRef.current?.focus(), 100);
    } finally {
      setLoading(false);
    }
  }, [factorId, code, onMfaComplete]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && code.length === 6) {
      handleVerify();
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <div className="mx-auto rounded-full bg-primary/10 p-3 mb-2">
          <Shield className="h-6 w-6 text-primary" />
        </div>
        <CardTitle className="text-lg">Autenticação MFA</CardTitle>
        <CardDescription>
          {step === 'start' && 'Configure a autenticação de dois fatores para acessar o painel admin.'}
          {step === 'qr' && 'Escaneie o QR Code com seu aplicativo autenticador (Google Authenticator, Authy, etc).'}
          {step === 'verify' && 'Digite o código de 6 dígitos do seu aplicativo autenticador.'}
          {step === 'success' && 'Autenticação concluída com sucesso!'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Step: Start enrollment */}
        {step === 'start' && (
          <Button onClick={handleEnroll} disabled={loading} className="w-full gap-2">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <QrCode className="h-4 w-4" />}
            Gerar QR Code
          </Button>
        )}

        {/* Step: Show QR */}
        {step === 'qr' && qrCode && (
          <div className="flex flex-col items-center gap-4">
            <div className="rounded-lg border p-2 bg-white">
              <img src={qrCode} alt="QR Code TOTP" className="w-48 h-48" />
            </div>
            <Button onClick={() => setStep('verify')} variant="outline" className="w-full">
              Já escaneei — digitar código
            </Button>
          </div>
        )}

        {/* Step: Verify code */}
        {step === 'verify' && (
          <div className="space-y-4">
            <Input
              ref={inputRef}
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              onKeyDown={handleKeyDown}
              placeholder="000000"
              className="text-center text-2xl font-mono tracking-[0.5em] h-14"
              autoComplete="one-time-code"
            />
            <Button
              onClick={handleVerify}
              disabled={code.length !== 6 || loading}
              className="w-full gap-2"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Shield className="h-4 w-4" />}
              Verificar
            </Button>
          </div>
        )}

        {/* Step: Success */}
        {step === 'success' && (
          <div className="flex flex-col items-center gap-3 py-4">
            <CheckCircle2 className="h-12 w-12 text-green-500" />
            <p className="text-sm font-medium text-green-700 dark:text-green-400">MFA Verificado!</p>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
