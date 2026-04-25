import os
import time
import pickle
import warnings
import numpy as np
import pandas as pd
import joblib
 
from sklearn.model_selection import train_test_split, GridSearchCV, RandomizedSearchCV
from sklearn.linear_model import Ridge, LogisticRegression
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import Pipeline
from sklearn.model_selection import KFold, StratifiedKFold
from sklearn.metrics import (
    mean_squared_error, mean_absolute_error, r2_score,
    accuracy_score, roc_auc_score, f1_score,
    precision_score, recall_score, classification_report
)
from xgboost import XGBRegressor, XGBClassifier
 
warnings.filterwarnings("ignore")
np.random.seed(42)
 
# ── CONFIG ────────────────────────────────────────────────────────────────────
DATA_PATH       = r"C:\Users\vaibhav chopra\Desktop\credit-vista-your-financial-insight-main\data\credit_vista_dataset.csv"   # raw CSV (works with or without cleaned)
CLEANED_PATH    = r"C:\Users\vaibhav chopra\Desktop\credit-vista-your-financial-insight-main\data\credit_vista_cleaned.csv"   # preferred if available
OUTPUT_DIR      = r"C:\Users\vaibhav chopra\Desktop\credit-vista-your-financial-insight-main\models"
RANDOM_STATE    = 42
TEST_SIZE       = 0.15
N_CV_FOLDS      = 5
N_ITER_RANDOM   = 40
 
os.makedirs(OUTPUT_DIR, exist_ok=True)
 
# ── STEP 1: LOAD DATA ─────────────────────────────────────────────────────────
print("=" * 65)
print("  CREDIT VISTA — pkl Model Export Script")
print("=" * 65)
 
src = CLEANED_PATH if os.path.exists(CLEANED_PATH) else DATA_PATH
print(f"\n[1/6] Loading data from: {src}")
df = pd.read_csv(src)
 
# Apply cleaning if loading raw file
if src == DATA_PATH:
    drop_cols = [
        "user_id", "gender_label", "employment_type_label",
        "city_tier_label", "education_label",
        "annual_income", "avg_monthly_credit", "risk_tier",
    ]
    df.drop(columns=[c for c in drop_cols if c in df.columns], inplace=True)
    print("  [INFO] Applied cleaning pipeline on raw CSV.")
 
print(f"  Shape after loading: {df.shape}")
 
# ── STEP 2: FEATURE ENGINEERING ──────────────────────────────────────────────
print("\n[2/6] Feature Engineering ...")
 
if "income_expense_ratio" not in df.columns:
    df["income_expense_ratio"]   = df["declared_monthly_income"] / (df["monthly_expenses"] + 1)
if "net_savings_monthly" not in df.columns:
    df["net_savings_monthly"]    = df["declared_monthly_income"] * df["savings_ratio"]
if "loan_stress_score" not in df.columns:
    df["loan_stress_score"]      = (df["emi_burden_ratio"] * df["num_active_loans"]
                                    + df["default_history"] * 0.5)
if "payment_reliability" not in df.columns:
    df["payment_reliability"]    = (df["payment_consistency"] + df["utility_payment_regularity"]
                                    + df["rent_payment_on_time"] + df["mobile_recharge_consistency"]) / 4
if "stability_index" not in df.columns:
    df["stability_index"]        = (df["job_tenure_years"] / (df["job_changes_5yr"] + 1)
                                    * df["has_social_security"])
if "digital_trust_score" not in df.columns:
    df["digital_trust_score"]    = df["digital_engagement_score"] * (1 - df["cash_dependency"])
if "age_income_interaction" not in df.columns:
    df["age_income_interaction"] = df["age"] * df["declared_monthly_income"] / 1e6
 
# Resolve feature columns
exclude   = {"credit_score", "creditworthy"}
str_cols  = set(df.select_dtypes(include=["object"]).columns.tolist())
FEATURES  = [c for c in df.columns if c not in exclude and c not in str_cols]
 
print(f"  Total features used for modeling: {len(FEATURES)}")
print(f"  Features: {FEATURES}")
 
# ── STEP 3: TRAIN / TEST SPLIT ───────────────────────────────────────────────
print("\n[3/6] Splitting data (85% train / 15% test) ...")
 
X = df[FEATURES]
y_reg = df["credit_score"]
y_clf = df["creditworthy"]
 
X_train_r, X_test_r, y_train_r, y_test_r = train_test_split(
    X, y_reg, test_size=TEST_SIZE, random_state=RANDOM_STATE
)
X_train_c, X_test_c, y_train_c, y_test_c = train_test_split(
    X, y_clf, test_size=TEST_SIZE, random_state=RANDOM_STATE, stratify=y_clf
)
 
