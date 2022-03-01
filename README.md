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

![image](https://user-images.githubusercontent.com/3534507/156072537-e054c6be-829a-4540-a3d4-56069b2afd7d.png)

## Backend

### Installation

* Install Node.JS
* Clone this repository: `git clone git@github.com:certicky/crowdsourced-geotracker.git`
* Navigate to folder backend: `cd crowdsourced-geotracker/backend`
* Install the dependencies: `npm install`
* Install Postgres and Postgis extension (depending on your OS)
* Create a DB user, database and tables using the following commands (don't forget to change the credentials and create indexes):

```
CREATE USER geotracker_user WITH PASSWORD <YOUR DB PASSWORD>;
CREATE DATABASE geotracker_db OWNER geotracker_user;
CREATE EXTENSION postgis;
```

```
CREATE TABLE IF NOT EXISTS public.reports
(
    id integer NOT NULL DEFAULT nextval('reports_id_seq'::regclass),
    location geography(Point,4326),
    type character varying(32) COLLATE pg_catalog."default",
    "time" timestamp without time zone NOT NULL,
    img_thumb bytea,
    img_full bytea,
    CONSTRAINT reports_pkey PRIMARY KEY (id)
)
TABLESPACE pg_default;
ALTER TABLE IF EXISTS public.reports OWNER to geotracker_user;
CREATE INDEX report_location_idx ON reports USING GIST(location);
```

* Copy the `settings.js.example` file to `settings.js` and update the values in it.
* Insert some initial data from <https://maphub.net/Cen4infoRes/russian-ukraine-monitor>: `node importInitialReports.js`
* Run the backend: `npm run dev`

### API

* **[GET] /reports**
```
Returns all the reports from the specified bounding box.
Example: http://localhost:3000/reports?latmin=46.278977050642126&lonmin=25.19668223803358&latmax=51.515386508021386&lonmax=41.30651925297246&img=THUMBNAIL
GET parameters:
  - latmin, lonmin, latmax, lonmax: Latitude-Longitude definition of the bounding box from which we're getting the reports. Accepts float numbers. (required)
  - img: Size of the image to return with the reports. Accepts 'THUMB', 'FULL' or undefined. If not defined, no image is returned. (optional)
```

* **[POST] /reports**
```
Adds a new report to DB.
Example: http://localhost:3000/reports with BODY: lat = 49.71422916693619, lon = 26.66829512680357, type = AIRCRAFT
```

## Mobile App

TODO: The app is not implemented yet. Its planned functions and some notes:

* Report the sighting of an object of interest - the report location should be pre-set by the app automatically, using device's location (should be possible to adjust it manually).
* Reporting needs to be very quick and simple. UI needs to be usable under non-ideal conditions.
* An option to attach a photo of the sighting - it should be possible to take a picture directly from within the app. The picture should be sent downscaled to decrease data usage.
* Taking a picture shouldn't make any sound.
* If possible, the device's geolocation should only be enabled while sending the report. If it was disabled before reporting, it should auto-disable after the report is sent.
* When users aren't reporting a sighting, the app should display a map of recent reports around them.

## Web Frontend

### Installation
* Clone this repository: `git clone git@github.com:certicky/crowdsourced-geotracker.git`
* Navigate to folder frontend-web: `cd crowdsourced-geotracker/frontend-web`
* Copy the `settings.js.example` file to `settings.js` and update the values in it. You need to point it to your running backend and provide your Google Maps API key.
* Then just open `index.html` in your web browser.

Functions:
* The web displays a map of recent reports in the area. The default area displayed is set according to browser's location.
* (under construction) It will be possible to rewind the time back using a slider to see how the report locations changed over time.
* (under construction) We'll also allow users to report sightings via this web frontend too, not only the mobile app.
