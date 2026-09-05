AI-Powered Criminal Network Analysis

Smart India Hackathon 2026 — SIH26189
Team: banDds
Theme: Blockchain and Cybersecurity

Overview

This project transforms unstructured FIR narratives and structured crime records into an interconnected Knowledge Graph for cross-case investigative analysis.

FIR / Crime Records → NLP Extraction → Ontology Mapping → RDF/TTL → Knowledge Graph → Graph ML → Web Investigation Interface

The system is designed to help authorized investigators and crime analysts discover recurring entities, potential relationships, and network patterns across cases. AI outputs are investigative signals, not determinations of guilt or criminal responsibility.

Key Features

NLP-based FIR extraction — identifies case, suspect, crime, place, police beat and vehicle information.

Ontology-driven representation — uses Protégé/OWL to define reusable classes and relationships.

RDF/TTL knowledge representation — represents structured information as semantic triples.

Knowledge Graph analysis — connects cases, people, vehicles, locations, crime types and administrative entities.

Graph ML — Logistic Regression for graph link prediction and an experimental GraphSAGE model for node-level signal scoring.

Relationship discovery — supports repeat-entity, vehicle, location and cross-case analysis.

Web investigation interface — intended to provide FIR analysis, search, interactive graph exploration and analytics.

Evidence-aware missing-data handling — intentional nulls are preserved; unsupported values are never fabricated.

Current Knowledge Graph

Current Neo4j database

The current Neo4j database reports:

1,670 nodes

5,639 relationships (edges)

The Neo4j database contains the crime graph together with ontology/schema resources and their associated relationships. Therefore, the Neo4j database totals should not be assumed to equal the smaller static JSON snapshot.

Older static KG JSON snapshot

The supplied crime_kg_nodes_edges(2).json represents an older graph snapshot containing:

1,530 nodes

2,500 relationships / edges

For the new web application, live Neo4j data should be treated as authoritative for graph counts and graph exploration. The JSON may be used as a development/fallback source.

Crime-domain data represented in the project

Entity / Metric

Count

FIR narratives

500

Cases / CrimeIncident records

500

Suspects

434

Locations

462

Vehicles

104

Police beats

22

Crime types

8

Ontology classes

13

Vehicle nodes and relationships are created only when a vehicle plate is present. Intentional missing values must remain missing.

Knowledge Graph Characteristics

The graph is:

Entity-centric — represents cases, suspects, locations, vehicles, crime types and administrative entities.

Relationship-rich — represents meaningful connections between entities.

Heterogeneous — supports multiple node and relationship types.

Semantic — ontology and RDF/OWL provide meaning and structure.

Multi-hop — enables indirect relationship discovery across cases.

Queryable — Neo4j/Cypher supports relationship-based investigation.

Explainable — findings can be traced through underlying graph paths.

AI-ready — graph structure can be used for ML-based candidate relationship and network analysis.

Machine Learning

Logistic Regression — Link Prediction

The experiment uses 20 pair-level graph features, including node degree, common neighbors, Jaccard similarity, Adamic-Adar, resource allocation, node-type indicators and relationship indicators.

Held-out evaluation on 426 positive + 426 negative pairs:

Accuracy: 73.71%

Precision: 80.42%

Recall: 62.68%

F1: 70.45%

ROC-AUC: 81.41%

Best relationship F1: OCCURRED_AT — 88.26%

Important: these metrics were obtained on an older 2,127-edge graph snapshot. They are not performance measurements of the current 5,639-relationship Neo4j database.

GraphSAGE

An experimental GraphSAGE node-classification/risk-scoring model is also included. Its validation F1 varied across training epochs, so it should be treated as an experimental model rather than a production performance claim.

Technology Stack

Python — data processing and pipeline

spaCy + EntityRuler — FIR entity extraction

Protégé / OWL — ontology development

RDF / TTL — semantic knowledge representation

