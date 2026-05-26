"use client";

import type { MouseEvent, ReactNode } from "react";

type HardNavigateLinkProps = {
  href: string;
  className?: string;
  ariaLabel?: string;
  title?: string;
  children: ReactNode;
};

export function HardNavigateLink({ href, className, ariaLabel, title, children }: HardNavigateLinkProps) {
  function navigate(event: MouseEvent<HTMLAnchorElement>) {
    if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) {
      return;
    }

    event.preventDefault();
    window.location.assign(href);
  }

  return (
    <a href={href} className={className} aria-label={ariaLabel} title={title} onClick={navigate}>
      {children}
    </a>
  );
}
