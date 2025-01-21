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
import { Image } from "@chakra-ui/react";
import Feature from "ol/Feature.js";
import LineString from "ol/geom/LineString.js";
import Select from "react-select";
import { Point } from "ol/geom";
import { createEmpty, extend } from "ol/extent";
import {Divider} from "@chakra-ui/icons";

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
    const [endCoordinates, setEndCoordinates] = useState([]);
    const [addressSuggestions, setAddressSuggestions] = useState([]);
    const [coordinatesMap, setCoordinatesMap] = useState({});
    const [filteredDestinations, setFilteredDestinations] = useState([]);
    const [addressToAreaMapping, setAddressToAreaMapping] = useState({});
    const [sliderValue, setSliderValue] = useState(1);
    const [safetyRating, setSafetyRating] = useState("");
    const [timeEfficiencyRating, setTimeEfficiencyRating] = useState("");
    const [nearestNodeMapping, setNearestNodeMapping] = useState({});
    const [isSwitchEnabled, setIsSwitchEnabled] = useState(false);
    const [isSwitchChecked, setIsSwitchChecked] = useState(false);
    const [mapGraph, setMapGraph] = useState(new Map());
    const [isLoading, setIsLoading] = useState(false);

    const sliderLabels = ["Safest", "Balanced", "Fastest"];

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

        if(startId !== "" && endId !== ""){
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
        // Set the default slider to 0 (which is 'Safest').
        function initializeDefaults() {
            setSliderValue(0);
        }
        initializeDefaults();

        if (map?.layers) {
            map.olMap.getView().setMaxZoom(19);

            // Route layer for the final path
            const routeVectorLayer = new VectorLayer({
                source: new VectorSource(),
                style: (feature) =>
                    isSwitchChecked ? styleByCategory(feature) : styleDefaultBlue(feature),
            });
            routeVectorLayer.set("id", "routeLayer");
            map.olMap.addLayer(routeVectorLayer);

            // Add planned Areas Layer
            const layers = map.olMap.getLayers().getArray();
            let plannedAreasLayer = layers.find(layer => layer.get('id') === "plannedAreasLayer");

            if (!plannedAreasLayer) {
                const plannedAreasVectorSource = new VectorSource({
                    url: './data/plannedAreas.geojson',
                    format: new GeoJSON({
                        dataProjection: 'EPSG:3857',
                        featureProjection: 'EPSG:3857'
                    }),
                });

                plannedAreasLayer = new VectorLayer({
                    source: plannedAreasVectorSource,
                    visible: true,
                });

                plannedAreasLayer.set('id', 'plannedAreasLayer');
                map.olMap.addLayer(plannedAreasLayer);
            }

            // Always apply the correct style
            plannedAreasLayer.setStyle(new Style({
                fill: new Fill({
                    color: 'rgba(108,121,115,0.2)', // Semi-transparent gray
                }),
                stroke: new Stroke({
                    color: '#000000',
                    width: 1,
                }),
            }))

            // Address layer
            const addressVectorSource = new VectorSource({
                url: "./data/matching_hsnr_features_with_address.geojson",
                format: new GeoJSON({
                    dataProjection: "EPSG:3857",
                    featureProjection: "EPSG:3857",
                }),
            });

            const addressLayer = new VectorLayer({
                source: addressVectorSource,
                style: new Style({
                    image: new CircleStyle({
                        radius: 1,
                        fill: new Fill({
                            color: "rgba(255, 255, 255, 0.6)",
                        }),
                    }),
                }),
                visible: false,
            });
            map.olMap.addLayer(addressLayer);

            // Street data layer
            const streetDataSource = new VectorSource({
                url: "./data/exportedGeojsonRouting (2).geojson",
                format: new GeoJSON({
                    dataProjection: "EPSG:3857",
                    featureProjection: "EPSG:3857",
                }),
            });

            const streetDataLayer = new VectorLayer({
                source: streetDataSource,
                style: styleByCategory,
                visible: false,
            });
            streetDataLayer.set("id", "streetDataLayer");
            map.olMap.addLayer(streetDataLayer);
        }
    }, [map]);

    /**
     * Updates the style of the route layer when the switch changes.
     */
    useEffect(() => {
        if (map?.olMap) {
            const layers = map.olMap.getLayers().getArray();
            const routeLayer = layers.find((layer) => layer.get("id") === "routeLayer");
            if (routeLayer) {
                routeLayer.setStyle((feature) =>
                    isSwitchChecked ? styleByCategory(feature) : styleDefaultBlue(feature)
                );
            }
        }
    }, [isSwitchChecked, map]);

    // --------------------------------------
    //  Address Data and Filtering
    // --------------------------------------

    /**
     * Loads the address data from CSV and stores it in several mappings:
     *  - address -> area
     *  - address -> nearest node
     *  - address -> coordinates
     *  - suggestions array for the UI
     */
    function fillAdressInput() {
        fetch("./data/Matched_Addresses_in_Planned_Areas.csv")
            .then((response) => response.text())
            .then((data) => {
                const rows = data.split("\n").slice(1); // skip header
                const mapping = {};
                const nearestNodeMap = {};
                const coordsMap = {};
                const addresses = [];

                rows.forEach((row) => {
                    const [address, plannedAreaId, nearest_node, coordinates] = row.split(";");
                    if (address && plannedAreaId) {
                        const trimmedAddress = address.trim();
                        mapping[trimmedAddress] = plannedAreaId.trim();

                        if (nearest_node) {
                            nearestNodeMap[trimmedAddress] = nearest_node.trim();
                        }
                        if (coordinates) {
                            coordsMap[trimmedAddress] = coordinates.trim();
                        }
                        addresses.push(trimmedAddress);
                    }
                });

                setAddressToAreaMapping(mapping);
                setNearestNodeMapping(nearestNodeMap);
                setAddressSuggestions(addresses);
                setCoordinatesMap(coordsMap);
            })
            .catch((error) => console.error("Error loading CSV data:", error));
    }

    /**
     * Filters destination addresses based on the selected start address's area.
     */
    useEffect(() => {
        if (startAddress) {
            const selectedAreaId = addressToAreaMapping[startAddress];
            const filtered = Object.keys(addressToAreaMapping).filter(
                (address) => addressToAreaMapping[address] === selectedAreaId
            );
            setFilteredDestinations(filtered);
        } else {
            setFilteredDestinations([]);
        }
    }, [startAddress, addressToAreaMapping]);

    /**
     * Initial data load for addresses from CSV.
     */
    useEffect(() => {
        fillAdressInput();
    }, []);

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
    function calculateRoute() {
        setIsSwitchEnabled(true);
        setIsLoading(true);

        // Calculate approximate distance (in meters) between the addresses.
        let distance = calculateDistance(startId, endId);
        // Increase "abort distance" to accommodate potential route expansions.
        distance *= 2;

        const weightVector = getWeightVector(sliderValue);

        fetch("./data/graph (40).json")
            .then((response) => {
                if (!response.ok) {
                    throw new Error("Error loading the file");
                }
                return response.json();
            })
            .then((graphObject) => {
                const calculatedGraph = new Map(Object.entries(graphObject));
                setMapGraph(calculatedGraph);

                const paretoFront = new Map();
                paretoFront.set(startId, [
                    {
                        costVector: new Array(5).fill(0),
                        predecessor: null,
                    },
                ]);

                const queue = [];
                queue.push({ node: startId, costVector: paretoFront.get(startId)[0].costVector });

                // Pareto search
                while (queue.length > 0) {
                    const current = queue.shift();
                    const { node: currentNode, costVector: currentCostVec } = current;

                    // Skip if we exceed distance threshold
                    if (currentCostVec[4] > distance) {
                        continue;
                    }

                    const edges = calculatedGraph.get(currentNode) || [];
                    edges.forEach((edge) => {
                        const nextNode = edge.node;
                        const edgeCostVec = getUnweightedCostVector(edge.length, edge.category, weightVector);
                        const newCostVec = vectorAdd(currentCostVec, edgeCostVec);

                        if (!paretoFront.has(nextNode)) {
                            paretoFront.set(nextNode, []);
                        }
                        const currentPareto = paretoFront.get(nextNode);

                        let dominatedByExisting = false;
                        const dominatingIndices = [];

                        for (let i = 0; i < currentPareto.length; i++) {
                            const existingVec = currentPareto[i].costVector;
                            if (dominates(existingVec, newCostVec)) {
                                dominatedByExisting = true;
                                break;
                            }
                            if (dominates(newCostVec, existingVec)) {
                                dominatingIndices.push(i);
                            }
                        }

                        if (!dominatedByExisting) {
                            // Remove vectors dominated by the new one
                            for (let i = dominatingIndices.length - 1; i >= 0; i--) {
                                currentPareto.splice(dominatingIndices[i], 1);
                            }
                            currentPareto.push({
                                costVector: newCostVec,
                                predecessor: currentNode,
                            });
                            queue.push({ node: nextNode, costVector: newCostVec });
                        }
                    });
                }

                if (!paretoFront.has(endId)) {
                    console.error("No valid route to the destination found.");
                } else {
                    const endPareto = paretoFront.get(endId);
                    const bestPath = endPareto.reduce((best, entry) => {
                        return entry.costVector[0] < best.costVector[0] ? entry : best;
                    }, endPareto[0]);

                    // Reconstruct and highlight
                    const pathNodes = reconstructPath(paretoFront, startId, endId, calculatedGraph);
                    highlightPath(
                        [pathNodes.find((p) => p.costVector === bestPath.costVector)],
                        calculatedGraph
                    );
                    zoomToFeatures();
                }
                setIsLoading(false);
            })
            .catch((error) => {
                setIsLoading(false);
                console.error("Error loading graph data:", error);
            });
    }

    /**
     * Computes an unweighted cost vector for a given edge.
     * @param {number} length - Edge length in meters.
     * @param {number} category - Category number (1 to 4).
     * @param {number[]} weights - Weight vector based on user preference.
     * @returns {number[]} Cost vector of length 5.
     */
    function getUnweightedCostVector(length, category, weights) {
        const costVector = new Array(5).fill(0);
        costVector[4] = length;

        switch (category) {
            case 1:
                // Red
                costVector[3] = length;
                costVector[2] = costVector[3] * weights[2];
                costVector[1] = costVector[2] * weights[1];
                costVector[0] = costVector[1] * weights[0];
                break;
            case 2:
                // Orange
                costVector[2] = length;
                costVector[1] = costVector[2] * weights[1];
                costVector[0] = costVector[1] * weights[0];
                break;
            case 3:
                // Light green
                costVector[1] = length;
                costVector[0] = costVector[1] * weights[0];
                break;
            case 4:
                // Green
                costVector[0] = length;
                break;
            default:
                break;
        }
        return costVector;
    }

    /**
     * Checks if cost vector A dominates cost vector B in a Pareto sense.
     * @param {number[]} vecA - Cost vector A.
     * @param {number[]} vecB - Cost vector B.
     * @returns {boolean} True if A dominates B, otherwise false.
     */
    function dominates(vecA, vecB) {
        let strictlyBetter = false;
        for (let i = 0; i < vecA.length; i++) {
            if (vecA[i] > vecB[i]) {
                return false;
            }
            if (vecA[i] < vecB[i]) {
                strictlyBetter = true;
            }
        }
        return strictlyBetter;
    }

    /**
     * Adds two cost vectors element-wise.
     * @param {number[]} vecA - First cost vector.
     * @param {number[]} vecB - Second cost vector.
     * @returns {number[]} Summed cost vector.
     */
    function vectorAdd(vecA, vecB) {
        return vecA.map((val, idx) => val + vecB[idx]);
    }

    /**
     * Reconstructs the paths from the Pareto front for a given start and end node.
     * @param {Map} paretoFront - Pareto front map.
     * @param {string} start - Start node ID.
     * @param {string} end - End node ID.
     * @param {Map<string, any>} graph - The routing graph as a map.
     * @returns {object[]} Array of path objects containing { path: string[], costVector: number[] }.
     */
    function reconstructPath(paretoFront, start, end, graph) {
        const results = [];
        const endPareto = paretoFront.get(end);
        if (!endPareto) {
            console.error("No path to the destination node found.");
            return results;
        }

        endPareto.forEach((entry) => {
            const path = [];
            let currentEntry = entry;
            let currentNode = end;

            while (currentEntry) {
                path.push(currentNode);
                currentNode = currentEntry.predecessor;
                if (!currentNode) break;

                const predecessorPareto = paretoFront.get(currentNode);
                if (!predecessorPareto) {
                    console.error("No Pareto entry for predecessor node:", currentNode);
                    break;
                }

                currentEntry = predecessorPareto.find((e) =>
                    arraysEqual(
                        vectorAdd(e.costVector, getEdgeCost(currentNode, path[path.length - 1], graph)),
                        currentEntry.costVector
                    )
                );
            }

            results.push({
                path: path.reverse(),
                costVector: entry.costVector,
            });
        });

        return results;
    }

    /**
     * Checks if two arrays are equal in length and elements.
     * @param {number[]} arr1 - First array.
     * @param {number[]} arr2 - Second array.
     * @returns {boolean} True if arrays are equal, otherwise false.
     */
    function arraysEqual(arr1, arr2) {
        if (arr1.length !== arr2.length) return false;
        return arr1.every((val, idx) => val === arr2[idx]);
    }

    /**
     * Retrieves the cost vector for a given edge in the graph.
     * @param {string} fromNode - The origin node ID.
     * @param {string} toNode - The destination node ID.
     * @param {Map<string, any>} graph - The routing graph.
     * @returns {number[] | null} The cost vector or null if not found.
     */
    function getEdgeCost(fromNode, toNode, graph) {
        const edges = graph.get(fromNode) || [];
        const edge = edges.find((e) => e.node === toNode);
        return edge
            ? getUnweightedCostVector(edge.length, edge.category, getWeightVector(sliderValue))
            : null;
    }

    /**
     * Highlights the chosen path(s) on the map.
     * Draws line features for the route and lines between address points and route start/end.
     * Also updates safety/time rating states.
     *
     * @param {object[]} paths - Array of path objects from reconstructPath().
     * @param {Map<string, any>} graph - The routing graph as a map.
     */
    function highlightPath(paths, graph) {
        const layers = map.olMap.getLayers().getArray();
        const targetLayer = layers.find((layer) => layer.get("id") === "routeLayer");

        if (!targetLayer) {
            console.error('Layer with ID "routeLayer" not found.');
            return;
        }

        const source = targetLayer.getSource();
        source.clear();

        paths.forEach((singlePath) => {
            const routeSegments = [];
            for (let i = 0; i < singlePath.path.length - 1; i++) {
                const fromNode = singlePath.path[i];
                const toNode = singlePath.path[i + 1];
                const edges = graph.get(fromNode);
                if (!edges) continue;

                const edge = edges.find((e) => e.node === toNode);
                if (!edge) continue;

                const cat = edge.category;
                const fromCoord = fromNode.split(",").map(Number);
                const toCoord = toNode.split(",").map(Number);
                const lineSegment = new LineString([fromCoord, toCoord]);
                const segmentFeature = new Feature({
                    geometry: lineSegment,
                });

                segmentFeature.set("category_number", cat);
                segmentFeature.set("route", "true");
                routeSegments.push(segmentFeature);
            }
            source.addFeatures(routeSegments);

            // Lines from addresses to route start/end
            if (startId && startCoordinates && endId && endCoordinates) {
                const startIdCoordinates = startId.split(",").map(Number);
                const endIdCoordinates = endId.split(",").map(Number);
                const startLineString = new LineString([startCoordinates, startIdCoordinates]);
                const endLineString = new LineString([endCoordinates, endIdCoordinates]);

                let addressToRouteLayer = layers.find(
                    (layer) => layer.get("id") === "addressToRouteLayer"
                );
                if (!addressToRouteLayer) {
                    addressToRouteLayer = new VectorLayer({
                        source: new VectorSource(),
                        style: new Style({
                            stroke: new Stroke({
                                color: "lightblue",
                                width: 6,
                                lineDash: [1, 10],
                            }),
                        }),
                    });
                    addressToRouteLayer.set("id", "addressToRouteLayer");
                    map.olMap.addLayer(addressToRouteLayer);
                }
                const addressToRouteSource = addressToRouteLayer.getSource();
                addressToRouteSource.clear();
                addressToRouteSource.addFeatures([
                    new Feature({ geometry: startLineString }),
                    new Feature({ geometry: endLineString }),
                ]);
            }

            // Update Ratings
            const estimatedTime = calculateEstimatedTime(paths[0].costVector[4]);
            setTimeEfficiencyRating(
                `${(paths[0].costVector[4] / 1000).toFixed(2)} km (~${estimatedTime} min)`
            );
            setSafetyRating(`Safety Rating: ${calculateSafetyScore(paths[0].costVector).toFixed(1)}`);
        });
    }

    /**
     * Zooms the map to display all the route features with `route = true`.
     */
    function zoomToFeatures() {
        const layers = map.olMap.getLayers().getArray();
        const targetLayer = layers.find((layer) => layer.get("id") === "routeLayer");

        if (targetLayer) {
            const source = targetLayer.getSource();
            const allFeatures = source.getFeatures();
            const routeFeatures = allFeatures.filter((feature) => feature.get("route") === "true");

            if (routeFeatures.length > 0) {
                const extent = createEmpty();
                routeFeatures.forEach((feature) => {
                    extend(extent, feature.getGeometry().getExtent());
                });
                map.olMap.getView().fit(extent, { padding: [50, 50, 50, 50], duration: 1000 });
            }
        }
    }

    // --------------------------------------
    //  Utility Functions
    // --------------------------------------

    /**
     * Calculates the distance in meters between two coordinate-string IDs.
     * @param {string} startIdStr - "lon,lat" string of the start node.
     * @param {string} endIdStr - "lon,lat" string of the end node.
     * @returns {number} Distance in meters.
     */
    function calculateDistance(startIdStr, endIdStr) {
        const [startLon, startLat] = transform(
            [parseFloat(startIdStr.split(",")[0]), parseFloat(startIdStr.split(",")[1])],
            "EPSG:3857",
            "EPSG:4326"
        );
        const [endLon, endLat] = transform(
            [parseFloat(endIdStr.split(",")[0]), parseFloat(endIdStr.split(",")[1])],
            "EPSG:3857",
            "EPSG:4326"
        );

        const R = 6371e3; // Earth's radius in meters
        const φ1 = (startLat * Math.PI) / 180;
        const φ2 = (endLat * Math.PI) / 180;
        const Δφ = ((endLat - startLat) * Math.PI) / 180;
        const Δλ = ((endLon - startLon) * Math.PI) / 180;

        const a =
            Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

    /**
     * Estimates travel time on a bike at ~15 km/h.
     * @param {number} distanceInMeters - Distance of the route.
     * @returns {number} Estimated travel time in minutes.
     */
    function calculateEstimatedTime(distanceInMeters) {
        const distanceInKm = distanceInMeters / 1000;
        const averageSpeedKmH = 15;
        const timeInHours = distanceInKm / averageSpeedKmH;
        return Math.round(timeInHours * 60);
    }

    /**
     * Computes a safety score (in the range [1.0 - 6.0]) based on the cost vector and user preference.
     * @param {number[]} costVector - The final cost vector for the route.
     * @returns {number} A floating-point safety score.
     */
    function calculateSafetyScore(costVector) {
        const weightVector = getWeightVector(0);
        let safetyScore = 0.0;
        let calculatedDistance;

        switch (sliderValue) {
            case 0: // safest
            case 1: // balanced
            case 2: // fastest
                calculatedDistance = calcBackWeights(costVector, weightVector, sliderValue);
                safetyScore = calculatedDistance / costVector[4];
                break;
            default:
                break;
        }

        // Normalize to [1.0 - 6.0]
        safetyScore = 1.0 + ((safetyScore - 1.0) / (7.5 - 1.0)) * (6.0 - 1.0);
        return safetyScore;
    }

    /**
     * Converts the forward cost vector back to real distances in each category.
     * Multiplies them by the relevant weight factors.
     *
     * @param {number[]} costVector - The final cost vector from the Pareto search.
     * @param {number[]} weights - Weight vector from getWeightVector().
     * @param {number} sliderVal - The current slider position.
     * @returns {number} The total “re-summed” distance used for safety calculation.
     */
    function calcBackWeights(costVector, weights, sliderVal) {
        const weightVector = getWeightVector(sliderVal);

        const cat1 = costVector[3];
        const cat2 = costVector[2] - cat1 * weightVector[2];
        const cat3 = costVector[1] - cat2 * weightVector[1] - cat1 * weightVector[2] * weightVector[1];
        const cat4 =
            costVector[0] -
            cat3 * weightVector[0] -
            cat2 * weightVector[1] * weightVector[0] -
            cat1 * weightVector[2] * weightVector[1] * weightVector[0];

        return (
            cat1 * weights[0] * weights[1] * weights[2] +
            cat2 * weights[1] * weights[2] +
            cat3 * weights[2] +
            cat4
        );
    }

    /**
     * Chooses a background color for the safety rating input field.
     * @param {number} safetyScore - Computed safety score.
     * @returns {string} CSS color value.
     */
    function getSafetyRatingColor(safetyScore) {
        if (safetyScore >= 1.0 && safetyScore < 2.5) {
            return "lightgreen";
        } else if (safetyScore >= 2.5 && safetyScore < 4.0) {
            return "#f3db57";
        } else if (safetyScore >= 4.0) {
            return "#f66f57";
        }
        return "white";
    }

    /**
     * Default style for the route if safety category is not displayed.
     * @returns {Style} A Style object for the route.
     */
    function styleDefaultBlue() {
        return new Style({
            stroke: new Stroke({
                color: "rgba(0, 0, 255, 0.8)",
                width: 5,
            }),
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
                width: 5,
            }),
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
                style: null,
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
                        fill: new Fill({ color: "black" }),
                    }),
                    text: new OLText({
                        text: "Start",
                        font: "12px Calibri,sans-serif",
                        fill: new Fill({ color: "black" }),
                        stroke: new Stroke({ color: "white", width: 3 }),
                        offsetY: -15,
                    }),
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
                        fill: new Fill({ color: "black" }),
                    }),
                    text: new OLText({
                        text: "End",
                        font: "12px Calibri,sans-serif",
                        fill: new Fill({ color: "black" }),
                        stroke: new Stroke({ color: "white", width: 3 }),
                        offsetY: -15,
                    }),
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
        <Flex height="100%" direction="column" overflow="hidden" width="100%">
            <Flex
                backgroundColor="white"
                borderWidth="1px"
                borderRadius="md"
                boxShadow="sm"
                padding={4}
                margin={4}
                maxWidth="2000px"
                justifyContent="space-between"
                alignItems="flex-start"
            >
                {/* Address Fields */}
                <Box marginBottom="20px">
                    <Text fontSize="lg" fontWeight="bold" marginBottom="10px">
                        Enter Start and Destination Address
                    </Text>
                    <Select
                        value={startId ? { value: startId, label: startAddress } : null}
                        options={addressSuggestions.map((address) => ({
                            value: nearestNodeMapping[address],
                            label: address,
                        }))}
                        onChange={(selectedOption) => {
                            setStartId(selectedOption ? selectedOption.value : "");
                            setStartAddress(selectedOption ? selectedOption.label : "");
                            if (selectedOption && coordinatesMap[selectedOption.label]) {
                                const coords = coordinatesMap[selectedOption.label]
                                    .split(",")
                                    .map(Number);
                                setStartCoordinates(coords);
                            } else {
                                setStartCoordinates([]);
                            }
                        }}
                        placeholder="Enter your start address"
                        isClearable
                        styles={{
                            container: (provided) => ({
                                ...provided,
                                marginBottom: "16px",
                            }),
                        }}
                    />

                    <Select
                        value={endId ? { value: endId, label: destinationAddress } : null}
                        options={filteredDestinations.map((address) => ({
                            value: nearestNodeMapping[address],
                            label: address,
                        }))}
                        onChange={(selectedOption) => {
                            setEndId(selectedOption ? selectedOption.value : "");
                            setDestinationAddress(selectedOption ? selectedOption.label : "");
                            if (selectedOption && coordinatesMap[selectedOption.label]) {
                                const coords = coordinatesMap[selectedOption.label]
                                    .split(",")
                                    .map(Number);
                                setEndCoordinates(coords);
                            } else {
                                setEndCoordinates([]);
                            }
                        }}
                        placeholder="Enter your destination address"
                        isClearable
                        isDisabled={!startAddress}
                        styles={{
                            container: (provided) => ({
                                ...provided,
                                marginBottom: "16px",
                            }),
                        }}
                    />
                </Box>

                {/* Slider and Buttons */}
                <Flex ml={8} direction="row" alignItems="flex-start" maxWidth="400px">
                    <Box mr={4}>
                        <Text fontSize="lg" fontWeight="bold" mb={2}>
                            Route Preference
                        </Text>
                        <Flex justifyContent="space-between" alignItems="center" mb={2}>
                            <Text fontSize="2xl" role="img" aria-label="helmet-icons">
                                <Image
                                    src="./data/Helmet.png"
                                    alt="Safety Icon"
                                    boxSize="25px"
                                    display="inline"
                                />
                            </Text>
                            <Text fontSize="2xl" role="img" aria-label="rocket-icons">
                                <Image
                                    src="./data/Rocket.png"
                                    alt="Fast Icon"
                                    boxSize="25px"
                                    display="inline"
                                />
                            </Text>
                        </Flex>
                        <Slider
                            value={sliderValue}
                            min={0}
                            max={2}
                            step={1}
                            onChange={(val) => setSliderValue(val)}
                        >
                            <SliderTrack>
                                <SliderFilledTrack />
                            </SliderTrack>
                            <SliderThumb />
                        </Slider>
                        <Text mt={2} textAlign="center">
                            {sliderLabels[sliderValue]}
                        </Text>
                    </Box>
                </Flex>

                <Flex direction="column" alignItems="center">
                    <Text fontSize="lg" fontWeight="bold" mb={5} textAlign="center">
                        Start
                    </Text>
                    <Box position="relative" display="inline-block">
                        {/* Spinner um den Button, wenn isLoading true ist */}
                        {isLoading && (
                            <Box
                                position="absolute"
                                top="45%"
                                left="50%"
                                transform="translate(-50%, -50%)"
                                zIndex="1"
                            >
                                <Spinner size="xl" color="blue.500" width="100px" // Zusätzliche Kontrolle der Breite
                                         height="100px"/>
                            </Box>
                        )}
                        <Button
                            colorScheme="green"
                            mb={4}
                            onClick={calculateRoute}
                            borderRadius="full"
                            w="75px"
                            h="75px"
                            isDisabled={isLoading || !startAddress || !destinationAddress} // Button deaktivieren bei isLoading
                            position="relative"
                            zIndex={isLoading ? "0" : "auto"}
                        >
                            Go!
                        </Button>
                    </Box>
                </Flex>



                {/* Route Rating */}
                <Box maxWidth="400px">
                    <Text fontSize="lg" fontWeight="bold" mb={2} textAlign="center">
                        Route Rating
                    </Text>
                    <Input
                        id="safetyRating"
                        placeholder="Safety Rating (1.0 - 6.0)"
                        value={safetyRating}
                        textAlign={"center"}
                        mb={4}
                        readOnly={true}
                        style={{
                            backgroundColor: getSafetyRatingColor(
                                parseFloat(safetyRating.split(" ")[2])
                            ),
                        }}
                    />
                    <Input
                        id="timeEfficiencyRating"
                        placeholder="Distance (Time)"
                        value={timeEfficiencyRating}
                        textAlign={"center"}
                        readOnly={true}
                        maxWidth="1000px"
                    />
                </Box>

                {/* Options */}
                <Flex direction="column">
                    <Text fontSize="lg" fontWeight="bold" mb={2} textAlign="center">
                        Options
                    </Text>
                    <Button colorScheme="red" mb={4} onClick={resetInputs}>
                        Reset Input
                    </Button>
                    <Box>
                        <Flex direction="column" alignItems="center" mb={1}>
                            <Text mb={2} textAlign="center">
                                Show Street Safety Category
                            </Text>
                            <Switch
                                size="lg"
                                colorScheme="green"
                                isDisabled={!isSwitchEnabled}
                                isChecked={isSwitchChecked}
                                onChange={(e) => setIsSwitchChecked(e.target.checked)}
                            />
                        </Flex>
                    </Box>
                </Flex>
            </Flex>

            {/* Map Container */}
            <Box
                backgroundColor="white"
                borderWidth="1px"
                borderRadius="lg"
                boxShadow="lg"
                overflow="hidden"
                height="100%"
                width="98.4%"
                alignSelf="center"
            >
                <MapContainer
                    mapId={MAP_ID}
                    role="main"
                    aria-label={intl.formatMessage({ id: "ariaLabel.map" })}
                >
                    <MapAnchor position="top-left" horizontalGap={5} verticalGap={5}>
                        {measurementIsActive && (
                            <Box
                                backgroundColor="white"
                                borderWidth="1px"
                                borderRadius="lg"
                                padding={2}
                                boxShadow="lg"
                                role="top-left"
                                aria-label={intl.formatMessage({ id: "ariaLabel.topLeft" })}
                            >
                                <Box role="dialog" aria-labelledby={measurementTitleId}>
                                    <TitledSection
                                        title={
                                            <SectionHeading id={measurementTitleId} size="md" mb={2}>
                                                {intl.formatMessage({ id: "measurementTitle" })}
                                            </SectionHeading>
                                        }
                                    >
                                        <Measurement mapId={MAP_ID} />
                                    </TitledSection>
                                </Box>
                            </Box>
                        )}
                    </MapAnchor>

                    <MapAnchor position="bottom-right" horizontalGap={10} verticalGap={30}>
                        <Flex
                            role="bottom-right"
                            aria-label={intl.formatMessage({ id: "ariaLabel.bottomRight" })}
                            direction="column"
                            gap={1}
                            padding={1}
                        >
                            <ToolButton
                                label={intl.formatMessage({ id: "measurementTitle" })}
                                icon={<PiRulerLight />}
                                isActive={measurementIsActive}
                                onClick={toggleMeasurement}
                            />
                            <InitialExtent mapId={MAP_ID} />
                            <ZoomIn mapId={MAP_ID} />
                            <ZoomOut mapId={MAP_ID} />
                        </Flex>
                    </MapAnchor>
                    {/* Legende hinzufügen */}
                    <MapAnchor position="top-right" horizontalGap={10} verticalGap={10}>
                        <Box
                            top="20px"
                            left="20px"
                            backgroundColor="white"
                            padding="10px"
                            borderRadius="8px"
                            boxShadow="md"
                            zIndex="10"
                            opacity="0.7"
                            visibility={isSwitchChecked ? "hidden" : "visible"}
                            display={!isSwitchEnabled ? "none" : "block"}
                        >
                            <Text fontWeight="bold" marginBottom="4">
                                Legend
                            </Text>
                            <Flex alignItems="center" marginBottom="2">
                                <Box
                                    width="16px"
                                    height="16px"
                                    backgroundColor="black"
                                    marginRight="8px"
                                    borderRadius="50%"
                                ></Box>
                                <Text>Start/End Point</Text>
                            </Flex>
                            <Divider marginBottom="2" />
                            <Flex alignItems="center" marginBottom="2">
                                <Box
                                    width="16px"
                                    height="16px"
                                    backgroundColor="blue"
                                    marginRight="8px"
                                    borderRadius="50%"
                                ></Box>
                                <Text>Route</Text>
                            </Flex>
                        </Box>
                    </MapAnchor>
                    <MapAnchor position="top-right" horizontalGap={10} verticalGap={10}>
                        <Box
                            top="20px"
                            left="20px"
                            backgroundColor="white"
                            padding="10px"
                            borderRadius="8px"
                            boxShadow="md"
                            zIndex="10"
                            opacity="0.7"
                            visibility={isSwitchChecked ? "visible" : "hidden"}
                            display={!isSwitchEnabled ? "none" : "block"}
                        >
                            <Text fontWeight="bold" marginBottom="4">
                                Legend
                            </Text>
                            <Flex alignItems="center" marginBottom="2">
                                <Box
                                    width="16px"
                                    height="16px"
                                    backgroundColor="black"
                                    marginRight="8px"
                                    borderRadius="50%"
                                ></Box>
                                <Text>Start/End Point</Text>
                            </Flex>
                            <Divider marginBottom="2" />
                            <Flex alignItems="center" marginBottom="2">
                                <Box
                                    width="16px"
                                    height="16px"
                                    backgroundColor="rgba(2,157,255)"
                                    marginRight="8px"
                                    borderRadius="50%"
                                    opacity={1.0}
                                ></Box>
                                <Text>Separated Bike Lane</Text>
                            </Flex>
                            <Flex alignItems="center" marginBottom="2">
                                <Box
                                    width="16px"
                                    height="16px"
                                    backgroundColor="limegreen"
                                    marginRight="8px"
                                    borderRadius="50%"
                                    opacity={1.0}
                                ></Box>
                                <Text>Integrated Bike Lane</Text>
                            </Flex>
                            <Flex alignItems="center" marginBottom="2">
                                <Box
                                    width="16px"
                                    height="16px"
                                    backgroundColor="orange"
                                    marginRight="8px"
                                    borderRadius="50%"
                                    opacity={1.0}
                                ></Box>
                                <Text>Calm Street</Text>
                            </Flex>
                            <Flex alignItems="center">
                                <Box
                                    width="16px"
                                    height="16px"
                                    backgroundColor="red"
                                    marginRight="8px"
                                    borderRadius="50%"
                                    opacity={1.0}
                                ></Box>
                                <Text>Unsafe Street</Text>
                            </Flex>
                        </Box>
                    </MapAnchor>
                </MapContainer>
            </Box>

            {/* Footer */}
            <Flex
                role="region"
                aria-label={intl.formatMessage({ id: "ariaLabel.footer" })}
                gap={3}
                alignItems="center"
                justifyContent="center"
            >
                <CoordinateViewer mapId={MAP_ID} precision={2} />
                <ScaleBar mapId={MAP_ID} />
                <ScaleViewer mapId={MAP_ID} />
            </Flex>
        </Flex>
    );
}


