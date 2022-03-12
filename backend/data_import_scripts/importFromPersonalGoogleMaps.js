const fetch = require('node-fetch')
const reports = require('../api/reports')
const moment = require('moment')
const xml2js = require('xml2js')

const getTypeFromRec = (rec) => {
  // VEHICLES
  if ([
    'tank',
    'convoy',
    'apc',
    'mrl',
    'bmp-3',
    'vdv',
    'bmd-2',
    'kamaz',
    'apc',
    'tigr',
    'thermobaric',
    'mlrs',
    'buk',
    'armor',
    'missile',
    'vehicle',
    'artillery'
  ].some(str => rec.toLowerCase().includes(str))) return 'VEHICLES'
  // AIRCRAFT
  if ([
    'jets',
    'helicop',
    'plane',
    'air'
  ].some(str => rec.toLowerCase().includes(str))) return 'AIRCRAFT'
  // INFANTRY (default)
  return 'INFANTRY'
}


const main = async () => {

  // LOAD THIS CUSTOM MAP: https://www.google.com/maps/d/viewer?mid=1koci_MwQdnmM5ikEEsUYwuvivMrqnl4l&ll=50.95052450000001%2C29.881729899999993&z=8
  const res = await fetch("https://www.google.com/maps/d/kml?forcekml=1&mid=1koci_MwQdnmM5ikEEsUYwuvivMrqnl4l", {
    "headers": {
      "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9",
      "accept-language": "en",
      "sec-ch-ua": "\" Not A;Brand\";v=\"99\", \"Chromium\";v=\"98\", \"Google Chrome\";v=\"98\"",
      "sec-ch-ua-arch": "\"x86\"",
      "sec-ch-ua-full-version": "\"98.0.4758.102\"",
      "sec-ch-ua-mobile": "?0",
      "sec-ch-ua-model": "\"\"",
      "sec-ch-ua-platform": "\"Linux\"",
      "sec-ch-ua-platform-version": "\"5.13.0\"",
      "sec-fetch-dest": "document",
      "sec-fetch-mode": "navigate",
      "sec-fetch-site": "none",
      "sec-fetch-user": "?1",
      "upgrade-insecure-requests": "1",
      "cookie": "NID=511=lZ6acZu27e4ofwNGvouFZhTxBGPhu6WWS4hn1pvAecRynj3RdY3AHS4QhXiDRv5XfOTwPeflxqmSw10LG7qTmKzAu-UVjyGVtTNjkldm47CxMlLRkXKBkvdssnOyRdlVsFNy_0WZr4dcDI4YUet04ItO_c0Nf1ghWcLwXeRrNV8"
    },
    "referrerPolicy": "strict-origin-when-cross-origin",
    "body": null,
    "method": "GET"
  })

  const d = await res.text()
  const parser = new xml2js.Parser({ attrkey: 'ATTR' })
  parser.parseString(d, function(error, result) {
    if (!error) {
      const months = result.kml.Document[0].Folder
      months.forEach(month => {
        month.Placemark.forEach(placeMark => {
          const desc = placeMark.name[0].trim()
          const mediaUrls = placeMark.ExtendedData[0].Data[0].value[0].trim()
          const mediaUrl = mediaUrls.includes(' ')
            ? mediaUrls.split(' ')[0]
            : mediaUrls
          const dateStr = placeMark.description[0].split('<br>').find(d => moment(d).isValid())
          const dateMoment = dateStr ? moment(dateStr, 'D MMMM YYYY') : null
          const coords = (placeMark.Point && placeMark.Point.length)
            ? placeMark.Point[0].coordinates[0].trim().replace(',0', '').split(',')
            : null

          console.log("==========================")
          console.log(desc)
          console.log(dateMoment)
          console.log(mediaUrl)
          console.log(coords)

          if (dateMoment && coords) {
            reports.createReport({
              body: {
                lat: coords[1],
                lon: coords[0],
                type: getTypeFromRec(desc),
                validfrom: parseInt(dateMoment.startOf('day').format('X')),
                validuntil: parseInt(dateMoment.endOf('day').format('X')), // validity: 1 day
                description: desc,
                mediaurl: mediaUrl
              },
              ip: '127.0.0.1'
            }, null)

          }
        })
      })
    }
  })


}

main()