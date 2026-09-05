GEMINI.md — AI Criminal Network Analysis / Web Application Build Specification

0. INSTRUCTION TO THE CODING AGENT

You are building a new web application from scratch for the Smart India Hackathon 2026 project:

Problem Statement: SIH26189 — AI Criminal Network Analysis

Team: banDds

Theme: Blockchain and Cybersecurity

Project type: investigative / crime-record intelligence research prototype

This file is the product + engineering specification. The accompanying project files are the source-of-truth for the existing NLP pipeline, ontology, Knowledge Graph data and ML experiments.

Before writing code

Inspect every supplied project file.

Understand the actual schema, node labels, relationship names, field names and data types from the files rather than inventing them.

Treat the latest supplied dataset, ontology, populated TTL and KG JSON as authoritative over older versions.

Do not copy assumptions from an older website mockup if they conflict with the supplied files.

Build the web application around the actual project pipeline and data.

Start with a clean, maintainable architecture; do not patch or recreate an old website.

Keep frontend, backend, data-access and graph-visualization logic separated.

Do not expose database credentials in frontend code.

The objective is a working presentation-ready investigative interface, not merely a static UI mockup.

1. PROJECT PURPOSE

The project converts unstructured FIR narratives and structured crime records into a semantic Knowledge Graph and then uses graph analysis / ML to help investigators discover recurring entities, relationships and network patterns across cases.

Core pipeline:

FIR / Crime Records → NLP Extraction → Ontology Mapping → RDF/TTL → Knowledge Graph → Graph Analysis / ML → Web Investigation Interface

The website is the investigation and visualization layer over this pipeline.

The system must communicate clearly that AI produces analytical signals and candidate relationships, not legal conclusions.

2. CURRENT PROJECT DATA

The current Neo4j database contains:

1,670 nodes

5,639 relationships (edges)

The Neo4j database includes the crime Knowledge Graph together with ontology/schema resources and their associated RDF/OWL relationships. Therefore, the Neo4j database totals are not expected to match the smaller static KG JSON snapshot exactly.

The currently available static KG JSON is an older graph snapshot containing:

1,530 nodes

2,500 relationships / edges

Do not treat the 1,530 / 2,500 JSON snapshot as the current Neo4j database size.

The crime-data entity counts represented in the current project include:

500 cases / CrimeIncident records

434 Suspect entities

462 Location entities

104 Vehicle entities

22 PoliceBeat entities

8 CrimeType entities

13 ontology classes

Important data rule:

Vehicle nodes and vehicle relationships exist only when a vehicle plate is present. Intentional null / missing values must remain missing. Never fabricate a vehicle, person, location or other value merely to make the UI look complete.

For the website, prefer live Neo4j queries for database counts and graph exploration. Use the KG JSON only as a development/fallback dataset when Neo4j is unavailable.

3. SOURCE-OF-TRUTH RULES

Use the supplied project artifacts in this order when resolving conflicts:

Live Neo4j database — authoritative for the current graph state, node/relationship counts and query results.

Latest populated ontology / TTL files — authoritative for ontology classes, properties and semantic structure.

Latest dataset and pipeline files — authoritative for source fields and NLP/data-processing behaviour.

KG JSON — development/fallback snapshot; it is older than the current Neo4j database.

This prompt — defines product behaviour, UI expectations and engineering constraints, but must not override the actual schema in the supplied project files.

Before implementing graph queries, inspect the actual Neo4j labels, relationship types, properties and identifiers. The database summary may contain ontology/schema resources such as Class, Ontology, ObjectProperty, DatatypeProperty and Resource; do not mistake those ontology resources for crime-domain entities.

The website should present the crime-domain graph cleanly while allowing the backend to query the full database.

3. ONTOLOGY / DOMAIN MODEL

The current populated ontology defines these 13 classes:

PoliceDistrict

Suspect

CommunityArea

PremiseType

Location

Vehicle

FBICode

CrimeDescription

PoliceBeat

Ward

IUCRCode

CrimeType

CrimeIncident

Important conceptual relationships include:

CrimeIncident → hasSuspect → Suspect

Suspect → drivesVehicle → Vehicle

