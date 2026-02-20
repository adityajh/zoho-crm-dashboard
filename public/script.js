// API endpoint
const API_URL = '/api/stats';
const REFRESH_INTERVAL = 5000; // 5 seconds

// DOM elements
const leadsCountElement = document.getElementById('leads-count');
const applicationsCountElement = document.getElementById('applications-count');
const averageScoreElement = document.getElementById('average-score');
const lastUpdatedElement = document.getElementById('last-updated');

// Chart Instances
let leadsChartInstance = null;
let appsChartInstance = null;

// Store previous values for animation
let previousLeads = 0;
let previousApplications = 0;

// Format timestamp
function formatTimestamp(isoString) {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) {
        return 'Just now';
    } else if (diffMins < 60) {
        return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    } else if (diffMins < 1440) {
        const hours = Math.floor(diffMins / 60);
        return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    } else {
        return date.toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }
}

// Animate counter update
function animateValue(element, start, end, duration = 500) {
    const range = end - start;
    const increment = range / (duration / 16); // 60fps
    let current = start;

    const timer = setInterval(() => {
        current += increment;
        if ((increment > 0 && current >= end) || (increment < 0 && current <= end)) {
            current = end;
            clearInterval(timer);
        }
        element.textContent = Math.floor(current).toLocaleString();
    }, 16);
}

// Update dashboard with new data
function updateDashboard(data) {
    // Update leads count
    if (data.leads !== previousLeads) {
        leadsCountElement.classList.add('updated');
        animateValue(leadsCountElement, previousLeads, data.leads);
        previousLeads = data.leads;

        setTimeout(() => {
            leadsCountElement.classList.remove('updated');
        }, 400);
    } else {
        leadsCountElement.textContent = data.leads.toLocaleString();
    }

    // Update applications count
    if (data.applications !== previousApplications) {
        applicationsCountElement.classList.add('updated');
        animateValue(applicationsCountElement, previousApplications, data.applications);
        previousApplications = data.applications;

        setTimeout(() => {
            applicationsCountElement.classList.remove('updated');
        }, 400);
    } else {
        applicationsCountElement.textContent = data.applications.toLocaleString();
    }

    // Update last updated timestamp
    if (data.lastUpdated) {
        lastUpdatedElement.textContent = formatTimestamp(data.lastUpdated);
    }

    // --- Chart.js Updates ---
    if (data.dailyHistory && data.dailyHistory.length > 0) {
        updateCharts(data.dailyHistory);
    }

    // --- Quality Score Update ---
    if (data.recentScores && data.recentScores.length > 0) {
        let totalScore = 0;
        let count = 0;
        data.recentScores.forEach(lead => {
            totalScore += (lead.score1 + lead.score2 + lead.score3 + lead.score4);
            count++;
        });
        const average = count > 0 ? (totalScore / count).toFixed(1) : 0;
        // Assuming max possible score is 100 for percentage display
        averageScoreElement.textContent = `${average}%`;
    }
}

// Global Chart configuration for dark theme
Chart.defaults.color = '#a0a0c0';
Chart.defaults.font.family = "'Inter', sans-serif";
Chart.defaults.scale.grid.color = 'rgba(255, 255, 255, 0.05)';

function initCharts() {
    const ctxLeads = document.getElementById('leadsChart').getContext('2d');
    leadsChartInstance = new Chart(ctxLeads, {
        type: 'line',
        data: {
            labels: [], datasets: [{
                label: 'Daily Leads',
                data: [],
                borderColor: '#f5576c',
                backgroundColor: 'rgba(245, 87, 108, 0.1)',
                borderWidth: 2,
                tension: 0.4,
                fill: true,
                pointRadius: 0,
                pointHoverRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: { display: false },
                y: { display: false, beginAtZero: true }
            }
        }
    });

    const ctxApps = document.getElementById('appsChart').getContext('2d');
    appsChartInstance = new Chart(ctxApps, {
        type: 'line',
        data: {
            labels: [], datasets: [{
                label: 'Daily Applications',
                data: [],
                borderColor: '#00f2fe',
                backgroundColor: 'rgba(0, 242, 254, 0.1)',
                borderWidth: 2,
                tension: 0.4,
                fill: true,
                pointRadius: 0,
                pointHoverRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: { display: false },
                y: { display: false, beginAtZero: true }
            }
        }
    });
}

function updateCharts(dailyHistory) {
    if (!leadsChartInstance || !appsChartInstance) return;

    // We want the last 30 days. We need them chronologically sorted so left is oldest and right is newest.
    let last30 = dailyHistory.slice(0, 30);
    last30.sort((a, b) => new Date(a.date) - new Date(b.date));

    const labels = last30.map(day => {
        const d = new Date(day.date);
        return `${d.getMonth() + 1}/${d.getDate()}`;
    });

    const leadsData = last30.map(day => day.leads);
    const appsData = last30.map(day => day.applications);

    leadsChartInstance.data.labels = labels;
    leadsChartInstance.data.datasets[0].data = leadsData;
    leadsChartInstance.update();

    appsChartInstance.data.labels = labels;
    appsChartInstance.data.datasets[0].data = appsData;
    appsChartInstance.update();
}

// Fetch stats from API
async function fetchStats() {
    try {
        const response = await fetch(API_URL);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        updateDashboard(data);

    } catch (error) {
        console.error('Error fetching stats:', error);
        lastUpdatedElement.textContent = 'Error loading data';
        lastUpdatedElement.style.color = '#f5576c';
    }
}

// Initialize dashboard
function init() {
    console.log('🚀 Dashboard initialized');

    // Initialize Chart.js canvases empty
    initCharts();

    // Initial fetch
    fetchStats();

    // Set up auto-refresh
    setInterval(fetchStats, REFRESH_INTERVAL);

    // Update relative timestamps every minute
    setInterval(() => {
        const currentText = lastUpdatedElement.textContent;
        if (currentText !== 'Never' && currentText !== 'Error loading data') {
            // Trigger a refresh to update the relative time
            fetchStats();
        }
    }, 60000);
}

// Start when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

// Handle visibility change (pause updates when tab is hidden)
document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
        console.log('👁️ Tab visible - refreshing data');
        fetchStats();
    }
});
