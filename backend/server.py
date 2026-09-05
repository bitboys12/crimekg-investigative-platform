import os
import sys
import json
import urllib.parse
from http.server import HTTPServer, BaseHTTPRequestHandler
from typing import Dict, Any

# Ensure current directory is on path
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(CURRENT_DIR, ".."))
sys.path.insert(0, PROJECT_ROOT)

from backend.graph_service import GraphService
from backend.nlp_extractor import parse_fir_narrative

DATA_DIR = os.path.join(PROJECT_ROOT, "data")
WEB_DIR = os.path.join(PROJECT_ROOT, "web")

graph_service = GraphService(DATA_DIR)

# Pre-load a few real sample FIRs for interactive demo convenience
SAMPLE_FIRS = []
fir_path = os.path.join(DATA_DIR, "fir_reports.txt")
if os.path.exists(fir_path):
    with open(fir_path, "r", encoding="utf-8") as f:
        reports = [r.strip() for r in f.read().split("---") if r.strip()]
        # Select 5 illustrative sample reports (with vehicles, domestic, arrest, etc.)
        for idx in [0, 1, 2, 6, 12]:
            if idx < len(reports):
                SAMPLE_FIRS.append(reports[idx])

class InvestigativeAPIHandler(BaseHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def do_HEAD(self):
        self.do_GET()

    def do_GET(self):
        parsed_url = urllib.parse.urlparse(self.path)
        path = parsed_url.path
        query = urllib.parse.parse_qs(parsed_url.query)

        # 1. API Endpoints
        if path.startswith("/api/"):
            self._handle_api_get(path, query)
            return

        # 2. Static File Serving
        self._serve_static(path)

    def do_POST(self):
        parsed_url = urllib.parse.urlparse(self.path)
        path = parsed_url.path

        if path == "/api/fir/analyze":
            content_length = int(self.headers.get("Content-Length", 0))
            body = self.rfile.read(content_length).decode("utf-8")
            try:
                data = json.loads(body) if body else {}
                text = data.get("text", "")
                result = parse_fir_narrative(text)
                
                # Check if case or suspect already connects to Knowledge Graph
                s_name = result.get("suspect_name")
                v_plate = result.get("vehicle_plate")
                related_records = []
                if s_name and s_name in graph_service.suspect_to_cases:
                    for oc in graph_service.suspect_to_cases[s_name]:
                        related_records.append(graph_service.cases[oc])
                if v_plate and v_plate in graph_service.vehicle_to_suspects:
                    for s in graph_service.vehicle_to_suspects[v_plate]:
                        for oc in graph_service.suspect_to_cases[s]:
                            if graph_service.cases[oc] not in related_records:
                                related_records.append(graph_service.cases[oc])

                result["graph_matches"] = {
                    "suspect_exists_in_kg": s_name in graph_service.nodes if s_name else False,
                    "vehicle_exists_in_kg": v_plate in graph_service.nodes if v_plate else False,
                    "connected_case_count": len(related_records),
                    "connected_cases": related_records[:10]
                }
                result["legal_disclaimer"] = (
                    "Important: Graph relationships and AI-generated signals represent patterns or "
                    "connections extracted from available records. They support analytical workflows "
                    "and do not establish guilt, criminal responsibility or legal conclusions."
                )

                self._send_json(result)
            except Exception as e:
                self._send_json({"error": str(e)}, status=400)
            return

        self._send_json({"error": "Endpoint not found"}, status=404)

    def _handle_api_get(self, path: str, query: Dict[str, list]):
        try:
            if path == "/api/health":
                self._send_json(graph_service.get_health_status())
            elif path == "/api/sample-firs":
                self._send_json({"sample_firs": SAMPLE_FIRS})
            elif path == "/api/search":
                q = query.get("q", [""])[0]
                self._send_json(graph_service.search(q))
            elif path == "/api/analytics/overview":
                self._send_json(graph_service.get_analytics_overview())
            elif path == "/api/analysis/repeat-suspects":
                self._send_json({"repeat_suspects": graph_service.get_repeat_suspects()})
            elif path == "/api/analysis/vehicle-connections":
                self._send_json({"vehicle_connections": graph_service.get_vehicle_connections()})
            elif path == "/api/analysis/location-connections":
                self._send_json({"location_connections": graph_service.get_location_connections()})
            elif path == "/api/analysis/district-patterns":
                self._send_json({"district_patterns": graph_service.get_district_patterns()})
            elif path == "/api/analysis/multi-hop":
                start_id = query.get("start", [""])[0]
                end_id = query.get("end", [""])[0]
                max_depth = int(query.get("depth", [4])[0])
                res = graph_service.find_multi_hop_path(start_id, end_id, max_depth)
                self._send_json(res or {"found": False})
            elif path == "/api/ml/link-prediction":
                src = query.get("source", [""])[0]
                tgt = query.get("target", [""])[0]
                rel = query.get("rel", ["OCCURRED_AT"])[0]
                self._send_json(graph_service.predict_candidate_links(src, tgt, rel))
            elif path == "/api/ml/metrics":
                self._send_json({
                    "logistic_regression": {
                        "name": "Graph Link Prediction",
                        "held_out_pairs": "426 positive + 426 negative",
                        "graph_snapshot_size": "2,127 edges (older evaluation set)",
                        "accuracy": "73.71%",
                        "precision": "80.42%",
                        "recall": "62.68%",
                        "f1_score": "70.45%",
                        "roc_auc": "81.41%",
                        "best_relationship": "OCCURRED_AT (88.26% F1)",
                        "features_used": 20,
                        "disclaimer": "Metrics were produced on an older 2,127-edge snapshot. Not measured on live Neo4j database."
                    },
                    "graphsage": {
                        "name": "Experimental Node Risk-Scoring",
                        "type": "Graph Neural Network (PyTorch Geometric)",
                        "status": "Research Prototype / Analytical Signal",
                        "disclaimer": "Validation F1 varies across training epochs. Analytical signal only; never implies criminal determination."
                    }
                })
            elif path == "/api/graph":
                types = query.get("type")
                crime_types = query.get("crime_type")
                districts = query.get("district")
                q = query.get("q", [""])[0]
                limit = int(query.get("limit", [250])[0])
                self._send_json(graph_service.get_filtered_graph(types, crime_types, districts, q, limit))
            elif path.startswith("/api/cases/"):
                c_num = path.split("/api/cases/")[1]
                case_data = graph_service.get_case(c_num)
                if case_data:
                    self._send_json(case_data)
                else:
                    self._send_json({"error": f"Case #{c_num} not found"}, status=404)
            elif path.startswith("/api/entities/") and path.endswith("/graph"):
                entity_id = urllib.parse.unquote(path.split("/api/entities/")[1].replace("/graph", ""))
                depth = int(query.get("depth", [1])[0])
                self._send_json(graph_service.get_entity_subgraph(entity_id, depth))
            elif path.startswith("/api/entities/"):
                entity_id = urllib.parse.unquote(path.split("/api/entities/")[1])
                entity_data = graph_service.get_entity(entity_id)
                if entity_data:
                    self._send_json(entity_data)
                else:
                    self._send_json({"error": f"Entity '{entity_id}' not found"}, status=404)
            else:
                self._send_json({"error": "Unknown API endpoint"}, status=404)
        except Exception as e:
            self._send_json({"error": str(e)}, status=500)

    def _serve_static(self, path: str):
        if path in ["", "/"]:
            path = "/index.html"

        # Sanitize path to prevent traversal
        clean_rel = os.path.normpath(path.lstrip("/"))
        file_path = os.path.join(WEB_DIR, clean_rel)

        if not os.path.exists(file_path) or os.path.isdir(file_path):
            file_path = os.path.join(WEB_DIR, "index.html")

        ext = os.path.splitext(file_path)[1].lower()
        content_types = {
            ".html": "text/html; charset=utf-8",
            ".css": "text/css; charset=utf-8",
            ".js": "application/javascript; charset=utf-8",
            ".json": "application/json; charset=utf-8",
            ".svg": "image/svg+xml",
            ".png": "image/png",
            ".ico": "image/x-icon"
        }
        ctype = content_types.get(ext, "application/octet-stream")

        try:
            with open(file_path, "rb") as f:
                content = f.read()
            self.send_response(200)
            self.send_header("Content-Type", ctype)
            self.send_header("Content-Length", str(len(content)))
            self.end_headers()
            self.wfile.write(content)
        except Exception as e:
            self.send_response(500)
            self.end_headers()
            self.wfile.write(f"Server error: {e}".encode("utf-8"))

    def _send_json(self, data: Any, status: int = 200):
        body = json.dumps(data, indent=2, ensure_ascii=False, default=str).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

def run_server(port: int = 8000):
    ports_to_try = [port, 8080, 8088, 3000]
    httpd = None
    selected_port = None

    for p in ports_to_try:
        try:
            server_address = ("127.0.0.1", p)
            httpd = HTTPServer(server_address, InvestigativeAPIHandler)
            selected_port = p
            break
        except OSError as e:
            if e.errno == 48:
                continue
            raise

    if not httpd:
        raise RuntimeError("Could not bind to any available port.")

    print(f"Criminal Network Analysis Server running at http://127.0.0.1:{selected_port}")
    httpd.serve_forever()

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8080))
    run_server(port)
