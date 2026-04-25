"""
================================================================================
  CREDIT VISTA — MODEL TRAINING SCRIPT
  Tasks:
    1. REGRESSION  — Predict credit_score   (LinearRegression + XGBoostRegressor)
    2. CLASSIFICATION — Predict creditworthy (LogisticRegression + XGBoostClassifier)
  All hyperparameters tuned via GridSearchCV / RandomizedSearchCV.
  Ready for direct deployment (joblib serialisation included).
================================================================================
"""

# ── IMPORTS ───────────────────────────────────────────────────────────────────
import os
import time
import warnings
import numpy as np
import pandas as pd
import joblib

from sklearn.model_selection import (
    train_test_split, GridSearchCV, RandomizedSearchCV, StratifiedKFold, KFold
)
from sklearn.linear_model import LinearRegression, LogisticRegression, Ridge
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import Pipeline
from sklearn.metrics import (
    mean_squared_error, mean_absolute_error, r2_score,
    accuracy_score, roc_auc_score, f1_score,
    precision_score, recall_score, classification_report,
    confusion_matrix
)
from sklearn.inspection import permutation_importance

from xgboost import XGBRegressor, XGBClassifier

warnings.filterwarnings("ignore")
np.random.seed(42)

# ── CONFIGURATION ─────────────────────────────────────────────────────────────
DATA_PATH        = "credit_vista_cleaned.csv"   # output from EDA notebook
FALLBACK_PATH    = "credit_vista_dataset.csv"   # raw file (if cleaned not found)
OUTPUT_DIR       = "models"                     # directory to save trained models
RANDOM_STATE     = 42
TEST_SIZE        = 0.15   # 15% test
VAL_SIZE         = 0.15   # 15% validation (from remaining 85%)
N_CV_FOLDS       = 5
N_ITER_RANDOM    = 40     # iterations for RandomizedSearchCV

os.makedirs(OUTPUT_DIR, exist_ok=True)

# ─────────────────────────────────────────────────────────────────────────────
# SECTION 1 — DATA LOADING & FEATURE ENGINEERING
# ─────────────────────────────────────────────────────────────────────────────

def load_and_prepare(path: str, fallback: str) -> pd.DataFrame:
    """Load cleaned CSV, or raw CSV and apply cleaning pipeline."""
    if os.path.exists(path):
        print(f"[INFO] Loading cleaned dataset: {path}")
        df = pd.read_csv(path)
    elif os.path.exists(fallback):
        print(f"[WARN] Cleaned file not found. Loading raw: {fallback}")
        df = pd.read_csv(fallback)
        drop_cols = [
            'user_id', 'gender_label', 'employment_type_label',
            'city_tier_label', 'education_label',
            'annual_income', 'avg_monthly_credit', 'risk_tier',
        ]
        df = df.drop(columns=[c for c in drop_cols if c in df.columns])
    else:
        raise FileNotFoundError(
            f"Neither '{path}' nor '{fallback}' found. "
            "Run the EDA notebook first to generate 'credit_vista_cleaned.csv'."
        )
    return df


def engineer_features(df: pd.DataFrame) -> pd.DataFrame:
    """Apply feature engineering (idempotent — skips if columns already exist)."""
    if 'income_expense_ratio' not in df.columns:
        df['income_expense_ratio'] = df['declared_monthly_income'] / (df['monthly_expenses'] + 1)
    if 'net_savings_monthly' not in df.columns:
        df['net_savings_monthly'] = df['declared_monthly_income'] * df['savings_ratio']
    if 'loan_stress_score' not in df.columns:
        df['loan_stress_score'] = (
            df['emi_burden_ratio'] * df['num_active_loans'] + df['default_history'] * 0.5
        )
    if 'payment_reliability' not in df.columns:
        df['payment_reliability'] = (
            df['payment_consistency'] + df['utility_payment_regularity'] +
            df['rent_payment_on_time'] + df['mobile_recharge_consistency']
        ) / 4
    if 'stability_index' not in df.columns:
        df['stability_index'] = (
            df['job_tenure_years'] / (df['job_changes_5yr'] + 1)
        ) * df['has_social_security']
    if 'digital_trust_score' not in df.columns:
        df['digital_trust_score'] = df['digital_engagement_score'] * (1 - df['cash_dependency'])
    if 'age_income_interaction' not in df.columns:
        df['age_income_interaction'] = df['age'] * df['declared_monthly_income'] / 1e6
    return df


