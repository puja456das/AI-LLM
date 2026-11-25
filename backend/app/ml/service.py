from __future__ import annotations

import json
import re
import urllib.error
import urllib.request
from functools import lru_cache
from pathlib import Path
from typing import Any

import joblib
from sklearn.metrics.pairwise import cosine_similarity

from app.core.config import settings
from app.ml.train import MODEL_PATH


class ModelNotTrainedError(RuntimeError):
    pass


@lru_cache(maxsize=1)
def load_model() -> dict[str, Any]:
    if not MODEL_PATH.is_file():
        raise ModelNotTrainedError("CareerPilot ML model is missing. Run `python -m app.ml.train` from the backend folder.")
    return joblib.load(MODEL_PATH)


@lru_cache(maxsize=1)
def _skill_pattern() -> tuple[re.Pattern[str] | None, dict[str, str]]:
    model = load_model()
    display_by_normalized: dict[str, str] = {}
    for profile in model["profiles"]:
        for skill in profile["software_skills"]:
            key = re.sub(r"\s+", " ", skill.casefold()).strip()
            if len(key) > 1:
                display_by_normalized.setdefault(key, skill)
    if not display_by_normalized:
        return None, {}

    def regex_phrase(value: str) -> str:
        return re.escape(value).replace(r"\ ", r"\s+")

    alternatives = sorted(display_by_normalized, key=len, reverse=True)
    pattern = re.compile(
        r"(?<![\w])(?:" + "|".join(regex_phrase(value) for value in alternatives) + r")(?![\w])",
        re.IGNORECASE,
    )
    return pattern, display_by_normalized


def get_salary_benchmark(family_code: str) -> dict[str, str]:
    if family_code == "15":
        return {
            "entry_level": "$84,000 - $96,000",
            "median": "$124,200 / yr",
            "senior": "$165,000 - $210,000+",
            "growth_outlook": "Much faster than average (+17% projected)",
        }
    elif family_code == "17":
        return {
            "entry_level": "$74,000 - $86,000",
            "median": "$101,500 / yr",
            "senior": "$142,000 - $180,000",
            "growth_outlook": "Faster than average (+9% projected)",
        }
    elif family_code == "11":
        return {
            "entry_level": "$88,000 - $108,000",
            "median": "$138,000 / yr",
            "senior": "$195,000 - $250,000+",
            "growth_outlook": "Average growth (+6% projected)",
        }
    elif family_code == "13":
        return {
            "entry_level": "$62,000 - $75,000",
            "median": "$86,500 / yr",
            "senior": "$125,000 - $160,000",
            "growth_outlook": "Faster than average (+8% projected)",
        }
    else:
        return {
            "entry_level": "$56,000 - $68,000",
            "median": "$79,000 / yr",
            "senior": "$115,000 - $145,000",
            "growth_outlook": "Moderate (+5% projected)",
        }


