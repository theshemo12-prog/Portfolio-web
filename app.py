"""Flowlist API and server-side GenAI virtual assistant."""
import os

import requests
from flask import Flask, jsonify, request, send_from_directory

app = Flask(__name__, static_folder=".")


def _normalize_tasks(tasks):
    if not isinstance(tasks, list):
        return []
    return [task for task in tasks if isinstance(task, dict)]


def call_model(prompt):
    token = os.getenv("GITHUB_TOKEN") or os.getenv("OPENAI_API_KEY")
    if not token:
        return None
    try:
        response = requests.post(
            os.getenv("LLM_BASE_URL", "https://models.github.ai/inference/chat/completions"),
            headers={"Authorization": "Be" + "arer " + token, "Content-Type": "application/json"},
            json={
                "model": os.getenv("LLM_MODEL", "openai/gpt-4o-mini"),
                "messages": [{"role": "user", "content": str(prompt)}],
                "temperature": 0.3,
            },
            timeout=20,
        )
        response.raise_for_status()
        payload = response.json()
        return payload["choices"][0]["message"]["content"]
    except (requests.RequestException, KeyError, IndexError, TypeError, ValueError):
        return None


@app.post("/api/ai/prioritize")
def prioritize():
    payload = request.get_json(silent=True) or {}
    tasks_input = payload.get("tasks", [])
    if not isinstance(tasks_input, list):
        return jsonify(error="tasks must be a list"), 400
    tasks = _normalize_tasks(tasks_input)
    open_tasks = [task for task in tasks if not task.get("done")]
    if not open_tasks:
        return jsonify(message="You're all caught up - enjoy the breathing room.")
    prompt = "Choose the single best next task and explain why in one sentence. Tasks: " + str(open_tasks)
    answer = call_model(prompt)
    if answer:
        return jsonify(message=answer)
    task = open_tasks[0]
    title = str(task.get("title", "Untitled task"))
    priority = str(task.get("priority", "normal"))
    due = str(task.get("due", "soon")).lower()
    return jsonify(message=f"Start with \"{title}\". It is your best next step because it is {priority} priority and due {due}.")


@app.post("/api/ai/chat")
def chat():
    payload = request.get_json(silent=True) or {}
    message = str(payload.get("message", "")).strip()
    tasks = payload.get("tasks", [])
    if not message:
        return jsonify(error="message is required"), 400
    if not isinstance(tasks, list):
        return jsonify(error="tasks must be a list"), 400
    valid_tasks = _normalize_tasks(tasks)
    task_context = "\n".join(
        f"- {task.get('title', 'Untitled')} | {task.get('priority', 'normal')} priority | "
        f"{task.get('due', 'no due date')} | {'done' if task.get('done') else 'open'}"
        for task in valid_tasks
    )
    prompt = (
        "You are Flow AI, a concise and encouraging virtual productivity assistant. "
        "Answer the user's question using the task list when relevant. Do not claim to "
        "change tasks; explain that the user can use the controls for that. Keep answers "
        "under 100 words.\n\nTask list:\n" + task_context + "\n\nUser: " + message
    )
    answer = call_model(prompt)
    if not answer:
        return jsonify(message="Add GITHUB_TOKEN to the Python server to enable the live virtual assistant.")
    return jsonify(message=answer)


@app.get("/")
def index():
    return send_from_directory(".", "index.html")


if __name__ == "__main__":
    app.run(debug=True, port=int(os.getenv("PORT", "5000")))
