const fetch = require('node-fetch')
const reports = require('../api/reports')
const moment = require('moment')

const main = async () => {
  const res = await fetch('https://maphub.net/json/map_load/176607', {
    headers: {
      accept: '*/*',
      'accept-language': 'en,sk-SK;q=0.9,sk;q=0.8,cs;q=0.7',
      'content-type': 'application/json',
      'sec-ch-ua': '" Not A;Brand";v="99", "Chromium";v="98", "Google Chrome";v="98"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"Linux"',
      'sec-fetch-dest': 'empty',
      'sec-fetch-mode': 'cors',
      'sec-fetch-site': 'same-origin',
      'x-csrf-token': 'd1caff7e58d1299025e7cf49f66c32819b1644aac4d5b4df759dff3e2016c4f0',
      'x-requested-with': 'XMLHttpRequest',
      cookie: 'session=g5Rq3hHHXRkC9BW7SXlHWZvvMELlTW6WHukCtMgPDqTGMSmoVBwnOCHh7EzQ6YowGUwhaXz6YikVz_0VbyuKPHRnM3FVOXBOZE5GRkhMeWh4bE9OZTFZUHJxQlUxd2VONGxuVE4xT2xCRUdJbDcwOGIzVGZKQk5BOEJzRllhZkM',
      Referer: 'https://maphub.net/Cen4infoRes/russian-ukraine-monitor',
      'Referrer-Policy': 'strict-origin-when-cross-origin'
    },
    body: '{}',
    method: 'POST'
  })
  const data = await res.json()
  const importedGroupIds = data.geojson.groups.filter(grp => grp.title.toLowerCase().includes('russian military movements')).map(grp => grp.id)
  console.log('importedGroupIds', importedGroupIds)

  const getTypeFromRec = (rec) => {
    if (rec.properties && (rec.properties.title || rec.properties.description)) {
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
      ].some(str => rec.properties.title.toLowerCase().includes(str) || rec.properties.description.toLowerCase().includes(str))) return 'VEHICLES'
      // AIRCRAFT
      if ([
        'jets',
        'helicop',
        'plane',
        'air'
      ].some(str => rec.properties.title.toLowerCase().includes(str) || rec.properties.description.toLowerCase().includes(str))) return 'AIRCRAFT'
    }
    // INFANTRY (default)
    return 'INFANTRY'
  }

  const getValidityPeriodFromRec = (rec) => {
    const dateLine = rec.properties.description.split("\n").find(l => l.toLowerCase().includes('date: '))
    if (dateLine) {
      const m = moment(dateLine.toLowerCase().replace('date: ', ''), 'DD/MM/YYYY')
      return {
        validfrom: m.clone().startOf('day').format('X'),
        validuntil: m.clone().endOf('day').add(3, 'day').format('X')
      }
    }
  }

  const getDescriptionFromRec = (rec) => {
    const descLine = rec.properties.description.split("\n").find(l => l.includes('BRIEF DESCRIPTION: '))
    if (descLine) {
      return descLine.replace('BRIEF DESCRIPTION: ','')
    }
  }

  data.geojson.features.forEach(rec => {
    if (rec.geometry && rec.geometry.type === 'Point' && importedGroupIds.includes(rec.properties.group)) {
      const isRelevant = ['russia', 'military'].some(str => rec.properties.title.toLowerCase().includes(str) || rec.properties.description.toLowerCase().includes(str)) || ['VEHICLES', 'AIRCRAFT'].includes(getTypeFromRec(rec))
      if (isRelevant) {
        const validityPeriod = getValidityPeriodFromRec(rec)
        console.log('==============')
        console.log(getTypeFromRec(rec))
        console.log(rec.geometry.coordinates)
        console.log(validityPeriod)
        console.log(getDescriptionFromRec(rec))

        reports.createReport({
          body: {
            lat: rec.geometry.coordinates[1],
            lon: rec.geometry.coordinates[0],
            type: getTypeFromRec(rec),
            validfrom: validityPeriod ? validityPeriod.validfrom : undefined,
            validuntil: validityPeriod ? validityPeriod.validuntil : undefined,
            description: getDescriptionFromRec(rec) || undefined,
            mediaurl: rec.properties.media_url || undefined
          },
          ip: '127.0.0.1'
        }, null)
      }
    }
  })
}

main()
