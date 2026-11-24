type WeatherTheme =
  | 'sunny'
  | 'partly-cloudy'
  | 'cloudy'
  | 'rain'
  | 'snow'
  | 'storm'
  | 'fog'
  | 'haze'
  | 'default';

type WeatherPeriod = 'day' | 'night' | 'unknown';

export function weatherAppearance(
  condition: string,
  icon: string
): string {
  const text = condition.trim().toLowerCase();
  let period: WeatherPeriod = 'unknown';

  // The validated WeatherAPI icon describes the destination's day/night period.
  try {
    const url = new URL(icon);

    if (
      url.protocol === 'https:' &&
      url.hostname === 'cdn.weatherapi.com' &&
      !url.username &&
      !url.password &&
      !url.port
    ) {
      const match =
        /^\/weather\/\d+x\d+\/(day|night)\/\d+\.png$/.exec(
          url.pathname
        );

      if (match) period = match[1] as WeatherPeriod;
    }
  } catch {
    // Missing icon metadata must not prevent rendering the readings.
  }

  let theme: WeatherTheme = 'default';

  // Specific conditions take precedence over general precipitation keywords.
  if (/thunder|lightning/.test(text)) theme = 'storm';
  else if (/fog|mist/.test(text)) theme = 'fog';
  else if (/haze|smog|smoke|dust|sandstorm/.test(text)) theme = 'haze';
  else if (
    /snow|sleet|blizzard|ice pellets|hail|freezing (rain|drizzle)/.test(text)
  ) theme = 'snow';
  else if (/rain|drizzle|shower/.test(text)) theme = 'rain';
  else if (/partly cloudy/.test(text)) theme = 'partly-cloudy';
  else if (/cloud|overcast/.test(text)) theme = 'cloudy';
  else if (/^(sunny|clear)$/.test(text)) theme = 'sunny';

  if (period === 'unknown') {
    if (text === 'sunny') period = 'day';
    else if (text === 'clear') period = 'night';
  }

  return `weather-theme-${theme} weather-period-${period}`;
}