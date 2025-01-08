import geopandas as gpd
import pandas as pd
from shapely.ops import nearest_points

# Laden der Adressen und Nodes
addresses_path = './opt/public/data/matching_hsnr_features_with_address.geojson'
nodes_path = './opt/public/data/nodes_separate.geojson'

# Laden der GeoJSON-Dateien als GeoDataFrames
addresses_gdf = gpd.read_file(addresses_path)
nodes_gdf = gpd.read_file(nodes_path)

# Funktion zur Berechnung des nächstgelegenen Punktes
def find_nearest_node(address_point, nodes_gdf):
    # Berechne den nächstgelegenen Punkt
    nearest_geom = nearest_points(address_point, nodes_gdf.geometry.unary_union)[1]
    return nearest_geom

# Iteriere durch jede Adresse und finde den nächstgelegenen Node
addresses_gdf['nearest_node_geom'] = addresses_gdf.geometry.apply(lambda x: find_nearest_node(x, nodes_gdf))

# Speichere die Koordinaten als "x,y"-Format
addresses_gdf['nearest_node'] = addresses_gdf['nearest_node_geom'].apply(lambda x: f"{x.x},{x.y}")

# Entferne zusätzliche Geometriespalte vor dem Speichern
addresses_gdf = addresses_gdf.drop(columns=['nearest_node_geom'])

# Speichern der aktualisierten GeoJSON-Datei
output_path = './opt/public/data/matching_hsnr_features_with_address.geojson'
addresses_gdf.to_file(output_path, driver='GeoJSON')

print(f"Updated file saved to: {output_path}")

##### in csv #####
csv_path = "./opt/public/data/Matched_Addresses_in_Planned_Areas.csv"
csv_df = pd.read_csv(csv_path)
geojson_gdf = gpd.read_file(output_path)

address_to_nearest_node = geojson_gdf.set_index('ADDRESS')['nearest_node'].to_dict()

csv_df['nearest_node'] = csv_df['address'].map(address_to_nearest_node)
csv_df.to_csv(csv_path, index=False)

print(f"Updated CSV saved to: {csv_path}")