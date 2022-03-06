const express = require('express')
const cors = require('cors')
const fileUpload = require('express-fileupload')
const bodyParser = require('body-parser')
const reports = require('./api/reports')
const metadata = require('./api/metadata')
const { listenPort } = require('./settings')

const app = express()
app.use(cors())
app.use(bodyParser.json())
app.use(
  bodyParser.urlencoded({
    extended: true
  })
)
app.use(fileUpload({
    createParentPath: true
}))

// connect API endpoints
app.get('/metadata', metadata.getMetadata)
app.get('/reports', reports.getReportsInBoundingBox)
app.post('/reports', reports.createReport)

// serve static files
app.use(express.static('../frontend-web'))
app.use(express.static('./file_uploads'))

app.listen(listenPort, () => {
  console.log(`App running on port ${listenPort}.`)
})