def compute_ats_scorecard(text: str, recognized_skills: list[str]) -> dict[str, Any]:
    words = re.findall(r"\b[A-Za-z0-9+#.-]+\b", text)
    wc = len(words)

    # Detect numbers & metrics
    metrics = re.findall(r"\b\d+(?:\.\d+)?(?:%|x|k|M|K)?\b|\$\d+", text)
    metric_count = len(metrics)

    # Detect action verbs
    strong_verbs = {
        "built", "developed", "created", "designed", "engineered", "implemented",
        "optimized", "architected", "spearheaded", "managed", "deployed", "orchestrated",
        "reduced", "improved", "scaled", "automated", "delivered", "collaborated",
        "solved", "refactored", "led", "launched", "streamlined", "analyzed"
    }
    found_verbs = {w.lower() for w in words if w.lower() in strong_verbs}
    verb_count = len(found_verbs)

    checks = []
    tips = []
    score = 0

    # 1. Word Count check
    if 250 <= wc <= 1100:
        score += 25
        checks.append({"label": "Word Count & Length", "passed": True, "detail": f"{wc} words (Ideal 1-2 page length)."})
    else:
        score += 10
        checks.append({"label": "Word Count & Length", "passed": False, "detail": f"{wc} words (Ideal is 300 to 1,000 words)."})
        tips.append("Adjust resume length so it stays concise and impactful within 1 to 2 pages.")

    # 2. Measurable Metrics Check
    if metric_count >= 3:
        score += 25
        checks.append({"label": "Quantifiable Achievements", "passed": True, "detail": f"Found {metric_count} metrics & quantified outcomes."})
    else:
        score += 10
        checks.append({"label": "Quantifiable Achievements", "passed": False, "detail": f"Only {metric_count} metric(s) found."})
        tips.append("Add 2+ quantifiable outcomes (e.g. 'improved performance by 30%', 'handled 50k+ requests', 'reduced deployment time by 4 hours').")

    # 3. Action Verbs Check
    if verb_count >= 5:
        score += 25
        checks.append({"label": "Impact Action Verbs", "passed": True, "detail": f"Found {verb_count} strong action verbs."})
    else:
        score += 12
        checks.append({"label": "Impact Action Verbs", "passed": False, "detail": f"Found {verb_count} action verbs."})
        tips.append("Start bullet points with strong power verbs like 'Architected', 'Spearheaded', 'Optimized', or 'Automated'.")

    # 4. Software Technologies & Skills
    if len(recognized_skills) >= 4:
        score += 25
        checks.append({"label": "Technical Software Skills", "passed": True, "detail": f"{len(recognized_skills)} recognized technologies detected."})
    else:
        score += 10
        checks.append({"label": "Technical Software Skills", "passed": False, "detail": f"Only {len(recognized_skills)} skills matched standard vocabulary."})
        tips.append("Explicitly list relevant programming languages, libraries, and tools in a dedicated Skills section.")

    rating = "Excellent" if score >= 85 else ("Good" if score >= 65 else "Needs Optimization")

    return {
        "score": score,
        "rating": rating,
        "word_count": wc,
        "quantifiable_metrics_count": metric_count,
        "action_verbs_count": verb_count,
        "checks": checks,
        "improvement_tips": tips or ["Your resume has strong formatting and high ATS keyword density!"]
    }


def analyze_resume_text(text: str, recommendation_limit: int = 5) -> dict[str, Any]:
    model = load_model()
    normalized_text = re.sub(r"\s+", " ", text).strip()

    classifier = model["classifier"]
    family_codes = classifier.predict([normalized_text])[0]
    probabilities = classifier.predict_proba([normalized_text])[0]
    ranked_families = sorted(
        zip(classifier.classes_, probabilities, strict=True), key=lambda item: item[1], reverse=True
    )[:3]
    family_names = model["family_names"]
    predicted_family_code = str(family_codes)

    pattern, skill_names = _skill_pattern()
    recognized_skills: list[str] = []
    if pattern is not None:
        for match in pattern.finditer(normalized_text):
            key = re.sub(r"\s+", " ", match.group().casefold()).strip()
            name = skill_names.get(key)
            if name and name.casefold() not in {value.casefold() for value in recognized_skills}:
                recognized_skills.append(name)
    recognized_set = {skill.casefold() for skill in recognized_skills}

    matrix = model["profile_matrix"]
    query_vector = model["profile_vectorizer"].transform([normalized_text])
    scores = cosine_similarity(query_vector, matrix).ravel()
    ranked_profile_indices = scores.argsort()[::-1][:recommendation_limit]
    recommendations: list[dict[str, Any]] = []
    for index in ranked_profile_indices:
        profile = model["profiles"][int(index)]
        priority_skills = profile["priority_software_skills"]
        matched_skills = [skill for skill in profile["software_skills"] if skill.casefold() in recognized_set]
        missing_skills = [skill for skill in priority_skills if skill.casefold() not in recognized_set]
        recommendations.append({
            "soc_code": profile["soc_code"],
            "title": profile["title"],
            "family": family_names.get(profile["family_code"], "Other"),
            "similarity_score": round(float(scores[index]) * 100, 2),
            "matching_skills": matched_skills[:8],
            "missing_skills": missing_skills[:8],
            "salary": get_salary_benchmark(profile["family_code"]),
        })

    metrics = model["metrics"]
    ats_scorecard = compute_ats_scorecard(text, recognized_skills)
    return {
        "detected_family": {
            "code": predicted_family_code,
            "name": family_names.get(predicted_family_code, "Other"),
            "confidence": round(float(max(probabilities)) * 100, 2),
        },
        "alternative_families": [
            {"code": str(code), "name": family_names.get(str(code), "Other"), "confidence": round(float(probability) * 100, 2)}
            for code, probability in ranked_families
        ],
        "recognized_software_skills": recognized_skills[:100],
        "recommendations": recommendations,
        "ats_scorecard": ats_scorecard,
        "model_info": {
            "name": metrics["model_name"],
            "dataset": metrics["dataset"],
            "training_examples": metrics["training_examples"],
            "test_examples": metrics["test_examples"],
            "occupation_profiles": metrics["occupation_profiles"],
            "precision_macro": metrics["precision_macro"],
            "recall_macro": metrics["recall_macro"],
            "f1_macro": metrics["f1_macro"],
        },
        "notice": "The family score is uncalibrated: the classifier was evaluated on task statements, not resumes. Role percentages are TF-IDF cosine similarity, not a probability of being hired.",
    }


