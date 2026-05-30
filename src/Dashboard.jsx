// src/Dashboard.jsx
import React, { useState, useEffect, useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  AreaChart, Area, Cell, LabelList,
  PieChart, Pie
} from "recharts";
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Popup,
  useMap
} from "react-leaflet";
import L from "leaflet";
import "leaflet.heat";
import { fetchHealthData } from "./utils/fetchHealthData";

//const geoUrl = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";
function MapController({ selectedEvent, resetMapKey }) {
  const map = useMap();

  useEffect(() => {
    if (selectedEvent?.latitude && selectedEvent?.longitude) {
      map.flyTo([selectedEvent.latitude, selectedEvent.longitude], 5, {
        duration: 0.9
      });
    }
  }, [selectedEvent, map]);

  useEffect(() => {
    map.flyTo([20, 0], 2, {
      duration: 0.9
    });
  }, [resetMapKey, map]);

  return null;
}
function HeatmapLayer({ data }) {
  const map = useMap();

  useEffect(() => {
    if (!data?.length) return;

    const points = data
      .filter((d) => d.latitude && d.longitude)
      .map((d) => [
        d.latitude,
        d.longitude,
        Math.min(d.cases / 10000000, 1)
      ]);

    const heat = L.heatLayer(points, {
      radius: 28,
      blur: 22,
      maxZoom: 6,
      gradient: {
        0.2: "#38bdf8",
        0.5: "#facc15",
        0.8: "#f97316",
        1.0: "#ef4444"
      }
    }).addTo(map);

    return () => {
      map.removeLayer(heat);
    };
  }, [data, map]);

  return null;
}
export default function Dashboard() {
  const [rawData, setRawData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [isFocalMode, setIsFocalMode] = useState(false);


  const [selectedContinent, setSelectedContinent] = useState("All");
  const [minCases, setMinCases] = useState(100000);
  const [minDeaths, setMinDeaths] = useState(1000);
  const [riskFilter, setRiskFilter] = useState("All");
  const [basemapMode, setBasemapMode] = useState("dark");
  const [chartFilter, setChartFilter] = useState(null);

  

  

  useEffect(() => {
    fetchHealthData().then((data) => {
      setRawData(data);
      if (data.length > 0) setSelectedEvent(data[0]);
    });
  }, []);

  useEffect(() => {
  let filtered = rawData.filter((d) => {
    return (
      (selectedContinent === "All" || d.continent === selectedContinent) &&
      d.cases >= minCases &&
      d.deaths >= minDeaths &&
      (riskFilter === "All" || d.riskLevel === riskFilter)
    );
  });

  // INTERACTIVE CHART FILTERING

  if (chartFilter?.type === "continent") {
    filtered = filtered.filter(
      (d) => d.continent === chartFilter.value
    );
  }

  if (chartFilter?.type === "risk") {
    filtered = filtered.filter(
      (d) => d.riskLevel === chartFilter.value
    );
  }

  if (chartFilter?.type === "country") {
    filtered = filtered.filter(
      (d) => d.country === chartFilter.value
    );
  }
  if (chartFilter?.type === "criticalBin") {
  if (chartFilter.value === "0") {
    filtered = filtered.filter((d) => d.critical === 0);
  }

  if (chartFilter.value === "1-100") {
    filtered = filtered.filter(
      (d) => d.critical > 0 && d.critical <= 100
    );
  }

  if (chartFilter.value === "100-1000") {
    filtered = filtered.filter(
      (d) => d.critical > 100 && d.critical <= 1000
    );
  }

  if (chartFilter.value === "1000+") {
    filtered = filtered.filter(
      (d) => d.critical > 1000
    );
  }
}

  setFilteredData(filtered);

}, [
  rawData,
  selectedContinent,
  minCases,
  minDeaths,
  riskFilter,
  chartFilter
]);

  const chartDataSource = useMemo(() => {
    if (isFocalMode && selectedEvent) return [selectedEvent];
    return filteredData;
  }, [filteredData, isFocalMode, selectedEvent]);

  const continentData = useMemo(() => {
    const counts = {};

    chartDataSource.forEach((d) => {
      counts[d.continent || "Unknown"] = (counts[d.continent || "Unknown"] || 0) + 1;
    });

    return Object.keys(counts).map((name) => ({
      name,
      count: counts[name]
    }));
  }, [chartDataSource]);

  const casesData = useMemo(() => {
    return chartDataSource
      .slice()
      .sort((a, b) => b.cases - a.cases)
      .slice(0, 12)
      .map((d) => ({
        name: d.country.substring(0, 12),
        country: d.country,
        cases: d.cases
      }));
  }, [chartDataSource]);

  const deathsData = useMemo(() => {
    return chartDataSource
      .slice()
      .sort((a, b) => b.deaths - a.deaths)
      .slice(0, 12)
      .map((d) => ({
        name: d.country.substring(0, 12),
        country: d.country,
        deaths: d.deaths
      }));
  }, [chartDataSource]);

  const activeData = useMemo(() => {
    return chartDataSource
      .slice()
      .sort((a, b) => b.active - a.active)
      .slice(0, 12)
      .map((d) => ({
        name: d.country.substring(0, 12),
        country: d.country,
        active: d.active
      }));
  }, [chartDataSource]);
 

  const criticalData = useMemo(() => [
    {
      bin: "0",
      count: chartDataSource.filter((d) => d.critical === 0).length
    },
    {
      bin: "1-100",
      count: chartDataSource.filter((d) => d.critical > 0 && d.critical <= 100).length
    },
    {
      bin: "100-1000",
      count: chartDataSource.filter((d) => d.critical > 100 && d.critical <= 1000).length
    },
    {
      bin: "1000+",
      count: chartDataSource.filter((d) => d.critical > 1000).length
    }
  ], [chartDataSource]);

  const riskData = useMemo(() => {
    const counts = {
      Low: 0,
      Medium: 0,
      High: 0,
      Critical: 0
    };

    chartDataSource.forEach((d) => {
      counts[d.riskLevel] = (counts[d.riskLevel] || 0) + 1;
    });

    return Object.keys(counts)
      .map((name) => ({
        name,
        value: counts[name]
      }))
      .filter((item) => item.value > 0);
  }, [chartDataSource]);

  const mortalityRateData = useMemo(() => {
    return chartDataSource
      .filter((d) => d.cases > 0)
      .slice()
      .sort((a, b) => b.mortalityRate - a.mortalityRate)
      .slice(0, 15)
      .map((d) => ({
        name: d.country.substring(0, 12),
        country: d.country,
        rate: Number(d.mortalityRate.toFixed(2))
      }));
  }, [chartDataSource]);

  const populationImpactData = useMemo(() => {
    return chartDataSource
      .filter((d) => d.population > 0)
      .slice()
      .sort((a, b) => b.casesPerMillion - a.casesPerMillion)
      .slice(0, 12)
      .map((d) => ({
        name: d.country.substring(0, 12),
        country: d.country,
        value: Math.round(d.casesPerMillion)
      }));
  }, [chartDataSource]);
  const globalStats = useMemo(() => {
  return filteredData.reduce(
    (acc, d) => {
      acc.cases += d.cases || 0;
      acc.deaths += d.deaths || 0;
      acc.recovered += d.recovered || 0;

      if (d.riskLevel === "Critical") {
        acc.criticalCountries += 1;
      }

      return acc;
    },
    {
      cases: 0,
      deaths: 0,
      recovered: 0,
      criticalCountries: 0
    }
  );
}, [filteredData]);

  const [resetMapKey, setResetMapKey] = useState(0);
  

const handleResetFilters = () => {
  setSelectedContinent("All");
  setMinCases(100000);
  setMinDeaths(1000);
  setRiskFilter("All");
  setBasemapMode("dark");
  setChartFilter(null);
  setSelectedEvent(null);
  setIsFocalMode(false);

  // force Leaflet to return to global view
  setResetMapKey((prev) => prev + 1);
};

  return (
    
  <div style={pageStyle}>
    <div style={topBarStyle}>
      <div>
        <h1 style={titleStyle}>Global Health Disaster Intelligence Dashboard</h1>
        <p style={subtitleStyle}>WHO-style public health monitoring interface</p>
      </div>

      <div style={filterGridStyle}>
        <select value={selectedContinent} onChange={(e) => setSelectedContinent(e.target.value)} style={selectStyle}>
          <option value="All">All Continents</option>
          <option value="Africa">Africa</option>
          <option value="Asia">Asia</option>
          <option value="Europe">Europe</option>
          <option value="North America">North America</option>
          <option value="South America">South America</option>
          <option value="Australia-Oceania">Australia-Oceania</option>
        </select>

        <select value={minCases} onChange={(e) => setMinCases(Number(e.target.value))} style={selectStyle}>
          <option value={0}>All Cases</option>
          <option value={10000}>10K+</option>
          <option value={100000}>100K+</option>
          <option value={1000000}>1M+</option>
          <option value={5000000}>5M+</option>
        </select>

        <select value={minDeaths} onChange={(e) => setMinDeaths(Number(e.target.value))} style={selectStyle}>
          <option value={0}>All Deaths</option>
          <option value={100}>100+</option>
          <option value={1000}>1K+</option>
          <option value={10000}>10K+</option>
          <option value={50000}>50K+</option>
        </select>

        <select value={riskFilter} onChange={(e) => setRiskFilter(e.target.value)} style={selectStyle}>
          <option value="All">All Risk Levels</option>
          <option value="Low">Low</option>
          <option value="Medium">Medium</option>
          <option value="High">High</option>
          <option value="Critical">Critical</option>
        </select>

        <select value={basemapMode} onChange={(e) => setBasemapMode(e.target.value)} style={selectStyle}>
          <option value="dark">Dark WHO Intelligence</option>
          <option value="light">Light Boundary View</option>
        </select>

        <button onClick={handleResetFilters} style={buttonStyle}>Reset</button>
      </div>
    </div>

   <div style={counterGridStyle}>
  <Counter title="Global Cases" value={formatNumber(globalStats.cases)} color="#38bdf8" />
  <Counter title="Global Deaths" value={formatNumber(globalStats.deaths)} color="#ef4444" />
  <Counter title="Critical Countries" value={globalStats.criticalCountries} color="#f97316" />
  <Counter title="Recovered" value={formatNumber(globalStats.recovered)} color="#22c55e" />
</div>

{chartFilter && (
  <div style={{ display: "flex", justifyContent: "flex-end" }}>
    <button
  onClick={() => {
    setChartFilter(null);
    setSelectedEvent(null);
    setIsFocalMode(false);
    setResetMapKey((prev) => prev + 1);
  }}
  style={clearButtonStyle}
>
  Clear Chart Filter: {chartFilter.value} ✕
</button>
  </div>
)}

<div style={dashboardGridStyle}>
  <div style={sideColumnStyle}>
    <ChartPanel title="Countries by Continent">
      <BarChart width={260} height={115} data={continentData} layout="vertical">
        <XAxis type="number" stroke="#64748b" fontSize={8} />
        <YAxis type="category" dataKey="name" stroke="#64748b" fontSize={8} width={90} />
        <Tooltip contentStyle={tooltipStyle} />
        <Bar
          dataKey="count"
          fill="#38bdf8"
          radius={[0, 3, 3, 0]}
          cursor="pointer"
          onClick={(data) => {

  // APPLY CONTINENT FILTER
  setChartFilter({
    type: "continent",
    value: data.name
  });

  // FIND A REPRESENTATIVE COUNTRY
  const country = rawData.find(
    (d) => d.continent === data.name
  );

  // UPDATE MAP + INSPECTOR
  if (country) {
    setSelectedEvent(country);
    setIsFocalMode(true);
  }

}}
        />
      </BarChart>
    </ChartPanel>

    <ChartPanel title="Risk Level Proportion">
      <PieChart width={260} height={130}>
        <Pie
          data={riskData}
          dataKey="value"
          cx="50%"
          cy="50%"
          innerRadius={32}
          outerRadius={52}
          paddingAngle={3}
          cursor="pointer"
          onClick={(data) => {

  // APPLY RISK FILTER
  setChartFilter({
    type: "risk",
    value: data.name
  });

  // FIND A REPRESENTATIVE COUNTRY
  const country = rawData.find(
    (d) => d.riskLevel === data.name
  );

  // UPDATE MAP + INSPECTOR
  if (country) {
    setSelectedEvent(country);
    setIsFocalMode(true);
  }

}}
        >
          {riskData.map((entry, index) => (
            <Cell key={index} fill={getRiskColor(entry.name)} />
          ))}
        </Pie>
        <Tooltip contentStyle={tooltipStyle} />
      </PieChart>
    </ChartPanel>

    <ChartPanel title="Top Countries by Cases">
      <BarChart width={260} height={120} data={casesData}>
        <XAxis dataKey="name" stroke="#64748b" fontSize={7} tick={false} />
        <YAxis stroke="#64748b" fontSize={8} />
        <Tooltip contentStyle={tooltipStyle} />
        <Bar
          dataKey="cases"
          fill="#38bdf8"
          radius={[3, 3, 0, 0]}
          cursor="pointer"
          onClick={(data) => {

  // APPLY COUNTRY FILTER
  setChartFilter({
    type: "country",
    value: data.country
  });

  // FIND COUNTRY OBJECT
  const country = rawData.find(
    (d) => d.country === data.country
  );

  // UPDATE MAP + INSPECTOR
  if (country) {
    setSelectedEvent(country);
    setIsFocalMode(true);
  }

}}
        />
      </BarChart>
    </ChartPanel>

    <ChartPanel title="Top Countries by Deaths">
      <AreaChart width={260} height={120} data={deathsData}>
        <XAxis dataKey="name" stroke="#64748b" fontSize={7} tick={false} />
        <YAxis stroke="#64748b" fontSize={8} />
        <Tooltip contentStyle={tooltipStyle} />
        <Area
          type="monotone"
          dataKey="deaths"
          stroke="#ef4444"
          fill="#ef4444"
          fillOpacity={0.18}
          cursor="pointer"
          activeDot={{
            r: 6,
            onClick: (_, payload) =>
              setChartFilter({
                type: "country",
                value: payload.payload.country
              })
          }}
        />
      </AreaChart>
    </ChartPanel>
  </div>

  <div style={centerMapStyle}>
    <div style={panelHeaderStyle}>
      <div>
        <h3 style={panelTitleStyle}>Global Health Disaster Map</h3>
        <span style={subtitleStyle}>{filteredData.length} countries monitored</span>
      </div>

      {chartFilter && (
        <button
  onClick={() => {
    setChartFilter(null);
    setSelectedEvent(null);
    setIsFocalMode(false);
    setResetMapKey((prev) => prev + 1);
  }}
  style={clearButtonStyle}
>
  Clear: {chartFilter.value} ✕
</button>
      )}
    </div>
        <div style={mapBoxStyle}>
          <MapContainer
            center={[20, 0]}
            zoom={2}
            minZoom={2}
            maxZoom={8}
            style={{ width: "100%", height: "100%" }}
            worldCopyJump
          >
            <TileLayer
              attribution='&copy; OpenStreetMap contributors'
              url={
                basemapMode === "dark"
                  ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                  : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              }
            />

            <HeatmapLayer data={filteredData} />
            <MapController
  selectedEvent={isFocalMode ? selectedEvent : null}
  resetMapKey={resetMapKey}
/>

            {filteredData.map((d) => {
              if (!d.latitude || !d.longitude) return null;

              const isSelected = selectedEvent?.country === d.country;
              const isCritical = d.riskLevel === "Critical";

              return (
                
                <CircleMarker
                  key={d.id || d.country}
                  center={[d.latitude, d.longitude]}
                  radius={isSelected ? 11 : Math.max(Math.sqrt(d.cases) / 1300, 4)}
                  className={isCritical ? "pulse-marker" : ""}
                  pathOptions={{
                    color: isSelected ? "#ffffff" : getRiskColor(d.riskLevel),
                    fillColor: isSelected ? "#f59e0b" : getRiskColor(d.riskLevel),
                    fillOpacity: isSelected ? 0.95 : 0.72,
                    weight: isSelected ? 2 : 1
                  }}
                  eventHandlers={{
                    click: () => {
                      setSelectedEvent(d);
                      setIsFocalMode(true);
                    }
                  }}
                >
                  <Popup>
                    <strong>{d.country}</strong>
                    <br />
                    Cases: {formatNumber(d.cases)}
                    <br />
                    Deaths: {formatNumber(d.deaths)}
                    <br />
                    Active: {formatNumber(d.active)}
                    <br />
                    Critical: {formatNumber(d.critical)}
                    <br />
                    Risk: {d.riskLevel}
                  </Popup>
                </CircleMarker>
              );
            })}
          </MapContainer>
        </div>
      </div>

      <div style={sideColumnStyle}>
        

        <ChartPanel title="Critical Cases Distribution">
  <BarChart width={260} height={110} data={criticalData}>
    <XAxis dataKey="bin" stroke="#64748b" fontSize={8} />
    <YAxis stroke="#64748b" fontSize={8} />
    <Tooltip contentStyle={tooltipStyle} />

    <Bar
  dataKey="count"
  fill="#f97316"
  radius={[3, 3, 0, 0]}
  cursor="pointer"
  onClick={(data) => {

    // APPLY FILTER
    setChartFilter({
      type: "criticalBin",
      value: data.bin
    });

    // FIND A REPRESENTATIVE COUNTRY
    let matchingCountries = [];

    if (data.bin === "0") {
      matchingCountries = rawData.filter((d) => d.critical === 0);
    }

    if (data.bin === "1-100") {
      matchingCountries = rawData.filter(
        (d) => d.critical > 0 && d.critical <= 100
      );
    }

    if (data.bin === "100-1000") {
      matchingCountries = rawData.filter(
        (d) => d.critical > 100 && d.critical <= 1000
      );
    }

    if (data.bin === "1000+") {
      matchingCountries = rawData.filter(
        (d) => d.critical > 1000
      );
    }

    // ZOOM TO FIRST MATCH
    if (matchingCountries.length > 0) {
      setSelectedEvent(matchingCountries[0]);
      setIsFocalMode(true);
    }

  }}
>
      <LabelList
        dataKey="count"
        position="top"
        fill="#cbd5e1"
        fontSize={8}
      />
    </Bar>
  </BarChart>
</ChartPanel>

        <ChartPanel title="Highest Mortality Rate">
  <BarChart width={260} height={110} data={mortalityRateData}>
    <XAxis dataKey="name" stroke="#64748b" fontSize={7} tick={false} />
    <YAxis stroke="#64748b" fontSize={8} />
    <Tooltip contentStyle={tooltipStyle} />

    <Bar
      dataKey="rate"
      fill="#ef4444"
      radius={[3, 3, 0, 0]}
      cursor="pointer"
      onClick={(data) => {

  // APPLY DASHBOARD FILTER
  setChartFilter({
    type: "country",
    value: data.country
  });

  // FIND COUNTRY OBJECT
  const country = rawData.find(
    (d) => d.country === data.country
  );

  // ZOOM MAP + UPDATE INSPECTOR
  if (country) {
    setSelectedEvent(country);
    setIsFocalMode(true);
  }

}}
    />
  </BarChart>
</ChartPanel>

        <ChartPanel title="Cases per Million Population">
  <BarChart width={260} height={110} data={populationImpactData}>
    <XAxis dataKey="name" stroke="#64748b" fontSize={7} tick={false} />
    <YAxis stroke="#64748b" fontSize={8} />
    <Tooltip contentStyle={tooltipStyle} />

    <Bar
      dataKey="value"
      fill="#22c55e"
      radius={[3, 3, 0, 0]}
      cursor="pointer"
      onClick={(data) => {

  // APPLY DASHBOARD FILTER
  setChartFilter({
    type: "country",
    value: data.country
  });

  // FIND FULL COUNTRY OBJECT
  const country = rawData.find(
    (d) => d.country === data.country
  );

  // UPDATE MAP + INSPECTOR
  if (country) {
    setSelectedEvent(country);
    setIsFocalMode(true);
  }

}}
    />
  </BarChart>
</ChartPanel>

        <ChartPanel title="Active Cases by Country">
  <BarChart width={260} height={110} data={activeData}>
    <XAxis dataKey="name" stroke="#64748b" fontSize={7} tick={false} />
    <YAxis stroke="#64748b" fontSize={8} />
    <Tooltip contentStyle={tooltipStyle} />

    <Bar
      dataKey="active"
      fill="#f59e0b"
      radius={[3, 3, 0, 0]}
      cursor="pointer"
      onClick={(data) => {

  // APPLY DASHBOARD FILTER
  setChartFilter({
    type: "country",
    value: data.country
  });

  // FIND FULL COUNTRY OBJECT
  const country = rawData.find(
    (d) => d.country === data.country
  );

  // UPDATE MAP + INSPECTOR
  if (country) {
    setSelectedEvent(country);
    setIsFocalMode(true);
  }

}}
    />
  </BarChart>
</ChartPanel>
      </div>
    </div>

    <style>
      {`
        .pulse-marker {
          animation: pulseCritical 1.6s infinite;
          filter: drop-shadow(0 0 8px #ef4444);
        }

        @keyframes pulseCritical {
          0% {
            stroke-width: 1;
            stroke-opacity: 1;
          }
          50% {
            stroke-width: 5;
            stroke-opacity: 0.35;
          }
          100% {
            stroke-width: 1;
            stroke-opacity: 1;
          }
        }

        .leaflet-container {
          background: #050816;
          font-family: sans-serif;
        }

        .leaflet-control-attribution {
          background: rgba(15, 23, 42, 0.75) !important;
          color: #cbd5e1 !important;
          font-size: 10px;
        }

        .leaflet-popup-content-wrapper,
        .leaflet-popup-tip {
          background: #0f172a;
          color: #e5e7eb;
          border: 1px solid rgba(56, 189, 248, 0.25);
        }
      `}
    </style>
  </div>
);
}
function Counter({ title, value, color }) {
  return (
    <div style={counterCardStyle}>
      <span style={miniLabelStyle}>{title}</span>
      <strong style={{ color, fontSize: "20px" }}>{value}</strong>
    </div>
  );
}
function Panel({ title, children }) {
  return (
    <div style={panelStyle}>
      <h3 style={panelTitleStyle}>{title}</h3>
      {children}
    </div>
  );
}

function ChartPanel({ title, children }) {
  return (
    <Panel title={title}>
      <div style={chartContainerStyle}>
        {children}
      </div>
    </Panel>
  );
}



function getRiskColor(level) {
  switch (level) {
    case "Critical":
      return "#dc2626";
    case "High":
      return "#f97316";
    case "Medium":
      return "#facc15";
    case "Low":
      return "#22c55e";
    default:
      return "#3b82f6";
  }
}

function formatNumber(value) {
  if (!value && value !== 0) return "0";
  return Number(value).toLocaleString();
}
const miniLabelStyle = {
  color: "#94a3b8",
  fontSize: "10px",
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  fontWeight: "700"
};






const pageStyle = {
  position: "absolute",
  inset: 0,
  background: "radial-gradient(circle at top, #0f172a 0%, #050816 45%, #000 100%)",
  color: "#ffffff",
  padding: "14px",
  fontFamily: "Inter, system-ui, sans-serif",
  boxSizing: "border-box",
  overflow: "hidden",
  display: "flex",
  flexDirection: "column",
  gap: "12px"
};

const topBarStyle = {
  display: "grid",
  gridTemplateColumns: "360px 1fr",
  gap: "14px",
  alignItems: "center"
};

const titleStyle = {
  margin: 0,
  fontSize: "18px",
  letterSpacing: "0.04em",
  color: "#e0f2fe"
};

const subtitleStyle = {
  margin: 0,
  fontSize: "10px",
  color: "#94a3b8"
};

const filterGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(6, 1fr)",
  gap: "8px"
};

const counterGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(4, 1fr)",
  gap: "10px"
};

const dashboardGridStyle = {
  display: "grid",
  gridTemplateColumns: "310px minmax(520px, 1fr) 310px",
  gap: "12px",
  flexGrow: 1,
  minHeight: 0
};

const sideColumnStyle = {
  display: "grid",
  gridTemplateRows: "repeat(4, 1fr)",
  gap: "10px",
  minHeight: 0
};

const centerMapStyle = {
  background: "rgba(15, 23, 42, 0.62)",
  border: "1px solid rgba(56, 189, 248, 0.18)",
  borderRadius: "18px",
  padding: "12px",
  display: "flex",
  flexDirection: "column",
  minHeight: 0,
  backdropFilter: "blur(12px)",
  boxShadow: "0 20px 60px rgba(0,0,0,0.35)"
};

const mapBoxStyle = {
  flexGrow: 1,
  borderRadius: "14px",
  overflow: "hidden",
  border: "1px solid rgba(56, 189, 248, 0.18)",
  minHeight: 0
};

const panelStyle = {
  background: "rgba(15, 23, 42, 0.58)",
  border: "1px solid rgba(56, 189, 248, 0.14)",
  borderRadius: "16px",
  padding: "10px",
  display: "flex",
  flexDirection: "column",
  minHeight: 0,
  backdropFilter: "blur(12px)",
  boxShadow: "0 12px 35px rgba(0,0,0,0.25)"
};