print(f"  Regression  — Train: {X_train_r.shape[0]:,} | Test: {X_test_r.shape[0]:,}")
print(f"  Classification — Train: {X_train_c.shape[0]:,} | Test: {X_test_c.shape[0]:,}")
 
# ── HELPER: Save as .pkl only ────────────────────────────────
def save_pkl(obj, name: str):
    """Save object as .pkl (pickle) only."""
    pkl_path  = os.path.join(OUTPUT_DIR, f"{name}.pkl")
    with open(pkl_path, "wb") as f:
        pickle.dump(obj, f, protocol=pickle.HIGHEST_PROTOCOL)
    size_kb = os.path.getsize(pkl_path) / 1024
    print(f"  ✅ Saved: {pkl_path:<55s} ({size_kb:>7.1f} KB)")
    return pkl_path
 
# ── STEP 4: TRAIN & EXPORT XGBOOST MODELS ────────────────────────────────────
print("\n[4/5] Training XGBoost Models (Only)...")
 
# Setup cross-validation strategies
kf = KFold(n_splits=N_CV_FOLDS, shuffle=True, random_state=RANDOM_STATE)
skf = StratifiedKFold(n_splits=N_CV_FOLDS, shuffle=True, random_state=RANDOM_STATE)
 
# ── 4A. XGBoost Regressor ──────────────────────────────────────────────────────
print("\n  ── 4A. XGBoost Regressor (2-stage tuning) ──")
 
xgb_reg_param_dist = {
    "n_estimators"     : [200, 400, 600, 800],
    "max_depth"        : [3, 4, 5, 6, 7],
    "learning_rate"    : [0.01, 0.03, 0.05, 0.1, 0.15],
    "subsample"        : [0.6, 0.7, 0.8, 0.9, 1.0],
    "colsample_bytree" : [0.5, 0.6, 0.7, 0.8, 1.0],
    "min_child_weight" : [1, 3, 5, 7],
    "gamma"            : [0, 0.1, 0.2, 0.5],
    "reg_alpha"        : [0, 0.01, 0.1, 1.0],
    "reg_lambda"       : [1.0, 2.0, 5.0, 10.0],
}
 
base_xgb_reg = XGBRegressor(
    objective="reg:squarederror", random_state=RANDOM_STATE,
    tree_method="hist", n_jobs=-1, verbosity=0
)
 
print("  Step 1/2: RandomizedSearchCV ...")
t0 = time.time()
rand_reg = RandomizedSearchCV(
    base_xgb_reg, xgb_reg_param_dist,
    n_iter=N_ITER_RANDOM, cv=kf,
    scoring="neg_root_mean_squared_error",
    n_jobs=-1, verbose=0, random_state=RANDOM_STATE
)
rand_reg.fit(X_train_r, y_train_r)
print(f"  Coarse RMSE: {-rand_reg.best_score_:.2f}  [{time.time()-t0:.1f}s]")
 
bp = rand_reg.best_params_
fine_grid_reg = {
    "n_estimators"     : [max(100, bp["n_estimators"]-100), bp["n_estimators"], bp["n_estimators"]+100],
    "max_depth"        : [max(2, bp["max_depth"]-1), bp["max_depth"], bp["max_depth"]+1],
    "learning_rate"    : [round(bp["learning_rate"]*0.7, 4), bp["learning_rate"], round(bp["learning_rate"]*1.3, 4)],
    "subsample"        : [bp["subsample"]],
    "colsample_bytree" : [bp["colsample_bytree"]],
    "min_child_weight" : [bp["min_child_weight"]],
    "gamma"            : [bp["gamma"]],
    "reg_alpha"        : [bp["reg_alpha"]],
    "reg_lambda"       : [bp["reg_lambda"]],
}
 
print("  Step 2/2: GridSearchCV fine-tune ...")
t1 = time.time()
fine_reg = GridSearchCV(
    XGBRegressor(objective="reg:squarederror", random_state=RANDOM_STATE,
                 tree_method="hist", n_jobs=-1, verbosity=0),
    fine_grid_reg, cv=kf,
    scoring="neg_root_mean_squared_error", n_jobs=-1, verbose=0
)
fine_reg.fit(X_train_r, y_train_r)
print(f"  Fine RMSE  : {-fine_reg.best_score_:.2f}  [{time.time()-t1:.1f}s]")
 
best_xgb_reg = fine_reg.best_estimator_
preds_xr = best_xgb_reg.predict(X_test_r)
rmse_x = np.sqrt(mean_squared_error(y_test_r, preds_xr))
r2_x   = r2_score(y_test_r, preds_xr)
print(f"  Test RMSE  : {rmse_x:.2f}  |  R²: {r2_x:.4f}")
print(f"  Best params: {fine_reg.best_params_}")
save_pkl(best_xgb_reg, "xgboost_regressor_credit_score")
 