CrimeIncident → hasCrimeType → CrimeType

CrimeIncident → hasDescription → CrimeDescription

CrimeIncident → occurredAt → Location

CrimeIncident → occurredInCommunityArea → CommunityArea

CrimeIncident → occurredInDistrict → PoliceDistrict

CrimeIncident → occurredInBeat → PoliceBeat

CrimeIncident → occurredInWard → Ward

CrimeIncident → hasIUCRCode → IUCRCode

CrimeIncident → hasFBICode → FBICode

CrimeIncident → hasPremiseType → PremiseType

Do not hardcode these relationships if the actual TTL/JSON uses a different machine-level property name. Read the supplied files and map their real identifiers to human-readable labels in the UI.

Never display raw WebProtégé / RDF identifiers to the user.

4. ML CONTEXT

The project contains two graph-ML experiments.

Logistic Regression — graph link prediction

The experiment uses graph features including:

node degree

common neighbors

Jaccard similarity

Adamic-Adar

resource allocation

node-type indicators

relationship indicators

Held-out evaluation:

426 positive pairs + 426 negative pairs

Accuracy: 73.71%

Precision: 80.42%

Recall: 62.68%

F1: 70.45%

ROC-AUC: 81.41%

Best relationship F1: OCCURRED_AT — 88.26%

Important: these metrics were produced on an older 2,127-edge graph snapshot. Do not imply that the reported metrics were measured on either the current 5,639-relationship Neo4j database or the older 2,500-relationship JSON snapshot.

GraphSAGE

GraphSAGE is an experimental node-classification / risk-scoring model. Its validation F1 varied across training epochs.

Therefore:

do not present GraphSAGE as a production-grade classifier;

do not present unstable validation results as a guaranteed accuracy;

if surfaced in the UI, label it as an experimental analytical signal;

never label a person as a criminal based on an ML score.

The web application does not need to retrain models. It should consume existing outputs or provide a clean API boundary for future ML integration.

5. WHAT THE WEBSITE SHOULD DO

The main user workflow should be:

Home → Analyze FIR / Search → Inspect extracted information → Open case/entity → Explore Knowledge Graph → Discover relationships → Review analytics

The website should support:

FIR upload / FIR text input

FIR analysis workflow

Structured extraction results

Universal search

Case detail pages

Entity detail pages

Interactive Knowledge Graph Explorer

Cross-case relationship discovery

Analytics dashboard

Data tables

Methodology / explainability information

Clear legal-neutrality notices

Do not add features merely because they sound impressive. Prioritize features that are demonstrable and connected to the actual project.

6. HOMEPAGE

Headline:

Connecting Crime Records. Revealing Hidden Relationships.

Supporting message:

An intelligent FIR analysis platform that transforms crime reports and structured records into a connected Knowledge Graph for contextual analysis and relationship discovery.

Primary CTA:

Analyze an FIR

Secondary CTA:

Explore Knowledge Graph

The hero should visually communicate the pipeline without showing a huge random graph.

Use a restrained graph illustration containing examples such as:

CASE — SUSPECT — VEHICLE — LOCATION — CRIME TYPE — DISTRICT

Include a concise explanation of why a Knowledge Graph is useful:

From isolated records to connected intelligence.

7. SYSTEM STATUS / DATA OVERVIEW

Show data-driven summary statistics rather than hardcoded decorative numbers.

Suggested metrics:

500 Cases

434 Suspects

462 Locations

104 Vehicles

22 Police Beats

8 Crime Types

1,670 Neo4j Database Nodes

5,639 Neo4j Database Relationships

If these values are obtained from Neo4j/API, the UI should update automatically.

Important: distinguish database totals from the older static KG JSON snapshot (1,530 nodes / 2,500 relationships). Do not silently substitute one for the other.

System status should be clearly distinguishable from the dataset metrics. Do not claim that the system is operational if the backend is actually unavailable; represent connection state honestly.

8. FIR ANALYSIS PAGE

Title:

FIR Analysis

Subtitle:

Extract structured intelligence from an unstructured report.

Provide two input modes:

A. Upload FIR