const counterCardStyle = {
  ...panelStyle,
  minHeight: "54px",
  justifyContent: "center",
  gap: "5px"
};

const chartContainerStyle = {
  flexGrow: 1,
  minHeight: 0,
  display: "flex",
  justifyContent: "center",
  alignItems: "center"
};

const panelHeaderStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: "8px"
};

const panelTitleStyle = {
  fontSize: "10px",
  fontWeight: "800",
  color: "#94a3b8",
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  margin: "0 0 6px 0"
};

const selectStyle = {
  background: "rgba(15, 23, 42, 0.78)",
  border: "1px solid rgba(56, 189, 248, 0.2)",
  color: "#e0f2fe",
  padding: "8px",
  borderRadius: "10px",
  fontSize: "11px",
  outline: "none"
};

const buttonStyle = {
  background: "linear-gradient(135deg, #0ea5e9, #2563eb)",
  border: "1px solid rgba(56, 189, 248, 0.35)",
  color: "#fff",
  padding: "8px",
  borderRadius: "10px",
  fontWeight: "800",
  cursor: "pointer",
  fontSize: "11px"
};

const tooltipStyle = {
  backgroundColor: "#0f172a",
  borderColor: "rgba(56,189,248,0.25)",
  color: "#fff",
  fontSize: "10px"
};
const clearButtonStyle = {
  background: "rgba(239, 68, 68, 0.14)",
  border: "1px solid rgba(239, 68, 68, 0.35)",
  color: "#fecaca",
  padding: "7px 10px",
  borderRadius: "10px",
  fontSize: "11px",
  fontWeight: "800",
  cursor: "pointer",
  backdropFilter: "blur(12px)"
};