import { MarketMetrics } from './market-metrics.js';
import { indicatorSignals } from './indicator-signals.js';

// DOM Elements
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Initialize market metrics
        const marketMetrics = new MarketMetrics();
        await marketMetrics.init();
        
        // Initialize indicator signals
        await indicatorSignals.init();
        
        // Initialize other components
        initializePriceTicker();
        initializeSignalHistory();
        initializeCountdown();
        updateSignalPreview();
        initializeTestimonials();
        initializeAnimations();
        initializeChart();
        updateLivePrice();
    } catch (error) {
        console.error('Error initializing application:', error);
    }
});

// Sample price data
const prices = [
    { symbol: 'BTC', price: 43750, change: +2.3 },
    { symbol: 'ETH', price: 2280, change: +1.8 },
    { symbol: 'SOL', price: 75.20, change: +4.2 },
    { symbol: 'BNB', price: 245, change: -0.5 }
];

// Initialize price ticker
function initializePriceTicker() {
    const tickerContent = document.querySelector('.ticker-content');
    
    function updateTicker() {
        const content = prices.map(coin => {
            const changeClass = coin.change >= 0 ? 'positive' : 'negative';
            const changeSymbol = coin.change >= 0 ? '+' : '';
            return `
                <span class="ticker-item">
                    <strong>${coin.symbol}</strong>
                    $${coin.price.toLocaleString()}
                    <span class="${changeClass}">${changeSymbol}${coin.change}%</span>
                </span>
            `;
        }).join('');
        
        tickerContent.innerHTML = content + content; // Duplicate for seamless loop
    }
    
    updateTicker();
    // Simulate price updates
    setInterval(() => {
        prices.forEach(coin => {
            coin.price *= (1 + (Math.random() - 0.5) * 0.002);
            coin.change = (Math.random() - 0.5) * 8;
        });
        updateTicker();
    }, 5000);
}

// Signal history
function initializeSignalHistory() {
    const signalGrid = document.querySelector('.signal-grid');
    const signalHistory = [];
    
    function generateHistoricalSignal(daysAgo) {
        const pairs = ['BTC/USDT', 'ETH/USDT', 'SOL/USDT'];
        const pair = pairs[Math.floor(Math.random() * pairs.length)];
        const basePrice = Math.floor(Math.random() * 10000) + 40000;
        const actualPrice = basePrice * (1 + (Math.random() * 0.2 - 0.1));
        const success = Math.random() > 0.2; // 80% success rate
        
        const date = new Date();
        date.setDate(date.getDate() - daysAgo);
        
        return {
            pair,
            entryPrice: basePrice,
            actualPrice,
            date,
            success,
            profit: ((actualPrice - basePrice) / basePrice * 100).toFixed(2)
        };
    }
    
    // Generate initial history
    for (let i = 0; i < 6; i++) {
        signalHistory.push(generateHistoricalSignal(i));
    }
    
    function updateSignalHistory() {
        signalGrid.innerHTML = signalHistory.map(signal => {
            const profitClass = signal.success ? 'positive' : 'negative';
            const profitSign = signal.profit > 0 ? '+' : '';
            return `
                <div class="signal-history-card glass">
                    <div class="signal-header">
                        <span class="pair">${signal.pair}</span>
                        <span class="date">${signal.date.toLocaleDateString()}</span>
                    </div>
                    <div class="signal-result ${profitClass}">
                        <span class="profit">${profitSign}${signal.profit}%</span>
                        <span class="status">${signal.success ? '✓ Success' : '✗ Miss'}</span>
                    </div>
                    <div class="signal-prices">
                        <span>Entry: $${signal.entryPrice.toLocaleString()}</span>
                        <span>Exit: $${signal.actualPrice.toLocaleString()}</span>
                    </div>
                </div>
            `;
        }).join('');
    }
    
    updateSignalHistory();
    
    // Add new signal every hour
    setInterval(() => {
        signalHistory.unshift(generateHistoricalSignal(0));
        signalHistory.pop();
        updateSignalHistory();
    }, 3600000);
}

