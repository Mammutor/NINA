// SPDX-FileCopyrightText: 2023 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0

import OLText from "ol/style/Text";
import {
    Box,
    Button,
    Flex,
    Input,
    Slider,
    SliderFilledTrack,
    SliderThumb,
    SliderTrack,
    Switch,
    Text,
    Spinner
} from "@open-pioneer/chakra-integration";
import { MapAnchor, MapContainer, useMapModel } from "@open-pioneer/map";
import { ScaleBar } from "@open-pioneer/scale-bar";
import { InitialExtent, ZoomIn, ZoomOut } from "@open-pioneer/map-navigation";
import { useIntl } from "open-pioneer:react-hooks";
import { CoordinateViewer } from "@open-pioneer/coordinate-viewer";
import { SectionHeading, TitledSection } from "@open-pioneer/react-utils";
import { ToolButton } from "@open-pioneer/map-ui-components";
import { ScaleViewer } from "@open-pioneer/scale-viewer";
import { MAP_ID } from "./services";
import React, { useEffect, useId, useState } from "react";
import { Measurement } from "@open-pioneer/measurement";
import { PiRulerLight } from "react-icons/pi";
import VectorSource from "ol/source/Vector";
import VectorLayer from "ol/layer/Vector.js";
import GeoJSON from "ol/format/GeoJSON";
import Style from "ol/style/Style";
import Fill from "ol/style/Fill";
import Stroke from "ol/style/Stroke";
import CircleStyle from "ol/style/Circle";
import { transform } from "ol/proj";
import { background, Image, useDisclosure } from "@chakra-ui/react";
import Feature from "ol/Feature.js";
import LineString from "ol/geom/LineString.js";
import Select from "react-select";
import { Point } from "ol/geom";
import { createEmpty, extend } from "ol/extent";
import { Divider } from "@chakra-ui/icons";
import { Coordinate } from "ol/coordinate";
import Overlay from "ol/Overlay";
import proj4 from "proj4";
import { motion, AnimatePresence } from "framer-motion";

/**
 * Main component for the map application. It manages state for:
 *  - start/destination addresses
 *  - route calculation
 *  - route rendering
 *  - safety/time ratings
 *  - markers and layers
 */
