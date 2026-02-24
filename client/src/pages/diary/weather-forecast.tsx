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
  ArrowDown,
  Moon,
  TrendingUp,
  TrendingDown,
  Minus,
  Star
} from "lucide-react";
import { format } from "date-fns";
import { sk } from "date-fns/locale";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, BarChart, Bar, ComposedChart, Cell, ReferenceLine } from 'recharts';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { TacticalIcon } from "@/components/ui/tactical-icon";

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
    feelslike_c: number;
    chance_of_rain: number;
    cloud: number;
    wind_kph: number;
    wind_dir: string;
    gust_kph: number;
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
    gust_kph: number;
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

const LAST_LOCATION_KEY = 'weather-last-location';
const FAVORITE_LOCATIONS_KEY = 'weather-favorite-locations';

interface SavedLocation {
  query: string;
  name: string;
  region: string;
  country: string;
}

export default function WeatherForecast() {
  const { user } = useAuth();
  const [forecast, setForecast] = useState<WeatherForecast | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<LocationResult[]>([]);
  const [favoriteLocations, setFavoriteLocations] = useState<SavedLocation[]>(() => {
    try {
      const saved = localStorage.getItem(FAVORITE_LOCATIONS_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [searchLoading, setSearchLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const searchRef = useRef<HTMLDivElement>(null);

  // Check premium status
  const { data: premiumStatus, isLoading: isPremiumLoading } = useQuery<{ isPremium: boolean }>({
    queryKey: ["/api/auth/premium-status"],
    enabled: !!user?.id
  });

  const isPremium = premiumStatus?.isPremium || false;

  // Auto-load weather on first visit
  useEffect(() => {
    const loadInitialWeather = async () => {
      // Check if we have a saved location
      const savedLocation = localStorage.getItem(LAST_LOCATION_KEY);
      
      if (savedLocation) {
        // Load weather for saved location
        try {
          const { query, name, region, country } = JSON.parse(savedLocation);
          setSearchQuery(`${name}, ${region || country}`);
          await fetchForecast(query);
        } catch (err) {
          console.error('Failed to load saved location:', err);
          // If saved location fails, try GPS
          getMyLocation(true);
        }
      } else {
        // First visit - try to get GPS location silently
        getMyLocation(true);
      }
      
      setIsInitialLoad(false);
    };

    loadInitialWeather();
  }, []); // Run only once on mount

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
      
      // Save location to localStorage
      localStorage.setItem(LAST_LOCATION_KEY, JSON.stringify({
        query,
        name: data.location.name,
        region: data.location.region,
        country: data.location.country
      }));
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

  const getMyLocation = (silent = false) => {
    if (!silent) {
      setLoading(true);
      setError(null);
    }

    if (!navigator.geolocation) {
      if (!silent) {
        setError("Tvoj prehliadač nepodporuje geolokáciu");
        setLoading(false);
      }
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
          
          // Save location to localStorage
          localStorage.setItem(LAST_LOCATION_KEY, JSON.stringify({
            query: `${latitude},${longitude}`,
            name: data.location.name,
            region: data.location.region,
            country: data.location.country
          }));
        } catch (err) {
          if (!silent) {
            setError(err instanceof Error ? err.message : 'Chyba pri načítaní predpovede');
          }
        } finally {
          if (!silent) {
            setLoading(false);
          }
        }
      },
      (error) => {
        if (!silent) {
          setError(`Nepodarilo sa získať polohu: ${error.message}`);
          setLoading(false);
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 30000,
        maximumAge: 300000
      }
    );
  };

  const isCurrentLocationFavorite = forecast ? favoriteLocations.some(
    fav => fav.name === forecast.location.name && fav.country === forecast.location.country
  ) : false;

  const toggleFavoriteLocation = () => {
    if (!forecast) return;
    let savedQuery = `${forecast.location.name}, ${forecast.location.region || forecast.location.country}`;
    try {
      const last = localStorage.getItem(LAST_LOCATION_KEY);
      if (last) {
        const parsed = JSON.parse(last);
        if (parsed.name === forecast.location.name) savedQuery = parsed.query;
      }
    } catch {}
    const current: SavedLocation = {
      query: savedQuery,
      name: forecast.location.name,
      region: forecast.location.region,
      country: forecast.location.country,
    };

    let updated: SavedLocation[];
    if (isCurrentLocationFavorite) {
      updated = favoriteLocations.filter(
        fav => !(fav.name === current.name && fav.country === current.country)
      );
    } else {
      updated = [...favoriteLocations, current].slice(0, 5);
    }
    setFavoriteLocations(updated);
    localStorage.setItem(FAVORITE_LOCATIONS_KEY, JSON.stringify(updated));
  };

  const loadFavoriteLocation = (fav: SavedLocation) => {
    const displayName = `${fav.name}, ${fav.region || fav.country}`;
    setSearchQuery(displayName);
    fetchForecast(fav.query || displayName);
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
      'Waxing Crescent': 'Dorastajúci polmesiac',
      'First Quarter': 'Prvá štvrtina',
      'Waxing Gibbous': 'Dorastajúci mesiac',
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

  // Convert wind speed from km/h to m/s
  const convertKphToMs = (kph: number): string => {
    return (kph / 3.6).toFixed(1);
  };

  // Get pressure trend color (green = rising, red = falling, gray = stable)
  const getPressureTrendColor = (currentPressure: number, index: number, hours: ForecastDay['hour']): { color: string; trend: 'up' | 'down' | 'stable' } => {
    if (index === 0) return { color: 'text-muted-foreground', trend: 'stable' };
    const prevPressure = hours[index - 1].pressure_mb;
    const diff = currentPressure - prevPressure;
    if (diff > 1) return { color: 'text-green-500', trend: 'up' };
    if (diff < -1) return { color: 'text-red-500', trend: 'down' };
    return { color: 'text-muted-foreground', trend: 'stable' };
  };

  // Filter hours for today - show only current hour and future (Smart Time Filtering)
  const getFilteredHours = (hours: ForecastDay['hour'], dayDate: string): ForecastDay['hour'] => {
    const today = new Date();
    const selectedDate = new Date(dayDate);
    const isToday = today.toDateString() === selectedDate.toDateString();

    if (!isToday) return hours;

    const currentHour = today.getHours();
    const todayRemaining = hours.filter(hour => {
      const hourTime = new Date(hour.time);
      return hourTime.getHours() >= currentHour;
    });

    const nextDayData = forecast?.forecast.forecastday[selectedDayIndex + 1];
    if (nextDayData && todayRemaining.length < 24) {
      const needed = Math.max(0, 24 - todayRemaining.length);
      const tomorrowHours = nextDayData.hour.slice(0, needed);
      return [...todayRemaining, ...tomorrowHours];
    }

    return todayRemaining;
  };

  const getChartData = (hours: ForecastDay['hour'], dayDate: string) => {
    const today = new Date();
    const selectedDate = new Date(dayDate);
    const isToday = today.toDateString() === selectedDate.toDateString();
    const currentHour = today.getHours();

    return hours.map(h => {
      const hourTime = new Date(h.time).getHours();
      return {
        time: format(new Date(h.time), 'HH:mm'),
        teplota: Math.round(h.temp_c),
        zrážky: h.precip_mm,
        isPast: isToday && hourTime < currentHour,
        isCurrent: isToday && hourTime === currentHour,
      };
    });
  };

  const selectedDay = forecast?.forecast.forecastday[selectedDayIndex];
  const filteredHours = selectedDay ? getFilteredHours(selectedDay.hour, selectedDay.date) : [];
  const chartData = selectedDay ? getChartData(selectedDay.hour, selectedDay.date) : [];
  const currentHourLabel = (() => {
    const now = new Date();
    if (selectedDay && now.toDateString() === new Date(selectedDay.date).toDateString()) {
      const rounded = new Date(now);
      rounded.setMinutes(0, 0, 0);
      return format(rounded, 'HH:mm');
    }
    return null;
  })();

  return (
    <DiaryLayout>
      <div className="space-y-6">
        <div className="flex flex-col space-y-4">
          <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <span className="h-px w-16 bg-[#F97316]"></span>
                <span className="text-[10px] font-bold uppercase tracking-[0.4em] text-[#F97316]">Počasie</span>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-4">
                  <TacticalIcon icon={Cloud} variant="orange" size="lg" showLabel={false} />
                  <h1 className="text-4xl md:text-5xl font-black italic tracking-tighter uppercase text-foreground leading-none">Predpoveď počasia</h1>
                </div>
                <p className="text-sm font-medium text-muted-foreground italic tracking-tight pl-0.5">
                  Plánuj svoje výpravy ako profesionál
                </p>
              </div>
            </div>
          </header>

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

              {/* Autocomplete Dropdown - improved z-index and mobile height */}
              {showResults && searchResults.length > 0 && (
                <div className="absolute z-[100] w-full mt-1 bg-card border border-border rounded-md shadow-xl max-h-[50vh] md:max-h-60 overflow-auto">
                  {searchResults.map((location) => (
                    <button
                      key={location.id}
                      onClick={() => handleLocationSelect(location)}
                      className="w-full px-4 py-3 text-left hover:bg-accent transition-colors flex items-start gap-3 min-h-[56px]"
                      data-testid={`button-location-${location.id}`}
                    >
                      <MapPin className="w-5 h-5 mt-0.5 text-muted-foreground flex-shrink-0" />
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

            <div className="flex gap-2">
              {forecast && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        onClick={toggleFavoriteLocation}
                        variant="outline"
                        size="icon"
                        className="shrink-0"
                        data-testid="button-toggle-favorite"
                      >
                        <Star className={`h-4 w-4 ${isCurrentLocationFavorite ? 'fill-amber-500 text-amber-500' : 'text-muted-foreground'}`} strokeWidth={1.75} />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      {isCurrentLocationFavorite ? 'Odstrániť z obľúbených' : 'Uložiť do obľúbených'}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
              <Button 
                onClick={() => getMyLocation()} 
                disabled={loading}
                data-testid="button-get-location"
                variant="outline"
                className="w-full sm:w-auto"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Načítavam...
                  </>
                ) : (
                  <>
                    <MapPin className="h-4 w-4 mr-2 text-muted-foreground" strokeWidth={1.75} />
                    Moja poloha
                  </>
                )}
              </Button>
            </div>
          </div>

          {favoriteLocations.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <span className="text-xs text-muted-foreground self-center mr-1">
                <Star className="h-3 w-3 inline fill-amber-500 text-amber-500 mr-1" />
                Obľúbené:
              </span>
              {favoriteLocations.map((fav, i) => (
                <button
                  key={`${fav.name}-${i}`}
                  onClick={() => loadFavoriteLocation(fav)}
                  className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                    forecast?.location.name === fav.name && forecast?.location.country === fav.country
                      ? 'bg-primary/10 border-primary text-primary font-medium'
                      : 'bg-card border-border text-muted-foreground hover:text-foreground hover:border-primary/50'
                  }`}
                  data-testid={`button-favorite-${i}`}
                >
                  <MapPin className="h-3 w-3 inline mr-1" />
                  {fav.name}
                </button>
              ))}
            </div>
          )}

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
              <div className="p-4 md:p-6 rounded-lg border-2 border-border space-y-4">
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

              <div className="p-4 md:p-6 rounded-lg border-2 border-border">
                <Skeleton className="h-6 w-40 mb-4" />
                <Skeleton className="h-[300px] w-full" />
              </div>

              <div className="p-4 md:p-6 rounded-lg border-2 border-border">
                <Skeleton className="h-6 w-40 mb-4" />
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
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

        {/* Desktop Version */}
        {forecast && (
          <div className="hidden md:grid lg:grid-cols-4 gap-6">
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
                      <p className="text-2xl font-mono font-medium text-[#F97316]">{Math.round(day.day.maxtemp_c)}°</p>
                      <p className="text-sm font-mono text-muted-foreground">{Math.round(day.day.mintemp_c)}°</p>
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
                  <div className="p-4 md:p-6 rounded-lg border-2 space-y-4 bg-card dark:bg-slate-900 border-border">
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
                    <div className="p-4 md:p-6 rounded-lg border-2 bg-card dark:bg-slate-900 border-border">
                      <Skeleton className="h-6 w-48 mb-4" />
                      <Skeleton className="h-12 w-full rounded-full mb-4" />
                      <Skeleton className="h-4 w-32" />
                    </div>
                  ) : isPremium ? (
                    <div className="p-4 md:p-6 rounded-lg border-2 bg-card dark:bg-slate-900 border-border">
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
                                  <div className="w-6 h-6 rounded-full bg-white border-2 border-gray-800 dark:border-slate-900 shadow-lg" />
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
                    <div className="p-4 md:p-6 rounded-lg border-2 text-center bg-card dark:bg-slate-900 border-border">
                      <div className="flex justify-center mb-4">
                        <TacticalIcon icon={Fish} variant="neutral" size="lg" showLabel={false} />
                      </div>
                      <h3 className="text-lg font-semibold mb-2">Index aktivity rýb</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Zisti optimálny čas na rybolov na základe počasia
                      </p>
                      <div className="flex items-center justify-center gap-2 text-amber-500 font-semibold mb-3">
                        <Crown className="w-4 h-4" />
                        <span>Dostupné len v PREMIUM</span>
                      </div>
                      <Button variant="default" size="sm" className="bg-amber-500 hover:bg-amber-600 text-foreground dark:text-white">
                        Prejsť na Premium
                      </Button>
                    </div>
                  )}
                </div>

                {/* Hourly Forecast Chart Widget */}
                <div className="p-4 md:p-6 rounded-lg border-2 bg-card dark:bg-slate-900 border-border">
                  <h3 className="text-lg font-semibold mb-4">Detailná predpoveď na 24h</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <ComposedChart 
                      data={chartData}
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
                      {currentHourLabel && (
                        <ReferenceLine yAxisId="left" x={currentHourLabel} stroke="#f97316" strokeDasharray="4 4" strokeWidth={1.5} label={{ value: 'Teraz', position: 'top', fill: '#f97316', fontSize: 11 }} />
                      )}
                      <RechartsTooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--muted))', 
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '6px',
                          color: 'hsl(var(--foreground))'
                        }}
                      />
                      <Legend 
                        payload={[
                          { value: 'Teplota (°C)', type: 'line', color: '#f59e0b' },
                          { value: 'Zrážky (mm)', type: 'square', color: '#22d3ee' },
                        ]}
                        wrapperStyle={{ color: '#94a3b8' }}
                      />
                      <Line 
                        yAxisId="left"
                        type="monotone" 
                        dataKey="teplota" 
                        stroke="#f59e0b" 
                        strokeWidth={2}
                        dot={(props: any) => {
                          const { cx, cy, index } = props;
                          const entry = chartData[index];
                          if (!entry) return <circle key={index} cx={cx} cy={cy} r={0} />;
                          return (
                            <circle
                              key={index}
                              cx={cx}
                              cy={cy}
                              r={entry.isCurrent ? 5 : 3}
                              fill={entry.isCurrent ? '#f97316' : '#f59e0b'}
                              opacity={entry.isPast ? 0.35 : 1}
                              stroke={entry.isCurrent ? '#fff' : 'none'}
                              strokeWidth={entry.isCurrent ? 2 : 0}
                            />
                          );
                        }}
                        name="Teplota (°C)"
                      />
                      <Bar 
                        yAxisId="right"
                        dataKey="zrážky" 
                        fill="#22d3ee"
                        name="Zrážky (mm)"
                      >
                        {chartData.map((entry, index) => (
                          <Cell key={index} fill="#22d3ee" opacity={entry.isPast ? 0.2 : 0.6} />
                        ))}
                      </Bar>
                    </ComposedChart>
                  </ResponsiveContainer>

                  {/* Horizontal Hourly Scroll - Smart Time Filtering applied */}
                  <div className="mt-6">
                    <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-transparent">
                      {filteredHours.map((hour, index) => {
                        const pressureInfo = getPressureTrendColor(hour.pressure_mb, index, filteredHours);
                        return (
                          <TooltipProvider key={index} delayDuration={200}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div
                                  className="flex-shrink-0 p-3 rounded-lg border-2 min-w-[100px] space-y-1.5 text-center bg-card dark:bg-slate-900 border-border cursor-default"
                                  data-testid={`hour-card-${index}`}
                                >
                                  <p className="text-sm font-bold text-foreground">
                                    {format(new Date(hour.time), 'HH:mm')}
                                  </p>
                                  <img
                                    src={`https:${hour.condition.icon}`}
                                    alt={hour.condition.text}
                                    className="w-10 h-10 mx-auto"
                                    data-testid={`weather-icon-${index}`}
                                  />
                                  <p className="text-2xl font-bold text-foreground">
                                    {Math.round(hour.temp_c)}°
                                  </p>
                                  <div className="flex items-center justify-center gap-1">
                                    <ArrowUp
                                      className="w-4 h-4 text-blue-400"
                                      style={{ transform: `rotate(${getWindRotation(hour.wind_dir)}deg)` }}
                                    />
                                    <span className="text-sm font-semibold">{convertKphToMs(hour.wind_kph)}</span>
                                  </div>
                                  <p className="text-xs text-muted-foreground">
                                    ↑{convertKphToMs(hour.gust_kph || hour.wind_kph)} m/s
                                  </p>
                                  <div className={`flex items-center justify-center gap-1 ${pressureInfo.color}`}>
                                    {pressureInfo.trend === 'up' && <TrendingUp className="w-3 h-3" />}
                                    {pressureInfo.trend === 'down' && <TrendingDown className="w-3 h-3" />}
                                    {pressureInfo.trend === 'stable' && <Minus className="w-3 h-3" />}
                                    <span className="text-xs font-semibold">{hour.pressure_mb}</span>
                                  </div>
                                </div>
                              </TooltipTrigger>
                              <TooltipContent side="bottom" className="max-w-[220px] space-y-1 text-xs">
                                <p className="font-bold text-sm">{hour.condition.text}</p>
                                <p>Pocitová teplota: <span className="font-mono font-medium text-orange-400">{Math.round(hour.feelslike_c)}°C</span></p>
                                <p>Vlhkosť: <span className="font-mono font-medium text-orange-400">{hour.humidity}%</span></p>
                                <p>Šanca na dážď: <span className="font-mono font-medium text-orange-400">{hour.chance_of_rain}%</span></p>
                                <p>Oblačnosť: <span className="font-mono font-medium text-orange-400">{hour.cloud}%</span></p>
                                <p>Vietor: <span className="font-mono font-medium text-orange-400">{convertKphToMs(hour.wind_kph)} m/s {hour.wind_dir}</span></p>
                                <p>Nárazy: <span className="font-mono font-medium text-orange-400">{convertKphToMs(hour.gust_kph || hour.wind_kph)} m/s</span></p>
                                <p>Tlak: <span className="font-mono font-medium text-orange-400">{hour.pressure_mb} mb</span> ({pressureInfo.trend === 'up' ? 'stúpa' : pressureInfo.trend === 'down' ? 'klesá' : 'stabilný'})</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Detailed Conditions Widget */}
                <div className="p-4 md:p-6 rounded-lg border-2 bg-card dark:bg-slate-900 border-border">
                  <h3 className="text-lg font-semibold mb-4">Detailné podmienky</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
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

        {/* Mobile Version */}
        {forecast && selectedDay && (
          <div className="md:hidden space-y-4">
            {/* Current Temperature & Location */}
            <div className="bg-card dark:bg-slate-900 border-2 border-border rounded-lg p-4">
              <h2 className="text-lg font-semibold mb-1">
                {forecast.location.name}
                {forecast.location.region && `, ${forecast.location.region}`}
              </h2>
              <p className="text-sm text-muted-foreground mb-3 capitalize">
                {getFullDate(selectedDay.date)}
              </p>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-5xl font-bold">{Math.round(selectedDay.day.avgtemp_c)}°</p>
                  <p className="text-muted-foreground mt-1">{selectedDay.day.condition.text}</p>
                </div>
                {getWeatherIcon(selectedDay.day.condition.code, "w-20 h-20")}
              </div>
            </div>

            {/* Day Selector - Horizontal Scroll */}
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-transparent">
              {forecast.forecast.forecastday.map((day, index) => (
                <button
                  key={day.date}
                  onClick={() => setSelectedDayIndex(index)}
                  data-testid={`button-mobile-day-${index}`}
                  className={`flex-shrink-0 p-3 rounded-lg border-2 transition-all min-w-[90px] ${
                    selectedDayIndex === index
                      ? 'border-primary bg-primary/10'
                      : 'border-border bg-card'
                  }`}
                >
                  <p className="text-xs font-semibold uppercase mb-2">
                    {index === 0 ? 'DNES' : getDayName(day.date).substring(0, 2).toUpperCase()}
                  </p>
                  {getWeatherIcon(day.day.condition.code, "w-8 h-8 mx-auto")}
                  <p className="text-lg font-bold mt-2">{Math.round(day.day.maxtemp_c)}°</p>
                  <p className="text-xs text-muted-foreground">{Math.round(day.day.mintemp_c)}°</p>
                </button>
              ))}
            </div>

            {/* Interactive Chart - Improved font size for mobile */}
            <div className="bg-card dark:bg-slate-900 border-2 border-border rounded-lg p-4">
              <ResponsiveContainer width="100%" height={220}>
                <ComposedChart 
                  data={chartData}
                  margin={{ top: 5, right: 5, left: -15, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e3a5f" opacity={0.3} />
                  <XAxis 
                    dataKey="time" 
                    stroke="#94a3b8"
                    tick={{ fill: '#94a3b8', fontSize: 10 }}
                    interval={3}
                  />
                  <YAxis 
                    yAxisId="left"
                    stroke="#94a3b8"
                    tick={{ fill: '#94a3b8', fontSize: 10 }}
                  />
                  <YAxis 
                    yAxisId="right"
                    orientation="right"
                    stroke="#94a3b8"
                    tick={{ fill: '#94a3b8', fontSize: 10 }}
                  />
                  {currentHourLabel && (
                    <ReferenceLine yAxisId="left" x={currentHourLabel} stroke="#f97316" strokeDasharray="4 4" strokeWidth={1.5} label={{ value: 'Teraz', position: 'top', fill: '#f97316', fontSize: 10 }} />
                  )}
                  <RechartsTooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--muted))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '6px',
                      color: 'hsl(var(--foreground))',
                      fontSize: '12px'
                    }}
                  />
                  <Legend 
                    payload={[
                      { value: 'Teplota (°C)', type: 'line', color: '#f59e0b' },
                      { value: 'Zrážky (mm)', type: 'square', color: '#22d3ee' },
                    ]}
                    wrapperStyle={{ color: '#94a3b8', fontSize: '11px' }}
                  />
                  <Line 
                    yAxisId="left"
                    type="monotone" 
                    dataKey="teplota" 
                    stroke="#f59e0b" 
                    strokeWidth={2}
                    dot={(props: any) => {
                      const { cx, cy, index } = props;
                      const entry = chartData[index];
                      if (!entry) return <circle key={index} cx={cx} cy={cy} r={0} />;
                      return (
                        <circle
                          key={index}
                          cx={cx}
                          cy={cy}
                          r={entry.isCurrent ? 4 : 2}
                          fill={entry.isCurrent ? '#f97316' : '#f59e0b'}
                          opacity={entry.isPast ? 0.35 : 1}
                          stroke={entry.isCurrent ? '#fff' : 'none'}
                          strokeWidth={entry.isCurrent ? 2 : 0}
                        />
                      );
                    }}
                    name="Teplota (°C)"
                  />
                  <Bar 
                    yAxisId="right"
                    dataKey="zrážky" 
                    fill="#22d3ee"
                    name="Zrážky (mm)"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={index} fill="#22d3ee" opacity={entry.isPast ? 0.15 : 0.5} />
                    ))}
                  </Bar>
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            {/* Hourly Forecast - Horizontal Scroll - Smart Time Filtering applied */}
            <div className="bg-card dark:bg-slate-900 border-2 border-border rounded-lg p-4">
              <h3 className="text-sm font-semibold mb-3">Detailná predpoveď na 24h</h3>
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-transparent">
                {filteredHours.map((hour, index) => {
                  const pressureInfo = getPressureTrendColor(hour.pressure_mb, index, filteredHours);
                  return (
                    <Popover key={index}>
                      <PopoverTrigger asChild>
                        <div
                          className="flex-shrink-0 p-2 rounded-lg border border-border min-w-[88px] space-y-1 text-center bg-card/50 cursor-pointer active:scale-95 transition-transform"
                          data-testid={`hour-mobile-card-${index}`}
                        >
                          <p className="text-xs font-bold">
                            {format(new Date(hour.time), 'HH:mm')}
                          </p>
                          <img
                            src={`https:${hour.condition.icon}`}
                            alt={hour.condition.text}
                            className="w-9 h-9 mx-auto"
                          />
                          <p className="text-xl font-bold">
                            {Math.round(hour.temp_c)}°
                          </p>
                          <div className="flex items-center justify-center gap-0.5">
                            <ArrowUp
                              className="w-3 h-3 text-blue-400"
                              style={{ transform: `rotate(${getWindRotation(hour.wind_dir)}deg)` }}
                            />
                            <span className="text-xs text-blue-400 font-semibold">
                              {convertKphToMs(hour.wind_kph)}
                            </span>
                          </div>
                          <p className="text-[10px] text-muted-foreground">
                            ↑{convertKphToMs(hour.gust_kph || hour.wind_kph)}
                          </p>
                          <div className={`flex items-center justify-center gap-0.5 ${pressureInfo.color}`}>
                            {pressureInfo.trend === 'up' && <TrendingUp className="w-2.5 h-2.5" />}
                            {pressureInfo.trend === 'down' && <TrendingDown className="w-2.5 h-2.5" />}
                            {pressureInfo.trend === 'stable' && <Minus className="w-2.5 h-2.5" />}
                            <span className="text-[10px] font-semibold">{hour.pressure_mb}</span>
                          </div>
                        </div>
                      </PopoverTrigger>
                      <PopoverContent side="bottom" align="center" className="w-[220px] p-3 space-y-1 text-xs">
                        <p className="font-bold text-sm">{hour.condition.text}</p>
                        <p>Pocitová teplota: <span className="font-mono font-medium text-orange-400">{Math.round(hour.feelslike_c)}°C</span></p>
                        <p>Vlhkosť: <span className="font-mono font-medium text-orange-400">{hour.humidity}%</span></p>
                        <p>Šanca na dážď: <span className="font-mono font-medium text-orange-400">{hour.chance_of_rain}%</span></p>
                        <p>Oblačnosť: <span className="font-mono font-medium text-orange-400">{hour.cloud}%</span></p>
                        <p>Vietor: <span className="font-mono font-medium text-orange-400">{convertKphToMs(hour.wind_kph)} m/s {hour.wind_dir}</span></p>
                        <p>Nárazy: <span className="font-mono font-medium text-orange-400">{convertKphToMs(hour.gust_kph || hour.wind_kph)} m/s</span></p>
                        <p>Tlak: <span className="font-mono font-medium text-orange-400">{hour.pressure_mb} mb</span> ({pressureInfo.trend === 'up' ? 'stúpa' : pressureInfo.trend === 'down' ? 'klesá' : 'stabilný'})</p>
                      </PopoverContent>
                    </Popover>
                  );
                })}
              </div>
            </div>

            {/* PREMIUM: Fish Activity Index */}
            {isPremiumLoading ? (
              <div className="bg-card dark:bg-slate-900 border-2 border-border rounded-lg p-4">
                <Skeleton className="h-5 w-32 mb-3" />
                <Skeleton className="h-10 w-full rounded-full mb-3" />
                <Skeleton className="h-4 w-24" />
              </div>
            ) : isPremium ? (
              <div className="bg-card dark:bg-slate-900 border-2 border-border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                    <Fish className="w-4 h-4" />
                    Index aktivity rýb
                  </h3>
                  <span className="text-xs px-2 py-0.5 rounded bg-amber-500/20 text-amber-500 font-semibold flex items-center gap-1">
                    <Crown className="w-3 h-3" />
                    PREMIUM
                  </span>
                </div>
                
                {(() => {
                  const activityScore = calculateFishActivity(selectedDay);
                  const activityInfo = getActivityLevel(activityScore);
                  const position = `${activityScore}%`;
                  
                  return (
                    <div className="space-y-3">
                      <div className="relative h-10 rounded-full overflow-hidden bg-gradient-to-r from-red-500 via-yellow-500 to-green-500">
                        <div 
                          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 transition-all duration-500"
                          style={{ left: position }}
                        >
                          <div className="relative">
                            <div className="w-5 h-5 rounded-full bg-white border-2 border-gray-800 dark:border-slate-900 shadow-lg" />
                            <div className="absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap text-xs font-semibold">
                              {activityScore}%
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Nízka</span>
                        <span className="font-semibold" style={{ color: activityInfo.color }}>
                          {activityInfo.label}
                        </span>
                        <span className="text-muted-foreground">Vysoká</span>
                      </div>
                    </div>
                  );
                })()}
              </div>
            ) : null}

            {/* Detailed Conditions */}
            <div className="bg-card dark:bg-slate-900 border-2 border-border rounded-lg p-4">
              <h3 className="text-sm font-semibold mb-3">Detailné podmienky</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-2">
                  <Gauge className="w-4 h-4 text-blue-400" />
                  <div>
                    <p className="text-xs text-muted-foreground">Tlak</p>
                    <p className="text-sm font-semibold">{getAvgPressure(selectedDay.hour)} mb</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Droplets className="w-4 h-4 text-blue-400" />
                  <div>
                    <p className="text-xs text-muted-foreground">Vlhkosť</p>
                    <p className="text-sm font-semibold">
                      {Math.round(selectedDay.hour.reduce((acc, h) => acc + h.humidity, 0) / selectedDay.hour.length)}%
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <CloudRain className="w-4 h-4 text-blue-400" />
                  <div>
                    <p className="text-xs text-muted-foreground">Šanca na dážď</p>
                    <p className="text-sm font-semibold">{selectedDay.day.daily_chance_of_rain}%</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Sunrise className="w-4 h-4 text-orange-400" />
                  <div>
                    <p className="text-xs text-muted-foreground">Východ</p>
                    <p className="text-sm font-semibold">{selectedDay.astro.sunrise}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Sunset className="w-4 h-4 text-orange-600" />
                  <div>
                    <p className="text-xs text-muted-foreground">Západ</p>
                    <p className="text-sm font-semibold">{selectedDay.astro.sunset}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Moon className="w-4 h-4 text-indigo-400" />
                  <div>
                    <p className="text-xs text-muted-foreground">Mesiac</p>
                    <p className="text-sm font-semibold">{getMoonPhaseSlovak(selectedDay.astro.moon_phase)}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Empty State - shown when no forecast and initial load is complete */}
        {!loading && !forecast && !isInitialLoad && (
          <Card className="border-dashed dark:bg-slate-900" data-testid="card-empty-state">
            <CardHeader className="text-center pb-4">
              <div className="flex justify-center mb-4">
                <TacticalIcon icon={MapPin} variant="neutral" size="lg" showLabel={false} />
              </div>
              <CardTitle className="text-xl">Začni plánovať svoju rybačku</CardTitle>
              <CardDescription className="text-base mt-2">
                Zadajte lokalitu do vyhľadávacieho poľa vyššie alebo použijte tlačidlo "Moja poloha" pre automatickú detekciu a získajte presnú predpoveď počasia.
              </CardDescription>
            </CardHeader>
          </Card>
        )}
      </div>
    </DiaryLayout>
  );
}
