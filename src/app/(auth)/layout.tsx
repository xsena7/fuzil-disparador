export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-xl bg-brand-500 text-xl font-black text-white">F</div>
          <h1 className="text-lg font-bold tracking-tight">FUZIL DISPARADOR</h1>
        </div>
        {children}
      </div>
    </div>
  );
}