// Countdown timer
function initializeCountdown() {
    const countdownElement = document.querySelector('.countdown');
    let timeLeft = 10000; // Example: start with 10000 seconds
    
    function updateCountdown() {
        const hours = Math.floor(timeLeft / 3600);
        const minutes = Math.floor((timeLeft % 3600) / 60);
        const seconds = timeLeft % 60;
        
        countdownElement.textContent = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        
        if (timeLeft > 0) {
            timeLeft--;
        } else {
            timeLeft = 10000; // Reset countdown
            updateSignalPreview(); // Generate new signal
        }
    }
    
    updateCountdown();
    setInterval(updateCountdown, 1000);
}

// Signal preview updates
function updateSignalPreview() {
    const signalPreview = document.querySelector('.signal-preview');
    const pairs = ['BTC/USDT', 'ETH/USDT', 'SOL/USDT'];
    
    function generateSignal() {
        const pair = pairs[Math.floor(Math.random() * pairs.length)];
        const basePrice = Math.floor(Math.random() * 10000) + 40000;
        const targetPrice = basePrice * (1 + Math.random() * 0.1);
        const stopLoss = basePrice * (1 - Math.random() * 0.05);
        const confidence = Math.floor(Math.random() * 10) + 90;
        
        return {
            pair,
            entry: basePrice,
            target: targetPrice,
            stopLoss: stopLoss,
            confidence: confidence
        };
    }
    
    function updateSignal() {
        const signal = generateSignal();
        const signalCard = signalPreview.querySelector('.signal-card');
        
        signalCard.innerHTML = `
            <div class="signal-header">
                <span class="pair">${signal.pair}</span>
                <span class="confidence">${signal.confidence}%</span>
            </div>
            <div class="signal-details">
                <p>Entry: $${signal.entry.toLocaleString()}</p>
                <p>Target: $${signal.target.toLocaleString()}</p>
                <p>Stop Loss: $${signal.stopLoss.toLocaleString()}</p>
            </div>
            <div class="signal-performance">
                <div class="performance-bar">
                    <div class="progress" style="width: ${signal.confidence}%"></div>
                </div>
                <span class="performance-text">${signal.confidence}% Success Rate</span>
            </div>
        `;
    }
    
    updateSignal();
    setInterval(updateSignal, 30000);
}

