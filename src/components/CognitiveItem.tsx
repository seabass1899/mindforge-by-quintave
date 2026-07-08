import { type CsItem } from "@/lib/cognitive-switch";

const itemColorClasses: Record<CsItem["color"], string> = {
  gold: "border-[#d4af37]/50 bg-[#d4af37]/15 text-[#f0d78c]",
  blue: "border-[#3b82f6]/40 bg-[#1e3a8a]/20 text-[#93c5fd]",
  violet: "border-[#8b5cf6]/40 bg-[#4c1d95]/20 text-[#c4b5fd]",
  green: "border-[#22c55e]/40 bg-[#14532d]/20 text-[#86efac]",
};

export function CognitiveItemDisplay({ item }: { item: CsItem }) {
  return (
    <div className={`flex flex-col items-center justify-center rounded-xl border p-4 ${itemColorClasses[item.color]}`}>
      <ShapeIcon shape={item.shape} />
      <span className="mt-3 font-mono text-2xl font-semibold">{item.number}</span>
      <span className="mt-2 text-[10px] uppercase tracking-wider opacity-70">
        {item.color} · {item.shape}
      </span>
    </div>
  );
}

function ShapeIcon({ shape }: { shape: CsItem["shape"] }) {
  if (shape === "circle") return <span className="h-10 w-10 rounded-full border-2 border-current" />;
  if (shape === "square") return <span className="h-10 w-10 rounded-md border-2 border-current" />;
  if (shape === "triangle") {
    return (
      <span
        className="h-0 w-0 border-x-[22px] border-b-[40px] border-x-transparent"
        style={{ borderBottomColor: "currentColor" }}
      />
    );
  }
  return <span className="h-10 w-10 rotate-45 rounded-md border-2 border-current" />;
}