/*
            Dieser Code wird benötigt um category hinzuzufügen. wird in der fertigen applikation aber nicht benötigt.
            */
/*
 // Sobald die Daten ready sind ...
 vectorSource2.once('change', function () {


   if (vectorSource2.getState() === 'ready') {
     const features = vectorSource2.getFeatures();
     console.log(features)

     const relevantProps = [
       'bicycle',
       'cycleway',
       'cycleway_left',
       'cycleway_right',
       'bicycle_road',
       'cycleway_right_bicycle',
       'cycleway_left_bicycle'
     ];

     // Kategorien
     const withoutCycleHighwayGroup = [];
     const withoutCycleOther = [];
     const cyclePropsYesDesignated = [];
     const cyclePropsOther = [];

     features.forEach((feature) => {
       const properties = feature.getProperties();
       console.log(properties)

       // Prüfen, ob eine relevante Rad-Property vorhanden ist
       const hasCycleProp = relevantProps.some((prop) => {
         return properties[prop] != null && properties[prop] !== '';
       });

       if (!hasCycleProp) {
         // Keine Radinfrastruktur, weiter unterteilen nach highway-Werten
         const highway = properties.highway;
         if (
           highway === 'residential' ||
           highway === 'living_street' ||
           highway === 'bridleway' ||
           highway === 'track'
         ) {
           feature.set('category_number', 2);
           withoutCycleHighwayGroup.push(feature);
         } else {
           feature.set('category_number', 1);
           withoutCycleOther.push(feature);
         }
       } else {
         // Hat Radinfrastruktur, nun verfeinern:
         const bicycleValue = properties.bicycle;
         const bicycleRoadValue = properties.bicycle_road;

         const isYesOrDesignated =
           bicycleValue === 'yes' ||
           bicycleValue === 'designated' ||
           bicycleRoadValue === 'yes' ||
           bicycleRoadValue === 'designated';

         if (isYesOrDesignated) {
           feature.set('category_number', 4);
           cyclePropsYesDesignated.push(feature);
         } else {
           feature.set('category_number', 3);
           cyclePropsOther.push(feature);
         }
       }

       // Style anwenden
       streetDataLayer.setStyle(styleByCategory);
     });

     const geoJSONFormat = new GeoJSON();

     // Features als GeoJSON exportieren
     const geojsonStr = geoJSONFormat.writeFeatures(features);
     const blob = new Blob([geojsonStr], { type: 'application/json' });

     // URL für den Blob erstellen
     const url = URL.createObjectURL(blob);

     // Temporären Link erstellen
     const link = document.createElement('a');
     link.href = url;
     link.download = 'exportedGeojsonRouting.geojson';

     // Link zum Dokument hinzufügen und Klick simulieren
     document.body.appendChild(link);
     link.click();

     // Link wieder entfernen
     document.body.removeChild(link);

     // URL freigeben
     URL.revokeObjectURL(url);
   }
 });
 */

