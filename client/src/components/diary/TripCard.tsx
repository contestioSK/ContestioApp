import { format } from "date-fns";
import { sk } from "date-fns/locale";
import { Fish, TrendingUp, Lock, Crown } from "lucide-react";
import type { DiaryTrip } from "@shared/schema";

import defaultImage1 from "@assets/stock_images/fishing_lake_sunrise_9eb3c89e.jpg";
import defaultImage2 from "@assets/stock_images/fishing_lake_sunrise_429d3968.jpg";
import defaultImage3 from "@assets/stock_images/fishing_lake_sunrise_e3aed74d.jpg";
import defaultImage4 from "@assets/stock_images/fishing_lake_sunrise_b5bbcbc5.jpg";
import defaultImage5 from "@assets/stock_images/fishing_lake_sunrise_79cd285f.jpg";
import defaultImage6 from "@assets/stock_images/fishing_lake_sunrise_3b7d0cf0.jpg";

const DEFAULT_IMAGES = [
  defaultImage1,
  defaultImage2,
  defaultImage3,
  defaultImage4,
  defaultImage5,
  defaultImage6,
];

type TripStatus = "active" | "planned" | "finished";

interface TripCardProps {
  trip: DiaryTrip;
  catchCount?: number;
  biggestCatch?: { weight: string; fishType: string } | null;
  onClick: () => void;
  isLocked?: boolean;
  onLockedClick?: () => void;
}

function getDefaultImage(tripId: string): string {
  const hash = tripId.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return DEFAULT_IMAGES[hash % DEFAULT_IMAGES.length];
}

function getTripStatus(startDate: Date, endDate: Date): TripStatus {
  const now = new Date();
  if (now >= startDate && now <= endDate) {
    return "active";
  } else if (now < startDate) {
    return "planned";
  } else {
    return "finished";
  }
}

export function TripCard({ trip, catchCount = 0, biggestCatch, onClick, isLocked = false, onLockedClick }: TripCardProps) {
  const status = getTripStatus(new Date(trip.startDate), new Date(trip.endDate));
  const coverImage = trip.coverImageUrl || getDefaultImage(trip.id);

  const statusConfig = {
    active: {
      label: "AKTÍVNA",
      className: "bg-red-600/90 animate-pulse",
    },
    planned: {
      label: "PLÁNOVANÁ",
      className: "bg-blue-600/90",
    },
    finished: {
      label: "UKONČENÁ",
      className: "bg-slate-600/90",
    },
  };

  const handleClick = () => {
    if (isLocked && onLockedClick) {
      onLockedClick();
    } else if (!isLocked) {
      onClick();
    }
  };

  return (
    <div
      className={`group relative h-72 rounded-xl overflow-hidden cursor-pointer transition-all duration-300 ${
        isLocked 
          ? 'opacity-60 hover:opacity-80' 
          : 'hover:scale-[1.03] hover:shadow-2xl'
      }`}
      onClick={handleClick}
      data-testid={`trip-card-${trip.id}`}
    >
      <div
        className={`absolute inset-0 bg-cover bg-center ${isLocked ? 'grayscale' : ''}`}
        style={{ backgroundImage: `url(${coverImage})` }}
      />
      
      <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/70 to-transparent" />
      
      {/* Lock overlay for locked trips */}
      {isLocked && (
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <div className="bg-slate-900/80 backdrop-blur-sm rounded-xl p-4 flex flex-col items-center gap-2">
            <Lock className="h-6 w-6 text-muted-foreground" strokeWidth={1.75} />
            <span className="text-sm font-medium text-muted-foreground">Premium</span>
          </div>
        </div>
      )}
      
      <div className="absolute top-4 left-4 flex items-center gap-2">
        <div
          className={`px-3 py-1 rounded-full text-xs font-bold text-white ${statusConfig[status].className}`}
          data-testid={`trip-status-${trip.id}`}
        >
          {statusConfig[status].label}
        </div>
        {isLocked && (
          <div className="px-2 py-1 rounded-lg text-xs font-bold bg-slate-500/90 text-white flex items-center gap-1">
            <Crown className="h-4 w-4" strokeWidth={1.75} />
          </div>
        )}
      </div>

      <div className="absolute bottom-0 left-0 right-0 p-6">
        <h3
          className="text-2xl font-bold text-white mb-2 line-clamp-2"
          data-testid={`trip-name-${trip.id}`}
        >
          {trip.name}
        </h3>
        
        <p className="text-slate-300 text-sm mb-4" data-testid={`trip-date-${trip.id}`}>
          {format(new Date(trip.startDate), "d. MMM", { locale: sk })} -{" "}
          {format(new Date(trip.endDate), "d. MMM yyyy", { locale: sk })}
        </p>

        <div className="flex items-center gap-6 text-white">
          <div className="flex items-center gap-2">
            <Fish className="h-5 w-5 text-muted-foreground" strokeWidth={1.75} />
            <span className="font-mono font-medium text-[#F97316] text-lg" data-testid={`trip-catch-count-${trip.id}`}>
              {catchCount}
            </span>
            <span className="text-sm text-slate-300">úlovkov</span>
          </div>
          
          {biggestCatch && (
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-muted-foreground" strokeWidth={1.75} />
              <span className="font-mono font-medium text-[#F97316] text-lg" data-testid={`trip-biggest-${trip.id}`}>
                {biggestCatch.weight} kg
              </span>
              <span className="text-sm text-slate-300">{biggestCatch.fishType === 'mirror' ? 'Lysec' : biggestCatch.fishType === 'scaly' ? 'Šupináč' : biggestCatch.fishType}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
