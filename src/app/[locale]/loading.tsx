export default function Loading() {
  return (
    <div className="container-x py-10" aria-busy="true" aria-label="Loading">
      <div className="skeleton h-9 w-56" />
      <div className="mt-8 grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="card overflow-hidden">
            <div className="skeleton aspect-square" />
            <div className="space-y-2 p-3"><div className="skeleton h-3 w-1/3" /><div className="skeleton h-4 w-5/6" /><div className="skeleton h-5 w-1/2" /></div>
          </div>
        ))}
      </div>
    </div>
  );
}
