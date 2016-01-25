var loading_screen;

var ParkingMap = ParkingMap || {};

(function () {
  'use strict';

  var mapLayers = {};
  var layerNames = ['rppblocks',
  'rppdistricts',
  //'scooters', 
  'lots',
  'valet',
  'meters',
  'satellite'];

  var accessToken = 'pk.eyJ1IjoibGF1cmVuYW5jb25hIiwiYSI6ImNpZjMxbWtoeDI2MjlzdW0zanUyZGt5eXAifQ.0yDBBkfLr5famdg4bPgtbw';

  var INTERACTIVE_PATTERN = /\.i$/;
  var isInteractive = function (feature) {
    /* Check whether the given feature belongs to an
     * interactive layer.
     */
    var layerName = feature.layer.id;
    return INTERACTIVE_PATTERN.test(layerName) && ParkingMap.map.getLayoutProperty(layerName, 'visibility') === 'visible';
  };

  var featuresAt = function (map, point, options, callback) {
    /* A wrapper around mapboxgl.Map.featuresAt that will
     * only take interactive layers into account. Layer
     * interactivity is determined by the isInteractive
     * function.
     *
     * TODO: Allow overriding the isInteractive method from
     * within the options.
     */
    // Hijack the callback.
    var hijacked = function (err, features) {
      var filteredFeatures = [],
        i;
      for (i = 0; i < features.length; i++) {
        if (isInteractive(features[i])) {
          filteredFeatures.push(features[i]);
        }
      }
      callback(err, filteredFeatures);
    };

    // Call mapboxgl.Map.featuresAt with the hijacked callback function.
    map.featuresAt(point, options, hijacked);
  };

  ParkingMap.initFancyMap = function () {
    var map;

    mapboxgl.accessToken = accessToken;

    // Set bounds to Philadelphia metro
    var bounds = [
  [-75.387541, 39.864439],
  [-74.883544, 40.156325]
];

    var map = ParkingMap.map = new mapboxgl.Map({
      container: 'map', // container id
      style: 'mapbox://styles/laurenancona/cij3k82x800018wkmhwgg7tgt', //stylesheet location
      center: [-75.1694, 39.9294],
      bearing: 9.2, // Rotate Philly ~9° off of north, thanks William Penn.
      zoom: 12,
      maxZoom: 18,
      minZoom: 12,
      pitch: 60,
      //    maxBounds: bounds,
      hash: true,
      touchZoomRotate: false
    });

    // Change cursor state when hovering on interactive features
    var getPoint = function (evt) {
      // MapboxGL will call it `point`, leaflet `containerPoint`.
      return evt.point || evt.containerPoint;
    };

    ParkingMap.map.on('mousemove', function (evt) {
      if (map.loaded()) {
        var point = getPoint(evt);
        featuresAt(map, point, {
          radius: 15
        }, function (err, features) {
          if (err) throw err;
          ParkingMap.map._container.classList.toggle('interacting', features.length > 0);
          //  document.getElementById('features').innerHTML = JSON.stringify(features, null, 2);
        });
      }
    });


    ParkingMap.map.on('click', function (evt) {
      if (map.loaded()) {
        var p = map.getPitch();
        console.log(p);
        if (p > 0) {
          map.flyTo({
            center: [-75.1650, 39.9433],
            zoom: 13,
            speed: 0.1,
            bearing: 9.2,
            pitch: 0
          });
        }
      }
    });


    ParkingMap.map.on('click', function (evt) {
      if (map.loaded()) {
        var point = getPoint(evt);

        // Find what was clicked on
        featuresAt(map, point, {
          radius: 10
            //          includeGeometry: true
        }, function (err, features) {
          var layerName, feature;

          if (err) throw err;

          if (features.length > 0) {
            feature = features[0];
            layerName = feature.layer.id;
            if (layerName === 'meters.i') {
              showInfo(layerName, features);
            } else {
              showInfo(layerName, feature);
            }
          } else {
            empty();
          }
        });
      }
    });

    var updateLayerVisibility = function (layerName) {
      var toggledLayers = mapLayers[layerName] || [];
      if (document.getElementById(layerName).checked) {
        toggledLayers.forEach(function (layer) {
          map.setLayoutProperty(layer.id, 'visibility', 'visible');
        });
      } else {
        toggledLayers.forEach(function (layer) {
          map.setLayoutProperty(layer.id, 'visibility', 'none');
        });
      }
    };

    // Define layers & interactivity

    map.on('load', function () {
      var layerAssociation = { //using '.i' in GL layernames we want to be interactive
        'rppblocks': ['rppblocks_bothsides.i', 'rppblocks_1side.i', 'rppblocks.label'],
        'rppdistricts': ['rppdistricts.i', 'rppdistricts.line', 'rppdistricts.label', 'rppdistricts.line_case'],
        // 'scooters': ['scooters.i'],
        'lots': ['lots.i', 'lots.label'],
        'valet': ['valet.i', 'valet.circle.i'],
        'meters': ['meters.i'],
        'satellite': ['satellite']
      };

      loading_screen.finish();

      layerNames.forEach(function (layerName, index) {
        // Associate the map layers with a layerName.
        var interactiveLayerNames = layerAssociation[layerName];
        interactiveLayerNames.forEach(function (interactiveLayerName) {
          var interactiveLayer = map.style.getLayer(interactiveLayerName);
          if (!mapLayers[layerName]) {
            mapLayers[layerName] = [];
          }
          if (interactiveLayer) {
            mapLayers[layerName].push(interactiveLayer);
          }
        });

        // Bind the checkbox change to update layer visibility.

        document.getElementById(layerName).addEventListener('change', function () {
          updateLayerVisibility(layerName);
        });

        // Set the initial layer visibility to match the toggle.

        updateLayerVisibility(layerName);
      });
    });

//     Add Geocoder
        var geocoder = new mapboxgl.Geocoder({
          container: 'geocoder-container'
        });
    
        map.addControl(geocoder);
    
        // After the map style has loaded on the page, add a source layer and default
        // styling for a single point.
        map.on('style.load', function () {
          map.addSource('single-point', {
            "type": "geojson",
            "data": {
              "type": "FeatureCollection",
              "features": []
            }
          });
    
          map.addLayer({
            "id": "point",
            "source": "single-point",
            "type": "circle",
            "paint": {
              "circle-radius": 8,
              "circle-color": "#007cbf"
            }
          });
    
          //TODO: FIGURE OUT HOW TO OVERRIDE BUGGY GEOCODER THAT FLYS TO INCORRECT BBOXES 
          
          // Listen for the `geocoder.input` event that is triggered when a user
          // makes a selection and add a marker that matches the result.
          geocoder.on('geocoder.input', function (ev) {
            map.getSource('single-point').setData(ev.result.geometry);
          });
        });

    // disable map rotation using touch rotation gesture
    //    map.touchZoomRotate.disableRotation();
  };

  var showInfo = function (tpl, feature) {
    console.log('Here is your stupid info', tpl);
    var content;

    switch (tpl) {
    case 'rppblocks_bothsides.i':
    case 'rppblocks_1side.i':
      content = '<div class="location">' + feature.properties.block_street + '</div>' +
        '<div class="side">' + feature.properties.sos + '</div>';
      break;

    case 'rppdistricts.i':
      content = '<div><span class="location">' + feature.properties.title + '</span><br>' +
        feature.properties.description + '</div>';
      break;

    case 'lots.i':
      content = '<div>' + (feature.properties.name ?
          '<span class="location">' + feature.properties.name + ' </span>' : '') +
        (feature.properties.description ?
          ': ' + feature.properties.description : '') +
        (feature.properties.address ?
          '<p>' + feature.properties.address + '</p>' : '') +
        (feature.properties.Type ?
          '<p>' + feature.properties.Type + '</p>' : '') +
        (feature.properties.capacity ?
          '<p>Capacity: ' + feature.properties.capacity + '</p>' : '') +
        (feature.properties.Hours ?
          '<p>' + feature.properties.Hours : '') + ' | ' +
        (feature.properties.days ?
          feature.properties.days + '</p>' : '') +
        (feature.properties.times ?
          '<p>' + feature.properties.times + '</p>' : '') +
        (feature.properties.Rates ?
          '<p>Rates: ' + feature.properties.Rates + '</p>' : '') + '</div>';
      break;

    case 'valet.i':
      content = '<div>' + (feature.properties.Name ?
          '<span class="location">' + feature.properties.Name + '</span>' : '') +
        (feature.properties.Hours ?
          '<p>Hours: ' + feature.properties.Hours + '<br>' : '') +
        (feature.properties.Spaces ?
          'Spaces: ' + feature.properties.Spaces : '') +
        '</p></div>';
      break;

      //    case 'meters.i':
      //        content = '<div>' + (feature.properties.street ?
      //          '<strong>' + feature.properties.street + '</strong>' : '') +
      //        (feature.properties.from_day ?
      //         '<p>' + feature.properties.from_day + '-' + feature.properties.to_day + '</p>' : '') +
      //        (feature.properties.from_time ?
      //         '<p>' + feature.properties.from_time + '-' + feature.properties.to_time + '</p>' : '') + '</div>';
      //      break;

    case 'meters.i':
      var template = _.template(
        '<div id="meter-info" style="margin-left:auto;margin-right:auto; width:30%;max-width:350px;">' +
        '<% _.each(features,function(regulations,key){ %>' +
        '<span class="location"><%= key %></span><br>' +
        '<% _.each(regulations,function(regulation){ %>' +
        '<%= regulation.properties.from_day %> - <%= regulation.properties.to_day %> &nbsp;' +
        ' | &nbsp;  <%= regulation.properties.from_time %> - <%= regulation.properties.to_time %> <br>' +
        '$<%= regulation.properties.rate %>/hr &nbsp; | &nbsp;' +
        'Limit: <%= (regulation.properties.limit_hr ? regulation.properties.limit_hr + " hr" : "") %>' +
        '<%= (regulation.properties.limit_min ? regulation.properties.limit_min + " min" : "") %> &nbsp;' +
        '| &nbsp; <%= regulation.properties.seg_id %><hr>' +
        '<% }) %>' +
        '<% }) %></div>');

      var byStreet = _.groupBy(feature, function (value) {
        return value.properties.street + ', ' + value.properties.side + ' Side';
      });
      content = template({
        'features': byStreet
      });
      break;

    default:
      content = '<div>' + (feature.properties.name ?
          '<span class="location">' + feature.properties.name + '</span>' : '') +
        (feature.properties.title ?
          '<strong>' + feature.properties.title + '</strong>' : '') +
        (feature.properties.description ?
          feature.properties.description : '') +
        (feature.properties.capacity ?
          'Capacity: ' + feature.properties.capacity + '</p>' : '') + '</div>';
      break;
    }
    info.innerHTML = content;
  };

  ParkingMap.allowFancyMap = true;

  loading_screen = pleaseWait({
    logo: "../img/hotlink-ok/load-logo-01.svg",
    backgroundColor: '#404040',
    loadingHtml: "<div class='loading_text'>Mapping Philadelphia's parking regulations</div><div class='spinner'><div class='double-bounce1'></div><div class='double-bounce2'></div></div>"
  });

  if (ParkingMap.allowFancyMap && window.mapboxgl && mapboxgl.supported()) {
    ParkingMap.initFancyMap();
  } else {
    ParkingMap.initFancyMap();
  }

  // Clear the tooltip when map is clicked.
  ParkingMap.map.on('move', empty);

  // Trigger empty contents when the script has loaded on the page.
  empty();

  function empty() {
    console.log('Here is your stupid empty.');
    info.innerHTML = '<!--<div><p><strong>Choose layers at left, then click features for info</strong></p></div>-->';
  }
})();