import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export default async function CartoesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900">Cartões</h1>
      <p className="mt-2 text-gray-600">Em construção</p>
    </div>
  );
}
