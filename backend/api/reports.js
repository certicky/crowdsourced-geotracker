const {
  dbUser,
  dbName,
  dbPassword,
  dbPort,
  dbHost,
  supportedTypes
} = require('../settings')

const { Pool } = require('pg')

const pool = new Pool({
  user: dbUser,
  database: dbName,
  password: dbPassword,
  port: dbPort,
  host: dbHost
})

// (GET) Returns all the reports from the specified bounding box.
// Example: http://localhost:3000/reports?latmin=46.278977050642126&lonmin=25.19668223803358&latmax=51.515386508021386&lonmax=41.30651925297246
const getReportsInBoundingBox = (request, response) => {
  pool.query('SELECT * FROM reports WHERE reports.location && ST_MakeEnvelope(' + request.query.lonmin + ', ' + request.query.latmin + ', ' + request.query.lonmax + ', ' + request.query.latmax + ', 4326)', (error, results) => {
    if (error) {
      console.log(error)
      throw error
    }
    response.status(200).json(results.rows)
  })
}

// (POST) Adds a new report to DB.
// Example: http://localhost:3000/reports   ---   lat: 49.71422916693619, lon: 26.66829512680357, type: AIRCRAFT
const createReport = (request, response) => {
  const { lat, lon, type } = request.body
  if (!lon || lon.toString() !== parseFloat(lon).toString()) throw new Error('Incorrect input: lon')
  if (!lat || lat.toString() !== parseFloat(lat).toString()) throw new Error('Incorrect input: lat')
  if (!type || !supportedTypes.includes(type)) throw new Error('Incorrect input: type. Supported: ' + supportedTypes.toString())

  pool.query('INSERT INTO reports (location, type, time) VALUES (CAST( ST_SetSRID(ST_Point( ' + parseFloat(lon) + ', ' + parseFloat(lat) + '), 4326) AS geography), $1, NOW())', [type], (error, results) => {
    if (error) {
      console.log(error)
      throw error
    }
    response.status(201).send('Report added.')
  })
}

module.exports = {
  getReportsInBoundingBox,
  createReport
}
