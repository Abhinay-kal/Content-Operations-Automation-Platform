# Knowledge Management Rules

## Mermaid Knowledge Graph
When maintaining or updating the `knowledge.md` file, you MUST include and continuously update a `mermaid` diagram that acts as a visual knowledge graph of the topics and concepts we have learned.

## Conversational Learning Capture
You MUST actively track any engineering concepts, explanations, or debugging techniques discussed during chat (e.g., explaining `npm start` vs `node src/index.js`, environment variables, networking basics). These conversational topics must be added to the `knowledge.md` conceptual graph and the tracked topics list, even if they didn't require writing any new code.

**Graph Requirements:**
1. The graph must map main engineering topics to their respective subtopics.
2. For any subtopics that we actively used or implemented in the project, you must:
   - Make the text **bold**.
   - Apply a **yellow background color** using Mermaid styling (e.g., `style NodeName fill:#ffff00,stroke:#333,stroke-width:2px,color:#000;`).
3. Ensure the graph is placed prominently in the `knowledge.md` file and reflects the latest concepts covered in the project.
