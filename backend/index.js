const express = require('express')
const cors = require('cors')
const bodyParser = require('body-parser')
const reports = require('./api/reports')
const { listenPort } = require('./settings')

const app = express()
app.use(cors())
app.use(bodyParser.json())
app.use(
  bodyParser.urlencoded({
    extended: true
  })
)

app.get('/', (request, response) => {
  response.json({ info: 'Node.js, Express, and Postgres API' })
})

app.get('/reports', reports.getReportsInBoundingBox)
app.post('/reports', reports.createReport)

app.listen(listenPort, () => {
  console.log(`App running on port ${listenPort}.`)
})