def get_feature_columns(df: pd.DataFrame) -> list:
    """Return feature columns (everything except targets)."""
    exclude = {'credit_score', 'creditworthy'}
    # Also drop any stray string columns
    str_cols = df.select_dtypes(include=['object', 'str']).columns.tolist()
    return [c for c in df.columns if c not in exclude and c not in str_cols]


# ─────────────────────────────────────────────────────────────────────────────
# SECTION 2 — PREPARE DATASETS
# ─────────────────────────────────────────────────────────────────────────────

def prepare_splits(df: pd.DataFrame, target: str, stratify: bool = False):
    """
    Split into train / validation / test sets.
    Returns X_train, X_val, X_test, y_train, y_val, y_test.
    """
    feature_cols = get_feature_columns(df)
    X = df[feature_cols]
    y = df[target]

    strat_y = y if stratify else None

    # First split: train+val vs test
    X_trainval, X_test, y_trainval, y_test = train_test_split(
        X, y, test_size=TEST_SIZE, random_state=RANDOM_STATE,
        stratify=strat_y if stratify else None
    )

    # Second split: train vs val
    val_fraction = VAL_SIZE / (1 - TEST_SIZE)
    strat_tv = y_trainval if stratify else None
    X_train, X_val, y_train, y_val = train_test_split(
        X_trainval, y_trainval, test_size=val_fraction,
        random_state=RANDOM_STATE,
        stratify=strat_tv if stratify else None
    )

    print(f"  Train : {X_train.shape[0]:>6,} rows")
    print(f"  Val   : {X_val.shape[0]:>6,} rows")
    print(f"  Test  : {X_test.shape[0]:>6,} rows")
    return X_train, X_val, X_test, y_train, y_val, y_test


# ─────────────────────────────────────────────────────────────────────────────
# SECTION 3 — REGRESSION MODELS
# ─────────────────────────────────────────────────────────────────────────────

def evaluate_regression(model, X_val, y_val, X_test, y_test, name: str):
    """Print regression metrics on val and test sets."""
    for split_name, X_s, y_s in [("Val", X_val, y_val), ("Test", X_test, y_test)]:
        preds = model.predict(X_s)
        rmse  = np.sqrt(mean_squared_error(y_s, preds))
        mae   = mean_absolute_error(y_s, preds)
        r2    = r2_score(y_s, preds)
        print(f"  [{name}] {split_name} — RMSE: {rmse:.2f} | MAE: {mae:.2f} | R²: {r2:.4f}")


# ── 3A. Linear Regression (Ridge) ─────────────────────────────────────────────

