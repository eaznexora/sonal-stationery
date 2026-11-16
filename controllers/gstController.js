const GstCache = require('../models/GstCache');

// 15-Character Indian GSTIN Regex
const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

// GST Character Map for Luhn Mod 36 Checksum
const GST_CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';

// Indian State Code Mapping (37 States & UTs + Special Jurisdictions)
const GST_STATE_MAP = {
  '01': 'Jammu and Kashmir',
  '02': 'Himachal Pradesh',
  '03': 'Punjab',
  '04': 'Chandigarh',
  '05': 'Uttarakhand',
  '06': 'Haryana',
  '07': 'Delhi',
  '08': 'Rajasthan',
  '09': 'Uttar Pradesh',
  '10': 'Bihar',
  '11': 'Sikkim',
  '12': 'Arunachal Pradesh',
  '13': 'Nagaland',
  '14': 'Manipur',
  '15': 'Mizoram',
  '16': 'Tripura',
  '17': 'Meghalaya',
  '18': 'Assam',
  '19': 'West Bengal',
  '20': 'Jharkhand',
  '21': 'Odisha',
  '22': 'Chhattisgarh',
  '23': 'Madhya Pradesh',
  '24': 'Gujarat',
  '25': 'Daman and Diu',
  '26': 'Dadra and Nagar Haveli and Daman and Diu',
  '27': 'Maharashtra',
  '28': 'Andhra Pradesh (Old)',
  '29': 'Karnataka',
  '30': 'Goa',
  '31': 'Lakshadweep',
  '32': 'Kerala',
  '33': 'Tamil Nadu',
  '34': 'Puducherry',
  '35': 'Andaman and Nicobar Islands',
  '36': 'Telangana',
  '37': 'Andhra Pradesh',
  '38': 'Ladakh',
  '97': 'Other Territory',
  '99': 'Centre Jurisdiction'
};

// Constitution of Business derived from 4th Character of PAN
const PAN_CONSTITUTION_MAP = {
  'P': 'Proprietorship',
  'C': 'Company',
  'F': 'Partnership / LLP',
  'H': 'HUF',
  'T': 'Trust',
  'A': 'Association of Persons',
  'B': 'Body of Individuals',
  'G': 'Government Agency',
  'J': 'Artificial Juridical Person',
  'L': 'Local Authority'
};

// Browser simulation headers
const BROWSER_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Accept': 'application/json, text/plain, */*',
  'Accept-Language': 'en-US,en;q=0.9',
  'Referer': 'https://services.gst.gov.in/'
};

/**
 * Verify Luhn Mod 36 Checksum for Indian GSTIN
 */
function verifyGstinChecksum(gstin) {
  if (!gstin || gstin.length !== 15) return false;
  try {
    let sum1 = 0;
    let sum2 = 0;
    for (let i = 0; i < 14; i++) {
      const codePoint = GST_CHARS.indexOf(gstin[i]);
      if (codePoint === -1) return false;

      // GSTN standard alternating weights
      const factor1 = (i % 2 === 0) ? 1 : 2;
      const prod1 = codePoint * factor1;
      sum1 += Math.floor(prod1 / 36) + (prod1 % 36);

      const factor2 = (i % 2 === 0) ? 2 : 1;
      const prod2 = codePoint * factor2;
      sum2 += Math.floor(prod2 / 36) + (prod2 % 36);
    }
    const check1 = (36 - (sum1 % 36)) % 36;
    const check2 = (36 - (sum2 % 36)) % 36;
    return GST_CHARS[check1] === gstin[14] || GST_CHARS[check2] === gstin[14];
  } catch (e) {
    return false;
  }
}

/**
 * Flatten GST address object into clean comma-separated single address string
 */
function flattenGstAddress(addrObj) {
  if (!addrObj) return '';
  if (typeof addrObj === 'string') return addrObj.trim();

  const a = addrObj.addr || addrObj;
  if (typeof a === 'string') return a.trim();

  const parts = [];
  const add = (val) => {
    if (val && typeof val === 'string' && val.trim() && val.trim() !== 'null' && val.trim() !== 'undefined') {
      const clean = val.trim().replace(/^[,\s]+|[,\s]+$/g, '');
      if (clean && !parts.includes(clean)) parts.push(clean);
    }
  };

  add(a.flno || a.floor_no);
  add(a.bno || a.building_no);
  add(a.bnm || a.building_name);
  add(a.st || a.street);
  add(a.loc || a.locality);
  add(a.landmark);
  add(a.city || a.dst || a.district);
  add(a.stcd || a.state);
  add(a.pncd || a.pincode || a.zip);

  return parts.join(', ');
}

/**
 * Extract and normalize business details from public JSON responses
 */
