/**
 * Sonal Stationery - In-Store Loyalty & WhatsApp Leaderboard Admin JS
 * Handles leaderboard loading, quick purchases, WhatsApp messaging,
 * displaced customer notifications, QR standee generation, and template management.
 */

(function () {
    'use strict';

    // State
    let customers = [];
    let templates = [];
    let activeCustomer = null;
    let lastPurchaseResult = null;
    let searchDebounceTimer = null;
    let currentSort = 'totalSpent_desc';
    let searchQuery = '';

    // Elements
    const elements = {
        // Stats
        statTotalCustomers: document.getElementById('statTotalCustomers'),
        statTotalRevenue: document.getElementById('statTotalRevenue'),
        statAvgVisits: document.getElementById('statAvgVisits'),
        statTopSpender: document.getElementById('statTopSpender'),
        statTopSpenderAmt: document.getElementById('statTopSpenderAmt'),

        // Toolbar
        searchInput: document.getElementById('searchInput'),
        sortSelect: document.getElementById('sortSelect'),
        btnRefresh: document.getElementById('btnRefresh'),

        // Table
        leaderboardTbody: document.getElementById('leaderboardTbody'),

        // Modals
        purchaseModal: document.getElementById('purchaseModal'),
        whatsappModal: document.getElementById('whatsappModal'),
        qrModal: document.getElementById('qrModal'),
        templatesModal: document.getElementById('templatesModal'),
        historyModal: document.getElementById('historyModal'),

        // Purchase Modal Elements
        purchaseCustomerName: document.getElementById('purchaseModalCustName'),
        purchaseCustomerPhone: document.getElementById('purchaseModalCustPhone'),
        purchaseCustomerRank: document.getElementById('purchaseModalCustRank'),
        purchaseCustomerSpent: document.getElementById('purchaseModalCustSpent'),
        purchaseAmountInput: document.getElementById('purchaseAmountInput'),
        purchaseNotesInput: document.getElementById('purchaseNotesInput'),
        btnSavePurchase: document.getElementById('btnSavePurchase'),

        // WhatsApp Modal Elements
        rankShiftAlert: document.getElementById('rankShiftAlert'),
        rankShiftText: document.getElementById('rankShiftText'),
        purchaseLoggedText: document.getElementById('purchaseLoggedText'),
        waTemplateSelect: document.getElementById('waTemplateSelect'),
        waMessageText: document.getElementById('waMessageText'),
        btnLaunchWhatsApp: document.getElementById('btnLaunchWhatsApp'),
        displacedSection: document.getElementById('displacedSection'),
        displacedList: document.getElementById('displacedList'),

        // QR Modal Elements
        btnOpenQrModal: document.getElementById('btnOpenQrModal'),
        storeQrImg: document.getElementById('storeQrImg'),
        btnDownloadQr: document.getElementById('btnDownloadQr'),
        btnPrintFlyer: document.getElementById('btnPrintFlyer'),
        flyerPrintArea: document.getElementById('flyerPrintArea'),

        // Template Modal Elements
        btnOpenTemplatesModal: document.getElementById('btnOpenTemplatesModal'),
        tplFormHeading: document.getElementById('tplFormHeading'),
        tplEditId: document.getElementById('tplEditId'),
        tplTitleInput: document.getElementById('tplTitleInput'),
        tplBodyInput: document.getElementById('tplBodyInput'),
        btnSaveTemplate: document.getElementById('btnSaveTemplate'),
        btnCancelTplEdit: document.getElementById('btnCancelTplEdit'),
        templatesListContainer: document.getElementById('templatesListContainer'),

        // History Modal Elements
        historyCustName: document.getElementById('historyCustName'),
        historyCustPhone: document.getElementById('historyCustPhone'),
        historyTbody: document.getElementById('historyTbody'),

        // Mobile Nav & Toast
        menuToggle: document.getElementById('menuToggle'),
        sidebar: document.getElementById('sidebar'),
        sidebarOverlay: document.getElementById('sidebarOverlay'),
        toastBox: document.getElementById('toastBox'),
        toastMsg: document.getElementById('toastMsg'),
        toastIcon: document.getElementById('toastIcon')
    };

    // ==========================================
    // INITIALIZATION
    // ==========================================
    document.addEventListener('DOMContentLoaded', () => {
        initMobileNav();
        initModalCloseHandlers();
        initToolbarListeners();
        initPurchaseModalListeners();
        initWhatsAppListeners();
        initQrModalListeners();
        initTemplateManagerListeners();

        // Initial data fetches
        loadLeaderboard();
        loadTemplates();
    });

    // Mobile Sidebar
    function initMobileNav() {
        if (elements.menuToggle && elements.sidebar) {
            elements.menuToggle.addEventListener('click', () => {
                elements.sidebar.classList.toggle('open');
                if (elements.sidebarOverlay) {
                    elements.sidebarOverlay.style.display = elements.sidebar.classList.contains('open') ? 'block' : 'none';
                }
            });
        }
        if (elements.sidebarOverlay) {
            elements.sidebarOverlay.addEventListener('click', () => {
                elements.sidebar.classList.remove('open');
                elements.sidebarOverlay.style.display = 'none';
            });
        }
    }

    // Modal Generic Controls
    function openModal(modalEl) {
        if (!modalEl) return;
        modalEl.classList.add('open');
        document.body.style.overflow = 'hidden';
    }

    function closeModal(modalEl) {
        if (!modalEl) return;
        modalEl.classList.remove('open');
        document.body.style.overflow = '';
    }

    function initModalCloseHandlers() {
        document.querySelectorAll('[data-close]').forEach(btn => {
            btn.addEventListener('click', () => {
                const targetId = btn.getAttribute('data-close');
                closeModal(document.getElementById(targetId));
            });
        });

        // Close when clicking modal backdrop
        document.querySelectorAll('.modal-overlay').forEach(overlay => {
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    closeModal(overlay);
                }
            });
        });

        // Close on ESC key
        window.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                document.querySelectorAll('.modal-overlay.open').forEach(closeModal);
            }
        });
    }

    // Toast feedback
    function showToast(message, type = 'success') {
        if (!elements.toastBox) return;
        elements.toastMsg.textContent = message;
        elements.toastBox.className = `toast show ${type}`;
        if (elements.toastIcon) {
            elements.toastIcon.className = type === 'error' ? 'ph ph-x-circle' : 'ph ph-check-circle';
        }
        setTimeout(() => {
            elements.toastBox.classList.remove('show');
        }, 3200);
    }

    // Ordinal formatting (1st, 2nd, 3rd, 4th)
    function formatOrdinal(n) {
        const s = ['th', 'st', 'nd', 'rd'];
        const v = n % 100;
        return n + (s[(v - 20) % 10] || s[v] || s[0]);
    }

    // Clean Phone formatting
    function cleanPhone10(raw) {
        return String(raw || '').replace(/\D/g, '').slice(-10);
    }

    function displayPhone(cleanPhone) {
        if (!cleanPhone || cleanPhone.length < 10) return cleanPhone || '-';
        return `+91 ${cleanPhone.slice(0, 5)} ${cleanPhone.slice(5)}`;
    }

    // ==========================================
    // 1. LEADERBOARD & METRICS
    // ==========================================
    async function loadLeaderboard() {
        try {
            if (elements.leaderboardTbody) {
                elements.leaderboardTbody.innerHTML = `
                    <tr>
                        <td colspan="8" style="text-align: center; padding: 2.5rem; color: var(--text-secondary);">
                            <i class="ph ph-spinner ph-spin" style="font-size: 1.5rem; margin-bottom: 6px; display:block;"></i>
                            Loading live in-store leaderboard...
                        </td>
                    </tr>
                `;
            }

            const params = new URLSearchParams({
                search: searchQuery,
                sort: currentSort,
                limit: 100
            });

            const res = await fetch(`/api/admin/store-rewards/leaderboard?${params.toString()}`);
            const data = await res.json();

            if (!res.ok || !data.success) {
                throw new Error(data.message || 'Failed to fetch leaderboard');
            }

            customers = data.customers || [];
            updateMetricCards(data.stats);
            renderLeaderboardTable(customers);
        } catch (err) {
            console.error('Error loading leaderboard:', err);
            if (elements.leaderboardTbody) {
                elements.leaderboardTbody.innerHTML = `
                    <tr>
                        <td colspan="8" style="text-align: center; padding: 2rem; color: var(--danger-color);">
                            <i class="ph ph-warning" style="font-size: 1.5rem; margin-bottom: 6px; display:block;"></i>
                            Error loading leaderboard: ${err.message}
                        </td>
                    </tr>
                `;
            }
            showToast(err.message, 'error');
        }
    }

    function updateMetricCards(stats) {
        if (!stats) return;

        if (elements.statTotalCustomers) {
            elements.statTotalCustomers.textContent = Number(stats.totalCustomers || 0).toLocaleString('en-IN');
        }
        if (elements.statTotalRevenue) {
            elements.statTotalRevenue.textContent = `₹${Number(stats.totalRevenue || 0).toLocaleString('en-IN')}`;
        }
        if (elements.statAvgVisits) {
            elements.statAvgVisits.textContent = stats.avgVisits || '0';
        }
        if (elements.statTopSpender) {
            elements.statTopSpender.textContent = stats.topCustomer?.name || 'No shoppers yet';
        }
        if (elements.statTopSpenderAmt) {
            elements.statTopSpenderAmt.textContent = stats.topCustomer
                ? `₹${Number(stats.topCustomer.totalSpent || 0).toLocaleString('en-IN')} lifetime spend`
                : '₹0 lifetime spend';
        }
    }

    function renderLeaderboardTable(list) {
        if (!elements.leaderboardTbody) return;

        if (!list || list.length === 0) {
            elements.leaderboardTbody.innerHTML = `
                <tr>
                    <td colspan="8" style="text-align: center; padding: 3rem 1rem; color: var(--text-secondary);">
                        <i class="ph ph-users" style="font-size: 2.2rem; margin-bottom: 8px; display:block; opacity:0.6;"></i>
                        No loyalty customers found.
                        <div style="font-size: 0.85rem; margin-top: 4px;">
                            Print and place the In-Store QR Standee at your counter to let customers join!
                        </div>
                    </td>
                </tr>
            `;
            return;
        }

        elements.leaderboardTbody.innerHTML = list.map(c => {
            const rank = c.rank || 1;
            let rankClass = 'rank-default';
            let trophyIcon = '';

            if (rank === 1) {
                rankClass = 'rank-1';
                trophyIcon = '<i class="ph-fill ph-trophy"></i>';
            } else if (rank === 2) {
                rankClass = 'rank-2';
                trophyIcon = '<i class="ph-fill ph-medal"></i>';
            } else if (rank === 3) {
                rankClass = 'rank-3';
                trophyIcon = '<i class="ph-fill ph-medal"></i>';
            }

            const formattedPhone = displayPhone(c.phone);
            const formattedSpent = `₹${Number(c.totalSpent || 0).toLocaleString('en-IN')}`;
            const lastPurchaseDate = c.lastPurchaseDate
                ? new Date(c.lastPurchaseDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                : 'Never';

            return `
                <tr data-id="${c._id}">
                    <td style="text-align: center;">
                        <span class="rank-badge ${rankClass}">
                            ${trophyIcon} #${rank}
                        </span>
                    </td>
                    <td>
                        <strong style="color: var(--text-primary); font-size: 0.95rem;">${escapeHtml(c.name)}</strong>
                    </td>
                    <td>
                        <span style="font-family: monospace; font-size: 0.9rem;">${formattedPhone}</span>
                    </td>
                    <td style="color: var(--text-secondary); font-size: 0.88rem;">
                        ${escapeHtml(c.email)}
                    </td>
                    <td style="text-align: right; font-weight: 700; font-size: 0.95rem; color: var(--text-primary);">
                        ${formattedSpent}
                    </td>
                    <td style="text-align: center;">
                        <span class="visit-pill">${c.visitCount || 0} visits</span>
                    </td>
                    <td style="font-size: 0.85rem; color: var(--text-secondary);">
                        ${lastPurchaseDate}
                    </td>
                    <td style="text-align: right;">
                        <div class="actions-cell" style="justify-content: flex-end;">
                            <button class="btn btn-primary btn-sm btn-quick-purchase" data-id="${c._id}" title="Log In-Store Purchase">
                                <i class="ph ph-plus-circle"></i> + Purchase
                            </button>
                            <button class="btn btn-outline btn-sm btn-send-wa" data-id="${c._id}" title="Send WhatsApp Message">
                                <i class="ph ph-whatsapp-logo" style="color: #25D366;"></i>
                            </button>
                            <button class="btn btn-outline btn-sm btn-view-history" data-id="${c._id}" title="View Purchase History">
                                <i class="ph ph-receipt"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');

        // Attach action handlers
        elements.leaderboardTbody.querySelectorAll('.btn-quick-purchase').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.getAttribute('data-id');
                const customer = customers.find(c => c._id === id);
                if (customer) openQuickPurchaseModal(customer);
            });
        });

        elements.leaderboardTbody.querySelectorAll('.btn-send-wa').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.getAttribute('data-id');
                const customer = customers.find(c => c._id === id);
                if (customer) openWhatsAppModal(customer, null);
            });
        });

        elements.leaderboardTbody.querySelectorAll('.btn-view-history').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.getAttribute('data-id');
                const customer = customers.find(c => c._id === id);
                if (customer) openHistoryModal(customer);
            });
        });
    }

    function initToolbarListeners() {
        if (elements.searchInput) {
            elements.searchInput.addEventListener('input', (e) => {
                clearTimeout(searchDebounceTimer);
                searchDebounceTimer = setTimeout(() => {
                    searchQuery = e.target.value.trim();
                    loadLeaderboard();
                }, 300);
            });
        }

        if (elements.sortSelect) {
            elements.sortSelect.addEventListener('change', (e) => {
                currentSort = e.target.value;
                loadLeaderboard();
            });
        }

        if (elements.btnRefresh) {
            elements.btnRefresh.addEventListener('click', () => {
                loadLeaderboard();
                showToast('Leaderboard refreshed');
            });
        }
    }

    // ==========================================
    // 2. QUICK PURCHASE MODAL & LOGIC
    // ==========================================
    function openQuickPurchaseModal(customer) {
        activeCustomer = customer;
        if (!customer) return;

        if (elements.purchaseCustomerName) elements.purchaseCustomerName.textContent = customer.name;
        if (elements.purchaseCustomerPhone) elements.purchaseCustomerPhone.textContent = displayPhone(customer.phone);
        if (elements.purchaseCustomerRank) {
            elements.purchaseCustomerRank.textContent = `Rank #${customer.rank || 1}`;
            elements.purchaseCustomerRank.className = `rank-badge ${customer.rank === 1 ? 'rank-1' : (customer.rank === 2 ? 'rank-2' : (customer.rank === 3 ? 'rank-3' : 'rank-default'))}`;
        }
        if (elements.purchaseCustomerSpent) {
            elements.purchaseCustomerSpent.textContent = `Spent: ₹${Number(customer.totalSpent || 0).toLocaleString('en-IN')}`;
        }

        if (elements.purchaseAmountInput) {
            elements.purchaseAmountInput.value = '';
            setTimeout(() => elements.purchaseAmountInput.focus(), 150);
        }
        if (elements.purchaseNotesInput) elements.purchaseNotesInput.value = '';

        openModal(elements.purchaseModal);
    }

    function initPurchaseModalListeners() {
        if (elements.btnSavePurchase) {
            elements.btnSavePurchase.addEventListener('click', handleSavePurchase);
        }

        if (elements.purchaseAmountInput) {
            elements.purchaseAmountInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    handleSavePurchase();
                }
            });
        }
    }

    async function handleSavePurchase() {
        if (!activeCustomer) return;

        const amountVal = parseFloat(elements.purchaseAmountInput?.value);
        if (isNaN(amountVal) || amountVal <= 0) {
            showToast('Please enter a valid purchase amount greater than ₹0', 'error');
            elements.purchaseAmountInput?.focus();
            return;
        }

        const notes = elements.purchaseNotesInput?.value.trim() || '';

        try {
            elements.btnSavePurchase.disabled = true;
            elements.btnSavePurchase.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Saving...';

            const res = await fetch(`/api/admin/store-rewards/customer/${activeCustomer._id}/purchase`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ amount: amountVal, notes })
            });

            const data = await res.json();

            if (!res.ok || !data.success) {
                throw new Error(data.message || 'Failed to record purchase');
            }

            showToast(`Recorded ₹${amountVal.toLocaleString('en-IN')} for ${activeCustomer.name}!`);

            // Close purchase modal
            closeModal(elements.purchaseModal);

            // Save purchase result
            lastPurchaseResult = data;
            const updatedCustomer = data.customer;

            // Background refresh of leaderboard
            loadLeaderboard();

            // Automatically open WhatsApp Dispatcher Modal (Edge-Case Upgrades 2 & 3)
            openWhatsAppModal(updatedCustomer, data);

        } catch (err) {
            console.error('Save purchase error:', err);
            showToast(err.message, 'error');
        } finally {
            if (elements.btnSavePurchase) {
                elements.btnSavePurchase.disabled = false;
                elements.btnSavePurchase.innerHTML = '<i class="ph ph-check"></i> Save Purchase';
            }
        }
    }

    // ==========================================
    // 3. WHATSAPP DISPATCHER & DISPLACEMENT
    // ==========================================
    function openWhatsAppModal(customer, purchaseData = null) {
        activeCustomer = customer;
        if (!customer) return;

        // Populate Template Dropdown
        populateWhatsAppTemplateSelect(customer, purchaseData);

        // Rank Change Alert (Upgrade 2)
        if (elements.rankShiftAlert) {
            if (purchaseData) {
                const oldR = purchaseData.oldRank;
                const newR = purchaseData.newRank;
                const amt = purchaseData.purchase?.amount || 0;

                elements.rankShiftAlert.style.display = 'flex';
                if (newR < oldR) {
                    elements.rankShiftText.textContent = `🚀 Customer climbed from #${oldR} to #${newR} place!`;
                    elements.rankShiftText.style.color = '#1b5e20';
                    elements.rankShiftAlert.style.background = '#e8f5e9';
                    elements.rankShiftAlert.style.borderColor = '#c8e6c9';
                } else {
                    elements.rankShiftText.textContent = `✨ Customer retained Rank #${newR}!`;
                    elements.rankShiftText.style.color = '#2c2c2c';
                    elements.rankShiftAlert.style.background = '#f2eee8';
                    elements.rankShiftAlert.style.borderColor = '#e2dfd8';
                }
                elements.purchaseLoggedText.textContent = `Logged purchase of ₹${amt.toLocaleString('en-IN')}. Lifetime spend is now ₹${Number(customer.totalSpent || 0).toLocaleString('en-IN')}.`;
            } else {
                elements.rankShiftAlert.style.display = 'none';
            }
        }

        // Upgrade 2 & 3: Displaced Customers Section
        renderDisplacedCustomersSection(purchaseData?.displacedCustomers);

        // Open modal
        openModal(elements.whatsappModal);
    }

    function populateWhatsAppTemplateSelect(customer, purchaseData) {
        if (!elements.waTemplateSelect) return;

        elements.waTemplateSelect.innerHTML = templates.map(t => `
            <option value="${t.code}">${escapeHtml(t.title)}</option>
        `).join('');

        // Smart Auto-selection (Upgrade 3)
        // If visitCount === 1, auto-select 'first_purchase'; otherwise 'repeat_purchase'
        const visitCount = customer.visitCount || (customer.purchaseHistory ? customer.purchaseHistory.length : 1);
        let targetCode = visitCount <= 1 ? 'first_purchase' : 'repeat_purchase';

        if (templates.some(t => t.code === targetCode)) {
            elements.waTemplateSelect.value = targetCode;
        } else if (templates.length > 0) {
            elements.waTemplateSelect.value = templates[0].code;
        }

        // Update message text box with resolved placeholders
        updateWhatsAppMessagePreview(customer, purchaseData);
    }

    function updateWhatsAppMessagePreview(customer, purchaseData) {
        if (!elements.waMessageText || !elements.waTemplateSelect) return;

        const selectedCode = elements.waTemplateSelect.value;
        const tpl = templates.find(t => t.code === selectedCode);
        if (!tpl) return;

        const purchaseAmt = purchaseData?.purchase?.amount || customer.lastPurchaseAmount || 0;
        const rank = purchaseData?.newRank || customer.rank || 1;
        const ordinalRank = formatOrdinal(rank);
        const totalSpent = customer.totalSpent || 0;
        const visits = customer.visitCount || 1;

        let rendered = tpl.body
            .replace(/{name}/g, customer.name || 'Valued Customer')
            .replace(/{amount}/g, Number(purchaseAmt).toLocaleString('en-IN'))
            .replace(/{total}/g, Number(totalSpent).toLocaleString('en-IN'))
            .replace(/{rank}/g, ordinalRank)
            .replace(/{visits}/g, visits);

        elements.waMessageText.value = rendered;
    }

    function renderDisplacedCustomersSection(displacedList) {
        if (!elements.displacedSection || !elements.displacedList) return;

        if (!displacedList || displacedList.length === 0) {
            elements.displacedSection.style.display = 'none';
            elements.displacedList.innerHTML = '';
            return;
        }

        elements.displacedSection.style.display = 'block';

        // Find the 'rank_drop' template
        const dropTpl = templates.find(t => t.code === 'rank_drop');
        const defaultDropBody = dropTpl ? dropTpl.body : 'Hi {name}! Someone just made a purchase and moved ahead on the Sonal Stationery Leaderboard. You are now in {rank} place! Visit us soon to reclaim your spot: https://sonalstationary.in/store-rewards.html';

        elements.displacedList.innerHTML = displacedList.map(item => {
            const displacedCust = item.customer;
            const cleanPhone = cleanPhone10(displacedCust.phone);
            const newOrdinal = formatOrdinal(item.newRank);

            // Render rank_drop message
            const dropMessage = defaultDropBody
                .replace(/{name}/g, displacedCust.name || 'Valued Customer')
                .replace(/{rank}/g, newOrdinal)
                .replace(/{total}/g, Number(displacedCust.totalSpent || 0).toLocaleString('en-IN'))
                .replace(/{amount}/g, '0')
                .replace(/{visits}/g, displacedCust.visitCount || 1);

            const waLink = `https://wa.me/91${cleanPhone}?text=${encodeURIComponent(dropMessage)}`;

            return `
                <div class="displaced-item">
                    <div>
                        <strong>${escapeHtml(displacedCust.name)}</strong>
                        <div style="font-size: 0.78rem; color: #8c6100;">
                            Moved from #${item.oldRank} &rarr; #${item.newRank} (${displayPhone(cleanPhone)})
                        </div>
                    </div>
                    <a href="${waLink}" target="_blank" class="btn btn-sm" style="background: #25D366; color: #fff; text-decoration: none; padding: 4px 10px; font-size: 0.8rem; border-radius: 6px; display: inline-flex; align-items: center; gap: 4px;">
                        <i class="ph ph-whatsapp-logo"></i> Nudge
                    </a>
                </div>
            `;
        }).join('');
    }

    function initWhatsAppListeners() {
        if (elements.waTemplateSelect) {
            elements.waTemplateSelect.addEventListener('change', () => {
                updateWhatsAppMessagePreview(activeCustomer, lastPurchaseResult);
            });
        }

        if (elements.btnLaunchWhatsApp) {
            elements.btnLaunchWhatsApp.addEventListener('click', () => {
                if (!activeCustomer) return;

                const text = elements.waMessageText?.value.trim() || '';
                const cleanPhone = cleanPhone10(activeCustomer.phone);

                if (!cleanPhone || cleanPhone.length !== 10) {
                    showToast('Customer does not have a valid 10-digit mobile number', 'error');
                    return;
                }

                // Bulletproof WhatsApp URL (Upgrade 4)
                const waUrl = `https://wa.me/91${cleanPhone}?text=${encodeURIComponent(text)}`;
                window.open(waUrl, '_blank');
            });
        }
    }

    // ==========================================
    // 4. IN-STORE QR STANDEE FLYER
    // ==========================================
    function initQrModalListeners() {
        const qrTargetUrl = 'https://sonalstationary.in/store-rewards.html';
        const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=350x350&data=${encodeURIComponent(qrTargetUrl)}&color=2c2c2c&bgcolor=ffffff&margin=1`;

        if (elements.btnOpenQrModal) {
            elements.btnOpenQrModal.addEventListener('click', () => {
                if (elements.storeQrImg) {
                    elements.storeQrImg.src = qrApiUrl;
                }
                if (elements.btnDownloadQr) {
                    elements.btnDownloadQr.href = qrApiUrl;
                }
                openModal(elements.qrModal);
            });
        }

        if (elements.btnPrintFlyer) {
            elements.btnPrintFlyer.addEventListener('click', () => {
                printFlyer();
            });
        }
    }

    function printFlyer() {
        const printWindow = window.open('', '_blank', 'width=700,height=900');
        if (!printWindow) {
            showToast('Pop-up blocked. Please allow pop-ups to print the flyer.', 'error');
            return;
        }

        const flyerHtml = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Sonal Stationery - In-Store Loyalty Standee</title>
                <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&family=Playfair+Display:wght@600;700&display=swap" rel="stylesheet">
                <style>
                    @page { size: A5 portrait; margin: 15mm; }
                    body {
                        font-family: 'Inter', sans-serif;
                        color: #2c2c2c;
                        background: #ffffff;
                        text-align: center;
                        padding: 2rem;
                        box-sizing: border-box;
                    }
                    .standee-card {
                        border: 2px solid #2c2c2c;
                        border-radius: 18px;
                        padding: 2.5rem 1.5rem;
                        max-width: 450px;
                        margin: 0 auto;
                    }
                    .store-brand {
                        font-family: 'Playfair Display', serif;
                        font-size: 1.8rem;
                        font-weight: 700;
                        letter-spacing: 1px;
                        color: #2c2c2c;
                        margin-bottom: 4px;
                    }
                    .store-sub {
                        font-size: 0.8rem;
                        text-transform: uppercase;
                        letter-spacing: 2.5px;
                        color: #6e6b66;
                        margin-bottom: 1.5rem;
                    }
                    .qr-container {
                        width: 230px;
                        height: 230px;
                        margin: 0 auto 1.5rem auto;
                        padding: 10px;
                        border: 1px solid #e2dfd8;
                        border-radius: 12px;
                        background: #ffffff;
                    }
                    .qr-container img {
                        width: 100%;
                        height: 100%;
                        display: block;
                    }
                    .hero-title {
                        font-family: 'Playfair Display', serif;
                        font-size: 1.35rem;
                        font-weight: 700;
                        color: #2c2c2c;
                        margin-bottom: 8px;
                    }
                    .hero-body {
                        font-size: 0.88rem;
                        line-height: 1.5;
                        color: #555;
                        max-width: 320px;
                        margin: 0 auto 1.25rem auto;
                    }
                    .steps-box {
                        background: #fbf9f6;
                        border: 1px dashed #dcd8d0;
                        border-radius: 10px;
                        padding: 0.75rem 1rem;
                        font-size: 0.8rem;
                        color: #444;
                        margin-bottom: 1.25rem;
                        text-align: left;
                    }
                    .steps-box div {
                        margin-bottom: 4px;
                    }
                    .footer-url {
                        font-size: 0.75rem;
                        color: #888;
                        font-family: monospace;
                    }
                </style>
            </head>
            <body>
                <div class="standee-card">
                    <div class="store-brand">SONAL STATIONERY</div>
                    <div class="store-sub">Gifts • Fine Stationery • Toys</div>
                    
                    <div class="hero-title">Scan to Join Our In-Store Rewards!</div>
                    <div class="hero-body">
                        Climb our customer leaderboard with every purchase and unlock exclusive VIP rewards & gifts.
                    </div>

                    <div class="qr-container">
                        <img src="https://api.qrserver.com/v1/create-qr-code/?size=350x350&data=https%3A%2F%2Fsonalstationary.in%2Fstore-rewards.html&color=2c2c2c&bgcolor=ffffff&margin=1" alt="Scan QR">
                    </div>

                    <div class="steps-box">
                        <div><strong>1.</strong> Scan the QR code above with any camera or Google Lens.</div>
                        <div><strong>2.</strong> Enter your name, WhatsApp number & verify email OTP.</div>
                        <div><strong>3.</strong> See your live customer rank instantly!</div>
                    </div>

                    <div class="footer-url">sonalstationary.in/store-rewards.html</div>
                </div>
                <script>
                    window.onload = function() {
                        window.print();
                    };
                </script>
            </body>
            </html>
        `;

        printWindow.document.open();
        printWindow.document.write(flyerHtml);
        printWindow.document.close();
    }

    // ==========================================
    // 5. TEMPLATE MANAGER (CRUD)
    // ==========================================
    async function loadTemplates() {
        try {
            const res = await fetch('/api/admin/store-rewards/templates');
            const data = await res.json();
            if (res.ok && data.success) {
                templates = data.templates || [];
                renderTemplatesList(templates);
            }
        } catch (err) {
            console.error('Failed to load templates:', err);
        }
    }

    function renderTemplatesList(list) {
        if (!elements.templatesListContainer) return;

        if (!list || list.length === 0) {
            elements.templatesListContainer.innerHTML = '<div style="color: var(--text-secondary); font-size: 0.85rem;">No templates available.</div>';
            return;
        }

        elements.templatesListContainer.innerHTML = list.map(t => `
            <div style="background: #fff; border: 1px solid var(--border-color); border-radius: 8px; padding: 0.85rem;">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 6px;">
                    <div>
                        <strong style="font-size: 0.92rem; color: var(--text-primary);">${escapeHtml(t.title)}</strong>
                        <span style="font-family: monospace; font-size: 0.75rem; background: var(--bg-secondary); padding: 2px 6px; border-radius: 4px; margin-left: 6px; color: var(--text-secondary);">${escapeHtml(t.code)}</span>
                    </div>
                    <div style="display: flex; gap: 4px;">
                        <button type="button" class="btn btn-outline btn-sm btn-edit-tpl" data-id="${t._id}" title="Edit Template" style="padding: 3px 8px; font-size: 0.8rem;">
                            <i class="ph ph-pencil-simple"></i>
                        </button>
                        ${t.isDefault ? '' : `
                            <button type="button" class="btn btn-outline btn-sm btn-del-tpl" data-id="${t._id}" title="Delete Template" style="padding: 3px 8px; font-size: 0.8rem; color: var(--danger-color);">
                                <i class="ph ph-trash"></i>
                            </button>
                        `}
                    </div>
                </div>
                <div style="font-size: 0.83rem; color: var(--text-secondary); white-space: pre-wrap; line-height: 1.4; background: var(--bg-primary); padding: 6px 10px; border-radius: 6px;">${escapeHtml(t.body)}</div>
            </div>
        `).join('');

        // Attach listeners
        elements.templatesListContainer.querySelectorAll('.btn-edit-tpl').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.getAttribute('data-id');
                const tpl = templates.find(t => t._id === id);
                if (tpl) startEditTemplate(tpl);
            });
        });

        elements.templatesListContainer.querySelectorAll('.btn-del-tpl').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.getAttribute('data-id');
                deleteTemplate(id);
            });
        });
    }

    function initTemplateManagerListeners() {
        if (elements.btnOpenTemplatesModal) {
            elements.btnOpenTemplatesModal.addEventListener('click', () => {
                resetTemplateForm();
                openModal(elements.templatesModal);
            });
        }

        if (elements.btnSaveTemplate) {
            elements.btnSaveTemplate.addEventListener('click', handleSaveTemplate);
        }

        if (elements.btnCancelTplEdit) {
            elements.btnCancelTplEdit.addEventListener('click', resetTemplateForm);
        }

        // Tag Pills to insert placeholders
        document.querySelectorAll('.tag-pill[data-insert]').forEach(pill => {
            pill.addEventListener('click', () => {
                const token = pill.getAttribute('data-insert');
                insertAtCursor(elements.tplBodyInput, token);
            });
        });
    }

    function insertAtCursor(textarea, text) {
        if (!textarea) return;
        const start = textarea.selectionStart || 0;
        const end = textarea.selectionEnd || 0;
        const val = textarea.value;
        textarea.value = val.substring(0, start) + text + val.substring(end);
        textarea.selectionStart = textarea.selectionEnd = start + text.length;
        textarea.focus();
    }

    function startEditTemplate(tpl) {
        if (!elements.tplFormHeading || !elements.tplTitleInput || !elements.tplBodyInput) return;

        elements.tplFormHeading.textContent = `Edit Template: ${tpl.title}`;
        elements.tplEditId.value = tpl._id;
        elements.tplTitleInput.value = tpl.title;
        elements.tplBodyInput.value = tpl.body;

        if (elements.btnCancelTplEdit) elements.btnCancelTplEdit.style.display = 'inline-block';
        elements.tplBodyInput.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    function resetTemplateForm() {
        if (elements.tplFormHeading) elements.tplFormHeading.textContent = 'Add New Template';
        if (elements.tplEditId) elements.tplEditId.value = '';
        if (elements.tplTitleInput) elements.tplTitleInput.value = '';
        if (elements.tplBodyInput) elements.tplBodyInput.value = '';
        if (elements.btnCancelTplEdit) elements.btnCancelTplEdit.style.display = 'none';
    }

    async function handleSaveTemplate() {
        const title = elements.tplTitleInput?.value.trim();
        const body = elements.tplBodyInput?.value.trim();
        const editId = elements.tplEditId?.value.trim();

        if (!title || !body) {
            showToast('Please enter both template title and body text', 'error');
            return;
        }

        try {
            elements.btnSaveTemplate.disabled = true;
            elements.btnSaveTemplate.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Saving...';

            let res;
            if (editId) {
                // Update
                res = await fetch(`/api/admin/store-rewards/templates/${editId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ title, body })
                });
            } else {
                // Create
                const code = title.toLowerCase().replace(/[^a-z0-9]+/g, '_').slice(0, 30);
                res = await fetch('/api/admin/store-rewards/templates', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ title, body, code })
                });
            }

            const data = await res.json();
            if (!res.ok || !data.success) {
                throw new Error(data.message || 'Failed to save template');
            }

            showToast(editId ? 'Template updated!' : 'Template created!');
            resetTemplateForm();
            await loadTemplates();
        } catch (err) {
            console.error('Template save error:', err);
            showToast(err.message, 'error');
        } finally {
            if (elements.btnSaveTemplate) {
                elements.btnSaveTemplate.disabled = false;
                elements.btnSaveTemplate.innerHTML = '<i class="ph ph-floppy-disk"></i> Save Template';
            }
        }
    }

    async function deleteTemplate(id) {
        if (!confirm('Are you sure you want to delete this custom template?')) return;

        try {
            const res = await fetch(`/api/admin/store-rewards/templates/${id}`, {
                method: 'DELETE'
            });
            const data = await res.json();
            if (!res.ok || !data.success) {
                throw new Error(data.message || 'Failed to delete template');
            }
            showToast('Template deleted');
            await loadTemplates();
        } catch (err) {
            console.error('Template delete error:', err);
            showToast(err.message, 'error');
        }
    }

    // ==========================================
    // 6. PURCHASE HISTORY MODAL
    // ==========================================
    function openHistoryModal(customer) {
        if (!customer) return;

        if (elements.historyCustName) elements.historyCustName.textContent = customer.name;
        if (elements.historyCustPhone) elements.historyCustPhone.textContent = displayPhone(customer.phone);

        const history = customer.purchaseHistory || [];

        if (elements.historyTbody) {
            if (history.length === 0) {
                elements.historyTbody.innerHTML = `
                    <tr>
                        <td colspan="4" style="text-align: center; padding: 2rem; color: var(--text-secondary);">
                            No purchase transactions logged yet for this customer.
                        </td>
                    </tr>
                `;
            } else {
                // Sort by date descending
                const sorted = [...history].sort((a, b) => new Date(b.date) - new Date(a.date));
                elements.historyTbody.innerHTML = sorted.map(p => {
                    const dateStr = p.date
                        ? new Date(p.date).toLocaleString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                        })
                        : '-';
                    const amountStr = `₹${Number(p.amount || 0).toLocaleString('en-IN')}`;

                    return `
                        <tr>
                            <td style="font-size: 0.88rem;">${dateStr}</td>
                            <td style="text-align: right; font-weight: 700; color: var(--text-primary); font-size: 0.95rem;">
                                ${amountStr}
                            </td>
                            <td style="font-size: 0.85rem; color: var(--text-secondary);">
                                ${escapeHtml(p.notes || '-')}
                            </td>
                            <td style="font-size: 0.82rem; color: var(--text-secondary);">
                                ${escapeHtml(p.recordedBy || 'counter')}
                            </td>
                        </tr>
                    `;
                }).join('');
            }
        }

        openModal(elements.historyModal);
    }

    // Helper: Escape HTML strings to prevent XSS
    function escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

})();

