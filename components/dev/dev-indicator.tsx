'use client';

import { useEffect, useState } from 'react';

interface DevStatsState {
  cpu: number;
  memory: number;
  disk: string;
}

function getColorClass(percent: number): 'green-400' | 'yellow-400' | 'red-400' {
  if (percent < 50) return 'green-400';
  if (percent <= 80) return 'yellow-400';
  return 'red-400';
}

export function DevIndicator({ statsUrl = '/api/dev-stats' }: { statsUrl?: string }) {
  const [stats, setStats] = useState<DevStatsState>({ cpu: 0, memory: 0, disk: '0MB' });
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch(statsUrl);
        if (!res.ok) throw new Error('Not OK');
        const data = (await res.json()) as { cpu?: number; memory?: number; disk?: string };
        setStats({
          cpu: typeof data.cpu === 'number' ? data.cpu : 0,
          memory: typeof data.memory === 'number' ? data.memory : 0,
          disk: typeof data.disk === 'string' ? data.disk : '0MB',
        });
        setError(false);
      } catch {
        setError(true);
      }
    };

    void fetchStats();
    const interval = setInterval(() => void fetchStats(), 2000);
    return () => clearInterval(interval);
  }, [statsUrl]);

  const colorClass = getColorClass(stats.cpu);
  const dotClass =
    colorClass === 'green-400' ? 'bg-green-400' : colorClass === 'yellow-400' ? 'bg-yellow-400' : 'bg-red-400';
  const textClass =
    colorClass === 'green-400' ? 'text-green-400' : colorClass === 'yellow-400' ? 'text-yellow-400' : 'text-red-400';
  const cpuDisplay = error ? '—' : `${stats.cpu}%`;
  const memDisplay = error ? '—' : `${stats.memory}MB`;
  const diskDisplay = error ? '—' : stats.disk;

  return (
    <div
      className="fixed bottom-4 left-4 z-50 flex size-20 flex-col items-center justify-center gap-1 rounded-lg bg-black/80 p-2 text-xs font-mono text-white backdrop-blur"
      aria-label="Dev stats"
    >
      <div className={`size-3 rounded-full ${dotClass}`} />
      <div>CPU</div>
      <div className={`font-bold ${textClass}`}>{cpuDisplay}</div>
      <div>RAM</div>
      <div className={`font-mono ${textClass}`}>{memDisplay}</div>
      <div className={`truncate max-w-full ${textClass}`} title={diskDisplay}>
        {diskDisplay}
      </div>
    </div>
  );
}
