import os
import json
import random
import joblib
import numpy as np
import networkx as nx
from sklearn.model_selection import train_test_split
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score,
    roc_auc_score, confusion_matrix
)

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(CURRENT_DIR, "../.."))
KG_PATH = os.path.join(PROJECT_ROOT, "data", "crime_kg_nodes_edges.json")
OUTPUT_MODEL_PATH = os.path.join(CURRENT_DIR, "criminal_network_link_prediction_final.pkl")

ALL_NODE_TYPES = ["CASE", "SUSPECT", "CRIME_TYPE", "POLICE_BEAT", "LOCATION", "VEHICLE"]
ALL_RELATIONSHIPS = ["PERPETRATED_BY", "OFFENSE_TYPE", "OCCURRED_IN_BEAT", "OCCURRED_AT", "DRIVES_VEHICLE"]

FEATURE_NAMES = (
    ["degree1", "degree2", "common_neighbors", "jaccard", "degree_sum",
     "degree_diff", "degree_ratio", "adamic_adar", "resource_allocation"]
    + [f"shared_{t}" for t in ALL_NODE_TYPES]
    + [f"rel_{r}" for r in ALL_RELATIONSHIPS]
)

def get_pair_features(G, node1, node2, relationship):
    degree1 = G.degree(node1) if G.has_node(node1) else 0
    degree2 = G.degree(node2) if G.has_node(node2) else 0

    neighbors1 = set(G.neighbors(node1)) if G.has_node(node1) else set()
    neighbors2 = set(G.neighbors(node2)) if G.has_node(node2) else set()
    shared = neighbors1 & neighbors2
    union = neighbors1 | neighbors2

    common_neighbors = len(shared)
    jaccard = common_neighbors / len(union) if union else 0.0
    degree_sum = degree1 + degree2
    degree_diff = abs(degree1 - degree2)
    degree_ratio = min(degree1, degree2) / max(degree1, degree2) if max(degree1, degree2) > 0 else 0.0

    adamic_adar = 0.0
    resource_allocation = 0.0
    for n in shared:
        nd = G.degree(n)
        if nd > 1:
            adamic_adar += 1 / np.log(nd)
        if nd > 0:
            resource_allocation += 1 / nd

    shared_types = {}
    for n in shared:
        t = G.nodes[n].get("type")
        shared_types[t] = shared_types.get(t, 0) + 1

    features = [degree1, degree2, common_neighbors, jaccard, degree_sum,
                degree_diff, degree_ratio, adamic_adar, resource_allocation]

    for t in ALL_NODE_TYPES:
        features.append(shared_types.get(t, 0))

    for rel in ALL_RELATIONSHIPS:
        features.append(1 if relationship == rel else 0)

    return features

def train_and_export_model():
    print(f"Loading Knowledge Graph from {KG_PATH}...")
    with open(KG_PATH, "r", encoding="utf-8") as f:
        kg_data = json.load(f)

    G = nx.Graph()
    for node in kg_data["nodes"]:
        node_id = node["id"]
        attrs = {k: v for k, v in node.items() if k != "id"}
        G.add_node(node_id, **attrs)

    for edge in kg_data["edges"]:
        G.add_edge(edge["source"], edge["target"], relationship=edge["relationship"])

    print(f"Graph loaded: {G.number_of_nodes()} nodes, {G.number_of_edges()} edges")

    all_edges = list(G.edges(data=True))
    train_edges, test_edges = train_test_split(
        all_edges, test_size=0.20, random_state=42
    )

    G_train = nx.Graph()
    G_train.add_nodes_from(G.nodes(data=True))
    G_train.add_edges_from(train_edges)

    random.seed(42)
    existing_edges = {frozenset((u, v)) for u, v in G.edges()}

    test_positive = [(s, t, d["relationship"]) for s, t, d in test_edges]
    test_negative = []
    for source, target, relationship in test_positive:
        type1 = G.nodes[source]["type"]
        type2 = G.nodes[target]["type"]
        candidates1 = [n for n, d in G.nodes(data=True) if d.get("type") == type1]
        candidates2 = [n for n, d in G.nodes(data=True) if d.get("type") == type2]
        while True:
            n1 = random.choice(candidates1)
            n2 = random.choice(candidates2)
            if n1 != n2 and frozenset((n1, n2)) not in existing_edges:
                test_negative.append((n1, n2, relationship))
                break

    train_positive = [(s, t, d["relationship"]) for s, t, d in train_edges]
    train_negative = []
    for source, target, relationship in train_positive:
        type1 = G.nodes[source]["type"]
        type2 = G.nodes[target]["type"]
        candidates1 = [n for n, d in G.nodes(data=True) if d.get("type") == type1]
        candidates2 = [n for n, d in G.nodes(data=True) if d.get("type") == type2]
        while True:
            n1 = random.choice(candidates1)
            n2 = random.choice(candidates2)
            if n1 != n2 and frozenset((n1, n2)) not in existing_edges:
                train_negative.append((n1, n2, relationship))
                break

    print("Extracting features for training set...")
    X_train = []
    y_train = []

    for node1, node2, relationship in train_positive:
        G_temp = G_train.copy()
        if G_temp.has_edge(node1, node2):
            G_temp.remove_edge(node1, node2)
        X_train.append(get_pair_features(G_temp, node1, node2, relationship))
        y_train.append(1)

    for node1, node2, relationship in train_negative:
        X_train.append(get_pair_features(G_train, node1, node2, relationship))
        y_train.append(0)

    X_train = np.array(X_train, dtype=float)
    y_train = np.array(y_train, dtype=int)

    print("Extracting features for test set...")
    X_test = []
    y_test = []

    for node1, node2, relationship in test_positive:
        X_test.append(get_pair_features(G_train, node1, node2, relationship))
        y_test.append(1)

    for node1, node2, relationship in test_negative:
        X_test.append(get_pair_features(G_train, node1, node2, relationship))
        y_test.append(0)

    X_test = np.array(X_test, dtype=float)
    y_test = np.array(y_test, dtype=int)

    print("Training LogisticRegression model (random_state=42, max_iter=1000)...")
    model = LogisticRegression(random_state=42, max_iter=1000)
    model.fit(X_train, y_train)

    y_pred = model.predict(X_test)
    y_prob = model.predict_proba(X_test)[:, 1]

    acc = accuracy_score(y_test, y_pred)
    prec = precision_score(y_test, y_pred)
    rec = recall_score(y_test, y_pred)
    f1 = f1_score(y_test, y_pred)
    auc = roc_auc_score(y_test, y_prob)

    print(f"Results: Accuracy={acc:.4f}, Precision={prec:.4f}, Recall={rec:.4f}, F1={f1:.4f}, ROC-AUC={auc:.4f}")

    # Package metadata with model
    artifact = {
        "model": model,
        "feature_names": FEATURE_NAMES,
        "all_node_types": ALL_NODE_TYPES,
        "all_relationships": ALL_RELATIONSHIPS,
        "metrics": {
            "accuracy": round(float(acc), 4),
            "precision": round(float(prec), 4),
            "recall": round(float(rec), 4),
            "f1": round(float(f1), 4),
            "roc_auc": round(float(auc), 4)
        }
    }

    joblib.dump(artifact, OUTPUT_MODEL_PATH)
    print(f"Model saved successfully to {OUTPUT_MODEL_PATH}")
    return artifact

if __name__ == "__main__":
    train_and_export_model()
