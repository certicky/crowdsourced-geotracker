const fetch = require('node-fetch')
const reports = require('../api/reports')
const moment = require('moment')

const main = async () => {
  const res = await fetch('https://liveuamap.com/ajax/do?act=pts&curid=0&time=' + moment().format('X') + '&last=0', {
    'headers': {
      'accept': 'text/html, */*; q=0.01',
      'accept-language': 'en,sk-SK;q=0.9,sk;q=0.8,cs;q=0.7',
      'sec-ch-ua': '\' Not A;Brand\';v=\'99\', \'Chromium\';v=\'98\', \'Google Chrome\';v=\'98\'',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '\'Linux\'',
      'sec-fetch-dest': 'empty',
      'sec-fetch-mode': 'cors',
      'sec-fetch-site': 'same-origin',
      'x-csrf-token': 'zW8oXmYCdnmQKlHXT8i4SLw3vkRwyzbl8Ytn-IGK6iPYF-COdq0YwT5UU8fSKPXQTjAigyjePcMRcI8ENxxNxg==',
      'x-requested-with': 'XMLHttpRequest',
      'Referer': 'https://liveuamap.com/en/time/09.03.2022',
      'Referrer-Policy': 'strict-origin-when-cross-origin'
    },
    'body': null,
    'method': 'GET'
  })

  const d = await res.text()
  const buff = new Buffer(d, 'base64')
  const decoded = buff.toString('ascii')
  const data = JSON.parse(decoded)

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
    ].some(str => rec.name.toLowerCase().includes(str))) return 'VEHICLES'
    // AIRCRAFT
    if ([
      'jets',
      'helicop',
      'plane',
      'air'
    ].some(str => rec.name.toLowerCase().includes(str))) return 'AIRCRAFT'
    // INFANTRY (default)
    return 'INFANTRY'
  }

  data.venues.forEach(rec => {
    let isRelevant = ['russia', 'military', 'shell'].some(str => rec.name.toLowerCase().includes(str)) || ['VEHICLES', 'AIRCRAFT'].includes(getTypeFromRec(rec))
    if(['president', 'zelensky', 'putin', 'lavrov', 'lukashenk', 'minist', 'conference', 'kremlin'].some(str => rec.name.toLowerCase().includes(str))) isRelevant = false
    if (isRelevant) {
      console.log('==============')
      console.log(getTypeFromRec(rec))
      console.log(rec.lat, rec.lng)
      console.log(rec.name)

      reports.createReport({
        body: {
          lat: parseFloat(rec.lat),
          lon: parseFloat(rec.lng),
          type: getTypeFromRec(rec),
          validfrom: rec.timestamp,
          validuntil: rec.timestamp + (3600 * 6), // validity: 6 hours
          description: rec.name ? rec.name.substring(0, 255) : undefined,
          mediaurl: rec.source || undefined
        },
        ip: '127.0.0.1'
      }, null)
    }
  })
}

main()
