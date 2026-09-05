import urllib.request
import urllib.parse
import json
import os
import sys

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(CURRENT_DIR, ".."))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

base_url = "http://127.0.0.1:8080"
report = []

def log_wf(wf_num, title, status, source, details, err=None):
    report.append({
        "workflow": f"Workflow {wf_num} — {title}",
        "status": "PASS" if status else "FAIL",
        "data_source": source,
        "details": details,
        "error": err
    })

def run_workflow_1():
    """Workflow 1 — FIR Investigation"""
    with open("data/fir_reports.txt", "r", encoding="utf-8") as f:
        reports = [r.strip() for r in f.read().split("---") if r.strip()]
    
    target_report = None
    for r in reports:
        if "JD155257" in r:
            target_report = r
            break
    
    req = urllib.request.Request(
        f"{base_url}/api/fir/analyze",
        data=json.dumps({"text": target_report}).encode("utf-8"),
        headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req) as resp:
        fir_data = json.loads(resp.read().decode())
    
    c_num = fir_data.get("case_number")
    s_name = fir_data.get("suspect_name")
    c_type = fir_data.get("primary_type")
    g_match = fir_data.get("graph_matches", {})
    suspect_in_kg = g_match.get("suspect_exists_in_kg")
    conn_cases = len(g_match.get("connected_cases", []))
    disclaimer = fir_data.get("legal_disclaimer")
    
    w1_ok = (c_num == "JD155257" and s_name == "Reginald Torres" and 
             c_type == "MOTOR VEHICLE THEFT" and suspect_in_kg is True and 
             conn_cases >= 1 and disclaimer is not None)
    
    log_wf(1, "FIR Investigation", w1_ok, "Live Neo4j Graph + NLP Pipeline",
           f"Case: {c_num}, Suspect: {s_name}, Crime: {c_type}, KG Match: suspect_in_kg={suspect_in_kg}, Connected cases: {conn_cases}")

def run_workflow_2():
    """Workflow 2 — Case Investigation"""
    test_cases = ["JD155257", "JC100113", "JD156500"]
    case_results = []
    w2_ok = True
    for c in test_cases:
        # 1. Search
        s_url = f"{base_url}/api/search?q={c}"
        with urllib.request.urlopen(s_url) as resp:
            s_data = json.loads(resp.read().decode())
            if not s_data.get("cases"):
                w2_ok = False
        
        # 2. Case Detail
        c_url = f"{base_url}/api/cases/{c}"
        with urllib.request.urlopen(c_url) as resp:
            cd = json.loads(resp.read().decode())
            if cd.get("case_number") != c:
                w2_ok = False
            suspect = cd.get("suspect_name")
            crime_type = cd.get("primary_type")
            subgraph_nodes = len(cd.get("graph", {}).get("nodes", []))
            conn_recs = len(cd.get("connected_records", []))
            
            # 3. Entity Detail of suspect
            if suspect:
                e_url = f"{base_url}/api/entities/{urllib.parse.quote(suspect)}"
                with urllib.request.urlopen(e_url) as eresp:
                    ed = json.loads(eresp.read().decode())
                    if ed.get("id") != suspect:
                        w2_ok = False
            
            case_results.append(f"{c}: {crime_type}, Suspect: {suspect}, Graph Nodes: {subgraph_nodes}, Connected: {conn_recs}")
            
    log_wf(2, "Case Investigation", w2_ok, "Live Neo4j Graph", "; ".join(case_results))

