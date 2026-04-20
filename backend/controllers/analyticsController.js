const Transaction = require('../models/Transaction');

/**
 * @desc   Get analytics summary
 * @route  GET /api/analytics
 * @access Public
 *
 * Query params: from, to, platform, category
 */
const getAnalytics = async (req, res, next) => {
  try {
    const { from, to, platform, category } = req.query;

    const filter = {};
    if (platform) filter.platform = platform;
    if (category) filter.category = category;
    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = from;
      if (to)   filter.date.$lte = to;
    }

    const transactions = await Transaction.find(filter).lean();

    if (!transactions.length) {
      return res.status(200).json({
        success: true,
        data: {
          totalSpent: 0,
          totalTransactions: 0,
          todaySpent: 0,
          monthSpent: 0,
          categoryBreakdown: {},
          platformBreakdown: {},
          dailyBreakdown: {},
          peakDay: null,
          topCategory: null,
          topPlatform: null,
        },
      });
    }

    const today     = new Date().toISOString().split('T')[0];
    const thisMonth = today.slice(0, 7);

    // ── Aggregations ────────────────────────────────────────────
    let totalSpent        = 0;
    let todaySpent        = 0;
    let monthSpent        = 0;
    const categoryBreakdown = {};
    const platformBreakdown = {};
    const dailyBreakdown    = {};

    for (const t of transactions) {
      totalSpent += t.amount;
      if (t.date === today)              todaySpent  += t.amount;
      if (t.date.startsWith(thisMonth))  monthSpent  += t.amount;

      categoryBreakdown[t.category] = (categoryBreakdown[t.category] || 0) + t.amount;
      platformBreakdown[t.platform] = (platformBreakdown[t.platform] || 0) + t.amount;
      dailyBreakdown[t.date]        = (dailyBreakdown[t.date]        || 0) + t.amount;
    }

    // Peak spend day
    const peakEntry = Object.entries(dailyBreakdown).sort((a, b) => b[1] - a[1])[0];
    const peakDay   = peakEntry ? { date: peakEntry[0], amount: peakEntry[1] } : null;

    // Top category by spend
    const topCatEntry = Object.entries(categoryBreakdown).sort((a, b) => b[1] - a[1])[0];
    const topCategory = topCatEntry ? { name: topCatEntry[0], amount: topCatEntry[1] } : null;

    // Top platform by count
    const platformCount = {};
    for (const t of transactions) {
      platformCount[t.platform] = (platformCount[t.platform] || 0) + 1;
    }
    const topPlatEntry  = Object.entries(platformCount).sort((a, b) => b[1] - a[1])[0];
    const topPlatform   = topPlatEntry ? { name: topPlatEntry[0], count: topPlatEntry[1] } : null;

    // Monthly trend (last 12 months)
    const monthlyTrend = {};
    for (const t of transactions) {
      const ym = t.date.slice(0, 7);
      monthlyTrend[ym] = (monthlyTrend[ym] || 0) + t.amount;
    }

    res.status(200).json({
      success: true,
      data: {
        totalSpent:         Math.round(totalSpent * 100) / 100,
        totalTransactions:  transactions.length,
        todaySpent:         Math.round(todaySpent * 100) / 100,
        monthSpent:         Math.round(monthSpent * 100) / 100,
        categoryBreakdown,
        platformBreakdown,
        platformCount,
        dailyBreakdown,
        monthlyTrend,
        peakDay,
        topCategory,
        topPlatform,
      },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { getAnalytics };
