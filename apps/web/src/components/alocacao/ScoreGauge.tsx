import { useState } from 'react';

interface Props {
  score: number;
  size?: number;
}

function getScoreColor(score: number): string {
  if (score >= 80) return '#00C896';
  if (score >= 60) return '#F59E0B';
  return '#EF4444';
}

function getScoreLabel(score: number): string {
  if (score >= 80) return 'Carteira alinhada';
  if (score >= 60) return 'Pequenos ajustes';
  if (score >= 40) return 'Ajustes necessários';
  return 'Revisar estratégia';
}

export function ScoreGauge({ score, size = 160 }: Props) {
  const [showTooltip, setShowTooltip] = useState(false);
  const radius = size / 2 - 12;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;
  const color = getScoreColor(score);

  return (
    <div className="relative flex flex-col items-center gap-2">
      <div
        className="relative cursor-help"
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        onTouchStart={() => setShowTooltip(true)}
        onTouchEnd={() => setShowTooltip(false)}
      >
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth="10"
            className="text-slate-200 dark:text-slate-700"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            style={{ transition: 'stroke-dashoffset 0.8s ease' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold" style={{ color }}>
            {score}
          </span>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            /100
          </span>
        </div>
      </div>

      <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
        {getScoreLabel(score)}
      </p>

      {showTooltip && (
        <div
          className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-64 z-10
                        bg-slate-900 text-white text-xs rounded-lg px-3 py-2 shadow-lg"
        >
          <p className="font-medium mb-1">Score de Saúde da Carteira</p>
          <p className="text-slate-300 leading-relaxed">
            Mede o quanto sua carteira está alinhada com sua estratégia.
            <strong className="text-white"> 100 = perfeitamente alinhada</strong>
            . O score cai quando alguma classe de ativo está muito distante da
            meta definida.
          </p>
          <div
            className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0
                          border-l-4 border-r-4 border-t-4
                          border-l-transparent border-r-transparent border-t-slate-900"
          />
        </div>
      )}
    </div>
  );
}