def train_ridge_regression(X_train, y_train, X_val, y_val, X_test, y_test):
    print("\n" + "="*60)
    print("  3A. RIDGE REGRESSION — Credit Score Prediction")
    print("="*60)

    pipeline = Pipeline([
        ('scaler', StandardScaler()),
        ('model', Ridge())
    ])

    # Hyperparameter grid
    param_grid = {
        'model__alpha': [0.01, 0.1, 1.0, 10.0, 50.0, 100.0, 500.0, 1000.0]
    }

    cv = KFold(n_splits=N_CV_FOLDS, shuffle=True, random_state=RANDOM_STATE)
    grid_search = GridSearchCV(
        pipeline, param_grid, cv=cv,
        scoring='neg_root_mean_squared_error',
        n_jobs=-1, verbose=0
    )

    t0 = time.time()
    grid_search.fit(X_train, y_train)
    elapsed = time.time() - t0

    best_model = grid_search.best_estimator_
    best_alpha = grid_search.best_params_['model__alpha']
    cv_rmse    = -grid_search.best_score_

    print(f"  Best alpha     : {best_alpha}")
    print(f"  CV RMSE (train): {cv_rmse:.2f}")
    print(f"  Training time  : {elapsed:.1f}s")
    evaluate_regression(best_model, X_val, y_val, X_test, y_test, "Ridge")

    # Save
    model_path = os.path.join(OUTPUT_DIR, "ridge_regression_credit_score.joblib")
    joblib.dump(best_model, model_path)
    print(f"  Model saved → {model_path}")

    return best_model


# ── 3B. XGBoost Regressor ──────────────────────────────────────────────────────

def train_xgboost_regressor(X_train, y_train, X_val, y_val, X_test, y_test):
    print("\n" + "="*60)
    print("  3B. XGBOOST REGRESSOR — Credit Score Prediction")
    print("="*60)

    # Step 1: Coarse RandomizedSearchCV
    param_dist = {
        'n_estimators'     : [200, 400, 600, 800],
        'max_depth'        : [3, 4, 5, 6, 7],
        'learning_rate'    : [0.01, 0.03, 0.05, 0.1, 0.15],
        'subsample'        : [0.6, 0.7, 0.8, 0.9, 1.0],
        'colsample_bytree' : [0.5, 0.6, 0.7, 0.8, 1.0],
        'min_child_weight' : [1, 3, 5, 7],
        'gamma'            : [0, 0.1, 0.2, 0.5],
        'reg_alpha'        : [0, 0.01, 0.1, 1.0],
        'reg_lambda'       : [1.0, 2.0, 5.0, 10.0],
    }

    base_xgb = XGBRegressor(
        objective='reg:squarederror',
        random_state=RANDOM_STATE,
        tree_method='hist',
        n_jobs=-1,
        verbosity=0
    )

    cv = KFold(n_splits=N_CV_FOLDS, shuffle=True, random_state=RANDOM_STATE)
    rand_search = RandomizedSearchCV(
        base_xgb, param_dist,
        n_iter=N_ITER_RANDOM, cv=cv,
        scoring='neg_root_mean_squared_error',
        n_jobs=-1, verbose=0,
        random_state=RANDOM_STATE
    )

    print("  [Step 1/2] RandomizedSearchCV coarse tuning ...")
    t0 = time.time()
    rand_search.fit(X_train, y_train,
                    eval_set=[(X_val, y_val)],
                    verbose=False)
    elapsed = time.time() - t0
    print(f"  Best CV RMSE (coarse): {-rand_search.best_score_:.2f}  [{elapsed:.1f}s]")
    print(f"  Best params (coarse) :\n  {rand_search.best_params_}")

    # Step 2: Fine-tune around best params
    bp = rand_search.best_params_
    fine_grid = {
        'n_estimators'     : [max(100, bp['n_estimators'] - 100), bp['n_estimators'],
                               bp['n_estimators'] + 100],
        'max_depth'        : [max(2, bp['max_depth'] - 1), bp['max_depth'],
                               bp['max_depth'] + 1],
        'learning_rate'    : [bp['learning_rate'] * 0.5, bp['learning_rate'],
                               bp['learning_rate'] * 1.5],
        'subsample'        : [bp['subsample']],
        'colsample_bytree' : [bp['colsample_bytree']],
        'min_child_weight' : [bp['min_child_weight']],
        'gamma'            : [bp['gamma']],
        'reg_alpha'        : [bp['reg_alpha']],
        'reg_lambda'       : [bp['reg_lambda']],
    }

    print("  [Step 2/2] GridSearchCV fine tuning ...")
    t1 = time.time()
    fine_xgb = XGBRegressor(
        objective='reg:squarederror',
        random_state=RANDOM_STATE,
        tree_method='hist',
        n_jobs=-1,
        verbosity=0
    )
    fine_search = GridSearchCV(
        fine_xgb, fine_grid, cv=cv,
        scoring='neg_root_mean_squared_error',
        n_jobs=-1, verbose=0
    )
    fine_search.fit(X_train, y_train,
                    eval_set=[(X_val, y_val)],
                    verbose=False)
    elapsed2 = time.time() - t1
    print(f"  Best CV RMSE (fine)   : {-fine_search.best_score_:.2f}  [{elapsed2:.1f}s]")
    print(f"  Best params (fine)   :\n  {fine_search.best_params_}")

    best_xgb_reg = fine_search.best_estimator_
    evaluate_regression(best_xgb_reg, X_val, y_val, X_test, y_test, "XGBoost Reg")

    # Feature importance
    feat_imp = pd.Series(
        best_xgb_reg.feature_importances_,
        index=X_train.columns
    ).sort_values(ascending=False)
    print("\n  Top 10 Feature Importances:")
    print(feat_imp.head(10).to_string())

    # Save
    model_path = os.path.join(OUTPUT_DIR, "xgboost_regressor_credit_score.joblib")
    joblib.dump(best_xgb_reg, model_path)
    print(f"\n  Model saved → {model_path}")

    return best_xgb_reg


