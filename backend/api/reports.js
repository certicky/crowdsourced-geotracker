const {
  dbUser,
  dbName,
  dbPassword,
  dbPort,
  dbHost,
  supportedTypes,
  maximumImageUploadSizeMB,
  skipImageProcessing
} = require('../settings')
const moment = require('moment')
const sharp = require('sharp');
const fs = require('fs')
const { Pool } = require('pg')

const pool = new Pool({
  user: dbUser,
  database: dbName,
  password: dbPassword,
  port: dbPort,
  host: dbHost
})

function getRandomFilename() {
    var result           = ''
    var characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    var charactersLength = characters.length
    for ( var i = 0; i < 24; i++ ) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength))
   }
   return result + '.png'
}

// (GET) Returns all the reports from the specified bounding box.
// Example: http://localhost:3000/reports?latmin=46.278977050642126&lonmin=25.19668223803358&latmax=51.515386508021386&lonmax=41.30651925297246&img=THUMBNAIL&time=1646312461
// Parameters:
//   - latmin, lonmin, latmax, lonmax: Latitude-Longitude definition of the bounding box from which we're getting the reports. Accepts float numbers. (required)
//   - time: Point in time that we're looking at in UNIX timestamp format = number of seconds that have elapsed since January 1, 1970 midnight (required)
//   - img: Size of the image to return with the reports. Accepts 'THUMB', 'FULL' or undefined. If not defined, no image is returned. (optional)
const getReportsInBoundingBox = (request, response) => {
  let columns = 'id, ST_Y(location::geometry) AS lat, ST_X(location::geometry) as lon, type, valid_from, valid_until, description, media_url'
  if (!request.query.latmin || request.query.latmin.toString() !== parseFloat(request.query.latmin).toString()) throw new Error('Incorrect input: latmin (supported: float)')
  if (!request.query.latmax || request.query.latmax.toString() !== parseFloat(request.query.latmax).toString()) throw new Error('Incorrect input: latmin (supported: float)')
  if (!request.query.lonmin || request.query.lonmin.toString() !== parseFloat(request.query.lonmin).toString()) throw new Error('Incorrect input: latmin (supported: float)')
  if (!request.query.lonmax || request.query.lonmax.toString() !== parseFloat(request.query.lonmax).toString()) throw new Error('Incorrect input: latmin (supported: float)')
  if (!request.query.time || request.query.time.toString() !== parseInt(request.query.time).toString()) throw new Error('Incorrect input: time (supported: integer)')

  let whereClause = 'WHERE reports.location && ST_MakeEnvelope(' + request.query.lonmin + ', ' + request.query.latmin + ', ' + request.query.lonmax + ', ' + request.query.latmax + ', 4326)'
  whereClause += ' AND valid_from <= to_timestamp(' + request.query.time + ')'
  whereClause += ' AND valid_until >= to_timestamp(' + request.query.time + ')'

  pool.query('SELECT ' + columns + ' FROM reports ' + whereClause, (error, results) => {
    if (error) {
      console.log(error)
      throw error
    }
    if (response) response.status(200).json(results.rows)
  })
}

// (POST) Adds a new report to DB.
// Example: http://localhost:3000/reports   ---   lat: 49.71422916693619, lon: 26.66829512680357, type: AIRCRAFT, validfrom: 1646312461, validuntil: 1646316061
const createReport = async (request, response) => {
  const requestIP = request.ip
  const { lat, lon, type, validfrom, validuntil, description, mediaurl } = request.body

  // check the user input
  if (!lon || lon.toString() !== parseFloat(lon).toString()) throw new Error('Incorrect input: lon (supported: float)')
  if (!lat || lat.toString() !== parseFloat(lat).toString()) throw new Error('Incorrect input: lat (supported: float)')
  if (!type || !supportedTypes.includes(type)) throw new Error('Incorrect input: type. (supported: ' + supportedTypes.toString() + ')')
  if (validfrom && validfrom.toString() !== parseInt(validfrom).toString()) throw new Error('Incorrect input: validfrom (supported: int)')
  if (validuntil && validuntil.toString() !== parseInt(validuntil).toString()) throw new Error('Incorrect input: validuntil (supported: int)')

  // compute the validity times
  const currentTimeStamp = parseInt(moment().format('X'))
  const validFromSQL = parseInt(validfrom) || currentTimeStamp
  const validUntilSQL = parseInt(validuntil) || (
      validFromSQL !== currentTimeStamp
        ? validFromSQL + (3600 * 3) // default validity, if not specified, is 3 hours
        : currentTimeStamp + (3600 * 3) // default validity, if not specified, is 3 hours
    )

  // process the uploaded image if it exists
  let mediaUrlSQL = mediaurl
  if (request.files && request.files.mediafile && request.files.mediafile.size && request.files.mediafile.size <= (1024000 * maximumImageUploadSizeMB)) {
    const randomFileNameBeforeProcessing = '___' + getRandomFilename()
    const randomFileNameFinal = getRandomFilename()

    if (skipImageProcessing) {
      await request.files.mediafile.mv('./file_uploads/' + randomFileNameFinal)
      mediaUrlSQL = './file_uploads/' + randomFileNameFinal
    } else {
      await request.files.mediafile.mv('./file_uploads/' + randomFileNameBeforeProcessing)
      let fileIsValid = true

      // process the image using 'sharp' library
      const f = await sharp('./file_uploads/' + randomFileNameBeforeProcessing)

      // check format, resize, convert to PNG, save using 'sharp' library
      try {
        const meta = await f.metadata()
        if (!['jpeg', 'png', 'webp'].includes(meta.format)) fileIsValid = false
      } catch (e) {
        fileIsValid = false
      }
      if (fileIsValid) {
        await f.resize(1000, 1000, { fit: sharp.fit.inside, withoutEnlargement: true })
          .toFormat('png')
          .toFile('./file_uploads/' + randomFileNameFinal)

        // save its filename to DB
        mediaUrlSQL = './file_uploads/' + randomFileNameFinal
      }

      // delete temporary file
      fs.unlink('./file_uploads/' + randomFileNameBeforeProcessing, () => {})
    }
  }

  // prepare the INSERT query
  const query = `
    INSERT INTO reports (location, type, valid_from, valid_until, description, media_url, ip)
    VALUES (
      CAST( ST_SetSRID(ST_Point( ` + parseFloat(lon) + `, ` + parseFloat(lat) + `), 4326) AS geography),
      $1,
      to_timestamp($2),
      to_timestamp($3),
      $4,
      $5,
      $6
    )
    ON CONFLICT (type, valid_from, valid_until, ST_SnapToGrid(location::geometry, 0.00001)) DO NOTHING
  `

  // execute the INSERT query
  pool.query(query, [type, validFromSQL, validUntilSQL, description, mediaUrlSQL, requestIP], (error, results) => {
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
