# PS26/3 Regulatory Q&A Assistant — RAG System

**Built by:** Sai Ganesh Muthukumar  
**Portfolio:** [unimad.ai/portfolio/saiganeshmuthukumar](https://unimad.ai/portfolio/saiganeshmuthukumar)

---

## The Problem This Solves

Motor finance redress programmes like PS26/3 generate thousands of policy questions daily. Caseworkers handling complaints manually read through a 50+ page regulatory document to answer questions like:

- What is the FCA complaint response deadline?
- What must a firm do if it cannot trace an affected customer?
- What are the SMCR accountability requirements?

At Barclays, I worked directly on the PS26/3 Motor Finance Commission remediation programme. I saw firsthand how much time caseworkers spent locating the right policy clause before they could even begin drafting a response. This tool automates that retrieval step — so caseworkers spend their time on judgement, not document search.

---

## What This System Does

This is a Retrieval-Augmented Generation (RAG) system that:

1. **Ingests** a regulatory document (PS26/3 Motor Finance Policy Statement)
2. **Chunks** it into overlapping 500-word segments to preserve context at boundaries
3. **Stores** those chunks in ChromaDB — a live vector database running as a local server
4. **Retrieves** the most relevant chunks when a question is asked
5. **Generates** a grounded answer using Claude API — using only the retrieved context, never general knowledge

The system is deliberately constrained: if the answer is not in the document, it says so. It does not hallucinate.

---

## Architecture
PS26/3 Policy Document (.txt)
↓
Chunker — 500 word chunks, 100 word overlap
↓
Embedding Function — converts chunks to numeric vectors
↓
ChromaDB Vector Database (running on localhost:8000)
↓
User Question → Query Embedding → Similarity Search
↓
Top 2 Relevant Chunks Retrieved
↓
Claude API — answers from retrieved context only
↓
Grounded, Auditable Answer
---

## Governance Decisions

Building this for a regulated context required deliberate architectural choices, not just working code.

**1. Human-in-the-loop by design**  
Every answer is generated from retrieved document chunks that are visible and auditable. A caseworker can see exactly which section of PS26/3 the answer came from. This satisfies the FCA's explainability requirement.

**2. Confidence threshold requirement**  
During testing, the system returned similarity distance scores of 2.39 and 4.75 for a query about SMCR requirements. This exposed a critical production requirement: the system must refuse to answer when retrieval confidence is below a defined threshold. In a regulated environment, this threshold is a business decision, not a technical one — it belongs in the acceptance criteria.

**3. Dependency vulnerability identified and mitigated**  
The default ChromaDB embedding package introduced 3 high severity CVEs via its image processing dependency chain. This was identified during build, the package was rejected, and an alternative approach was implemented. In a bank security review, this dependency chain would fail immediately.

**4. Production upgrade path documented**  
Current embeddings use a simplified approach suitable for prototyping. Production deployment would replace this with OpenAI text-embedding-3-small or Azure OpenAI embeddings. This is a one-function swap — the rest of the architecture is production-ready.

---

## Test Results — Ground Truth Evaluation

| Question | Answer Returned | Correct? |
|---|---|---|
| What is the FCA complaint response deadline? | Eight weeks from receipt; firms must write to customer if delayed | ✅ Yes |
| What happens if a firm cannot trace an affected customer? | Reasonable tracing efforts required; redress held in reserve for six years | ✅ Yes |
| What are the SMCR requirements for firms? | Senior manager must be appointed; system correctly noted this was the only SMCR requirement in the document | ✅ Yes — and appropriately bounded |

The third result is the most significant. The system did not hallucinate additional SMCR obligations beyond what the document contained. It answered accurately and then stopped. That behaviour — knowing the boundary of its own knowledge — is the most important safety property a regulated AI system can have.

---

## How to Run This

**Prerequisites**
- Node.js v16+
- Python 3.8+
- An Anthropic API key

**Install dependencies**

```bash
npm install
pip install chromadb
```

**Start ChromaDB server**

```bash
python -c "from chromadb.cli.cli import app; app()" run --path ./chromadb_data
```

**Add your API key**

Create a `.env` file:
ANTHROPIC_API_KEY=your_key_here
**Run the system**

```bash
node rag.js
```

---

## What I Would Build Next

- **Real embedding model** — swap to text-embedding-3-small for accurate semantic retrieval
- **Confidence threshold gate** — refuse to answer below a defined similarity score; route to human caseworker instead
- **Full audit trail** — log every query, retrieved chunk, and generated answer with timestamps for FCA audit purposes
- **Multi-document ingestion** — ingest PS26/3 alongside DISP complaint handling rules and Consumer Duty guidance
- **Caseworker UI** — simple interface showing the answer, the source clause, and a one-click escalation to human review

---

## Stack

- **Runtime:** Node.js
- **LLM:** Claude API (Anthropic)
- **Vector Database:** ChromaDB
- **Language:** JavaScript
- **Document:** FCA PS26/3 Motor Finance Policy Statement

---

*This project was built as part of a structured AI upskilling programme focused on regulated financial services delivery. The document used reflects direct experience delivering the PS26/3 Motor Finance Commission remediation programme at Barclays UK.*
