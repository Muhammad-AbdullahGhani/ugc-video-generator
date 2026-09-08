import os
import sys
import json
import re
import time
import threading
from datetime import datetime
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
LOGS_DIR = REPO_ROOT / ".agent-logs"
AUTHOR = "Muhammad-AbdullahGhani"
TOOL_NAME = "Antigravity CLI"
DEFAULT_MODEL = "Gemini 3.8 Flash"
PROJECT_NAME = "ugc-video-generator"
BRAIN_DIR = Path(r"C:\Users\i222683AbdullahGhani\.gemini\antigravity-cli\brain")

def read_stdin_timeout(timeout_sec=1.0):
    if sys.stdin.isatty():
        return None
    data = []
    def _reader():
        try:
            data.append(sys.stdin.read())
        except Exception:
            pass
    t = threading.Thread(target=_reader)
    t.daemon = True
    t.start()
    t.join(timeout=timeout_sec)
    return data[0] if data else None

def extract_prompt(raw_content):
    if not raw_content:
        return ""
    match = re.search(r"<USER_REQUEST>\s*(.*?)\s*</USER_REQUEST>", raw_content, re.DOTALL)
    if match:
        return match.group(1).strip()
    return raw_content.strip()

def parse_transcript(transcript_path):
    if not os.path.exists(transcript_path):
        return []
    
    turns = []
    current_turn = None
    
    with open(transcript_path, "r", encoding="utf-8", errors="replace") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                step = json.loads(line)
            except Exception:
                continue
                
            stype = step.get("type")
            source = step.get("source")
            
            if stype == "USER_INPUT" and source == "USER_EXPLICIT":
                if current_turn:
                    turns.append(current_turn)
                current_turn = {
                    "prompt": step,
                    "final_response": None
                }
            elif current_turn and stype == "PLANNER_RESPONSE" and source == "MODEL":
                if step.get("content"):
                    current_turn["final_response"] = step
                    
    if current_turn:
        turns.append(current_turn)
        
    return turns

def generate_session_markdown(session_id, turns, model_name=DEFAULT_MODEL):
    completed_turns = [t for t in turns if t["final_response"]]
    if not completed_turns:
        return None, None
        
    first_time = completed_turns[0]["prompt"].get("created_at", "")
    last_time = completed_turns[-1]["prompt"].get("created_at", "")
    
    date_str = first_time[:10] if first_time else datetime.utcnow().strftime("%Y-%m-%d")
    short_session = session_id[:8]
    
    # Format filename: YYYY-MM-DD_HH-MM-SS_<session-id>.md
    # Parse first_time: e.g. 2026-09-08T16:30:29Z
    if "T" in first_time:
        d_part, t_part = first_time.split("T")
        t_clean = t_part.replace(":", "-").replace("Z", "").split(".")[0]
        timestamp_prefix = f"{d_part}_{t_clean}"
    else:
        timestamp_prefix = datetime.utcnow().strftime("%Y-%m-%d_%H-%M-%S")
        
    filename = f"{timestamp_prefix}_{session_id}.md"
    
    header = f"""---
session_id: {session_id}
date: {date_str}
author: {AUTHOR}
model: {model_name}
tool: {TOOL_NAME}
project: {PROJECT_NAME}
total_exchanges: {len(completed_turns)}
first_prompt_time: {first_time}
last_prompt_time: {last_time}
---

# Session Log - {date_str}

Session: `{short_session}` | Project: `{PROJECT_NAME}` | Author: `{AUTHOR}`

---
"""

    entries = []
    for idx, turn in enumerate(completed_turns, 1):
        p_text = extract_prompt(turn["prompt"].get("content", ""))
        p_time = turn["prompt"].get("created_at", "")
        
        r_text = turn["final_response"].get("content", "").strip()
        r_time = turn["final_response"].get("created_at", "")
        
        entry = f"""[LOG_ENTRY type=PROMPT num={idx} session={short_session}]
timestamp: {p_time}
model: {model_name}

{p_text}


[LOG_ENTRY type=RESPONSE num={idx} session={short_session}]
timestamp: {r_time}
model: {model_name}

{r_text}"""
        entries.append(entry)
        
    full_content = header + "\n" + "\n\n\n".join(entries) + "\n"
    return filename, full_content

def sync_session(transcript_path, session_id, model_name=DEFAULT_MODEL):
    LOGS_DIR.mkdir(parents=True, exist_ok=True)
    turns = parse_transcript(transcript_path)
    filename, content = generate_session_markdown(session_id, turns, model_name)
    if filename and content:
        out_path = LOGS_DIR / filename
        # Only write if changed
        if not out_path.exists() or out_path.read_text(encoding="utf-8") != content:
            out_path.write_text(content, encoding="utf-8")
            return out_path
    return None

def find_session_transcripts():
    results = []
    if not BRAIN_DIR.exists():
        return results
        
    workspace_str = str(REPO_ROOT).lower().replace("\\", "/")
    workspace_win = str(REPO_ROOT).lower()
    
    for sess_dir in BRAIN_DIR.iterdir():
        if not sess_dir.is_dir():
            continue
        session_id = sess_dir.name
        full_transcript = sess_dir / ".system_generated" / "logs" / "transcript_full.jsonl"
        compact_transcript = sess_dir / ".system_generated" / "logs" / "transcript.jsonl"
        
        t_file = full_transcript if full_transcript.exists() else (compact_transcript if compact_transcript.exists() else None)
        if not t_file:
            continue
            
        # Check if this transcript references our workspace or repo root or session
        try:
            with open(t_file, "r", encoding="utf-8", errors="ignore") as f:
                content_sample = f.read(8192).lower()
            if (
                workspace_str in content_sample
                or "ugc-video-generator" in content_sample
                or "8x" in content_sample
                or "capture test" in content_sample
                or session_id == "b25c9460-3f49-4f3d-8b31-5fd5c19085ab"
            ):
                results.append((session_id, t_file))
        except Exception:
            continue
    return results

def sync_all():
    updated = []
    for session_id, t_file in find_session_transcripts():
        res = sync_session(t_file, session_id)
        if res:
            updated.append(res)
    return updated

def watch_loop():
    while True:
        try:
            sync_all()
        except Exception:
            pass
        time.sleep(1.0)

def main():
    raw_stdin = read_stdin_timeout(0.5)
    payload = None
    if raw_stdin:
        try:
            payload = json.loads(raw_stdin)
        except Exception:
            pass

    # If payload provided transcriptPath
    if payload and isinstance(payload, dict):
        t_path = payload.get("transcriptPath")
        sess_id = payload.get("conversationId")
        model = payload.get("modelName") or DEFAULT_MODEL
        if model == "auto" or "gemini-3.8" in str(model).lower():
            model = DEFAULT_MODEL
            
        if t_path and sess_id:
            p = Path(t_path)
            # Prefer transcript_full.jsonl if present
            full_p = p.parent / "transcript_full.jsonl"
            target_t = full_p if full_p.exists() else p
            sync_session(target_t, sess_id, model)
    
    if "--watch" in sys.argv:
        watch_loop()
        return

    # Also do a general sync across any matching sessions
    sync_all()

    # Always return valid JSON on stdout per Antigravity hooks contract
    action = sys.argv[1] if len(sys.argv) > 1 and not sys.argv[1].startswith("--") else ""
    if action == "PreToolUse":
        print(json.dumps({"decision": "allow"}))
    elif action == "Stop":
        print(json.dumps({"decision": "stop"}))
    else:
        print(json.dumps({}))

if __name__ == "__main__":
    main()
