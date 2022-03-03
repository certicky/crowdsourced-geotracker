#### Attention: Looking for developers, so we can deploy this ASAP. Please contact me at certicky (at) gmail (dot) com and I can give you access.

# Crowdsourced GeoTracker

Crowdsourced GeoTracker is an open-source project that allows the public to **easily report and track the
geolocation of anyone** or anything they spot outside, using a mobile app or web frontend.

The project can be configured to track all kinds of things - here are a few examples:

* **Civilians can report on the movements of an inviding army when they see them, so others are able to prepare (evacuate or make some cocktails).**
* Citizens can report damaged public equipement to local authorities / municipalities, so they can quickly make repairs.
* Drivers can report traffic accidents or delays.
* Tracking the occurences of wild animals; Bird watching.
* ...

![3](https://user-images.githubusercontent.com/3534507/156624192-e3fbf211-c778-4f04-95ca-2b13cef74e27.png)

## Backend (Node.JS + Express + Postgres)

### Installation

1. Install Node.JS and npm (on Ubuntu/Debian run `sudo apt install nodejs npm`)
2. Clone this repository: `git clone git@github.com:certicky/crowdsourced-geotracker.git`
3. Navigate to folder backend: `cd crowdsourced-geotracker/backend`
4. Install the dependencies: `npm install`
5. Install Postgres and Postgis extension (depending on your OS)
6. Create a DB user, database and tables using the following commands (don't forget to change the credentials and create indexes):

```
CREATE USER geotracker_user WITH PASSWORD <YOUR DB PASSWORD>;
CREATE DATABASE geotracker_db OWNER geotracker_user;
CREATE EXTENSION postgis;
```

```
CREATE TABLE IF NOT EXISTS public.reports
(
    id SERIAL,
    location geography(Point,4326),
    type character varying(32) COLLATE pg_catalog."default",
    valid_from timestamptz NOT NULL DEFAULT now(),
    valid_until timestamptz NOT NULL DEFAULT now() + interval '1 hour',
    description varchar(256),
    media_url varchar(256),
    CONSTRAINT reports_pkey PRIMARY KEY (id)
);
ALTER TABLE public.reports OWNER to geotracker_user;
CREATE INDEX report_location_idx ON reports USING GIST(location);
CREATE INDEX valid_from_idx ON reports USING btree(valid_from DESC);
CREATE INDEX valid_until_idx ON reports USING btree(valid_until DESC);
CREATE UNIQUE INDEX duplicates_constraint ON reports (type, valid_from, valid_until, ST_SnapToGrid(location::geometry, 0.00001)); -- this index prevents having multiple reports with very similar location and same type & validity
```

7. Copy the `settings.js.example` file to `settings.js` and update the values in it.
8. Insert some initial data from <https://maphub.net/Cen4infoRes/russian-ukraine-monitor>: `node importInitialReports.js`
9. Run the backend: `npm run listen`

### API

* **[GET] /reports**
```
Returns all the reports from the specified bounding box.
Example: http://localhost:3000/reports?latmin=46.278977050642126&lonmin=25.19668223803358&latmax=51.515386508021386&lonmax=41.30651925297246&img=THUMBNAIL&time=1646226061
GET parameters:
  - latmin, lonmin, latmax, lonmax: Latitude-Longitude definition of the bounding box from which we're getting the reports. Accepts float numbers. (required)
  - time: Point in time that we're looking at in UNIX timestamp format = number of seconds that have elapsed since January 1, 1970 midnight (required)
```

* **[POST] /reports**
```
Adds a new report to DB.
Example: http://localhost:3000/reports with BODY: lat = 49.71422916693619, lon = 26.66829512680357, type = AIRCRAFT, validfrom: 1646312461, validuntil: 1646316061
POST parameters:
  - lat, lon: Latitude and Longitude of the sighting. Accepts float numbers. (required)
  - type: The type of the reported sighting, for example VEHICLES or AIRCRAFT. Accepts values enumerated in supportedTypes in settings.js. (required)
  - validfrom, validuntil: Start and end of the time period when the report is valid in second-UNIX timestamp format. (optional, by default the 1-hour period starting when the request is processed)
  - description: Short textual description fo the sighting. (optional)
```

## Mobile App (React Native)

### Installation
* Set up your Android development environment, if haven’t done so. Make sure you can successfully run an Android app on an emulator.
* Clone this repository: `git clone git@github.com:certicky/crowdsourced-geotracker.git`
* Navigate to folder frontend-mobile: `cd crowdsourced-geotracker/frontend-mobile`
* Install the dependencies: `npm install`
* Install the react-native-cli globally: `npm install -g react-native-cli`
* Copy the `/android/app/src/main/AndroidManifest.xml.example` file to `/android/app/src/main/AndroidManifest.xml` and update the value of `com.google.android.geo.API_KEY` in it. You need to provide your Google Maps API key.
* Go to <https://console.cloud.google.com/apis/> and make sure you have the following enabled for your project: Google Play Android Developer API, Maps SDK for Android
* Run `npm start -- --reset-cache` or `npx react-native start` and keep it running in the background. Watch its output while developing.
* Run `react-native run-android`. That should open a window with the Android emulator running your app.
* You can get more logs by calling `adb logcat`

The app is under construction. Some planned functions and notes:
* Report the sighting of an object of interest - the report location should be pre-set by the app automatically, using device's location (should be possible to adjust it manually).
* Reporting needs to be very quick and simple. UI needs to be usable under non-ideal conditions.
* An option to attach a photo of the sighting - it should be possible to take a picture directly from within the app. The picture should be sent downscaled to decrease data usage.
* Taking a picture shouldn't make any sound.
* If possible, the device's geolocation should only be enabled while sending the report. If it was disabled before reporting, it should auto-disable after the report is sent.
* When users aren't reporting a sighting, the app should display a map of recent reports around them.

## Web Frontend (basic HTML with a bit of JS)

### Installation
* Clone this repository: `git clone git@github.com:certicky/crowdsourced-geotracker.git`
* Navigate to folder frontend-web: `cd crowdsourced-geotracker/frontend-web`
* Copy the `settings.js.example` file to `settings.js` and update the values in it. You need to point it to your running backend and provide your Google Maps API key.
* Then just open `index.html` in your web browser.

Functions:
* The web displays a map of recent reports in the area. The default area displayed is set according to browser's location.
* (under construction) It will be possible to rewind the time back using a slider to see how the report locations changed over time.
* (under construction) We'll also allow users to report sightings via this web frontend too, not only the mobile app.
