# O*NET dataset attribution and preparation

This project includes three CSV files from the **O*NET 31.0 Database**:

- `raw/task_statements.csv` — occupation task statements used as labeled text examples.
- `raw/occupation_data.csv` — occupation codes, titles, and descriptions used to build role profiles.
- `raw/software_skills.csv` — software examples linked to occupation codes and their hot/in-demand flags.

Source: [O*NET 31.0 Database](https://www.onetcenter.org/database.html), U.S. Department of Labor, Employment and Training Administration. The files are distributed under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Source CSV contents are included unchanged. CareerPilot creates transformed occupation profiles and labels task statements by the first two digits of the O*NET-SOC code; these derived files/model are CareerPilot modifications. USDOL/ETA has not approved, endorsed, or tested those modifications. O*NET is a trademark of USDOL/ETA.

The reproducible training command, `python -m app.ml.train`, performs a stratified 80/20 random split (seed 42), trains a TF-IDF plus logistic-regression classifier for the 22 represented major occupation groups, evaluates the held-out task statements, and builds a separate TF-IDF cosine-similarity index over occupation profiles. The current run used 15,030 training examples and 3,758 test examples. Results are saved in `app/ml/artifacts/training_metrics.json`; no accuracy claim is inferred from the job-recommendation similarity scores.

The classifier predicts a broad occupational family from task-like text. Resume role suggestions compare the resume's TF-IDF representation to O*NET occupation profiles; those scores are similarity measures, not hiring probabilities. O*NET content describes U.S. occupational information, not live vacancies or local-market demand.