def find_occupation_profile(title_or_code: str) -> dict[str, Any] | None:
    try:
        model = load_model()
    except Exception:
        return None
    query = title_or_code.strip().lower()
    for p in model["profiles"]:
        if p["soc_code"].lower() == query:
            return p
    for p in model["profiles"]:
        if query == p["title"].lower():
            return p
    for p in model["profiles"]:
        if query in p["title"].lower() or p["title"].lower() in query:
            return p
    return None


def get_interview_questions(role_title: str, soc_code: str | None = None, skills: list[str] | None = None) -> list[dict[str, str]]:
    profile = None
    if soc_code:
        profile = find_occupation_profile(soc_code)
    if not profile and role_title:
        profile = find_occupation_profile(role_title)

    role = profile["title"] if profile else (role_title or "Software Developer")
    sw_skills = (profile["priority_software_skills"][:5] if profile and profile.get("priority_software_skills") else (skills or ["Python", "SQL", "Git"]))
    desc = profile["description"] if profile and "description" in profile else f"Key competencies for {role}"

    questions: list[dict[str, str]] = []

    # 1. Technical Questions based on software skills
    for i, skill in enumerate(sw_skills[:3]):
        if i == 0:
            questions.append({
                "category": "Technical",
                "question": f"How do you design, optimize, and maintain production systems using {skill}?",
                "context": f"Tests production-grade proficiency and architectural understanding of {skill}.",
                "sample_answer_tip": f"Explain real project architecture, design patterns, performance optimizations, and debugging techniques with {skill}."
            })
        elif i == 1:
            questions.append({
                "category": "Technical",
                "question": f"Can you describe a complex problem you resolved with {skill}? What trade-offs did you consider?",
                "context": f"Tests engineering trade-offs and practical problem solving with {skill}.",
                "sample_answer_tip": f"Outline the technical bottleneck, compare the trade-offs of 2 different approaches, and state why you chose your solution."
            })
        else:
            questions.append({
                "category": "Technical",
                "question": f"How do you ensure test coverage, security, and continuous delivery when deploying solutions with {skill}?",
                "context": f"Evaluates production readiness and DevOps best practices for {skill}.",
                "sample_answer_tip": "Discuss unit/integration testing, CI/CD pipeline automation, and monitoring/telemetry."
            })

    # 2. System Design & Problem Solving
    questions.append({
        "category": "System Design & Architecture",
        "question": f"How would you architect a scalable, highly available solution to fulfill the core operational responsibilities of a {role}?",
        "context": f"Evaluates end-to-end design thinking for: {desc[:130]}...",
        "sample_answer_tip": "Walk through system requirements, data flow diagram, service decoupling, caching layers, and database selection."
    })
    questions.append({
        "category": "Problem Solving",
        "question": f"During a production incident affecting a {role} workflow, what structured triage procedure do you follow to isolate and remediate the issue?",
        "context": "Assesses incident management and composure under pressure.",
        "sample_answer_tip": "Apply the triage framework: assess blast radius, mitigate customer impact, isolate root cause, and document post-mortem."
    })

    # 3. Behavioral Questions (STAR Method)
    questions.append({
        "category": "Behavioral (STAR Method)",
        "question": f"Describe a situation in your role where you encountered shifting requirements or tight deadlines. How did you adapt your deliverables?",
        "context": "Tests agility, communication, and priority management.",
        "sample_answer_tip": "Structure with STAR: Situation (context), Task (goal), Action (how you reprioritized and communicated), Result (quantifiable outcome)."
    })
    questions.append({
        "category": "Behavioral (STAR Method)",
        "question": "Can you share an instance where you had a technical disagreement with a team member? How did you navigate the discussion and find consensus?",
        "context": "Evaluates teamwork, emotional intelligence, and collaborative decision making.",
        "sample_answer_tip": "Emphasize listening to alternative viewpoints, evaluating objective benchmarks/trade-offs, and committing to the best solution for the team."
    })

    return questions


