/* ==============================================================
   Global Carbon Emission Analyzer – script.js
   ============================================================== */

const apiKey = "Your_API_Key";
const apiUrl = "https://api.climatiq.io/estimate";

const countries = [
  { name: "India", flag: "India Flag", region: "IN" },
  { name: "USA (Michigan)", flag: "USA Flag", region: "US-MI" },
  { name: "Germany", flag: "Germany Flag", region: "DE" },
  { name: "France", flag: "France Flag", region: "FR" },
  { name: "China", flag: "China Flag", region: "CN" },
  { name: "Japan", flag: "Japan Flag", region: "JP" },
  { name: "United Kingdom", flag: "UK Flag", region: "GB" },
  { name: "Canada", flag: "Canada Flag", region: "CA" },
  { name: "Australia", flag: "Australia Flag", region: "AU" },
  { name: "Brazil", flag: "Brazil Flag", region: "BR" }
];

let chart = null;
let currentData = [];

/* ---------- Theme ---------- */
function toggleTheme() {
  const body = document.body;
  const btn = document.getElementById("themeBtn");
  if (body.hasAttribute("data-theme")) {
    body.removeAttribute("data-theme");
    btn.textContent = "Moon";
  } else {
    body.setAttribute("data-theme", "dark");
    btn.textContent = "Sun";
  }
}

/* ---------- Table Sorting ---------- */
function sortTable(col) {
  const table = document.getElementById("resultsTable");
  const rows = Array.from(table.tBodies[0].rows);
  const numericCols = [2, 3, 4, 5];

  rows.sort((a, b) => {
    let A = a.cells[col].textContent.trim();
    let B = b.cells[col].textContent.trim();
    if (numericCols.includes(col)) {
      return parseFloat(A) - parseFloat(B);
    }
    return A.localeCompare(B);
  });

  // reverse if same column clicked again
  if (table.dataset.sortCol == col) rows.reverse();
  table.dataset.sortCol = (table.dataset.sortCol == col) ? "" : col;

  const tbody = document.getElementById("resultsBody");
  rows.forEach(r => tbody.appendChild(r));
}

/* ---------- Live Search ---------- */
function filterTable() {
  const query = document.getElementById("searchInput").value.toLowerCase();
  document.querySelectorAll("#resultsBody tr").forEach(row => {
    const txt = row.textContent.toLowerCase();
    row.style.display = txt.includes(query) ? "" : "none";
  });
}

/* ---------- API / Fallback ---------- */
async function fetchEmission(region, energy) {
  const body = {
    emission_factor: {
      activity_id: "electricity-supply_grid-source_residual_mix",
      region: region,
      data_version: "^27"
    },
    parameters: { energy, energy_unit: "kWh" }
  };

  try {
    const res = await fetch(apiUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json();
    if (!data.co2e) throw new Error("No CO2e");

    const total = data.co2e;
    const co2 = data.constituent_gases?.co2 ?? total * 0.98;
    const ch4 = data.constituent_gases?.ch4 ?? total * 0.001;
    const n2o = data.constituent_gases?.n2o ?? total * 0.0005;

    return {
      total: total.toFixed(3),
      co2: co2.toFixed(3),
      ch4: ch4.toFixed(5),
      n2o: n2o.toFixed(5),
      year: data.emission_factor?.year || "2023",
      source: data.emission_factor?.source || "Climatiq"
    };
  } catch (e) {
    // region-specific fallback factors (kg CO₂e / kWh)
    const factors = {
      "IN": 0.82, "CN": 0.70, "US-MI": 0.55, "DE": 0.35,
      "FR": 0.06, "JP": 0.45, "GB": 0.23, "CA": 0.14,
      "AU": 0.68, "BR": 0.09
    };
    const factor = factors[region] || 0.5;
    const total = energy * factor;

    return {
      total: total.toFixed(3),
      co2: (total * 0.98).toFixed(3),
      ch4: (total * 0.001).toFixed(5),
      n2o: (total * 0.0005).toFixed(5),
      year: "2024",
      source: "Regional Avg (Fallback)"
    };
  }
}

/* ---------- Stats ---------- */
function updateStats(data) {
  const vals = data.map(d => parseFloat(d.total));
  const highest = Math.max(...vals).toFixed(3);
  const lowest  = Math.min(...vals).toFixed(3);
  const avg     = (vals.reduce((a,b)=>a+b,0)/vals.length).toFixed(3);
  const total   = vals.reduce((a,b)=>a+b,0).toFixed(3);

  const cards = document.querySelectorAll(".stat-card .stat-value");
  cards[0].textContent = `${highest} kg`;
  cards[1].textContent = `${lowest} kg`;
  cards[2].textContent = `${avg} kg`;
  cards[3].textContent = `${total} kg`;
}

/* ---------- Chart ---------- */
function updateChart(data) {
  const ctx = document.getElementById('emissionChart').getContext('2d');
  const labels = data.map(d => d.name.split(" ")[0]);
  const values = data.map(d => parseFloat(d.total));

  if (chart) chart.destroy();

  chart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'CO₂e Emissions (kg)',
        data: values,
        backgroundColor: 'rgba(0,120,215,0.7)',
        borderColor: 'rgba(0,120,215,1)',
        borderWidth: 1,
        borderRadius: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true } }
    }
  });
}

/* ---------- Main Calculation ---------- */
async function calculateForAll() {
  const energy = parseFloat(document.getElementById("energyInput").value);
  const tbody  = document.getElementById("resultsBody");

  if (isNaN(energy) || energy <= 0) {
    tbody.innerHTML = `<tr><td colspan="8" class="loading">Please enter a valid energy value (kWh).</td></tr>`;
    return;
  }

  tbody.innerHTML = `<tr><td colspan="8" class="loading">Fetching data for ${countries.length} countries…</td></tr>`;

  const results = [];
  for (const c of countries) {
    const data = await fetchEmission(c.region, energy);
    results.push({ ...c, ...data });
  }

  // sort highest to lowest
  results.sort((a,b) => parseFloat(b.total) - parseFloat(a.total));
  currentData = results;

  tbody.innerHTML = results.map(r => `
    <tr>
      <td><span class="flag">${r.flag}</span> ${r.name}</td>
      <td>${r.region}</td>
      <td><strong>${r.total}</strong></td>
      <td>${r.co2}</td>
      <td>${r.ch4}</td>
      <td>${r.n2o}</td>
      <td>${r.year}</td>
      <td><em>${r.source}</em></td>
    </tr>
  `).join("");

  updateStats(results);
  updateChart(results);
}

/* ---------- Enter key shortcut ---------- */
document.getElementById("energyInput").addEventListener("keypress", e => {
  if (e.key === "Enter") calculateForAll();
});
