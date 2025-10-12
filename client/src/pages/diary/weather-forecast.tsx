import { useState, useEffect, useRef } from "react";
import DiaryLayout from "@/components/DiaryLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
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
  Search
} from "lucide-react";
import { format } from "date-fns";
import { sk } from "date-fns/locale";

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
  };
  hour: Array<{
    time: string;
    temp_c: number;
    pressure_mb: number;
    precip_mm: number;
    humidity: number;
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
  const [forecast, setForecast] = useState<WeatherForecast | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<LocationResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

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

  const getWeatherIcon = (code: number) => {
    // WeatherAPI condition codes
    if (code === 1000) return <Sun className="w-12 h-12 text-yellow-500" />;
    if ([1003, 1006, 1009].includes(code)) return <Cloud className="w-12 h-12 text-gray-400" />;
    if ([1063, 1180, 1183, 1186, 1189, 1192, 1195, 1240, 1243, 1246].includes(code)) 
      return <CloudRain className="w-12 h-12 text-blue-400" />;
    if ([1066, 1210, 1213, 1216, 1219, 1222, 1225, 1255, 1258].includes(code)) 
      return <CloudSnow className="w-12 h-12 text-blue-200" />;
    if ([1072, 1150, 1153, 1168, 1171].includes(code)) 
      return <CloudDrizzle className="w-12 h-12 text-blue-300" />;
    return <Cloud className="w-12 h-12 text-gray-400" />;
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

  // Get average pressure for the day (from hourly data)
  const getAvgPressure = (hours: ForecastDay['hour']) => {
    const pressures = hours.map(h => h.pressure_mb);
    return Math.round(pressures.reduce((a, b) => a + b, 0) / pressures.length);
  };

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

        {forecast && (
          <div className="space-y-6">
            {/* Current Weather */}
            <Card data-testid="card-current-weather">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="w-5 h-5" />
                  {forecast.location.name}, {forecast.location.region}
                </CardTitle>
                <CardDescription>Aktuálne počasie</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <img 
                      src={`https:${forecast.current.condition.icon}`} 
                      alt={forecast.current.condition.text}
                      className="w-16 h-16"
                    />
                    <div>
                      <p className="text-4xl font-bold">{Math.round(forecast.current.temp_c)}°C</p>
                      <p className="text-muted-foreground">{forecast.current.condition.text}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <Wind className="w-4 h-4 text-muted-foreground" />
                      <span>{Math.round(forecast.current.wind_kph)} km/h</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Gauge className="w-4 h-4 text-muted-foreground" />
                      <span>{forecast.current.pressure_mb} mb</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Droplets className="w-4 h-4 text-muted-foreground" />
                      <span>{forecast.current.humidity}%</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 3-Day Forecast */}
            <div>
              <h2 className="text-2xl font-bold mb-4">3-dňová predpoveď</h2>
              <div className="grid gap-4 md:grid-cols-3">
                {forecast.forecast.forecastday.map((day, index) => (
                  <Card key={day.date} data-testid={`card-forecast-day-${index}`}>
                    <CardHeader>
                      <CardTitle className="text-lg capitalize">
                        {getDayName(day.date)}
                      </CardTitle>
                      <CardDescription>{getDate(day.date)}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between">
                        {getWeatherIcon(day.day.condition.code)}
                        <div className="text-right">
                          <p className="text-3xl font-bold">
                            {Math.round(day.day.maxtemp_c)}°
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {Math.round(day.day.mintemp_c)}°
                          </p>
                        </div>
                      </div>

                      <p className="text-sm text-muted-foreground text-center">
                        {day.day.condition.text}
                      </p>

                      <div className="grid grid-cols-2 gap-3 pt-3 border-t text-sm">
                        <div className="flex items-center gap-2" data-testid={`text-rain-${index}`}>
                          <Droplets className="w-4 h-4 text-blue-500" />
                          <span>{day.day.totalprecip_mm} mm</span>
                        </div>
                        <div className="flex items-center gap-2" data-testid={`text-wind-${index}`}>
                          <Wind className="w-4 h-4 text-gray-500" />
                          <span>{Math.round(day.day.maxwind_kph)} km/h</span>
                        </div>
                        <div className="flex items-center gap-2" data-testid={`text-pressure-${index}`}>
                          <Gauge className="w-4 h-4 text-purple-500" />
                          <span>{getAvgPressure(day.hour)} mb</span>
                        </div>
                        <div className="flex items-center gap-2" data-testid={`text-rain-chance-${index}`}>
                          <Cloud className="w-4 h-4 text-gray-400" />
                          <span>{day.day.daily_chance_of_rain}%</span>
                        </div>
                      </div>

                      <div className="text-xs text-muted-foreground pt-2 border-t">
                        <div className="flex justify-between">
                          <span>Východ: {day.astro.sunrise}</span>
                          <span>Západ: {day.astro.sunset}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </DiaryLayout>
  );
}
