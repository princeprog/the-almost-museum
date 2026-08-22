"use client";

import { useEffect, useId, useRef } from "react";
import type { ReactNode } from "react";

type DialogProps = {
  "aria-describedby"?: string;
  children: ReactNode;
  description?: string;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  title: string;
};

export function Dialog({ "aria-describedby": ariaDescribedBy, children, description, isOpen, onOpenChange, title }: Readonly<DialogProps>) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    if (!isOpen) return;

    const previousElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    dialogRef.current?.focus();
    return () => {
      previousElement?.focus();
    };
  }, [isOpen]);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      onOpenChange(false);
      return;
    }

    if (event.key !== "Tab") return;

    const focusableElements = Array.from(
      dialogRef.current?.querySelectorAll<HTMLElement>(
        "a[href], button, input, select, textarea, [tabindex]",
      ) ?? [],
    ).filter((element) => {
      const isHiddenInput = element instanceof HTMLInputElement && element.type === "hidden";
      const isInHiddenContainer = element.closest('[aria-hidden="true"], [hidden], [inert]') !== null;
      const styles = window.getComputedStyle(element);
      const isVisuallyHidden = styles.display === "none" || styles.visibility === "hidden";

      return element.tabIndex >= 0 && !element.hasAttribute("disabled") && !isHiddenInput && !isInHiddenContainer && !isVisuallyHidden;
    });

    if (focusableElements.length === 0) {
      event.preventDefault();
      dialogRef.current?.focus();
      return;
    }

    const firstElement = focusableElements[0];
    const lastElement = focusableElements.at(-1);
    const currentElement = document.activeElement;

    if (event.shiftKey && (currentElement === firstElement || currentElement === dialogRef.current)) {
      event.preventDefault();
      lastElement?.focus();
    } else if (!event.shiftKey && currentElement === lastElement) {
      event.preventDefault();
      firstElement.focus();
    }
  };

  if (!isOpen) return null;

  const describedBy = [ariaDescribedBy, description ? descriptionId : undefined].filter(Boolean).join(" ") || undefined;

  return (
    <div className="museum-dialog-backdrop" onMouseDown={() => onOpenChange(false)}>
      <div
        aria-describedby={describedBy}
        aria-labelledby={titleId}
        aria-modal="true"
        className="museum-dialog"
        onKeyDown={handleKeyDown}
        onMouseDown={(event) => event.stopPropagation()}
        ref={dialogRef}
        role="dialog"
        tabIndex={-1}
      >
        <div className="museum-dialog__header">
          <div>
            <p className="museum-eyebrow">Collection note</p>
            <h2 id={titleId}>{title}</h2>
            {description ? <p className="museum-dialog__description" id={descriptionId}>{description}</p> : null}
          </div>
          <button aria-label="Close dialog" className="museum-dialog__close" onClick={() => onOpenChange(false)} type="button">
            <span aria-hidden="true">×</span>
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
