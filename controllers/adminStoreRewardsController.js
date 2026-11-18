const StoreCustomer = require('../models/StoreCustomer');
const WhatsappTemplate = require('../models/WhatsappTemplate');
const StoreProTip = require('../models/StoreProTip');
const CustomerCheckin = require('../models/CustomerCheckin');

// Helper: Normalize to clean 10-digit Indian mobile number
function cleanPhoneNumber(phone) {
  if (!phone) return '';
  const digitsOnly = String(phone).replace(/\D/g, '');
  return digitsOnly.slice(-10);
}

// Helper: Format ordinal suffix (1st, 2nd, 3rd, 25th)
function formatOrdinal(n) {
  const num = parseInt(n, 10);
  if (isNaN(num)) return n;
  const s = ['th', 'st', 'nd', 'rd'];
  const v = num % 100;
  return num + (s[(v - 20) % 10] || s[v] || s[0]);
}

// Helper: Live rank calculation (totalSpent desc, tie-broken by visitCount desc, then createdAt/joinedAt asc)
async function calculateCustomerRank(customer) {
  if (!customer) return 1;
  const customerId = customer._id || customer.id;
  const spent = Number(customer.totalSpent || 0);
  const visits = Number(customer.visitCount || 0);
  const createdDate = customer.createdAt || customer.joinedAt || new Date();

  const higherSpendersCount = await StoreCustomer.countDocuments({
    ...(customerId ? { _id: { $ne: customerId } } : {}),
    $or: [
      { totalSpent: { $gt: spent } },
      { totalSpent: spent, visitCount: { $gt: visits } },
      {
        totalSpent: spent,
        visitCount: visits,
        $or: [
          { createdAt: { $lt: createdDate } },
          { joinedAt: { $lt: createdDate } }
        ]
      }
    ]
  });
  return higherSpendersCount + 1;
}

// Default Seed Templates (Expanded ready-to-use library)
const DEFAULT_TEMPLATES = [
  {
    title: 'Day 1 / First Purchase',
    code: 'first_purchase',
    body: 'Hello {name}, this was your day one of purchasing from Sonal Stationery of ₹{amount}! Your current rank is {rank}.',
    isDefault: true
  },
  {
    title: 'Repeat Purchase / Rank Update',
    code: 'repeat_purchase',
    body: 'Hello {name}, thank you for shopping for ₹{amount} at Sonal Stationery! Your total spend is now ₹{total} and your current rank is {rank}.',
    isDefault: true
  },
  {
    title: 'Rank Drop Alert',
    code: 'rank_drop',
    body: 'Hello {name}, someone just moved up the leaderboard at Sonal Stationery! You now hold the {rank} rank. Visit us soon to reclaim your spot!',
    isDefault: true
  },
  {
    title: 'Top 3 Podium Welcome',
    code: 'top_three',
    body: "Congratulations {name}! You've broken into the Top 3 at Sonal Stationery! You currently hold the {rank} rank with ₹{total} lifetime spend. Thank you for being a VIP customer!",
    isDefault: true
  },
  {
    title: '#1 Leaderboard King/Queen',
    code: 'rank_one',
    body: 'Amazing news {name}! You are now the #1 Top Spender at Sonal Stationery with ₹{total} total purchases across {visits} visits! Keep shining!',
    isDefault: true
  },
  {
    title: 'We Miss You / Come Back Nudge',
    code: 'miss_you',
    body: "Hello {name}, we haven't seen you at Sonal Stationery in a while! You currently hold the {rank} rank with ₹{total} spend. Drop by soon for new stationery & gifts!",
    isDefault: true
  },
  {
    title: 'Spending Milestone Reached',
    code: 'milestone',
    body: "Woohoo {name}! You've crossed ₹{total} in lifetime shopping at Sonal Stationery ({visits} visits) and sit at {rank} place. Thank you for your love and support!",
    isDefault: true
  }
];

// Ensure default templates exist (seeds missing ones without overwriting custom edits)
async function ensureDefaultTemplates() {
  for (const tpl of DEFAULT_TEMPLATES) {
    const exists = await WhatsappTemplate.findOne({ code: tpl.code });
    if (!exists) {
      await WhatsappTemplate.create(tpl);
      console.log(`[Store Rewards] Seeded missing default template: ${tpl.code}`);
    }
  }
}

