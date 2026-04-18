"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ReactElement } from "react";

type Toast = { id: number; message: string };

type UseToastsReturn = {
  toast: (message: string) => void;
  node: ReactElement;
};

export function useToasts(): UseToastsReturn {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const counter = useRef(0);

  const toast = useCallback((message: string) => {
    counter.current += 1;
    const id = counter.current;
    setToasts((list) => [...list, { id, message }]);
    setTimeout(() => {
      setToasts((list) => list.filter((t) => t.id !== id));
    }, 2600);
  }, []);

  useEffect(() => {
    return () => setToasts([]);
  }, []);

  const node = (
    <div className="toast-wrap" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className="toast">
          <span className="dot" aria-hidden />
          <span>{t.message}</span>
        </div>
      ))}
    </div>
  );

  return { toast, node };
}
