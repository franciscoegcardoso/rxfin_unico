import { PaymentMethod } from '@/types/financial';
import { QrCode, CreditCard, Wallet, Banknote, Building, Barcode } from 'lucide-react';
import React from 'react';

export const formatCurrencyValue = (value: number, isHidden: boolean) => {
  if (isHidden) return '••••••';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

export const formatMonthLabelFull = (month: string) => {
  const [year, monthNum] = month.split('-');
  const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  return `${months[parseInt(monthNum) - 1]} ${year}`;
};

export const formatMonthLabelShort = (month: string) => {
  const [year, monthNum] = month.split('-');
  const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  return `${months[parseInt(monthNum) - 1]}/${year.slice(2)}`;
};

export const generateMonths = (startYear: number, numMonths: number = 24): string[] => {
  const months: string[] = [];
  const startDate = new Date(startYear, 0, 1);
  
  for (let i = 0; i < numMonths; i++) {
    const date = new Date(startDate);
    date.setMonth(startDate.getMonth() + i);
    const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    months.push(month);
  }
  
  return months;
};

export const getPaymentIconName = (method: PaymentMethod): string => {
  switch (method) {
    case 'pix': return 'QrCode';
    case 'credit_card': return 'CreditCard';
    case 'debit_card': return 'Building';
    case 'auto_debit': return 'Building';
    case 'boleto': return 'Barcode';
    case 'cash': return 'Banknote';
    default: return 'CreditCard';
  }
};

export const paymentMethodLabels: Record<string, string> = {
  'credit_card': 'Cartão de Crédito',
  'debit_card': 'Cartão de Débito',
  'auto_debit': 'Débito Automático',
  'pix': 'PIX',
  'boleto': 'Boleto',
  'cash': 'Dinheiro em Espécie',
  'other': 'Outros',
};
// sync
