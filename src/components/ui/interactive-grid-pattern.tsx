'use client';

import { cn } from '@/lib/utils';
import React, { useState, useCallback, useMemo } from 'react';
import { NoSSR } from './no-ssr';

/**
 * InteractiveGridPattern is a component that renders a grid pattern with interactive squares.
 *
 * @param width - The width of each square.
 * @param height - The height of each square.
 * @param squares - The number of squares in the grid. The first element is the number of horizontal squares, and the second element is the number of vertical squares.
 * @param className - The class name of the grid.
 * @param squaresClassName - The class name of the squares.
 */
interface InteractiveGridPatternProps
  extends React.HTMLAttributes<HTMLDivElement> {
  width?: number;
  height?: number;
  squares?: [number, number]; // [horizontal, vertical]
  className?: string;
  squaresClassName?: string;
}

/**
 * The InteractiveGridPattern component.
 *
 * @see InteractiveGridPatternProps for the props interface.
 * @returns A React component.
 */
export function InteractiveGridPattern({
  width = 35,
  height = 35,
  squares = [50, 50], // Optimized for performance
  className,
  squaresClassName,
  ...props
}: InteractiveGridPatternProps) {
  const [horizontal, vertical] = squares;
  const [hoveredSquare, setHoveredSquare] = useState<number | null>(null);

  // Memoize hover handlers for better performance
  const handleMouseEnter = useCallback((index: number) => {
    setHoveredSquare(index);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setHoveredSquare(null);
  }, []);

  // Memoize grid squares to prevent unnecessary re-renders
  const gridSquares = useMemo(() => {
    return Array.from({ length: horizontal * vertical }, (_, index) => {
      const x = (index % horizontal) * width;
      const y = Math.floor(index / horizontal) * height;
      return (
        <rect
          key={index}
          x={x}
          y={y}
          width={width}
          height={height}
          className={cn(
            'stroke-gray-400/20 transition-colors duration-200 ease-out',
            hoveredSquare === index ? 'fill-gray-300/30' : 'fill-transparent',
            squaresClassName
          )}
          strokeWidth='1'
          style={{ pointerEvents: 'auto' }}
          onMouseEnter={() => handleMouseEnter(index)}
          onMouseLeave={handleMouseLeave}
        />
      );
    });
  }, [
    horizontal,
    vertical,
    width,
    height,
    hoveredSquare,
    squaresClassName,
    handleMouseEnter,
    handleMouseLeave,
  ]);

  return (
    <NoSSR>
      <div
        className={cn(
          'fixed inset-0 w-screen h-screen pointer-events-none',
          '[mask-image:radial-gradient(800px_circle_at_center,white,transparent)]',
          className
        )}
        style={{
          transform: 'skew(0deg, 12deg)',
          transformOrigin: 'center',

          willChange: 'transform',
        }}
        {...props}
      >
        <svg
          width='100%'
          height='100%'
          viewBox={`0 0 ${width * horizontal} ${height * vertical}`}
          className='w-full h-full'
          preserveAspectRatio='xMidYMid slice'
          style={{ shapeRendering: 'optimizeSpeed' }}
        >
          {gridSquares}
        </svg>
      </div>
    </NoSSR>
  );
}