Support the file formats actually implemented by the backend. Do not promise PDF/DOCX processing unless the backend supports it.

B. Paste FIR Text

Large accessible text area.

Primary action:

Analyze FIR

Processing states should be visible:

Document received

Extracting entities

Identifying relationships

Mapping to ontology

Updating / querying Knowledge Graph

Analysis complete

Provide proper loading, success and error states.

Do not fake a successful graph update when only mock data was used.

9. EXTRACTION RESULTS

After FIR analysis, show structured information in a clean government-style information layout.

Possible sections:

Incident

Case number

Date / time

Crime type

Crime description

IUCR

FBI code

Suspect

Name / identifier

Vehicle

Vehicle plate, only if present

Location

Location

Administrative information

Police district

Police beat

Ward

Community area

Premise type

Extracted relationships

Show which relationships were actually extracted.

Do not turn every field into a large colorful card. Prefer compact labels, values and grouped information.

For missing values, display a neutral representation such as Not available in submitted record rather than inventing a value.

10. KNOWLEDGE GRAPH EXPLORER — SIGNATURE FEATURE

This is the most important visual component of the application.

Title:

Knowledge Graph Explorer

Subtitle:

Explore how incidents, people, vehicles, places and classifications are connected.

Recommended layout:

LEFT — Controls

Entity search

Entity type filter

Crime type filter

District filter

Ward / community-area filter where supported

Date filter where supported by the data

Relationship-depth selector

Reset / Clear filters

CENTER — Graph

Large interactive graph canvas.

RIGHT — Selected entity

Display:

entity name

entity type

important attributes

connected incident count

relationship count

related entities

actions such as Focus / Expand / Open Case where applicable

Below or beside the graph, provide a Related Crime Incidents list/table.

11. GRAPH BEHAVIOUR

The graph must be genuinely interactive.

Required interactions:

zoom

pan

fit to screen

select node

highlight selected node

highlight connected edges

dim unrelated nodes

hover information

expand connected relationships

collapse / reset graph

search and focus an entity

open case/entity details

Relationship labels should appear on hover or when useful, rather than making a dense graph unreadable.

Directional relationships should be visually understandable.

The graph should start with a focused, readable subgraph rather than rendering the entire database at once. Do not attempt to render all 1,670 Neo4j nodes simultaneously.

Do not hardcode a graph around one example case.

The graph component must consume a generic node/relationship data structure so it works with different search results and API responses.

12. GRAPH NODE PRESENTATION

Use restrained category colors. Suggested mapping:

CrimeIncident — deep blue

Suspect — muted teal

Vehicle — institutional gold

Location — muted rose / neutral

CrimeType — amber

Administrative entities — soft gray-blue

The colors are for visual categorization, not legal risk labels.

Do not use red to imply guilt.

Never display raw RDF/WebProtégé URIs.

Human-readable labels should be used, e.g.:

case number

suspect name

vehicle plate

crime type

location

13. UNIVERSAL SEARCH

Create a prominent search experience:

Search case number, suspect, vehicle plate, location, or crime type...

Results should be grouped by entity type where practical:

Crime Incidents

Suspects

Vehicles

Locations

Crime Types

Administrative entities

Clicking a result should open its details and/or graph context.

Search must query the backend / data layer rather than only filtering hardcoded frontend data.

14. CASE DETAIL

A case page should contain:

Incident Information

Case number

Date/time

Crime type

Description

IUCR

FBI

Related entities

Suspect

Vehicle, only when available

Location

Administrative entities

Relationship Graph

A focused graph centered on the selected incident.

Connected records

Cases or entities connected through available graph relationships.

Provide clear navigation back to search / graph exploration.

15. ENTITY DETAIL

Support entity-level detail views for at least:

Suspect

Vehicle

Location

CrimeIncident

CrimeType

An entity page should show:

readable identifier/name

entity type

relevant attributes

records in which the entity appears

graph context

relationship list

Use neutral wording such as:

Entity appears in multiple records.

Do not use wording that asserts criminal responsibility.

16. RELATIONSHIP DISCOVERY

Create an investigation-oriented section for graph analysis.

Repeat entities

Find entities that occur across multiple crime incidents.

