const axios = require('axios');
const { ChartJSNodeCanvas } = require('chartjs-node-canvas');

const CHART_TYPES = ["total-bitcoins", "market-price", "market-cap", "trade-volume", "bitcoin-profitable-days", "200w-moving-avg-heatmap", "blocks-size", "avg-block-size", "n-transactions-per-block", "n-payments-per-block", "n-transactions-total", "median-confirmation-time", "avg-confirmation-time", "hash-rate", "difficulty", "miners-revenue", "transaction-fees", "transaction-fees-usd", "fees-usd-per-transaction", "cost-per-transaction-percent", "cost-per-transaction", "n-unique-addresses", "n-transactions", "n-payments", "transactions-per-second", "output-volume", "mempool-count", "mempool-growth", "mempool-size", "utxo-count"];

/**
 * Generates a PNG chart image buffer using data from an API response.
 *
 * @param {Object} api_response - The API response with chart data.
 * @returns {Promise<Buffer>} A promise that resolves to a PNG image buffer.
 */
async function generateChart(api_response) {
  let multiplier = 1;
  if (api_response.unit === "USD") {
    api_response.unit = "Thousands of USD";
    multiplier = 0.001;
  } else if (api_response.unit === "Bytes") {
    api_response.unit = "Megabytes";
    multiplier = 0.000001;
  }

  // Format dates as readable strings (no need for time adapter)
  const xLabels = api_response.values.map(value =>
    new Date(value.x * 1000).toISOString().split('T')[0] // e.g., "2025-04-05"
  );
  const yValues = api_response.values.map(value =>
    parseFloat(value.y) * multiplier
  );

  const data = {
    labels: xLabels,
    datasets: [{
      label: api_response.unit,
      data: yValues,
      borderColor: 'rgba(75, 192, 192, 1)',
      fill: false,
      tension: 0.1
    }]
  };

  const config = {
    type: 'line',
    data,
    options: {
      responsive: true,
      plugins: {
        title: {
          display: true,
          text: api_response.name
        },
        legend: {
          display: false // ✅ Hide the legend
        }
      },
      scales: {
        x: {
          type: 'category', // no date adapter needed
          title: {
            display: true,
            text: api_response.period
          },
          ticks: {
            maxRotation: 45,
            minRotation: 45
          }
        },
        y: {
          title: {
            display: true,
            text: api_response.unit
          }
        }
      }
    }
  };

  const chartJSNodeCanvas = new ChartJSNodeCanvas({ width: 600, height: 500, backgroundColour: 'white' });
  return await chartJSNodeCanvas.renderToBuffer(config);
}


/**
 * Gets a chart from the blockchain.info API
 * @param {string} name chart name from the list
 * @param {string} timespan chart timespan as a string
 */
async function getChart(name, timespan = "10weeks") {
  // Data sanitation
  name = name.replace(/[^a-zA-Z0-9-]/g, '');
  timespan = timespan.replace(/[^a-zA-Z0-9-]/g, '');

  const apiUrl = 'https://api.blockchain.info/charts/' + name + '?timespan=' + timespan+ "&format=json";

  try {
    // Fetch data from the API
    const response = await axios.get(apiUrl);
    const data = response.data;

    return await generateChart(data);
  } catch (error) {
    console.error('Error fetching or processing the data:', error.message);
    return null;
  }
}

module.exports = { getChart, CHART_TYPES }