/**
 * Get Leaderboard & Customer List
 * GET /api/admin/store-rewards/leaderboard
 */
exports.getLeaderboard = async (req, res) => {
  try {
    const { search = '', page = 1, limit = 50 } = req.query;
    const rawSort = req.query.sortBy || req.query.sort || 'totalSpent_desc';
    const sortBy = String(rawSort).trim();

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 50));
    const skip = (pageNum - 1) * limitNum;

    // Search query
    const filter = {};
    if (search && search.trim()) {
      const q = search.trim();
      const cleanPhone = cleanPhoneNumber(q);
      const searchRegex = new RegExp(q, 'i');
      filter.$or = [
        { name: searchRegex },
        { email: searchRegex }
      ];
      if (cleanPhone) {
        filter.$or.push({ phone: new RegExp(cleanPhone) });
      }
    }

    // Sort definition (tie-broken by visitCount desc, then createdAt/joinedAt asc)
    let sortOptions = { totalSpent: -1, visitCount: -1, createdAt: 1, joinedAt: 1 };
    if (sortBy === 'visits_desc') {
      sortOptions = { visitCount: -1, totalSpent: -1, createdAt: 1 };
    } else if (sortBy === 'newest') {
      sortOptions = { createdAt: -1, joinedAt: -1, totalSpent: -1 };
    } else if (sortBy === 'recent_purchase') {
      sortOptions = { lastPurchaseDate: -1, totalSpent: -1 };
    }

    const [customers, totalCount] = await Promise.all([
      StoreCustomer.find(filter)
        .sort(sortOptions)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      StoreCustomer.countDocuments(filter)
    ]);

    // Attach live rank & ordinal to each customer in response
    const enrichedCustomers = await Promise.all(
      customers.map(async (c) => {
        const liveRank = await calculateCustomerRank(c);
        return {
          ...c,
          cleanPhone: cleanPhoneNumber(c.phone),
          rank: liveRank,
          liveRank,
          rankOrdinal: formatOrdinal(liveRank)
        };
      })
    );

    // Compute Summary Stats
    const [totalCustomers, aggregateResult, topCustomerDoc] = await Promise.all([
      StoreCustomer.countDocuments(),
      StoreCustomer.aggregate([
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: '$totalSpent' },
            totalVisits: { $sum: '$visitCount' }
          }
        }
      ]),
      StoreCustomer.findOne().sort({ totalSpent: -1, joinedAt: 1 }).lean()
    ]);

    const totalRevenue = aggregateResult[0]?.totalRevenue || 0;
    const totalVisits = aggregateResult[0]?.totalVisits || 0;
    const avgVisits = totalCustomers > 0 ? (totalVisits / totalCustomers).toFixed(1) : 0;

    return res.json({
      success: true,
      customers: enrichedCustomers,
      pagination: {
        page: pageNum,
        limit: limitNum,
        totalCount,
        totalPages: Math.ceil(totalCount / limitNum) || 1
      },
      stats: {
        totalCustomers,
        totalRevenue,
        avgVisits,
        topCustomer: topCustomerDoc ? {
          name: topCustomerDoc.name,
          totalSpent: topCustomerDoc.totalSpent,
          rankOrdinal: '1st'
        } : null
      }
    });
  } catch (error) {
    console.error('[Admin Leaderboard Error]', error);
    return res.status(500).json({ success: false, message: 'Failed to load leaderboard.' });
  }
};

/**
 * Add Purchase & Track Displaced Customers (Upgrade 2)
 * POST /api/admin/store-rewards/customer/:id/purchase
 */
