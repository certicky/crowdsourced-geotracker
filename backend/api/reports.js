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
// Example: http://localhost:3000/reports?latmin=46.278977050642126&lonmin=25.19668223803358&latmax=51.515386508021386&lonmax=41.30651925297246&img=THUMBNAIL
// Parameters:
//   - latmin, lonmin, latmax, lonmax: Latitude-Longitude definition of the bounding box from which we're getting the reports. Accepts float numbers. (required)
//   - img: Size of the image to return with the reports. Accepts 'THUMB', 'FULL' or undefined. If not defined, no image is returned. (optional)
const getReportsInBoundingBox = (request, response) => {
  let columns = 'id, ST_Y(location::geometry) AS lat, ST_X(location::geometry) as lon, type, time'
  if (request.query.img && ['THUMBNAIL', 'FULL'].includes(request.query.img)) {
    if (request.query.img === 'THUMBNAIL') columns += ', img_thumb'
    if (request.query.img === 'FULL') columns += ', img_full'
  }
  if (!request.query.latmin || request.query.latmin.toString() !== parseFloat(request.query.latmin).toString()) throw new Error('Incorrect input: latmin')
  if (!request.query.latmax || request.query.latmax.toString() !== parseFloat(request.query.latmax).toString()) throw new Error('Incorrect input: latmin')
  if (!request.query.lonmin || request.query.lonmin.toString() !== parseFloat(request.query.lonmin).toString()) throw new Error('Incorrect input: latmin')
  if (!request.query.lonmax || request.query.lonmax.toString() !== parseFloat(request.query.lonmax).toString()) throw new Error('Incorrect input: latmin')

  pool.query('SELECT ' + columns + ' FROM reports WHERE reports.location && ST_MakeEnvelope(' + request.query.lonmin + ', ' + request.query.latmin + ', ' + request.query.lonmax + ', ' + request.query.latmax + ', 4326)', (error, results) => {
    if (error) {
      console.log(error)
      throw error
    }
    if (response) response.status(200).json(results.rows)
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
    if (response) response.status(201).send('Report added.')
  })
}

module.exports = {
  getReportsInBoundingBox,
  createReport
}