# ─────────────────────────────────────────────────────────────────────────────
# SECTION 4 — CLASSIFICATION MODELS
# ─────────────────────────────────────────────────────────────────────────────

def evaluate_classification(model, X_val, y_val, X_test, y_test, name: str):
    """Print classification metrics on val and test sets."""
    for split_name, X_s, y_s in [("Val", X_val, y_val), ("Test", X_test, y_test)]:
        preds      = model.predict(X_s)
        proba      = model.predict_proba(X_s)[:, 1]
        acc        = accuracy_score(y_s, preds)
        auc        = roc_auc_score(y_s, proba)
        f1         = f1_score(y_s, preds)
        precision  = precision_score(y_s, preds)
        recall     = recall_score(y_s, preds)
        print(f"  [{name}] {split_name} — "
              f"Acc: {acc:.4f} | AUC: {auc:.4f} | "
              f"F1: {f1:.4f} | Prec: {precision:.4f} | Rec: {recall:.4f}")

    # Full test report
    preds_test = model.predict(X_test)
    print(f"\n  [{name}] Full Classification Report (Test Set):")
    print(classification_report(y_test, preds_test,
                                 target_names=['Not Creditworthy', 'Creditworthy']))


# ── 4A. Logistic Regression ────────────────────────────────────────────────────

def train_logistic_regression(X_train, y_train, X_val, y_val, X_test, y_test):
    print("\n" + "="*60)
    print("  4A. LOGISTIC REGRESSION — Creditworthiness Classification")
    print("="*60)

    pipeline = Pipeline([
        ('scaler', StandardScaler()),
        ('model', LogisticRegression(max_iter=2000, random_state=RANDOM_STATE))
    ])

    param_grid = {
        'model__C'        : [0.001, 0.01, 0.1, 0.5, 1.0, 5.0, 10.0, 50.0, 100.0],
        'model__penalty'  : ['l2'],
        'model__solver'   : ['lbfgs', 'saga'],
        'model__class_weight': [None, 'balanced'],
    }

    skf = StratifiedKFold(n_splits=N_CV_FOLDS, shuffle=True, random_state=RANDOM_STATE)
    grid_search = GridSearchCV(
        pipeline, param_grid, cv=skf,
        scoring='roc_auc',
        n_jobs=-1, verbose=0
    )

    t0 = time.time()
    grid_search.fit(X_train, y_train)
    elapsed = time.time() - t0

    best_lr = grid_search.best_estimator_
    print(f"  Best params   : {grid_search.best_params_}")
    print(f"  CV AUC (train): {grid_search.best_score_:.4f}")
    print(f"  Training time : {elapsed:.1f}s")
    evaluate_classification(best_lr, X_val, y_val, X_test, y_test, "LogReg")

    model_path = os.path.join(OUTPUT_DIR, "logistic_regression_creditworthy.joblib")
    joblib.dump(best_lr, model_path)
    print(f"  Model saved → {model_path}")

    return best_lr


