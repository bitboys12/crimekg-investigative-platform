import re
from datetime import datetime
from typing import Dict, Any, Optional

PRIMARY_CRIMES = [
    "ARMED ROBBERY", "ROBBERY", "THEFT", "BATTERY", "BURGLARY",
    "ASSAULT", "NARCOTICS", "HOMICIDE", "MOTOR VEHICLE THEFT", "CRIMINAL DAMAGE"
]

ONTOLOGY_CLASSES = [
    "CrimeIncident", "Suspect", "Vehicle", "Location", "PoliceDistrict",
    "PoliceBeat", "Ward", "CommunityArea", "PremiseType", "CrimeType",
    "CrimeDescription", "IUCRCode", "FBICode"
]

def parse_fir_narrative(fir_text: str) -> Dict[str, Any]:
    """
    Parses unstructured FIR text into structured crime entity record and ontology triples.
    Preserves evidence fidelity: intentional nulls are never fabricated.
    """
    if not fir_text or not fir_text.strip():
        raise ValueError("FIR text cannot be empty.")

    # 1. Regex Entity Extraction based on project pipeline
    case_match = re.search(r"\b([A-Z]{2}\d{6})\b", fir_text)
    date_match = re.search(r"(\d{2}/\d{2}/\d{4})\s+at\s+(?:approximately\s+)?(\d{2}:\d{2})", fir_text)
    
    # Primary Crime Type
    crime_regex = r"\b(" + "|".join(PRIMARY_CRIMES) + r")\b"
    primary_crime_match = re.search(crime_regex, fir_text, re.IGNORECASE)
    
    # Specific Crime Description Subtype
    desc_match = re.search(r"involving\s+([A-Z0-9\$\s:]+?)\s+was\s+reported", fir_text, re.IGNORECASE)
    
    # Location / Block
    block_match = re.search(r"reported at\s+([0-9]{4,5}X{1,2}\s+[NSEW]\s+[A-Z0-9\s]+?),\s+situated", fir_text)
    
    # Administrative regions
    district_match = re.search(r"District\s+(\d{3})", fir_text)
    beat_match = re.search(r"Beat\s+(\d{4})", fir_text)
    ward_match = re.search(r"Ward\s+(\d{1,2})", fir_text)
    comm_area_match = re.search(r"Community Area\s+(\d{1,2})", fir_text)
    
    # Premise Type
    premise_match = re.search(r"(?:on/at a|in an?|at a)\s+([A-Z0-9\s/]+?)\.\s+The\s+suspect", fir_text, re.IGNORECASE)
    
    # Suspect Name
    suspect_match = re.search(r"(?:identified\s+as\s+|suspect:\s*)([A-Z][a-z]+\s+[A-Z][a-z]+)", fir_text, re.IGNORECASE)
    
    # Vehicle Plate (strict: returns None if absent)
    vehicle_match = re.search(
        r"\b(?:license plate|vehicle|plate number|bearing license plate)\s+([A-Z]{2}[-\s]?\d{2,4}[-\s]?[A-Z0-9]{1,4})\b",
        fir_text,
        re.IGNORECASE
    )
    
    # Legal classification codes
    iucr_match = re.search(r"IUCR\s*code\s*([0-9]{3,4}[A-Z]?)", fir_text, re.IGNORECASE)
    fbi_match = re.search(r"FBI\s*Code\s*([0-9]{1,2}[A-Z]?)", fir_text, re.IGNORECASE)
    
    # Binary operational indicators
    arrest_made = bool(re.search(r"ARREST MADE", fir_text, re.IGNORECASE))
    domestic_dispute = bool(re.search(r"Domestic dispute:\s*YES", fir_text, re.IGNORECASE))

    # Datetime handling
    dt_formatted, year_val = None, None
    if date_match:
        d_p, t_p = date_match.group(1), date_match.group(2)
        try:
            parsed_dt = datetime.strptime(f"{d_p} {t_p}", "%m/%d/%Y %H:%M")
            dt_formatted = parsed_dt.strftime("%Y-%m-%d %H:%M:%S")
            year_val = parsed_dt.year
        except ValueError:
            dt_formatted = f"{d_p} {t_p}"

    case_num = case_match.group(1) if case_match else None
    suspect_name = suspect_match.group(1).strip() if suspect_match else None
    vehicle_plate = vehicle_match.group(1).strip() if vehicle_match else None
    primary_type = primary_crime_match.group(1).upper() if primary_crime_match else None
    description = desc_match.group(1).strip() if desc_match else None
    block = block_match.group(1).strip() if block_match else None
    location_desc = premise_match.group(1).strip().upper() if premise_match else None
    district = district_match.group(1) if district_match else None
    beat = beat_match.group(1) if beat_match else None
    ward = int(ward_match.group(1)) if ward_match else None
    comm_area = int(comm_area_match.group(1)) if comm_area_match else None
    iucr = iucr_match.group(1) if iucr_match else None
    fbi = fbi_match.group(1) if fbi_match else None

    # Construct Ontology Mappings & Graph Triples
    extracted_relationships = []
    if case_num:
        if suspect_name:
            extracted_relationships.append({
                "source": case_num, "source_type": "CrimeIncident",
                "relationship": "hasSuspect",
                "target": suspect_name, "target_type": "Suspect"
            })
        if vehicle_plate and suspect_name:
            extracted_relationships.append({
                "source": suspect_name, "source_type": "Suspect",
                "relationship": "drivesVehicle",
                "target": vehicle_plate, "target_type": "Vehicle"
            })
        if primary_type:
            extracted_relationships.append({
                "source": case_num, "source_type": "CrimeIncident",
                "relationship": "hasCrimeType",
                "target": primary_type, "target_type": "CrimeType"
            })
        if description:
            extracted_relationships.append({
                "source": case_num, "source_type": "CrimeIncident",
                "relationship": "hasDescription",
                "target": description, "target_type": "CrimeDescription"
            })
        if block:
            extracted_relationships.append({
                "source": case_num, "source_type": "CrimeIncident",
                "relationship": "occurredAt",
                "target": block, "target_type": "Location"
            })
        if beat:
            extracted_relationships.append({
                "source": case_num, "source_type": "CrimeIncident",
                "relationship": "occurredInBeat",
                "target": f"Beat {beat}", "target_type": "PoliceBeat"
            })
        if district:
            extracted_relationships.append({
                "source": case_num, "source_type": "CrimeIncident",
                "relationship": "occurredInDistrict",
                "target": f"District {district}", "target_type": "PoliceDistrict"
            })
        if ward:
            extracted_relationships.append({
                "source": case_num, "source_type": "CrimeIncident",
                "relationship": "occurredInWard",
                "target": f"Ward {ward}", "target_type": "Ward"
            })
        if comm_area:
            extracted_relationships.append({
                "source": case_num, "source_type": "CrimeIncident",
                "relationship": "occurredInCommunityArea",
                "target": f"Community Area {comm_area}", "target_type": "CommunityArea"
            })
        if location_desc:
            extracted_relationships.append({
                "source": case_num, "source_type": "CrimeIncident",
                "relationship": "hasPremiseType",
                "target": location_desc, "target_type": "PremiseType"
            })
        if iucr:
            extracted_relationships.append({
                "source": case_num, "source_type": "CrimeIncident",
                "relationship": "hasIUCRCode",
                "target": f"IUCR {iucr}", "target_type": "IUCRCode"
            })
        if fbi:
            extracted_relationships.append({
                "source": case_num, "source_type": "CrimeIncident",
                "relationship": "hasFBICode",
                "target": f"FBI {fbi}", "target_type": "FBICode"
            })

    return {
        "case_number": case_num,
        "date": dt_formatted,
        "year": year_val,
        "primary_type": primary_type,
        "description": description,
        "suspect_name": suspect_name,
        "vehicle_plate": vehicle_plate, # null if absent
        "block": block,
        "location_description": location_desc,
        "district": district,
        "beat": beat,
        "ward": ward,
        "community_area": comm_area,
        "iucr": iucr,
        "fbi_code": fbi,
        "arrest": arrest_made,
        "domestic": domestic_dispute,
        "extracted_relationships": extracted_relationships,
        "ontology_classes_represented": list(set([r["target_type"] for r in extracted_relationships] + ["CrimeIncident"]))
    }
