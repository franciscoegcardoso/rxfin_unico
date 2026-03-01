export default function AdminSlugPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  return (
    <div className="p-6">
      <h1 className="text-xl font-bold">Em migração</h1>
      <p className="text-muted-foreground mt-2">Esta página está sendo migrada.</p>
    </div>
  );
}