# ── 4B. XGBoost Classifier ────────────────────────────────────────────────────

def train_xgboost_classifier(X_train, y_train, X_val, y_val, X_test, y_test):
    print("\n" + "="*60)
    print("  4B. XGBOOST CLASSIFIER — Creditworthiness Classification")
    print("="*60)

    # Compute scale_pos_weight for class imbalance
    neg = (y_train == 0).sum()
    pos = (y_train == 1).sum()
    spw = round(neg / pos, 3)
    print(f"  Class balance — Pos: {pos:,} | Neg: {neg:,} | scale_pos_weight: {spw}")

    param_dist = {
        'n_estimators'     : [200, 400, 600, 800],
        'max_depth'        : [3, 4, 5, 6],
        'learning_rate'    : [0.01, 0.03, 0.05, 0.1, 0.15],
        'subsample'        : [0.6, 0.7, 0.8, 0.9],
        'colsample_bytree' : [0.5, 0.6, 0.7, 0.8, 1.0],
        'min_child_weight' : [1, 3, 5],
        'gamma'            : [0, 0.1, 0.2, 0.3],
        'reg_alpha'        : [0, 0.01, 0.1, 1.0],
        'reg_lambda'       : [1.0, 2.0, 5.0],
        'scale_pos_weight' : [1, spw],
    }

    base_clf = XGBClassifier(
        objective='binary:logistic',
        eval_metric='auc',
        random_state=RANDOM_STATE,
        tree_method='hist',
        n_jobs=-1,
        verbosity=0,
        use_label_encoder=False
    )

    skf = StratifiedKFold(n_splits=N_CV_FOLDS, shuffle=True, random_state=RANDOM_STATE)

    print("  [Step 1/2] RandomizedSearchCV coarse tuning ...")
    t0 = time.time()
    rand_clf = RandomizedSearchCV(
        base_clf, param_dist,
        n_iter=N_ITER_RANDOM, cv=skf,
        scoring='roc_auc',
        n_jobs=-1, verbose=0,
        random_state=RANDOM_STATE
    )
    rand_clf.fit(X_train, y_train,
                 eval_set=[(X_val, y_val)],
                 verbose=False)
    elapsed = time.time() - t0
    print(f"  Best CV AUC (coarse): {rand_clf.best_score_:.4f}  [{elapsed:.1f}s]")
    print(f"  Best params (coarse):\n  {rand_clf.best_params_}")

    # Fine tuning
    bp = rand_clf.best_params_
    fine_grid = {
        'n_estimators'     : [max(100, bp['n_estimators'] - 100), bp['n_estimators'],
                               bp['n_estimators'] + 100],
        'max_depth'        : [max(2, bp['max_depth'] - 1), bp['max_depth'],
                               bp['max_depth'] + 1],
        'learning_rate'    : [round(bp['learning_rate'] * 0.7, 4), bp['learning_rate'],
                               round(bp['learning_rate'] * 1.3, 4)],
        'subsample'        : [bp['subsample']],
        'colsample_bytree' : [bp['colsample_bytree']],
        'min_child_weight' : [bp['min_child_weight']],
        'gamma'            : [bp['gamma']],
        'reg_alpha'        : [bp['reg_alpha']],
        'reg_lambda'       : [bp['reg_lambda']],
        'scale_pos_weight' : [bp['scale_pos_weight']],
    }

    print("  [Step 2/2] GridSearchCV fine tuning ...")
    t1 = time.time()
    fine_clf = XGBClassifier(
        objective='binary:logistic',
        eval_metric='auc',
        random_state=RANDOM_STATE,
        tree_method='hist',
        n_jobs=-1,
        verbosity=0,
        use_label_encoder=False
    )
    fine_search = GridSearchCV(
        fine_clf, fine_grid, cv=skf,
        scoring='roc_auc',
        n_jobs=-1, verbose=0
    )
    fine_search.fit(X_train, y_train,
                    eval_set=[(X_val, y_val)],
                    verbose=False)
    elapsed2 = time.time() - t1
    print(f"  Best CV AUC (fine)  : {fine_search.best_score_:.4f}  [{elapsed2:.1f}s]")
    print(f"  Best params (fine)  :\n  {fine_search.best_params_}")

    best_xgb_clf = fine_search.best_estimator_
    evaluate_classification(best_xgb_clf, X_val, y_val, X_test, y_test, "XGBoost Clf")

    # Feature importance
    feat_imp = pd.Series(
        best_xgb_clf.feature_importances_,
        index=X_train.columns
    ).sort_values(ascending=False)
    print("\n  Top 10 Feature Importances (Classifier):")
    print(feat_imp.head(10).to_string())

    model_path = os.path.join(OUTPUT_DIR, "xgboost_classifier_creditworthy.joblib")
    joblib.dump(best_xgb_clf, model_path)
    print(f"\n  Model saved → {model_path}")

    return best_xgb_clf