def run_workflow_3():
    """Workflow 3 — Graph Investigation"""
    # 1. Explorer base query
    with urllib.request.urlopen(f"{base_url}/api/graph?limit=50") as resp:
        g1 = json.loads(resp.read().decode())
        nodes1 = len(g1.get("nodes", []))
        rels1 = len(g1.get("relationships", []))
    
    # 2. Filter by crime type
    with urllib.request.urlopen(f"{base_url}/api/graph?crime_type=MOTOR_VEHICLE_THEFT&limit=50") as resp:
        g2 = json.loads(resp.read().decode())
        nodes2 = len(g2.get("nodes", []))
    
    # 3. Multi-hop pathfinder
    path_url = f"{base_url}/api/analysis/multi-hop?start=Reginald%20Torres&end=Brandon%20Allen&depth=4"
    with urllib.request.urlopen(path_url) as resp:
        pdata = json.loads(resp.read().decode())
        path_found = pdata.get("found", False)
        path_hops = pdata.get("length", 0)
        path_chain = " -> ".join([p.get("label", p.get("node_id")) for p in pdata.get("path", [])])
    
    w3_ok = (nodes1 > 0 and rels1 > 0 and nodes2 > 0 and path_found is True and path_hops > 0)
    log_wf(3, "Graph Investigation", w3_ok, "Live Neo4j Graph",
           f"Base Graph: {nodes1} nodes, {rels1} rels; Filtered (MVT): {nodes2} nodes; Multi-Hop: {path_hops} hops ({path_chain})")

def run_workflow_4():
    """Workflow 4 — Cross-Case Discovery"""
    disc_endpoints = [
        ("repeat-suspects", "repeat_suspects"),
        ("vehicle-connections", "vehicle_connections"),
        ("location-connections", "location_connections"),
        ("district-patterns", "district_patterns")
    ]
    disc_details = []
    w4_ok = True
    for sub, key in disc_endpoints:
        with urllib.request.urlopen(f"{base_url}/api/analysis/{sub}") as resp:
            data = json.loads(resp.read().decode())
            items = data.get(key, [])
            disc_details.append(f"{key}: {len(items)}")
            if len(items) == 0:
                w4_ok = False
            if items:
                first = items[0]
                if key == "repeat_suspects" and "incident_count" not in first:
                    w4_ok = False
                elif key == "vehicle_connections" and "vehicle_plate" not in first:
                    w4_ok = False
                elif key == "district_patterns" and "district" not in first:
                    w4_ok = False

    log_wf(4, "Cross-Case Discovery", w4_ok, "Live Neo4j Graph", "; ".join(disc_details))

def run_workflow_5():
    """Workflow 5 — ML Link Prediction"""
    # 1. Valid pair
    valid_url = f"{base_url}/api/ml/link-prediction?source=JC100113&target=0100XX%20W%20FULLERTON%20AVE&rel=OCCURRED_AT"
    with urllib.request.urlopen(valid_url) as resp:
        ml_data = json.loads(resp.read().decode())
    
    score = ml_data.get("predicted_link_score")
    pred = ml_data.get("predicted_link")
    is_trained = ml_data.get("is_trained_model")
    source_graph = ml_data.get("feature_data_source")
    model_used = ml_data.get("model_used")
    features_20 = ml_data.get("graph_features", {}).get("feature_vector_20", {})
    disclaimer = ml_data.get("disclaimer")
    
    # 2. Invalid entity test
    invalid_url = f"{base_url}/api/ml/link-prediction?source=NonExistentEntity999&target=0100XX%20W%20FULLERTON%20AVE&rel=OCCURRED_AT"
    with urllib.request.urlopen(invalid_url) as resp:
        err_data = json.loads(resp.read().decode())
    has_err = "error" in err_data
    
    w5_ok = (score is not None and is_trained is True and len(features_20) == 20 and 
             source_graph == "Live Neo4j Graph" and has_err is True and disclaimer is not None)
    
    first_few_feats = list(features_20.keys())[:4]
    log_wf(5, "ML Link Prediction", w5_ok, "Live Neo4j Graph + Trained LogisticRegression",
           f"Model: {model_used}, Prob: {score}, Pred: {pred}, Features (20): {first_few_feats}..., Error handling: {has_err}")

