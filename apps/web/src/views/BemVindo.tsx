import React from 'react';
import { useParams, Navigate, useSearchParams } from 'react-router-dom';
import { WelcomeFree } from '@/components/bem-vindo/WelcomeFree';
import { WelcomeStarter } from '@/components/bem-vindo/WelcomeStarter';
import { WelcomePro } from '@/components/bem-vindo/WelcomePro';
import { WelcomeDenied } from '@/components/bem-vindo/WelcomeDenied';
import { WelcomePending } from '@/components/bem-vindo/WelcomePending';
import { WelcomePix } from '@/components/bem-vindo/WelcomePix';
import { WelcomeTrial } from '@/components/bem-vindo/WelcomeTrial';

const BemVindo: React.FC = () => {
  const { plan } = useParams<{ plan: string }>();
  const [searchParams] = useSearchParams();
  
  // Get optional status parameter for Guru redirects
  const status = searchParams.get('status');

  // Handle status-based routing (Guru webhook redirects)
  // URL formats: /bem-vindo/starter?status=negada, /bem-vindo/pro?status=pendente
  if (status) {
    const targetPlan = plan === 'starter' || plan === 'basic' ? 'starter' : 'pro';
    
    switch (status.toLowerCase()) {
      case 'negada':
      case 'denied':
        return <WelcomeDenied plan={targetPlan} />;
      case 'pendente':
      case 'pending':
        return <WelcomePending plan={targetPlan} />;
      case 'pix':
        return <WelcomePix plan={targetPlan} />;
      case 'trial':
        return <WelcomeTrial plan={targetPlan} />;
    }
  }

  // Direct plan routes for approved sales
  switch (plan) {
    case 'free':
      return <WelcomeFree />;
    case 'starter':
    case 'basic':
      return <WelcomeStarter />;
    case 'pro':
      return <WelcomePro />;
    // Status-only routes (alternative URL format)
    case 'negada':
    case 'denied':
      return <WelcomeDenied />;
    case 'pendente':
    case 'pending':
      return <WelcomePending />;
    case 'pix':
      return <WelcomePix />;
    case 'trial':
      return <WelcomeTrial />;
    default:
      return <Navigate to="/inicio" replace />;
  }
};

export default BemVindo;
