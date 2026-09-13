import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Arrastre simple para los paneles flotantes: devuelve un offset {x,y} para
 * sumar a la posicion fija (top/right) via transform, y un onMouseDown para
 * poner en el elemento que actua de "agarradera" (ej. el titulo).
 */
export function useDraggable(storageKey: string) {
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const dragging = useRef(false);
  const start = useRef({ x: 0, y: 0, offX: 0, offY: 0 });

  useEffect(() => {
    chrome.storage.local.get(storageKey).then((stored) => {
      const saved = stored[storageKey] as { x: number; y: number } | undefined;
      if (saved) setOffset(saved);
    });
  }, [storageKey]);

  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      dragging.current = true;
      start.current = { x: e.clientX, y: e.clientY, offX: offset.x, offY: offset.y };
      e.preventDefault();
    },
    [offset],
  );

  useEffect(() => {
    function onMove(e: MouseEvent) {
      if (!dragging.current) return;
      const next = {
        x: start.current.offX + (e.clientX - start.current.x),
        y: start.current.offY + (e.clientY - start.current.y),
      };
      setOffset(next);
    }
    function onUp() {
      if (!dragging.current) return;
      dragging.current = false;
      chrome.storage.local.set({ [storageKey]: offset });
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offset, storageKey]);

  return { offset, onMouseDown };
}
