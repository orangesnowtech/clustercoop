import Image from "next/image";

/**
 * Cluster wordmark logo. Size via className height (e.g. "h-7"); width auto-
 * scales to the 1498×534 source aspect ratio.
 */
export function Logo({
  className = "h-7 w-auto",
  priority = false,
}: {
  className?: string;
  priority?: boolean;
}) {
  return (
    <Image
      src="/logo.png"
      alt="Cluster"
      width={1498}
      height={534}
      className={className}
      priority={priority}
    />
  );
}