function parsePublicApiResponse(raw) {
  if (!raw) return null;
  try {
    let parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;

    // Handle allorigins proxy or nested payloads
    if (parsed && typeof parsed.contents === 'string') {
      try { parsed = JSON.parse(parsed.contents); } catch (e) {}
    } else if (parsed && typeof parsed.contents === 'object' && parsed.contents !== null) {
      parsed = parsed.contents;
    }

    if (Array.isArray(parsed) && parsed.length > 0) {
      parsed = parsed[0];
    }

    let data = parsed;
    if (parsed?.data) {
      data = Array.isArray(parsed.data) ? (parsed.data[0] || parsed.data) : parsed.data;
    } else if (parsed?.result) {
      data = Array.isArray(parsed.result) ? (parsed.result[0] || parsed.result) : parsed.result;
    } else if (parsed?.response) {
      data = Array.isArray(parsed.response) ? (parsed.response[0] || parsed.response) : parsed.response;
    } else if (parsed?.taxpayerDetails) {
      data = parsed.taxpayerDetails;
    }

    if (data?.data && typeof data.data === 'object') {
      data = Array.isArray(data.data) ? (data.data[0] || data.data) : data.data;
    }

    if (!data || typeof data !== 'object') return null;

    const legalName = String(
      data.lgnm ||
      data.legal_name ||
      data.legalName ||
      data.LegalName ||
      data.name ||
      data.taxpayer_name ||
      data.taxpayerName ||
      ''
    ).trim();

    const tradeName = String(
      data.tradeNam ||
      data.trade_name ||
      data.tradeName ||
      data.TradeName ||
      data.business_name ||
      data.businessName ||
      data.company_name ||
      legalName ||
      ''
    ).trim();

    const address = flattenGstAddress(data.pradr || data.address || data.principal_address || data);
    const status = String(data.sts || data.status || data.gstin_status || 'Active').trim();
    const taxpayerType = String(data.dty || data.taxpayer_type || data.taxpayerType || 'Regular').trim();
    const constitution = String(data.ctb || data.constitution || '').trim();
    const registrationDate = String(data.rgdt || data.registration_date || data.registrationDate || '').trim();

    let natureOfBusiness = [];
    if (Array.isArray(data.nba)) {
      natureOfBusiness = data.nba.map(n => String(n).trim()).filter(Boolean);
    } else if (typeof data.nba === 'string') {
      natureOfBusiness = [data.nba.trim()];
    } else if (typeof data.nature_of_business === 'string') {
      natureOfBusiness = [data.nature_of_business.trim()];
    }

    if (legalName || tradeName || address) {
      return {
        legalName: legalName || tradeName,
        tradeName: tradeName || legalName,
        displayName: tradeName || legalName,
        address,
        status: status || 'Active',
        taxpayerType: taxpayerType || 'Regular',
        constitution,
        registrationDate,
        natureOfBusiness
      };
    }
  } catch (e) {}
  return null;
}

/**
 * Fetch a single URL with 6-second timeout and browser headers
 */
