# 💳 Credit Vista — AI-Powered Alternative Credit Scoring

> “They are not risky — they are invisible.”

**Credit Vista** is an AI-driven platform that generates a **credit score (300–900)** for individuals without traditional credit history by analyzing **behavioral financial data** such as UPI usage, bill payments, income consistency, and spending patterns.

---

## 🚀 Problem

Over **190 million Indians** are **credit-invisible** — they lack CIBIL scores and are denied loans, not because they are risky, but because they are unknown to the system.

Traditional credit systems fail to evaluate:

* Gig workers
* Self-employed individuals
* Rural and tier-2/3 populations

---

## 💡 Solution

Credit Vista replaces traditional credit scoring with **behavioral intelligence**.

Instead of relying on past loans, it:

* Extracts financial signals from **bank statements (PDF/image)**
* Converts them into meaningful behavioral features
* Uses machine learning to generate a **reliable credit score**
* Provides **transparent explanations using SHAP**

---

## ✨ Key Features

* 📄 **Bank Statement Parsing (PDF/Image)**
* 🤖 **ML-Based Credit Score (300–900)**
* 📊 **SHAP Explainability (Why this score?)**
* 📈 **Behavioral Feature Engineering**
* 🔐 **PIN-Based Secure Result Retrieval**
* 💡 **AI-Based Financial Improvement Suggestions**

---

## 🧠 How It Works

1. User enters basic details (name, income, employment type)
2. Uploads bank statement (PDF/image)
3. System extracts transaction data automatically
4. Feature engineering generates behavioral indicators:

   * Income regularity
   * Savings ratio
   * UPI frequency
   * EMI burden
   * Spending discipline
5. ML model predicts:

   * Credit Score (300–900)
   * Risk category
6. SHAP explains:

   * What improved the score
   * What reduced the score
7. Results displayed with insights and recommendations

---

## 🏗️ Architecture

```id="arch1"
User → UI (Streamlit/React) → PDF Parser → Feature Engineering → ML Model → SHAP → Dashboard
```

---

## ⚙️ Tech Stack

### Frontend

* HTML, CSS, JavaScript
* React.js / Streamlit

### Backend

* Python
* Flask / FastAPI

### Machine Learning

* Scikit-learn
* XGBoost
* SHAP (Explainability)
* SMOTE (Imbalance Handling)

### Database

* SQLite3

---

## 📂 Project Structure

```id="struct1"
Credit-Vista/
│
├── app/
│   └── streamlit_app.py
│
├── parser/
│   └── statement_parser.py
│
├── features/
│   └── feature_engineering.py
│
├── model/
│   ├── train_model.py
│   ├── credit_model.pkl
│   └── scaler.pkl
│
├── data/
│   ├── synthetic_data.py
│   └── training_data.csv
│
├── explainability/
│   └── shap_explainer.py
│
├── utils/
│   └── pin_manager.py
│
├── requirements.txt
└── README.md
```

---

## 📊 Model Details

* **Primary Model:** XGBoost Classifier
* **Baseline:** Logistic Regression
* **Evaluation Metrics:** Accuracy, Precision, Recall, AUC
* **Output:**

  * Creditworthiness (0/1)
  * Credit Score (300–900 scale)

---

## 🔍 Explainability (SHAP)

Credit Vista ensures **transparent AI decisions**:

* Feature contribution visualization
* Positive vs negative impact breakdown
* Plain-English explanations

---

## 🔐 Privacy & Security

* Data processed locally (no permanent storage of statements)
* PIN-based retrieval with hashed storage
* Consent-based data usage
* Designed with **RBI explainability expectations in mind**

---

## 📦 Installation

```bash id="install1"
git clone https://github.com/your-username/credit-vista.git
cd credit-vista

pip install -r requirements.txt
```

---

## ▶️ Run the App

```bash id="run1"
streamlit run app/streamlit_app.py
```

---

## 🎯 Use Case

**Example: Gig Worker (Delivery Partner)**

* No credit history
* Regular income via UPI
* Pays bills consistently

➡️ Credit Vista assigns a **high score (e.g., 720)**
➡️ Explains:

* * Strong bill payment consistency
* * High digital transaction usage
* – Moderate EMI burden

---

## 🌍 Impact

* Enables **financial inclusion**
* Supports **Digital India vision**
* Empowers underserved populations
* Helps lenders assess **real risk, not assumed risk**

---

## ⚠️ Limitations

* Uses synthetic dataset (hackathon scope)
* Depends on quality of uploaded statements
* Requires real financial API integration for production

---

## 🔮 Future Scope

* Account Aggregator (AA) integration
* Real-time financial data APIs
* Fraud detection layer
* Mobile application deployment

---

## 👨‍💻 Team

**CODE CRAFTERS**
Lead: Agamjot Singh Sachdeva

---

## 🏆 Tagline

> “We don’t measure credit history.
> We measure financial behavior.”

---
