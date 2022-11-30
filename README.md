# Crowdsourced GeoTracker

Crowdsourced GeoTracker is an open-source project that allows the public to **easily report and track the
geolocation of anyone** or anything they spot outside.

The project can be configured to track all kinds of things - here are a few examples:

* Citizens can report damaged public equipement to local authorities / municipalities, so they can quickly make repairs.
* Civilians can report on the movements of an inviding army when they see them, so others are able to prepare / evacuate.
* Drivers can report traffic accidents or delays.
* Tracking the occurences of wild animals; Bird watching.
* ...

![5](https://user-images.githubusercontent.com/3534507/157018363-bbc64351-fc50-49fe-b91d-b461663231d0.png)

## Backend (Node.JS + Express + Postgres)

### Installation

1. Install Node.JS and npm (on Ubuntu/Debian run `sudo apt install nodejs npm`)
2. Clone this repository: `git clone https://github.com/certicky/crowdsourced-geotracker.git`
3. Navigate to folder backend: `cd crowdsourced-geotracker/backend`
4. Install the dependencies: `npm install`
5. Install Postgres and Postgis extension (depending on your OS)
6. Create a DB user, database and tables using the following commands (don't forget to replace `<YOUR DB PASSWORD>` with the actual password):

```
CREATE USER geotracker_user WITH PASSWORD '<YOUR DB PASSWORD>';
CREATE DATABASE geotracker_db OWNER geotracker_user;
CREATE EXTENSION postgis;
CREATE TABLE public.reports
(
    id SERIAL,
    location geography(Point,4326),
    type character varying(32) COLLATE pg_catalog."default",
    valid_from timestamptz NOT NULL DEFAULT now(),
    valid_until timestamptz NOT NULL DEFAULT now() + interval '1 hour',
    description varchar(256),
    media_url varchar(256),
    ip varchar(64)
);
ALTER TABLE public.reports OWNER to geotracker_user;
CREATE INDEX report_location_idx ON reports USING GIST(location);
CREATE INDEX valid_from_idx ON reports USING btree(valid_from DESC);
CREATE INDEX valid_until_idx ON reports USING btree(valid_until DESC);
CREATE UNIQUE INDEX duplicates_constraint ON reports (type, valid_from, valid_until, ST_SnapToGrid(location::geometry, 0.00001)); -- this index prevents having multiple reports with very similar location and same type & validity
```

7. Copy the `settings.js.example` file to `settings.js` and update the values in it.
8. You can insert some reports from external data sources from by calling some of the scripts in `/backend/data_import_scripts/`. These scripts can be called periodically using cron if you want to always have fresh external data in the DB. The DB indexes prevent adding duplicate entries when the scripts are called repeatedly.
9. Run the backend: `npm run listen` or simply `node index.js`.
10. The backend also serves the web frontend, so you can just open `http://localhost:3000/` in a browser to see the map (assuming that you use port 3000 in your `settings.js`).

### API

* **[GET] /metadata**
```
Returns all the meta data / settings that might be required by frontends.
Example: http://localhost:3000/metadata
```

* **[GET] /reports**
```
Returns all the reports from the specified bounding box.
Example: http://localhost:3000/reports?latmin=46.278977050642126&lonmin=25.19668223803358&latmax=51.515386508021386&lonmax=41.30651925297246&time=1646226061
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
  - mediafile: Image file (jpeg, png or webp) can be attaced to the report here. It will be stored on backend as a static file. (optional)
  - mediaurl: Url to an external image or a Tweet that's displayed next to the report. (optional)
```

## Web Frontend (basic HTML with a bit of JS)

### Installation
* Clone this repository: `git clone https://github.com/certicky/crowdsourced-geotracker.git`
* Navigate to folder frontend-web: `cd crowdsourced-geotracker/frontend-web`
* Copy the `settings.js.example` file to `settings.js` and update the values in it. You need to point it to your running backend and provide your Google Maps API key.
* Then just open `index.html` in your web browser.
* Alternatively, if you have the backend running locally, you can access it at `http://localhost:3000/` (assuming you're using port 3000 in your backend's `settings.js`).

### Functions:
* The web displays a map of recent reports in the area. The default area displayed is set according to browser's location.
* Users can report sightings via this web frontend by clicking anywhere on the map. Photos can be added to reports.
* It's be possible to rewind the time back using a slider to see how the report locations changed over time.
