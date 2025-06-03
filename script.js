// Use a local copy of the wind speed data for the Hörnli station.
// The file is located under `data/wind.json` and contains the JSON snippet
// from MeteoSchweiz with the current measurement for the station.
const speedUrl = 'data/wind.json';

// The gust and past wind speed values are still attempted from the remote
// sources. These requests may fail in restricted environments but are kept so
// that the page works when network access is allowed.
const gustUrl = 'https://www.meteoschweiz.admin.ch/product/output/measured-values/stationsTable/messwerte-wind-boeenspitze-kmh-10min/stationsTable.messwerte-wind-boeenspitze-kmh-10min.de.json';
const pastUrl = 'https://www.meteoschweiz.admin.ch/product/output/measured-values/chartData/wind_hour/chartData.wind_hour.HOE.de.json';

function findByStationName(data, name) {
  if (Array.isArray(data)) {
    for (const item of data) {
      const res = findByStationName(item, name);
      if (res) return res;
    }
  } else if (data && typeof data === 'object') {
    if (data.station_name === name) {
      return data;
    }
    for (const key in data) {
      const res = findByStationName(data[key], name);
      if (res) return res;
    }
  }
  return null;
}

function extractSeries(data) {
  if (!data) return [];
  if (Array.isArray(data.series)) {
    return data.series;
  }
  for (const key in data) {
    const res = extractSeries(data[key]);
    if (res.length) return res;
  }
  return [];
}

function updateRow(row, value) {
  row.querySelector('.value').textContent = value;
  updateIndicator(row.querySelector('.indicator'), Number(value));
}

function updateIndicator(el, value) {
  const strong = value >= 30;
  el.textContent = '\u2191';
  el.classList.add(strong ? 'strong' : 'weak');
}

async function loadData() {
  try {
    // Always load the current wind speed from the local JSON file.
    const speedRes = await fetch(speedUrl);
    const speedData = await speedRes.json();

    // Try to load gust and past data from the remote sources. These may fail
    // due to network restrictions, in which case empty objects are used.
    let gustData = {};
    let pastData = {};
    try {
      const gr = await fetch(gustUrl);
      gustData = await gr.json();
    } catch (e) {
      console.warn('Failed to fetch gust data:', e);
    }
    try {
      const pr = await fetch(pastUrl);
      pastData = await pr.json();
    } catch (e) {
      console.warn('Failed to fetch past data:', e);
    }

    const speed = findByStationName(speedData, 'H\u00f6rnli');
    const gust = findByStationName(gustData, 'H\u00f6rnli');
    const pastSeries = extractSeries(pastData);

    if (speed && speed.current) {
      updateRow(
        document.getElementById('current-speed'),
        speed.current.value
      );
    }
    if (gust && gust.current) {
      updateRow(
        document.getElementById('current-gust'),
        gust.current.value
      );
    }

    const pastBody = document.querySelector('#past-table tbody');
    pastSeries.slice(-24).forEach(entry => {
      const [timestamp, value] = entry;
      const tr = document.createElement('tr');
      const date = new Date(timestamp * 1000);
      tr.innerHTML = `
        <td>${date.toLocaleString()}</td>
        <td>${value}</td>
        <td class="indicator"></td>
      `;
      updateIndicator(tr.querySelector('.indicator'), Number(value));
      pastBody.appendChild(tr);
    });
  } catch (err) {
    console.error('Failed to load wind data', err);
  }
}

document.addEventListener('DOMContentLoaded', loadData);
