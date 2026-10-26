import { useCallback, useRef, useState } from "react";
import { Modal } from "../modal";
import { ModalHeader } from "../modal-header";
import { Move } from 'lucide-react';


type CropModalProps = {
  isOpen: boolean;
  imageSrc: string;
  onSave: (croppedDataUrl: string) => void;
  onCancel: () => void;
};

export function CropModal({ isOpen, imageSrc, onSave, onCancel }: CropModalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Drag state
  const dragState = useRef({ dragging: false, startX: 0, startY: 0, offsetX: 0, offsetY: 0 });
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  // Pointer events rather than mouse events, so the image can also be dragged
  // with a finger.
  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    dragState.current = {
      dragging: true,
      startX: e.clientX - offset.x,
      startY: e.clientY - offset.y,
      offsetX: offset.x,
      offsetY: offset.y,
    };
  };

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragState.current.dragging) return;
      e.preventDefault();
      setOffset(() => {
        const newX = e.clientX - dragState.current.startX;
        const newY = e.clientY - dragState.current.startY;

        return {
          x: Math.max(Math.min(newX, 150), -150),
          y: Math.max(Math.min(newY, 150), -150),
        };
      });
    },
    []
  );

  const handlePointerUp = () => {
    dragState.current.dragging = false;
  };

  const handleSave = () => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img) return;

    const size = 200;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Draw circle clip
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
    ctx.clip();

    // The circle preview area in the modal is 200px, image is behind it
    // We compute what portion of the image falls inside the circle
    const container = containerRef.current;
    if (!container) return;
    const containerRect = container.getBoundingClientRect();
    const imgRect = img.getBoundingClientRect();

    const circleLeft = containerRect.left + containerRect.width / 2 - 100;
    const circleTop = containerRect.top + containerRect.height / 2 - 100;

    const scaleX = img.naturalWidth / imgRect.width;
    const scaleY = img.naturalHeight / imgRect.height;

    const srcX = (circleLeft - imgRect.left) * scaleX;
    const srcY = (circleTop - imgRect.top) * scaleY;
    const srcW = 200 * scaleX;
    const srcH = 200 * scaleY;

    ctx.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, size, size);

    onSave(canvas.toDataURL('image/png'));
  };

  return (
    <Modal isOpen={isOpen} closeModal={onCancel}>
      <div className="w-[min(696px,calc(100vw-2rem))]">
        <ModalHeader onClose={onCancel} title="Crop Photo" />

        {/* Crop area */}
        <div className="flex items-center justify-center relative">
          <div
            ref={containerRef}
            className="relative mx-6 mb-6 max-w-full touch-none overflow-hidden rounded-lg select-none bg-muted h-[333px] w-[302px]"
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            onPointerLeave={handlePointerUp}
          >
            {/* Draggable image */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              ref={imgRef}
              src={imageSrc}
              alt="crop preview"
              draggable={false}
              className="absolute left-1/2 top-1/2 max-w-none cursor-move"
              style={{
                transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px))`,
                // Cover the frame without distorting the photo. The crop maths
                // below reads the rendered box, so no object-fit here.
                width: "auto",
                height: "auto",
                minWidth: "100%",
                minHeight: "100%",
                userSelect: "none",
              }}
              onPointerDown={handlePointerDown}
            />

            {/* Circle overlay: box-shadow punches out the circle, leaving it clear */}
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div
                className="relative rounded-full"
                style={{
                  width: 200,
                  height: 200,
                  boxShadow: '0 0 0 9999px hsl(var(--muted))',
                }}
              >
                <div
                  className="flex h-full w-full items-center justify-center pointer-events-auto cursor-move"
                  onPointerDown={handlePointerDown}
                >
                  <Move className="h-8 w-8 text-foreground" strokeWidth={1.75} aria-hidden />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Hidden canvas for crop output */}
        <canvas ref={canvasRef} className="hidden" />

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 pb-6">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-border px-5 py-2 text-body-s font-medium text-text-secondary hover:bg-muted transition-colors"
          >
            Cancel
          </button>
          {/* Fixed D5: was bg-[#0f2044]/hover:bg-[#1a3366] — both map to brand-focus per D5 color audit decision */}
          <button
            type="button"
            onClick={handleSave}
            className="rounded-lg bg-brand-focus px-5 py-2 text-body-s font-medium text-white hover:bg-brand transition-colors"
          >
            Save
          </button>
        </div>
      </div>
    </Modal>
  );
}