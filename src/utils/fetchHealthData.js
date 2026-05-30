// src/utils/fetchHealthData.js
export const fetchHealthData = async () => {
  const url = "https://disease.sh/v3/covid-19/countries";

  try {
    const response = await fetch(url);
    const data = await response.json();

    return data.map((c) => {
      const cases = c.cases || 0;
      const deaths = c.deaths || 0;
      const mortalityRate = cases > 0 ? (deaths / cases) * 100 : 0;

      let riskLevel = "Low";
      if (cases > 10000000 || deaths > 100000) riskLevel = "Critical";
      else if (cases > 1000000 || deaths > 10000) riskLevel = "High";
      else if (cases > 100000 || deaths > 1000) riskLevel = "Medium";

      return {
        id: c.countryInfo?._id || c.country,
        country: c.country,
        continent: c.continent || "Unknown",
        cases,
        deaths,
        recovered: c.recovered || 0,
        active: c.active || 0,
        critical: c.critical || 0,
        tests: c.tests || 0,
        population: c.population || 0,
        casesPerMillion: c.casesPerOneMillion || 0,
        deathsPerMillion: c.deathsPerOneMillion || 0,
        mortalityRate,
        riskLevel,
        latitude: c.countryInfo?.lat || 0,
        longitude: c.countryInfo?.long || 0
      };
    });
  } catch (error) {
    console.error("Error fetching health data:", error);
    return [];
  }
};