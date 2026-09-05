# CrimeKG — Investigative Crime Knowledge Graph Platform

> An investigative research platform that combines NLP, ontologies, Knowledge Graphs, Neo4j, graph analytics, and machine learning to support discovery of relationships across crime records.

---

## Overview

**CrimeKG** is an end-to-end investigative research prototype designed to transform unstructured crime narratives into structured, interconnected intelligence.

The platform combines:

- Natural Language Processing (NLP)
- Ontology-based knowledge representation
- Knowledge Graph construction
- Neo4j graph database
- Interactive graph exploration
- Cross-case relationship discovery
- Graph-based analytics
- Machine Learning-based link prediction

The application allows an investigator to start with an FIR narrative, extract structured entities, investigate their connections through the Knowledge Graph, discover cross-case patterns, and use graph-based ML to identify potentially meaningful relationships.

> **Important:** Analytical relationships and ML predictions are investigative indicators only. They do not establish guilt, criminal responsibility, or legal conclusions.

---

## System Architecture

```text
                  FIR / Crime Narrative
                           │
                           ▼
                  NLP Entity Extraction
                           │
                           ▼
                  Structured Crime Data
                           │
                           ▼
                       Ontology
                           │
                           ▼
                  Knowledge Graph (KG)
                           │
                           ▼
                    Neo4j Graph DB
                           │
              ┌────────────┴────────────┐
              │                         │
              ▼                         ▼
        Backend / REST API        ML Link Prediction
              │                         │
              └────────────┬────────────┘
                           ▼
                 Investigative Web App
                           │
       ┌───────────────────┼───────────────────┐
       ▼                   ▼                   ▼
  Case Investigation   Graph Explorer      Analytics
       │                   │                   │
       └───────────────────┼───────────────────┘
                           ▼
                  Cross-Case Discovery
