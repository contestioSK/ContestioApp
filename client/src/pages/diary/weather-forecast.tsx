import { useState, useEffect } from "react";
import DiaryLayout from "@/components/DiaryLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
  CloudDrizzle
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

export default function WeatherForecast() {
  const [forecast, setForecast] = useState<WeatherForecast | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [location, setLocation] = useState<{ lat: number; lon: number } | null>(null);

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
        setLocation({ lat: latitude, lon: longitude });
        
        try {
          const response = await fetch(
            `/api/weather/forecast?lat=${latitude}&lon=${longitude}`
          );
          
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
              3-dňová predpoveď pre vaše rybárske výpravy
            </p>
          </div>

          <Button 
            onClick={getMyLocation} 
            disabled={loading}
            data-testid="button-get-location"
            className="w-fit"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Načítavam...
              </>
            ) : (
              <>
                <MapPin className="w-4 h-4 mr-2" />
                Získať predpoveď pre moju polohu
              </>
            )}
          </Button>

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
