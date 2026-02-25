import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, Mail, ArrowLeft, RefreshCw, CheckCircle2, AlertCircle, Clock, ShieldCheck } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ThemedLogo } from '@/components/ui/themed-logo';

const VerificarEmail: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const email = searchParams.get('email') || '';
  const userName = searchParams.get('name') || '';
  
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [remainingSends, setRemainingSends] = useState(3);
  const [error, setError] = useState<string | null>(null);
  const [isVerified, setIsVerified] = useState(false);
  
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Cooldown timer
  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  // Check if verified via magic link
  useEffect(() => {
    const verified = searchParams.get('verified');
    if (verified === 'true') {
      setIsVerified(true);
      toast.success('Email verificado com sucesso!');
      // Redirect to /inicio
      setTimeout(() => navigate('/inicio'), 2000);
    }
  }, [searchParams, navigate]);

  // Handle OTP input
  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);
    setError(null);
    
    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    const newOtp = [...otp];
    pastedData.split('').forEach((char, i) => {
      if (i < 6) newOtp[i] = char;
    });
    setOtp(newOtp);
    
    // Focus last filled input or first empty
    const lastIndex = Math.min(pastedData.length - 1, 5);
    inputRefs.current[lastIndex]?.focus();
  };

  const handleVerify = async () => {
    const otpCode = otp.join('');
    if (otpCode.length !== 6) {
      setError('Digite o código de 6 dígitos');
      return;
    }

    setIsVerifying(true);
    setError(null);

    try {
      const { data, error } = await supabase.functions.invoke('verify-email-otp', {
        body: { email, otpCode }
      });

      if (error) throw error;

      if (data.success) {
        setIsVerified(true);
        toast.success('Email verificado com sucesso!');
        
        // Redirect to magic link or /inicio
        if (data.redirectUrl && data.redirectUrl.startsWith('http')) {
          window.location.href = data.redirectUrl;
        } else {
          setTimeout(() => navigate('/inicio'), 1500);
        }
      } else {
        setError(data.error || 'Código inválido');
        if (data.locked) {
          setOtp(['', '', '', '', '', '']);
        }
      }
    } catch (err: any) {
      console.error('Verification error:', err);
      setError(err.message || 'Erro ao verificar código');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0 || remainingSends <= 0) return;
    
    setIsResending(true);
    setError(null);

    try {
      const redirectUrl = `${window.location.origin}/verificar-email?email=${encodeURIComponent(email)}&name=${encodeURIComponent(userName)}`;
      
      const { data, error } = await supabase.functions.invoke('send-email-verification', {
        body: { email, redirectUrl, userName, isResend: true }
      });

      if (error) throw error;

      if (data.success) {
        toast.success('Novo código enviado!');
        setOtp(['', '', '', '', '', '']);
        inputRefs.current[0]?.focus();
        setCooldown(data.cooldownSeconds || 60);
        setRemainingSends(data.remainingSends ?? remainingSends - 1);
      } else if (data.cooldown) {
        setCooldown(data.waitSeconds || 60);
        setError(data.error);
      } else if (data.rateLimited) {
        setRemainingSends(0);
        setError(data.error);
      } else {
        setError(data.error || 'Erro ao reenviar');
      }
    } catch (err: any) {
      console.error('Resend error:', err);
      setError(err.message || 'Erro ao reenviar código');
    } finally {
      setIsResending(false);
    }
  };

  if (isVerified) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/30 p-4">
        <Card className="w-full max-w-md border-0 shadow-lg">
          <CardContent className="pt-12 pb-8 text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-green-600">Email Verificado!</h2>
            <p className="text-muted-foreground">Redirecionando para o próximo passo...</p>
            <Loader2 className="h-5 w-5 animate-spin mx-auto text-primary" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/30 p-4">
      {/* Back Button */}
      <Link 
        to="/login" 
        className="absolute top-4 left-4 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar
      </Link>

      <div className="w-full max-w-md space-y-6">
        {/* Logo */}
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <ThemedLogo className="h-14 w-14 object-contain" />
          </div>
          <h1 className="text-2xl font-bold text-primary">RXFin</h1>
        </div>

        <Card className="border-0 shadow-lg">
          <CardHeader className="space-y-1 pb-4 text-center">
            <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-2">
              <Mail className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="text-xl">Verifique seu email</CardTitle>
            <CardDescription>
              Enviamos um código de 6 dígitos para<br />
              <strong className="text-foreground">{email}</strong>
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {/* OTP Input */}
            <div className="flex justify-center gap-2" onPaste={handlePaste}>
              {otp.map((digit, index) => (
                <Input
                  key={index}
                  ref={el => inputRefs.current[index] = el}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={e => handleOtpChange(index, e.target.value)}
                  onKeyDown={e => handleKeyDown(index, e)}
                  className={`w-12 h-14 text-center text-2xl font-mono font-bold ${
                    error ? 'border-destructive' : ''
                  }`}
                  disabled={isVerifying}
                  autoFocus={index === 0}
                />
              ))}
            </div>

            {/* Error message */}
            {error && (
              <Alert variant="destructive" className="py-2">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Verify Button */}
            <Button 
              onClick={handleVerify}
              className="w-full"
              size="lg"
              disabled={isVerifying || otp.join('').length !== 6}
            >
              {isVerifying ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Verificando...
                </>
              ) : (
                <>
                  <ShieldCheck className="h-4 w-4 mr-2" />
                  Verificar Código
                </>
              )}
            </Button>

            {/* Resend section */}
            <div className="text-center space-y-3">
              <Button
                variant="ghost"
                onClick={handleResend}
                disabled={isResending || cooldown > 0 || remainingSends <= 0}
                className="text-sm"
              >
                {isResending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                {cooldown > 0 
                  ? `Aguarde ${cooldown}s`
                  : remainingSends <= 0
                  ? 'Limite de reenvio atingido'
                  : 'Reenviar código'
                }
              </Button>
              
              {remainingSends > 0 && remainingSends < 3 && (
                <p className="text-xs text-muted-foreground">
                  {remainingSends} reenvio(s) restante(s) nesta hora
                </p>
              )}
            </div>

            {/* Help text */}
            <Alert className="bg-muted/50 border-muted">
              <Clock className="h-4 w-4" />
              <AlertDescription className="text-sm">
                <strong>Não recebeu o email?</strong><br />
                Verifique sua pasta de spam/lixo eletrônico e aguarde 1-2 minutos. 
                O código expira em 15 minutos.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default VerificarEmail;
