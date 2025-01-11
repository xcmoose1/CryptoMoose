// Initialize all components
document.addEventListener('DOMContentLoaded', () => {
    // Start the refresh countdown
    let countdown = 300; // 5 minutes
    const countdownElement = document.getElementById('refreshCountdown');
    
    function updateCountdown() {
        const minutes = Math.floor(countdown / 60);
        const seconds = countdown % 60;
        countdownElement.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        
        if (countdown > 0) {
            countdown--;
        } else {
            countdown = 300;
            // Trigger refresh of data
            if (window.marketMetrics) window.marketMetrics.refreshData();
            if (window.marketAnalysis) window.marketAnalysis.refreshData();
            if (window.multiAssetAnalysis) window.multiAssetAnalysis.updateChart();
        }
    }
    
    setInterval(updateCountdown, 1000);
    updateCountdown();

    // Add dots to existing indicators
    document.querySelectorAll('.indicator').forEach(indicator => {
        const dotsContainer = document.createElement('div');
        dotsContainer.className = 'signal-dots';
        for (let i = 0; i < 3; i++) {
            const dot = document.createElement('div');
            dot.className = 'signal-dot';
            dotsContainer.appendChild(dot);
        }
        indicator.appendChild(dotsContainer);
    });

    // Initialize chart and controls
    const chartContainer = document.querySelector('.chart-container');
    if (chartContainer) {
        chartContainer.style.height = '600px';
        // Create the chart instance
        const chart = LightweightCharts.createChart(chartContainer, {
            layout: {
                background: { color: 'transparent' },
                textColor: '#d1d4dc',
            },
            grid: {
                vertLines: { color: 'rgba(42, 46, 57, 0.5)' },
                horzLines: { color: 'rgba(42, 46, 57, 0.5)' },
            },
            timeScale: {
                timeVisible: true,
                secondsVisible: false,
            },
        });

        // Add indicators to chart
        const rsiSeries = chart.addLineSeries({
            color: '#ff9f43',
            title: 'RSI',
            priceScaleId: 'right',
            scaleMargins: {
                top: 0.1,
                bottom: 0.1,
            },
        });

        chart.addLineSeries({
            color: '#00bcd4',
            title: 'BB',
            priceScaleId: 'right',
        });

        chart.addHistogramSeries({
            color: '#2196F3',
            title: 'MACD',
            priceScaleId: 'right',
            scaleMargins: {
                top: 0.7,
                bottom: 0,
            },
        });

        chart.addLineSeries({
            color: '#7C4DFF',
            title: 'EMA',
            priceScaleId: 'right',
        });

        chart.addLineSeries({
            color: '#FFC107',
            title: 'OBV',
            priceScaleId: 'right',
            scaleMargins: {
                top: 0.8,
                bottom: 0,
            },
        });

        chart.addLineSeries({
            color: '#E91E63',
            title: 'STOCH',
            priceScaleId: 'right',
            scaleMargins: {
                top: 0.9,
                bottom: 0,
            },
        });

        // Chart expand/collapse functionality
        const expandBtn = document.querySelector('.expand-chart-btn');
        const closeBtn = document.querySelector('.close-chart-btn');

        // Only add event listeners if the elements exist
        if (expandBtn && closeBtn) {
            expandBtn.addEventListener('click', () => {
                chartContainer.classList.add('expanded');
                // Trigger chart resize
                if (chart) {
                    chart.resize(
                        chartContainer.clientWidth,
                        chartContainer.clientHeight
                    );
                }
            });

            closeBtn.addEventListener('click', () => {
                chartContainer.classList.remove('expanded');
                // Trigger chart resize
                if (chart) {
                    chart.resize(
                        chartContainer.clientWidth,
                        chartContainer.clientHeight
                    );
                }
            });
        }
    }

    // Handle escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && chartContainer.classList.contains('expanded')) {
            chartContainer.classList.remove('expanded');
            if (chart) {
                chart.resize(
                    chartContainer.clientWidth,
                    chartContainer.clientHeight
                );
            }
        }
    });
});
