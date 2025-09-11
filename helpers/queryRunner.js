const { createPool } = require("../config/connection")

exports.queryRunner= async(query,data)=>{
    if (!data) {
        data = [];
    }
    const connection = await createPool();
    try {

        return await connection.execute(query,data);
        // console.log("####### query runner end #######")
    } catch (error) {
        console.error('Query Error:', error);
        throw error;
    }
}

exports.transactionRunner = async (queries) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const results = [];

    for (const { query, values } of queries) {
      const [rows] = await conn.execute(query, values);
      results.push(rows);
    }

    await conn.commit();
    return results;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
};