export function MapApp() {
    const intl = useIntl();
    const measurementTitleId = useId();

    // States
    const [measurementIsActive, setMeasurementIsActive] = useState(false);
    const [startAddress, setStartAddress] = useState("");
    const [startId, setStartId] = useState("");
    const [startCoordinates, setStartCoordinates] = useState([]);
    const [destinationAddress, setDestinationAddress] = useState("");
    const [endId, setEndId] = useState("");
    const [endCoordinates, setEndCoordinates] = useState<number[]>([]);
    const [addressSuggestions, setAddressSuggestions] = useState([]);
    const [coordinatesMap, setCoordinatesMap] = useState<Record<string, string>>({});
    const [filteredDestinations, setFilteredDestinations] = useState([]);
    const [addressToAreaMapping, setAddressToAreaMapping] = useState({});
    const [sliderValue, setSliderValue] = useState(1);
    const [safetyRating, setSafetyRating] = useState("");
    const [timeEfficiencyRating, setTimeEfficiencyRating] = useState("");
    const [nearestNodeMapping, setNearestNodeMapping] = useState({});
    const [isSwitchEnabled, setIsSwitchEnabled] = useState(false);
    const [isSwitchChecked, setIsSwitchChecked] = useState(false);
    const [mapGraph, setMapGraph] = useState();
    const [isLoading, setIsLoading] = useState(false);

    const selectLabels = ["Safest", "Balanced", "Fastest"];
    const isMobilePortrait = window.innerWidth < 768 && window.innerHeight > window.innerWidth;
    const [showPopup, setShowPopup] = useState(false);

    const sliderLabels = ["Safest", "Balanced", "Fastest"];

    // Mobile Components
    const [panelHeight] = useState(150); // Zielhöhe des offenen Panels

    const { map } = useMapModel(MAP_ID);

    // --------------------------------------
    //  General UI and State Management
    // --------------------------------------

    /**
     * Resets all user inputs and route displays on the map.
     */
    function resetInputs() {
        setStartId("");
        setStartAddress("");
        setStartCoordinates([]);
        setEndId("");
        setDestinationAddress("");
        setEndCoordinates([]);
        setSliderValue(0);

        if (startId !== "" && endId !== "") {
            if (isSwitchEnabled) {
                setIsSwitchChecked(false);
            }
            setIsSwitchEnabled((prev) => !prev);
        }

        setSafetyRating("");
        setTimeEfficiencyRating("");

        if (map?.olMap) {
            const layers = map.olMap.getLayers().getArray();

            // Remove all markers
            const markerLayer = layers.find((layer) => layer.get("id") === "markerLayer");
            if (markerLayer) {
                const source = markerLayer.getSource();
                source.clear();
            }

            // Remove address-to-route lines
            const routeLayer = layers.find((layer) => layer.get("id") === "addressToRouteLayer");
            if (routeLayer) {
                const source = routeLayer.getSource();
                source.clear();
            }

            // Remove final route lines
            const targetLayer = layers.find((layer) => layer.get("id") === "routeLayer");
            if (targetLayer) {
                const source = targetLayer.getSource();
                source.clear();
            }

            const view = map.olMap.getView();
            const centerPoint = [846640, 6794700];
            view.setCenter(centerPoint);
            view.setZoom(14.7);
        }
    }

    /**
     * Toggles the measurement tool visibility on the map.
     */
    function toggleMeasurement() {
        setMeasurementIsActive(!measurementIsActive);
    }

    // --------------------------------------
    //  Map and Layer Initialization
    // --------------------------------------

    /**
     * Adds and configures layers on initial load, including:
     *  - plannedAreasLayer
     *  - addressLayer
     *  - streetDataLayer
     */
    useEffect(() => {
        if (!map) return;
        // Set the default slider to 0 (which is 'Safest').
        function initializeDefaults() {
            setSliderValue(0);
        }
        initializeDefaults();

            map.olMap.getView().setMaxZoom(19);

            // Route layer for the final path
            const routeVectorLayer = new VectorLayer({
                source: new VectorSource(),
                visible: true,
                style: styleDefaultBlue(),
            });
            routeVectorLayer.set("id", "routeLayer");
            map.olMap.addLayer(routeVectorLayer);

           

            // Address layer
            const addressVectorSource = new VectorSource({
                url: "./data/matching_hsnr_features_with_address.geojson",
                format: new GeoJSON({
                    dataProjection: "EPSG:3857",
                    featureProjection: "EPSG:3857"
                })
            });

            const addressLayer = new VectorLayer({
                source: addressVectorSource,
                style: new Style({
                    image: new CircleStyle({
                        radius: 1,
                        fill: new Fill({
                            color: "rgba(255, 255, 255, 0.6)"
                        })
                    })
                }),
                visible: false
            });
            map.olMap.addLayer(addressLayer);

            // Street data layer
            const streetDataSource = new VectorSource({
                url: "./data/exportedGeojsonRouting (2).geojson",
                format: new GeoJSON({
                    dataProjection: "EPSG:4326",
                    featureProjection: "EPSG:3857"
                })
            });

            const streetDataLayer = new VectorLayer({
                source: streetDataSource,
                style: styleByCategory,
                visible: false
            });
            streetDataLayer.set("id", "streetDataLayer");
            map.olMap.addLayer(streetDataLayer);
        
    }, [map]);

    /**
     * Click-Event-Listener for the map to set the end address.
     */
    useEffect(() => {
        if (!map) {
            return;
        }
    
        console.log("✅ Map und Daten verfügbar – Klick-Event wird registriert!");
    
        const handleClick = async (event) => {
            console.log("📍 Map clicked at:", event.coordinate);
            const eventCoordinate = proj4("EPSG:3857", "EPSG:4326", event.coordinate);

            try {
                const response = await fetch("https://api.transitous.org/api/v1/reverse-geocode?place="+eventCoordinate[1]+","+eventCoordinate[0]);
                if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
        
                const locationdata = await response.json();         
                const address = locationdata[0].name;
                if (startCoordinates.length === 0) {
                    console.log("🟢 Startpunkt gesetzt:", address);
                    setStartId(locationdata[0].id);
                    setStartAddress(address);
                    setStartCoordinates(event.coordinate);
                } else {
                    console.log("🔴 Endpunkt gesetzt:", address);
                    setEndId(locationdata[0].id);
                    setDestinationAddress(address);
                    setEndCoordinates(event.coordinate);

                }
            } catch (error) {
                console.error('Error fetching route:', error);
            }
        };
    
        map.olMap.on("click", handleClick);
    
        return () => {
            map.olMap.un("click", handleClick);
        };
    }, [map, addressSuggestions, coordinatesMap, nearestNodeMapping, startCoordinates]);
    
    /**
     * If both Coordinates are given, the route will be automatically be searched.
     */
    useEffect(() => {
        if (startCoordinates.length > 0 && endCoordinates.length > 0) {
            console.log("🚀 Beide Punkte gesetzt – Suche startet!");
            calculateRoute();
        }
    }, [startCoordinates, endCoordinates,sliderValue]);
    
    

    /**
     * Updates the style of the route layer when the switch changes.
     */
    useEffect(() => {
        if (map?.olMap) {
            const layers = map.olMap.getLayers().getArray();
            const routeLayer = layers.find((layer) => layer.get("id") === "routeLayer");
            
        }
    }, [isSwitchChecked, map]);

    // --------------------------------------
    //  Routing Calculation
    // --------------------------------------

    /**
     * Returns the weight vector for cost calculation based on the current slider value.
     * @param {number} sliderVal - Slider value in range [0, 2].
     * @returns {number[]} The weight vector (length 3).
     */
    function getWeightVector(sliderVal) {
        switch (sliderVal) {
            case 0:
                return [1.5, 2, 2.5];
            case 1:
                return [1.2, 1.5, 2];
            case 2:
                return [1, 1, 1];
            default:
                return [1, 1, 1];
        }
    }

    /**
     * Main function to calculate and display the route between startId and endId.
     */
    async function calculateRoute() {
        setIsSwitchEnabled(true);
        setIsLoading(true);
        const transformedStartCoordinate = proj4("EPSG:3857", "EPSG:4326", startCoordinates);
        const transformedEndCoordinate = proj4("EPSG:3857", "EPSG:4326", endCoordinates);
        console.log("🚴‍♂️ Startpunkt:", transformedStartCoordinate);

    const isSafe = sliderValue === 0;
        // JSON-Objekt für die Route
        const requestData = {
            locations: [
                { lat: transformedStartCoordinate[1], lon: transformedStartCoordinate[0] },
                { lat: transformedEndCoordinate[1], lon: transformedEndCoordinate[0] }
            ],
            costing: 'bicycle',
            costing_options: { bicycle: { 
                use_roads: isSafe?0.1:0.9,
                use_lit: isSafe?0.9:0.1,
            maneuver_penalty: isSafe?50:1,
                service_factor: isSafe?30:5,
                use_living_streets: isSafe?1:0.6,
                avoid_bad_surfaces: isSafe?1.0:0.0,
                 service_penalty: 1,
                 bicycle_type: isSafe?"City":"Road",
                 cycling_speed: 20

                } },
            directions_options: { units: 'kilometers' },
            shape_format: 'geojson',
            format: 'osrm',
        };
    
        // JSON-Objekt als URL-Parameter kodieren
        const query = encodeURIComponent(JSON.stringify(requestData));
        const valhallaUrl = `https://valhalla1.openstreetmap.de/route?json=${query}`;
        console.log("🔗 Valhalla URL:", valhallaUrl);
        try {
            const response = await fetch(valhallaUrl);
            if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
    
            const data = await response.json();
            const processeddata = data.routes[0];
            setTimeEfficiencyRating(`${(processeddata.distance / 1000)    .toFixed(1).toString()} km / ${(processeddata.duration /60).toFixed(0)
                .toString()} min`);
                
            const geojsonFeature = {
                type: "Feature",
                properties: {},//ggf. weitere properties ergänzen
                geometry: processeddata.geometry
            }
            const features = new GeoJSON().readFeature(geojsonFeature, {
                dataProjection: "EPSG:4326",
                featureProjection: "EPSG:3857"
            });

            const routeLayer = map.olMap.getLayers().getArray().find((layer) => layer.get("id") === "routeLayer");
            const source = routeLayer.getSource();
            source.clear();
            source.addFeature(features);            
    
        } catch (error) {
            console.error('Error fetching route:', error);
        } finally {
            setIsLoading(false);
        }
        zoomToFeatures();
        setShowPopup(true);
    }

    /**
     * Zooms the map to display all the route features with `route = true`.
     */
    function zoomToFeatures() {
        const layers = map.olMap.getLayers().getArray();
        const targetLayer = layers[layers.length - 1];

        if (targetLayer) {
            const source = targetLayer.getSource();
            const allFeatures = source.getFeatures();

            if (allFeatures.length > 0) {
                const extent = createEmpty();
                allFeatures.forEach((feature) => {
                    extend(extent, feature.getGeometry().getExtent());
                });
                // padding is top, right, bottom and left
                let paddingofscreen;
                let paddingofscreenmobile
                if (isMobilePortrait === true) {
                    paddingofscreen = 35;
                    paddingofscreenmobile = 250;
                } else {
                    paddingofscreen = 300;
                    paddingofscreenmobile = 0;

                }
                map.olMap.getView().fit(extent, { padding: [paddingofscreen+paddingofscreenmobile, paddingofscreen, paddingofscreen+paddingofscreenmobile, paddingofscreen], duration: 1000 });
            }
        }
    }

    // --------------------------------------
    //  Utility Functions
    // --------------------------------------

    /**
     * Default style for the route if safety category is not displayed.
     * @returns {Style} A Style object for the route.
     */
    function styleDefaultBlue() {
        return new Style({
            stroke: new Stroke({
                color: "#16a34a",
                width: 5
            })
        });
    }

    /**
     * Returns a style for a street segment based on its category number:
     *  - 4: Cyanblue
     *  - 3: Limegreen
     *  - 2: Orange
     *  - 1: Red
     * @param {Feature} feature - OL feature to style.
     * @returns {Style} The style object for the feature.
     */
    function styleByCategory(feature) {
        const category = feature.get("category_number");
        let color;

        switch (category) {
            case 4:
                color = "rgba(2,157,255)";
                break;
            case 3:
                color = "limegreen";
                break;
            case 2:
                color = "orange";
                break;
            case 1:
                color = "red";
                break;
            default:
                color = "gray";
        }

        return new Style({
            stroke: new Stroke({
                color,
                width: 5
            })
        });
    }

    /**
     * Updates or removes start/end markers on the map based on state changes.
     */
    function updateMarkers() {
        if (!map) return;

        const layers = map.olMap.getLayers().getArray();
        let markerLayer = layers.find((layer) => layer.get("id") === "markerLayer");

        if (!markerLayer) {
            markerLayer = new VectorLayer({
                source: new VectorSource(),
                style: null
            });
            markerLayer.set("id", "markerLayer");
            map.olMap.addLayer(markerLayer);
        }

        const source = markerLayer.getSource();

        // Remove start marker if no coordinates
        if (startCoordinates.length === 0) {
            const startFeature = source.getFeatures().find((f) => f.get("type") === "start");
            if (startFeature) source.removeFeature(startFeature);
        } else {
            let startFeature = source.getFeatures().find((f) => f.get("type") === "start");
            if (!startFeature) {
                startFeature = new Feature({ geometry: new Point(startCoordinates) });
                startFeature.set("type", "start");
                source.addFeature(startFeature);
            } else {
                startFeature.setGeometry(new Point(startCoordinates));
            }
            startFeature.setStyle(
                new Style({
                    image: new CircleStyle({
                        radius: 6,
                        fill: new Fill({ color: "#124a28" })
                    }),
                    text: new OLText({
                        text: "Start",
                        font: "12px Calibri,sans-serif",
                        fill: new Fill({ color: "#042713" }),
                        stroke: new Stroke({ color: "white", width: 3 }),
                        offsetY: -15
                    })
                })
            );
        }

        // Remove end marker if no coordinates
        if (endCoordinates.length === 0) {
            const endFeature = source.getFeatures().find((f) => f.get("type") === "end");
            if (endFeature) source.removeFeature(endFeature);
        } else {
            let endFeature = source.getFeatures().find((f) => f.get("type") === "end");
            if (!endFeature) {
                endFeature = new Feature({ geometry: new Point(endCoordinates) });
                endFeature.set("type", "end");
                source.addFeature(endFeature);
            } else {
                endFeature.setGeometry(new Point(endCoordinates));
            }
            endFeature.setStyle(
                new Style({
                    image: new CircleStyle({
                        radius: 6,
                        fill: new Fill({ color: "#124a28" })
                    }),
                    text: new OLText({
                        text: "End",
                        font: "12px Calibri,sans-serif",
                        fill: new Fill({ color: "#042713" }),
                        stroke: new Stroke({ color: "white", width: 3 }),
                        offsetY: -15
                    })
                })
            );
        }
    }

    useEffect(() => {
        updateMarkers();
    }, [startCoordinates, endCoordinates]);

    // --------------------------------------
    //  Render
    // --------------------------------------

    return (
       
        <Flex height="100vh" width="100vw" position="relative" overflow="hidden">
            {/* Map as background */}
            <Box position="absolute" top="0" left="0" right="0" bottom="0" zIndex="0">
                <MapContainer
                    mapId={MAP_ID}
                    role="main"
                    aria-label={intl.formatMessage({ id: "ariaLabel.map" })}
                >
                    {/* Zoom & Measurement Tools */}
                    
                    <MapAnchor position="bottom-right" horizontalGap={10} verticalGap={35}> 
                        <Flex direction="column" gap={2}>
                            <InitialExtent mapId={MAP_ID} />
                            <ZoomIn mapId={MAP_ID}  />
                            <ZoomOut mapId={MAP_ID} />
                        </Flex>
                    </MapAnchor>
                </MapContainer>

            </Box>

            {/* Floating Panel – Top Left */}
            <Box
                position="absolute"
                top="20px"
                left="20px"
                zIndex="1000"
                backgroundColor="whiteAlpha.900"
                backdropFilter="blur(8px)"
                borderRadius="lg"
                p={5}
                boxShadow="2xl"
                maxW={{ base: "90%", md: "350px" }}
                w="100%"
            >
                <Flex direction="column" gap={4}>
                    <Input
                        value={startAddress}
                        placeholder="Start Address"
                        onChange={(e) => setStartAddress(e.target.value)}
                    />

                    <Input
                        value={destinationAddress}
                        placeholder="Destination"
                        onChange={(e) => setDestinationAddress(e.target.value)}
                        isDisabled={!startAddress}
                    />

                    <Flex align="center" justify="space-between" gap={4}>
                        <Flex direction="column" align="center">
                            <Text fontSize="sm" mb={1}>Safe Route</Text>
                            <Switch
                                size="lg"
                                colorScheme="green"
                                isChecked={sliderValue === 0}
                                onChange={(e) => setSliderValue(e.target.checked ? 0 : 2)}
                            />
                        </Flex>

                        <Button
                            colorScheme="green"
                            borderRadius="full"
                            size="lg"
                            px={6}
                            isLoading={isLoading}
                            isDisabled={!startAddress || !destinationAddress}
                            onClick={() => {
                                calculateRoute();
                            }}
                        >
          Go!
                        </Button>
                    </Flex>
                </Flex>
            </Box>

            {/* Route Info Popup – Bottom Left */}
            {showPopup && (
                isMobilePortrait ? (
                    <AnimatePresence>
                        <motion.div
                            style={{
                                position: "fixed",
                                bottom: "0",
                                left: "0",
                                right: "0",
                                zIndex: "1000",
                                backgroundColor: "white",
                                borderTopLeftRadius: "1.5rem",
                                borderTopRightRadius: "1.5rem",
                                height: `${panelHeight}px`,
                                padding: "1.25rem",
                                boxShadow: "0 -2px 10px rgba(0,0,0,0.2)"
                            }}
                            
                            drag="y"
                            dragConstraints={{ top: 0, bottom: 110 }}
                        >
                            <Box textAlign="center" mb={5}>
                                <Box
                                    width="40px"
                                    height="4px"
                                    backgroundColor="gray.400"
                                    borderRadius="full"
                                    mx="auto"
                                />
                            </Box>
                  
                            <Flex direction="column" gap={3} justify="space-between" align="center">
                            {timeEfficiencyRating || "Time/Distance"}
                            <Button  colorScheme="red" onClick={() => { resetInputs(); setShowPopup(false); }}>Reset</Button>                                       
                                
                            </Flex>
                        </motion.div>
                    </AnimatePresence>
                ) : (
                // Desktop / Landscape Mode
                    <Flex
                        position="absolute"
                        bottom="20px"
                        left="20px"
                        zIndex="1000"
                        direction="row"
                        gap={4}
                        align="start"
                    >
                        <Box
                            backgroundColor="whiteAlpha.900"
                            backdropFilter="blur(6px)"
                            borderRadius="lg"
                            p={4}
                            boxShadow="xl"
                            minW="150px"
                            maxW="450px"
                            height="120px"
                        >
                            <Flex direction="column" gap={3} justify="space-between" align="center">
                            {timeEfficiencyRating || "Time/Distance"}
                            
                                    <Button  colorScheme="red" onClick={() => { resetInputs(); setShowPopup(false); }}>
                        Reset
                                    </Button>                                       
                                
                            </Flex>
                        </Box>
                    </Flex>
                )
            )}
        </Flex>
    );
}
