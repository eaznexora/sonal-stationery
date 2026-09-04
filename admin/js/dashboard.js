document.addEventListener('DOMContentLoaded', function() {
    let currentPeriod = '30d';
    let currentTab = 'Revenue';
    let rawTimelineData = [];
    let revenueChart = null;
    let chartGradient = null;

    const ctx = document.getElementById('revenueChart').getContext('2d');
    chartGradient = ctx.createLinearGradient(0, 0, 0, 300);
    chartGradient.addColorStop(0, 'rgba(156, 175, 159, 0.5)'); 
    chartGradient.addColorStop(1, 'rgba(156, 175, 159, 0.0)');

    const formatCurrency = (num) => {
        return '₹' + Number(num).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    const formatNumber = (num) => {
        return Number(num).toLocaleString('en-IN');
    };

    const initChart = () => {
        revenueChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Revenue',
                    data: [],
                    borderColor: '#829586',
                    backgroundColor: chartGradient,
                    borderWidth: 2,
                    pointBackgroundColor: '#829586',
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: '#2c2c2c',
                        titleFont: { family: 'Inter' },
                        bodyFont: { family: 'Inter' },
                        callbacks: {
                            label: function(context) {
                                if (currentTab === 'Revenue' || currentTab === 'AOV') {
                                    return formatCurrency(context.parsed.y);
                                }
                                return formatNumber(context.parsed.y);
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                if (currentTab === 'Revenue' || currentTab === 'AOV') {
                                    return '₹' + value;
                                }
                                return value;
                            },
                            font: { family: 'Inter', size: 11 },
                            color: '#6e6b66'
                        },
                        grid: {
                            color: '#e2dfd8',
                            drawBorder: false,
                        }
                    },
                    x: {
                        grid: { display: false, drawBorder: false },
                        ticks: {
                            font: { family: 'Inter', size: 11 },
                            color: '#6e6b66',
                            maxTicksLimit: 7 
                        }
                    }
                }
            }
        });
    };

    const updateChart = () => {
        if (!revenueChart) return;
        
        let labels = [];
        let dataPoints = [];
        let totalValue = 0;

        rawTimelineData.forEach(t => {
            // format date cleanly e.g. "25 Jul"
            const dateObj = new Date(t.date);
            const formattedDate = dateObj.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
            labels.push(formattedDate);
            
            if (currentTab === 'Revenue') {
                dataPoints.push(t.revenue);
                totalValue += t.revenue;
            } else if (currentTab === 'Orders') {
                dataPoints.push(t.orders);
                totalValue += t.orders;
            } else if (currentTab === 'Customers') {
                dataPoints.push(t.customers);
                totalValue += t.customers;
            } else if (currentTab === 'AOV') {
                dataPoints.push(t.aov);
                totalValue += t.aov; // AOV total sum doesn't make logical sense, but we can display the period avg instead.
            }
        });

        if (currentTab === 'AOV') {
            const sumOrders = rawTimelineData.reduce((acc, curr) => acc + curr.orders, 0);
            const sumRev = rawTimelineData.reduce((acc, curr) => acc + curr.revenue, 0);
            totalValue = sumOrders > 0 ? sumRev / sumOrders : 0;
        }

        revenueChart.data.labels = labels;
        revenueChart.data.datasets[0].label = currentTab;
        revenueChart.data.datasets[0].data = dataPoints;
        
        // Dynamic Y axis max
        const maxVal = Math.max(...dataPoints, 10);
        revenueChart.options.scales.y.max = Math.ceil(maxVal * 1.2);
        
        revenueChart.update();

        // Update chart total UI
        const chartTotalEl = document.getElementById('chart-total-value');
        if (currentTab === 'Revenue' || currentTab === 'AOV') {
            chartTotalEl.textContent = formatCurrency(totalValue);
        } else {
            chartTotalEl.textContent = formatNumber(totalValue);
        }
    };

    const fetchDashboardStats = async () => {
        try {
            const response = await fetch(`/api/admin/dashboard/stats?period=${currentPeriod}`);
            const data = await response.json();
            
            if (!data.success) throw new Error(data.message || 'Error fetching stats');

            // Update KPIs
            document.getElementById('kpi-revenue').textContent = formatCurrency(data.kpis.totalRevenue);
            document.getElementById('kpi-orders').textContent = formatNumber(data.kpis.totalOrders);
            document.getElementById('kpi-customers').textContent = formatNumber(data.kpis.totalCustomers);
            document.getElementById('kpi-pending').textContent = formatNumber(data.kpis.pendingOrders);
            document.getElementById('kpi-aov').textContent = formatCurrency(data.kpis.averageOrderValue);

            // Set timeline data and update chart
            rawTimelineData = data.timeline || [];
            updateChart();

            // Update Sales by Category
            const categoryListEl = document.getElementById('sales-category-list');
            categoryListEl.innerHTML = '';
            if (data.salesByCategory && data.salesByCategory.length > 0) {
                data.salesByCategory.forEach(cat => {
                    categoryListEl.innerHTML += `
                        <div class="widget-item">
                            <span>${cat.category}</span>
                            <span class="widget-item-val">${formatNumber(cat.sold)} sold</span>
                        </div>
                    `;
                });
            } else {
                categoryListEl.innerHTML = `<p style="color: var(--text-secondary); font-size: 0.9rem;">No categories found.</p>`;
            }

            // Update Customer Retention
            const retentionListEl = document.getElementById('customer-retention-list');
            const ret = data.customerRetention;
            if (ret) {
                retentionListEl.innerHTML = `
                    <div class="stat-row">
                        <div class="stat-info">
                            <span class="stat-info-title">New Customers</span>
                            <span class="stat-info-sub">${formatNumber(ret.newCustomers.orders)} order(s)</span>
                        </div>
                        <div class="stat-value">${formatCurrency(ret.newCustomers.revenue)}</div>
                    </div>
                    <div class="stat-row">
                        <div class="stat-info">
                            <span class="stat-info-title">Returning Customers</span>
                            <span class="stat-info-sub">${formatNumber(ret.returningCustomers.orders)} order(s)</span>
                        </div>
                        <div class="stat-value">${formatCurrency(ret.returningCustomers.revenue)}</div>
                    </div>
                `;
            } else {
                retentionListEl.innerHTML = `<p style="color: var(--text-secondary); font-size: 0.9rem;">No data available.</p>`;
            }
            
        } catch (error) {
            console.error('Failed to load dashboard stats:', error);
            document.getElementById('sales-category-list').innerHTML = `<p style="color: red; font-size: 0.9rem;">Error loading data.</p>`;
        }
    };

    // Event Listeners for Tabs
    document.querySelectorAll('.chart-tab').forEach(tab => {
        tab.addEventListener('click', (e) => {
            document.querySelectorAll('.chart-tab').forEach(t => t.classList.remove('active'));
            e.target.classList.add('active');
            currentTab = e.target.textContent;
            updateChart();
        });
    });

    // Event Listeners for Time Filters
    document.querySelectorAll('.time-filter').forEach(filter => {
        filter.addEventListener('click', (e) => {
            document.querySelectorAll('.time-filter').forEach(f => f.classList.remove('active'));
            e.target.classList.add('active');
            currentPeriod = e.target.dataset.period;
            fetchDashboardStats(); // Re-fetch from server
        });
    });

    initChart();
    fetchDashboardStats();
});
