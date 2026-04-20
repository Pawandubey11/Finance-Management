const Transaction = require('../models/Transaction');

/**
 * @desc   Create a new transaction
 * @route  POST /api/transactions
 * @access Public
 */
const createTransaction = async (req, res, next) => {
  try {
    const { amount, category, platform, type, source, merchant, note, date, ts } = req.body;

    const transaction = await Transaction.create({
      amount,
      category: category || 'Other',
      platform,
      type: type || null,
      source: source || 'manual',
      merchant: merchant || null,
      note: note || '',
      date,
      ts: ts || Date.now(),
    });

    res.status(201).json({
      success: true,
      message: 'Transaction created successfully',
      data: transaction,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc   Get all transactions (with optional filters + pagination)
 * @route  GET /api/transactions
 * @access Public
 *
 * Query params:
 *   platform  – filter by payment platform
 *   category  – filter by category
 *   from      – start date (YYYY-MM-DD, inclusive)
 *   to        – end date   (YYYY-MM-DD, inclusive)
 *   source    – manual | SMS
 *   limit     – results per page (default 200)
 *   page      – page number      (default 1)
 */
const getTransactions = async (req, res, next) => {
  try {
    const { platform, category, from, to, source, limit = 200, page = 1 } = req.query;

    const filter = {};
    if (platform)  filter.platform = platform;
    if (category)  filter.category = category;
    if (source)    filter.source   = source;
    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = from;
      if (to)   filter.date.$lte = to;
    }

    const skip  = (Number(page) - 1) * Number(limit);
    const total = await Transaction.countDocuments(filter);

    const transactions = await Transaction.find(filter)
      .sort({ date: -1, ts: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean();

    res.status(200).json({
      success: true,
      count: transactions.length,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
      data: transactions,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc   Get a single transaction by ID
 * @route  GET /api/transactions/:id
 * @access Public
 */
const getTransactionById = async (req, res, next) => {
  try {
    const transaction = await Transaction.findById(req.params.id).lean();

    if (!transaction) {
      return res.status(404).json({ success: false, message: 'Transaction not found' });
    }

    res.status(200).json({ success: true, data: transaction });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc   Update a transaction
 * @route  PUT /api/transactions/:id
 * @access Public
 */
const updateTransaction = async (req, res, next) => {
  try {
    const { amount, category, platform, type, source, merchant, note, date } = req.body;

    const transaction = await Transaction.findByIdAndUpdate(
      req.params.id,
      { amount, category, platform, type, source, merchant, note, date },
      { new: true, runValidators: true }
    );

    if (!transaction) {
      return res.status(404).json({ success: false, message: 'Transaction not found' });
    }

    res.status(200).json({
      success: true,
      message: 'Transaction updated',
      data: transaction,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc   Delete a transaction
 * @route  DELETE /api/transactions/:id
 * @access Public
 */
const deleteTransaction = async (req, res, next) => {
  try {
    const transaction = await Transaction.findByIdAndDelete(req.params.id);

    if (!transaction) {
      return res.status(404).json({ success: false, message: 'Transaction not found' });
    }

    res.status(200).json({ success: true, message: 'Transaction deleted' });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc   Bulk insert transactions (e.g. from SMS parser)
 * @route  POST /api/transactions/bulk
 * @access Public
 */
const bulkCreateTransactions = async (req, res, next) => {
  try {
    const { transactions } = req.body;

    if (!Array.isArray(transactions) || transactions.length === 0) {
      return res.status(400).json({ success: false, message: 'transactions array is required' });
    }

    const docs = transactions.map((t) => ({
      amount:   t.amount,
      category: t.category || 'Other',
      platform: t.platform,
      type:     t.type     || null,
      source:   t.source   || 'SMS',
      merchant: t.merchant || null,
      note:     t.note     || '',
      date:     t.date,
      ts:       t.ts       || Date.now(),
    }));

    const inserted = await Transaction.insertMany(docs, { ordered: false });

    res.status(201).json({
      success: true,
      message: `${inserted.length} transaction(s) created`,
      count: inserted.length,
      data: inserted,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createTransaction,
  getTransactions,
  getTransactionById,
  updateTransaction,
  deleteTransaction,
  bulkCreateTransactions,
};
