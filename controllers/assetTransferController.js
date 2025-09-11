const { queryRunner } = require('../helpers/queryRunner');

/**
 * Create a new asset transfer with proper user tracking
 */
exports.createTransfer = async (req, res) => {
  try {
    const {
      asset_id,
      new_owner_fullname,
      new_hostname,
      new_p_number,
      new_cadre,
      new_department,
      new_section,
      new_building,
      transfer_reason
    } = req.body;

    console.log('Received transfer request:', req.body);
    console.log('Authenticated user:', req.user); // Add this for debugging

    // Validate required fields
    if (!asset_id || !new_owner_fullname || !new_cadre || !new_department) {
      return res.status(400).json({ 
        success: false,
        error: "Missing required fields. asset_id, new_owner_fullname, new_cadre, and new_department are required." 
      });
    }

    // Get the user ID from the JWT token (set by authenticate middleware)
    const transferred_by_user_id = req.user.id;

    // Fetch current asset details
    const [assetRows] = await queryRunner("SELECT * FROM assets WHERE id = ?", [asset_id]);
    if (assetRows.length === 0) {
      return res.status(404).json({ 
        success: false,
        error: "Asset not found" 
      });
    }

    const existingAsset = assetRows[0];

    // Get user details from the authenticated user
    const [userRows] = await queryRunner("SELECT id, name, email, role FROM user WHERE id = ?", [transferred_by_user_id]);
    let transferredByUser = null;
    if (userRows.length > 0) {
      transferredByUser = userRows[0];
    }

    // Insert into asset_transfers with user ID
    const insertSQL = `
      INSERT INTO asset_transfers
        (asset_id, asset_serial_number, previous_owner_fullname, previous_hostname, previous_p_number, 
         previous_cadre, previous_department, previous_section, previous_building,
         new_owner_fullname, new_hostname, new_p_number, new_cadre, 
         new_department, new_section, new_building, transfer_reason, 
         transferred_by, transferred_by_user_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    const insertValues = [
      asset_id,
      existingAsset.serial_number,
      existingAsset.owner_fullname || null,
      existingAsset.hostname || null,
      existingAsset.p_number || null,
      existingAsset.cadre || null,
      existingAsset.department || null,
      existingAsset.section || null,
      existingAsset.building || null,
      new_owner_fullname.trim(),
      new_hostname?.trim() || null,
      new_p_number?.trim() || null,
      new_cadre.trim(),
      new_department.trim(),
      new_section?.trim() || null,
      new_building?.trim() || null,
      transfer_reason?.trim() || null,
      transferredByUser ? transferredByUser.email : req.user.email, // Use authenticated user's email
      transferred_by_user_id
    ];

    const insertResult = await queryRunner(insertSQL, insertValues);

    // Update the current asset in assets table
    const updateSQL = `
      UPDATE assets
      SET owner_fullname = ?, 
          hostname = ?, 
          p_number = ?, 
          cadre = ?, 
          department = ?, 
          section = ?, 
          building = ?
      WHERE id = ?
    `;
    
    const updateValues = [
      new_owner_fullname.trim(),
      new_hostname?.trim() || existingAsset.hostname,
      new_p_number?.trim() || existingAsset.p_number,
      new_cadre.trim(),
      new_department.trim(),
      new_section?.trim() || existingAsset.section,
      new_building?.trim() || existingAsset.building,
      asset_id
    ];

    await queryRunner(updateSQL, updateValues);

    return res.status(201).json({ 
      success: true,
      message: "Asset transfer recorded successfully",
      data: {
        asset_id: asset_id,
        asset_serial_number: existingAsset.serial_number,
        new_owner_fullname: new_owner_fullname.trim(),
        transferred_by_email: transferredByUser ? transferredByUser.email : req.user.email
      }
    });

  } catch (error) {
    console.error("Error creating transfer:", error);
    return res.status(500).json({ 
      success: false,
      error: "Internal Server Error. Please try again later.",
      details: error.message 
    });
  }
};

/**
 * Get all asset transfers with proper user email display and pagination
 */
exports.getAllTransfers = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 50, // Changed from 20 to 50
      search = '', 
      asset_id = '',
      sort_key = 'transfer_date',
      sort_direction = 'DESC'
    } = req.query;
    
    const offset = (page - 1) * limit;
    const params = [];

    // Optimized SQL with proper user email joining
    let sql = `
      SELECT 
        at.id,
        at.asset_id,
        at.asset_serial_number,
        at.previous_owner_fullname,
        at.previous_hostname,
        at.previous_p_number,
        at.previous_cadre,
        at.previous_department,
        at.previous_section,
        at.previous_building,
        at.new_owner_fullname,
        at.new_hostname,
        at.new_p_number,
        at.new_cadre,
        at.new_department,
        at.new_section,
        at.new_building,
        at.transfer_reason,
        at.transfer_date,
        at.transferred_by,
        at.transferred_by_user_id,
        a.asset_id as asset_identifier,
        a.hardware_type,
        a.model_number,
        a.vendor,
        u.email as transferred_by_user_email,
        u.name as transferred_by_user_name,
        u.role as transferred_by_user_role
      FROM asset_transfers at
      LEFT JOIN assets a ON at.asset_id = a.id
      LEFT JOIN user u ON at.transferred_by_user_id = u.id
      WHERE 1=1
    `;

    // Search conditions
    if (search && search.trim()) {
      const searchTerm = `%${search.trim()}%`;
      sql += `
        AND (
          at.asset_serial_number LIKE ? OR
          at.new_owner_fullname LIKE ? OR 
          at.previous_owner_fullname LIKE ? OR
          a.hardware_type LIKE ? OR
          at.transfer_reason LIKE ? OR
          a.asset_id LIKE ? OR
          at.new_department LIKE ? OR
          at.previous_department LIKE ? OR
          u.email LIKE ?
        )
      `;
      for (let i = 0; i < 9; i++) {
        params.push(searchTerm);
      }
    }

    // Asset ID filter
    if (asset_id) {
      sql += ` AND at.asset_id = ?`;
      params.push(asset_id);
    }

    // Validate and apply sorting
    const validSortKeys = [
      'transfer_date', 'asset_serial_number', 'hardware_type', 
      'previous_owner_fullname', 'new_owner_fullname', 'transfer_reason',
      'transferred_by_user_email', 'new_department', 'previous_department'
    ];
    
    const sortKey = validSortKeys.includes(sort_key) ? sort_key : 'transfer_date';
    const sortDir = sort_direction.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    
    let actualSortKey = sortKey;
    if (sortKey === 'transferred_by_user_email') {
      actualSortKey = 'u.email';
    }
    
    sql += ` ORDER BY ${actualSortKey} ${sortDir} LIMIT ? OFFSET ?`;
    params.push(Number(limit), Number(offset));

    const [transfers] = await queryRunner(sql, params);

    // Get total count
    let countSQL = `
      SELECT COUNT(DISTINCT at.id) AS total 
      FROM asset_transfers at
      LEFT JOIN assets a ON at.asset_id = a.id
      LEFT JOIN user u ON at.transferred_by_user_id = u.id
      WHERE 1=1
    `;
    
    const countParams = [];
    
    if (search && search.trim()) {
      const searchTerm = `%${search.trim()}%`;
      countSQL += `
        AND (
          at.asset_serial_number LIKE ? OR
          at.new_owner_fullname LIKE ? OR 
          at.previous_owner_fullname LIKE ? OR
          a.hardware_type LIKE ? OR
          at.transfer_reason LIKE ? OR
          a.asset_id LIKE ? OR
          at.new_department LIKE ? OR
          at.previous_department LIKE ? OR
          u.email LIKE ?
        )
      `;
      for (let i = 0; i < 9; i++) {
        countParams.push(searchTerm);
      }
    }

    if (asset_id) {
      countSQL += ` AND at.asset_id = ?`;
      countParams.push(asset_id);
    }

    const [countResult] = await queryRunner(countSQL, countParams);
    const total = countResult[0].total;

    // Transform data
    const transformedTransfers = transfers.map(transfer => ({
      id: transfer.id,
      asset_id: transfer.asset_id,
      asset_serial_number: transfer.asset_serial_number,
      asset_identifier: transfer.asset_identifier,
      hardware_type: transfer.hardware_type,
      model_number: transfer.model_number,
      vendor: transfer.vendor,
      previous_owner_fullname: transfer.previous_owner_fullname,
      previous_hostname: transfer.previous_hostname,
      previous_p_number: transfer.previous_p_number,
      previous_cadre: transfer.previous_cadre,
      previous_department: transfer.previous_department,
      previous_section: transfer.previous_section,
      previous_building: transfer.previous_building,
      new_owner_fullname: transfer.new_owner_fullname,
      new_hostname: transfer.new_hostname,
      new_p_number: transfer.new_p_number,
      new_cadre: transfer.new_cadre,
      new_department: transfer.new_department,
      new_section: transfer.new_section,
      new_building: transfer.new_building,
      transfer_reason: transfer.transfer_reason,
      transfer_date: transfer.transfer_date,
      transferred_by: transfer.transferred_by,
      transferred_by_user_id: transfer.transferred_by_user_id,
      transferred_by_user_email: transfer.transferred_by_user_email || 'system@company.com',
      transferred_by_user_name: transfer.transferred_by_user_name || 'System',
      transferred_by_user_role: transfer.transferred_by_user_role || 'system'
    }));

    return res.status(200).json({
      success: true,
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / limit),
      data: transformedTransfers
    });

  } catch (error) {
    console.error("Error fetching transfers:", error);
    return res.status(500).json({ 
      success: false, 
      error: "Internal Server Error",
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get transfer history for a specific asset with pagination
 */
exports.getAssetTransferHistory = async (req, res) => {
  try {
    const { asset_id } = req.params;
    const { 
      page = 1, 
      limit = 50, // Changed from 10 to 50
      sort_key = 'transfer_date',
      sort_direction = 'DESC'
    } = req.query;

    if (!asset_id) {
      return res.status(400).json({
        success: false,
        error: "Asset ID is required"
      });
    }

    const offset = (page - 1) * limit;

    // Validate sorting
    const validSortKeys = ['transfer_date', 'new_owner_fullname', 'transfer_reason'];
    const sortKey = validSortKeys.includes(sort_key) ? sort_key : 'transfer_date';
    const sortDir = sort_direction.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const sql = `
      SELECT 
        at.*,
        a.asset_id as asset_identifier,
        a.serial_number,
        a.hardware_type,
        a.model_number,
        u.email as transferred_by_user_email,
        u.name as transferred_by_user_name,
        u.role as transferred_by_user_role
      FROM asset_transfers AS at
      LEFT JOIN assets AS a ON at.asset_id = a.id
      LEFT JOIN user AS u ON at.transferred_by_user_id = u.id
      WHERE at.asset_id = ?
      ORDER BY at.${sortKey} ${sortDir}
      LIMIT ? OFFSET ?
    `;

    const [transfers] = await queryRunner(sql, [asset_id, Number(limit), Number(offset)]);

    // Get total count for this asset
    const [countResult] = await queryRunner(
      "SELECT COUNT(*) as total FROM asset_transfers WHERE asset_id = ?", 
      [asset_id]
    );
    const total = countResult[0].total;

    const transformedTransfers = transfers.map(transfer => ({
      id: transfer.id,
      asset_id: transfer.asset_id,
      asset_serial_number: transfer.asset_serial_number || transfer.serial_number,
      asset_identifier: transfer.asset_identifier,
      hardware_type: transfer.hardware_type,
      model_number: transfer.model_number,
      previous_owner_fullname: transfer.previous_owner_fullname,
      previous_hostname: transfer.previous_hostname,
      previous_p_number: transfer.previous_p_number,
      previous_cadre: transfer.previous_cadre,
      previous_department: transfer.previous_department,
      previous_section: transfer.previous_section,
      previous_building: transfer.previous_building,
      new_owner_fullname: transfer.new_owner_fullname,
      new_hostname: transfer.new_hostname,
      new_p_number: transfer.new_p_number,
      new_cadre: transfer.new_cadre,
      new_department: transfer.new_department,
      new_section: transfer.new_section,
      new_building: transfer.new_building,
      transfer_reason: transfer.transfer_reason,
      transfer_date: transfer.transfer_date,
      transferred_by: transfer.transferred_by,
      transferred_by_user_id: transfer.transferred_by_user_id,
      transferred_by_user_email: transfer.transferred_by_user_email || 'system@company.com',
      transferred_by_user_name: transfer.transferred_by_user_name || 'System',
      transferred_by_user_role: transfer.transferred_by_user_role || 'system'
    }));

    return res.status(200).json({
      success: true,
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / limit),
      data: transformedTransfers
    });

  } catch (error) {
    console.error("Error fetching asset transfer history:", error);
    return res.status(500).json({
      success: false,
      error: "Internal Server Error"
    });
  }
};

/**
 * Get transfer details by ID
 */
exports.getTransferById = async (req, res) => {
  try {
    const { transfer_id } = req.params;

    if (!transfer_id) {
      return res.status(400).json({
        success: false,
        error: "Transfer ID is required"
      });
    }

    const sql = `
      SELECT 
        at.*,
        a.asset_id as asset_identifier,
        a.serial_number,
        a.hardware_type,
        a.model_number,
        a.vendor,
        u.email as transferred_by_user_email,
        u.name as transferred_by_user_name,
        u.role as transferred_by_user_role
      FROM asset_transfers AS at
      LEFT JOIN assets AS a ON at.asset_id = a.id
      LEFT JOIN user AS u ON at.transferred_by_user_id = u.id
      WHERE at.id = ?
    `;

    const [transfers] = await queryRunner(sql, [transfer_id]);

    if (transfers.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Transfer record not found"
      });
    }

    const transfer = transfers[0];
    const transformedTransfer = {
      id: transfer.id,
      asset_id: transfer.asset_id,
      asset_serial_number: transfer.asset_serial_number || transfer.serial_number,
      asset_identifier: transfer.asset_identifier,
      hardware_type: transfer.hardware_type,
      model_number: transfer.model_number,
      vendor: transfer.vendor,
      previous_owner_fullname: transfer.previous_owner_fullname,
      previous_hostname: transfer.previous_hostname,
      previous_p_number: transfer.previous_p_number,
      previous_cadre: transfer.previous_cadre,
      previous_department: transfer.previous_department,
      previous_section: transfer.previous_section,
      previous_building: transfer.previous_building,
      new_owner_fullname: transfer.new_owner_fullname,
      new_hostname: transfer.new_hostname,
      new_p_number: transfer.new_p_number,
      new_cadre: transfer.new_cadre,
      new_department: transfer.new_department,
      new_section: transfer.new_section,
      new_building: transfer.new_building,
      transfer_reason: transfer.transfer_reason,
      transfer_date: transfer.transfer_date,
      transferred_by: transfer.transferred_by,
      transferred_by_user_id: transfer.transferred_by_user_id,
      transferred_by_user_email: transfer.transferred_by_user_email || 'system@company.com',
      transferred_by_user_name: transfer.transferred_by_user_name || 'System',
      transferred_by_user_role: transfer.transferred_by_user_role || 'system'
    };

    return res.status(200).json({
      success: true,
      data: transformedTransfer
    });

  } catch (error) {
    console.error("Error fetching transfer details:", error);
    return res.status(500).json({
      success: false,
      error: "Internal Server Error"
    });
  }
};