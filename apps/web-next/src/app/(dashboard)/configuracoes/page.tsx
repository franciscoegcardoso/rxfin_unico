import { redirect } from 'next/navigation';

export default function ConfiguracoesPage() {
  redirect('/minha-conta?tab=perfil');
}
