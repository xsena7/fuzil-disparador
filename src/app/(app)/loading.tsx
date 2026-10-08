// Mostrado na hora enquanto a próxima tela carrega (navegação instantânea).
export default function Loading() {
  return (
    <div className="mx-auto max-w-6xl">
      <div className="skeleton mb-3 h-8 w-64" />
      <div className="skeleton mb-8 h-4 w-96" />
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton h-28" />)}
      </div>
      <div className="skeleton h-72" />
    </div>
  );
}