exports.addPurchase = async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, notes = '' } = req.body;

    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Please enter a valid purchase amount greater than ₹0.' });
    }

    const customer = await StoreCustomer.findById(id);
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found.' });
    }

    // 1. Capture old rank & previous total
    const oldRank = await calculateCustomerRank(customer);
    const oldRankOrdinal = formatOrdinal(oldRank);
    const previousTotalSpent = customer.totalSpent;

    // 2. Apply update
    customer.totalSpent += numericAmount;
    customer.visitCount += 1;
    customer.lastPurchaseAmount = numericAmount;
    customer.lastPurchaseDate = new Date();
    customer.purchaseHistory.push({
      amount: numericAmount,
      date: new Date(),
      notes: notes ? notes.trim() : '',
      recordedBy: req.admin?.email || 'Store Admin'
    });

    await customer.save();

    // 3. Compute new rank
    const newRank = await calculateCustomerRank(customer);
    const newRankOrdinal = formatOrdinal(newRank);

    // 4. Upgrade 2: Detect Displaced Customers whose rank just dropped
    let displacedCustomers = [];
    if (newRank < oldRank) {
      // Find all other customers whose totalSpent was between customer's old and new total
      const displacedDocs = await StoreCustomer.find({
        _id: { $ne: customer._id },
        totalSpent: { $gte: previousTotalSpent, $lte: customer.totalSpent }
      }).sort({ totalSpent: -1 }).lean();

      displacedCustomers = await Promise.all(
        displacedDocs.map(async (dc) => {
          const currentRank = await calculateCustomerRank(dc);
          return {
            id: dc._id,
            name: dc.name,
            phone: dc.phone,
            cleanPhone: cleanPhoneNumber(dc.phone),
            totalSpent: dc.totalSpent,
            currentRank,
            currentRankOrdinal: formatOrdinal(currentRank),
            previousRank: currentRank - 1,
            previousRankOrdinal: formatOrdinal(currentRank - 1)
          };
        })
      );
    }

    return res.json({
      success: true,
      message: `Purchase of ₹${numericAmount} logged successfully!`,
      customer: {
        id: customer._id,
        _id: customer._id,
        name: customer.name,
        phone: customer.phone,
        cleanPhone: cleanPhoneNumber(customer.phone),
        email: customer.email,
        totalSpent: customer.totalSpent,
        visitCount: customer.visitCount,
        lastPurchaseAmount: customer.lastPurchaseAmount,
        lastPurchaseDate: customer.lastPurchaseDate,
        rank: newRank,
        liveRank: newRank,
        rankOrdinal: newRankOrdinal
      },
      purchaseAmount: numericAmount,
      oldRank,
      oldRankOrdinal,
      newRank,
      newRankOrdinal,
      rankChanged: newRank < oldRank,
      displacedCustomers
    });
  } catch (error) {
    console.error('[Add Purchase Error]', error);
    return res.status(500).json({ success: false, message: 'Failed to record purchase.' });
  }
};

/**
 * Get WhatsApp Templates
 * GET /api/admin/store-rewards/templates
 */
exports.getTemplates = async (req, res) => {
  try {
    await ensureDefaultTemplates();
    const templates = await WhatsappTemplate.find().sort({ isDefault: -1, createdAt: 1 });
    return res.json({ success: true, templates });
  } catch (error) {
    console.error('[Get Templates Error]', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch templates.' });
  }
};

/**
 * Create Custom Template
 * POST /api/admin/store-rewards/templates
 */
exports.createTemplate = async (req, res) => {
  try {
    const { title, body } = req.body;
    if (!title || !title.trim() || !body || !body.trim()) {
      return res.status(400).json({ success: false, message: 'Title and message body are required.' });
    }

    const code = 'custom_' + Date.now();
    const template = new WhatsappTemplate({
      title: title.trim(),
      code,
      body: body.trim(),
      isDefault: false
    });

    await template.save();
    return res.json({ success: true, template });
  } catch (error) {
    console.error('[Create Template Error]', error);
    return res.status(500).json({ success: false, message: 'Failed to create template.' });
  }
};

/**
 * Update Template
 * PUT /api/admin/store-rewards/templates/:id
 */
exports.updateTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, body } = req.body;

    const template = await WhatsappTemplate.findById(id);
    if (!template) {
      return res.status(404).json({ success: false, message: 'Template not found.' });
    }

    if (title && title.trim()) template.title = title.trim();
    if (body && body.trim()) template.body = body.trim();

    await template.save();
    return res.json({ success: true, template });
  } catch (error) {
    console.error('[Update Template Error]', error);
    return res.status(500).json({ success: false, message: 'Failed to update template.' });
  }
};

/**
 * Delete Custom Template
 * DELETE /api/admin/store-rewards/templates/:id
 */
