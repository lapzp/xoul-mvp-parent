import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { secondsToHms } from '@/utils/time';
import { useAuth } from '@/context/AuthContext';
import { Smartphone, InfoIcon } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const API_BASE_URL = 'https://xoul-data-backend-267146952341.us-east1.run.app';

type KPIResp = {
  kpi: {
    total_seconds: number;
    total_sessions: number;
    top_app: string | null;
    top_app_seconds: number | null;
  };
};

export default function AppUsageKPI({ childId }: { childId: string }) {
  const [kpi, setKpi] = useState<KPIResp['kpi'] | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasData, setHasData] = useState(false);
  const { access_token } = useAuth();

  useEffect(() => {
    (async () => {
      if (!access_token) return;
      
      setLoading(true);
      try {
        const r = await fetch(
          `${API_BASE_URL}/metrics/app-usage/summary?child_id=${childId}`,
          {
            headers: {
              'Authorization': `Bearer ${access_token}`
            }
          }
        );
        if (!r.ok) throw new Error('http');
        const json: KPIResp = await r.json();
        setKpi(json.kpi);
        
        // Check if we have meaningful data (more than zero screen time or sessions)
        setHasData(json.kpi.total_seconds > 0 || json.kpi.total_sessions > 0);
      } catch {
        toast.error('Could not load usage KPIs');
        setHasData(false);
      } finally {
        setLoading(false);
      }
    })();
  }, [childId, access_token]);

  if (loading) {
    return (
      <div className="bg-[#1a1f2c] rounded-xl p-5 flex items-center justify-center mb-6">
        <span className="text-gray-400 text-sm">Loading usage…</span>
      </div>
    );
  }

  if (!hasData) {
    return (
      <div className="bg-[#1a1f2c] rounded-xl p-6 flex flex-col items-center justify-center mb-6">
        <Smartphone className="text-blue-400 mb-3" size={24} />
        <h3 className="text-white font-medium mb-2">No usage data yet</h3>
        <p className="text-gray-400 text-sm text-center max-w-md">
          Connect your child's Android device to start monitoring app usage and screen time.
        </p>
      </div>
    );
  }

  const tiles = [
    {
      label: 'Total screen-time',
      value: secondsToHms(kpi?.total_seconds || 0),
      tooltip: "How long they used apps in total."
    },
    {
      label: 'Sessions',
      value: kpi?.total_sessions || 0,
      tooltip: "How many times they opened an app."
    },
    {
      label: 'Most used app',
      value: kpi?.top_app ? `${kpi.top_app} (${secondsToHms(kpi.top_app_seconds!)})` : '—',
      tooltip: "The app they spent the most time on."
    },
  ];

  return (
    <TooltipProvider delayDuration={100}>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {tiles.map((t) => (
          <div
            key={t.label}
            className="bg-[#1a1f2c] rounded-xl p-5 flex flex-col text-center h-40"
          >
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center justify-center gap-1 mb-2">
                  <span className="text-gray-400 text-xs uppercase tracking-wide">
                    {t.label}
                  </span>
                  <InfoIcon size={12} className="text-gray-500" />
                </div>
              </TooltipTrigger>
              <TooltipContent className="bg-[#272e3d] border-[#374056] text-white">
                {t.tooltip}
              </TooltipContent>
            </Tooltip>
            <div className="flex flex-1 items-center justify-center">
              <span className="text-white text-xl font-semibold">{t.value}</span>
            </div>
          </div>
        ))}
      </div>
    </TooltipProvider>
  );
}