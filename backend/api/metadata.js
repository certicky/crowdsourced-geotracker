const {
  supportedTypes,
  dbUser,
  dbName,
  dbPassword,
  dbPort,
  dbHost,
} = require('../settings')
const { Pool } = require('pg')

const pool = new Pool({
  user: dbUser,
  database: dbName,
  password: dbPassword,
  port: dbPort,
  host: dbHost
})

// (GET) Returns all the meta data / settings that might be required by frontends.
// Example: http://localhost:3000/metadata
const getMetadata = async (request, response) => {
  const returnedData = {
    supportedTypes: supportedTypes
  }

  const query = `
    WITH timestamps AS (
      SELECT hour FROM generate_series ((NOW() - INTERVAL '14 days'), NOW(), '1 hour'::interval) hour
    )
    SELECT
      hour,
      COUNT(*) AS valid_reports
    FROM reports, timestamps
    WHERE
      valid_from <= hour AND valid_until >= hour
    GROUP BY hour
    ORDER BY hour ASC
  `
  await pool.query(query, (error, results) => {
    if (error) {
      throw error
    }
    if (response) {
      returnedData.validReportsInTime = results.rows
    }
    response.status(200).json(returnedData)
  })
}

module.exports = {
  getMetadata
}
