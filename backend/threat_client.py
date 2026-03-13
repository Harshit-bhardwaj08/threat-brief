import logging
import requests
from typing import List

logger = logging.getLogger(__name__)

CISA_KEV_URL = "https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json"
NVD_SIMPLE_URL = "https://services.nvd.nist.gov/rest/json/cves/2.0"

# Browser-like User-Agent — prevents NVD from rejecting the request as a bot
NVD_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0.0.0 Safari/537.36"
    ),
    "Accept": "application/json",
}


def _extract_cpe_strings(cve_data: dict) -> List[str]:
    """
    Traverses the NVD CVE configurations structure and collects all CPE
    criteria strings (e.g. cpe:2.3:a:apache:log4j:2.14.1:...).
    Handles both flat node lists and nested children nodes.
    """
    cpe_strings = []
    configurations = cve_data.get("configurations", [])

    for config in configurations:
        nodes = config.get("nodes", [])
        for node in nodes:
            for cpe_match in node.get("cpeMatch", []):
                criteria = cpe_match.get("criteria", "")
                if criteria:
                    cpe_strings.append(criteria.lower())
            for child in node.get("children", []):
                for cpe_match in child.get("cpeMatch", []):
                    criteria = cpe_match.get("criteria", "")
                    if criteria:
                        cpe_strings.append(criteria.lower())

    return cpe_strings


def fetch_recent_cves(limit: int = 100) -> list:
    """
    Fetches modern CVEs from NVD using a fixed date range (March 2026).
    Always returns relevant, recent data instead of the oldest-by-default batch.
    Uses a browser User-Agent to avoid NVD bot-blocking.
    """
    try:
        params = {
            "pubStartDate": "2026-01-01T00:00:00.000",
            "pubEndDate":   "2026-03-13T00:00:00.000",
            "resultsPerPage": limit,
        }

        print(f"[NVD FETCH] Requesting March 2026 CVEs (up to {limit}) from NVD API...")
        response = requests.get(
            NVD_SIMPLE_URL,
            params=params,
            headers=NVD_HEADERS,
            timeout=20,
        )
        print(f"[NVD FETCH] Response status: {response.status_code}")
        response.raise_for_status()
        data = response.json()

        total_found = data.get("totalResults", 0)
        print(f"[NVD FETCH] NVD reports {total_found} CVEs in date range. Parsing {limit} entries...")

        vulnerabilities = []
        for item in data.get("vulnerabilities", []):
            cve_data = item.get("cve", {})
            cve_id = cve_data.get("id", "UNKNOWN")

            # Extract English description
            descriptions = cve_data.get("descriptions", [])
            raw_desc = next(
                (d["value"] for d in descriptions if d["lang"] == "en"),
                "No description available.",
            )

            # Extract CVSS severity (prefer v3.1 → v3.0 → v2)
            metrics = cve_data.get("metrics", {})
            cvss_metrics = metrics.get("cvssMetricV31", metrics.get("cvssMetricV30", []))
            severity = "UNKNOWN"
            if cvss_metrics:
                severity = cvss_metrics[0].get("cvssData", {}).get("baseSeverity", "UNKNOWN")
            elif metrics.get("cvssMetricV2"):
                severity = metrics["cvssMetricV2"][0].get("baseSeverity", "UNKNOWN")

            published_date = cve_data.get("published", "")
            cpe_strings = _extract_cpe_strings(cve_data)

            vulnerabilities.append({
                "cve_id": cve_id,
                "raw_description": raw_desc,
                "severity": severity,
                "published_date": published_date,
                "cpe_strings": cpe_strings,
                "is_emergency_fallback": False,
            })

        print(f"[NVD FETCH] Successfully parsed {len(vulnerabilities)} CVEs.")
        logger.info(f"NVD: Fetched {len(vulnerabilities)} CVEs.")
        return vulnerabilities

    except Exception as e:
        print(f"[NVD FETCH] *** FAILED *** Error: {e}")
        logger.error(f"NVD API Failed: {e}. Returning empty list.")
        return []


