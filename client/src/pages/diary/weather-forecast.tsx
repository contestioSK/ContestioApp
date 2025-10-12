import { useState, useEffect, useRef } from "react";
import DiaryLayout from "@/components/DiaryLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { 
  Cloud, 
  MapPin, 
  Thermometer, 
  Wind, 
  Droplets,
  Gauge,
  Loader2,
  AlertCircle,
  CloudRain,
  CloudSnow,
  Sun,
  CloudDrizzle,
  Search,
  Sunrise,
  Sunset,
  Fish,
  Crown,
  ArrowUp,
  Moon
} from "lucide-react";
import { format } from "date-fns";
import { sk } from "date-fns/locale";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, ComposedChart } from 'recharts';

interface ForecastDay {
  date: string;
  day: {
    maxtemp_c: number;
    mintemp_c: number;
    avgtemp_c: number;
    daily_chance_of_rain: number;
    totalprecip_mm: number;
    maxwind_kph: number;
    condition: {
      text: string;
      icon: string;
      code: number;
    };
  };
  astro: {
    sunrise: string;
    sunset: string;
    moon_phase: string;
  };
  hour: Array<{
    time: string;
    temp_c: number;
    pressure_mb: number;
    precip_mm: number;
    humidity: number;
    condition: {
      text: string;
      icon: string;
    };
    wind_kph: number;
    wind_dir: string;
  }>;
}

interface WeatherForecast {
  location: {
    name: string;
    region: string;
    country: string;
  };
  current: {
    temp_c: number;
    condition: {
      text: string;
      icon: string;
    };
    wind_kph: number;
    pressure_mb: number;
    humidity: number;
  };
  forecast: {
    forecastday: ForecastDay[];
  };
}

interface LocationResult {
  id: number;
  name: string;
  region: string;
  country: string;
  lat: number;
  lon: number;
  url: string;
}

