const speedUrl = 'https://www.meteoschweiz.admin.ch/product/output/measured-values/stationsTable/messwerte-windgeschwindigkeit-kmh-10min/stationsTable.messwerte-windgeschwindigkeit-kmh-10min.de.json';
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
    const [speedRes, gustRes, pastRes] = await Promise.all([
      fetch(speedUrl),
      fetch(gustUrl),
      fetch(pastUrl)
    ]);

    const speedData = await speedRes.json();
    const gustData = await gustRes.json();
    const pastData = await pastRes.json();

    const speed = findByStationName(speedData, 'H\u00f6rnli');
    const gust = findByStationName(gustData, 'H\u00f6rnli');
    const pastSeries = extractSeries(pastData);

    if (speed) updateRow(document.getElementById('current-speed'), speed.value);
    if (gust) updateRow(document.getElementById('current-gust'), gust.value);

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