Vehicle connections

Find suspects / incidents connected through available vehicle records.

Location connections

Find multiple incidents associated with the same location.

District patterns

Find recurring incidents within administrative regions.

Multi-hop connections

Allow investigators to explore indirect paths across multiple entity types.

Results should be understandable as both:

graph

table/list

Where an ML-predicted link is shown, clearly label it as a potential / predicted relationship rather than an established fact.

17. ANALYTICS DASHBOARD

Title:

Crime Intelligence Overview

Use actual graph/data values.

Useful analytics include:

total incidents

crime-type distribution

incidents by district

incidents over time

premise distribution

suspect recurrence

vehicle recurrence

location recurrence

graph node / relationship counts

Prefer a small number of useful charts over a dashboard filled with decorative charts.

Charts should be clean, readable and filterable where practical.

18. METHODOLOGY PAGE

Explain the actual project pipeline as a visual four/five-step process:

01 — Submit

Upload or enter FIR information.

02 — Extract

NLP identifies entities and structured attributes.

03 — Connect

Extracted information is mapped to the ontology and represented as RDF/TTL / Knowledge Graph data.

04 — Analyze

Graph queries and ML identify recurring patterns and candidate relationships.

05 — Explore

Investigators interact with cases, entities and graph relationships through the web interface.

Do not imply that the website itself replaces the NLP / ontology / KG pipeline.

19. LEGAL NEUTRALITY / EXPLAINABILITY — MANDATORY

Never say:

"This person is guilty."

"This suspect committed these crimes."

"This vehicle belongs to a criminal."

"AI identified the criminal."

Use:

"Entity appears in multiple records."

"The graph identifies a relationship between..."

"The submitted FIR contains..."

"Records are connected through..."

"Potential relationship detected in the available data."

"Predicted relationship — requires investigator verification."

Required notice:

Important: Graph relationships and AI-generated signals represent patterns or connections extracted from available records. They support analytical workflows and do not establish guilt, criminal responsibility or legal conclusions.

This notice should appear in relevant analytical areas, especially graph/ML outputs.

20. RESPONSIBLE DATA HANDLING

The current project contains synthetic / demonstration data.

Clearly label demo information where appropriate.

Do not expose sensitive credentials.

Never commit:

Neo4j passwords

API keys

tokens

.env files containing secrets

private production investigative data

Use environment variables for backend configuration.

The frontend must never contain Neo4j credentials.

21. TECHNICAL ARCHITECTURE

Preferred architecture:

React / Vite Frontend
        ↓
REST API / JSON
        ↓
Python Backend
   ├── FIR processing
   ├── NLP integration
   ├── search
   ├── graph retrieval
   ├── analytics
   └── Neo4j driver
        ↓
Neo4j

The existing KG JSON can be used as a local/read-only development data source when a live Neo4j connection is unavailable.

However, keep the data-access layer abstract so the application can switch between:

local KG JSON / mock development data

live Neo4j

future API services

without rewriting UI components.

Do not place Cypher queries directly inside reusable frontend components.

22. API DESIGN

Use a clean service layer.

Suggested endpoints:

GET  /api/health
POST /api/fir/analyze
GET  /api/search?q=
GET  /api/cases/:caseNumber
GET  /api/entities/:id
GET  /api/entities/:id/graph
GET  /api/analytics/overview
GET  /api/analysis/repeat-suspects
GET  /api/analysis/vehicle-connections
GET  /api/analysis/location-connections
GET  /api/analysis/district-patterns

These are architectural suggestions, not requirements to create fake endpoints that do nothing.

If an endpoint is not implemented yet, isolate the interface and provide a clearly marked development fallback rather than pretending it is connected.

23. GRAPH DATA CONTRACT

The frontend graph component should receive normalized data approximately like:

{
  "nodes": [
    {
      "id": "unique-id",
      "label": "Human readable label",
      "type": "Suspect",
      "properties": {}
    }
  ],
  "relationships": [
    {
      "source": "source-id",
      "target": "target-id",
      "type": "hasSuspect",
      "properties": {}
    }
  ]
}

Adapt this to the actual graph JSON schema after inspecting the file.

