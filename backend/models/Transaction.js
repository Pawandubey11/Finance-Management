const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema(
  {
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [0.01, 'Amount must be greater than 0'],
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      enum: {
        values: ['Food', 'Travel', 'Shopping', 'Education', 'Health', 'Other'],
        message: '{VALUE} is not a valid category',
      },
      default: 'Other',
    },
    platform: {
      type: String,
      required: [true, 'Platform is required'],
      enum: {
        values: ['UPI', 'GPay', 'PhonePe', 'Paytm', 'Card', 'Bank', 'Cash'],
        message: '{VALUE} is not a valid platform',
      },
    },
    // 'type' field kept for SMS-based auto-detection compatibility
    type: {
      type: String,
      enum: ['UPI', 'Card', 'Cash'],
      default: null,
    },
    source: {
      type: String,
      enum: ['manual', 'SMS'],
      default: 'manual',
    },
    merchant: {
      type: String,
      trim: true,
      default: null,
    },
    note: {
      type: String,
      trim: true,
      maxlength: [300, 'Note cannot exceed 300 characters'],
      default: '',
    },
    date: {
      type: String, // stored as YYYY-MM-DD for easy filtering
      required: [true, 'Date is required'],
      match: [/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'],
    },
    ts: {
      type: Number, // unix timestamp ms — used for intra-day sort
      default: () => Date.now(),
    },
  },
  {
    timestamps: true, // adds createdAt / updatedAt
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Index for fast date-range and platform queries
transactionSchema.index({ date: -1 });
transactionSchema.index({ platform: 1 });
transactionSchema.index({ category: 1 });

module.exports = mongoose.model('Transaction', transactionSchema);
