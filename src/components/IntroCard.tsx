export function IntroCard({
  text,
  buttonText,
  onStart,
}: {
  text: string;
  buttonText: string;
  onStart: () => void;
}) {
  return (
    <div className="mx-auto max-w-md text-center">
      <p className="text-sm leading-relaxed text-zinc-400">{text}</p>
      <button
        type="button"
        onClick={onStart}
        className="mt-6 inline-flex h-12 w-full items-center justify-center rounded-lg bg-gradient-to-r from-[#c9a227] to-[#d4af37] px-8 text-sm font-semibold tracking-wide text-[#060912] shadow-[0_0_24px_-4px_rgba(212,175,55,0.45)] transition hover:brightness-110 sm:w-auto"
      >
        {buttonText}
      </button>
    </div>
  );
}