def run_workflow_6():
    """Workflow 6 — Analytics"""
    with urllib.request.urlopen(f"{base_url}/api/analytics/overview") as resp:
        adata = json.loads(resp.read().decode())
    
    tot_inc = adata.get("total_incidents")
    tot_sus = adata.get("total_suspects")
    tot_loc = adata.get("total_locations")
    tot_veh = adata.get("total_vehicles")
    neo_n = adata.get("neo4j_nodes")
    neo_r = adata.get("neo4j_relationships")
    crime_dist = len(adata.get("crime_type_distribution", []))
    dist_dist = len(adata.get("district_distribution", []))
    
    w6_ok = (tot_inc == 500 and tot_sus == 434 and tot_loc == 462 and tot_veh == 104 and 
             neo_n == 1670 and neo_r == 5639 and crime_dist == 8 and dist_dist == 22)
    
    log_wf(6, "Analytics Dashboard", w6_ok, "Live Neo4j Graph + Crime Intelligence Index",
           f"Incidents: {tot_inc}, Suspects: {tot_sus}, Locations: {tot_loc}, Vehicles: {tot_veh}, Neo4j Nodes: {neo_n}, Rels: {neo_r}, Crime Types: {crime_dist}, Districts: {dist_dist}")

def run_workflow_7():
    """Workflow 7 — Fallback Safety"""
    from backend.graph_service import GraphService
    
    # Save current env
    saved_uri = os.environ.get("NEO4J_URI")
    saved_pwd = os.environ.get("NEO4J_PASSWORD")
    
    try:
        os.environ["NEO4J_URI"] = "bolt://127.0.0.1:9999" # invalid port to test offline behavior
        os.environ["NEO4J_PASSWORD"] = "dummy"
        
        offline_gs = GraphService(data_dir="data")
        health = offline_gs.get_health_status()
        offline_ok = (health.get("neo4j_connected") is False and 
                      "Local" in health.get("data_mode"))
        
        # Check fallback queries operate smoothly
        f_search = offline_gs.search("Allen")
        f_case = offline_gs.get_case("JC100113")
        f_repeat = offline_gs.get_repeat_suspects()
        f_pred = offline_gs.predict_candidate_links("JC100113", "0100XX W FULLERTON AVE", "OCCURRED_AT")
        
        w7_ok = (offline_ok and len(f_search["suspects"]) > 0 and 
                 f_case is not None and len(f_repeat) == 61 and
                 f_pred.get("is_trained_model") is True and
                 f_pred.get("feature_data_source") == "Fallback In-Memory Graph")
        
        status_str = health.get("status")
        mode_str = health.get("data_mode")
        ml_src = f_pred.get("feature_data_source")
        sus_cnt = len(f_search["suspects"])
        rep_cnt = len(f_repeat)
        log_wf(7, "Fallback Safety", w7_ok, "In-Memory Knowledge Graph Snapshot Index",
               f"Offline Status: {status_str}, Data Mode: {mode_str}, Fallback Search Suspects: {sus_cnt}, Fallback Repeat Suspects: {rep_cnt}, ML Source: {ml_src}")
    finally:
        # Restore environment
        if saved_uri: os.environ["NEO4J_URI"] = saved_uri
        if saved_pwd: os.environ["NEO4J_PASSWORD"] = saved_pwd

if __name__ == "__main__":
    try: run_workflow_1()
    except Exception as e: log_wf(1, "FIR Investigation", False, "Error", "", str(e))

    try: run_workflow_2()
    except Exception as e: log_wf(2, "Case Investigation", False, "Error", "", str(e))

    try: run_workflow_3()
    except Exception as e: log_wf(3, "Graph Investigation", False, "Error", "", str(e))

    try: run_workflow_4()
    except Exception as e: log_wf(4, "Cross-Case Discovery", False, "Error", "", str(e))

    try: run_workflow_5()
    except Exception as e: log_wf(5, "ML Link Prediction", False, "Error", "", str(e))

    try: run_workflow_6()
    except Exception as e: log_wf(6, "Analytics", False, "Error", "", str(e))

    try: run_workflow_7()
    except Exception as e: log_wf(7, "Fallback Safety", False, "Error", "", str(e))

    print(json.dumps(report, indent=2))