NetworkX — graph construction and analysis

Neo4j + Cypher — graph storage, querying and visualization

scikit-learn — Logistic Regression and evaluation

PyTorch Geometric — GraphSAGE experimentation

End-to-End Methodology

Submit — FIR information is uploaded or entered.

Extract — NLP identifies entities and structured attributes.

Map — extracted information is mapped to the ontology.

Represent — structured information is represented using RDF/TTL.

Connect — information is loaded into the Knowledge Graph.

Analyze — graph queries and ML identify candidate relationships and patterns.

Explore — investigators use the web interface to search and inspect graph relationships.

Web Platform

The new web application is being rebuilt from scratch around the existing project pipeline and Neo4j database.

Planned/required capabilities include:

FIR upload / paste and analysis

Entity extraction results

Search across cases, suspects, vehicles, locations and crime types

Case and entity detail views

Interactive Knowledge Graph Explorer

Multi-hop relationship exploration

Relationship discovery and analytics

Live Neo4j-backed graph queries

Clear display of source records behind graph findings

Appropriate handling of missing/null values

The frontend must not contain Neo4j credentials. Database access should be handled through a backend/API layer.

The interface must communicate that graph relationships and ML outputs are investigative signals derived from available records and do not establish guilt or legal conclusions.

Source-of-Truth Rules

When building or extending the web application:

Live Neo4j database — authoritative for current graph state, counts and query results.

Latest populated ontology / TTL files — authoritative for ontology structure.

Latest dataset and pipeline files — authoritative for source fields and processing behaviour.

KG JSON — development/fallback snapshot; older than the current Neo4j database.

README / UI prompt — describes intended product behaviour and must not override the actual supplied schema.

Before writing graph queries, inspect the actual Neo4j labels, relationship types, properties and identifiers.

The Neo4j database may contain ontology/schema resources such as Class, Ontology, ObjectProperty, DatatypeProperty and Resource. These must not be confused with crime-domain entities.

Running the Project

Create and activate a Python virtual environment.

Install Python dependencies:

pip install -r requirements.txt

Place the supplied project data and model files in the locations expected by their modules.

Run the NLP, ontology/KG and ML components according to their module instructions.

Configure Neo4j connection details through environment variables or the backend configuration mechanism.

Never commit database credentials, API keys or .env files.

Suggested Repository Structure

crime-network-analysis/
├── README.md
├── requirements.txt
├── GEMINI.md
├── data/
│   ├── crime_dataset(3).csv
│   └── fir_reports(1).txt
├── ontology/
│   ├── final_ontology(3).ttl
│   └── populated_crime_ontology(3).ttl
├── knowledge_graph/
│   └── crime_kg_nodes_edges(2).json
├── pipeline/
│   └── pipeline(3).py
├── ml/
│   ├── MLModel(1).ipynb
│   └── GraphSAGE_Model(6).ipynb
└── web/
    └── [new web application]

Responsible Use

This is an analytical prototype / research demonstration.

Graph relationships represent connections extracted from available records.

A predicted or flagged relationship is a potential investigative signal, not proof.

ML scores must not be interpreted as proof of guilt, criminal responsibility or legal conclusions.

High-impact findings should be reviewed by authorized investigators.

Intentional nulls and unavailable values must be preserved.

Sensitive investigative data should not be committed to a public repository.

Never commit API keys, passwords, database credentials or .env files.

Future Enhancements

Potential extensions include temporal crime-network reconstruction, crime-pattern similarity, anomaly/contradiction detection, a natural-language Investigation Copilot, explainable multi-hop link discovery, tamper-evident evidence provenance and privacy-conscious cross-jurisdiction analysis.

These are proposed extensions unless their implementation is explicitly present in the repository.

Disclaimer

Prototype / Research Demonstration

This platform is intended to demonstrate Knowledge-Graph-based crime record analysis. Information shown is derived from available records and should not be interpreted as a legal determination.