The UI must not depend on a single hardcoded example.

24. FRONTEND DESIGN LANGUAGE

The product should feel like:

Government digital service + investigative analysis platform + premium data visualization

Personality:

authoritative

calm

intelligent

official

analytical

evidence-oriented

modern

accessible

Avoid:

cyberpunk

hacker aesthetics

crypto/Web3 styling

neon AI branding

gaming UI

excessive glassmorphism

generic dark SaaS dashboards

sensational crime imagery

Do not imitate an actual government department's logo, seal or identity.

Use a neutral geometric emblem / project mark.

25. VISUAL SYSTEM

Primary:

Deep Government Navy: #12304A

Dark Ink: #17212B

Government Blue: #1E5A85

Secondary:

Muted Teal: #2F7473

Institutional Gold: #B38B2E

Background:

Warm White: #F7F8F6

White: #FFFFFF

Soft Gray: #E9EDF0

Text:

Primary: #17212B

Secondary: #56636F

Muted: #7A858D

Status:

Success: #2E7D5B

Warning: #B7791F

Alert: #B74747

Use colors with restraint. Never use neon.

26. TYPOGRAPHY

Preferred:

Headings: Source Serif 4

UI/body: Source Sans 3

Technical identifiers: IBM Plex Mono

Use IBM Plex Mono for:

case numbers

IUCR codes

FBI codes

vehicle plates

other technical identifiers

Do not use futuristic fonts.

27. NAVIGATION

Main navigation:

Home

FIR Analysis

Knowledge Graph

Analytics

Methodology

About

Prominent actions:

Search

Analyze FIR

Use breadcrumbs on deeper pages.

Navigation should remain consistent across the application.

28. RESPONSIVE DESIGN

Desktop

full navigation

investigation sidebar

large graph canvas

selected-entity details panel

Tablet

collapsible controls

large graph

adaptable details panel

Mobile

compact navigation

full-width graph

details as a bottom sheet / stacked section

stacked forms

mobile-friendly tables

Do not merely shrink the desktop layout.

29. ACCESSIBILITY

Implement:

semantic HTML

keyboard navigation

visible focus states

ARIA labels

proper form labels

high contrast

reduced-motion support

accessible tables

text alternatives for graph information

Do not make important information dependent only on color.

30. MOTION

Motion should communicate state or interaction.

Use subtle transitions around 150–250ms where appropriate.

Useful motion:

graph selection

graph expansion

upload progress

page transitions

hover states

Avoid:

giant parallax

bouncing UI

flashing elements

neon glow

distracting cursor effects

Respect prefers-reduced-motion.

31. EMPTY / LOADING / ERROR STATES

Empty:

No connected records found

"Try expanding the search criteria or selecting another entity."

Loading:

Analyzing FIR...

Show meaningful processing stages.

Error:

Analysis could not be completed

"Check the submitted document or try again."

Button:

Try again

Never hide backend/API errors silently.

32. TABLES

Government-style tables should support where relevant:

search

sorting

filtering

pagination

row selection

navigation to case/entity detail

export only if actually implemented

Possible case table fields:

Case Number

Date

Crime Type

Suspect

District

Location

Status

Use compact readable typography.

33. BACKGROUND / VISUAL DECORATION

A subtle institutional/data-grid background may be used:

faint grid

thin data lines

tiny coordinate markers

restrained node pattern

Keep opacity low.

The background must never compete with investigation data.

34. IMAGES

Prefer abstract / contextual imagery only when it genuinely improves the interface:

city infrastructure

maps

documents

government/public-service environments

data-analysis environments

abstract geographic textures

Avoid:

gore

weapons as decoration

mugshots

sensational crime imagery

hacker stock imagery

The graph itself should be the main visual feature.

35. COMPONENT / CODE ORGANIZATION

If using React/Vite, use a maintainable structure similar to:

src/
├── components/
│   ├── layout/
│   ├── graph/
│   ├── search/
│   ├── fir/
│   ├── cases/
│   ├── entities/
│   ├── analytics/
│   └── common/
├── pages/
├── services/
│   ├── api.js
│   └── graph.js
├── hooks/
├── utils/
├── data/
└── styles/

