import React, { PropsWithChildren, useCallback, useEffect, useRef, useState } from 'react'

interface ModalDialogProps {
  open: boolean;
  onClose: () => void;
}

const ModalDialog: React.FC<PropsWithChildren<ModalDialogProps>> = ({ open, onClose: onCloseFunc, children }) => {

  const ref = useRef<HTMLDialogElement>(null);

  const [isLocalOpen, setIsLocalOpen] = useState(false);
  useEffect(() => {
    if (!isLocalOpen) setIsLocalOpen(open);

    if (isLocalOpen) {
      setTimeout(() => {
        setIsLocalOpen(open);
      }, 150);
    }
  }, [open])

  const onClose = useCallback(() => {
    ref.current?.close();
    onCloseFunc();
  }, [onCloseFunc, ref]);

  useEffect(() => {
    if (ref.current) {
      if (isLocalOpen) {
        if (!ref.current.open) {
          ref.current.showModal();
        }
      } else {
        ref.current.close();
      }
    }

    // Make sure when `ESC` (browser default) is clicked, we close the dialog
    if (isLocalOpen) {
      const refNode = ref.current;
      refNode?.addEventListener('close', onClose);
      return () => {
        refNode?.removeEventListener('close', onClose);
      };
    }
  }, [onClose, isLocalOpen]);

  if (!isLocalOpen) return null;

  const baseClasses = 'top-0 left-0 h-full w-full flex items-center justify-center bg-black/25 backdrop-blur-sm animate-fade-in cursor-auto z-50';
  const fadeOutClass = isLocalOpen && !open ? 'animate-fade-out opacity-0' : '';
  const combinedClasses = `${baseClasses} ${fadeOutClass}`;

  return (
    <dialog
      role="dialog"
      aria-modal="true"
      className={combinedClasses}
      ref={ref}
    >
      {children}
    </dialog>
  )
}

export default ModalDialog