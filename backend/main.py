from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from contextlib import asynccontextmanager
import models, schemas
from database import SessionLocal, engine
from pydantic import BaseModel
import json
import asyncio
import logging
import time
import feedparser
from threat_client import fetch_recent_cves, fetch_cisa_kev, fetch_cves_by_keyword, suggest_cpe, fetch_epss_score, fetch_epss_scores_bulk
from threat_analyzer import generate_global_threat_summary, cpe_match

logger = logging.getLogger(__name__)

# Create all database tables (idempotent — safe to run on every startup)
models.Base.metadata.create_all(bind=engine)
print("[DB] Tables verified/created successfully.")


def _run_migrations():
    """
    Applies lightweight schema migrations for columns added after initial
    database creation. SQLite's ALTER TABLE ADD COLUMN is safe to call even
    if the column already exists — we just swallow the OperationalError.
    """
    from sqlalchemy import text
    with engine.connect() as conn:
        migrations = [
            "ALTER TABLE vulnerabilities ADD COLUMN cpe_strings TEXT DEFAULT '[]'",
            "ALTER TABLE threat_summaries ADD COLUMN is_patched INTEGER DEFAULT 0",
            "ALTER TABLE vulnerabilities ADD COLUMN epss_score FLOAT DEFAULT 0.0",
            "CREATE TABLE IF NOT EXISTS news_articles (id INTEGER PRIMARY KEY, title TEXT, link TEXT UNIQUE, description TEXT, pub_date TEXT, source TEXT, matched_tech TEXT DEFAULT '[]')"
        ]
        for stmt in migrations:
            try:
                conn.execute(text(stmt))
                conn.commit()
                logger.info(f"[MIGRATION] Applied: {stmt}")
            except Exception:
                # Column already exists — safe to ignore
                pass


_run_migrations()
print("[DB] Schema migrations applied. Tables: users | vulnerabilities | threat_summaries")


def fetch_and_store_threats(db, tech_stack: list = None):
    """
    Synchronous NVD fetch + DB store.

    If tech_stack is provided, performs a targeted keywordSearch fetch for
    each technology — guaranteeing modern, relevant CVEs instead of the
    oldest-first default batch.

    If tech_stack is None (background task), falls back to the general
    resultsPerPage fetch.
    """
    kev_set = fetch_cisa_kev()

    if tech_stack:
        # ── Targeted per-technology fetch ──────────────────────────────────
        all_cves = []
        for tech in tech_stack:
            cves = fetch_cves_by_keyword(tech, limit=5)
            all_cves.extend(cves)
        # Deduplicate by cve_id (multiple keyword searches may return the same CVE)
        seen = set()
        latest_cves = []
        for cve in all_cves:
            if cve["cve_id"] not in seen:
                seen.add(cve["cve_id"])
                latest_cves.append(cve)
        print(f"[PIPELINE] Keyword fetch complete: {len(latest_cves)} unique CVEs for stack {tech_stack}")
    else:
        # ── Generic batch fetch (background task) ──────────────────────────
        print("[PIPELINE] fetch_and_store_threats() called — starting NVD summary pull...")
        latest_cves = fetch_recent_cves(limit=100)

    # ── Pre-fetch all EPSS scores in bulk (1 batch request per 100 CVEs) ─────────
    # This replaces 2000 individual HTTP requests with ~20 batched ones.
    new_cve_ids = [
        cve["cve_id"] for cve in latest_cves
        if not db.query(models.Vulnerability.id).filter(
            models.Vulnerability.cve_id == cve["cve_id"]
        ).first()
    ]
    print(f"[EPSS BULK] Fetching EPSS scores for {len(new_cve_ids)} new CVEs in bulk...")
    epss_map = fetch_epss_scores_bulk(new_cve_ids) if new_cve_ids else {}
    print(f"[EPSS BULK] Got {len(epss_map)} EPSS scores.")

    stored = 0
    for cve_data in latest_cves:
        is_kev = 1 if cve_data["cve_id"] in kev_set else 0
        cpe_strings_json = json.dumps(cve_data.get("cpe_strings", []))

        existing = db.query(models.Vulnerability).filter(
            models.Vulnerability.cve_id == cve_data["cve_id"]
        ).first()

        if not existing:
            # Use pre-fetched bulk EPSS map — never call single EPSS per CVE
            epss = epss_map.get(cve_data["cve_id"], 0.0)
            new_vuln = models.Vulnerability(
                cve_id=cve_data["cve_id"],
                raw_description=cve_data["raw_description"],
                severity=cve_data["severity"],
                published_date=cve_data["published_date"],
                is_actively_exploited=is_kev,
                cpe_strings=cpe_strings_json,
                epss_score=epss,
            )
            db.add(new_vuln)
            stored += 1
        else:
            existing.is_actively_exploited = is_kev
            if existing.cpe_strings == "[]" and cpe_strings_json != "[]":
                existing.cpe_strings = cpe_strings_json

    db.commit()

    # ── DB RETENTION POLICY: Keep ONLY the latest 50 CVEs ─────
    total_count = db.query(models.Vulnerability).count()
    if total_count > 50:
        # Find the IDs of everything older than the 50 newest
        to_delete_ids = (
            db.query(models.Vulnerability.id)
            .order_by(models.Vulnerability.published_date.desc())
            .offset(50)
            .all()
        )
        if to_delete_ids:
            ids = [i[0] for i in to_delete_ids]
            db.query(models.Vulnerability).filter(models.Vulnerability.id.in_(ids)).delete(synchronize_session=False)
            db.commit()
            print(f"[RECLEAN] Purged {len(ids)} old vulnerabilities. DB locked at 50 entries.")

    final_count = db.query(models.Vulnerability).count()
    print(f"[NVD] Fetched {len(latest_cves)} vulnerabilities. Total in DB: {final_count}")
    logger.info(f"DB synced: {stored} new CVEs stored. Total: {final_count}")


