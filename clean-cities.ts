import fs from 'fs';

// קריאת הקובץ המקורי מהנתיב הנכון
const rawData = fs.readFileSync('src/Components/Components/SearchBar/cities.json', 'utf8');
const cities = JSON.parse(rawData);

// עיבוד: שמירה רק של השדה 'name'
const cleanedCities = cities.map((city: { name: string }) => ({ name: city.name }));

// כתיבת הקובץ החדש
fs.writeFileSync('cleaned-cities.json', JSON.stringify(cleanedCities, null, 2));
console.log('Cleaning complete! Check cleaned-cities.json');