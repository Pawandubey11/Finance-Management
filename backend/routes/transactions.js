const express = require('express');
const router  = express.Router();

const {
  createTransaction,
  getTransactions,
  getTransactionById,
  updateTransaction,
  deleteTransaction,
  bulkCreateTransactions,
} = require('../controllers/transactionController');

const {
  validate,
  transactionCreateRules,
  transactionUpdateRules,
  transactionQueryRules,
} = require('../middleware/validators');

// ── Collection routes ──────────────────────────────────────────
router
  .route('/')
  .get(transactionQueryRules, validate, getTransactions)
  .post(transactionCreateRules, validate, createTransaction);

// ── Bulk insert (SMS parser) ───────────────────────────────────
router.post('/bulk', bulkCreateTransactions);

// ── Item routes ────────────────────────────────────────────────
router
  .route('/:id')
  .get(getTransactionById)
  .put(transactionUpdateRules, validate, updateTransaction)
  .delete(deleteTransaction);

module.exports = router;