# ─────────────────────────────────────────────────────────────────────────────
# SECTION 5 — DEPLOYMENT HELPERS
# ─────────────────────────────────────────────────────────────────────────────

def save_feature_metadata(feature_cols: list, output_dir: str):
    """Save the ordered list of features needed at inference time."""
    meta_path = os.path.join(output_dir, "feature_columns.txt")
    with open(meta_path, "w") as f:
        f.write("\n".join(feature_cols))
    print(f"\n  Feature metadata saved → {meta_path}")


def predict_credit_score(model, raw_input: dict) -> float:
    """
    Deployment inference helper — Regression.
    raw_input: dict of feature_name → value (before scaling)
    """
    feat_path = os.path.join(OUTPUT_DIR, "feature_columns.txt")
    with open(feat_path) as f:
        feature_cols = f.read().splitlines()
    X = pd.DataFrame([raw_input])[feature_cols]
    return float(model.predict(X)[0])


def predict_creditworthy(model, raw_input: dict) -> dict:
    """
    Deployment inference helper — Classification.
    Returns dict with 'label' (0/1) and 'probability'.
    """
    feat_path = os.path.join(OUTPUT_DIR, "feature_columns.txt")
    with open(feat_path) as f:
        feature_cols = f.read().splitlines()
    X = pd.DataFrame([raw_input])[feature_cols]
    label = int(model.predict(X)[0])
    prob  = float(model.predict_proba(X)[0][1])
    return {"creditworthy": label, "probability_creditworthy": round(prob, 4)}


# ─────────────────────────────────────────────────────────────────────────────
# SECTION 6 — MAIN PIPELINE
# ─────────────────────────────────────────────────────────────────────────────