exports.deleteTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    const template = await WhatsappTemplate.findById(id);
    if (!template) {
      return res.status(404).json({ success: false, message: 'Template not found.' });
    }

    if (template.isDefault) {
      return res.status(400).json({ success: false, message: 'System default templates cannot be deleted.' });
    }

    await WhatsappTemplate.deleteOne({ _id: id });
    return res.json({ success: true, message: 'Template deleted successfully.' });
  } catch (error) {
    console.error('[Delete Template Error]', error);
    return res.status(500).json({ success: false, message: 'Failed to delete template.' });
  }
};

/**
 * Render Message with Live Placeholders & Generate wa.me Link (Upgrade 3 & 4)
 * POST /api/admin/store-rewards/render-message
 */
exports.renderMessage = async (req, res) => {
  try {
    const { templateCode, templateId, customerId, amount, rawText } = req.body;

    let customer = null;
    if (customerId) {
      customer = await StoreCustomer.findById(customerId);
    }

    let templateBody = rawText || '';
    if (!templateBody) {
      let tpl = null;
      if (templateId) {
        tpl = await WhatsappTemplate.findById(templateId);
      } else if (templateCode) {
        tpl = await WhatsappTemplate.findOne({ code: templateCode });
      }

      if (tpl) {
        templateBody = tpl.body;
      }
    }

    if (!templateBody) {
      return res.status(400).json({ success: false, message: 'Message text or template is required.' });
    }

    // Dynamic Variables Replacement
    const name = customer?.name || 'Valued Customer';
    const purchaseAmount = amount || customer?.lastPurchaseAmount || 0;
    const totalSpent = customer?.totalSpent || 0;
    const visits = customer?.visitCount || 1;

    let rankNumber = 1;
    let rankOrdinal = '1st';
    if (customer) {
      rankNumber = await calculateCustomerRank(customer);
      rankOrdinal = formatOrdinal(rankNumber);
    }

    // Replace live placeholders
    const renderedMessage = templateBody
      .replace(/{name}/gi, name)
      .replace(/{amount}/gi, purchaseAmount)
      .replace(/{total}/gi, totalSpent)
      .replace(/{rank}/gi, rankOrdinal)
      .replace(/{visits}/gi, visits);

    // Upgrade 4: Bulletproof 10-digit phone formatting
    const rawPhone = customer?.phone || req.body.phone || '';
    const cleanPhone = cleanPhoneNumber(rawPhone);
    const waUrl = cleanPhone.length === 10
      ? `https://wa.me/91${cleanPhone}?text=${encodeURIComponent(renderedMessage)}`
      : '';

    return res.json({
      success: true,
      messageText: renderedMessage,
      cleanPhone,
      waUrl
    });
  } catch (error) {
    console.error('[Render Message Error]', error);
    return res.status(500).json({ success: false, message: 'Failed to generate message preview.' });
  }
};

/**
 * Pro Tips Management (Admin)
 * GET /api/admin/store-rewards/pro-tips
 */
exports.getProTips = async (req, res) => {
  try {
    await StoreProTip.ensureDefaults();
    const tips = await StoreProTip.find().sort({ order: 1, createdAt: 1 });
    return res.json({ success: true, tips });
  } catch (error) {
    console.error('[Admin Pro Tips Error]', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch pro tips.' });
  }
};

/**
 * Create Pro Tip
 * POST /api/admin/store-rewards/pro-tips
 */
exports.createProTip = async (req, res) => {
  try {
    const { text, order = 0, isActive = true } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ success: false, message: 'Tip text is required.' });
    }
    const tip = await StoreProTip.create({
      text: text.trim(),
      order: Number(order) || 0,
      isActive: Boolean(isActive)
    });
    return res.status(201).json({ success: true, message: 'Pro tip created successfully.', tip });
  } catch (error) {
    console.error('[Create Pro Tip Error]', error);
    return res.status(500).json({ success: false, message: 'Failed to create pro tip.' });
  }
};

/**
 * Update Pro Tip
 * PUT /api/admin/store-rewards/pro-tips/:id
 */
