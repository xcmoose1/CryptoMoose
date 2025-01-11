// Market Cycles Chart
function initializeMarketCycleChart() {
    const ctx = document.getElementById('marketCycleChart').getContext('2d');
    
    const data = {
        labels: ['Accumulation', 'Mark Up', 'Distribution', 'Mark Down'],
        datasets: [{
            label: 'Market Cycle',
            data: [30, 80, 60, 20],
            borderColor: '#f0b90b',
            backgroundColor: 'rgba(240, 185, 11, 0.2)',
            tension: 0.4,
            fill: true
        }]
    };

    const config = {
        type: 'line',
        data: data,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    },
                    ticks: {
                        color: 'rgba(255, 255, 255, 0.7)'
                    }
                },
                x: {
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    },
                    ticks: {
                        color: 'rgba(255, 255, 255, 0.7)'
                    }
                }
            }
        }
    };

    new Chart(ctx, config);
}

// Initialize chart when page loads
document.addEventListener('DOMContentLoaded', initializeMarketCycleChart);
