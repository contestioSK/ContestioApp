import { Fish } from "lucide-react";
import type { TimelineData } from "../types";

interface TimelineCountChartProps {
  data: TimelineData[];
}

export function TimelineCountChart({ data }: TimelineCountChartProps) {
  const formattedData = data
    .map(item => ({
      label: `Deň ${item.dayIndex + 1}`,
      value: item.totalCount,
      dayIndex: item.dayIndex,
    }))
    .sort((a, b) => a.dayIndex - b.dayIndex);

  const maxVal = Math.max(...formattedData.map(d => d.value), 1);
  const hasMultiple = formattedData.length >= 2;

  const svgPath = hasMultiple
    ? formattedData
        .map((p, i) => {
          const x = (i / (formattedData.length - 1)) * 1000;
          const y = (1 - p.value / maxVal) * 200;
          return `${i === 0 ? "M" : "L"} ${x} ${y}`;
        })
        .join(" ")
    : "";

  if (formattedData.length === 0) {
    return (
      <div className="bg-card border border-border/50 rounded-xl p-6">
        <div className="flex items-center gap-2 mb-1">
          <Fish size={18} className="text-[#28C6CE]" />
          <h3 className="font-bold text-foreground">Vývoj počtu úlovkov</h3>
        </div>
        <p className="text-sm text-muted-foreground mb-6">Počet ulovených rýb počas súťaže</p>
        <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">
          Žiadne dáta
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border/50 rounded-xl p-6 pb-14">
      <div className="flex items-center gap-2 mb-1">
        <Fish size={18} className="text-[#28C6CE]" />
        <h3 className="font-bold text-foreground">Vývoj počtu úlovkov</h3>
      </div>
      <p className="text-sm text-muted-foreground mb-6">Počet ulovených rýb počas súťaže</p>

      <div className="relative h-[200px] w-full">
        {hasMultiple && (
          <svg
            viewBox="0 0 1000 200"
            preserveAspectRatio="none"
            className="absolute inset-0 w-full h-full"
          >
            <defs>
              <linearGradient id="countAreaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#28C6CE" stopOpacity="0.2" />
                <stop offset="100%" stopColor="#28C6CE" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path
              d={`${svgPath} L 1000 200 L 0 200 Z`}
              fill="url(#countAreaGrad)"
            />
            <path
              d={svgPath}
              fill="none"
              stroke="#28C6CE"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}

        {formattedData.map((p, i) => (
          <div
            key={i}
            className="absolute w-[10px] h-[10px] rounded-full border-2 bg-background -translate-x-1/2 -translate-y-1/2 z-10"
            style={{
              borderColor: "#28C6CE",
              left: hasMultiple
                ? `${(i / (formattedData.length - 1)) * 100}%`
                : "50%",
              top: `${(1 - p.value / maxVal) * 100}%`,
            }}
            title={`${p.label}: ${p.value} ks`}
          />
        ))}

        <div className="absolute bottom-[-32px] w-full flex justify-between text-[10px] text-muted-foreground font-mono px-0">
          {formattedData.map((p, i) => (
            <span key={i}>{p.label}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
