export const fetchHealthData = async () => {
  const url = "https://disease.sh/v3/covid-19/countries";

  try {
    const response = await fetch(url);
    const data = await response.json();

    return data.map(c => ({
      id: c.countryInfo._id,
      country: c.country,
      cases: c.cases,
      deaths: c.deaths,
      recovered: c.recovered,
      active: c.active,
      continent: c.continent,
      latitude: c.countryInfo.lat,
      longitude: c.countryInfo.long,
      critical: c.critical,
      tests: c.tests,
      population: c.population
    }));
  } catch (error) {
    console.error(error);
    return [];
  }
};