/* 
Dieser Code wird benötigt um den Graphen zu erstellen. 
IN der normalen Applikation jedoch nicht notwendig, weil dieser dann schon erstellt wurde:

fetch('./data/exportedGeojsonRouting (2).geojson') // Relativer Pfad zur Datei
  .then((response) => {
    if (!response.ok) {
      throw new Error('Fehler beim Laden der GeoJSON-Datei');
    }
    return response.json();
  })
  .then((geojsonData) => {
    const graph = buildGraphFromGeoJSON(geojsonData);
    const graphObject = Object.fromEntries(graph); // Konvertiere Map in ein einfaches Objekt

    const graphJSON = JSON.stringify(graphObject, null, 2); // Formatiere als JSON

    // JSON-Datei erstellen und Download auslösen
    const blob = new Blob([graphJSON], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'graph.json';
    link.click();

    // Graph-Statistik ausgeben
    let edgeCount = 0;
    graph.forEach((edges) => {
      edgeCount += edges.length;
    });
  })
  .catch((error) => console.error('Fehler:', error));
  
  
  function buildGraphFromGeoJSON(geojson) {
        const graph = new Map();

        geojson.features.forEach((feature) => {
            const geometry = feature.geometry;
            const properties = feature.properties;

            if (geometry.type === "LineString") {
                const coordinates = geometry.coordinates;
                const length = properties.length;
                const category = properties.category_number;

                
                for (let i = 0; i < coordinates.length - 1; i++) {
                    const fromCoord = coordToId(coordinates[i]); 
                    const toCoord = coordToId(coordinates[i + 1]);

                    if (!graph.has(fromCoord)) {
                        graph.set(fromCoord, []);
                    }
                    graph.get(fromCoord).push({node: toCoord, length, category});

                    if (!graph.has(toCoord)) {
                        graph.set(toCoord, []);
                    }
                    graph.get(toCoord).push({node: fromCoord, length, category});
                }
            }
        });

        return graph;
    }
*/
