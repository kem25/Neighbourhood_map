// Declaration of global variables
var map;
var infowindow;
var bounds;


// Url elements for FourSquare API
var BaseUrl = "https://api.foursquare.com/v2/venues/";
var fsClient_id = "client_id=YMGR14U3YEE0DMAWI2BCVRMFG0UEJXITA4C5X22GMDFEDK55";
var fsClient_secret = "&client_secret=DPTYGA0H2TCRKQQJ1UJKFHUSHNGZRPWIZVFRXADJCVYOKZP3";
var fsVersion = "&v=20170101";

// map initialisation function which gets called when the page is loaded
function mapInit() {
    "use strict";
  
  
    // Custom marker image
    var image = {
        "url": "img/pizza.png"
    };

    // setting map options
    var mapOptions = {
        "center": {
            "lat": 33.4255104,
            "lng": -111.9400054
        },
        zoom: 12,
        styles: [
            {
                featureType: "water",
                stylers: [
                    { color: "#19a0d8" }
                ]
            }, {
                featureType: "road.highway",
                elementType: "geometry.stroke",
                stylers: [
                    { color: "#efe9e4" },
                    { lightness: -40 }
                ]
            }, {
                featureType: "transit.station",
                stylers: [
                    { weight: 9 },
                    { hue: "#e85113" }
                ]
            }, {
                featureType: "road.highway",
                elementType: "labels.icon",
                stylers: [
                    { visibility: "off" }
                ]
            }, {
                featureType: "water",
                elementType: "labels.text.fill",
                stylers: [
                    { lightness: -100 }
                ]
            }, {
                featureType: "poi",
                elementType: "geometry",
                stylers: [
                    { visibility: "on" },
                    { color: "#f0e4d3" }
                ]
            }, {
                featureType: "road.highway",
                elementType: "geometry.fill",
                stylers: [
                    { color: "#efe9e4" },
                    { lightness: -25 }
                ]
            }
        ],
        mapTypeId: google.maps.MapTypeId.ROADMAP,
        mapTypeControl: false,
        mapTypeControlOptions: {
            style: google.maps.MapTypeControlStyle.DROPDOWN_MENU
        }
    };
    map = new google.maps.Map(document.getElementById("map"), mapOptions);
    infowindow = new google.maps.InfoWindow({
        maxWidth: 300,
        content: ""
    });
    bounds = new google.maps.LatLngBounds();

    // Resize stuff...
    google.maps.event.addDomListener(window, "resize", function () {
        var center = map.getCenter();
        google.maps.event.trigger(map, "resize");
        map.setCenter(center);
    });


    // Close info-window when clicked else-where on the map
    map.addListener("click", function () {
        infowindow.close(infowindow);
    });

    // Bounce effect on marker
    function toggleBounce(marker) {
        if (marker.getAnimation() !== null) {
            marker.setAnimation(null);
        } else {
            marker.setAnimation(google.maps.Animation.BOUNCE);
            setTimeout(function () {
                marker.setAnimation(null);
            }, 700);
        }
    }

    // Fetch infowindow content with foursquare data
    function getContent(item) {
        var contentString = "<h3>" + item.name +
            "</h3><br><div style='width:200px;min-height:100px'><img src=" + '"' +
            item.photoUrl + '"></div><div id="url"><a  href="' + item.shortUrl +
            '" target="_blank">Click here for Foursquare-info</a></div>';
        var errorString = "Foursquare has not been loaded";
        if (item.name) {
            return contentString;
        } else {
            return errorString;
        }
    }

    //Object for Places
    var Place = function (data, map, id) {
        var self = this;
        this.title = ko.observable(data.title);
        this.location = data.location;
        this.marker = "";
        this.markerId = id;
        this.fs_id = data.fs_id;
        this.shortUrl = "";
        this.photoUrl = "";
    };

    // Binding markers with the list-items
    function ViewModel() {
        var self = this;

        // Adding all places to form a list
        this.spaceList = ko.observableArray();
        initialSpaces.forEach(function (item) {
            self.spaceList.push(new Place(item));
        });

        // Create a marker for each item
        this.spaceList().forEach(function (item) {
            var marker = new google.maps.Marker({
                map: map,
                position: item.location,
                icon: image,
                animation: google.maps.Animation.DROP
            });
            item.marker = marker;
            // Extends the boundaries of the map for each marker
            bounds.extend(marker.position);
            // eventlistener to display info-window and create bounce effect
            marker.addListener("click", function (e) {
                infowindow.setContent(getContent(item));
                infowindow.open(map, marker);
                toggleBounce(marker);
            });
        });

        // Foursquare API request
        self.getFoursquareData = ko.computed(function () {
            self.spaceList().forEach(function (item) {

                // Url building for each list item
                var venueId = item.fs_id + "/?";
                var foursquareUrl = BaseUrl + venueId + fsClient_id + fsClient_secret + fsVersion;

                // AJAX call to Foursquare
                $.ajax({
                    type: "GET",
                    url: foursquareUrl,
                    dataType: "json",
                    cache: false
                }).done(function (data) {
                    var response = data.response ? data.response : "";
                    var venue = response.venue ? data.venue : "";
                    item.name = response.venue.name;
                    item.shortUrl = response.venue.shortUrl;
                    item.photoUrl = response.venue.bestPhoto.prefix + "height200" +
                        response.venue.bestPhoto.suffix;
                }).fail(function () {
                    item.name = "this Item has not been loaded";
                    item.photoUrl = "img/error.jpg";
                    item.shortUrl = "file not found";
                    // $("#url").hide();
                });

            });
        });


        // call function upon clicking the item
        this.itemClick = function (item) {
            var markerId = item.markerId;
            google.maps.event.trigger(item.marker, "click");
        };

        // Filter the list
        self.filter = ko.observable("");
        this.filteredSpaceList = ko.computed(function () {
            var userinput = this.filter().toLowerCase();
            if (!userinput) {
                return ko.utils.arrayFilter(self.spaceList(), function (item) {
                    item.marker.setVisible(true);
                    return true;
                });
            } else {
                return ko.utils.arrayFilter(this.spaceList(), function (item) {
                    if (item.name.toLowerCase().indexOf(userinput) >= 0) {
                        item.marker.setVisible(true);
                        return true;
                    } else {
                        item.marker.setVisible(false);
                        return false;
                    }
                });
            }
        }, this);
    }

    // Apply bindings to the view model
    ko.applyBindings(new ViewModel());
}
function mapError(){
    alert("Google maps has not been loaded!");
};