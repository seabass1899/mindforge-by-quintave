type Metric = {
  label: string;
  value: string | number;
};

export function MetricGrid({ metrics }: { metrics: Metric[] }) {
  const columns = metrics.length === 4 ? "grid-cols-4" : "grid-cols-2";

  return (
    <div className={`mb-6 grid ${columns} gap-3`}>
      {metrics.map((item) => (
        <div
          key={item.label}
          className="rounded-lg border border-white/[0.06] bg-[#0a0f1c]/80 px-3 py-2.5 text-center"
        >
          <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">{item.label}</p>
          <p className="mt-0.5 font-mono text-lg font-semibold text-[#d4af37]">{item.value}</p>
        </div>
      ))}
    </div>
  );
}
