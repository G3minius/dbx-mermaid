import type { SampleLabelKey } from "./i18n";
import type { DiagramType } from "./source";

export type SampleId =
  | "flowchart"
  | "sequence"
  | "class"
  | "state"
  | "er"
  | "gantt"
  | "mindmap";

export interface MermaidSample {
  id: SampleId;
  labelKey: SampleLabelKey;
  diagramType: DiagramType;
  source: string;
}

export const DEFAULT_SAMPLE_ID: SampleId = "flowchart";

export const MERMAID_SAMPLES: readonly MermaidSample[] = [
  {
    id: "flowchart",
    labelKey: "sampleFlowchart",
    diagramType: "flowchart",
    source: `flowchart TD
  A[Christmas] -->|Get money| B(Go shopping)
  B --> C{Let me think}
  C -->|One| D[Laptop]
  C -->|Two| E[iPhone]
  C -->|Three| F[Car]`
  },
  {
    id: "sequence",
    labelKey: "sampleSequence",
    diagramType: "sequence",
    source: `sequenceDiagram
  autonumber
  participant U as User
  participant W as Workbench
  participant M as Mermaid
  U->>W: Paste source
  W->>M: parse + render
  M-->>W: SVG
  W-->>U: Live preview`
  },
  {
    id: "class",
    labelKey: "sampleClass",
    diagramType: "class",
    source: `classDiagram
  class Editor {
    +String value
    +onChange()
  }
  class Renderer {
    +parse(source)
    +render(source)
  }
  Editor --> Renderer : sends source`
  },
  {
    id: "state",
    labelKey: "sampleState",
    diagramType: "state",
    source: `stateDiagram-v2
  [*] --> Idle
  Idle --> Rendering: input
  Rendering --> Ready: success
  Rendering --> Error: parse failure
  Error --> Rendering: edit
  Ready --> [*]`
  },
  {
    id: "er",
    labelKey: "sampleEr",
    diagramType: "er",
    source: `erDiagram
  PLUGIN ||--o{ DIAGRAM : renders
  DIAGRAM ||--|{ NODE : contains
  PLUGIN {
    string id
    string version
  }
  DIAGRAM {
    string id
    string source
  }
  NODE {
    string label
  }`
  },
  {
    id: "gantt",
    labelKey: "sampleGantt",
    diagramType: "gantt",
    source: `gantt
  title Mermaid workbench
  dateFormat YYYY-MM-DD
  axisFormat %m-%d
  section Build
  Renderer :done, r1, 2026-01-01, 2d
  Editor :active, e1, after r1, 3d
  Export :x1, after e1, 2d`
  },
  {
    id: "mindmap",
    labelKey: "sampleMindmap",
    diagramType: "mindmap",
    source: `mindmap
  root((Mermaid))
    Editor
      Textarea
      Line numbers
    Renderer
      Parse
      SVG
    Preview
      Zoom
      Fit`
  }
];

export function findSample(id: string): MermaidSample | undefined {
  return MERMAID_SAMPLES.find((sample) => sample.id === id);
}

export function getDefaultSample(): MermaidSample {
  const sample = MERMAID_SAMPLES.find((item) => item.id === DEFAULT_SAMPLE_ID);
  if (sample === undefined) {
    throw new Error("Default Mermaid sample is missing.");
  }
  return sample;
}
