import { useEffect, useState } from "react";
import { Flower2 } from "lucide-react";

interface PujaImageProps {
  imageUrl?: string | null;
  name: string;
  className?: string;
}

export default function PujaImage({ imageUrl, name, className = "" }: PujaImageProps) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [imageUrl]);

  const unavailable = !imageUrl || failed;

  return (
    <div
      className={`relative aspect-[16/10] w-full overflow-hidden bg-[#eee5d6] ${className}`}
    >
      {unavailable ? (
        <div
          role="img"
          aria-label={`${name} image unavailable`}
          className="flex h-full w-full flex-col items-center justify-center gap-2 bg-[radial-gradient(ellipse_at_top,#f8f0e3_0%,#e8dcc8_100%)] text-[#92724f]"
        >
          <Flower2 className="h-8 w-8" strokeWidth={1.25} />
          <span className="text-xs font-medium tracking-wide">Image unavailable</span>
        </div>
      ) : (
        <img
          src={imageUrl}
          alt={`${name} puja ceremony`}
          loading="lazy"
          className="h-full w-full object-cover"
          onError={() => setFailed(true)}
        />
      )}
    </div>
  );
}