def fetch_cves_by_keyword(tech: str, limit: int = 5) -> list:
    """
    Targeted NVD fetch: uses keywordSearch so the NVD server filters by
    technology name, guaranteeing modern, relevant CVE data instead of
    the default sort (which returns the oldest CVEs first).

    Returns up to `limit` CVEs that mention `tech` in their description/CPE.
    """
    url = f"https://services.nvd.nist.gov/rest/json/cves/2.0"
    params = {
        "keywordSearch": tech,
        "resultsPerPage": limit,
    }

    try:
        print(f"[NVD KEYWORD] Searching NVD for '{tech}'...")
        response = requests.get(url, params=params, headers=NVD_HEADERS, timeout=20)
        print(f"[NVD KEYWORD] '{tech}' → HTTP {response.status_code}")
        response.raise_for_status()
        data = response.json()

        total = data.get("totalResults", 0)
        print(f"[NVD KEYWORD] '{tech}' → {total} total results from NVD (parsing {limit})...")

        vulnerabilities = []
        for item in data.get("vulnerabilities", []):
            cve_data = item.get("cve", {})
            cve_id = cve_data.get("id", "UNKNOWN")

            descriptions = cve_data.get("descriptions", [])
            raw_desc = next(
                (d["value"] for d in descriptions if d["lang"] == "en"),
                "No description available.",
            )

            metrics = cve_data.get("metrics", {})
            cvss_metrics = metrics.get("cvssMetricV31", metrics.get("cvssMetricV30", []))
            severity = "UNKNOWN"
            if cvss_metrics:
                severity = cvss_metrics[0].get("cvssData", {}).get("baseSeverity", "UNKNOWN")
            elif metrics.get("cvssMetricV2"):
                severity = metrics["cvssMetricV2"][0].get("baseSeverity", "UNKNOWN")

            published_date = cve_data.get("published", "")
            cpe_strings = _extract_cpe_strings(cve_data)

            vulnerabilities.append({
                "cve_id": cve_id,
                "raw_description": raw_desc,
                "severity": severity,
                "published_date": published_date,
                "cpe_strings": cpe_strings,
                "is_emergency_fallback": False,
            })

        print(f"[NVD KEYWORD] Parsed {len(vulnerabilities)} CVEs for '{tech}'.")
        return vulnerabilities

    except Exception as e:
        print(f"[NVD KEYWORD] *** FAILED for '{tech}' *** Error: {e}")
        logger.error(f"NVD keyword fetch failed for '{tech}': {e}")
        return []


def fetch_cisa_kev() -> set:
    """
    Downloads the CISA KEV catalog and returns a set of actively exploited CVE IDs.
    """
    try:
        response = requests.get(CISA_KEV_URL, headers=NVD_HEADERS, timeout=15)
        response.raise_for_status()
        data = response.json()

        kev_set = {v["cveID"] for v in data.get("vulnerabilities", []) if "cveID" in v}
        print(f"[CISA KEV] Fetched {len(kev_set)} actively exploited CVEs.")
        logger.info(f"CISA KEV: Fetched {len(kev_set)} actively exploited CVEs.")
        return kev_set
    except Exception as e:
        print(f"[CISA KEV] *** FAILED *** Error: {e}")
        logger.error(f"Failed to fetch CISA KEV catalog: {e}")
        return set()


def suggest_cpe(keyword: str) -> str:
    """
    Queries NVD CPE API to find the most likely official CPE string for a given technology name.
    If it fails or finds nothing, fallback to a heuristic cpe.
    """
    url = "https://services.nvd.nist.gov/rest/json/cpes/2.0"
    params = {
        "keywordSearch": keyword,
        "resultsPerPage": 1
    }
    fallback_cpe = f"cpe:2.3:a:{keyword.lower()}:{keyword.lower()}:*:*:*:*:*:*:*"
    try:
        print(f"[CPE SUGGEST] Querying official CPE for '{keyword}'...")
        response = requests.get(url, params=params, headers=NVD_HEADERS, timeout=10)
        if response.status_code == 200:
            data = response.json()
            products = data.get("products", [])
            if products:
                cpe_name = products[0].get("cpe", {}).get("cpeName", "")
                if cpe_name:
                    print(f"[CPE SUGGEST] Found '{cpe_name}' for '{keyword}'")
                    return cpe_name
        print(f"[CPE SUGGEST] No exact CPE found for '{keyword}'. Using fallback.")
    except Exception as e:
        print(f"[CPE SUGGEST] Error querying CPE for '{keyword}': {e}. Using fallback.")
    return fallback_cpe


def fetch_epss_score(cve_id: str) -> float:
    """
    Queries FIRST EPSS API to get the probability of exploitation for a CVE.
    """
    result = fetch_epss_scores_bulk([cve_id])
    return result.get(cve_id, 0.0)


def fetch_epss_scores_bulk(cve_ids: list) -> dict:
    """
    Batch-fetches EPSS scores for a list of CVE IDs in a single API call.
    The FIRST API supports up to 100 CVEs per request via comma-separated cve= params.
    Returns a dict of {cve_id: epss_score}.
    """
    if not cve_ids:
        return {}

    url = "https://api.first.org/data/v1/epss"
    scores = {}
    batch_size = 100

    for i in range(0, len(cve_ids), batch_size):
        batch = cve_ids[i:i + batch_size]
        params = {"cve": ",".join(batch)}
        try:
            response = requests.get(url, params=params, timeout=15)
            if response.status_code == 200:
                data = response.json()
                for entry in data.get("data", []):
                    cid = entry.get("cve", "")
                    epss_val = float(entry.get("epss", 0.0))
                    if cid:
                        scores[cid] = epss_val
        except Exception as e:
            print(f"[EPSS BULK] Batch {i//batch_size+1} failed: {e}")

    return scores
