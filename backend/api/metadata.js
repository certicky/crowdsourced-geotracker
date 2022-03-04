const {
  supportedTypes
} = require('../settings')

// (GET) Returns all the meta data / settings that might be required by frontends.
// Example: http://localhost:3000/metadata
const getMetadata = (request, response) => {
  response.status(200).json({
    supportedTypes: supportedTypes
  })
}

module.exports = {
  getMetadata
}
