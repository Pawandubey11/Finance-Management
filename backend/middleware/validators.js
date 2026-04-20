const { body, query, param, validationResult } = require('express-validator');

/**
 * Throw if validation errors exist.
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map((e) => ({ field: e.path, message: e.msg })),
    });
  }
  next();
};

const transactionCreateRules = [
  body('amount')
    .isFloat({ min: 0.01 })
    .withMessage('Amount must be a positive number'),
  body('category')
    .optional()
    .isIn(['Food', 'Travel', 'Shopping', 'Education', 'Health', 'Other'])
    .withMessage('Invalid category'),
  body('platform')
    .isIn(['UPI', 'GPay', 'PhonePe', 'Paytm', 'Card', 'Bank', 'Cash'])
    .withMessage('Invalid platform'),
  body('date')
    .matches(/^\d{4}-\d{2}-\d{2}$/)
    .withMessage('Date must be YYYY-MM-DD'),
  body('note')
    .optional()
    .isString()
    .isLength({ max: 300 })
    .withMessage('Note must be a string ≤ 300 chars'),
  body('source')
    .optional()
    .isIn(['manual', 'SMS'])
    .withMessage('Source must be manual or SMS'),
  body('merchant')
    .optional()
    .isString()
    .isLength({ max: 100 })
    .withMessage('Merchant must be a string ≤ 100 chars'),
];

const transactionUpdateRules = [
  param('id').isMongoId().withMessage('Invalid transaction ID'),
  ...transactionCreateRules,
];

const transactionQueryRules = [
  query('platform')
    .optional()
    .isIn(['UPI', 'GPay', 'PhonePe', 'Paytm', 'Card', 'Bank', 'Cash'])
    .withMessage('Invalid platform filter'),
  query('category')
    .optional()
    .isIn(['Food', 'Travel', 'Shopping', 'Education', 'Health', 'Other'])
    .withMessage('Invalid category filter'),
  query('from')
    .optional()
    .matches(/^\d{4}-\d{2}-\d{2}$/)
    .withMessage('from must be YYYY-MM-DD'),
  query('to')
    .optional()
    .matches(/^\d{4}-\d{2}-\d{2}$/)
    .withMessage('to must be YYYY-MM-DD'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 500 })
    .withMessage('limit must be 1–500'),
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('page must be ≥ 1'),
];

module.exports = {
  validate,
  transactionCreateRules,
  transactionUpdateRules,
  transactionQueryRules,
};
