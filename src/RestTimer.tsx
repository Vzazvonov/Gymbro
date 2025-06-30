import React, { useEffect, useRef, useState } from "react";

type RestTimerProps = {
  seconds: number;
  onFinish: () => void;
  onSkip: () => void;
  isPaused: boolean;
  onTogglePause: () => void;
};

const RADIUS = 60;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const RestTimer: React.FC<RestTimerProps> = ({
  seconds,
  onFinish,
  onSkip,
  isPaused,
  onTogglePause,
}) => {
  const [timeLeft, setTimeLeft] = useState(seconds);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setTimeLeft(seconds);
  }, [seconds]);

  useEffect(() => {
    if (isPaused) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }
    intervalRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(intervalRef.current!);
          onFinish();
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isPaused, onFinish]);

  const dashoffset = CIRCUMFERENCE * (1 - timeLeft / seconds);

  return (
    <div className="flex flex-col items-center justify-center w-full">
      <svg width={150} height={150}>
        <g transform="rotate(90 75 75)">
          <circle
            cx={75}
            cy={75}
            r={RADIUS}
            stroke="#444"
            strokeWidth={10}
            fill="none"
          />
          <circle
            cx={75}
            cy={75}
            r={RADIUS}
            stroke="#10b981"
            strokeWidth={10}
            fill="none"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={dashoffset}
            style={{ transition: "stroke-dashoffset 1s linear" }}
            transform="scale(-1,1) translate(-150,0)"
          />
        </g>
        <text
          x="50%"
          y="50%"
          textAnchor="middle"
          dy=".3em"
          fontSize="2.5rem"
          fill="#fff"
        >
          {timeLeft}
        </text>
      </svg>
      <div className="flex gap-4 mt-4">
        <button
          onClick={onTogglePause}
          className="px-6 py-2 rounded-xl bg-white/20 text-white font-bold text-lg"
        >
          {isPaused ? "Продолжить" : "Пауза"}
        </button>
        <button
          onClick={onSkip}
          className="px-6 py-2 rounded-xl bg-orange-500/80 text-white font-bold text-lg"
        >
          Пропустить отдых
        </button>
      </div>
    </div>
  );
};

export default RestTimer; 