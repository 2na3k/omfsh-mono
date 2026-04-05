export const ENTITY_EXTRACTION_PROMPT = `Extract entities and relationships from the following text. Return valid JSON only.

Entity types: person, org, concept, event, location, work

Output format:
{
  "entities": [
    { "name": "Entity Name", "type": "person|org|concept|event|location|work", "description": "brief description" }
  ],
  "relations": [
    { "source": "Entity A", "target": "Entity B", "label": "relationship verb" }
  ]
}

Rules:
- Normalize entity names (e.g., "U.S." -> "United States", "ML" -> "Machine Learning")
- Only extract clearly identifiable entities, not vague references
- Relations should be directional and use concise labels (e.g., "founded", "authored", "located in")
- Return empty arrays if no entities are found

Text:
`;