async function fetchWithTimeout(url, headers = {}, timeoutMs = 6000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: { ...BROWSER_HEADERS, ...headers },
      signal: controller.signal
    });
    if (!res.ok) return null;
    return await res.text();
  } catch (err) {
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Query public non-CAPTCHA GST endpoints in parallel
 */
async function queryPublicGstEndpoints(gstin) {
  const clean = encodeURIComponent(gstin);

  const publicEndpoints = [
    `https://sheet.gstincheck.co.in/check/${clean}`,
    `https://api.allorigins.win/raw?url=${encodeURIComponent(`https://sheet.gstincheck.co.in/check/${clean}`)}`,
    `https://app.getclear.in/api/v1/gstin/${clean}`,
    `https://commonapi.mastersindia.co/commonapis/searchgstin?gstin=${clean}`,
    `https://api.eva.pingutil.com/gst?gstin=${clean}`
  ];

  const queries = publicEndpoints.map(async (url) => {
    const raw = await fetchWithTimeout(url, {}, 6000);
    if (!raw) throw new Error('No data');
    const parsed = parsePublicApiResponse(raw);
    if (!parsed || (!parsed.displayName && !parsed.address)) {
      throw new Error('Unparsed');
    }
    return parsed;
  });

  try {
    return await Promise.any(queries);
  } catch (err) {
    // If public endpoints fail, check if GSTIN_API_KEY fallback is configured
    if (process.env.GSTIN_API_KEY) {
      try {
        const apiKeyUrl = `https://www.gstinapi.in/v1/gstin/${clean}`;
        const rawApiKey = await fetchWithTimeout(apiKeyUrl, {
          'apikey': process.env.GSTIN_API_KEY,
          'Authorization': `Bearer ${process.env.GSTIN_API_KEY}`
        }, 6000);
        if (rawApiKey) {
          const parsedApiKey = parsePublicApiResponse(rawApiKey);
          if (parsedApiKey && (parsedApiKey.displayName || parsedApiKey.address)) {
            return parsedApiKey;
          }
        }
      } catch (apiKeyErr) {
        console.warn('[GSTIN_API_KEY Fallback Notice]', apiKeyErr.message);
      }
    }
    return null;
  }
}

/**
 * 3-Tier GSTIN Lookup Controller
 * GET /api/gst/:gstin
 */
exports.lookupGstin = async (req, res) => {
  try {
    const rawGstin = req.params.gstin || '';
    const cleanGstin = String(rawGstin).trim().toUpperCase();

    // 1. Format & Regex Validation
    if (!cleanGstin || cleanGstin.length !== 15 || !GSTIN_REGEX.test(cleanGstin)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid GSTIN format. Expected a 15-character alphanumeric Indian GSTIN (e.g. 24AABCS1429B1ZS).'
      });
    }

    // 2. Offline Deterministic Fields (Always parsed first)
    const stateCode = cleanGstin.slice(0, 2);
    const stateName = GST_STATE_MAP[stateCode] || 'Unknown State';
    const pan = cleanGstin.slice(2, 12);
    const constitutionChar = pan.charAt(3);
    const derivedConstitution = PAN_CONSTITUTION_MAP[constitutionChar] || 'Other';

    // 3. Checksum Verification
    const isChecksumValid = verifyGstinChecksum(cleanGstin);

    // Tier 1: Check MongoDB GstCache (Fastest)
    try {
      const cached = await GstCache.findOne({ gstin: cleanGstin });
      if (cached && (cached.displayName || cached.tradeName || cached.legalName)) {
        return res.json({
          success: true,
          source: 'cache',
          data: {
            gstin: cached.gstin,
            legalName: cached.legalName,
            tradeName: cached.tradeName,
            displayName: cached.displayName || cached.tradeName || cached.legalName,
            address: cached.address,
            stateCode: cached.stateCode || stateCode,
            stateName: cached.stateName || stateName,
            pan: cached.pan || pan,
            status: cached.status || 'Active',
            taxpayerType: cached.taxpayerType || 'Regular',
            constitution: cached.constitution || derivedConstitution,
            registrationDate: cached.registrationDate || '',
            natureOfBusiness: cached.natureOfBusiness || [],
            source: 'cache',
            updatedAt: cached.updatedAt
          }
        });
      }
    } catch (cacheErr) {
      console.warn('[GstCache Find Warning]', cacheErr.message);
    }

    // Tier 2: Public Non-CAPTCHA Endpoints (6s Timeout)
    let liveData = null;
    try {
      liveData = await queryPublicGstEndpoints(cleanGstin);
    } catch (queryErr) {
      console.warn('[GST Tier 2 Query Warning]', queryErr.message);
    }

    if (liveData && (liveData.displayName || liveData.address)) {
      const legalName = liveData.legalName || liveData.displayName || '';
      const tradeName = liveData.tradeName || liveData.displayName || '';
      const displayName = liveData.displayName || tradeName || legalName;
      const address = liveData.address || '';
      const status = liveData.status || 'Active';
      const taxpayerType = liveData.taxpayerType || 'Regular';
      const constitution = liveData.constitution || derivedConstitution;
      const registrationDate = liveData.registrationDate || '';
      const natureOfBusiness = liveData.natureOfBusiness || [];

      // Save to MongoDB GstCache (60-day TTL auto-managed)
      try {
        await GstCache.findOneAndUpdate(
          { gstin: cleanGstin },
          {
            gstin: cleanGstin,
            legalName,
            tradeName,
            displayName,
            address,
            stateCode,
            stateName,
            pan,
            status,
            taxpayerType,
            constitution,
            registrationDate,
            natureOfBusiness,
            source: 'public_api',
            updatedAt: new Date()
          },
          { upsert: true, new: true, setDefaultsOnInsert: true }
        );
      } catch (saveErr) {
        console.warn('[GstCache Save Warning]', saveErr.message);
      }

      return res.json({
        success: true,
        source: 'api',
        data: {
          gstin: cleanGstin,
          legalName,
          tradeName,
          displayName,
          address,
          stateCode,
          stateName,
          pan,
          status,
          taxpayerType,
          constitution,
          registrationDate,
          natureOfBusiness,
          source: 'api'
        }
      });
    }

    // Checksum verification rejection for unverified GSTINs that failed live lookup
    if (!isChecksumValid) {
      return res.status(400).json({
        success: false,
        message: 'Invalid GSTIN checksum digit. Please verify the entered GST number.'
      });
    }

    // Tier 3: Offline Deterministic Fallback (Billing is NEVER blocked!)
    return res.json({
      success: true,
      partial: true,
      source: 'offline',
      data: {
        gstin: cleanGstin,
        legalName: '',
        tradeName: '',
        displayName: '',
        address: '',
        stateCode,
        stateName,
        pan,
        constitution: derivedConstitution,
        status: 'Offline / Manual Entry',
        taxpayerType: 'Regular',
        registrationDate: '',
        natureOfBusiness: []
      }
    });

  } catch (error) {
    console.error('[GST Lookup Error]', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error while resolving GSTIN.'
    });
  }
};

