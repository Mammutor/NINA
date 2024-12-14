import csv
import geopandas as gpd

# Pfade zur Dateien
csv_file_path = 'C:/Users/tobia/Desktop/SaBiNE/preprocesing_data/data/unique_names.csv'
geojson_names_file_path = 'C:/Users/tobia/Desktop/SaBiNE/preprocesing_data/data/strassen_opendata.geojson'
geojson_hsnr_file_path = 'C:/Users/tobia/Desktop/SaBiNE/preprocesing_data/data/hsnr_opendata.geojson'
geojson_planned_areas_path = "C:/Users/tobia/Desktop/SaBiNE/opt/public/data/plannedAreas.geojson"

# 1. Straßennamen aus CSV laden
street_names = []
with open(csv_file_path, 'r', encoding='utf-8') as csvfile:
    reader = csv.reader(csvfile)
    for row in reader:
        street_names = row

# 2. Straßennamen-GeoJSON laden und matching Features filtern
geojson_gdf = gpd.read_file(geojson_names_file_path)
geojson_street_names = geojson_gdf['NAME']
matching_names = set(street_names).intersection(geojson_street_names)
matching_features = geojson_gdf[geojson_gdf['NAME'].isin(matching_names)]

# 3. Hausnummern-GeoJSON laden und matching Hausnummern filtern
hsnr_gdf = gpd.read_file(geojson_hsnr_file_path)
matching_hsnr_features = hsnr_gdf[hsnr_gdf['H_STRSCHL'].isin(matching_features['STR_SCHL'])]

# 4. Verknüpfung: Alle Attribute aus `hsnr_gdf` + `NAME` aus `matching_features`
matching_hsnr_features_with_names = matching_hsnr_features.merge(
    matching_features[['STR_SCHL', 'NAME']],  # Nur STR_SCHL und NAME verwenden
    left_on='H_STRSCHL',
    right_on='STR_SCHL',
    how='left'
)

# 5. Hinzufügen des neuen Attributs `ADDRESS`
matching_hsnr_features_with_names['ADDRESS'] = (
    matching_hsnr_features_with_names['NAME'] + ' ' +
    matching_hsnr_features_with_names['H_HSNR'].astype(str) +
    matching_hsnr_features_with_names['H_ZUS'].fillna('')
)

# 6. Entfernen der Spalte `STR_SCHL`
matching_hsnr_features_with_names = matching_hsnr_features_with_names.drop(columns=['STR_SCHL'])

# 7. Laden der geplanten Bereiche (Polygone)
planned_areas = gpd.read_file(geojson_planned_areas_path)

# 8. Transformieren von `matching_hsnr_features_with_names` nach EPSG:3857
matching_hsnr_features_with_names = matching_hsnr_features_with_names.to_crs(epsg=3857)

# 9. Spatial Filter: Nur Features, deren Geometrie innerhalb der geplanten Polygone liegt
filtered_features = matching_hsnr_features_with_names[
    matching_hsnr_features_with_names.geometry.apply(
        lambda x: any(x.within(area) for area in planned_areas.geometry)
    )
]

# 10. Transformieren des Ergebnisses nach EPSG:3857 (falls notwendig)
filtered_features = filtered_features.to_crs(epsg=3857)

# 11. Speichern der Ergebnisse
print(f"Anzahl übereinstimmender Hausnummern-Features nach spatial filter: {len(filtered_features)}")
filtered_features.to_file(
    'C:/Users/tobia/Desktop/SaBiNE/opt/public/data/matching_hsnr_features_with_address.geojson',
    driver='GeoJSON'
)
