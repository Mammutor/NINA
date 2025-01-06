// SPDX-FileCopyrightText: 2023 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0
import { Box, Button, Divider, Flex, FormControl, FormLabel, Text, Input, Slider, SliderTrack, SliderFilledTrack, SliderThumb } from "@open-pioneer/chakra-integration";
import { MapAnchor, MapContainer, useMapModel } from "@open-pioneer/map";
import { ScaleBar } from "@open-pioneer/scale-bar";
import { InitialExtent, ZoomIn, ZoomOut } from "@open-pioneer/map-navigation";
import { useIntl } from "open-pioneer:react-hooks";
import { CoordinateViewer } from "@open-pioneer/coordinate-viewer";
import { SectionHeading, TitledSection } from "@open-pioneer/react-utils";
import { ToolButton } from "@open-pioneer/map-ui-components";
import { ScaleViewer } from "@open-pioneer/scale-viewer";
import { Geolocation } from "@open-pioneer/geolocation";
import { Notifier } from "@open-pioneer/notifier";
import { OverviewMap } from "@open-pioneer/overview-map";
import { MAP_ID } from "./services";
import React, { useEffect, useId, useMemo, useState } from "react";
import TileLayer from "ol/layer/Tile";
import { Measurement } from "@open-pioneer/measurement";
import OSM from "ol/source/OSM";
import { PiRulerLight } from "react-icons/pi";
import { BasemapSwitcher } from "@open-pioneer/basemap-switcher";
import { mapLogic } from "./mapLogic";
import VectorSource from "ol/source/Vector";
import VectorLayer from "ol/layer/Vector.js";
import GeoJSON from 'ol/format/GeoJSON';
import Style from 'ol/style/Style';
import Fill from 'ol/style/Fill';
import Stroke from 'ol/style/Stroke';
import CircleStyle from 'ol/style/Circle';
import { transform } from 'ol/proj';
import { isEmpty } from 'ol/extent';
import { Image } from "@chakra-ui/react";
import Select from "react-select";


