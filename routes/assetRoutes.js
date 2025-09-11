const express = require("express");
const router = express.Router();

const { 
  createAsset, 
  getAllAssets, 
  deleteAsset, 
  markAssetSurplus, 
  updateAsset, 
  getAssetDropdownOptions,
  exportAssets,
  autoUpdateAssetStatus,
  getFilterOptions,
  checkAndUpdateExpiringAssets 
} = require("../controllers/assetController");


router.post("/check-expiring", checkAndUpdateExpiringAssets);
router.get("/filter-options", getFilterOptions);
router.post("/createAsset", createAsset);
router.get("/getAllAssets", getAllAssets);
router.get("/export", exportAssets);  
router.delete('/deleteAsset/:id', deleteAsset);
router.put('/assets/:id/surplus', markAssetSurplus);
router.put('/assets/:id', updateAsset);
router.get("/dropdown-options", getAssetDropdownOptions);

router.post("/auto-update-status", autoUpdateAssetStatus);

module.exports = router;