// Testimonials Slider
function initializeTestimonials() {
    const slider = document.querySelector('.testimonials-slider');
    let currentIndex = 0;

    const testimonials = [
        {
            name: "Alex K.",
            location: "Singapore",
            image: "images/testimonial-1.jpg",
            text: "The AI signals are incredibly accurate. I've seen a 150% increase in my portfolio since joining."
        },
        {
            name: "Sarah M.",
            location: "London, UK",
            image: "images/testimonial-2.jpg",
            text: "CryptoMoose's Elite plan has transformed my trading. The whale tracking alerts are game-changing!"
        },
        {
            name: "David R.",
            location: "Toronto, Canada",
            image: "images/testimonial-3.jpg",
            text: "Best trading community I've ever been part of. The signals and support are outstanding."
        }
    ];

    function createTestimonialCard(testimonial) {
        return `
            <div class="testimonial-card card glass">
                <div class="testimonial-content">
                    <p>${testimonial.text}</p>
                    <div class="testimonial-author">
                        <img src="${testimonial.image}" alt="${testimonial.name}">
                        <div class="author-info">
                            <h4>${testimonial.name}</h4>
                            <span>${testimonial.location}</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    function updateSlider() {
        slider.innerHTML = createTestimonialCard(testimonials[currentIndex]);
        currentIndex = (currentIndex + 1) % testimonials.length;
    }

    updateSlider();
    setInterval(updateSlider, 5000);
}

// Animations
function initializeAnimations() {
    // Intersection Observer for fade-in animations
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('fade-in');
            }
        });
    }, { threshold: 0.1 });

    // Observe all sections
    document.querySelectorAll('section').forEach(section => {
        observer.observe(section);
    });

    // Smooth scroll for navigation links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });

    // Pricing toggle animation
    const pricingCards = document.querySelectorAll('.pricing-card');
    pricingCards.forEach(card => {
        card.addEventListener('mouseenter', () => {
            card.style.transform = 'translateY(-10px)';
            card.style.transition = 'transform 0.3s ease';
        });
        card.addEventListener('mouseleave', () => {
            card.style.transform = 'translateY(0)';
        });
    });
}

// Initialize Chart
function initializeChart() {
    const ctx = document.getElementById('cryptoChart').getContext('2d');
    let cryptoChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'BTC/USDT',
                data: [],
                borderColor: '#00ff88',
                borderWidth: 2,
                fill: false,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    labels: {
                        color: 'rgba(255, 255, 255, 0.8)'
                    }
                }
            },
            scales: {
                x: {
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    },
                    ticks: {
                        color: 'rgba(255, 255, 255, 0.8)'
                    }
                },
                y: {
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    },
                    ticks: {
                        color: 'rgba(255, 255, 255, 0.8)'
                    }
                }
            }
        }
    });

    // Simulate real-time data updates
    function updateChart() {
        const price = Math.random() * (50000 - 45000) + 45000;
        const time = new Date().toLocaleTimeString();
        
        cryptoChart.data.labels.push(time);
        cryptoChart.data.datasets[0].data.push(price);
        
        if (cryptoChart.data.labels.length > 20) {
            cryptoChart.data.labels.shift();
            cryptoChart.data.datasets[0].data.shift();
        }
        
        cryptoChart.update();
    }

    setInterval(updateChart, 2000);
}

// Update live price
function updateLivePrice() {
    const priceValue = document.querySelector('.price-value');
    const change = document.querySelector('.change');
    const high = document.querySelector('.stat-item .value:nth-child(2)');
    const low = document.querySelector('.stat-item .value:nth-child(2)');
    
    // Simulate price changes
    const basePrice = 48235.67;
    const randomChange = (Math.random() - 0.5) * 100;
    const newPrice = (basePrice + randomChange).toFixed(2);
    const changePercent = ((randomChange / basePrice) * 100).toFixed(2);
    
    priceValue.textContent = `$${newPrice}`;
    
    if (changePercent >= 0) {
        change.textContent = `+${changePercent}%`;
        change.classList.remove('negative');
        change.classList.add('positive');
    } else {
        change.textContent = `${changePercent}%`;
        change.classList.remove('positive');
        change.classList.add('negative');
    }
}

// Update price every 2 seconds
setInterval(updateLivePrice, 2000);

// FAQ Interaction
document.querySelectorAll('.faq-item').forEach(item => {
    item.addEventListener('click', () => {
        item.classList.toggle('active');
    });
});

// Newsletter Form
const newsletterForm = document.querySelector('.newsletter-form');
if (newsletterForm) {
    newsletterForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = e.target.querySelector('input[type="email"]').value;
        alert('Thank you for subscribing! We will keep you updated.');
        e.target.reset();
    });
}

// Add smooth scroll behavior
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// Modal Controls
const modal = document.getElementById('paymentModal');
const closeBtn = document.querySelector('.close');

function openPaymentModal() {
    modal.style.display = 'block';
    document.body.style.overflow = 'hidden'; // Prevent scrolling when modal is open
}

// Close modal when clicking (X)
closeBtn.onclick = function() {
    modal.style.display = 'none';
    document.body.style.overflow = 'auto'; // Re-enable scrolling
}

// Close modal when clicking outside
window.onclick = function(event) {
    if (event.target == modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto'; // Re-enable scrolling
    }
}

// Copy wallet address
function copyAddress(type) {
    const addressElement = document.querySelector('.wallet-address');
    const address = addressElement.textContent;
    
    navigator.clipboard.writeText(address).then(() => {
        // Show success feedback
        const btn = document.querySelector(`[onclick="copyAddress('${type}')"]`);
        const icon = btn.querySelector('i');
        const originalClass = icon.className;
        
        // Change to checkmark
        icon.className = 'fas fa-check';
        
        // Reset after 2 seconds
        setTimeout(() => {
            icon.className = originalClass;
        }, 2000);
    }).catch(err => {
        console.error('Failed to copy:', err);
    });
}

// Close modal with Escape key
document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape' && modal.style.display === 'block') {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
});
