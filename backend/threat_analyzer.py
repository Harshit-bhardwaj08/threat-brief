import os
import re
import json
import logging
from typing import List, Dict, Any, Optional

from dotenv import load_dotenv
from langchain_groq import ChatGroq
from langchain_core.prompts import PromptTemplate
from langchain_core.output_parsers import JsonOutputParser
from pydantic import BaseModel, Field
from fastapi import HTTPException

load_dotenv()

logger = logging.getLogger(__name__)


# ──────────────────────────────────────────────────────────────────────────────
# Pydantic schema for Groq LLM output
# ──────────────────────────────────────────────────────────────────────────────

class ThreatSummaryOutput(BaseModel):
    ai_summary: str = Field(
        description="A 2-sentence plain English summary of the exploit."
    )
    severity_rank: int = Field(
        description="Integer (1-10) indicating the overarching severity of the threat."
    )
    affected_technologies: List[str] = Field(
        description="Comprehensive list of all technologies, languages, or frameworks affected."
    )
    is_patched: bool = Field(
        description=(
            "Set to true ONLY if the description explicitly mentions that a patch, "
            "fix, update, or remediation is available (e.g., 'upgrading to version X "
            "fixes this', 'a patch has been released', 'fixed in version', "
            "'vendor has issued an update'). Otherwise set to false."
        )
    )


# ──────────────────────────────────────────────────────────────────────────────
# LangChain Prompt — now receives matched_tech from CPE for richer context
# ──────────────────────────────────────────────────────────────────────────────

THREAT_PROMPT_TEMPLATE = """\
You are a cybersecurity analyst. Analyze the following verified vulnerability that \
has been matched to the user's technology stack via CPE.

Provide:
1. A 2-sentence plain English summary explaining the risk.
2. A severity rank (1-10) strictly based on the description.
3. A comprehensive list of all affected technologies/frameworks/OSes.
4. is_patched: Set to true ONLY if the description explicitly states that a patch, \
fix, update, or remediation is already available (look for phrases like 'upgrading to \
version X fixes this', 'a patch has been released', 'fixed in version', 'vendor has \
issued an update', 'users should upgrade'). If no patch is mentioned, set to false.

If CISA KEV STATUS is True, override severity_rank to 10 and prepend \
"🚨 ACTIVE EXPLOIT" to the summary.

CISA KEV STATUS: {is_actively_exploited}
MATCHED USER TECHNOLOGIES (from CPE): {matched_tech}

VULNERABILITY DESCRIPTION:
{raw_description}

{format_instructions}
"""


# ──────────────────────────────────────────────────────────────────────────────
# DETERMINISTIC CPE PRE-FILTER — no AI, no quota
# ──────────────────────────────────────────────────────────────────────────────

def _normalize_tech(tech: str) -> List[str]:
    """
    Generates all normalized surface forms of a tech stack item so they
    can be matched against CPE criteria substrings.

    e.g. "Spring Boot" → ["spring boot", "spring_boot", "spring-boot", "springboot"]
         "Node.js"     → ["node.js", "node_js", "node-js", "nodejs"]
    """
    base = tech.lower().strip()
    # Strip trailing version hints like " 3" or " v3"
    base = re.sub(r"\s+v?\d[\d.]*$", "", base)

    forms = set()
    forms.add(base)                             # as-is lowercased
    forms.add(base.replace(" ", "_"))           # space → underscore (CPE standard)
    forms.add(base.replace(" ", "-"))           # space → hyphen
    forms.add(re.sub(r"[\s.\-_]+", "", base))  # squashed (remove all separators)
    forms.add(base.replace(".", "_"))           # dot → underscore (e.g. node.js → node_js)
    forms.add(base.replace(".", ""))            # dot removed

    return [f for f in forms if f]             # drop empty strings


def _word_match(term: str, text: str) -> bool:
    if not term or not text:
        return False
    # Relaxed boundary: start/non-alnum + term + end/non-alnum
    pattern = r'(?:^|[^a-zA-Z0-9])' + re.escape(term) + r'(?:$|[^a-zA-Z0-9])'
    return bool(re.search(pattern, text, re.IGNORECASE))


def is_match(tech, cpe_strings, description):
    """
    Word-boundary safe matcher. Uses regex for precision so short tags like
    'ai' or 'ml' only match standalone words, not substrings of other words.
    Handles cpe_strings as either a Python list or raw JSON string.
    """
    tech_lower  = str(tech).lower().strip()
    cpe_lower   = str(cpe_strings).lower() if cpe_strings else ""
    desc_lower  = str(description).lower() if description else ""

    in_cpe  = _word_match(tech_lower, cpe_lower)
    in_desc = _word_match(tech_lower, desc_lower)
    return in_cpe or in_desc


