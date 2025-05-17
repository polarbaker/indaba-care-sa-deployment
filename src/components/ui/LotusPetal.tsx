import React from "react";

interface LotusPetalProps {
  className?: string;
  color?: string;
  opacity?: number;
  width?: number;
  height?: number;
}

export function LotusPetal({
  className = "",
  color = "currentColor",
  opacity = 0.1,
  width = 120,
  height = 120,
}: LotusPetalProps) {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ opacity }}
    >
      <path
        d="M60 10C60 10 40 30 40 60C40 90 60 110 60 110C60 110 80 90 80 60C80 30 60 10 60 10Z"
        fill={color}
      />
      <path
        d="M30 30C30 30 20 60 40 80C60 100 90 90 90 90C90 90 80 60 60 40C40 20 30 30 30 30Z"
        fill={color}
      />
      <path
        d="M90 30C90 30 60 20 40 40C20 60 30 90 30 90C30 90 60 80 80 60C100 40 90 30 90 30Z"
        fill={color}
      />
    </svg>
  );
}