# ── 4B. XGBoost Classifier ────────────────────────────────────────────────────
print("\n  ── 4B. XGBoost Classifier (2-stage tuning) ──")
 
neg = int((y_train_c == 0).sum())
pos = int((y_train_c == 1).sum())
spw = round(neg / pos, 3)
print(f"  Class balance — Pos: {pos:,} | Neg: {neg:,} | scale_pos_weight: {spw}")
 
xgb_clf_param_dist = {
    "n_estimators"     : [200, 400, 600, 800],
    "max_depth"        : [3, 4, 5, 6],
    "learning_rate"    : [0.01, 0.03, 0.05, 0.1, 0.15],
    "subsample"        : [0.6, 0.7, 0.8, 0.9],
    "colsample_bytree" : [0.5, 0.6, 0.7, 0.8, 1.0],
    "min_child_weight" : [1, 3, 5],
    "gamma"            : [0, 0.1, 0.2, 0.3],
    "reg_alpha"        : [0, 0.01, 0.1, 1.0],
    "reg_lambda"       : [1.0, 2.0, 5.0],
    "scale_pos_weight" : [1, spw],
}
 
base_clf = XGBClassifier(
    objective="binary:logistic", eval_metric="auc",
    random_state=RANDOM_STATE, tree_method="hist",
    n_jobs=-1, verbosity=0, use_label_encoder=False
)
 
print("  Step 1/2: RandomizedSearchCV ...")
t0 = time.time()
rand_clf = RandomizedSearchCV(
    base_clf, xgb_clf_param_dist,
    n_iter=N_ITER_RANDOM, cv=skf,
    scoring="roc_auc", n_jobs=-1, verbose=0, random_state=RANDOM_STATE
)
rand_clf.fit(X_train_c, y_train_c)
print(f"  Coarse AUC : {rand_clf.best_score_:.4f}  [{time.time()-t0:.1f}s]")
 
bp2 = rand_clf.best_params_
fine_grid_clf = {
    "n_estimators"     : [max(100, bp2["n_estimators"]-100), bp2["n_estimators"], bp2["n_estimators"]+100],
    "max_depth"        : [max(2, bp2["max_depth"]-1), bp2["max_depth"], bp2["max_depth"]+1],
    "learning_rate"    : [round(bp2["learning_rate"]*0.7, 4), bp2["learning_rate"], round(bp2["learning_rate"]*1.3, 4)],
    "subsample"        : [bp2["subsample"]],
    "colsample_bytree" : [bp2["colsample_bytree"]],
    "min_child_weight" : [bp2["min_child_weight"]],
    "gamma"            : [bp2["gamma"]],
    "reg_alpha"        : [bp2["reg_alpha"]],
    "reg_lambda"       : [bp2["reg_lambda"]],
    "scale_pos_weight" : [bp2["scale_pos_weight"]],
}
 
print("  Step 2/2: GridSearchCV fine-tune ...")
t1 = time.time()
fine_clf = GridSearchCV(
    XGBClassifier(objective="binary:logistic", eval_metric="auc",
                  random_state=RANDOM_STATE, tree_method="hist",
                  n_jobs=-1, verbosity=0, use_label_encoder=False),
    fine_grid_clf, cv=skf,
    scoring="roc_auc", n_jobs=-1, verbose=0
)
fine_clf.fit(X_train_c, y_train_c)
print(f"  Fine AUC   : {fine_clf.best_score_:.4f}  [{time.time()-t1:.1f}s]")
 
best_xgb_clf = fine_clf.best_estimator_
preds_xc  = best_xgb_clf.predict(X_test_c)
proba_xc  = best_xgb_clf.predict_proba(X_test_c)[:, 1]
acc_xc = accuracy_score(y_test_c, preds_xc)
auc_xc = roc_auc_score(y_test_c, proba_xc)
f1_xc  = f1_score(y_test_c, preds_xc)
print(f"  Test Acc: {acc_xc:.4f} | AUC: {auc_xc:.4f} | F1: {f1_xc:.4f}")
print(f"  Best params: {fine_clf.best_params_}")
save_pkl(best_xgb_clf, "xgboost_classifier_creditworthy")
 
# ── FINAL SUMMARY ─────────────────────────────────────────────────────────────
print("\n" + "=" * 65)
print("  XGBOOST MODELS EXPORTED AS .pkl")
print("=" * 65)
files = sorted([f for f in os.listdir(OUTPUT_DIR) if f.endswith('.pkl')])
for fname in files:
    size = os.path.getsize(os.path.join(OUTPUT_DIR, fname)) / 1024
    print(f"  {fname:<52s}  {size:>8.1f} KB")