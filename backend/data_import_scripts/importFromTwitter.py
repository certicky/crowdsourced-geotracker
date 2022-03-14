import tweepy, re, sys, requests, time
from dateutil import parser

if len(sys.argv) != 4:
	print('Usage:', sys.argv[0], '<TWITTER_ACCESS_TOKEN> <TWITTER_ACCESS_TOKEN_SECRET> <CROWDSOURCED_GEOTRACKER_API_URL>')
	exit()

TWITTER_ACCESS_TOKEN = sys.argv[1]
TWITTER_ACCESS_TOKEN_SECRET = sys.argv[2]
CROWDSOURCED_GEOTRACKER_API_URL = sys.argv[3]

def getTypeFromRec (rec):
	if any(text in rec for text in [
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
	]): return 'VEHICLES'

	if any(text in rec for text in [
		'jets',
		'helicop',
		'plane'
	]): return 'AIRCRAFT'

	return 'INFANTRY'


def getCoordsFromText (text):
	coordsFound = re.findall('([0-9.-]+).+?([0-9.-]+)', text)
	for c in coordsFound:
		if len(c) == 2 and c[0].replace('.','',1).isnumeric() and c[1].replace('.','',1).isnumeric() and float(c[0]) >= -90 and float(c[0]) <= 90 and float(c[1]) >= -180 and float(c[1]) <= 180:
			if float(c[0]) != int(float(c[0])) and float(c[1]) != int(float(c[1])):
				return { 'latitude': float(c[0]), 'longitude': float(c[1]) }
	return None

auth = tweepy.OAuthHandler(TWITTER_ACCESS_TOKEN, TWITTER_ACCESS_TOKEN_SECRET)
api = tweepy.API(auth)

res = tweepy.Cursor(api.search, q="""
	(📍 OR locat OR coordinate OR osint) AND
	(
		russian OR
		soldier OR
		tank OR
		convoy OR
		apc OR
		mrl OR
		bmp-3 OR
		vdv OR
		bmd-2 OR
		kamaz OR
		apc OR
		tigr OR
		thermobaric OR
		mlr OR
		buk OR
		armor OR
		missile OR
		vehicle OR
		artillery OR
		jets OR
		helicop OR
		plane
	)""",
	result_type='recent',
	tweet_mode='extended'
).items(500)

found = 0
for tweet in res:
	data = tweet._json

	coordsFound = getCoordsFromText(data['full_text'])
	if coordsFound:
		clatmin = 44.12810823870789
		clngmin = 21.30785244768581
		clatmax = 51.92494910764881
		clngmax = 39.789226501012976

		if coordsFound['latitude'] >= clatmin and coordsFound['latitude'] <= clatmax and coordsFound['longitude'] >= clngmin and coordsFound['longitude'] <= clngmax:
			found += 1
			datetimeObj = parser.parse(data['created_at'])
			postData = {
				'lat': float(coordsFound['latitude']),
				'lon': float(coordsFound['longitude']),
				'type': getTypeFromRec(data['full_text']),
				'validfrom': int(time.mktime(datetimeObj.timetuple())),
				'validuntil': int(time.mktime(datetimeObj.timetuple())) + (86400 * 2), # validity: 2 days
				'description': data['full_text'][0:255],
				'mediaurl': 'https://twitter.com/' + data['user']['screen_name'] + '/status/' + data['id_str']
			}
			print(data['created_at'], postData)
			requests.post(CROWDSOURCED_GEOTRACKER_API_URL.strip('/reports').strip('/') + '/reports', data = postData)

print('Total posted:', found)