def _call_gemini_api(prompt: str) -> str | None:
    api_key = settings.gemini_api_key.strip()
    if not api_key:
        return None
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{settings.gemini_model}:generateContent?key={api_key}"
    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {"temperature": 0.7, "maxOutputTokens": 800}
    }
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=8) as response:
            res_body = response.read().decode("utf-8")
            res_json = json.loads(res_body)
            candidates = res_json.get("candidates", [])
            if candidates:
                parts = candidates[0].get("content", {}).get("parts", [])
                if parts:
                    return parts[0].get("text", "").strip()
    except Exception:
        return None
    return None


def process_ai_chat(
    message: str,
    role_context: str | None = None,
    interviewer_type: str | None = None,
    interview_mode: str | None = None,
    skills_context: list[str] | None = None,
) -> dict[str, Any]:
    msg = message.strip()
    role = role_context or "Software Developer"
    skills_str = ", ".join(skills_context[:6]) if skills_context else "relevant technologies"

    # Try Gemini if configured
    gemini_prompt = (
        f"You are the CareerPilot AI Interview Chatbot, a friendly, encouraging, and expert career interview coach. "
        f"The user is preparing for the role of '{role}' with skills: {skills_str}. "
        f"User message: {msg}\n"
        f"Provide a clear, warm, easy-to-understand response. "
        f"If the user asks for interview questions, provide 1 or 2 clear questions. "
        f"If the user gives an answer, provide constructive, positive feedback with a helpful tip."
    )
    gemini_reply = _call_gemini_api(gemini_prompt)
    if gemini_reply:
        return {
            "reply": gemini_reply,
            "suggestions": [
                f"Ask me another technical question for {role}",
                "Can you give me an example of an ideal answer?",
                "Ask me a common HR / behavioral question"
            ]
        }

    # Smart built-in Friendly AI Chatbot Engine
    lower = msg.lower()
    is_answer = (
        len(msg.split()) >= 12
        or interview_mode == "score_answer"
        or any(k in lower for k in ["my answer", "in my project", "we used", "i was responsible", "i worked on", "i developed", "i built", "situation:"])
    )

    # 1. User provided an answer - give helpful, clear feedback
    if is_answer:
        has_metrics = bool(re.search(r"\d+%|\d+x|\d+ms|\$\d+|\d+ users|\d+ days|\d+ weeks|\d+ months", msg))

        reply = (
            f"### 👏 Great effort on your answer!\n\n"
            f"Here is simple, clear feedback to help you stand out in your **{role}** interview:\n\n"
            f"**✅ What you did well:**\n"
            f"- You directly addressed the situation and showed your hands-on experience.\n"
            f"- Your explanation demonstrated practical problem-solving.\n\n"
            f"**💡 How to make it even better:**\n"
            + (f"- **Awesome job sharing measurable numbers!** Adding metrics makes your impact crystal clear.\n" if has_metrics else f"- **Add a measurable outcome:** Interviewers love numbers! For example: *'This improved loading speed by 25%'* or *'We delivered the feature 1 week ahead of deadline.'*\n")
            + f"- **Keep it structured (STAR method):** State the **Situation** briefly, explain the **Task**, describe the **Action** you took, and share the positive **Result**.\n\n"
            f"**⭐ Sample Polished Conclusion:**\n"
            f"> *\"This project was a success because it solved the client's problem, reduced errors, and helped our team deliver with higher confidence.\"*\n\n"
            f"Would you like to try another question?"
        )
        suggestions = [
            f"Ask me another question for {role}",
            "Can you give me a common HR interview question?",
            "How do I introduce myself in 1 minute?"
        ]
        return {
            "reply": reply,
            "suggestions": suggestions
        }

    # 2. User asks for questions or mock interview
    if any(k in lower for k in ["question", "interview question", "practice", "mock interview", "give me questions", "ask me", "start"]):
        qs = get_interview_questions(role, skills=skills_context)
        q1 = qs[0] if qs else {"question": f"Can you tell me about a project where you used {skills_str}?", "category": "Technical", "sample_answer_tip": "Focus on what you built and how you solved challenges."}
        q2 = qs[1] if len(qs) > 1 else {"question": "Tell me about a time you had to learn something new quickly.", "category": "Behavioral", "sample_answer_tip": "Show curiosity and your learning strategy."}

        reply = (
            f"### 🎙️ Let's practice for **{role}**!\n\n"
            f"Here is your first practice question:\n\n"
            f"**Question:**\n"
            f"> **\"{q1['question']}\"**\n\n"
            f"*(Category: {q1['category']})*\n\n"
            f"**💡 Helpful Tip for this question:**\n"
            f"{q1.get('sample_answer_tip', 'Explain your approach, tools used, and the result achieved.')}\n\n"
            f"---\n"
            f"👉 **Now it's your turn:** Type your answer in the box below and click **Send**. I will read your answer and give you friendly tips to improve it!"
        )
        suggestions = [
            f"Give me an example answer for this question",
            "Give me a behavioral question instead",
            "Skip to the next question"
        ]
        return {
            "reply": reply,
            "suggestions": suggestions
        }

    # 3. User asks about introducing themselves / elevator pitch
    if any(k in lower for k in ["introduce", "tell me about yourself", "elevator pitch", "self intro"]):
        reply = (
            f"### ✨ How to Answer: *'Tell me about yourself'* for **{role}**\n\n"
            f"Keep your answer to **60–90 seconds** using this simple 3-part formula:\n\n"
            f"1. **Who you are (Present):**\n"
            f"   *\"Hi, I'm a passionate {role} with a strong foundation in {skills_str}.\"*\n\n"
            f"2. **What you've accomplished (Past):**\n"
            f"   *\"Recently, I built and contributed to projects where I focused on building clean code, solving complex problems, and collaborating with team members.\"*\n\n"
            f"3. **Why you're here (Future):**\n"
            f"   *\"I'm excited about this opportunity because I want to bring my skills to a growing team where I can continue learning and delivering real value.\"*\n\n"
            f"Try typing your introduction below, and I'll review it for you!"
        )
        suggestions = [
            "Here is my self introduction:",
            f"What technical questions will they ask for {role}?",
            "What questions should I ask the interviewer?"
        ]
        return {"reply": reply, "suggestions": suggestions}

    # 4. User asks for example answers or tips
    if any(k in lower for k in ["example answer", "sample answer", "ideal answer", "how to answer"]):
        reply = (
            f"### 💡 Formula for an Ideal Interview Answer:\n\n"
            f"Whenever an interviewer asks about your past experience or a technical challenge, use the **STAR formula**:\n\n"
            f"- **Situation:** Briefly explain the project and problem (1-2 sentences).\n"
            f"- **Task:** Explain what you needed to achieve.\n"
            f"- **Action:** What specific tools ({skills_str}) and logic did you use?\n"
            f"- **Result:** What was the successful outcome?\n\n"
            f"Would you like to practice with a sample question right now?"
        )
        suggestions = [
            f"Yes, ask me a practice question for {role}",
            "Give me tips for common HR questions",
            "What are common mistakes candidates make?"
        ]
        return {"reply": reply, "suggestions": suggestions}

    # Default friendly greeting
    reply = (
        f"Hello! 👋 I'm your **CareerPilot AI Interview Chatbot**.\n\n"
        f"I'm here to help you get confident and ready for your **{role}** interviews!\n\n"
        f"**How can I help you right now?**\n"
        f"1. **🎯 Practice Questions:** I'll give you realistic questions one by one.\n"
        f"2. **📝 Review Your Answers:** Type your answer and I'll give you warm, clear feedback on how to improve.\n"
        f"3. **✨ Interview Tips:** Ask me anything about self-introductions, technical prep, or HR questions!\n\n"
        f"Click a quick suggestion below or type any question to start! 😊"
    )
    suggestions = [
        f"Ask me a practice question for {role}",
        "How do I introduce myself in an interview?",
        "Ask me a common HR / behavioral question"
    ]
    return {"reply": reply, "suggestions": suggestions}
