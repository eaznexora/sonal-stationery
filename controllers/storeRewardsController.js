const StoreCustomer = require('../models/StoreCustomer');
const StoreCustomerOtp = require('../models/StoreCustomerOtp');
const StoreProTip = require('../models/StoreProTip');
const CustomerCheckin = require('../models/CustomerCheckin');
const { Resend } = require('resend');
const { OAuth2Client } = require('google-auth-library');

const resend = new Resend(process.env.RESEND_API_KEY);

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

// Helper: Live rank calculation based on totalSpent descending (with joinedAt tiebreaker)
async function calculateCustomerRank(customer) {
  if (!customer) return 1;
  const higherSpendersCount = await StoreCustomer.countDocuments({
    $or: [
      { totalSpent: { $gt: customer.totalSpent } },
      { totalSpent: customer.totalSpent, joinedAt: { $lt: customer.joinedAt } }
    ]
  });
  return higherSpendersCount + 1;
}

/**
 * Step 1: Send Email OTP with 45-Second Rate Limiting & Duplicate Detection
 * POST /api/store-rewards/send-otp
 */
exports.sendOtp = async (req, res) => {
  try {
    const { name, phone, email } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Full name is required.' });
    }
    if (!phone || !phone.trim()) {
      return res.status(400).json({ success: false, message: 'WhatsApp mobile number is required.' });
    }
    if (!email || !email.trim()) {
      return res.status(400).json({ success: false, message: 'Email address is required.' });
    }

    const cleanName = name.trim();
    const cleanPhone = cleanPhoneNumber(phone);
    const cleanEmail = email.toLowerCase().trim();

    if (cleanPhone.length !== 10) {
      return res.status(400).json({ success: false, message: 'Please enter a valid 10-digit mobile number.' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      return res.status(400).json({ success: false, message: 'Please enter a valid email address.' });
    }

    // Rate Limiting: 45-second cooldown per email/phone
    const existingOtp = await StoreCustomerOtp.findOne({
      $or: [{ email: cleanEmail }, { phone: cleanPhone }]
    });

    if (existingOtp && existingOtp.lastSentAt) {
      const elapsedSeconds = Math.floor((Date.now() - new Date(existingOtp.lastSentAt).getTime()) / 1000);
      const cooldownRemaining = 45 - elapsedSeconds;
      if (cooldownRemaining > 0) {
        return res.status(429).json({
          success: false,
          message: `Please wait ${cooldownRemaining} seconds before requesting a new code.`,
          cooldownRemaining
        });
      }
    }

    // Check if customer already exists across either phone OR email
    const existingCustomer = await StoreCustomer.findOne({
      $or: [{ email: cleanEmail }, { phone: cleanPhone }]
    });

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Upsert temporary OTP record with 10-minute TTL
    await StoreCustomerOtp.findOneAndUpdate(
      { email: cleanEmail },
      {
        email: cleanEmail,
        phone: cleanPhone,
        name: cleanName,
        otp,
        lastSentAt: new Date()
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    console.log(`[STORE REWARDS OTP DEBUG] ${cleanEmail} (${cleanPhone}) -> ${otp}`);

    // Send styled verification email via Resend
    const { error: resendError } = await resend.emails.send({
      from: 'Sonal Stationery <noreply@sonalstationary.in>',
      to: cleanEmail,
      subject: `Your In-Store Rewards Verification Code: ${otp}`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 580px; margin: 0 auto; background-color: #fbf9f6; border: 1px solid #e2dfd8; border-radius: 12px; overflow: hidden; color: #2c2c2c;">
          <div style="background-color: #2c2c2c; padding: 24px; text-align: center;">
            <h1 style="color: #fbf9f6; font-size: 20px; letter-spacing: 2px; text-transform: uppercase; margin: 0; font-weight: 600;">Sonal Stationery</h1>
            <p style="color: #9caf9f; font-size: 12px; letter-spacing: 1px; margin: 6px 0 0 0; text-transform: uppercase;">In-Store Loyalty & Leaderboard</p>
          </div>
          <div style="padding: 32px 28px; background-color: #ffffff;">
            <p style="font-size: 16px; margin: 0 0 16px 0;">Hello <strong>${cleanName}</strong>,</p>
            <p style="font-size: 14px; color: #6e6b66; line-height: 1.6; margin: 0 0 24px 0;">
              Thank you for visiting Sonal Stationery! Use the 6-digit verification code below to verify your account, unlock exclusive in-store rewards, and track your live spot on our in-store customer leaderboard.
            </p>
            <div style="text-align: center; margin: 28px 0;">
              <div style="display: inline-block; font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #2c2c2c; background: #f2eee8; padding: 14px 28px; border-radius: 10px; border: 1px dashed #9caf9f;">
                ${otp}
              </div>
            </div>
            <p style="font-size: 12px; color: #888888; text-align: center; margin: 0 0 24px 0;">
              ⏱ This code is valid for <strong>10 minutes</strong>. If you did not request this, please disregard this email.
            </p>
          </div>
          <div style="background-color: #f2eee8; padding: 16px 24px; text-align: center; font-size: 12px; color: #6e6b66; border-top: 1px solid #e2dfd8;">
            Shop No. 12-14, Sonal Arcade, Opp. Railway Station, Varachha Road, Surat, Gujarat • +91 98200 12345
          </div>
        </div>
      `
    });

    if (resendError) {
      console.error('[Resend Error]', resendError);
      return res.status(500).json({ success: false, message: 'Failed to send verification code. Please check email address.' });
    }

    return res.json({
      success: true,
      message: 'Verification code sent to your email.',
      isExisting: !!existingCustomer
    });
  } catch (error) {
    console.error('[Send OTP Error]', error);
    return res.status(500).json({ success: false, message: 'Internal server error. Please try again.' });
  }
};

/**
 * Step 2: Verify OTP & Register/Recognize Customer
 * POST /api/store-rewards/verify-otp
 */
exports.verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ success: false, message: 'Email and verification code are required.' });
    }

    const cleanEmail = email.toLowerCase().trim();
    const cleanOtp = String(otp).trim();

    // Verify OTP from temporary collection
    const otpDoc = await StoreCustomerOtp.findOne({ email: cleanEmail, otp: cleanOtp });
    if (!otpDoc) {
      return res.status(400).json({ success: false, message: 'Invalid or expired verification code.' });
    }

    const cleanPhone = cleanPhoneNumber(otpDoc.phone);
    const cleanName = otpDoc.name;

    // Upgrade 1: Check existing customer by either email OR phone to prevent duplicates
    let customer = await StoreCustomer.findOne({
      $or: [{ email: cleanEmail }, { phone: cleanPhone }]
    });

    let isNew = false;

    if (customer) {
      // Returning customer: keep existing spend/visits, update name/phone if refreshed
      if (cleanName && customer.name !== cleanName) customer.name = cleanName;
      if (cleanPhone && customer.phone !== cleanPhone) customer.phone = cleanPhone;
      if (cleanEmail && customer.email !== cleanEmail) customer.email = cleanEmail;
      await customer.save();
    } else {
      // New customer: create fresh record
      customer = new StoreCustomer({
        name: cleanName,
        phone: cleanPhone,
        email: cleanEmail,
        totalSpent: 0,
        visitCount: 0,
        joinedAt: new Date()
      });
      await customer.save();
      isNew = true;
    }

    // Clean up OTP record
    await StoreCustomerOtp.deleteOne({ _id: otpDoc._id });

    // Compute live rank
    const liveRank = await calculateCustomerRank(customer);
    const rankOrdinal = formatOrdinal(liveRank);
    const totalCustomers = await StoreCustomer.countDocuments();

    return res.json({
      success: true,
      isNew,
      rank: liveRank,
      rankOrdinal,
      totalCustomers,
      customer: {
        id: customer._id,
        name: customer.name,
        phone: customer.phone,
        email: customer.email,
        totalSpent: customer.totalSpent,
        visitCount: customer.visitCount,
        lastPurchaseDate: customer.lastPurchaseDate,
        joinedAt: customer.joinedAt
      },
      message: isNew
        ? `Welcome to Sonal Stationery Rewards, ${customer.name}!`
        : `Welcome back, ${customer.name}! You hold rank #${liveRank}.`
    });
  } catch (error) {
    console.error('[Verify OTP Error]', error);
    return res.status(500).json({ success: false, message: 'Verification failed. Please try again.' });
  }
};

/**
 * Live Rank Lookup for Customer
 * GET /api/store-rewards/my-rank?identifier=... (or phone=..., or email=...)
 */
exports.getMyRank = async (req, res) => {
  try {
    const rawIdentifier = req.query.identifier || req.query.phone || req.query.email;
    if (!rawIdentifier) {
      return res.status(400).json({ success: false, message: 'Phone number or email is required.' });
    }

    const cleanInput = String(rawIdentifier).trim();
    const cleanPhone = cleanPhoneNumber(cleanInput);
    const cleanEmail = cleanInput.toLowerCase();

    const customer = await StoreCustomer.findOne({
      $or: [{ email: cleanEmail }, { phone: cleanPhone }]
    });

    if (!customer) {
      return res.status(404).json({ success: false, message: 'No registered loyalty account found with these details.' });
    }

    const liveRank = await calculateCustomerRank(customer);
    const rankOrdinal = formatOrdinal(liveRank);
    const totalCustomers = await StoreCustomer.countDocuments();

    return res.json({
      success: true,
      rank: liveRank,
      rankOrdinal,
      totalCustomers,
      customer: {
        id: customer._id,
        name: customer.name,
        phone: customer.phone,
        email: customer.email,
        totalSpent: customer.totalSpent,
        visitCount: customer.visitCount,
        lastPurchaseDate: customer.lastPurchaseDate
      }
    });
  } catch (error) {
    console.error('[Get Rank Error]', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve rank details.' });
  }
};

/**
 * Public Active Pro Tips
 * GET /api/store-rewards/pro-tips
 */
exports.getPublicProTips = async (req, res) => {
  try {
    await StoreProTip.ensureDefaults();
    const tips = await StoreProTip.find({ isActive: true }).sort({ order: 1, createdAt: 1 });
    return res.json({
      success: true,
      tips
    });
  } catch (error) {
    console.error('[Public Pro Tips Error]', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch pro tips.' });
  }
};

/**
 * Public Google Client ID Config
 * GET /api/store-rewards/google-config
 */
exports.getGoogleConfig = async (req, res) => {
  try {
    const clientId = process.env.GOOGLE_CLIENT_ID || process.env.GOOGLE_OAUTH_CLIENT_ID || '';
    return res.json({
      success: true,
      clientId
    });
  } catch (error) {
    console.error('[Google Config Error]', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve configuration.' });
  }
};

/**
 * Google Sign-In & Customer Registration with Mandatory 10-Digit Mobile Number
 * POST /api/store-rewards/google-auth
 */
exports.googleAuth = async (req, res) => {
  try {
    const { credential, phone } = req.body;

    if (!credential) {
      return res.status(400).json({ success: false, message: 'Google credential is required.' });
    }

    if (!phone || !String(phone).trim()) {
      return res.status(400).json({ success: false, message: 'WhatsApp mobile number is required.' });
    }

    const cleanPhone = cleanPhoneNumber(phone);
    if (cleanPhone.length !== 10) {
      return res.status(400).json({ success: false, message: 'Please provide a valid 10-digit mobile number.' });
    }

    const clientId = process.env.GOOGLE_CLIENT_ID || process.env.GOOGLE_OAUTH_CLIENT_ID;
    if (!clientId) {
      return res.status(500).json({ success: false, message: 'Google authentication is not configured on the server.' });
    }

    const googleClient = new OAuth2Client(clientId);
    let payload;
    try {
      const ticket = await googleClient.verifyIdToken({
        idToken: credential,
        audience: clientId
      });
      payload = ticket.getPayload();
    } catch (verifyError) {
      console.error('[Google Verify Token Error]', verifyError.message || verifyError);
      return res.status(401).json({ success: false, message: 'Google authentication token verification failed. Please try again.' });
    }

    if (!payload || !payload.email) {
      return res.status(400).json({ success: false, message: 'Unable to extract email from Google account.' });
    }

    const cleanEmail = payload.email.toLowerCase().trim();
    const cleanName = (payload.name || payload.given_name || 'Valued Customer').trim();

    // Prevent duplicate profiles across either phone OR email
    let customer = await StoreCustomer.findOne({
      $or: [{ email: cleanEmail }, { phone: cleanPhone }]
    });

    let isNew = false;

    if (customer) {
      // Returning customer: keep existing spend/visits/joinedAt, update name/phone/email
      if (cleanName && (!customer.name || customer.name === 'Valued Customer')) {
        customer.name = cleanName;
      }
      if (cleanPhone && customer.phone !== cleanPhone) {
        const phoneOwner = await StoreCustomer.findOne({ phone: cleanPhone });
        if (!phoneOwner || phoneOwner._id.equals(customer._id)) {
          customer.phone = cleanPhone;
        }
      }
      if (cleanEmail && customer.email !== cleanEmail) {
        const emailOwner = await StoreCustomer.findOne({ email: cleanEmail });
        if (!emailOwner || emailOwner._id.equals(customer._id)) {
          customer.email = cleanEmail;
        }
      }
      await customer.save();
    } else {
      // New customer: create fresh record
      customer = new StoreCustomer({
        name: cleanName,
        phone: cleanPhone,
        email: cleanEmail,
        totalSpent: 0,
        visitCount: 0,
        joinedAt: new Date()
      });
      await customer.save();
      isNew = true;
    }

    // Compute live rank
    const liveRank = await calculateCustomerRank(customer);
    const rankOrdinal = formatOrdinal(liveRank);
    const totalCustomers = await StoreCustomer.countDocuments();

    return res.json({
      success: true,
      isNew,
      rank: liveRank,
      rankOrdinal,
      totalCustomers,
      customer: {
        id: customer._id,
        name: customer.name,
        phone: customer.phone,
        email: customer.email,
        totalSpent: customer.totalSpent,
        visitCount: customer.visitCount,
        lastPurchaseDate: customer.lastPurchaseDate,
        joinedAt: customer.joinedAt
      },
      message: isNew
        ? `Welcome to Sonal Stationery Rewards, ${customer.name}!`
        : `Welcome back, ${customer.name}! You hold rank #${liveRank}.`
    });
  } catch (error) {
    console.error('[Google Auth Error]', error);
    return res.status(500).json({ success: false, message: 'Authentication failed. Please try again.' });
  }
};

/**
 * Customer Check-In from In-Store QR scan or App Visit
 * POST /api/store-rewards/checkin (or /api/rewards/checkin)
 * Public, rate-limited / anti-spam cooldown
 */
exports.recordCheckin = async (req, res) => {
  try {
    const { customerId, phone, email } = req.body;

    if (!customerId && !phone && !email) {
      return res.status(400).json({ success: false, message: 'Customer identifier (ID, phone, or email) is required.' });
    }

    const cleanPhone = phone ? cleanPhoneNumber(phone) : '';
    const cleanEmail = email ? String(email).toLowerCase().trim() : '';

    const queryConditions = [];
    if (customerId) {
      try {
        queryConditions.push({ _id: customerId });
      } catch (e) {}
    }
    if (cleanPhone) queryConditions.push({ phone: cleanPhone });
    if (cleanEmail) queryConditions.push({ email: cleanEmail });

    if (queryConditions.length === 0) {
      return res.status(400).json({ success: false, message: 'Invalid customer identifier.' });
    }

    const customer = await StoreCustomer.findOne({ $or: queryConditions });
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Loyalty account not found.' });
    }

    // Compute current live rank
    const currentRank = await calculateCustomerRank(customer);
    const rankOrdinal = formatOrdinal(currentRank);

    // Anti-Spam Cooldown: 3 minutes (180,000 ms)
    const threeMinutesAgo = new Date(Date.now() - 3 * 60 * 1000);
    const recentCheckin = await CustomerCheckin.findOne({
      customerId: customer._id,
      checkedInAt: { $gte: threeMinutesAgo }
    }).sort({ checkedInAt: -1 });

    if (recentCheckin) {
      return res.json({
        success: true,
        deduplicated: true,
        message: 'Check-in already logged recently.',
        checkin: {
          id: recentCheckin._id,
          customerId: recentCheckin.customerId,
          name: recentCheckin.name,
          phone: recentCheckin.phone,
          email: recentCheckin.email,
          totalSpend: recentCheckin.totalSpend,
          visitCount: recentCheckin.visitCount,
          rank: recentCheckin.rank,
          rankOrdinal,
          checkedInAt: recentCheckin.checkedInAt
        }
      });
    }

    // Create new check-in record
    const checkin = new CustomerCheckin({
      customerId: customer._id,
      name: customer.name,
      phone: customer.phone,
      email: customer.email || '',
      totalSpend: customer.totalSpent || 0,
      visitCount: customer.visitCount || 0,
      rank: currentRank,
      checkedInAt: new Date(),
      acknowledgedByAdmin: false
    });

    await checkin.save();

    console.log(`[STORE CHECK-IN] "${customer.name}" (${customer.phone}) checked in at Sonal Stationery. Rank: #${currentRank}`);

    return res.json({
      success: true,
      deduplicated: false,
      message: 'Check-in recorded successfully.',
      checkin: {
        id: checkin._id,
        customerId: checkin.customerId,
        name: checkin.name,
        phone: checkin.phone,
        email: checkin.email,
        totalSpend: checkin.totalSpend,
        visitCount: checkin.visitCount,
        rank: checkin.rank,
        rankOrdinal,
        checkedInAt: checkin.checkedInAt
      }
    });
  } catch (error) {
    console.error('[Customer Check-In Error]', error);
    return res.status(500).json({ success: false, message: 'Failed to record check-in.' });
  }
};




