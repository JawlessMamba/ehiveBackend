const { queryRunner } = require('../helpers/queryRunner');

// Replace your existing createAsset function with this enhanced version

exports.createAsset = async (req, res) => {
  try {
    const {
      asset_id,
      serial_number,
      hardware_type,
      model_number,
      owner_fullname,
      hostname,
      p_number,
      cadre,
      department,
      section,
      building,
      vendor,
      po_number,
      po_date,
      dc_number,
      dc_date,
      assigned_date,
      replacement_due_period,
      replacement_due_date,
      operational_status,
      disposition_status,
    } = req.body;

    // Basic validation for required fields
    if (
      !asset_id ||
      !serial_number ||
      !hardware_type ||
      !owner_fullname ||
      !hostname ||
      !p_number ||
      !cadre ||
      !department ||
      !operational_status ||
      !disposition_status
    ) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // ✅ AUTO-DETERMINE OPERATIONAL STATUS based on replacement_due_date
    let finalOperationalStatus = operational_status;
    
    if (replacement_due_date) {
      const replacementDate = new Date(replacement_due_date);
      const currentDate = new Date();
      const sixMonthsFromNow = new Date();
      sixMonthsFromNow.setMonth(sixMonthsFromNow.getMonth() + 6);

      // If replacement date is within 6 months and asset is not dead/surplus
      if (replacementDate <= sixMonthsFromNow && 
          replacementDate >= currentDate && 
          !['dead', 'surplus'].includes(operational_status.toLowerCase())) {
        finalOperationalStatus = 'expiring soon';
        console.log(`Asset ${asset_id} automatically set to 'expiring soon' due to replacement date: ${replacement_due_date}`);
      }
    }

    const sql = `
      INSERT INTO assets (
        asset_id, serial_number, hardware_type, model_number, owner_fullname, hostname,
        p_number, cadre, department, section, building, vendor,
        po_number, po_date, dc_number, dc_date, assigned_date,
        replacement_due_period, replacement_due_date, operational_status, disposition_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
      asset_id,
      serial_number,
      hardware_type,
      model_number || null,
      owner_fullname,
      hostname,
      p_number,
      cadre,
      department,
      section || null,
      building || null,
      vendor || null,
      po_number || null,
      po_date || null,
      dc_number || null,
      dc_date || null,
      assigned_date || null,
      replacement_due_period || null,
      replacement_due_date || null,
      finalOperationalStatus, // ✅ Use the auto-determined status
      disposition_status,
    ];

    const [result] = await queryRunner(sql, values);

    return res.status(201).json({
      message: "Asset created successfully",
      asset_db_id: result.insertId,
      auto_status_applied: finalOperationalStatus !== operational_status,
      final_operational_status: finalOperationalStatus
    });

  } catch (error) {
    console.error("Error creating asset:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

// ✅ OPTIMIZED: Enhanced getAllAssets with PROPER server-side filtering and pagination
exports.getAllAssets = async (req, res) => {
  try {
     try {
      await exports.checkAndUpdateExpiringAssets();
    } catch (updateError) {
      console.warn("Warning: Could not update expiring assets:", updateError.message);
      // Continue with the main function even if update fails
    }

    const { 
      page = 1, 
      limit = 20, 
      search = '', 
      department = '',
      hardware_type = '',
      cadre = '',
      building = '',
      section = '',
      operational_status = '',
      disposition_status = '',
      po_date_from = '',
      po_date_to = '',
      assigned_date_from = '',
      assigned_date_to = '',
      dc_date_from = '',
      dc_date_to = '',
      noLimit = false 
    } = req.query;

    // ✅ Build WHERE conditions dynamically
    let whereConditions = [];
    let params = [];

    // Search filter
    if (search) {
      whereConditions.push(`(
        serial_number LIKE ? OR 
        asset_id LIKE ? OR 
        hostname LIKE ? OR 
        owner_fullname LIKE ? OR 
        model_number LIKE ? OR 
        p_number LIKE ? OR 
        dc_number LIKE ? OR 
        vendor LIKE ?
      )`);
      const searchParam = `%${search}%`;
      params.push(searchParam, searchParam, searchParam, searchParam, searchParam, searchParam, searchParam, searchParam);
    }

    // Exact match filters
    if (department) {
      whereConditions.push('department = ?');
      params.push(department);
    }
    if (hardware_type) {
      whereConditions.push('hardware_type = ?');
      params.push(hardware_type);
    }
    if (cadre) {
      whereConditions.push('cadre = ?');
      params.push(cadre);
    }
    if (building) {
      whereConditions.push('building = ?');
      params.push(building);
    }
    if (section) {
      whereConditions.push('section = ?');
      params.push(section);
    }
    if (operational_status) {
      whereConditions.push('operational_status = ?');
      params.push(operational_status);
    }
    if (disposition_status) {
      whereConditions.push('disposition_status = ?');
      params.push(disposition_status);
    }

    // Date range filters
    if (po_date_from) {
      whereConditions.push('po_date >= ?');
      params.push(po_date_from);
    }
    if (po_date_to) {
      whereConditions.push('po_date <= ?');
      params.push(po_date_to);
    }
    if (assigned_date_from) {
      whereConditions.push('assigned_date >= ?');
      params.push(assigned_date_from);
    }
    if (assigned_date_to) {
      whereConditions.push('assigned_date <= ?');
      params.push(assigned_date_to);
    }
    if (dc_date_from) {
      whereConditions.push('dc_date >= ?');
      params.push(dc_date_from);
    }
    if (dc_date_to) {
      whereConditions.push('dc_date <= ?');
      params.push(dc_date_to);
    }

    // ✅ Build the main query
    let sql = `
      SELECT
        id, asset_id, serial_number, hardware_type, model_number, owner_fullname, hostname,
        p_number, cadre, department, section, building, vendor,
        po_number, po_date, dc_number, dc_date, assigned_date,
        replacement_due_period, replacement_due_date, operational_status, disposition_status
      FROM assets
    `;

    // Add WHERE clause if we have conditions
    if (whereConditions.length > 0) {
      sql += ` WHERE ${whereConditions.join(' AND ')}`;
    }

    // Add ORDER BY
    sql += ` ORDER BY id DESC`;

    // ✅ Clone params for count query
    const countParams = [...params];

    // Add pagination if not disabled
    if (noLimit !== 'true' && noLimit !== true) {
      const offset = (page - 1) * limit;
      sql += ` LIMIT ? OFFSET ?`;
      params.push(Number(limit), Number(offset));
    }

    console.log('Executing SQL:', sql);
    console.log('With params:', params);

    // ✅ Execute main query
    const [assets] = await queryRunner(sql, params);

    // ✅ Get total count with same filters
    let countSql = `SELECT COUNT(*) AS total FROM assets`;
    if (whereConditions.length > 0) {
      countSql += ` WHERE ${whereConditions.join(' AND ')}`;
    }

    const [countResult] = await queryRunner(countSql, countParams);
    const total = countResult[0].total;

    console.log(`Returning ${assets.length} assets out of ${total} total`);

    return res.status(200).json({
      success: true,
      total,
      page: noLimit === 'true' || noLimit === true ? 1 : Number(page),
      limit: noLimit === 'true' || noLimit === true ? total : Number(limit),
      data: assets,
      fetched: assets.length,
    });

  } catch (error) {
    console.error("Error fetching assets:", error);
    return res.status(500).json({ success: false, error: "Internal Server Error" });
  }
};

exports.deleteAsset = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ error: "Asset ID is required" });
    }

    // Optional: Check if the asset exists
    const [existingAsset] = await queryRunner('SELECT * FROM assets WHERE id = ?', [id]);
    if (existingAsset.length === 0) {
      return res.status(404).json({ error: "Asset not found" });
    }

    // Delete the asset
    await queryRunner('DELETE FROM assets WHERE id = ?', [id]);

    return res.status(200).json({ message: "Asset deleted successfully" });

  } catch (error) {
    console.error("Error deleting asset:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

exports.markAssetSurplus = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ error: "Asset ID is required" });
    }

    // Check if the asset exists
    const existingAsset = await queryRunner('SELECT * FROM assets WHERE id = ?', [id]);
    if (existingAsset.length === 0) {
      return res.status(404).json({ error: "Asset not found" });
    }

    // Update operational_status and disposition_status to 'surplus'
    await queryRunner(
      `UPDATE assets
       SET operational_status = 'surplus',
           disposition_status = 'surplus'
       WHERE id = ?`,
      [id]
    );

    return res.status(200).json({ message: "Asset marked as surplus successfully" });

  } catch (error) {
    console.error("Error marking asset as surplus:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

function formatDateToMySQL(date) {
  if (!date) return null;
  const d = new Date(date);
  return d.toISOString().split("T")[0]; // "YYYY-MM-DD"
}

// Replace your existing updateAsset function with this enhanced version
exports.updateAsset = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ error: "Asset ID is required" });
    }

    const {
      asset_id,
      serial_number,
      hardware_type,
      model_number,
      owner_fullname,
      hostname,
      p_number,
      cadre,
      department,
      section,
      building,
      vendor,
      po_number,
      po_date,
      dc_number,
      dc_date,
      assigned_date,
      replacement_due_period,
      replacement_due_date,
      operational_status,
      disposition_status,
    } = req.body;

    // Optional: Check if asset exists
    const [existingAsset] = await queryRunner('SELECT * FROM assets WHERE id = ?', [id]);
    if (existingAsset.length === 0) {
      return res.status(404).json({ error: "Asset not found" });
    }

    const fields = [];
    const values = [];

    if (asset_id !== undefined) { fields.push("asset_id = ?"); values.push(asset_id); }
    if (serial_number !== undefined) { fields.push("serial_number = ?"); values.push(serial_number); }
    if (hardware_type !== undefined) { fields.push("hardware_type = ?"); values.push(hardware_type); }
    if (model_number !== undefined) { fields.push("model_number = ?"); values.push(model_number); }
    if (owner_fullname !== undefined) { fields.push("owner_fullname = ?"); values.push(owner_fullname); }
    if (hostname !== undefined) { fields.push("hostname = ?"); values.push(hostname); }
    if (p_number !== undefined) { fields.push("p_number = ?"); values.push(p_number); }
    if (cadre !== undefined) { fields.push("cadre = ?"); values.push(cadre); }
    if (department !== undefined) { fields.push("department = ?"); values.push(department); }
    if (section !== undefined) { fields.push("section = ?"); values.push(section); }
    if (building !== undefined) { fields.push("building = ?"); values.push(building); }
    if (vendor !== undefined) { fields.push("vendor = ?"); values.push(vendor); }
    if (po_number !== undefined) { fields.push("po_number = ?"); values.push(po_number); }
    if (po_date !== undefined) { fields.push("po_date = ?"); values.push(formatDateToMySQL(po_date)); }
    if (dc_number !== undefined) { fields.push("dc_number = ?"); values.push(dc_number); }
    if (dc_date !== undefined) { fields.push("dc_date = ?"); values.push(formatDateToMySQL(dc_date)); }
    if (assigned_date !== undefined) { fields.push("assigned_date = ?"); values.push(formatDateToMySQL(assigned_date)); }
    if (replacement_due_period !== undefined) { fields.push("replacement_due_period = ?"); values.push(replacement_due_period); }
    
    // ✅ Handle replacement_due_date with auto-status logic
    if (replacement_due_date !== undefined) { 
      fields.push("replacement_due_date = ?"); 
      values.push(formatDateToMySQL(replacement_due_date)); 
      
      // ✅ AUTO-UPDATE operational_status if replacement_due_date changes
      if (replacement_due_date) {
        const replacementDate = new Date(replacement_due_date);
        const currentDate = new Date();
        const sixMonthsFromNow = new Date();
        sixMonthsFromNow.setMonth(sixMonthsFromNow.getMonth() + 6);
        
        const currentOperationalStatus = operational_status || existingAsset[0].operational_status;
        
        // If replacement date is within 6 months and asset is not dead/surplus
        if (replacementDate <= sixMonthsFromNow && 
            replacementDate >= currentDate && 
            !['dead', 'surplus'].includes(currentOperationalStatus.toLowerCase())) {
          
          // Override operational_status to 'expiring soon'
          if (!operational_status) {
            fields.push("operational_status = ?");
            values.push('expiring soon');
          } else if (operational_status !== 'expiring soon') {
            // Update the operational_status field if it was already in the request
            const statusIndex = fields.findIndex(field => field.includes('operational_status'));
            if (statusIndex !== -1) {
              values[statusIndex] = 'expiring soon';
            } else {
              fields.push("operational_status = ?");
              values.push('expiring soon');
            }
          }
          
          console.log(`Asset ${id} automatically updated to 'expiring soon' due to replacement date: ${replacement_due_date}`);
        }
      }
    }
    
    if (operational_status !== undefined) { 
      // Check if operational_status was already added by replacement_due_date logic
      if (!fields.some(field => field.includes('operational_status'))) {
        fields.push("operational_status = ?"); 
        values.push(operational_status); 
      }
    }
    if (disposition_status !== undefined) { fields.push("disposition_status = ?"); values.push(disposition_status); }

    if (fields.length === 0) {
      return res.status(400).json({ error: "No fields provided to update" });
    }

    const sql = `UPDATE assets SET ${fields.join(", ")} WHERE id = ?`;
    values.push(id);

    await queryRunner(sql, values);

    return res.status(200).json({ 
      message: "Asset updated successfully",
      auto_status_applied: fields.some(field => field.includes('operational_status')) && 
                          values.some(value => value === 'expiring soon')
    });

  } catch (error) {
    console.error("Error updating asset:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

exports.getAssetDropdownOptions = async (req, res) => {
  try {
    console.log("Fetching dropdown options from dedicated tables...");

    // Using your exact table structure with 'name' column
    const [modelNumbers] = await queryRunner('SELECT id, name as value FROM models ORDER BY name', []);
    const [vendors] = await queryRunner('SELECT id, name as value FROM vendors ORDER BY name', []);
    const [operationalStatuses] = await queryRunner('SELECT id, name as value FROM operational_status ORDER BY name', []);
    const [dispositionStatuses] = await queryRunner('SELECT id, name as value FROM disposition_status ORDER BY name', []);

    console.log("Model numbers:", modelNumbers.length);
    console.log("Vendors:", vendors.length);
    console.log("Operational statuses:", operationalStatuses.length);
    console.log("Disposition statuses:", dispositionStatuses.length);

    return res.status(200).json({
      success: true,
      data: {
        model_number: modelNumbers,
        vendor: vendors,
        operational_status: operationalStatuses,
        disposition_status: dispositionStatuses
      }
    });

  } catch (error) {
    console.error("Error fetching asset dropdown options:", error);
    return res.status(500).json({ 
      success: false, 
      error: "Failed to fetch dropdown options",
      details: error.message 
    });
  }
};// ✅ FIXED: Export function with proper error handling and logging
exports.exportAssets = async (req, res) => {
  try {
    console.log('🚀 Export request received with query params:', req.query);
    
    const { 
      search = '', 
      department = '',
      hardware_type = '',
      cadre = '',
      building = '',
      section = '',
      operational_status = '',
      disposition_status = '',
      po_date_from = '',
      po_date_to = '',
      assigned_date_from = '',
      assigned_date_to = '',
      dc_date_from = '',
      dc_date_to = ''
    } = req.query;

    // ✅ Use same filtering logic as getAllAssets
    let whereConditions = [];
    let params = [];

    // Search filter
    if (search) {
      whereConditions.push(`(
        serial_number LIKE ? OR 
        asset_id LIKE ? OR 
        hostname LIKE ? OR 
        owner_fullname LIKE ? OR 
        model_number LIKE ? OR 
        p_number LIKE ? OR 
        dc_number LIKE ? OR 
        vendor LIKE ?
      )`);
      const searchParam = `%${search}%`;
      params.push(searchParam, searchParam, searchParam, searchParam, searchParam, searchParam, searchParam, searchParam);
    }

    // Exact match filters
    if (department) { whereConditions.push('department = ?'); params.push(department); }
    if (hardware_type) { whereConditions.push('hardware_type = ?'); params.push(hardware_type); }
    if (cadre) { whereConditions.push('cadre = ?'); params.push(cadre); }
    if (building) { whereConditions.push('building = ?'); params.push(building); }
    if (section) { whereConditions.push('section = ?'); params.push(section); }
    if (operational_status) { whereConditions.push('operational_status = ?'); params.push(operational_status); }
    if (disposition_status) { whereConditions.push('disposition_status = ?'); params.push(disposition_status); }

    // Date range filters
    if (po_date_from) { whereConditions.push('po_date >= ?'); params.push(po_date_from); }
    if (po_date_to) { whereConditions.push('po_date <= ?'); params.push(po_date_to); }
    if (assigned_date_from) { whereConditions.push('assigned_date >= ?'); params.push(assigned_date_from); }
    if (assigned_date_to) { whereConditions.push('assigned_date <= ?'); params.push(assigned_date_to); }
    if (dc_date_from) { whereConditions.push('dc_date >= ?'); params.push(dc_date_from); }
    if (dc_date_to) { whereConditions.push('dc_date <= ?'); params.push(dc_date_to); }

    // ✅ Build the query with ALL columns for export (matching exact database schema)
    let sql = `
      SELECT
        id, asset_id, serial_number, hardware_type, model_number, owner_fullname, hostname,
        p_number, cadre, department, section, building, vendor,
        po_number, po_date, dc_number, dc_date, assigned_date,
        replacement_due_period, replacement_due_date, operational_status, disposition_status
      FROM assets
    `;

    if (whereConditions.length > 0) {
      sql += ` WHERE ${whereConditions.join(' AND ')}`;
    }

    sql += ` ORDER BY id DESC`;

    console.log('📊 Export SQL:', sql);
    console.log('📊 Export params:', params);

    const [assets] = await queryRunner(sql, params);

    console.log(`✅ Export successful: ${assets.length} assets found`);

    return res.status(200).json({
      success: true,
      data: assets,
      total: assets.length,
      message: `Successfully exported ${assets.length} assets`,
      filters_applied: {
        search,
        department,
        hardware_type,
        cadre,
        building,
        section,
        operational_status,
        disposition_status,
        date_filters: {
          po_date_from,
          po_date_to,
          assigned_date_from,
          assigned_date_to,
          dc_date_from,
          dc_date_to
        }
      }
    });

  } catch (error) {
    console.error("❌ Export error:", error);
    return res.status(500).json({ 
      success: false, 
      error: "Failed to export assets",
      message: error.message 
    });
  }
};

/**
 * Auto-update assets based on replacement due date
 * Sets operational_status to 'expiring soon' if replacement_due_date is within 6 months
 */
exports.autoUpdateAssetStatus = async (req, res) => {
  try {
    // Calculate date 6 months from now
    const sixMonthsFromNow = new Date();
    sixMonthsFromNow.setMonth(sixMonthsFromNow.getMonth() + 6);
    const sixMonthsDate = sixMonthsFromNow.toISOString().split('T')[0]; // YYYY-MM-DD format

    // Get current date
    const currentDate = new Date().toISOString().split('T')[0];

    console.log(`Auto-updating assets with replacement_due_date between ${currentDate} and ${sixMonthsDate}`);

    // Update assets that:
    // 1. Have replacement_due_date within next 6 months
    // 2. Are not already marked as 'expiring soon' or 'surplus'
    // 3. Have a valid replacement_due_date
    const updateSql = `
      UPDATE assets 
      SET operational_status = 'expiring soon'
      WHERE replacement_due_date IS NOT NULL 
        AND replacement_due_date != ''
        AND replacement_due_date <= ?
        AND replacement_due_date >= ?
        AND operational_status NOT IN ('expiring soon', 'surplus', 'dead')
    `;

    const [result] = await queryRunner(updateSql, [sixMonthsDate, currentDate]);

    console.log(`Auto-updated ${result.affectedRows} assets to 'expiring soon' status`);

    // If this is called as an API endpoint, return response
    if (res) {
      return res.status(200).json({
        success: true,
        message: `Updated ${result.affectedRows} assets to 'expiring soon' status`,
        affectedRows: result.affectedRows
      });
    }

    // If called internally, return the result
    return {
      success: true,
      affectedRows: result.affectedRows
    };

  } catch (error) {
    console.error("Error in auto-updating asset status:", error);
    if (res) {
      return res.status(500).json({ 
        success: false, 
        error: "Failed to auto-update asset status",
        details: error.message 
      });
    }
    throw error;
  }
};


exports.getFilterOptions = async (req, res) => {
  try {
    console.log("Fetching filter options from database...");

    // Get all unique values from the database for filters
    const [departments] = await queryRunner('SELECT DISTINCT department FROM assets WHERE department IS NOT NULL AND department != "" ORDER BY department', []);
    const [hardwareTypes] = await queryRunner('SELECT DISTINCT hardware_type FROM assets WHERE hardware_type IS NOT NULL AND hardware_type != "" ORDER BY hardware_type', []);
    const [cadres] = await queryRunner('SELECT DISTINCT cadre FROM assets WHERE cadre IS NOT NULL AND cadre != "" ORDER BY cadre', []);
    const [buildings] = await queryRunner('SELECT DISTINCT building FROM assets WHERE building IS NOT NULL AND building != "" ORDER BY building', []);
    const [sections] = await queryRunner('SELECT DISTINCT section FROM assets WHERE section IS NOT NULL AND section != "" ORDER BY section', []);
    const [operationalStatuses] = await queryRunner('SELECT DISTINCT operational_status FROM assets WHERE operational_status IS NOT NULL AND operational_status != "" ORDER BY operational_status', []);
    const [dispositionStatuses] = await queryRunner('SELECT DISTINCT disposition_status FROM assets WHERE disposition_status IS NOT NULL AND disposition_status != "" ORDER BY disposition_status', []);

    console.log("Filter options fetched successfully");

    return res.status(200).json({
      success: true,
      data: {
        departments: departments.map(d => d.department),
        hardware_types: hardwareTypes.map(h => h.hardware_type),
        cadres: cadres.map(c => c.cadre),
        buildings: buildings.map(b => b.building),
        sections: sections.map(s => s.section),
        operational_statuses: operationalStatuses.map(o => o.operational_status),
        disposition_statuses: dispositionStatuses.map(d => d.disposition_status)
      }
    });

  } catch (error) {
    console.error("Error fetching filter options:", error);
    return res.status(500).json({ 
      success: false, 
      error: "Failed to fetch filter options",
      details: error.message 
    });
  }
};

/**
 * Check and update assets that are nearing replacement due date (6 months)
 * This can be called manually or triggered when fetching assets
 */
exports.checkAndUpdateExpiringAssets = async (req, res) => {
  try {
    // Calculate date 6 months from now
    const sixMonthsFromNow = new Date();
    sixMonthsFromNow.setMonth(sixMonthsFromNow.getMonth() + 6);
    const sixMonthsDate = sixMonthsFromNow.toISOString().split('T')[0];

    // Get current date
    const currentDate = new Date().toISOString().split('T')[0];

    console.log(`Checking assets with replacement_due_date between ${currentDate} and ${sixMonthsDate}`);

    // Update assets that:
    // 1. Have replacement_due_date within next 6 months
    // 2. Are not already 'expiring soon', 'surplus', or 'dead'
    // 3. Have a valid replacement_due_date
    const updateSQL = `
      UPDATE assets 
      SET operational_status = 'expiring soon'
      WHERE replacement_due_date IS NOT NULL 
        AND replacement_due_date != ''
        AND replacement_due_date <= ?
        AND replacement_due_date >= ?
        AND operational_status NOT IN ('expiring soon', 'surplus', 'dead')
    `;

    const [result] = await queryRunner(updateSQL, [sixMonthsDate, currentDate]);

    console.log(`Updated ${result.affectedRows} assets to 'expiring soon' status`);

    // If called as API endpoint, return response
    if (res) {
      return res.status(200).json({
        success: true,
        message: `Updated ${result.affectedRows} assets to 'expiring soon' status`,
        affectedRows: result.affectedRows,
        checkDate: currentDate,
        expiryThreshold: sixMonthsDate
      });
    }

    // Return result for internal calls
    return {
      success: true,
      affectedRows: result.affectedRows
    };

  } catch (error) {
    console.error("Error checking expiring assets:", error);
    if (res) {
      return res.status(500).json({ 
        success: false, 
        error: "Failed to check expiring assets",
        details: error.message 
      });
    }
    throw error;
  }
};