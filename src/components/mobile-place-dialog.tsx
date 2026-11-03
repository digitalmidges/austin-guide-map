'use client';

import { useEffect, useRef, type ReactNode } from 'react';

export default function MobilePlaceDialog({ open, onClose, children }: { open: boolean; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!open || !dialog) return;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const { scrollX, scrollY } = window;
    const body = document.body;
    const previousStyle = { position: body.style.position, top: body.style.top, left: body.style.left, right: body.style.right, width: body.style.width, overflow: body.style.overflow };
    Object.assign(body.style, { position: 'fixed', top: `-${scrollY}px`, left: `-${scrollX}px`, right: '0', width: '100%', overflow: 'hidden' });
    if (!dialog.open) dialog.showModal();
    dialog.querySelector<HTMLButtonElement>('.photo-close')?.focus({ preventScroll: true });

    return () => {
      if (dialog.open) dialog.close();
      Object.assign(body.style, previousStyle);
      window.scrollTo(scrollX, scrollY);
      if (previousFocus?.isConnected && !document.querySelector('dialog[open]')) previousFocus.focus({ preventScroll: true });
    };
  }, [open]);

  return <dialog ref={ref} className="mobile-place-dialog" aria-labelledby="place-detail-title" onCancel={event => { event.preventDefault(); onClose(); }}>{children}</dialog>;
}
