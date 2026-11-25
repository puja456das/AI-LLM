"""Train CareerPilot's occupation-family classifier and job profile index.

Dataset: O*NET 31.0 task statements and software skills, CC BY 4.0.
Run from backend: python -m app.ml.train
"""

from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path

import joblib
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import classification_report, precision_recall_fscore_support
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from app.ml.families import OCCUPATION_FAMILIES

BACKEND_DIR = Path(__file__).resolve().parents[2]
DATA_DIR = BACKEND_DIR / "data" / "raw"
ARTIFACT_DIR = Path(__file__).resolve().parent / "artifacts"
MODEL_PATH = ARTIFACT_DIR / "careerpilot_model.joblib"
METRICS_PATH = ARTIFACT_DIR / "training_metrics.json"


def _read_csv(name: str) -> pd.DataFrame:
    path = DATA_DIR / name
    if not path.is_file():
        raise FileNotFoundError(f"Required O*NET dataset file not found: {path}")
    return pd.read_csv(path, dtype=str, keep_default_na=False)


def train() -> dict:
    tasks = _read_csv("task_statements.csv")
    occupations = _read_csv("occupation_data.csv")
    software = _read_csv("software_skills.csv")

    tasks["Task"] = tasks["Task"].fillna("").str.strip()
    tasks["family_code"] = tasks["O*NET-SOC Code"].str[:2]
    tasks = tasks[(tasks["Task"].str.len() >= 20) & tasks["family_code"].isin(OCCUPATION_FAMILIES)]

    x_train, x_test, y_train, y_test = train_test_split(
        tasks["Task"],
        tasks["family_code"],
        test_size=0.2,
        random_state=42,
        stratify=tasks["family_code"],
    )
    classifier = Pipeline([
        ("tfidf", TfidfVectorizer(
            lowercase=True,
            strip_accents="unicode",
            stop_words="english",
            ngram_range=(1, 2),
            min_df=2,
            max_features=80_000,
            sublinear_tf=True,
        )),
        ("classifier", LogisticRegression(
            max_iter=500,
            class_weight="balanced",
            solver="lbfgs",
            random_state=42,
        )),
    ])
    classifier.fit(x_train, y_train)
    y_pred = classifier.predict(x_test)
    precision, recall, macro_f1, _ = precision_recall_fscore_support(
        y_test, y_pred, average="macro", zero_division=0
    )

    tasks_by_occupation = tasks.groupby("O*NET-SOC Code")["Task"].apply(list).to_dict()
    software = software.copy()
    software["Workplace Example"] = software["Workplace Example"].fillna("").str.strip()
    software = software[software["Workplace Example"].str.len() > 1]
    all_skills_by_occupation = software.groupby("O*NET-SOC Code")["Workplace Example"].apply(
        lambda values: sorted(set(values), key=str.casefold)
    ).to_dict()
    software["is_hot"] = software["Hot Technology"].str.upper().eq("Y")
    software["is_in_demand"] = software["In Demand"].str.upper().eq("Y")
    priority_software = software[software["is_hot"] | software["is_in_demand"]]

    def ordered_priority_skills(rows: pd.DataFrame) -> list[str]:
        ranked = sorted(
            zip(rows["Workplace Example"], rows["is_hot"], rows["is_in_demand"], strict=True),
            key=lambda item: (not item[1], not item[2], item[0].casefold()),
        )
        return list(dict.fromkeys(skill for skill, _, _ in ranked))

    priority_skills_by_occupation = priority_software.groupby("O*NET-SOC Code").apply(
        ordered_priority_skills, include_groups=False
    ).to_dict()

    profiles: list[dict[str, str | list[str]]] = []
    for row in occupations.itertuples(index=False, name=None):
        code, title, description = row[:3]
        task_list = tasks_by_occupation.get(code, [])
        skill_list = all_skills_by_occupation.get(code, [])
        if not task_list:
            continue
        indexed_skills = priority_skills_by_occupation.get(code, []) or skill_list
        document = " ".join([title, description, *task_list, *skill_list])
        profiles.append({
            "soc_code": code,
            "title": title,
            "description": description,
            "family_code": code[:2],
            "profile_text": document,
            "software_skills": skill_list,
            "priority_software_skills": indexed_skills,
        })

    profile_vectorizer = TfidfVectorizer(
        lowercase=True,
        strip_accents="unicode",
        stop_words="english",
        ngram_range=(1, 2),
        min_df=1,
        max_features=120_000,
        sublinear_tf=True,
    )
    profile_matrix = profile_vectorizer.fit_transform([str(p["profile_text"]) for p in profiles])
    for profile in profiles:
        profile.pop("profile_text")

    report = classification_report(
        y_test,
        y_pred,
        labels=sorted(OCCUPATION_FAMILIES),
        target_names=[f"{code} {OCCUPATION_FAMILIES[code]}" for code in sorted(OCCUPATION_FAMILIES)],
        output_dict=True,
        zero_division=0,
    )
    metrics = {
        "model_name": "TF-IDF + Logistic Regression occupation-family classifier",
        "dataset": "O*NET 31.0 Database",
        "dataset_license": "CC BY 4.0",
        "label_definition": "The first two digits of the O*NET-SOC code identify the major occupation family.",
        "training_examples": int(len(x_train)),
        "test_examples": int(len(x_test)),
        "occupation_profiles": len(profiles),
        "family_count": len(set(tasks["family_code"])),
        "split": "stratified random 80/20 split, random_state=42",
        "precision_macro": round(float(precision), 4),
        "recall_macro": round(float(recall), 4),
        "f1_macro": round(float(macro_f1), 4),
        "classification_report": report,
        "trained_at_utc": datetime.now(timezone.utc).isoformat(),
        "limitations": "O*NET task statements describe U.S. occupations. Test scores measure task-statement family classification, not hiring success or resume quality.",
    }
    artifact = {
        "version": 1,
        "classifier": classifier,
        "profile_vectorizer": profile_vectorizer,
        "profile_matrix": profile_matrix,
        "profiles": profiles,
        "family_names": OCCUPATION_FAMILIES,
        "metrics": metrics,
    }

    ARTIFACT_DIR.mkdir(parents=True, exist_ok=True)
    joblib.dump(artifact, MODEL_PATH, compress=3)
    METRICS_PATH.write_text(json.dumps(metrics, indent=2), encoding="utf-8")
    return metrics


if __name__ == "__main__":
    result = train()
    print(json.dumps({key: result[key] for key in (
        "model_name", "dataset", "training_examples", "test_examples",
        "occupation_profiles", "family_count", "precision_macro", "recall_macro", "f1_macro",
    )}, indent=2))
