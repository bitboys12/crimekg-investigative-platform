import os
import csv
import json
import math
from typing import Dict, List, Any, Optional, Set, Tuple
from collections import defaultdict, Counter

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(CURRENT_DIR, ".."))

class GraphService:
    def __init__(self, data_dir: str):
        self.data_dir = data_dir
        self.csv_path = os.path.join(data_dir, "crime_dataset.csv")
        self.fir_path = os.path.join(data_dir, "fir_reports.txt")
        self.json_path = os.path.join(data_dir, "crime_kg_nodes_edges.json")

        self.neo4j_connected = False
        self.neo4j_driver = None
        self.neo4j_database = None

        # Load .env file if present
        self._load_env_file()
        self._init_neo4j()

        # In-memory storage for resilient fallback & lightning fast queries
        self.cases: Dict[str, Dict[str, Any]] = {}
        self.nodes: Dict[str, Dict[str, Any]] = {}
        self.adj: Dict[str, List[Dict[str, Any]]] = defaultdict(list)
        self.edges: List[Dict[str, Any]] = []

        self.suspect_to_cases: Dict[str, List[str]] = defaultdict(list)
        self.vehicle_to_suspects: Dict[str, Set[str]] = defaultdict(set)
        self.suspect_to_vehicles: Dict[str, Set[str]] = defaultdict(set)
        self.location_to_cases: Dict[str, List[str]] = defaultdict(list)
        self.beat_to_cases: Dict[str, List[str]] = defaultdict(list)
        self.district_to_cases: Dict[str, List[str]] = defaultdict(list)
        self.crime_type_to_cases: Dict[str, List[str]] = defaultdict(list)

        self._load_local_data()

        # ML Model state (Logistic Regression link prediction)
        self.ml_model = None
        self.ml_model_loaded = False
        self.ml_feature_names = []
        self.ml_metrics = {}
        self._load_ml_model()

    def _load_ml_model(self):
        """Loads trained Logistic Regression model from pipeline/ml/."""
        possible_paths = [
            os.path.join(PROJECT_ROOT, "pipeline", "ml", "criminal_network_link_prediction_final.pkl"),
            os.path.join(CURRENT_DIR, "..", "pipeline", "ml", "criminal_network_link_prediction_final.pkl"),
            os.path.join(CURRENT_DIR, "criminal_network_link_prediction_final.pkl")
        ]
        for p in possible_paths:
            if os.path.exists(p):
                try:
                    import joblib
                    artifact = joblib.load(p)
                    if isinstance(artifact, dict) and "model" in artifact:
                        self.ml_model = artifact["model"]
                        self.ml_feature_names = artifact.get("feature_names", [])
                        self.ml_metrics = artifact.get("metrics", {})
                    else:
                        self.ml_model = artifact
                    self.ml_model_loaded = True
                    print(f"Loaded trained link-prediction ML model from {p}")
                    return
                except Exception as e:
                    print(f"Failed to load ML model from {p}: {e}")
        print("Trained ML model artifact not found. ML inference will report artifact unavailable.")

    def _load_env_file(self):
        env_path = os.path.join(os.path.dirname(__file__), ".env")
        if os.path.exists(env_path):
            with open(env_path, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith("#") and "=" in line:
                        k, v = line.split("=", 1)
                        os.environ.setdefault(k.strip(), v.strip())

    def _init_neo4j(self):
        uri = os.getenv("NEO4J_URI")
        user = os.getenv("NEO4J_USER") or os.getenv("NEO4J_USERNAME", "neo4j")
        password = os.getenv("NEO4J_PASSWORD")
        self.neo4j_database = os.getenv("NEO4J_DATABASE")

        if uri and password:
            try:
                from neo4j import GraphDatabase
                self.neo4j_driver = GraphDatabase.driver(uri, auth=(user, password))
                # Verify live session
                with self.neo4j_driver.session(database=self.neo4j_database) as session:
                    res = session.run("RETURN 1 AS test").single()
                    if res and res["test"] == 1:
                        self.neo4j_connected = True
                        print(f"Connected to live Neo4j database at {uri} (Database: {self.neo4j_database})")
            except Exception as e:
                print(f"Neo4j connection attempt failed: {e}. Running in local fallback mode.")
                self.neo4j_connected = False
                self.neo4j_driver = None

    @staticmethod
    def _clean_props(props: Any) -> Any:
        if isinstance(props, dict):
            return {k: GraphService._clean_props(v) for k, v in props.items()}
        elif isinstance(props, list):
            return [GraphService._clean_props(v) for v in props]
        elif hasattr(props, "isoformat"):
            return props.isoformat()
        elif hasattr(props, "__str__") and not isinstance(props, (int, float, bool, str, type(None))):
            return str(props)
        return props

    def get_health_status(self) -> Dict[str, Any]:
        """Distinguishes authoritative live Neo4j database from fallback dataset snapshot."""
        if self.neo4j_connected and self.neo4j_driver:
            try:
                with self.neo4j_driver.session(database=self.neo4j_database) as s:
                    total_n = s.run("MATCH (n) RETURN count(n) AS c").single()["c"]
                    total_r = s.run("MATCH ()-[r]->() RETURN count(r) AS c").single()["c"]
                    cases_c = s.run("MATCH (n:CrimeIncident) RETURN count(n) AS c").single()["c"]
                    suspects_c = s.run("MATCH (n:Suspect) RETURN count(n) AS c").single()["c"]
                    locations_c = s.run("MATCH (n:Location) RETURN count(n) AS c").single()["c"]
                    vehicles_c = s.run("MATCH (n:Vehicle) RETURN count(n) AS c").single()["c"]
                    beats_c = s.run("MATCH (n:PoliceBeat) RETURN count(n) AS c").single()["c"]
                    crime_types_c = s.run("MATCH (n:CrimeType) RETURN count(n) AS c").single()["c"]
                    classes_c = s.run("MATCH (n:Class) RETURN count(n) AS c").single()["c"]

                    return {
                        "status": "operational",
                        "neo4j_connected": True,
                        "data_mode": "Live Neo4j Graph",
                        "authoritative_neo4j_metrics": {
                            "nodes": total_n,
                            "relationships": total_r,
                            "database": self.neo4j_database,
                            "notes": "Includes crime Knowledge Graph combined with ontology/schema triples (RDF/OWL classes & properties)."
                        },
                        "domain_dataset_metrics": {
                            "cases": cases_c,
                            "suspects": suspects_c,
                            "locations": locations_c,
                            "vehicles": vehicles_c,
                            "police_beats": beats_c,
                            "crime_types": crime_types_c,
                            "ontology_classes": classes_c
                        },
                        "fallback_snapshot_metrics": {
                            "nodes": len(self.nodes),
                            "edges": len(self.edges),
                            "notes": "Older static graph snapshot (1,530 nodes / 2,127-2,500 edges)."
                        }
                    }
            except Exception as e:
                print(f"Error reading live Neo4j health: {e}. Reverting to fallback report.")

        return {
            "status": "operational",
            "neo4j_connected": False,
            "data_mode": "Local Knowledge Graph Snapshot",
            "authoritative_neo4j_metrics": {
                "nodes": 1670,
                "relationships": 5639,
                "notes": "Includes crime Knowledge Graph combined with ontology/schema triples (RDF/OWL classes & properties)."
            },
            "domain_dataset_metrics": {
                "cases": len(self.cases),
                "suspects": len([n for n in self.nodes.values() if n["type"] == "SUSPECT"]),
                "locations": len([n for n in self.nodes.values() if n["type"] == "LOCATION"]),
                "vehicles": len([n for n in self.nodes.values() if n["type"] == "VEHICLE"]),
                "police_beats": len([n for n in self.nodes.values() if n["type"] == "POLICE_BEAT"]),
                "crime_types": len([n for n in self.nodes.values() if n["type"] == "CRIME_TYPE"]),
                "ontology_classes": 13
            },
            "fallback_snapshot_metrics": {
                "nodes": len(self.nodes),
                "edges": len(self.edges),
                "notes": "Older static graph snapshot (1,530 nodes / 2,127-2,500 edges)."
            }
        }

    def _load_local_data(self):
        """Loads records from crime_dataset.csv and builds graph indexes."""
        if not os.path.exists(self.csv_path):
            return

        with open(self.csv_path, "r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                c_num = row["case_number"]
                if not c_num:
                    continue
                
                # Normalize boolean
                row["arrest"] = row.get("arrest", "False").lower() == "true"
                row["domestic"] = row.get("domestic", "False").lower() == "true"
                self.cases[c_num] = row

                # 1. Case Node
                self._add_node(c_num, f"Case #{c_num}", "CASE", date=row.get("date"),
                               arrest=row["arrest"], domestic=row["domestic"])

                # 2. Suspect Node & Edge
                s_name = row.get("suspect_name")
                if s_name:
                    self._add_node(s_name, s_name, "SUSPECT")
                    self._add_edge(c_num, s_name, "PERPETRATED_BY")
                    self.suspect_to_cases[s_name].append(c_num)

                # 3. Crime Type Node & Edge
                c_type = row.get("primary_type")
                if c_type:
                    self._add_node(c_type, c_type, "CRIME_TYPE")
                    self._add_edge(c_num, c_type, "OFFENSE_TYPE")
                    self.crime_type_to_cases[c_type].append(c_num)

                # 4. Police Beat Node & Edge
                beat = row.get("beat")
                if beat:
                    b_id = f"Beat {beat}"
                    self._add_node(b_id, b_id, "POLICE_BEAT", district=row.get("district"))
                    self._add_edge(c_num, b_id, "OCCURRED_IN_BEAT")
                    self.beat_to_cases[b_id].append(c_num)

                # 5. Location Node & Edge
                loc = row.get("block")
                if loc:
                    self._add_node(loc, loc, "LOCATION", premise=row.get("location_description"))
                    self._add_edge(c_num, loc, "OCCURRED_AT")
                    self.location_to_cases[loc].append(c_num)

                # 6. Vehicle Node & Edge (ONLY if plate present)
                v_plate = row.get("vehicle_plate", "").strip()
                if v_plate:
                    self._add_node(v_plate, v_plate, "VEHICLE")
                    if s_name:
                        self._add_edge(s_name, v_plate, "DRIVES_VEHICLE")
                        self.vehicle_to_suspects[v_plate].add(s_name)
                        self.suspect_to_vehicles[s_name].add(v_plate)

                # District index
                dist = row.get("district")
                if dist:
                    self.district_to_cases[dist].append(c_num)

    def _add_node(self, nid: str, label: str, ntype: str, **props):
        if nid not in self.nodes:
            self.nodes[nid] = {
                "id": nid,
                "label": label,
                "type": ntype,
                "properties": props
            }
        else:
            self.nodes[nid]["properties"].update(props)

    def _add_edge(self, src: str, tgt: str, rel: str, **props):
        self.adj[src].append({"target": tgt, "relationship": rel, "direction": "outgoing", "properties": props})
        self.adj[tgt].append({"target": src, "relationship": rel, "direction": "incoming", "properties": props})
        self.edges.append({
            "source": src,
            "target": tgt,
            "relationship": rel,
            "properties": props
        })

    def search(self, query: str) -> Dict[str, List[Dict[str, Any]]]:
        """Universal search grouped by entity type, with live Neo4j execution."""
        q = (query or "").strip()
        if not q:
            return {
                "cases": [], "suspects": [], "vehicles": [],
                "locations": [], "crime_types": [], "police_beats": []
            }

        if self.neo4j_connected and self.neo4j_driver:
            try:
                with self.neo4j_driver.session(database=self.neo4j_database) as session:
                    cypher = """
                    MATCH (n)
                    WHERE (n:CrimeIncident OR n:Suspect OR n:Vehicle OR n:Location OR n:CrimeType OR n:PoliceBeat)
                      AND (toLower(n.name) CONTAINS toLower($q) 
                           OR toLower(replace(n.name, '_', ' ')) CONTAINS toLower($q)
                           OR toLower(coalesce(n.hasLocationBlock, '')) CONTAINS toLower($q))
                    RETURN labels(n) AS lbls, properties(n) AS props, n.name AS name, count{(n)--()} AS degree
                    LIMIT 80
                    """
                    records = session.run(cypher, q=q).data()
                    results = {
                        "cases": [], "suspects": [], "vehicles": [],
                        "locations": [], "crime_types": [], "police_beats": []
                    }
                    for rec in records:
                        lbls = rec["lbls"]
                        name = rec["name"]
                        props = self._clean_props(rec["props"])
                        deg = rec["degree"]

                        if "CrimeIncident" in lbls:
                            results["cases"].append({"id": name, "label": f"Case #{name}", "type": "CASE", "degree": deg, "properties": props})
                        elif "Suspect" in lbls:
                            results["suspects"].append({"id": name, "label": name, "type": "SUSPECT", "degree": deg, "properties": props})
                        elif "Vehicle" in lbls:
                            results["vehicles"].append({"id": name, "label": name, "type": "VEHICLE", "degree": deg, "properties": props})
                        elif "Location" in lbls:
                            results["locations"].append({"id": name, "label": name, "type": "LOCATION", "degree": deg, "properties": props})
                        elif "CrimeType" in lbls:
                            results["crime_types"].append({"id": name, "label": name, "type": "CRIME_TYPE", "degree": deg, "properties": props})
                        elif "PoliceBeat" in lbls:
                            beat_label = f"Beat {name}" if not name.startswith("Beat") else name
                            results["police_beats"].append({"id": beat_label, "label": beat_label, "type": "POLICE_BEAT", "degree": deg, "properties": props})

                    for k in results:
                        results[k] = results[k][:25]
                    return results
            except Exception as e:
                print(f"Neo4j search failed: {e}. Using fallback index.")

        # Fallback in-memory search
        q_lower = q.lower()
        results = {
            "cases": [], "suspects": [], "vehicles": [],
            "locations": [], "crime_types": [], "police_beats": []
        }
        for nid, node in self.nodes.items():
            ntype = node["type"]
            match = q_lower in nid.lower() or q_lower in node["label"].lower()
            if not match:
                for k, v in node["properties"].items():
                    if q_lower in str(v).lower():
                        match = True
                        break

            if match:
                summary = {
                    "id": nid,
                    "label": node["label"],
                    "type": ntype,
                    "degree": len(self.adj[nid]),
                    "properties": node["properties"]
                }
                if ntype == "CASE":
                    results["cases"].append(summary)
                elif ntype == "SUSPECT":
                    results["suspects"].append(summary)
                elif ntype == "VEHICLE":
                    results["vehicles"].append(summary)
                elif ntype == "LOCATION":
                    results["locations"].append(summary)
                elif ntype == "CRIME_TYPE":
                    results["crime_types"].append(summary)
                elif ntype == "POLICE_BEAT":
                    results["police_beats"].append(summary)

        for k in results:
            results[k] = results[k][:25]
        return results

    def get_case(self, case_number: str) -> Optional[Dict[str, Any]]:
        """Retrieves a single incident record with subgraph context from Neo4j or fallback."""
        if self.neo4j_connected and self.neo4j_driver:
            try:
                with self.neo4j_driver.session(database=self.neo4j_database) as session:
                    cypher = """
                    MATCH (c:CrimeIncident {hasCaseNumber: $case_number})
                    OPTIONAL MATCH (c)-[:hasSuspect]->(s:Suspect)
                    OPTIONAL MATCH (s)-[:drivesVehicle]->(v:Vehicle)
                    OPTIONAL MATCH (c)-[:occurredAt]->(l:Location)
                    OPTIONAL MATCH (c)-[:hasCrimeType]->(ct:CrimeType)
                    OPTIONAL MATCH (c)-[:hasDescription]->(cd:CrimeDescription)
                    OPTIONAL MATCH (c)-[:occurredInBeat]->(b:PoliceBeat)
                    OPTIONAL MATCH (c)-[:occurredInDistrict]->(d:PoliceDistrict)
                    OPTIONAL MATCH (c)-[:occurredInWard]->(w:Ward)
                    OPTIONAL MATCH (c)-[:occurredInCommunityArea]->(ca:CommunityArea)
                    OPTIONAL MATCH (c)-[:hasPremiseType]->(pt:PremiseType)
                    OPTIONAL MATCH (c)-[:hasIUCRCode]->(iucr:IUCRCode)
                    OPTIONAL MATCH (c)-[:hasFBICode]->(fbi:FBICode)
                    RETURN properties(c) AS cp, s.name AS suspect, v.hasVehiclePlate AS vehicle,
                           l.name AS location, ct.name AS crime_type, cd.name AS description,
                           b.name AS beat, d.name AS district, w.name AS ward, ca.name AS community_area,
                           pt.name AS premise, iucr.name AS iucr, fbi.name AS fbi
                    """
                    rec = session.run(cypher, case_number=case_number).single()
                    if rec:
                        cp = self._clean_props(rec["cp"])
                        dt_val = str(cp.get("hasDateTime", ""))
                        if "T" in dt_val:
                            dt_val = dt_val.replace("T", " ")[:19]

                        # Connected cases through shared suspect or location
                        connected_cypher = """
                        MATCH (c:CrimeIncident {hasCaseNumber: $case_number})
                        MATCH (c)-[:hasSuspect|occurredAt]->(shared)<-[:hasSuspect|occurredAt]-(other:CrimeIncident)
                        WHERE other <> c
                        OPTIONAL MATCH (other)-[:hasSuspect]->(os:Suspect)
                        OPTIONAL MATCH (os)-[:drivesVehicle]->(ov:Vehicle)
                        OPTIONAL MATCH (other)-[:occurredAt]->(ol:Location)
                        OPTIONAL MATCH (other)-[:hasCrimeType]->(oct:CrimeType)
                        RETURN other.hasCaseNumber AS case_number, other.hasDateTime AS date,
                               oct.name AS primary_type, os.name AS suspect_name,
                               ov.hasVehiclePlate AS vehicle_plate, ol.name AS block
                        LIMIT 15
                        """
                        conn_recs = session.run(connected_cypher, case_number=case_number).data()
                        formatted_conn = []
                        for cr in conn_recs:
                            c_dt = str(cr.get("date", ""))
                            if "T" in c_dt: c_dt = c_dt.replace("T", " ")[:19]
                            formatted_conn.append({
                                "case_number": cr["case_number"],
                                "date": c_dt,
                                "primary_type": cr.get("primary_type"),
                                "suspect_name": cr.get("suspect_name"),
                                "vehicle_plate": cr.get("vehicle_plate"),
                                "block": cr.get("block")
                            })

                        subgraph = self.get_entity_subgraph(case_number, depth=1)

                        return {
                            "case_number": case_number,
                            "date": dt_val,
                            "year": cp.get("hasYear"),
                            "primary_type": rec.get("crime_type"),
                            "description": rec.get("description"),
                            "suspect_name": rec.get("suspect"),
                            "vehicle_plate": rec.get("vehicle"),
                            "block": rec.get("location"),
                            "location_description": rec.get("premise"),
                            "district": rec.get("district"),
                            "beat": rec.get("beat"),
                            "ward": rec.get("ward"),
                            "community_area": rec.get("community_area"),
                            "iucr": rec.get("iucr"),
                            "fbi_code": rec.get("fbi"),
                            "arrest": cp.get("hasArrest", False),
                            "domestic": cp.get("isDomesticDispute", False),
                            "graph": subgraph,
                            "connected_records": formatted_conn
                        }
            except Exception as e:
                print(f"Neo4j get_case failed: {e}. Using fallback.")

        # Fallback
        c = self.cases.get(case_number)
        if not c:
            return None
        
        subgraph = self.get_entity_subgraph(case_number, depth=1)
        connected_cases = set()
        s_name = c.get("suspect_name")
        if s_name:
            for other_c in self.suspect_to_cases.get(s_name, []):
                if other_c != case_number:
                    connected_cases.add(other_c)
        v_plate = c.get("vehicle_plate")
        if v_plate:
            for s in self.vehicle_to_suspects.get(v_plate, []):
                for other_c in self.suspect_to_cases.get(s, []):
                    if other_c != case_number:
                        connected_cases.add(other_c)
        loc = c.get("block")
        if loc:
            for other_c in self.location_to_cases.get(loc, []):
                if other_c != case_number:
                    connected_cases.add(other_c)

        connected_records = [self.cases[oc] for oc in list(connected_cases)[:15] if oc in self.cases]

        return {
            "case_number": c["case_number"],
            "date": c.get("date"),
            "year": c.get("year"),
            "primary_type": c.get("primary_type"),
            "description": c.get("description"),
            "suspect_name": c.get("suspect_name"),
            "vehicle_plate": c.get("vehicle_plate") if c.get("vehicle_plate") else None,
            "block": c.get("block"),
            "location_description": c.get("location_description"),
            "district": c.get("district"),
            "beat": c.get("beat"),
            "ward": c.get("ward"),
            "community_area": c.get("community_area"),
            "iucr": c.get("iucr"),
            "fbi_code": c.get("fbi_code"),
            "arrest": c.get("arrest"),
            "domestic": c.get("domestic"),
            "graph": subgraph,
            "connected_records": connected_records
        }

    def get_entity(self, entity_id: str) -> Optional[Dict[str, Any]]:
        """Retrieves an entity profile and direct relationships from Neo4j or fallback."""
        if self.neo4j_connected and self.neo4j_driver:
            try:
                with self.neo4j_driver.session(database=self.neo4j_database) as session:
                    # Match entity node
                    cypher = """
                    MATCH (n {name: $id})
                    WHERE NOT n:Class AND NOT n:Ontology AND NOT n:DatatypeProperty AND NOT n:ObjectProperty
                    RETURN labels(n) AS lbls, properties(n) AS props
                    """
                    node_rec = session.run(cypher, id=entity_id).single()
                    if node_rec:
                        lbls = [l for l in node_rec["lbls"] if l != "Resource"]
                        ntype = lbls[0] if lbls else "UNKNOWN"
                        props = self._clean_props(node_rec["props"])

                        # Direct relationships
                        rel_cypher = """
                        MATCH (n {name: $id})-[r]-(target)
                        WHERE NOT target:Class AND NOT target:Ontology AND NOT target:DatatypeProperty AND NOT target:ObjectProperty
                        RETURN type(r) AS rel, [l IN labels(target) WHERE l <> 'Resource'][0] AS target_type,
                               target.name AS target_name, startNode(r) = n AS is_outgoing
                        LIMIT 50
                        """
                        rels_raw = session.run(rel_cypher, id=entity_id).data()
                        relationships = []
                        for r in rels_raw:
                            t_name = r["target_name"]
                            relationships.append({
                                "target_id": t_name,
                                "target_label": f"Beat {t_name}" if r.get("target_type") == "PoliceBeat" and not t_name.startswith("Beat") else t_name,
                                "target_type": r.get("target_type") or "UNKNOWN",
                                "relationship": r["rel"],
                                "direction": "outgoing" if r["is_outgoing"] else "incoming"
                            })

                        # Connected cases
                        cases_cypher = """
                        MATCH (n {name: $id})
                        MATCH path = (c:CrimeIncident)-[*1..2]-(n)
                        WHERE ALL(x IN nodes(path) WHERE NOT x:Class AND NOT x:Ontology)
                        WITH DISTINCT c
                        OPTIONAL MATCH (c)-[:hasSuspect]->(s:Suspect)
                        OPTIONAL MATCH (s)-[:drivesVehicle]->(v:Vehicle)
                        OPTIONAL MATCH (c)-[:occurredAt]->(l:Location)
                        OPTIONAL MATCH (c)-[:hasCrimeType]->(ct:CrimeType)
                        RETURN c.hasCaseNumber AS case_number, c.hasDateTime AS date,
                               ct.name AS primary_type, s.name AS suspect_name,
                               v.hasVehiclePlate AS vehicle_plate, l.name AS block
                        LIMIT 30
                        """
                        cases_raw = session.run(cases_cypher, id=entity_id).data()
                        appearances = []
                        for cr in cases_raw:
                            c_dt = str(cr.get("date", ""))
                            if "T" in c_dt: c_dt = c_dt.replace("T", " ")[:19]
                            appearances.append({
                                "case_number": cr["case_number"],
                                "date": c_dt,
                                "primary_type": cr.get("primary_type"),
                                "suspect_name": cr.get("suspect_name"),
                                "vehicle_plate": cr.get("vehicle_plate"),
                                "block": cr.get("block")
                            })

                        subgraph = self.get_entity_subgraph(entity_id, depth=1)

                        return {
                            "id": entity_id,
                            "label": f"Beat {entity_id}" if ntype == "PoliceBeat" and not entity_id.startswith("Beat") else entity_id,
                            "type": ntype,
                            "properties": props,
                            "relationship_count": len(relationships),
                            "connected_incident_count": len(appearances),
                            "relationships": relationships,
                            "records": appearances,
                            "graph": subgraph
                        }
            except Exception as e:
                print(f"Neo4j get_entity failed: {e}. Using fallback.")

        # Fallback
        node = self.nodes.get(entity_id)
        if not node:
            return None

        ntype = node["type"]
        appearances = []

        if ntype == "CASE":
            if entity_id in self.cases:
                appearances = [self.cases[entity_id]]
        elif ntype == "SUSPECT":
            appearances = [self.cases[c] for c in self.suspect_to_cases.get(entity_id, []) if c in self.cases]
        elif ntype == "VEHICLE":
            suspects = self.vehicle_to_suspects.get(entity_id, set())
            for s in suspects:
                for c in self.suspect_to_cases.get(s, []):
                    if c in self.cases and self.cases[c] not in appearances:
                        appearances.append(self.cases[c])
        elif ntype == "LOCATION":
            appearances = [self.cases[c] for c in self.location_to_cases.get(entity_id, []) if c in self.cases]
        elif ntype == "POLICE_BEAT":
            appearances = [self.cases[c] for c in self.beat_to_cases.get(entity_id, []) if c in self.cases]
        elif ntype == "CRIME_TYPE":
            appearances = [self.cases[c] for c in self.crime_type_to_cases.get(entity_id, []) if c in self.cases]

        relationships = []
        for edge in self.adj[entity_id]:
            relationships.append({
                "target_id": edge["target"],
                "target_label": self.nodes.get(edge["target"], {}).get("label", edge["target"]),
                "target_type": self.nodes.get(edge["target"], {}).get("type", "UNKNOWN"),
                "relationship": edge["relationship"],
                "direction": edge["direction"]
            })

        subgraph = self.get_entity_subgraph(entity_id, depth=1)

        return {
            "id": node["id"],
            "label": node["label"],
            "type": node["type"],
            "properties": node["properties"],
            "relationship_count": len(relationships),
            "connected_incident_count": len(appearances),
            "relationships": relationships,
            "records": appearances[:30],
            "graph": subgraph
        }

    def get_entity_subgraph(self, entity_id: str, depth: int = 1) -> Dict[str, Any]:
        """Extracts an ego-network subgraph around an entity."""
        if self.neo4j_connected and self.neo4j_driver:
            try:
                with self.neo4j_driver.session(database=self.neo4j_database) as session:
                    cypher = f"""
                    MATCH path = (start {{name: $id}})-[r*1..{depth}]-(m)
                    WHERE ALL(x IN nodes(path) WHERE NOT x:Class AND NOT x:Ontology AND NOT x:DatatypeProperty AND NOT x:ObjectProperty)
                    UNWIND nodes(path) AS n
                    WITH DISTINCT n, path
                    UNWIND relationships(path) AS rel
                    WITH collect(DISTINCT {{id: n.name, type: [l IN labels(n) WHERE l <> 'Resource'][0], properties: properties(n)}}) AS pnodes,
                         collect(DISTINCT {{source: startNode(rel).name, target: endNode(rel).name, relationship: type(rel)}}) AS prels
                    RETURN pnodes, prels
                    """
                    rec = session.run(cypher, id=entity_id).single()
                    if rec and rec["pnodes"]:
                        formatted_nodes = []
                        for n in rec["pnodes"]:
                            nid = n["id"]
                            ntype = n.get("type") or "UNKNOWN"
                            lbl = f"Case #{nid}" if ntype == "CrimeIncident" else (f"Beat {nid}" if ntype == "PoliceBeat" and not nid.startswith("Beat") else nid)
                            formatted_nodes.append({
                                "id": nid,
                                "label": lbl,
                                "type": ntype,
                                "properties": self._clean_props(n.get("properties", {}))
                            })
                        return {
                            "nodes": formatted_nodes,
                            "relationships": rec["prels"]
                        }
            except Exception as e:
                print(f"Neo4j get_entity_subgraph failed: {e}. Using fallback.")

        # Fallback
        if entity_id not in self.nodes:
            return {"nodes": [], "relationships": []}

        visited_nodes: Set[str] = {entity_id}
        frontier: Set[str] = {entity_id}

        for _ in range(depth):
            next_frontier = set()
            for curr in frontier:
                for edge in self.adj[curr]:
                    target = edge["target"]
                    if target not in visited_nodes:
                        visited_nodes.add(target)
                        next_frontier.add(target)
            frontier = next_frontier

        sub_nodes = [self.nodes[nid] for nid in visited_nodes if nid in self.nodes]
        sub_edges = []
        seen_edges = set()

        for u in visited_nodes:
            for edge in self.adj[u]:
                v = edge["target"]
                if v in visited_nodes:
                    pair_key = tuple(sorted([u, v])) + (edge["relationship"],)
                    if pair_key not in seen_edges:
                        seen_edges.add(pair_key)
                        sub_edges.append({
                            "source": u,
                            "target": v,
                            "relationship": edge["relationship"],
                            "properties": edge.get("properties", {})
                        })

        return {
            "nodes": sub_nodes,
            "relationships": sub_edges
        }

    def get_filtered_graph(self, entity_types: Optional[List[str]] = None,
                           crime_types: Optional[List[str]] = None,
                           districts: Optional[List[str]] = None,
                           query: Optional[str] = None,
                           limit: int = 250) -> Dict[str, Any]:
        """Returns focused subgraph for canvas exploration with live Neo4j execution."""
        if self.neo4j_connected and self.neo4j_driver:
            try:
                with self.neo4j_driver.session(database=self.neo4j_database) as session:
                    cypher = """
                    MATCH (c:CrimeIncident)
                    OPTIONAL MATCH (c)-[r]->(target)
                    WHERE NOT target:Class AND NOT target:Ontology AND NOT target:DatatypeProperty AND NOT target:ObjectProperty
                    RETURN c.hasCaseNumber AS case_number, properties(c) AS case_props,
                           type(r) AS rel_type, target.name AS target_name,
                           [l IN labels(target) WHERE l <> 'Resource'][0] AS target_type,
                           properties(target) AS target_props
                    LIMIT $limit
                    """
                    records = session.run(cypher, limit=limit).data()
                    node_dict = {}
                    edges_list = []
                    seen_edges = set()

                    for row in records:
                        c_name = row["case_number"]
                        if c_name not in node_dict:
                            node_dict[c_name] = {
                                "id": c_name,
                                "label": f"Case #{c_name}",
                                "type": "CASE",
                                "properties": self._clean_props(row["case_props"])
                            }
                        
                        t_name = row.get("target_name")
                        rel_type = row.get("rel_type")
                        t_type = row.get("target_type") or "UNKNOWN"
                        if t_name and rel_type:
                            if entity_types and t_type not in entity_types:
                                continue

                            if t_name not in node_dict:
                                node_dict[t_name] = {
                                    "id": t_name,
                                    "label": f"Beat {t_name}" if t_type == "PoliceBeat" and not t_name.startswith("Beat") else t_name,
                                    "type": t_type,
                                    "properties": self._clean_props(row.get("target_props", {}))
                                }

                            ekey = (c_name, t_name, rel_type)
                            if ekey not in seen_edges:
                                seen_edges.add(ekey)
                                edges_list.append({
                                    "source": c_name,
                                    "target": t_name,
                                    "relationship": rel_type,
                                    "properties": {}
                                })

                    if node_dict:
                        return {
                            "nodes": list(node_dict.values()),
                            "relationships": edges_list
                        }
            except Exception as e:
                print(f"Neo4j get_filtered_graph failed: {e}. Using fallback.")

        # Fallback in-memory graph
        selected_nodes: Set[str] = set()

        if query and query.strip():
            search_res = self.search(query.strip())
            for group in search_res.values():
                for item in group:
                    selected_nodes.add(item["id"])
                    for edge in self.adj[item["id"]][:10]:
                        selected_nodes.add(edge["target"])
        else:
            candidates = list(self.cases.keys())
            if crime_types:
                candidates = [c for c in candidates if self.cases[c].get("primary_type") in crime_types]
            if districts:
                candidates = [c for c in candidates if self.cases[c].get("district") in districts]

            for c_num in candidates[:35]:
                selected_nodes.add(c_num)
                for edge in self.adj[c_num]:
                    target = edge["target"]
                    target_type = self.nodes.get(target, {}).get("type")
                    if not entity_types or target_type in entity_types:
                        selected_nodes.add(target)

        if entity_types:
            selected_nodes = {nid for nid in selected_nodes if self.nodes.get(nid, {}).get("type") in entity_types}

        if len(selected_nodes) > limit:
            selected_nodes = set(list(selected_nodes)[:limit])

        res_nodes = [self.nodes[nid] for nid in selected_nodes if nid in self.nodes]
        res_edges = []
        seen = set()

        for u in selected_nodes:
            for edge in self.adj[u]:
                v = edge["target"]
                if v in selected_nodes:
                    pair_key = tuple(sorted([u, v])) + (edge["relationship"],)
                    if pair_key not in seen:
                        seen.add(pair_key)
                        res_edges.append({
                            "source": u,
                            "target": v,
                            "relationship": edge["relationship"],
                            "properties": edge.get("properties", {})
                        })

        return {
            "nodes": res_nodes,
            "relationships": res_edges
        }

    def get_repeat_suspects(self) -> List[Dict[str, Any]]:
        """Identifies suspects implicated across multiple incidents via Cypher or fallback."""
        if self.neo4j_connected and self.neo4j_driver:
            try:
                with self.neo4j_driver.session(database=self.neo4j_database) as session:
                    cypher = """
                    MATCH (s:Suspect)<-[:hasSuspect]-(c:CrimeIncident)
                    OPTIONAL MATCH (c)-[:hasCrimeType]->(ct:CrimeType)
                    OPTIONAL MATCH (c)-[:occurredInDistrict]->(d:PoliceDistrict)
                    OPTIONAL MATCH (s)-[:drivesVehicle]->(v:Vehicle)
                    WITH s, count(DISTINCT c) AS incident_count,
                         collect(DISTINCT c.hasCaseNumber) AS case_numbers,
                         collect(DISTINCT ct.name) AS crime_types,
                         collect(DISTINCT d.name) AS districts,
                         collect(DISTINCT v.hasVehiclePlate) AS vehicles
                    WHERE incident_count >= 2
                    RETURN s.name AS suspect_name, incident_count, case_numbers,
                           crime_types, districts, vehicles
                    ORDER BY incident_count DESC
                    """
                    records = session.run(cypher).data()
                    repeat = []
                    for r in records:
                        repeat.append({
                            "suspect_name": r["suspect_name"],
                            "incident_count": r["incident_count"],
                            "case_numbers": r["case_numbers"],
                            "vehicles": [v for v in r["vehicles"] if v],
                            "crime_types": r["crime_types"],
                            "districts": r["districts"],
                            "observation": "Entity appears in multiple records."
                        })
                    if repeat:
                        return repeat
            except Exception as e:
                print(f"Neo4j repeat suspects query failed: {e}. Using fallback.")

        # Fallback
        repeat = []
        for s_name, case_list in self.suspect_to_cases.items():
            if len(case_list) >= 2:
                vehicles = list(self.suspect_to_vehicles.get(s_name, []))
                incident_records = [self.cases[c] for c in case_list if c in self.cases]
                crime_types = list(set([r.get("primary_type") for r in incident_records if r.get("primary_type")]))
                districts = list(set([r.get("district") for r in incident_records if r.get("district")]))
                repeat.append({
                    "suspect_name": s_name,
                    "incident_count": len(case_list),
                    "case_numbers": case_list,
                    "vehicles": vehicles,
                    "crime_types": crime_types,
                    "districts": districts,
                    "incidents": incident_records,
                    "observation": "Entity appears in multiple records."
                })
        repeat.sort(key=lambda x: x["incident_count"], reverse=True)
        return repeat

    def get_vehicle_connections(self) -> List[Dict[str, Any]]:
        """Identifies vehicles associated with suspects and recurring across cases."""
        if self.neo4j_connected and self.neo4j_driver:
            try:
                with self.neo4j_driver.session(database=self.neo4j_database) as session:
                    cypher = """
                    MATCH (v:Vehicle)<-[:drivesVehicle]-(s:Suspect)
                    OPTIONAL MATCH (s)<-[:hasSuspect]-(c:CrimeIncident)
                    WITH v, collect(DISTINCT s.name) AS suspects, collect(DISTINCT c.hasCaseNumber) AS case_numbers
                    RETURN v.hasVehiclePlate AS vehicle_plate, size(suspects) AS suspect_count,
                           suspects, size(case_numbers) AS incident_count, case_numbers
                    ORDER BY suspect_count DESC, incident_count DESC
                    """
                    records = session.run(cypher).data()
                    connections = []
                    for r in records:
                        plate = r["vehicle_plate"]
                        s_count = r["suspect_count"]
                        i_count = r["incident_count"]
                        connections.append({
                            "vehicle_plate": plate,
                            "suspect_count": s_count,
                            "suspects": r["suspects"],
                            "incident_count": i_count,
                            "case_numbers": r["case_numbers"],
                            "multi_suspect": s_count > 1,
                            "observation": f"Vehicle plate recorded with {s_count} suspect(s) across {i_count} incident(s)."
                        })
                    if connections:
                        return connections
            except Exception as e:
                print(f"Neo4j vehicle connections query failed: {e}. Using fallback.")

        # Fallback
        connections = []
        for plate, suspects in self.vehicle_to_suspects.items():
            linked_cases = []
            for s in suspects:
                linked_cases.extend(self.suspect_to_cases.get(s, []))
            linked_cases = list(set(linked_cases))

            connections.append({
                "vehicle_plate": plate,
                "suspect_count": len(suspects),
                "suspects": list(suspects),
                "incident_count": len(linked_cases),
                "case_numbers": linked_cases,
                "multi_suspect": len(suspects) > 1,
                "observation": f"Vehicle plate recorded with {len(suspects)} suspect(s) across {len(linked_cases)} incident(s)."
            })
        connections.sort(key=lambda x: (x["suspect_count"], x["incident_count"]), reverse=True)
        return connections

    def get_location_connections(self) -> List[Dict[str, Any]]:
        """Identifies recurring location blocks with multiple incidents via Cypher or fallback."""
        if self.neo4j_connected and self.neo4j_driver:
            try:
                with self.neo4j_driver.session(database=self.neo4j_database) as session:
                    cypher = """
                    MATCH (l:Location)<-[:occurredAt]-(c:CrimeIncident)
                    OPTIONAL MATCH (c)-[:hasCrimeType]->(ct:CrimeType)
                    OPTIONAL MATCH (c)-[:hasPremiseType]->(pt:PremiseType)
                    WITH l, count(DISTINCT c) AS incident_count,
                         collect(DISTINCT c.hasCaseNumber) AS cases,
                         collect(DISTINCT ct.name) AS crime_types,
                         collect(DISTINCT pt.name) AS premises
                    WHERE incident_count >= 2
                    RETURN l.name AS block, incident_count, cases, crime_types, premises
                    ORDER BY incident_count DESC
                    """
                    records = session.run(cypher).data()
                    hotspots = []
                    for r in records:
                        hotspots.append({
                            "block": r["block"],
                            "incident_count": r["incident_count"],
                            "cases": r["cases"],
                            "crime_types": r["crime_types"],
                            "premises": [p for p in r["premises"] if p and p != "None"],
                            "observation": "Multiple incidents associated with the same location block."
                        })
                    if hotspots:
                        return hotspots
            except Exception as e:
                print(f"Neo4j location connections query failed: {e}. Using fallback.")

        # Fallback
        hotspots = []
        for block, cases in self.location_to_cases.items():
            if len(cases) >= 2:
                recs = [self.cases[c] for c in cases if c in self.cases]
                crime_types = list(set([r.get("primary_type") for r in recs if r.get("primary_type")]))
                premises = list(set([r.get("location_description") for r in recs if r.get("location_description")]))
                hotspots.append({
                    "block": block,
                    "incident_count": len(cases),
                    "cases": cases,
                    "crime_types": crime_types,
                    "premises": premises,
                    "observation": "Multiple incidents associated with the same location block."
                })
        hotspots.sort(key=lambda x: x["incident_count"], reverse=True)
        return hotspots

    def get_district_patterns(self) -> List[Dict[str, Any]]:
        """Aggregates crime frequency, type diversity, and beats per police district."""
        if self.neo4j_connected and self.neo4j_driver:
            try:
                with self.neo4j_driver.session(database=self.neo4j_database) as session:
                    cypher = """
                    MATCH (d:PoliceDistrict)<-[:occurredInDistrict]-(c:CrimeIncident)
                    OPTIONAL MATCH (c)-[:occurredInBeat]->(b:PoliceBeat)
                    OPTIONAL MATCH (c)-[:hasCrimeType]->(ct:CrimeType)
                    WITH d, count(DISTINCT c) AS incident_count, collect(DISTINCT b.name) AS beats,
                         collect(ct.name) AS crime_types
                    RETURN d.name AS district, incident_count, size(beats) AS beat_count, beats, crime_types
                    ORDER BY incident_count DESC
                    """
                    records = session.run(cypher).data()
                    patterns = []
                    for r in records:
                        c_counts = Counter(r["crime_types"])
                        patterns.append({
                            "district": r["district"],
                            "incident_count": r["incident_count"],
                            "beat_count": r["beat_count"],
                            "beats": r["beats"],
                            "top_crimes": [{"type": k, "count": v} for k, v in c_counts.most_common(4)],
                            "observation": f"District {r['district']} recorded {r['incident_count']} incidents across {r['beat_count']} beats."
                        })
                    if patterns:
                        return patterns
            except Exception as e:
                print(f"Neo4j district patterns query failed: {e}. Using fallback.")

        # Fallback
        patterns = []
        for dist, cases in self.district_to_cases.items():
            recs = [self.cases[c] for c in cases if c in self.cases]
            c_counts = Counter(r.get("primary_type") for r in recs if r.get("primary_type"))
            beats = list(set(r.get("beat") for r in recs if r.get("beat")))
            patterns.append({
                "district": dist,
                "incident_count": len(cases),
                "beat_count": len(beats),
                "beats": beats,
                "top_crimes": [{"type": k, "count": v} for k, v in c_counts.most_common(4)],
                "observation": f"District {dist} recorded {len(cases)} incidents across {len(beats)} beats."
            })
        patterns.sort(key=lambda x: x["incident_count"], reverse=True)
        return patterns

    def find_multi_hop_path(self, start_id: str, end_id: str, max_depth: int = 4) -> Optional[Dict[str, Any]]:
        """Breadth-first search finding indirect relationship paths between entities via Cypher or fallback."""
        if self.neo4j_connected and self.neo4j_driver:
            try:
                with self.neo4j_driver.session(database=self.neo4j_database) as session:
                    cypher = f"""
                    MATCH path = shortestPath((start {{name: $start_id}})-[*1..{max_depth}]-(end {{name: $end_id}}))
                    WHERE ALL(x IN nodes(path) WHERE NOT x:Class AND NOT x:Ontology AND NOT x:DatatypeProperty AND NOT x:ObjectProperty)
                    RETURN [n IN nodes(path) | {{id: n.name, label: n.name, type: [l IN labels(n) WHERE l <> 'Resource'][0]}}] AS pnodes,
                           [r IN relationships(path) | type(r)] AS rels
                    """
                    rec = session.run(cypher, start_id=start_id, end_id=end_id).single()
                    if rec and rec["pnodes"]:
                        pnodes = rec["pnodes"]
                        rels = rec["rels"]
                        path_details = []
                        for idx, n in enumerate(pnodes):
                            path_details.append({
                                "node_id": n["id"],
                                "label": n["label"],
                                "type": n["type"],
                                "via_relationship": rels[idx - 1] if idx > 0 else None
                            })
                        return {
                            "found": True,
                            "length": len(path_details) - 1,
                            "path": path_details,
                            "observation": f"Path of {len(path_details) - 1} hops identified via live Neo4j shortestPath."
                        }
            except Exception as e:
                print(f"Neo4j pathfinder failed: {e}. Using fallback.")

        # Fallback in-memory BFS
        if start_id not in self.nodes or end_id not in self.nodes:
            return None

        queue = [[(start_id, None)]]
        visited = {start_id}

        while queue:
            path = queue.pop(0)
            node, _ = path[-1]

            if node == end_id:
                path_details = []
                for idx in range(len(path)):
                    curr_node, rel_used = path[idx]
                    path_details.append({
                        "node_id": curr_node,
                        "label": self.nodes.get(curr_node, {}).get("label", curr_node),
                        "type": self.nodes.get(curr_node, {}).get("type", "UNKNOWN"),
                        "via_relationship": rel_used
                    })
                return {
                    "found": True,
                    "length": len(path) - 1,
                    "path": path_details,
                    "observation": f"Path of {len(path) - 1} hops identified in available graph relationships."
                }

            if len(path) <= max_depth:
                for edge in self.adj[node]:
                    neighbor = edge["target"]
                    if neighbor not in visited:
                        visited.add(neighbor)
                        new_path = list(path)
                        new_path.append((neighbor, edge["relationship"]))
                        queue.append(new_path)

        return {"found": False, "length": 0, "path": [], "observation": "No path discovered within maximum search depth."}

    def predict_candidate_links(self, source_id: str, target_id: str, relationship: str) -> Dict[str, Any]:
        """
        Executes link prediction using the trained Logistic Regression model (MLModel.ipynb).
        Calculates the exact 20 topological and node-type graph features from live Neo4j
        or the in-memory graph index, matching training ordering and preprocessing.
        """
        all_node_types = ["CASE", "SUSPECT", "CRIME_TYPE", "POLICE_BEAT", "LOCATION", "VEHICLE"]
        all_relationships = ["PERPETRATED_BY", "OFFENSE_TYPE", "OCCURRED_IN_BEAT", "OCCURRED_AT", "DRIVES_VEHICLE"]

        rel_map = {
            "PERPETRATED_BY": "PERPETRATED_BY", "HASSUSPECT": "PERPETRATED_BY",
            "OFFENSE_TYPE": "OFFENSE_TYPE", "HASCRIMETYPE": "OFFENSE_TYPE",
            "OCCURRED_IN_BEAT": "OCCURRED_IN_BEAT", "OCCURREDINBEAT": "OCCURRED_IN_BEAT",
            "OCCURRED_AT": "OCCURRED_AT", "OCCURREDAT": "OCCURRED_AT",
            "DRIVES_VEHICLE": "DRIVES_VEHICLE", "DRIVESVEHICLE": "DRIVES_VEHICLE"
        }

        type_map = {
            "CrimeIncident": "CASE", "CASE": "CASE",
            "Suspect": "SUSPECT", "SUSPECT": "SUSPECT",
            "CrimeType": "CRIME_TYPE", "CRIME_TYPE": "CRIME_TYPE",
            "PoliceBeat": "POLICE_BEAT", "POLICE_BEAT": "POLICE_BEAT",
            "Location": "LOCATION", "LOCATION": "LOCATION",
            "Vehicle": "VEHICLE", "VEHICLE": "VEHICLE"
        }

        clean_rel = relationship.upper().replace("_", "")
        norm_rel = rel_map.get(clean_rel, relationship.upper())

        source_label = source_id
        target_label = target_id
        source_type = "UNKNOWN"
        target_type = "UNKNOWN"

        degree1 = 0
        degree2 = 0
        common_neighbors = 0
        common_list = []
        jaccard = 0.0
        degree_sum = 0
        degree_diff = 0
        degree_ratio = 0.0
        adamic_adar = 0.0
        resource_allocation = 0.0
        shared_types = {t: 0 for t in all_node_types}

        feature_source = "Fallback In-Memory Graph"

        # 1. Try Live Neo4j Graph Extraction
        if self.neo4j_connected and self.neo4j_driver:
            try:
                with self.neo4j_driver.session(database=self.neo4j_database) as session:
                    cypher = """
                    MATCH (n1)
                    WHERE (n1.name = $n1 OR n1.name = replace($n1, "Beat ", "") OR (n1:PoliceBeat AND n1.name = toString(toInteger(replace(replace($n1, "Beat ", ""), "0", "")))))
                      AND NOT n1:Class AND NOT n1:Ontology AND NOT n1:ObjectProperty AND NOT n1:DatatypeProperty
                    MATCH (n2)
                    WHERE (n2.name = $n2 OR n2.name = replace($n2, "Beat ", "") OR (n2:PoliceBeat AND n2.name = toString(toInteger(replace(replace($n2, "Beat ", ""), "0", "")))))
                      AND NOT n2:Class AND NOT n2:Ontology AND NOT n2:ObjectProperty AND NOT n2:DatatypeProperty
                    OPTIONAL MATCH (n1)--(m1) WHERE NOT m1:Class AND NOT m1:Ontology AND NOT m1:ObjectProperty AND NOT m1:DatatypeProperty
                    OPTIONAL MATCH (n2)--(m2) WHERE NOT m2:Class AND NOT m2:Ontology AND NOT m2:ObjectProperty AND NOT m2:DatatypeProperty
                    RETURN n1.name AS real_n1, n2.name AS real_n2,
                           [l IN labels(n1) WHERE l <> "Resource"][0] AS type1,
                           [l IN labels(n2) WHERE l <> "Resource"][0] AS type2,
                           collect(DISTINCT m1.name) AS nbrs1,
                           collect(DISTINCT m2.name) AS nbrs2
                    """
                    rec = session.run(cypher, n1=source_id, n2=target_id).single()
                    if rec and rec["type1"] and rec["type2"]:
                        source_id = rec["real_n1"]
                        target_id = rec["real_n2"]
                        source_type = type_map.get(rec["type1"], rec["type1"])
                        target_type = type_map.get(rec["type2"], rec["type2"])
                        source_label = f"Case #{source_id}" if source_type == "CASE" else (f"Beat {source_id}" if source_type == "POLICE_BEAT" and not source_id.startswith("Beat") else source_id)
                        target_label = f"Case #{target_id}" if target_type == "CASE" else (f"Beat {target_id}" if target_type == "POLICE_BEAT" and not target_id.startswith("Beat") else target_id)

                        nbrs1 = set(rec["nbrs1"])
                        nbrs2 = set(rec["nbrs2"])
                        degree1 = len(nbrs1)
                        degree2 = len(nbrs2)
                        shared = nbrs1 & nbrs2
                        union = nbrs1 | nbrs2

                        common_neighbors = len(shared)
                        common_list = list(shared)
                        jaccard = common_neighbors / len(union) if union else 0.0
                        degree_sum = degree1 + degree2
                        degree_diff = abs(degree1 - degree2)
                        degree_ratio = min(degree1, degree2) / max(degree1, degree2) if max(degree1, degree2) > 0 else 0.0

                        if shared:
                            common_cypher = """
                            MATCH (common) WHERE common.name IN $common_names
                            RETURN common.name AS name,
                                   [l IN labels(common) WHERE l <> "Resource"][0] AS type,
                                   count{(common)--()} AS degree
                            """
                            common_recs = session.run(common_cypher, common_names=list(shared)).data()
                            for cr in common_recs:
                                nd = cr["degree"]
                                ct = type_map.get(cr["type"], cr["type"])
                                if ct in shared_types:
                                    shared_types[ct] += 1
                                if nd > 1:
                                    adamic_adar += 1.0 / math.log(nd)
                                if nd > 0:
                                    resource_allocation += 1.0 / nd
                        feature_source = "Live Neo4j Graph"
            except Exception as e:
                print(f"Neo4j feature extraction failed: {e}. Attempting fallback.")

        # 2. Fallback to In-Memory Graph if not extracted via Neo4j
        if feature_source != "Live Neo4j Graph":
            if source_id not in self.nodes or target_id not in self.nodes:
                return {"error": f"Both entities ('{source_id}', '{target_id}') must exist in Knowledge Graph."}

            source_label = self.nodes[source_id]["label"]
            target_label = self.nodes[target_id]["label"]
            source_type = self.nodes[source_id]["type"]
            target_type = self.nodes[target_id]["type"]

            neighbors1 = set(e["target"] for e in self.adj[source_id])
            neighbors2 = set(e["target"] for e in self.adj[target_id])
            common = neighbors1 & neighbors2
            union = neighbors1 | neighbors2

            degree1 = len(neighbors1)
            degree2 = len(neighbors2)
            common_neighbors = len(common)
            common_list = list(common)
            jaccard = common_neighbors / len(union) if union else 0.0
            degree_sum = degree1 + degree2
            degree_diff = abs(degree1 - degree2)
            degree_ratio = min(degree1, degree2) / max(degree1, degree2) if max(degree1, degree2) > 0 else 0.0

            for n in common:
                nd = len(self.adj[n])
                ct = self.nodes.get(n, {}).get("type", "UNKNOWN")
                if ct in shared_types:
                    shared_types[ct] += 1
                if nd > 1:
                    adamic_adar += 1.0 / math.log(nd)
                if nd > 0:
                    resource_allocation += 1.0 / nd

        # 3. Assemble exact 20-dimensional feature vector
        features = [
            float(degree1), float(degree2), float(common_neighbors), float(jaccard),
            float(degree_sum), float(degree_diff), float(degree_ratio),
            float(adamic_adar), float(resource_allocation)
        ]
        for t in all_node_types:
            features.append(float(shared_types.get(t, 0)))
        for r in all_relationships:
            features.append(1.0 if norm_rel == r else 0.0)

        feature_names = (
            ["degree1", "degree2", "common_neighbors", "jaccard", "degree_sum",
             "degree_diff", "degree_ratio", "adamic_adar", "resource_allocation"]
            + [f"shared_{t}" for t in all_node_types]
            + [f"rel_{r}" for r in all_relationships]
        )

        # 4. Predict with actual trained ML model
        if self.ml_model_loaded and self.ml_model is not None:
            import numpy as np
            X = np.array(features, dtype=float).reshape(1, -1)
            prob = round(float(self.ml_model.predict_proba(X)[0][1]), 4)
            pred = int(self.ml_model.predict(X)[0])
            model_info = "LogisticRegression (Trained MLModel.ipynb artifact, 20 graph topological features)"
            is_trained = True
        else:
            return {
                "error": "Trained ML model artifact unavailable. Cannot perform ML inference.",
                "is_trained_model": False,
                "model_status": "Missing artifact pipeline/ml/criminal_network_link_prediction_final.pkl"
            }

        return {
            "source_id": source_id,
            "source_label": source_label,
            "source_type": source_type,
            "target_id": target_id,
            "target_label": target_label,
            "target_type": target_type,
            "relationship": norm_rel,
            "predicted_link_score": prob,
            "predicted_link": pred,
            "is_trained_model": is_trained,
            "model_used": model_info,
            "feature_data_source": feature_source,
            "graph_features": {
                "degree_source": degree1,
                "degree_target": degree2,
                "common_neighbors_count": common_neighbors,
                "common_neighbors": common_list[:5],
                "jaccard_similarity": round(jaccard, 4),
                "adamic_adar_index": round(adamic_adar, 4),
                "resource_allocation": round(resource_allocation, 4),
                "feature_vector_20": {name: val for name, val in zip(feature_names, features)}
            },
            "status": "Potential candidate link detected based on topological features." if pred == 1 else "Low likelihood of unobserved link based on topological features.",
            "disclaimer": "Predicted relationship — requires investigator verification. ML outputs do not establish guilt or legal conclusions."
        }

    def get_analytics_overview(self) -> Dict[str, Any]:
        """Returns comprehensive data distributions and metrics for dashboard."""
        crime_counts = Counter(c.get("primary_type") for c in self.cases.values() if c.get("primary_type"))
        premise_counts = Counter(c.get("location_description") for c in self.cases.values() if c.get("location_description"))
        district_counts = Counter(c.get("district") for c in self.cases.values() if c.get("district"))
        
        monthly = defaultdict(int)
        for c in self.cases.values():
            dt = c.get("date")
            if dt and len(dt) >= 7:
                monthly[dt[:7]] += 1

        repeat_suspect_count = len([s for s, cs in self.suspect_to_cases.items() if len(cs) >= 2])
        shared_vehicle_count = len([v for v, ss in self.vehicle_to_suspects.items() if len(ss) >= 2])
        repeat_location_count = len([l for l, cs in self.location_to_cases.items() if len(cs) >= 2])

        return {
            "total_incidents": len(self.cases),
            "total_suspects": len([n for n in self.nodes.values() if n["type"] == "SUSPECT"]),
            "total_locations": len([n for n in self.nodes.values() if n["type"] == "LOCATION"]),
            "total_vehicles": len([n for n in self.nodes.values() if n["type"] == "VEHICLE"]),
            "total_beats": len([n for n in self.nodes.values() if n["type"] == "POLICE_BEAT"]),
            "total_crime_types": len([n for n in self.nodes.values() if n["type"] == "CRIME_TYPE"]),
            "neo4j_nodes": 1670 if self.neo4j_connected else 1530,
            "neo4j_relationships": 5639 if self.neo4j_connected else 2127,
            "repeat_suspects_count": repeat_suspect_count,
            "shared_vehicles_count": shared_vehicle_count,
            "repeat_locations_count": repeat_location_count,
            "arrest_count": len([c for c in self.cases.values() if c.get("arrest")]),
            "domestic_count": len([c for c in self.cases.values() if c.get("domestic")]),
            "crime_type_distribution": [{"type": k, "count": v} for k, v in crime_counts.most_common()],
            "top_premises": [{"premise": k, "count": v} for k, v in premise_counts.most_common(8)],
            "district_distribution": [{"district": f"District {k}", "count": v} for k, v in sorted(district_counts.items(), key=lambda x: int(x[0]) if x[0].isdigit() else 0)],
            "monthly_distribution": [{"month": k, "count": v} for k, v in sorted(monthly.items())]
        }
