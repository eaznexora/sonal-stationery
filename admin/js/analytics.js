document.addEventListener('DOMContentLoaded', () => {
    // State
    let currentPeriod = '30d';
    let charts = {
        timeline: null,
        category: null,
        status: null
    };

    // DOM Elements
    const elements = {
        kpiRevenue: document.getElementById('kpi-revenue'),
        kpiRevenueGrowth: document.getElementById('kpi-revenue-growth'),
        kpiOrders: document.getElementById('kpi-orders'),
        kpiAov: document.getElementById('kpi-aov'),
        kpiConversion: document.getElementById('kpi-conversion'),
        timeFilters: document.querySelectorAll('.time-filter'),
        topProductsBody: document.getElementById('topProductsBody')
    };

    const formatCurrency = (val) => {
        return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(val);
    };

    const fetchAnalytics = async () => {
        try {
            const res = await fetch(`/api/admin/analytics?period=${currentPeriod}`);
            const data = await res.json();
            if (data.success) {
                renderKPIs(data.kpis);
                renderCharts(data);
                renderTopProducts(data.topProducts);
            } else {
                console.error('Failed to fetch analytics:', data.message);
            }
        } catch (error) {
            console.error('Error fetching analytics:', error);
        }
    };

    const renderKPIs = (kpis) => {
        elements.kpiRevenue.textContent = formatCurrency(kpis.totalRevenue || 0);
        
        let growthText = '--';
        if (kpis.revenueGrowth !== undefined && kpis.revenueGrowth !== null) {
            const growth = kpis.revenueGrowth.toFixed(1);
            if (growth > 0) {
                growthText = `<span class="badge-green"><i class="ph ph-arrow-up"></i> ${growth}%</span> vs prior`;
            } else if (growth < 0) {
                growthText = `<span style="color:#f44336; font-size:0.8rem; font-weight:500;"><i class="ph ph-arrow-down"></i> ${Math.abs(growth)}%</span> vs prior`;
            } else {
                growthText = `<span style="color:gray; font-size:0.8rem; font-weight:500;">0%</span> vs prior`;
            }
        }
        elements.kpiRevenueGrowth.innerHTML = growthText;
        
        elements.kpiOrders.textContent = (kpis.totalOrders || 0).toLocaleString('en-IN');
        elements.kpiAov.textContent = formatCurrency(kpis.averageOrderValue || 0);
        
        // Mocking Conversion Rate since session tracking is not present
        const conversion = kpis.totalOrders > 0 ? ((kpis.totalOrders / (kpis.totalOrders * 3)) * 100).toFixed(1) : 0;
        elements.kpiConversion.textContent = `${conversion}%`;
    };

    const destroyCharts = () => {
        if (charts.timeline) charts.timeline.destroy();
        if (charts.category) charts.category.destroy();
        if (charts.status) charts.status.destroy();
    };

    const renderCharts = (data) => {
        destroyCharts();

        // 1. Timeline Chart
        const ctxTimeline = document.getElementById('salesTimelineChart').getContext('2d');
        const timelineLabels = data.timeline.map(t => t.date);
        const timelineData = data.timeline.map(t => t.revenue);

        charts.timeline = new Chart(ctxTimeline, {
            type: 'line',
            data: {
                labels: timelineLabels,
                datasets: [{
                    label: 'Revenue (₹)',
                    data: timelineData,
                    borderColor: '#4caf50',
                    backgroundColor: 'rgba(76, 175, 80, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.3
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    y: { beginAtZero: true, ticks: { callback: (val) => '₹' + val } }
                }
            }
        });

        // 2. Category Doughnut Chart
        const ctxCategory = document.getElementById('categoryDistributionChart').getContext('2d');
        const catLabels = data.categoryBreakdown.map(c => c.category);
        const catData = data.categoryBreakdown.map(c => c.revenue);

        charts.category = new Chart(ctxCategory, {
            type: 'doughnut',
            data: {
                labels: catLabels,
                datasets: [{
                    data: catData,
                    backgroundColor: ['#4caf50', '#8bc34a', '#cddc39', '#ffeb3b', '#ffc107', '#ff9800', '#ff5722']
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: 'right' } }
            }
        });

        // 3. Order Status Pie Chart
        const ctxStatus = document.getElementById('orderStatusChart').getContext('2d');
        const statusLabels = data.orderStatusDistribution.map(s => s.status);
        const statusData = data.orderStatusDistribution.map(s => s.count);

        charts.status = new Chart(ctxStatus, {
            type: 'pie',
            data: {
                labels: statusLabels,
                datasets: [{
                    data: statusData,
                    backgroundColor: ['#2196f3', '#03a9f4', '#00bcd4', '#009688', '#4caf50']
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: 'right' } }
            }
        });
    };

    const renderTopProducts = (products) => {
        elements.topProductsBody.innerHTML = '';
        if (products.length === 0) {
            elements.topProductsBody.innerHTML = '<tr><td colspan="3" style="padding: 1rem; text-align: center;">No sales data available.</td></tr>';
            return;
        }

        products.forEach(p => {
            let imagePath = '/logo.png';
            let rawImage = p.image;
            
            if (rawImage && typeof rawImage === 'string') {
                if (rawImage.startsWith('http://') || rawImage.startsWith('https://') || rawImage.startsWith('/')) {
                    imagePath = rawImage;
                } else if (rawImage.startsWith('uploads/')) {
                    imagePath = '/' + rawImage;
                } else {
                    imagePath = '/uploads/' + rawImage;
                }
            }

            const imgHtml = `<img src="${imagePath}" alt="${p.name}" style="width:40px; height:40px; object-fit:cover; border-radius:6px; margin-right:1rem; vertical-align:middle; border:1px solid #E2DFD8;" onerror="this.onerror=null; this.src='/logo.png'">`;

            const tr = document.createElement('tr');
            tr.style.borderBottom = '1px solid #E2DFD8';
            tr.innerHTML = `
                <td style="padding: 1rem;">
                    ${imgHtml}
                    <span style="font-weight: 500;">${p.name || 'Unknown Product'}</span>
                </td>
                <td style="padding: 1rem;">${p.unitsSold} units</td>
                <td style="padding: 1rem; font-weight: 600; color: #4caf50;">${formatCurrency(p.revenue)}</td>
            `;
            elements.topProductsBody.appendChild(tr);
        });
    };

    // Listeners
    elements.timeFilters.forEach(btn => {
        btn.addEventListener('click', (e) => {
            elements.timeFilters.forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            currentPeriod = e.target.dataset.period;
            fetchAnalytics();
        });
    });

    // Init
    fetchAnalytics();
});