Backend example:

backend/
├── app/
│   ├── main.py
│   ├── routes/
│   ├── services/
│   ├── graph/
│   ├── nlp/
│   └── models/
├── tests/
└── requirements.txt

Adapt the exact structure to the chosen implementation.

Keep components reusable and avoid one enormous component file.

36. DEVELOPMENT DATA STRATEGY

During development:

Load the supplied current KG JSON.

Normalize it through a graph-data service.

Render real nodes and relationships.

Verify that search and graph filtering operate on the actual data.

Only then connect the UI to Neo4j / backend APIs.

If mock data is necessary, clearly separate it from production/API data and label it as mock/development data.

Do not create a fake graph that merely resembles the real graph.

37. DATA / FILE AUTHORITY

When multiple versions of a file exist, use the latest project version explicitly supplied for this build.

Do not use old versions merely because they have simpler schemas.

The latest current project snapshot is expected to include files equivalent to:

current crime dataset CSV

current KG nodes/edges JSON

current ontology TTL

populated ontology TTL

NLP/pipeline Python code

FIR report text dataset

ML notebooks / model artifacts where relevant

If a file is not supplied, do not invent its contents. Ask for it or isolate the missing integration behind a clear interface.

38. PROJECT FILES TO EXPECT

The web project may be given the following supporting files:

project-root/
├── GEMINI.md
├── README.md
├── requirements.txt
│
├── data/
│   ├── crime_dataset.csv
│   ├── fir_reports.txt
│   └── crime_kg_nodes_edges.json
│
├── ontology/
│   ├── final_ontology.ttl
│   └── populated_crime_ontology.ttl
│
├── pipeline/
│   └── pipeline.py
│
├── ml/
│   ├── MLModel.ipynb
│   └── GraphSAGE_Model.ipynb
│
└── web/
    └── ...new application...

Actual filenames may contain version suffixes. Use the latest files supplied for this build.

39. WHAT NOT TO DO

Do not:

build only a static landing page;

hardcode one FIR as the entire application;

invent graph relationships;

invent missing values;

display raw ontology URIs;

expose Neo4j credentials;

claim live backend functionality when it is mocked;

claim ML accuracy that was not actually measured;

present GraphSAGE experimental scores as production accuracy;

label a person as a criminal based on graph/ML output;

use sensational crime imagery;

pretend this is an official government department;

add unnecessary Web3/crypto visual styling just because the SIH theme mentions blockchain/cybersecurity;

add blockchain functionality unless an actual implementation is supplied or explicitly requested.

40. QUALITY BAR

The result should feel like a serious national-level engineering competition prototype.

Prioritize:

real data integration

graph usability

clear information hierarchy

excellent spacing

consistent typography

realistic states

meaningful interactions

responsive behaviour

accessibility

explainability

clean code

maintainability

no console errors

no broken navigation

no fake buttons

Every major UI action should have a clear purpose.

41. IMPLEMENTATION ORDER

Build in this order:

Phase 1 — Foundation

initialize project

establish design system

create routing/layout

create frontend/backend separation

Phase 2 — Real graph data

inspect KG JSON

create graph data adapter

render real graph

implement node selection and details

Phase 3 — Search / case / entity views

universal search

case details

entity details

related-record navigation

Phase 4 — FIR workflow

FIR input

upload handling if supported

API integration with NLP pipeline

extraction results

graph update/query integration where supported

Phase 5 — Analytics / relationship discovery

graph-derived analytics

repeat entities

vehicle/location/district relationships

multi-hop exploration

Phase 6 — Polish

loading/error/empty states

responsive design

accessibility

animations

legal-neutrality notices

final visual refinement

Do not spend most of the implementation effort on decorative effects before the graph/search/data workflow works.

42. FINAL PRODUCT PRINCIPLE

The website should make one idea immediately obvious:

We do not replace the investigator. We turn fragmented crime records into connected, searchable and explainable intelligence.

The application should visually demonstrate the transition:

Unstructured FIR → Structured Entities → Semantic Knowledge Graph → Network Analysis / ML → Investigator Insight

Build the application around that principle.