def cpe_match(
    tech_stack: List[Dict[str, str]],
    cpe_strings,
    description: str = "",
    cve_id: str = "",
) -> List[Dict[str, str]]:
    """
    Stack-level logic implementing Parallel Matching (Precise vs Semantic).
    
    1. Check A (CPE / Precise): Matches if product/vendor appears in NVD CPE data.
    2. Check B (Keyword / Semantic): Matches if tech keyword appears in description/title.
    3. Final Match = (Check A OR Check B).
    """
    # NOTE: Data Shield removed — the year filter was blocking ~85% of valid matches.
    # The DB retention policy already limits to recent CVEs fetched by the pipeline.

    AI_VENDORS = ["google", "openai", "meta", "anthropic", "huggingface", "nvidia"]
    matched = []

    for tech_obj in tech_stack:
        if isinstance(tech_obj, str):
            tech_name = tech_obj
            tech_cpe = ""
        else:
            tech_name = tech_obj.get("name", "")
            tech_cpe = tech_obj.get("cpe", "")

        tech_lower = str(tech_name).lower().strip()
        desc_lower = str(description).lower() if description else ""
        cpe_lower  = str(cpe_strings).lower() if cpe_strings else ""

        # ------------- Check A: Precise (CPE) -------------
        precise_match = False
        
        # a1. Direct Product Name Match in CPE
        if _word_match(tech_lower, cpe_lower):
            precise_match = True
            
        # a2. Vendor Extraction Match
        if not precise_match and tech_cpe:
            parts = tech_cpe.split(":")
            vendor = parts[3].lower() if len(parts) > 3 else ""
            if vendor and vendor not in ["*", "-", ""]:
                if f":{vendor}:" in cpe_lower:
                    precise_match = True

        # a3. AI Keyword Expansion to Vendors
        is_ai_concept = tech_lower in ["ai", "artificial intelligence", "ml", "machine learning", "aiml", "ai/ml"]
        if not precise_match and is_ai_concept:
            for ai_vendor in AI_VENDORS:
                if f":{ai_vendor}:" in cpe_lower:
                    precise_match = True
                    break

        # ------------- Check B: Semantic (Keyword) -------------
        semantic_match = _word_match(tech_lower, desc_lower)

        # ------------- Final OR Gate & Logging -------------
        is_hit = precise_match or semantic_match

        if is_hit:
            # Prioritize Precise label if both are true
            m_type = "Precise (CPE)" if precise_match else "Semantic (Keyword)"
            # Log the Reason exactly as requested
            print(f"[HYBRID] {cve_id} | CPE: {precise_match} | Keyword: {semantic_match} | Final: MATCH")
            matched.append({"name": tech_name, "match_type": m_type})
        else:
            # Only print skip for transparency in logs
            # print(f"[HYBRID] {cve_id} | CPE: False | Keyword: False | Final: SKIP")
            pass

    return matched


# ──────────────────────────────────────────────────────────────────────────────
# LLM GATE — called only AFTER a positive CPE match
# ──────────────────────────────────────────────────────────────────────────────

def generate_global_threat_summary(
    cve_data: Dict[str, Any],
    matched_tech: Optional[List[str]] = None,
) -> Dict[str, Any]:
    """
    Calls the Groq LLM to produce a plain-English summary, severity rank, and
    affected technology list. This function must ONLY be called after cpe_match()
    has confirmed relevance — it should never waste quota on unmatched CVEs.
    """
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key or api_key == "your_groq_api_key_here":
        raise HTTPException(status_code=400, detail="A valid GROQ_API_KEY is required.")

    cve_id = cve_data.get("cve_id", "UNKNOWN_CVE")
    raw_description = cve_data.get("raw_description", "")
    matched_tech_str = ", ".join(matched_tech) if matched_tech else "Not specified"

    try:
        model = ChatGroq(model="llama-3.3-70b-versatile", temperature=0)
        parser = JsonOutputParser(pydantic_object=ThreatSummaryOutput)

        prompt = PromptTemplate(
            template=THREAT_PROMPT_TEMPLATE,
            input_variables=["is_actively_exploited", "matched_tech", "raw_description"],
            partial_variables={"format_instructions": parser.get_format_instructions()},
        )
        chain = prompt | model | parser

        print(f"\n[AI PIPELINE IN] Calling Groq for GLOBAL summary of {cve_id}")

        result = chain.invoke({
            "is_actively_exploited": cve_data.get("is_actively_exploited", False),
            "matched_tech": matched_tech_str,
            "raw_description": raw_description,
        })

        return {
            "cve_id": cve_id,
            "ai_summary": result.get("ai_summary", "Summary unavailable."),
            "severity_rank": result.get("severity_rank", 1),
            "affected_technologies": [t.lower() for t in result.get("affected_technologies", [])],
            "is_patched": bool(result.get("is_patched", False)),
        }

    except Exception as e:
        error_msg = str(e)
        logger.error(f"LangChain analysis failed for {cve_id}: {error_msg}")

        if "429" in error_msg or "rate_limit_exceeded" in error_msg.lower():
            logger.warning(f"Rate limit hit for {cve_id} — will retry on next cycle.")
            return {
                "cve_id": cve_id,
                "ai_summary": "AI_ANALYSIS: PENDING - " + raw_description,
                "severity_rank": 0,
                "affected_technologies": [],
                "is_patched": False,
            }

        raise HTTPException(status_code=500, detail=f"AI pipeline failed: {error_msg}")


