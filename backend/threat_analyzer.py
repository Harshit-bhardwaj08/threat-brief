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
You are the "Antigravity" Cybersecurity Engine. Your job is to make complex threats simple, actionable, and easy to understand for the user.
Analyze this vulnerability for a tech stack containing: {matched_tech}

Provide your response strictly adhering to these rules:
1. ai_summary: Exactly 2 simple sentences. The first sentence explains the core risk in plain English. The second sentence gives the immediate, practical workaround or fix. No heavy jargon.
2. severity_rank: Integer 1-10 based on the risk to the matched technologies.
3. affected_technologies: A clean list of specific software/frameworks affected.
4. is_patched: True ONLY if the text explicitly states a patch, update, or fix is available.

CISA KEV STATUS: {is_actively_exploited}
(If True, force severity_rank to 10 and start your ai_summary with "🚨 ACTIVE EXPLOIT:".)

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


def cpe_match(tech_stack, cpe_strings, description="", cve_id=""):
    matched = []
    cpe_lower = str(cpe_strings).lower() if cpe_strings else ""
    desc_lower = str(description).lower() if description else ""

    for tech_obj in tech_stack:
        tech_name = tech_obj if isinstance(tech_obj, str) else tech_obj.get("name", "")
        tech_lower = str(tech_name).lower().strip()

        # 1. Regex Match (Semantic) - Exact word boundary in description
        pattern = rf'(?:^|[^a-zA-Z0-9]){re.escape(tech_lower)}(?:$|[^a-zA-Z0-9])'
        regex_hit = bool(re.search(pattern, desc_lower, re.IGNORECASE))

        # 2. CPE Match (Precise) - Substring in configuration strings
        cpe_hit = tech_lower in cpe_lower

        if regex_hit or cpe_hit:
            m_type = "Precise (CPE)" if cpe_hit else "Semantic (Regex)"
            matched.append({"name": tech_name, "match_type": m_type})

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