async def fetch_threats_task():
    while True:
        try:
            logger.info("Background Poller: Fetching recent CVEs from NVD...")
            db = SessionLocal()
            try:
                fetch_and_store_threats(db)
            finally:
                db.close()
        except Exception as e:
            logger.error(f"Background threat polling failed: {e}. Will retry in 30 minutes.")

        await asyncio.sleep(60 * 30)


@asynccontextmanager
async def lifespan(app: FastAPI):
    task = asyncio.create_task(fetch_threats_task())
    yield
    task.cancel()


app = FastAPI(title="ThreatBrief API", lifespan=lifespan)

origins = [
    "http://localhost",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "https://threat-brief.vercel.app/",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@app.get("/")
def read_root():
    return {"message": "Welcome to the ThreatBrief API"}


# ──────────────────────────────────────────────────────────────────────────────
# Admin Endpoints
# ──────────────────────────────────────────────────────────────────────────────

@app.delete("/api/admin/flush-cache")
def flush_threat_cache(db: Session = Depends(get_db)):
    """Completely clears the ThreatSummaries table so the AI can start fresh."""
    deleted = db.query(models.ThreatSummary).delete()
    db.commit()
    logger.info(f"[ADMIN] Flushed {deleted} cached threat summaries.")
    return {"message": f"Successfully flushed {deleted} cached threat summaries."}


# ──────────────────────────────────────────────────────────────────────────────
# User Endpoints
# ──────────────────────────────────────────────────────────────────────────────

def _parse_tech_stack(stack_json: str) -> list:
    try:
        data = json.loads(stack_json)
        res = []
        for item in data:
            if isinstance(item, str):
                res.append({"name": item, "cpe": f"cpe:2.3:a:{item.lower()}:{item.lower()}:*:*:*:*:*:*:*"})
            elif isinstance(item, dict):
                res.append(item)
        return res
    except Exception:
        return []


def _bg_fetch_for_new_nodes(nodes: list):
    db = SessionLocal()
    try:
        print(f"[BACKGROUND] Eager fetching CVEs for {len(nodes)} new technologies...")
        fetch_and_store_threats(db, tech_stack=nodes)
    except Exception as e:
        logger.error(f"Background fetch failed: {e}")
    finally:
        db.close()


@app.post("/api/users", response_model=schemas.UserResponse)
def create_user(user: schemas.UserCreate, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.username == user.username).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Username already registered")

    # tech_stack is a list of TechNode models or dicts
    # user.tech_stack may be empty list
    stack_dicts = [node.dict() if hasattr(node, "dict") else node for node in user.tech_stack]
    encoded_stack = json.dumps(stack_dicts)
    new_user = models.User(username=user.username, tech_stack=encoded_stack)
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    parsed_stack = _parse_tech_stack(new_user.tech_stack)
    if parsed_stack:
        background_tasks.add_task(_bg_fetch_for_new_nodes, parsed_stack)

    return {"id": new_user.id, "username": new_user.username, "tech_stack": parsed_stack}


@app.get("/api/users/{user_id}", response_model=schemas.UserResponse)
def get_user(user_id: int, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return {"id": user.id, "username": user.username, "tech_stack": _parse_tech_stack(user.tech_stack)}


@app.post("/api/users/{user_id}/stack", response_model=schemas.UserResponse)
def update_user_stack(user_id: int, tech_stack: list[schemas.TechNode], background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    old_stack = _parse_tech_stack(user.tech_stack)
    old_names = {n.get("name", "").lower() for n in old_stack}

    stack_dicts = [node.dict() for node in tech_stack]
    
    new_nodes = [n for n in stack_dicts if n.get("name", "").lower() not in old_names]
    if new_nodes:
        background_tasks.add_task(_bg_fetch_for_new_nodes, new_nodes)

    user.tech_stack = json.dumps(stack_dicts)
    db.commit()
    db.refresh(user)

    return {"id": user.id, "username": user.username, "tech_stack": _parse_tech_stack(user.tech_stack)}

@app.post("/api/users/{user_id}/scan", response_model=schemas.UserResponse)
async def scan_user_stack_file(user_id: int, background_tasks: BackgroundTasks, file: UploadFile = File(...), db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    content = await file.read()
    text = content.decode("utf-8")
    filename = file.filename.lower()
    
    deps = []
    if filename.endswith("package.json"):
        try:
            data = json.loads(text)
            deps = list(data.get("dependencies", {}).keys()) + list(data.get("devDependencies", {}).keys())
        except Exception:
            pass
    elif filename.endswith("requirements.txt"):
        for line in text.splitlines():
            line = line.strip()
            if line and not line.startswith("#"):
                # split by common version specifiers
                dep_name = line.replace("==", " ").replace(">=", " ").replace("<=", " ").replace("~=", " ").split()[0]
                if dep_name:
                    deps.append(dep_name)

    if not deps:
        raise HTTPException(status_code=400, detail="Could not parse dependencies from file")

    # Limit to top 20 to avoid NVD rate limits on first scan
    deps = list(set(deps))[:20]
    
    current_stack = json.loads(user.tech_stack)
    current_names = [n.get("name", "").lower() for n in current_stack]

    new_nodes = []
    for dep in deps:
        if dep.lower() not in current_names:
            cpe = suggest_cpe(dep)
            new_nodes.append({"name": dep, "cpe": cpe})
            # Sleep briefly to respect API rate limits
            time.sleep(0.5)

    if new_nodes:
        updated_stack = current_stack + new_nodes
        user.tech_stack = json.dumps(updated_stack)
        db.commit()
        db.refresh(user)
        background_tasks.add_task(_bg_fetch_for_new_nodes, new_nodes)

    return {"id": user.id, "username": user.username, "tech_stack": _parse_tech_stack(user.tech_stack)}

# ──────────────────────────────────────────────────────────────────────────────
# Threat Endpoints
# ──────────────────────────────────────────────────────────────────────────────

@app.get("/api/threats/personalized/{user_id}", response_model=schemas.DashboardResponse)
def get_personalized_threats(user_id: int, db: Session = Depends(get_db)):
    """
    If the user has a tech stack but 0 CVEs matched any CPE:
      → Return is_protected=True + global cybersecurity news instead of empty threats.
    """
    user = db.query(models.User).filter(models.User.id == user_id).first()
    user_stack = _parse_tech_stack(user.tech_stack) if user else []
    return _analyze_threats_for_stack(db, user_stack, user_id)


def _analyze_threats_for_stack(db: Session, user_stack: list, user_id: int = None) -> dict:
    # Empty stack rule: never calculate risk for an empty stack.
    if not user_stack:
        return {"threats": [], "news": _fetch_global_news(user_stack, db), "is_protected": False}

    # ── FAILSAFE: If DB is empty, force a synchronous NVD fetch right now ─────
    vuln_count = db.query(models.Vulnerability).count()
    if vuln_count == 0:
        try:
            fetch_and_store_threats(db, tech_stack=user_stack)
        except Exception as e:
            logger.error(f"[PIPELINE] Force-fetch failed: {e}")

    recent_db_cves = (
        db.query(models.Vulnerability)
        .order_by(models.Vulnerability.published_date.desc())
        .limit(200)
        .all()
    )

    if not recent_db_cves:
        print("[PIPELINE] DB still empty after force-fetch. Returning protected state.")
        return {"threats": [], "news": _fetch_global_news(), "is_protected": False}

    analyzed_threats = []
    db_changed = False
    cpe_hit_count = 0   # tracks how many CVEs passed the CPE filter

    for vuln in recent_db_cves:
        cve_id = vuln.cve_id
        raw_description = vuln.raw_description or ""
        # Pass raw JSON string (not parsed list) so str() search works on tech names
        raw_cpe_strings = vuln.cpe_strings or "[]"

        print(f"[CVE] Checking {cve_id} | cpe_len={len(raw_cpe_strings)} | desc='{raw_description[:55]}...'")

        # ── STEP 2: Match (raw CPE string OR description fallback) ────────────
        matched_tech_dicts = cpe_match(
            user_stack,
            raw_cpe_strings,
            description=raw_description,
            cve_id=cve_id,
        )

        if not matched_tech_dicts:
            # Zero quota waste — skip this CVE entirely.
            logger.debug(f"[CPE GATE] {cve_id}: no CPE match for stack {user_stack}. Skipped.")
            continue

        # Extract just names for the LLM parsing
        matched_tech_names = [t["name"] for t in matched_tech_dicts]

        # CPE match confirmed — this is a verified relevant threat.
        cpe_hit_count += 1
        logger.info(f"[CPE GATE] {cve_id}: PASSED. Matched: {matched_tech_dicts}")

        # ── STEP 3: Check ThreatSummary cache ────────────────────────────────
        summary_cache = db.query(models.ThreatSummary).filter(
            models.ThreatSummary.cve_id == cve_id
        ).first()

        if summary_cache and not summary_cache.ai_summary.startswith("AI_ANALYSIS: PENDING"):
            # Cache HIT — serve from DB, Groq not called.
            ai_summary = summary_cache.ai_summary
            severity_rank = summary_cache.severity_rank
            is_patched = bool(getattr(summary_cache, "is_patched", 0))
            logger.info(f"[CACHE HIT] {cve_id}: served from DB cache.")
        else:
            # Cache MISS — call Groq (CPE match already confirmed).
            time.sleep(2)  # TPM throttle to stay within Groq rate limits
            cve_dict = {
                "cve_id": cve_id,
                "raw_description": vuln.raw_description,
                "is_actively_exploited": bool(vuln.is_actively_exploited),
            }
            global_summary = generate_global_threat_summary(cve_dict, matched_tech=matched_tech_names)
            ai_summary = global_summary["ai_summary"]
            severity_rank = global_summary["severity_rank"]
            is_patched = bool(global_summary.get("is_patched", False))

            # Cache valid responses only (never cache pending/rate-limited responses).
            if not ai_summary.startswith("AI_ANALYSIS: PENDING") and severity_rank > 0:
                if summary_cache:
                    summary_cache.ai_summary = ai_summary
                    summary_cache.severity_rank = severity_rank
                    summary_cache.is_patched = 1 if is_patched else 0
                    summary_cache.affected_technologies = json.dumps(
                        global_summary.get("affected_technologies", [])
                    )
                else:
                    db.add(models.ThreatSummary(
                        cve_id=cve_id,
                        ai_summary=ai_summary,
                        severity_rank=severity_rank,
                        is_patched=1 if is_patched else 0,
                        affected_technologies=json.dumps(
                            global_summary.get("affected_technologies", [])
                        ),
                    ))
                db_changed = True

        # ── STEP 4: Build relevance score ─────────────────────────────────────
        is_kev = bool(vuln.is_actively_exploited)
        if is_kev:
            relevance_score = 10   # CISA KEV = always critical
        elif severity_rank > 0:
            relevance_score = severity_rank
        else:
            relevance_score = 0    # Pending/rate-limited — skip display

        if relevance_score > 0:
            analyzed_threats.append({
                "cve_id": cve_id,
                "severity": vuln.severity or "UNKNOWN",
                "published_date": vuln.published_date or "",
                "ai_summary": ai_summary,
                "relevance_score": relevance_score,
                "matched_tech": matched_tech_dicts,
                "is_actively_exploited": is_kev,
                "is_patched": is_patched,
                "epss_score": vuln.epss_score or 0.0,
            })

    if db_changed:
        db.commit()

    # Weighted Priority Sort:
    #   Primary:   Number of 'Precise (CPE)' vs 'Semantic (Keyword)' (Precise wins)
    #   Secondary: number of tech stack matches (more matches = more relevant)
    #   Tertiary:  relevance_score
    analyzed_threats.sort(
        key=lambda x: (
            sum(1 for t in x["matched_tech"] if t.get("match_type") == "Precise (CPE)"),
            len(x["matched_tech"]), 
            x["relevance_score"]
        ),
        reverse=True,
    )

    # ── STEP 5: Daily Briefing / Protected Mode ───────────────────────────────
    # User has a stack but the entire global CVE feed had 0 CPE matches.
    # They are safe today — show global news instead of empty threat list.
    news_feed = _fetch_global_news(user_stack, db)
    
    if cpe_hit_count == 0:
        logger.info(
            f"[PROTECTED] Tech stack {user_stack}: "
            "no CPE matches in feed. Returning protected state + global news."
        )
        return {"threats": [], "news": news_feed, "is_protected": True}

    # Threats found but all scored 0 after AI (e.g. all rate-limited) — soft fallback
    if not analyzed_threats:
        return {"threats": [], "news": news_feed, "is_protected": False}

    return {"threats": analyzed_threats, "news": news_feed, "is_protected": False}


@app.post("/api/threats/sandbox", response_model=schemas.DashboardResponse)
def get_sandbox_threats(request: schemas.SandboxRequest, db: Session = Depends(get_db)):
    """
    Calculates threat relevance for a temporary set of tags without saving to any profile.
    """
    temp_stack = []
    for tag in request.tags:
        temp_stack.append({
            "name": tag,
            "cpe": f"cpe:2.3:a:{tag.lower()}:{tag.lower()}:*:*:*:*:*:*:*"
        })
    
    return _analyze_threats_for_stack(db, temp_stack)


@app.delete("/api/users/{user_id}/reset")
def reset_user_profile(user_id: int, db: Session = Depends(get_db)):
    """
    Emergency Reset: Clears user tech stack.
    """
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    user.tech_stack = "[]"
    db.commit()
    return {"message": "User profile reset successfully"}


def _fetch_global_news(user_stack: list = None, db: Session = None) -> list:
    """
    Ingests cybersecurity news from primary sources and matches them against
    the user's tech stack for prioritization.
    """
    feeds = {
        "The Hacker News": "https://feeds.feedburner.com/TheHackersNews",
        "Krebs on Security": "https://krebsonsecurity.com/feed/",
        "BleepingComputer": "https://www.bleepingcomputer.com/feed/"
    }
    
    # ── STEP 1: Ingest news from feeds ──────────────────────────────────────
    all_articles = []
    for source_name, url in feeds.items():
        try:
            feed = feedparser.parse(url)
            for entry in feed.entries[:8]:
                desc = entry.get("description", entry.get("summary", ""))
                article = {
                    "title": entry.title,
                    "link": entry.link,
                    "description": desc,
                    "pub_date": entry.get("published", entry.get("updated", "")),
                    "source": source_name,
                    "matched_tech": []
                }
                
                # Tech matching logic
                if user_stack:
                    for tech in user_stack:
                        name = tech["name"].lower()
                        if name in article["title"].lower() or name in article["description"].lower():
                            article["matched_tech"].append(tech["name"])
                
                all_articles.append(article)
        except Exception as e:
            logger.error(f"Failed to fetch {source_name}: {e}")

    # ── STEP 2: Persist to DB (avoid duplicates) ────────────────────────────
    if db:
        for art in all_articles:
            try:
                existing = db.query(models.NewsArticle).filter(models.NewsArticle.link == art["link"]).first()
                if not existing:
                    new_art = models.NewsArticle(
                        title=art["title"],
                        link=art["link"],
                        description=art["description"],
                        pub_date=art["pub_date"],
                        source=art["source"],
                        matched_tech=json.dumps(art["matched_tech"])
                    )
                    db.add(new_art)
                    db.commit()
            except Exception:
                db.rollback()

    # ── STEP 3: Prioritize ──────────────────────────────────────────────────
    # Sort: matched_tech > pub_date (heuristic)
    all_articles.sort(key=lambda x: len(x["matched_tech"]), reverse=True)
    
    return all_articles[:10]

