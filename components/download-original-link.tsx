import type { ReactNode } from "react";

type DownloadOriginalLinkProps = {
  href: string;
  className?: string;
  children: ReactNode;
};

export function DownloadOriginalLink({ href, className, children }: DownloadOriginalLinkProps) {
  return (
    <a href={href} download className={className}>
      {children}
    </a>
  );
}