export default function WeatherForecast() {
  const { user } = useAuth();
  const [forecast, setForecast] = useState<WeatherForecast | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<LocationResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);
  const searchRef = useRef<HTMLDivElement>(null);

  // Check premium status
  const { data: premiumStatus, isLoading: isPremiumLoading } = useQuery<{ isPremium: boolean }>({
    queryKey: ["/api/auth/premium-status"],
    enabled: !!user?.id
  });

  const isPremium = premiumStatus?.isPremium || false;

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced search
  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }

    setSearchLoading(true);
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(`/api/weather/search?q=${encodeURIComponent(searchQuery)}`);
        if (response.ok) {
          const data = await response.json();
          setSearchResults(data);
          setShowResults(true);
        }
      } catch (err) {
        console.error("Search error:", err);
      } finally {
        setSearchLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const getWeatherIcon = (code: number, className = "w-12 h-12") => {
    // WeatherAPI condition codes
    if (code === 1000) return <Sun className={`${className} text-yellow-500`} />;
    if ([1003, 1006, 1009].includes(code)) return <Cloud className={`${className} text-gray-400`} />;
    if ([1063, 1180, 1183, 1186, 1189, 1192, 1195, 1240, 1243, 1246].includes(code)) 
      return <CloudRain className={`${className} text-blue-400`} />;
    if ([1066, 1210, 1213, 1216, 1219, 1222, 1225, 1255, 1258].includes(code)) 
      return <CloudSnow className={`${className} text-blue-200`} />;
    if ([1072, 1150, 1153, 1168, 1171].includes(code)) 
      return <CloudDrizzle className={`${className} text-blue-300`} />;
    return <Cloud className={`${className} text-gray-400`} />;
  };

  const fetchForecast = async (query: string) => {
    setLoading(true);
    setError(null);
    setShowResults(false);

    try {
      const response = await fetch(`/api/weather/forecast?q=${encodeURIComponent(query)}`);
      
      if (!response.ok) {
        throw new Error('Nepodarilo sa načítať predpoveď počasia');
      }

      const data = await response.json();
      setForecast(data);
      setSelectedDayIndex(0); // Reset to first day
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Chyba pri načítaní predpovede');
    } finally {
      setLoading(false);
    }
  };

  const handleLocationSelect = (location: LocationResult) => {
    setSearchQuery(`${location.name}, ${location.region || location.country}`);
    fetchForecast(`${location.lat},${location.lon}`);
  };

  const getMyLocation = () => {
    setLoading(true);
    setError(null);

    if (!navigator.geolocation) {
      setError("Váš prehliadač nepodporuje geolokáciu");
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        
        try {
          const response = await fetch(
            `/api/weather/forecast?lat=${latitude}&lon=${longitude}`
          );
          
          if (!response.ok) {
            throw new Error('Nepodarilo sa načítať predpoveď počasia');
          }

          const data = await response.json();
          setForecast(data);
          setSelectedDayIndex(0); // Reset to first day
          setSearchQuery(`${data.location.name}, ${data.location.region || data.location.country}`);
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Chyba pri načítaní predpovede');
        } finally {
          setLoading(false);
        }
      },
      (error) => {
        setError(`Nepodarilo sa získať polohu: ${error.message}`);
        setLoading(false);
      }
    );
  };

  const getDayName = (dateString: string) => {
    const date = new Date(dateString);
    return format(date, 'EEEE', { locale: sk });
  };

  const getDate = (dateString: string) => {
    const date = new Date(dateString);
    return format(date, 'd. MMMM', { locale: sk });
  };

  const getFullDate = (dateString: string) => {
    const date = new Date(dateString);
    return format(date, 'EEEE, d. MMMM yyyy', { locale: sk });
  };

  // Get average pressure for the day (from hourly data)
  const getAvgPressure = (hours: ForecastDay['hour']) => {
    const pressures = hours.map(h => h.pressure_mb);
    return Math.round(pressures.reduce((a, b) => a + b, 0) / pressures.length);
  };

  // Calculate fish activity index (0-100) based on weather conditions
  const calculateFishActivity = (day: ForecastDay): number => {
    let score = 50; // Start at middle

    // Pressure: optimal around 1010-1020 mb
    const avgPressure = getAvgPressure(day.hour);
    if (avgPressure >= 1010 && avgPressure <= 1020) {
      score += 20;
    } else if (avgPressure >= 1005 && avgPressure <= 1025) {
      score += 10;
    } else {
      score -= 10;
    }

    // Temperature: optimal 15-20°C
    const temp = day.day.avgtemp_c;
    if (temp >= 15 && temp <= 20) {
      score += 20;
    } else if (temp >= 10 && temp <= 25) {
      score += 10;
    } else if (temp < 5 || temp > 30) {
      score -= 15;
    }

    // Precipitation: less is better
    if (day.day.totalprecip_mm === 0) {
      score += 15;
    } else if (day.day.totalprecip_mm < 2) {
      score += 5;
    } else if (day.day.totalprecip_mm > 10) {
      score -= 15;
    }

    // Wind: moderate is good, calm or very strong is bad
    const wind = day.day.maxwind_kph;
    if (wind >= 5 && wind <= 15) {
      score += 10;
    } else if (wind < 3 || wind > 25) {
      score -= 10;
    }

    // Clamp to 0-100 range
    return Math.max(0, Math.min(100, score));
  };

  const getActivityLevel = (score: number): { label: string; color: string } => {
    if (score >= 70) return { label: 'Vysoká', color: '#22c55e' };
    if (score >= 40) return { label: 'Stredná', color: '#eab308' };
    return { label: 'Nízka', color: '#ef4444' };
  };

  // Convert wind direction to rotation degrees for arrow icon
  const getWindRotation = (direction: string): number => {
    const directions: Record<string, number> = {
      'N': 0,
      'NNE': 22.5,
      'NE': 45,
      'ENE': 67.5,
      'E': 90,
      'ESE': 112.5,
      'SE': 135,
      'SSE': 157.5,
      'S': 180,
      'SSW': 202.5,
      'SW': 225,
      'WSW': 247.5,
      'W': 270,
      'WNW': 292.5,
      'NW': 315,
      'NNW': 337.5
    };
    return directions[direction.toUpperCase()] || 0;
  };

  // Translate moon phase from English to Slovak
  const getMoonPhaseSlovak = (phase: string): string => {
    const phases: Record<string, string> = {
      'New Moon': 'Nov',
      'Waxing Crescent': 'Dorастajúci polmesiac',
      'First Quarter': 'Prvá štvrtina',
      'Waxing Gibbous': 'Dorастajúci mesiac',
      'Full Moon': 'Spln',
      'Waning Gibbous': 'Ubúdajúci mesiac',
      'Last Quarter': 'Posledná štvrtina',
      'Waning Crescent': 'Ubúdajúci polmesiac'
    };
    return phases[phase] || phase;
  };

  // Translate wind direction from English to Slovak
  const getWindDirectionSlovak = (direction: string): string => {
    const directions: Record<string, string> = {
      'N': 'S',
      'NNE': 'SSV',
      'NE': 'SV',
      'ENE': 'VSV',
      'E': 'V',
      'ESE': 'VJV',
      'SE': 'JV',
      'SSE': 'JJV',
      'S': 'J',
      'SSW': 'JJZ',
      'SW': 'JZ',
      'WSW': 'ZJZ',
      'W': 'Z',
      'WNW': 'ZSZ',
      'NW': 'SZ',
      'NNW': 'SSZ'
    };
    return directions[direction.toUpperCase()] || direction;
  };

  const selectedDay = forecast?.forecast.forecastday[selectedDayIndex];

  return (
    <DiaryLayout>
      <div className="container mx-auto p-4 md:p-6 space-y-6">
        <div className="flex flex-col space-y-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Predpoveď počasia</h1>
            <p className="text-muted-foreground mt-2">
              Plánuj svoje výpravy ako profesionál
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search Input with Autocomplete */}
            <div ref={searchRef} className="relative flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Hľadať lokalitu..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                  data-testid="input-location-search"
                />
                {searchLoading && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
                )}
              </div>

              {/* Autocomplete Dropdown */}
              {showResults && searchResults.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-card border border-border rounded-md shadow-lg max-h-60 overflow-auto">
                  {searchResults.map((location) => (
                    <button
                      key={location.id}
                      onClick={() => handleLocationSelect(location)}
                      className="w-full px-4 py-2 text-left hover:bg-accent transition-colors flex items-start gap-2"
                      data-testid={`button-location-${location.id}`}
                    >
                      <MapPin className="w-4 h-4 mt-1 text-muted-foreground flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{location.name}</p>
                        <p className="text-sm text-muted-foreground truncate">
                          {[location.region, location.country].filter(Boolean).join(', ')}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <Button 
              onClick={getMyLocation} 
              disabled={loading}
              data-testid="button-get-location"
              variant="outline"
              className="w-full sm:w-auto"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Načítavam...
                </>
              ) : (
                <>
                  <MapPin className="w-4 h-4 mr-2" />
                  Moja poloha
                </>
              )}
            </Button>
          </div>

          {error && (
            <Alert variant="destructive" data-testid="alert-error">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>

        {loading && !forecast && (
          <div className="grid lg:grid-cols-4 gap-6">
            {/* Left Column - Day List Skeleton */}
            <div className="lg:col-span-1 space-y-3">
              <Skeleton className="h-7 w-40" />
              {[1, 2, 3].map((i) => (
                <div key={i} className="p-4 rounded-lg border-2 border-border space-y-2">
                  <Skeleton className="h-5 w-24" />
                  <Skeleton className="h-4 w-32" />
                  <div className="flex justify-between items-center pt-2">
                    <Skeleton className="h-8 w-12" />
                    <Skeleton className="h-8 w-12" />
                  </div>
                </div>
              ))}
            </div>

            {/* Right Column - Day Detail Skeleton */}
            <div className="lg:col-span-3 space-y-6">
              <div className="p-6 rounded-lg border-2 border-border space-y-4">
                <Skeleton className="h-6 w-64" />
                <Skeleton className="h-10 w-48" />
                <div className="flex gap-4">
                  <Skeleton className="h-16 w-16 rounded-full" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-6 w-32" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                </div>
              </div>

              <div className="p-6 rounded-lg border-2 border-border">
                <Skeleton className="h-6 w-40 mb-4" />
                <Skeleton className="h-[300px] w-full" />
              </div>

              <div className="p-6 rounded-lg border-2 border-border">
                <Skeleton className="h-6 w-40 mb-4" />
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[1, 2, 3, 4, 5, 6, 7].map((i) => (
                    <div key={i} className="space-y-2">
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="h-8 w-24" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {forecast && (
          <div className="grid lg:grid-cols-4 gap-6">
            {/* Left Column - Day List */}
            <div className="lg:col-span-1 space-y-3">
              <h2 className="text-xl font-bold">3-dňová predpoveď</h2>
              {forecast.forecast.forecastday.map((day, index) => (
                <button
                  key={day.date}
                  onClick={() => setSelectedDayIndex(index)}
                  data-testid={`button-day-${index}`}
                  className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                    selectedDayIndex === index
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:border-primary/50 bg-card'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold capitalize">{getDayName(day.date)}</p>
                      <p className="text-sm text-muted-foreground">{getDate(day.date)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold">{Math.round(day.day.maxtemp_c)}°</p>
                      <p className="text-sm text-muted-foreground">{Math.round(day.day.mintemp_c)}°</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {/* Right Column - Day Detail */}
            {selectedDay && (
              <div className="lg:col-span-3 space-y-6">
                {/* Top Row: Basic Info + Fish Activity in 2 columns */}
                <div className="grid lg:grid-cols-2 gap-6">
                  {/* Detail Header */}
                  <div 
                    className="p-6 rounded-lg border-2 space-y-4"
                    style={{ 
                      backgroundColor: '#012a36',
                      borderColor: '#1e3a5f'
                    }}
                  >
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground capitalize">
                          {getFullDate(selectedDay.date)}
                        </p>
                        <h3 className="text-2xl font-bold flex items-center gap-2">
                          <MapPin className="w-5 h-5" />
                          {forecast.location.name}
                          {forecast.location.region && `, ${forecast.location.region}`}
                        </h3>
                      </div>
                      <div className="text-right">
                        {getWeatherIcon(selectedDay.day.condition.code, "w-16 h-16")}
                      </div>
                    </div>

                    <div className="flex items-center gap-6">
                      <div>
                        <p className="text-5xl font-bold">{Math.round(selectedDay.day.avgtemp_c)}°C</p>
                        <p className="text-muted-foreground mt-1">{selectedDay.day.condition.text}</p>
                      </div>
                      <div className="flex-1 text-sm space-y-1">
                        <p>Max: {Math.round(selectedDay.day.maxtemp_c)}°C</p>
                        <p>Min: {Math.round(selectedDay.day.mintemp_c)}°C</p>
                      </div>
                    </div>
                  </div>

                  {/* PREMIUM: Fish Activity Index Widget */}
                  {isPremiumLoading ? (
                    <div 
                      className="p-6 rounded-lg border-2"
                      style={{ 
                        backgroundColor: '#012a36',
                        borderColor: '#1e3a5f'
                      }}
                    >
                      <Skeleton className="h-6 w-48 mb-4" />
                      <Skeleton className="h-12 w-full rounded-full mb-4" />
                      <Skeleton className="h-4 w-32" />
                    </div>
                  ) : isPremium ? (
                    <div 
                      className="p-6 rounded-lg border-2"
                      style={{ 
                        backgroundColor: '#012a36',
                        borderColor: '#1e3a5f'
                      }}
                    >
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold flex items-center gap-2">
                          <Fish className="w-5 h-5" />
                          Index aktivity rýb
                        </h3>
                        <span className="text-xs px-2 py-1 rounded bg-amber-500/20 text-amber-500 font-semibold flex items-center gap-1">
                          <Crown className="w-3 h-3" />
                          PREMIUM
                        </span>
                      </div>
                      
                      {(() => {
                        const activityScore = calculateFishActivity(selectedDay);
                        const activityInfo = getActivityLevel(activityScore);
                        const position = `${activityScore}%`;
                        
                        return (
                          <div className="space-y-4">
                            <div className="relative h-12 rounded-full overflow-hidden bg-gradient-to-r from-red-500 via-yellow-500 to-green-500">
                              {/* Activity Indicator */}
                              <div 
                                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 transition-all duration-500"
                                style={{ left: position }}
                              >
                                <div className="relative">
                                  <div className="w-6 h-6 rounded-full bg-white border-2 border-slate-900 shadow-lg" />
                                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap text-sm font-semibold">
                                    {activityScore}%
                                  </div>
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">Aktivita:</span>
                              <span className="font-semibold" style={{ color: activityInfo.color }}>
                                {activityInfo.label}
                              </span>
                            </div>
                            
                            <p className="text-xs text-muted-foreground">
                              Index je vypočítaný na základe tlaku vzduchu, teploty, zrážok a vetra. 
                              Vyššia hodnota znamená lepšie podmienky pre rybolov.
                            </p>
                          </div>
                        );
                      })()}
                    </div>
                  ) : (
                    <div 
                      className="p-6 rounded-lg border-2 text-center"
                      style={{ 
                        backgroundColor: '#012a36',
                        borderColor: '#1e3a5f'
                      }}
                    >
                      <Fish className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                      <h3 className="text-lg font-semibold mb-2">Index aktivity rýb</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Zisti optimálny čas na rybolov na základe počasia
                      </p>
                      <div className="flex items-center justify-center gap-2 text-amber-500 font-semibold mb-3">
                        <Crown className="w-4 h-4" />
                        <span>Dostupné len v PREMIUM</span>
                      </div>
                      <Button variant="default" size="sm" className="bg-amber-500 hover:bg-amber-600 text-white">
                        Prejsť na Premium
                      </Button>
                    </div>
                  )}
                </div>

                {/* Hourly Forecast Chart Widget */}
                <div 
                  className="p-6 rounded-lg border-2"
                  style={{ 
                    backgroundColor: '#012a36',
                    borderColor: '#1e3a5f'
                  }}
                >
                  <h3 className="text-lg font-semibold mb-4">Hodinová predpoveď</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <ComposedChart 
                      data={selectedDay.hour.map(h => ({
                        time: format(new Date(h.time), 'HH:mm'),
                        teplota: Math.round(h.temp_c),
                        zrážky: h.precip_mm
                      }))}
                      margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e3a5f" />
                      <XAxis 
                        dataKey="time" 
                        stroke="#94a3b8"
                        tick={{ fill: '#94a3b8', fontSize: 12 }}
                        interval={2}
                      />
                      <YAxis 
                        yAxisId="left"
                        stroke="#94a3b8"
                        tick={{ fill: '#94a3b8', fontSize: 12 }}
                        label={{ value: 'Teplota (°C)', angle: -90, position: 'insideLeft', fill: '#94a3b8' }}
                      />
                      <YAxis 
                        yAxisId="right"
                        orientation="right"
                        stroke="#94a3b8"
                        tick={{ fill: '#94a3b8', fontSize: 12 }}
                        label={{ value: 'Zrážky (mm)', angle: 90, position: 'insideRight', fill: '#94a3b8' }}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#0c1f28', 
                          border: '1px solid #1e3a5f',
                          borderRadius: '6px',
                          color: '#f1f5f9'
                        }}
                      />
                      <Legend 
                        wrapperStyle={{ color: '#94a3b8' }}
                      />
                      <Line 
                        yAxisId="left"
                        type="monotone" 
                        dataKey="teplota" 
                        stroke="#f59e0b" 
                        strokeWidth={2}
                        dot={{ fill: '#f59e0b', r: 3 }}
                        name="Teplota (°C)"
                      />
                      <Bar 
                        yAxisId="right"
                        dataKey="zrážky" 
                        fill="#3b82f6" 
                        opacity={0.6}
                        name="Zrážky (mm)"
                      />
                    </ComposedChart>
                  </ResponsiveContainer>

                  {/* Horizontal Hourly Scroll */}
                  <div className="mt-6">
                    <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-transparent">
                      {selectedDay.hour.map((hour, index) => (
                        <div
                          key={index}
                          className="flex-shrink-0 p-4 rounded-lg border-2 min-w-[120px] space-y-2 text-center"
                          style={{
                            backgroundColor: '#012a36',
                            borderColor: '#1e3a5f'
                          }}
                          data-testid={`hour-card-${index}`}
                        >
                          {/* Time */}
                          <p className="text-sm font-semibold text-foreground">
                            {format(new Date(hour.time), 'HH:mm')}
                          </p>

                          {/* Weather Icon */}
                          <img
                            src={`https:${hour.condition.icon}`}
                            alt={hour.condition.text}
                            className="w-12 h-12 mx-auto"
                            data-testid={`weather-icon-${index}`}
                          />

                          {/* Temperature */}
                          <p className="text-2xl font-bold text-foreground">
                            {Math.round(hour.temp_c)}°
                          </p>

                          {/* Wind Speed */}
                          <p className="text-xs text-muted-foreground">
                            {Math.round(hour.wind_kph)} km/h
                          </p>

                          {/* Wind Direction - Arrow + Text */}
                          <div className="flex flex-col items-center gap-1">
                            <ArrowUp
                              className="w-5 h-5 text-blue-400"
                              style={{
                                transform: `rotate(${getWindRotation(hour.wind_dir)}deg)`
                              }}
                              data-testid={`wind-arrow-${index}`}
                            />
                            <p className="text-xs font-medium text-blue-400">
                              {getWindDirectionSlovak(hour.wind_dir)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Detailed Conditions Widget */}
                <div 
                  className="p-6 rounded-lg border-2"
                  style={{ 
                    backgroundColor: '#012a36',
                    borderColor: '#1e3a5f'
                  }}
                >
                  <h3 className="text-lg font-semibold mb-4">Detailné podmienky</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {/* Tlak */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Gauge className="w-4 h-4" />
                        <span className="text-sm">Tlak</span>
                      </div>
                      <p className="text-2xl font-bold">{getAvgPressure(selectedDay.hour)} mb</p>
                    </div>

                    {/* Vlhkosť */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Droplets className="w-4 h-4" />
                        <span className="text-sm">Vlhkosť</span>
                      </div>
                      <p className="text-2xl font-bold">
                        {Math.round(selectedDay.hour.reduce((acc, h) => acc + h.humidity, 0) / selectedDay.hour.length)}%
                      </p>
                    </div>

                    {/* Šanca na dážď */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <CloudRain className="w-4 h-4" />
                        <span className="text-sm">Šanca na dážď</span>
                      </div>
                      <p className="text-2xl font-bold">{selectedDay.day.daily_chance_of_rain}%</p>
                    </div>

                    {/* Východ slnka */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Sunrise className="w-4 h-4" />
                        <span className="text-sm">Východ slnka</span>
                      </div>
                      <p className="text-xl font-semibold">{selectedDay.astro.sunrise}</p>
                    </div>

                    {/* Západ slnka */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Sunset className="w-4 h-4" />
                        <span className="text-sm">Západ slnka</span>
                      </div>
                      <p className="text-xl font-semibold">{selectedDay.astro.sunset}</p>
                    </div>

                    {/* Fáza mesiaca */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Moon className="w-4 h-4" />
                        <span className="text-sm">Fáza mesiaca</span>
                      </div>
                      <p className="text-lg font-semibold">{getMoonPhaseSlovak(selectedDay.astro.moon_phase)}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </DiaryLayout>
  );
}
