import { Button } from "@/components/ui/button";
import type { ReactNode } from "react";

type DownloadOriginalLinkProps = {
  href: string;
  className?: string;
  size?: "sm" | "md";
  children: ReactNode;
};

export function DownloadOriginalLink({ href, className, size = "md", children }: DownloadOriginalLinkProps) {
  return (
    <Button href={href} download size={size} className={className}>
      {children}
    </Button>
  );
}
