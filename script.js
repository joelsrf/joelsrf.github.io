// URLs for current wind speed, gusts and past measurements from MeteoSchweiz.
// They are fetched via the `corsproxy.io` service so that the data can be
// retrieved directly by the browser.
const speedUrl =
  'https://corsproxy.io/?url=https://www.meteoschweiz.admin.ch/product/output/measured-values/stationsTable/messwerte-windgeschwindigkeit-kmh-10min/stationsTable.messwerte-windgeschwindigkeit-kmh-10min.de.json';
const gustUrl =
  'https://corsproxy.io/?url=https://www.meteoschweiz.admin.ch/product/output/measured-values/stationsTable/messwerte-wind-boeenspitze-kmh-10min/stationsTable.messwerte-wind-boeenspitze-kmh-10min.de.json';
const pastUrl =
  'https://corsproxy.io/?url=https://www.meteoschweiz.admin.ch/product/output/measured-values/chartData/wind_hour/chartData.wind_hour.HOE.de.json';

function findByStationId(data, id) {
  if (Array.isArray(data)) {
    for (const item of data) {
      const res = findByStationId(item, id);
      if (res) return res;
    }
  } else if (data && typeof data === 'object') {
    if (data.id === id) {
      return data;
    }
    for (const key in data) {
      const res = findByStationId(data[key], id);
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
  if (data.series && typeof data.series === 'object') {
    for (const key in data.series) {
      const val = data.series[key];
      if (Array.isArray(val)) return val;
    }
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
    // Fetch the current wind speed for the Hörnli station.
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

    const speed = findByStationId(speedData, 'HOE');
    const gust = findByStationId(gustData, 'HOE');
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
