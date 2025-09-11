const { queryRunner } = require('../helpers/queryRunner');

const categoryMap = {
  hardware_type: { table: 'hardware_type', idCol: 'type_id', valueCol: 'type_name' },
  department: { table: 'department', idCol: 'id', valueCol: 'name' },
  building: { table: 'building', idCol: 'id', valueCol: 'name' },
  section: { table: 'sections', idCol: 'id', valueCol: 'name' },
  model: { table: 'models', idCol: 'id', valueCol: 'name' },
  vendor: { table: 'vendors', idCol: 'id', valueCol: 'name' },
  cadre: { table: 'cadres', idCol: 'id', valueCol: 'name' },
  disposition_status	: { table: 'disposition_status', idCol: 'id', valueCol: 'name' },
  operational_status	: { table: 'operational_status', idCol: 'id', valueCol: 'name' },
};

exports.getCategories = async (req, res) => {
  const category = req.params.category;
  const config = categoryMap[category];

  if (!config) return res.status(400).json({ error: 'Invalid category' });

  try {
    const [rows] = await queryRunner(
      `SELECT ${config.idCol} as id, ${config.valueCol} as value FROM ${config.table} ORDER BY ${config.valueCol} ASC`
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
      res.status(500).json({ error: err.message || 'Database error' });

  }
};

exports.addCategory = async (req, res) => {
  const category = req.params.category;
  const { value } = req.body;
  const config = categoryMap[category];

  if (!config) return res.status(400).json({ error: 'Invalid category' });
  // if (!value || value.trim().length < 2) return res.status(400).json({ error: 'Invalid value' });

  try {
    const [existing] = await queryRunner(
      `SELECT 1 FROM ${config.table} WHERE LOWER(${config.valueCol}) = LOWER(?) LIMIT 1`,
      [value.trim()]
    );

    if (existing.length > 0) {
      return res.status(409).json({ error: 'Category already exists' });
    }

    const [result] = await queryRunner(
      `INSERT INTO ${config.table} (${config.valueCol}) VALUES (?)`,
      [value.trim()]
    );

    res.status(201).json({ id: result.insertId, value: value.trim() });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
};

exports.deleteCategory = async (req, res) => {
  const category = req.params.category;
  const id = req.params.id;
  const config = categoryMap[category];

  if (!config) return res.status(400).json({ error: 'Invalid category' });

  try {
    const [result] = await queryRunner(
      `DELETE FROM ${config.table} WHERE ${config.idCol} = ?`,
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Category not found' });
    }

    res.json({ message: 'Category deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
};