export function MapApp() {

    const intl = useIntl();
    const measurementTitleId = useId();

    const [measurementIsActive, setMeasurementIsActive] = useState<boolean>(false);
    const [startAddress, setStartAddress] = useState<string>('');
    const [destinationAddress, setDestinationAddress] = useState<string>('');
    const [addressSuggestions, setAddressSuggestions] = useState([]);
    const [filteredDestinations, setFilteredDestinations] = useState([]);
    const [addressToAreaMapping, setAddressToAreaMapping] = useState({});
    const [sliderValue, setSliderValue] = useState<number>(1);
    const [safetyRating, setSafetyRating] = useState<string>('');
    const [timeEfficiencyRating, setTimeEfficiencyRating] = useState<string>('');


    const sliderLabels = ["Safest", "Balanced", "Fastest"];

    const resetInputs = () => {
        setStartAddress("");
        setDestinationAddress("");
        setSliderValue(0);
    };

    function toggleMeasurement() {
        setMeasurementIsActive(!measurementIsActive);
    };

    const calculateRoute = () => {
        alert("Start Route Clicked");
    }

    const { map } = useMapModel(MAP_ID);

    useEffect(() => {
        // Set Defaultvalue Scalebar to Safe
        const initializeDefaults = () => {
            setSliderValue(0); // Setzt den Slider auf den mittleren Wert
        };

        initializeDefaults();

        if (map?.layers) {
            // Setze maximalen Zoom
            map.olMap.getView().setMaxZoom(19);

            // Add planned Areas Layer
            const plannedAreasVectorSource = new VectorSource({
                url: './data/plannedAreas.geojson', // Pfad zu deinem GeoJSON
                format: new GeoJSON({
                    dataProjection: 'EPSG:3857',
                    featureProjection: 'EPSG:3857'
                })
            });

            // Layer für GeoJSON
            const plannedAreasLayer = new VectorLayer({
                source: plannedAreasVectorSource,
                style: new Style({
                    fill: new Fill({
                        color: 'rgba(55, 67, 61, 0.8)'
                    }),
                    image: new CircleStyle({
                        radius: 6,
                        fill: new Fill({
                            color: '#ffcc33'
                        })
                    })
                })
            });

            // GeoJSON-Layer zur Karte hinzufügen
            map.olMap.addLayer(plannedAreasLayer);

            // Add address Layer
            const addressVectorSource = new VectorSource({
                url: './data/matching_hsnr_features_with_address.geojson', // Pfad zu deinem GeoJSON
                format: new GeoJSON({
                    dataProjection: 'EPSG:3857',
                    featureProjection: 'EPSG:3857'
                })
            });

            // Layer für GeoJSON
            const addressLayer = new VectorLayer({
                source: addressVectorSource,
                style: new Style({
                    image: new CircleStyle({
                        radius: 1,
                        fill: new Fill({
                            color: 'rgba(255, 255, 255, 0.6)'
                        })
                    })
                })
            });

            // GeoJSON-Layer zur Karte hinzufügen
            map.olMap.addLayer(addressLayer);

            // Add Street data layer
            const vectorSource2 = new VectorSource({
                url: './data/updated_graph_with_single_address.geojson',
                format: new GeoJSON({
                    dataProjection: 'EPSG:4326',
                    featureProjection: 'EPSG:3857'
                })
            });

            const streetDataLayer = new VectorLayer({
                source: vectorSource2
            });


            map.olMap.addLayer(streetDataLayer);

            function styleByCategory(feature) {
                var category = feature.get('category_number');
                var color;

                switch (category) {
                    case 4:
                        color = 'blue';
                        break;
                    case 3:
                        color = 'rgba(34, 192, 13, 0.8)';
                        break;
                    case 2:
                        color = 'yellow';
                        break;
                    case 1:
                        color = 'red';
                        break;
                    default:
                        color = 'gray';
                }

                return new Style({
                    stroke: new Stroke({
                        color: color,
                        width: 2
                    }),
                    fill: new Fill({
                        color: color
                    })
                });
            }

            vectorSource2.once('change', function () {
                if (vectorSource2.getState() === 'ready') {
                    var features = vectorSource2.getFeatures();

                    var relevantProps = [
                        'bicycle',
                        'cycleway',
                        'cycleway_left',
                        'cycleway_right',
                        'bicycle_road',
                        'cycleway_right_bicycle',
                        'cycleway_left_bicycle'
                    ];

                    // Kategorien
                    var withoutCycleHighwayGroup = [];
                    var withoutCycleOther = [];
                    var cyclePropsYesDesignated = [];
                    var cyclePropsOther = [];

                    features.forEach(function (feature) {
                        var properties = feature.getProperties();

                        // Prüfen, ob eine relevante Rad-Property vorhanden ist
                        var hasCycleProp = relevantProps.some(function (prop) {
                            return properties[prop] != null && properties[prop] !== '';
                        });

                        if (!hasCycleProp) {
                            // Keine Radinfrastruktur, weiter unterteilen nach highway-Werten
                            var highway = properties['highway'];
                            if (highway === 'residential' ||
                                highway === 'living_street' ||
                                highway === 'bridleway' ||
                                highway === 'track') {
                                feature.set('category_number', 2);
                                withoutCycleHighwayGroup.push(feature);
                            } else {
                                feature.set('category_number', 1);
                                withoutCycleOther.push(feature);
                            }
                        } else {
                            // Hat Radinfrastruktur, nun verfeinern:
                            var bicycleValue = properties['bicycle'];
                            var bicycleRoadValue = properties['bicycle_road'];

                            var isYesOrDesignated = (bicycleValue === 'yes' || bicycleValue === 'designated') ||
                                (bicycleRoadValue === 'yes' || bicycleRoadValue === 'designated');

                            if (isYesOrDesignated) {
                                feature.set('category_number', 4);
                                cyclePropsYesDesignated.push(feature);
                            } else {
                                feature.set('category_number', 3);
                                cyclePropsOther.push(feature);
                            }
                        }

                        streetDataLayer.setStyle(styleByCategory);
                    });
                }
            });

        } else return;
    }, [map]);

    useEffect(() => {
        // Fetch addresses and their planned_area_id from the CSV file
        fillAdressInput();
        
        
    }, []);

    useEffect(() => {
        // Filter destination addresses based on the area of the selected start address
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

    function fillAdressInput(){
        console.log("gedrückt")
        fetch("./data/Matched_Addresses_in_Planned_Areas.csv")
            .then((response) => response.text())
            .then((data) => {
                const rows = data.split("\n").slice(1); 
                const mapping = {};
                const addresses = rows.map((row) => {
                    const [address, plannedAreaId] = row.split(",");
                    if (address && plannedAreaId) {
                        mapping[address] = plannedAreaId.trim();
                        return address;
                    }
                    return null;
                }).filter((address) => address);
                setAddressToAreaMapping(mapping);
                setAddressSuggestions(addresses);
            });
    }

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
                <Box marginBottom="20px">
                    <Text fontSize="lg" fontWeight="bold" marginBottom="10px">
                        Enter Start and Destination Address
                    </Text>
                    <Select
                        // Bei Single-Select: value erwartet ein Objekt oder null
                        // Wir wandeln state (string) in {value, label} um
                        value={
                            startAddress
                                ? { value: startAddress, label: startAddress }
                                : null
                        }
                        options={addressSuggestions.map((address) => ({
                            value: address,
                            label: address,
                        }))}
                        onChange={(selectedOption) =>
                            setStartAddress(selectedOption ? selectedOption.value : "")
                        }
                        placeholder="Please enter your starting address"
                        isClearable
                    />
                    <Select
                        // Auch hier: Wir brauchen ein Objekt oder null
                        value={
                            destinationAddress
                                ? { value: destinationAddress, label: destinationAddress }
                                : null
                        }
                        options={filteredDestinations.map((address) => ({
                            value: address,
                            label: address,
                        }))}
                        onChange={(selectedOption) =>
                            setDestinationAddress(selectedOption ? selectedOption.value : "")
                        }
                        placeholder="Please enter your destination address"
                        isClearable
                        isDisabled={!startAddress}
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

                {/* Start */}
                <Flex direction="column">
                    <Text fontSize="lg" fontWeight="bold" mb={5} textAlign="center">
                        Start
                    </Text>
                    <Button
                        colorScheme="green"
                        mb={4}
                        onClick={calculateRoute}
                        borderRadius="full"
                        w="75px"
                        h="75px"
                    >
                        Go!
                    </Button>
                </Flex>

                {/* Route Rating */}
                <Box maxWidth="400px">
                    <Text fontSize="lg" fontWeight="bold" mb={2} textAlign="center">
                        Route Rating
                    </Text>
                    <Input
                        id="safetyRating"
                        placeholder="Safety Rating not set yet"
                        value={safetyRating}
                        mb={4}
                        readOnly={true}
                    />
                    <Input
                        id="timeEfficiencyRating"
                        placeholder="Time Efficiency Rating not set yet"
                        value={timeEfficiencyRating}
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
                </Flex>
            </Flex>

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
                                            <SectionHeading
                                                id={measurementTitleId}
                                                size="md"
                                                mb={2}
                                            >
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
                            <Geolocation mapId={MAP_ID} />
                            <InitialExtent mapId={MAP_ID} />
                            <ZoomIn mapId={MAP_ID} />
                            <ZoomOut mapId={MAP_ID} />
                        </Flex>
                    </MapAnchor>
                </MapContainer>
            </Box>
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
