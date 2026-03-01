import Link from 'next/link';

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gray-50">
      <h1 className="text-4xl font-bold text-gray-900 mb-2">RXFin</h1>
      <p className="text-gray-600 mb-8">Gestão financeira inteligente</p>
      <div className="flex gap-4">
        <Link
          href="/login"
          className="px-6 py-3 rounded-lg bg-[#1E40AF] text-white font-medium hover:bg-[#1E3A8A]"
        >
          Entrar
        </Link>
        <Link
          href="/register"
          className="px-6 py-3 rounded-lg border-2 border-[#1E40AF] text-[#1E40AF] font-medium hover:bg-[#1E40AF]/5"
        >
          Cadastrar
        </Link>
      </div>
    </div>
  );
}
