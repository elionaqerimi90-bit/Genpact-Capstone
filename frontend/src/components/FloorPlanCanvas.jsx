import { useEffect, useRef, useState } from 'react';

export default function FloorPlanCanvas({
  imageUrl,
  imageAlt = '',
  resources = [],
  renderPin,
  onCanvasClick,
  className = '',
  imageClassName = '',
  emptyState,
  children,
}) {
  const containerRef = useRef(null);
  const imageRef = useRef(null);
  const [imageBox, setImageBox] = useState(null);

  const calculateImageBox = () => {
    const container = containerRef.current;
    const image = imageRef.current;
    if (!container || !image || !image.naturalWidth || !image.naturalHeight) {
      if (!container) return null;
      return {
        left: 0,
        top: 0,
        width: container.clientWidth,
        height: container.clientHeight,
      };
    }

    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;
    const imageRatio = image.naturalWidth / image.naturalHeight;
    const containerRatio = containerWidth / containerHeight;

    let width = containerWidth;
    let height = containerHeight;
    if (containerRatio > imageRatio) {
      height = containerHeight;
      width = height * imageRatio;
    } else {
      width = containerWidth;
      height = width / imageRatio;
    }

    return {
      left: (containerWidth - width) / 2,
      top: (containerHeight - height) / 2,
      width,
      height,
    };
  };

  const updateImageBox = () => {
    setImageBox(calculateImageBox());
  };

  useEffect(() => {
    updateImageBox();
    window.addEventListener('resize', updateImageBox);
    return () => window.removeEventListener('resize', updateImageBox);
  }, [imageUrl]);

  const handleClick = (event) => {
    if (!onCanvasClick) return;
    const activeImageBox = imageBox ?? calculateImageBox();
    if (!activeImageBox) return;
    if (!imageBox) setImageBox(activeImageBox);
    const rect = containerRef.current.getBoundingClientRect();
    const x = ((event.clientX - rect.left - activeImageBox.left) / activeImageBox.width) * 100;
    const y = ((event.clientY - rect.top - activeImageBox.top) / activeImageBox.height) * 100;
    if (x < 0 || x > 100 || y < 0 || y > 100) return;
    onCanvasClick(event, { x, y, imageBox: activeImageBox, containerRect: rect });
  };

  return (
    <div
      ref={containerRef}
      onClick={handleClick}
      className={`relative overflow-hidden rounded-xl border border-slate-200 bg-slate-100 ${className}`}
    >
      {imageUrl ? (
        <img
          ref={imageRef}
          src={imageUrl}
          alt={imageAlt}
          onLoad={updateImageBox}
          className={`absolute inset-0 h-full w-full object-contain ${imageClassName}`}
        />
      ) : (
        emptyState
      )}

      {imageBox &&
        resources
          .filter((resource) => resource.floor_plan_x != null && resource.floor_plan_y != null)
          .map((resource) => {
            const left = imageBox.left + (Number(resource.floor_plan_x) / 100) * imageBox.width;
            const top = imageBox.top + (Number(resource.floor_plan_y) / 100) * imageBox.height;
            return renderPin(resource, {
              left,
              top,
              imageBox,
              containerRect: containerRef.current?.getBoundingClientRect(),
            });
          })}
      {children}
    </div>
  );
}