exports.updateProTip = async (req, res) => {
  try {
    const { id } = req.params;
    const { text, order, isActive } = req.body;
    const tip = await StoreProTip.findById(id);
    if (!tip) {
      return res.status(404).json({ success: false, message: 'Pro tip not found.' });
    }
    if (text !== undefined) tip.text = text.trim();
    if (order !== undefined) tip.order = Number(order);
    if (isActive !== undefined) tip.isActive = Boolean(isActive);
    await tip.save();
    return res.json({ success: true, message: 'Pro tip updated successfully.', tip });
  } catch (error) {
    console.error('[Update Pro Tip Error]', error);
    return res.status(500).json({ success: false, message: 'Failed to update pro tip.' });
  }
};

/**
 * Delete Pro Tip
 * DELETE /api/admin/store-rewards/pro-tips/:id
 */
exports.deleteProTip = async (req, res) => {
  try {
    const { id } = req.params;
    const tip = await StoreProTip.findByIdAndDelete(id);
    if (!tip) {
      return res.status(404).json({ success: false, message: 'Pro tip not found.' });
    }
    return res.json({ success: true, message: 'Pro tip deleted successfully.' });
  } catch (error) {
    console.error('[Delete Pro Tip Error]', error);
    return res.status(500).json({ success: false, message: 'Failed to delete pro tip.' });
  }
};

/**
 * Get Active & Unacknowledged Check-Ins for Admin Live Feed
 * GET /api/admin/store-rewards/active-checkins (or /api/admin/rewards/active-checkins)
 * Protected by adminAuth
 */
exports.getActiveCheckins = async (req, res) => {
  try {
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);

    // 1. Unacknowledged check-ins from the last 30 minutes, newest first
    const unacknowledged = await CustomerCheckin.find({
      acknowledgedByAdmin: false,
      checkedInAt: { $gte: thirtyMinutesAgo }
    })
      .sort({ checkedInAt: -1 })
      .limit(20)
      .lean();

    // Attach ordinal rank to unacknowledged
    const enrichedUnacknowledged = unacknowledged.map(c => ({
      ...c,
      rankOrdinal: formatOrdinal(c.rank || 1),
      cleanPhone: cleanPhoneNumber(c.phone)
    }));

    // 2. All active customers seen in the last 15 minutes
    const recentCheckinsRaw = await CustomerCheckin.find({
      checkedInAt: { $gte: fifteenMinutesAgo }
    })
      .sort({ checkedInAt: -1 })
      .limit(50)
      .lean();

    // Deduplicate by customerId / phone so each active customer appears once with their latest scan
    const seenCustomers = new Set();
    const recentActive = [];
    for (const c of recentCheckinsRaw) {
      const key = String(c.customerId || c.phone);
      if (!seenCustomers.has(key)) {
        seenCustomers.add(key);
        recentActive.push({
          ...c,
          rankOrdinal: formatOrdinal(c.rank || 1),
          cleanPhone: cleanPhoneNumber(c.phone)
        });
      }
    }

    return res.json({
      success: true,
      unacknowledged: enrichedUnacknowledged,
      recentActive,
      serverTime: new Date()
    });
  } catch (error) {
    console.error('[Get Active Check-Ins Error]', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve active check-ins.' });
  }
};

/**
 * Dismiss / Acknowledge a Check-In Alert
 * POST /api/admin/store-rewards/active-checkins/:id/dismiss (or /api/admin/rewards/active-checkins/:id/dismiss)
 * Protected by adminAuth
 */
exports.dismissCheckin = async (req, res) => {
  try {
    const { id } = req.params;

    if (id === 'all') {
      await CustomerCheckin.updateMany(
        { acknowledgedByAdmin: false },
        { $set: { acknowledgedByAdmin: true } }
      );
      return res.json({ success: true, message: 'All check-in alerts dismissed.' });
    }

    const checkin = await CustomerCheckin.findByIdAndUpdate(
      id,
      { $set: { acknowledgedByAdmin: true } },
      { new: true }
    );

    if (!checkin) {
      return res.status(404).json({ success: false, message: 'Check-in record not found.' });
    }

    return res.json({ success: true, message: 'Check-in dismissed.', checkin });
  } catch (error) {
    console.error('[Dismiss Check-In Error]', error);
    return res.status(500).json({ success: false, message: 'Failed to dismiss check-in.' });
  }
};



