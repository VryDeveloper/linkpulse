/* eslint-disable @next/next/no-img-element */

/** Bandeira em imagem (emojis de bandeira não aparecem no Windows). */
export function Flag({ code, className = "" }: { code: string | null | undefined; className?: string }) {
  if (!code || !/^[A-Z]{2}$/i.test(code)) return null;
  const cc = code.toLowerCase();
  return (
    <img
      src={`https://flagcdn.com/w20/${cc}.png`}
      srcSet={`https://flagcdn.com/w40/${cc}.png 2x`}
      width={16}
      height={12}
      alt={code.toUpperCase()}
      title={code.toUpperCase()}
      loading="lazy"
      className={`inline-block h-3 w-4 shrink-0 rounded-[2px] object-cover align-[-1px] ${className}`}
    />
  );
}
