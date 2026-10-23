// The app's logo: the rope-ring badge.

import Image from "next/image";

/** The badge logo (public/logo.png, made by scripts/make-icons.sh), cut to a
 * circle so the cream corners don't show on dark backgrounds. The file is big
 * (864 px); next/image sends each screen a small copy of the size it shows,
 * which is what `pixels` says (e.g. 28 for the header). */
export function BrandLogo({ pixels, className = "", alt = "" }: { pixels: number; className?: string; alt?: string }) {
  return (
    <Image
      src="/logo.png"
      alt={alt}
      width={pixels}
      height={pixels}
      sizes={`${pixels}px`}
      priority
      className={`rounded-[50%] ${className}`}
      style={{ width: pixels, height: pixels }}
    />
  );
}
