const express = require('express');
const router = express.Router();

// Controller import
const assetTransferController = require('../controllers/assetTransferController');
// Import the authentication middleware
const { authenticate } = require('../middleware/authenticate');

// Create a new asset transfer (requires authentication to get user info)
router.post('/create-transfer-asset', authenticate, assetTransferController.createTransfer);

// Get all transfers with pagination & search
router.get('/get-all-transfer-assets', assetTransferController.getAllTransfers);

// Get transfer history for a specific asset (with pagination)
router.get('/asset-history/:asset_id', assetTransferController.getAssetTransferHistory);

// Get specific transfer details by ID
router.get('/transfer/:transfer_id', assetTransferController.getTransferById);

module.exports = router;