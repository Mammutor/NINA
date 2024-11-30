// SPDX-FileCopyrightText: 2023 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0
import { Box, Button, Divider, Flex, FormControl, FormLabel, Text, Input, Slider, SliderTrack, SliderFilledTrack, SliderThumb} from "@open-pioneer/chakra-integration";
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
import React, {useEffect, useId, useMemo, useState} from "react";
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
export function MapApp() {
    const intl = useIntl();
    const measurementTitleId = useId();

    const [measurementIsActive, setMeasurementIsActive] = useState<boolean>(false);
    const [startAddress, setStartAddress] = useState<string>('');
    const [destinationAddress, setDestinationAddress] = useState<string>('');
    const [sliderValue, setSliderValue] = useState<number>(1);
    const [safetyRating, setSafetyRating] = useState<string>('');
    const [timeEfficiencyRating, setTimeEfficiencyRating] = useState<string>('');

    const sliderLabels = ["Fastest", "Balanced", "Safest"];

    const resetInputs = () => {
        setStartAddress('');
        setDestinationAddress('');
    };

    const changeArea = () => {
        alert("Button Clicked");
    };
    function toggleMeasurement() {
        setMeasurementIsActive(!measurementIsActive);
    }
    
    const { map } = useMapModel(MAP_ID);

    useEffect(() => {

        if (map?.layers) {
            console.log(map)
            // Setze maximalen Zoom
            map.olMap.getView().setMaxZoom(19);

            /// GeoJSON-Datei aus Ordner laden
            const vectorSource = new VectorSource({
                url: './data/plannedAreas.geojson', // Pfad zu deinem GeoJSON
                format: new GeoJSON({
                    dataProjection: 'EPSG:3857',
                    featureProjection: 'EPSG:3857'
                })
            });
            
            console.log(vectorSource.getExtent())



            // Layer für GeoJSON
            const geojsonLayer = new VectorLayer({
                source: vectorSource,
                style: new Style({
                    fill: new Fill({
                        color: 'rgba(0, 123, 255, 0.5)'
                    }),
                    stroke: new Stroke({
                        color: '#007bff',
                        width: 2
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
            map.olMap.addLayer(geojsonLayer);
            
        } else return;
    }, [map]);

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
                {/* Routing Box */}
                <Box maxWidth="400px">
                    <Text fontSize="lg" fontWeight="bold" mb={2}  textAlign="center">
                        Enter Route Information
                    </Text>
                    <Input
                        id="startAddressInput"
                        placeholder="Please enter your starting address"
                        value={startAddress}
                        onChange={(e) => setStartAddress(e.target.value)}
                        mb={4}
                    />
                    <Input
                        id="destinationAddressInput"
                        placeholder="Please enter your destination address"
                        value={destinationAddress}
                        onChange={(e) => setDestinationAddress(e.target.value)}
                    />
                </Box>

                <Flex direction="column" gap={2}>
                    <Text fontSize="lg" fontWeight="bold" mb={2}  textAlign="center">
                        Options
                    </Text>
                    <Button colorScheme="blue" onClick={resetInputs}>
                        Reset Input
                    </Button>
                    <Button colorScheme="green" onClick={changeArea}>
                        Change Area
                    </Button>
                </Flex>

                {/* Slider and Buttons */}
                <Flex ml={8} direction="row" alignItems="flex-start" maxWidth="400px">
                    <Box mr={4}>
                        <Text fontSize="lg" fontWeight="bold" mb={2}>
                            Route Preference
                        </Text>
                        <Slider
                            defaultValue={1}
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


                <Box maxWidth="400px">
                    <Text fontSize="lg" fontWeight="bold" mb={2}  textAlign="center">
                        Route Information
                    </Text>
                    <Input
                        id="safetyRating"
                        placeholder="Safety Rating not set yet" 
                        value={safetyRating}
                        mb={4}
                        readonly
                    />
                    <Input
                        id="timeEfficiencyRating"
                        placeholder="Time Efficiency Rating not set yet"
                        value={timeEfficiencyRating}
                        readonly={true}
                        maxWidth="1000px"
                    />
                </Box>
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
                    aria-label={intl.formatMessage({id: "ariaLabel.map"})}
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
                                aria-label={intl.formatMessage({id: "ariaLabel.topLeft"})}
                            >
                                <Box role="dialog" aria-labelledby={measurementTitleId}>
                                    <TitledSection
                                        title={
                                            <SectionHeading
                                                id={measurementTitleId}
                                                size="md"
                                                mb={2}
                                            >
                                                {intl.formatMessage({id: "measurementTitle"})}
                                            </SectionHeading>
                                        }
                                    >
                                        <Measurement mapId={MAP_ID}/>
                                    </TitledSection>
                                </Box>
                            </Box>
                        )}
                    </MapAnchor>
                    <MapAnchor position="bottom-right" horizontalGap={10} verticalGap={30}>
                        <Flex
                            role="bottom-right"
                            aria-label={intl.formatMessage({id: "ariaLabel.bottomRight"})}
                            direction="column"
                            gap={1}
                            padding={1}
                        >
                            <ToolButton
                                label={intl.formatMessage({id: "measurementTitle"})}
                                icon={<PiRulerLight/>}
                                isActive={measurementIsActive}
                                onClick={toggleMeasurement}
                            />
                            <Geolocation mapId={MAP_ID}/>
                            <InitialExtent mapId={MAP_ID}/>
                            <ZoomIn mapId={MAP_ID}/>
                            <ZoomOut mapId={MAP_ID}/>
                        </Flex>
                    </MapAnchor>
                </MapContainer>
            </Box>
            <Flex
                role="region"
                aria-label={intl.formatMessage({id: "ariaLabel.footer"})}
                gap={3}
                alignItems="center"
                justifyContent="center"
            >
                <CoordinateViewer mapId={MAP_ID} precision={2}/>
                <ScaleBar mapId={MAP_ID}/>
                <ScaleViewer mapId={MAP_ID}/>
            </Flex>
            
        </Flex>
    );
}