def main():
    print("=" * 60)
    print("  CREDIT VISTA — MODEL TRAINING PIPELINE")
    print("=" * 60)

    # ── Load & prepare ────────────────────────────────────────────────────────
    df = load_and_prepare(DATA_PATH, FALLBACK_PATH)
    df = engineer_features(df)
    print(f"\n[INFO] Dataset loaded. Shape: {df.shape}")

    feature_cols = get_feature_columns(df)
    print(f"[INFO] Features for modeling: {len(feature_cols)}")

    # ── TASK 1: REGRESSION (credit_score) ─────────────────────────────────────
    print("\n" + "█" * 60)
    print("  TASK 1 — REGRESSION: Predicting Credit Score")
    print("█" * 60)

    X_tr_r, X_val_r, X_te_r, y_tr_r, y_val_r, y_te_r = prepare_splits(
        df, target='credit_score', stratify=False
    )

    ridge_model   = train_ridge_regression(X_tr_r, y_tr_r, X_val_r, y_val_r, X_te_r, y_te_r)
    xgb_reg_model = train_xgboost_regressor(X_tr_r, y_tr_r, X_val_r, y_val_r, X_te_r, y_te_r)

    # ── TASK 2: CLASSIFICATION (creditworthy) ──────────────────────────────────
    print("\n" + "█" * 60)
    print("  TASK 2 — CLASSIFICATION: Predicting Creditworthiness")
    print("█" * 60)

    X_tr_c, X_val_c, X_te_c, y_tr_c, y_val_c, y_te_c = prepare_splits(
        df, target='creditworthy', stratify=True
    )

    lr_model      = train_logistic_regression(X_tr_c, y_tr_c, X_val_c, y_val_c, X_te_c, y_te_c)
    xgb_clf_model = train_xgboost_classifier(X_tr_c, y_tr_c, X_val_c, y_val_c, X_te_c, y_te_c)

    # ── Save feature metadata for deployment ──────────────────────────────────
    save_feature_metadata(feature_cols, OUTPUT_DIR)

    # ── Final summary ─────────────────────────────────────────────────────────
    print("\n" + "=" * 60)
    print("  TRAINING COMPLETE — SAVED MODELS")
    print("=" * 60)
    for fname in sorted(os.listdir(OUTPUT_DIR)):
        fpath = os.path.join(OUTPUT_DIR, fname)
        size  = os.path.getsize(fpath) / 1024
        print(f"  • {fname:<50s}  {size:>8.1f} KB")

    print("\n[USAGE EXAMPLE — Inference]")
    print("""
  import joblib, pandas as pd

  # Load models
  xgb_reg = joblib.load("models/xgboost_regressor_credit_score.joblib")
  xgb_clf = joblib.load("models/xgboost_classifier_creditworthy.joblib")

  # Prepare a single user's features as a dict
  user = {
      'age': 32, 'gender': 0, 'employment_type': 1, 'city_tier': 1,
      'education': 2, 'dependents': 1, 'declared_monthly_income': 45000,
      'income_regularity': 0.85, 'savings_ratio': 0.20,
      'monthly_expenses': 30000, 'spending_discipline': 0.75,
      'grocery_spend_variance': 0.22, 'upi_txn_count_monthly': 45,
      'avg_upi_txn_amount': 500, 'cash_dependency': 0.10,
      'mobile_recharge_consistency': 0.95, 'bill_payment_streak': 10,
      'bill_payment_score': 10, 'rent_payment_on_time': 1,
      'utility_payment_regularity': 0.88, 'has_loan': 0,
      'emi_burden_ratio': 0.0, 'num_active_loans': 0,
      'default_history': 0, 'job_tenure_years': 4.5,
      'job_changes_5yr': 1, 'has_social_security': 1,
      'tax_filing': 1, 'has_pan': 1,
      'payment_consistency': 0.90, 'financial_discipline_index': 0.65,
      'digital_engagement_score': 0.72,
      # Engineered features
      'income_expense_ratio': 45000/30001, 'net_savings_monthly': 9000,
      'loan_stress_score': 0.0, 'payment_reliability': 0.93,
      'stability_index': 4.5/2, 'digital_trust_score': 0.648,
      'age_income_interaction': 32*45000/1e6,
  }

  score = predict_credit_score(xgb_reg, user)
  result = predict_creditworthy(xgb_clf, user)
  print(f"Predicted Credit Score : {score:.0f}")
  print(f"Creditworthy           : {result}")
    """)
    print("=" * 60)


# ─────────────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    main()
