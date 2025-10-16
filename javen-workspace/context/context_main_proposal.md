
## CHAPTER 1: BACKGROUND

Indonesia, the sixth most populous country in the world, carries a heavy respiratory
health burden due to worsening air quality, rapid urbanization, and unequal access to
healthcare. Acute Respiratory Infections (ISPA) are among the most common and
persistent diseases, consistently ranking as one of the top reported illnesses nationwide.

**_Figure 1_**_. 2024-2025 ISPA Cases in Indonesia from Various Cities_
.
ISPA refers to an acute infection affecting one or more parts of the respiratory tract, from
the nose to the alveoli. Sometimes it involves related structures such as the sinuses,
middle ear cavity, and pleura. The condition typically lasts up to 14 days and can involve
both the upper and lower respiratory tracts.

In 2023, the national prevalence of ISPA was recorded at 9.3%, or approximately 26
million Indonesians affected at any given time. The highest incidence occurred in
children aged 1–4 years (13.7%), making them the most vulnerable group (Ministry of
Health, 2023). Regional reports also show significant variation, such as Bali where
certain districts like Buleleng and Kuta reported the highest prevalence.

The burden extends beyond health. Respiratory illnesses generate over 1.1 million
outpatient cases and contribute to more than Rp13 trillion annually in inpatient claims for
BPJS Health. Yet access to care remains uneven: Indonesia has ~17,500 registered
community health centers (puskesmas), many of which lack complete medical staff,
while hospitals (~3,200 nationwide) face chronic overcrowding in urban areas.


```
Figure 2. Trends In Density of Medical Doctors, Nurses, and Midwives (WHO, 2023)
```
These challenges are compounded by self-diagnosis and self-medication, which often
result in antibiotic misuse and delayed treatment. Mild cases flood hospitals while severe
cases arrive late, straining clinical capacity and escalating costs.

At the same time, Indonesia’s 79.5% internet penetration (APJII, 2024) and over 112
million WhatsApp users present a unique opportunity for digital health innovation. By
leveraging these accessible platforms, digital triage and guided care can expand reach to
underserved communities and optimize the healthcare system

. **_Figure 3_**_. Chat Media Trends in 2024 (APJII, 2024)_


This is where Breathy comes in: an AI-powered companion that integrates sputum and
throat image analysis, conversational triage, and doctor verification into a structured care
pathway. Breathy has the potential to reduce unnecessary hospital visits, improve early
detection, optimize BPJS costs, and support antibiotic stewardship, making ISPA care
more inclusive, efficient, and effective for all Indonesians.

In short, ISPA is not only a persistent health problem but also a systemic challenge that
requires innovative, scalable, and inclusive digital solutions. Breathy aims to transform
this landscape by integrating healthcare accessibility, cost-efficiency, and preventive
public health measures into a single, easy-to-use platform.


## CHAPTER 2: INTRODUCING, BREATHY!

In alignment of our concern of ISPA in Indonesia, We are proud to introduce Breathy!
Breathy is an AI-powered digital health companion for respiratory infections (ISPA),
accessible through both WhatsApp and the web. It is designed to reach every layer of
society and make democratizes predictive ISPA care across Indonesia. By leveraging
platforms that are already embedded in our daily life, Breathy eliminates the barriers of
access that ensures even remote and underserved communities can connect to timely
respiratory healthcare.

### 1.1 From Interaction to Insight and Care

```
Figure 4. Breathy Usage Demo
```
The experience begins simply when a user or caregiver starts a chat with breathy, answer
short guided questions, and uploads supporting photos such the throat or sputum,From
there, Breathy’s AI analyzes both image and symptom inputs as a preprocessing step to
pre-diagnose the user’s conditions and classify severity into mild, moderate, or severe.


```
Figure 5. Breathy System Flow
```
It moves seamlessly to a doctor’s dashboard where the information is presented in a
structured and digestible format for the doctors to symptoms, preliminary severity
assessment, and AI diagnosis. Here, doctors act as the human-in-the-loop, validating the
case, adjusting the assessment if needed, and deciding on a safe referral pathway. Based
on their decision, Breathy guides the user to the right next step. Which are structured
self-care with monitoring from Breathy, referral to a pharmacy, or immediate hospital
attention.

All records are synchronized with the web portal, so users can log in with their number to
track their care journey. To ensure continuity, Breathy follows up daily until the user
reports recovery, while mapping features direct urgent cases to the nearest facilities. This
combination of automation, doctor verification, structured referrals, and follow-up care
ensures that ISPA management becomes accessible, affordable, and inclusive for
everyone.

### 1.2 Features and Innovation at the Heart of Breathy

Breathy is not your average telemedicine service that ends with video calls or static
symptom chats hidden behind paywalls. It is a complete ISPA care companion where
conversational triage is only one component within a fully integrated pathway that spans


automated screening, clinician verification, structured referrals, and continuous daily
follow up. At its core lies an AI preprocessing engine that transforms multimodal input
into structured clinical signals before a doctor ever reviews the case. This front-loading of
analysis enables scale without compromising safety, because every case still passes
through a human-in-the-loop verification stage. These innovations come to life through a
set of tightly integrated features that together make Breathy a true digital health
companion;

#### 1.2.1 Conversational Triage Bot
Breathy’s triage starts with a conversational bot on WhatsApp and the web that drives the dialogue step by step. Instead of passive forms, it asks targeted questions, adapts in real time, and collects text, and images with intent recognition ensuring clinical precision.
```
Figure 6. Breathy's Internal Triage Process
```
This active, adaptive flow makes the interaction effortless for users while generating structured, high-quality data for the AI engine. This means:
- The bot understands context, so a mention of “difficulty breathing” triggers follow-up on frequency and severity rather than generic questions.
- Each reply shapes the next prompt, guiding a cough case differently from a throat photo submission.

#### 1.2.3 Image Analysis for Early Detection

Photos of throat or sputum are processed through a vision pipeline that enhances
quality, isolates regions of interest, and applies convolutional models trained to
detect inflammation and exudate. The system outputs confidence-scored findings
with visual heatmaps, turning ordinary phone images into actionable clinical
signals. By embedding explainability and error checks, Breathy brings diagnostic
rigor that ordinary telemedicine lacks.

```
Figure 7. Image Analysis Example: Blood Stained Sputunm
```
#### 1.2.4 Symptom NLU (Natural Language Understanding)


```
Figure 8. NLU Illustration
```
Breathy’s NLU engine converts conversational input into structured medical
variables such as symptom duration, fever patterns, dyspnea, and comorbidities. It
distinguishes subtle differences in phrasing, normalizes entities, and produces
interoperable profiles that feed directly into triage. This creates a clinically
reliable record without forcing users through rigid questionnaires.

#### 1.2.5 Doctor Verification Dashboard

Doctors review AI-preprocessed cases on a dashboard that summarizes key
entities, severity predictions, heatmaps, and confidence levels. They can approve,
adjust, or escalate with full traceability, supported by audit logs and batch
workflows. This structure allows high-volume supervision without sacrificing
accountability or clinical rigor.

#### 1.2.6 Referral Orchestration with Geolocation Awareness

When escalation is needed, Breathy automatically generates structured referrals to
pharmacies or hospitals based on patient location and partner availability. Referral
notes carry clinical context so facilities receive patients with actionable
information. This transforms referrals from a manual afterthought into a seamless
extension of the care pathway.

- The system identifies the closest pharmacy or hospital within the partner network; users are directed to facilities that are nearby and appropriate.
- Each referral is auto-populated with doctor-approved AI-preprocessed data (symptom history, image findings, severity classification), giving receiving facilities a heads up.
#### 1.2.7 Patient Follow-Up Engine

Breathy sustains care with automated daily check-ins tailored to triage level. Mild
cases receive reminders, moderate cases trigger escalation checks, and severe
cases prompt high-frequency monitoring.


```
Figure 9. Patient Daily Care for Mild Cases
```
User responses are parsed in real time, and deterioration is flagged instantly. This ensures continuity until recovery, embedding long‑term care where telemedicine usually stops.
### 1.3 Development Approach and Methodology

Breathy’s development pathway is structured to deliver a clinically validated MVP
through rapid iteration, ethical data practices, and embedded safety mechanisms. The
approach leverages agile sprints, cloud-native integration with Azure services, and
continuous doctor-in-the-loop validation so that technical progress and clinical oversight
evolve in lockstep. The aim is to create not just a prototype but a scalable digital health
companion with measurable performance targets and auditable safety controls.

#### 1.3.1 Agile development approach
Breathy will be developed using an Agile methodology that emphasizes flexibility and continuous feedback. Work will be organized in sprints within Q1-Q2, with each sprint starting from a clear product backlog and ending with a tangible increment that can be reviewed together with stakeholders. Acceptance criteria will be set in advance so

that every feature delivered is measurable and aligned with user needs. Sprint
reviews will not only test functionality but also invite feedback from doctors to
ensure that clinical perspectives directly shape priorities. By iterating in short
cycles, the team can quickly adapt to changing requirements, refine the user
experience, and keep development closely aligned with the realities of healthcare
practice.

##### Stage 1 - Plan
- _Needs analysis_ : Map ISPA challenges such as late diagnosis,
    uneven access, and weak follow-up.
- _Goal settin_ g: Align objectives with national health priorities (early
    detection, reduced hospital load, inclusivity).
- _Backlog creation_ : Define and rank core features such as triage bot,
    AI preprocessing, doctor dashboard, referral engine, follow-up
    system.
##### Stage 2 - Design
- _System modeling_ : Flowcharts of data from WhatsApp input to AI
inference and doctor verification.
- _Database design_ : PostgreSQL for structured cases, encrypted Blob
Storage for images.
- _Interface wireframes_ : Conversation flows and dashboard mockups
validated by clinicians for usability and speed.
##### Stage 3 - Develop
- _Module build_ : Core components (bot, preprocessing, inference)
implemented as microservices.
- _System integration_ : API gateway and orchestration to connect
modules into a functional pipeline.
- _MVP delivery_ : End-to-end workflow tested FROM user input, AI
triage, doctor verification, referral issued.

### 1.4 Data collection plan and ethical safeguards

Since no large-scale ISPA dataset exists, Breathy begins with a Phase 0 consent
pilot. Users provide explicit consent through the bot interface using informed


consent scripts, which are logged digitally before any data capture. Collected
throat and sputum images, along with structured symptom responses, will be
encrypted in transit using TLS and stored in Azure Blob Storage with
Role-Based Access Control (RBAC). Personally Identifiable Information (PII)
and Protected Health Information (PHI) are stripped during ingestion, leaving
only anonymized datasets for training.


## CHAPTER 3: TECHNOLOGY & IMPLEMENTATION

Breathy’s technology layer is designed to be both robust and lean, capable of scaling
across Indonesia while staying safe, auditable, and user-friendly. The architecture is
hosted on Azure, with clear pipelines for data, AI inference, clinical verification, and
operational monitoring.

### 3.1 System Architecture

Breathy operates through a robust architecture hosted on Azure, where each component is
optimized for modularity and scalability. A user begins by chatting through WhatsApp,
powered by Azure Communication Services. Messages and images are handled by an
ingestion service, passed into a queue, and routed through preprocessing before AI
inference occurs.

```
Figure 11. Breathy Complete System Architecture
```
The inference layer combines computer vision and natural language models to produce a
severity classification. These results are consumed by the triage engine and surfaced on a
web-based doctor dashboard. All metadata is stored in Azure PostgreSQL, while
encrypted media is saved in Azure Blob Storage. Notifications return to the user through
the bot, closing the loop.


```
Component | Technology | Usage / Function
Chat Interface | Azure Communication Services (WA) | Ingest messages and media
AI Inference | Azure Copilot Studio; Azure Cognitive Services | Image + NLU model inference; Image Analysis
Database | Azure PostgreSQL | Case and metadata storage
Blob Storage | Azure Blob Storage | Photo storage
Dashboard | Next.js | Doctor verification interface and user chatbot interface
Workflow Orchestration | Node.js backend | Direct coordination without external message bus
Monitoring | Azure Monitor | Monitor the application
Figure 12. Table Technology Specification
```
### 3.2 Breathy Data Pipeline

Breathy processes three types of user inputs, which are free-text responses, structured
responses, and image uploads. A data pipeline transforms these raw inputs into valid
clinical signals while maintaining quality and security. The pipeline ensures that each
interaction can be processed, stored, and retrieved for chatbot functions and doctor
dashboards. All inputs are first captured as raw data and directed to different pathways as
follows;

```
Figure 13. Input Processing Diagram
```
```
● The text pipeline with Copilot Studio converts natural language into structured
variables. User entries describing symptoms, duration, fever, or comorbidities are
parsed with Natural Language Understanding. Values are normalized, such as
“three days” to onset_days = 3, and mapped into a case schema. The structured
```

```
dataset is stored in Azure PostgreSQL for querying, aggregation, and workflow
routing
● The image pipeline with Cognitive Services processes throat and sputum photos.
Each file is checked for blur, brightness, and aspect ratio.
○ Failed images trigger an automated resubmission request from breathy
○ Valid images are cropped, enhanced, and analyzed to extract features and
generate heatmaps with confidence scores.
Results are stored in Azure Blob Storage with role-based access control and
metadata linking
```
All validated outputs are stored under a unique case ID, with text data in Azure
PostgreSQL and encrypted images in Blob Storage. **Breathy AI can retrieve them
anytime via APIs** , combining structured fields and image metadata into one record. This
design ensures secure multimodal storage, real-time access, and scalable delivery of
insights to doctors and patients.

**3.3 Artificial Intelligence Screening Workflow**

```
3.3.1 Image Inference
Image inference in Breathy relies on automated quality control followed by
clinical feature extraction. Azure Cognitive Services first ensures image clarity,
brightness, and region-of-interest validity. Once validated, vision models detect
clinical markers in either throat photos or sputum photos. Each marker carries a
calibrated weight that contributes to an overall Image Severity Score (Sᵢ), where;
```
```
and the result is normalized to a 0–1 range. Below are the examples that we use
with Breathy
```

```
Figure 14. Throat Image and Corresponding Weight Example
```
```
Marker Description Weight (wᵢ) Severity
Greenish/yellow color Indicates purulent
infection (likely
bacterial)
```
```
0.40 Strong indicator
```
```
Bloody streaks Possible severe infection
or complications
```
```
0.30 Moderate–strong
indicator
Thick/viscous sputum Suggests ongoing airway
inflammation
```
```
0.20 Mild–moderate
indicator
Clear/normal sputum Minimal clinical concern 0.10 Low severity,
baseline
Figure 15. Sputum Clolor and Corresponding Weight Example
```
```
3.3.2 Symptom Inference
Text-based inputs are processed through Microsoft Copilot Studio with NLU and
entity extraction. Responses are normalized into structured variables such as fever
status, cough duration, shortness of breath, and comorbidity presence. Each
extracted entity contributes a weighted score to a Symptom Severity Score (S),
where
```
Below are the **examples.**


```
Symptom Normalized Variable
Example
```
```
Weight (w) Contribution to
Severity
Fever ≥ 38°C fever_status = high 0.30 Strong indicator
Cough > 3 days onset_days > 3 0.20 Moderate
indicator
Shortness of breath dyspnea = true 0.35 Strong indicator
```
```
Comorbidities comorbidity = 1 0.15 Mild–moderate
indicator
Figure 16. Symptoms and Corresponding Weight Example
```
**3.3.3 Ensemble Triage**

Breathy fuses results from both pathways to produce a unified Severity Score (S).
The system assigns greater weight to image-based findings while still
incorporating text signals, using the formula;

Which is then mapped into thresholds for classification:

```
Classification Severity (S) Thresholds
Mild S < 0.
Moderate 0.4 ≤ S ≤ 0.
Severe .≥ 0.
Figure 17. Patient’s Condition Classification
```
Please note that all formulas provided are intended solely for AI screening and
triage support. The computed severity scores are designed to guide prioritization
and workflow efficiency, but the **final clinical decision always rests with the
verifying doctor.**


## CHAPTER 4: PROTOTYPE

**4.1 Patient’s Whatsapp Breathy Bot**

Patients can consult about what they are feeling, especially if they have the main
symptoms mentioned, and have an abnormal phlegm color using Breathy’s Whatsapp
Bot!

```
Figure 18. Breathy’s Whatsapp Chat Bot
```

**4.2 Patient’s Website**

Patients can also consult about what they are feeling using Breathy’s Website Chat Bot!
First, they have to sign in and login using their Whatsapp number to ensure connectivity
and consistently between Breathy’s Whatsapp Chatbot History Data and Breathy’s
Website Chat Bot History Data.

```
Figure 19. Breathy’s Website Landing Page
```
```
Figure 20. Breathy’s RegisterPage
```

```
Figure 21. Breathy’s Login Page
```
**_Figure 22_**_. Breathy’s Chat Bot Page_


```
Figure 23. Breathy’s Chat Bot Page(2)
```
**_Figure 24_**_. Breathy’s Personalization Page_


**4.2 Doctor’s Dashboard**

Doctors will monitor patients using Doctor’s Dashboard where they receive several
detailed information about the result of Breathy’s AI Analysis. They can verify the
results, or even clarify the diagnosis and send it to the user!

```
Figure 25. Doctor Dashboard
```
**4.3 Hospital’s Dashboard**

Hospitals can also see patient data and doctor’s feedback. They can monitor how many
urgent patients to prepare for the worst condition.

```
Figure 25. Hospital Dashboard
```

## CHAPTER 5: VALIDATION

We conducted a survey to validate both the technical feasibility of Breathy and the
market readiness among potential users and healthcare stakeholders. The validation
aimed to assess three key aspects:

1. Exploring user needs in relation to real ISPA conditions.
2. Exploring the solution approach to understand the readiness of society.
3. Exploring user feedback regarding Breathy as a digital health companion.

**5.1 Exploring user needs in relation to real ISPA conditions**

The survey results indicate that 83.3% of users reported frequently experiencing
ISPA-related symptoms.

```
Figure 26. User’s Frequent Exp eriencing ISPA-related symptoms
```
They often use telemedicine and search online due to long queues, distant hospitals, and
high costs. They also find it difficult to distinguish between mild and severe ISPA
symptoms. 90% of them use self-medication and find existing telemedicine platforms
insufficient for ISPA-related needs. User expect new innovation for rarely detection and
clear guidance on initial ISPA symptoms. They also want a fast, accurate diagnosis and
timely medical response, especially for communities in remote areas with limited access
to healthcare facilities.

**5.2 Exploring the solution approach to understand the readiness of society**

We also assessed their readiness to use WhatsApp as our main product. About 60%
expressed interest in accessing telemedicine through WhatsApp or the web. Most


respondents agreed that doctors should verify and take responsibility for the AI analysis
results before the system delivers a final diagnosis. They also indicated that they are
comfortable uploading throat or sputum photos to the system for AI analysis.

```
Figure 27. Chosen Breathy’s Feature Data
```
Most respondents found the chatbot for symptom checking (56.7%), doctor dashboard
verification (50%), referral features (46.7%), and AI photo analysis (43.3%) as the most
helpful. Meanwhile, follow-up care (13.3%) were seen as additional but less prioritized
features.

Respondents expect the innovation to be trusted and useful by emphasizing the
importance of data privacy and security, accurate and credible medical information,
simplicity and accessibility for all user groups, and validation through collaboration with
doctors and official health institutions, supported by clear socialization to the public.

**5.3 Exploring user feedback regarding Breathy as a digital health companion**

After presenting our prototype, all respondents expressed their willingness to try the final
product. They felt that Breathy is easy to use, both for the general public and elderly
users. A total of 93.3% of respondents believed that Breathy could effectively help
address ISPA issues in 3T (remote, frontier, and underdeveloped) areas, and they stated
that they would recommend it to their family or friends. Furthermore, all respondents
reported feeling more reassured when using Breathy before deciding to consult a doctor,
and they would be willing to adopt it if the cost is more affordable compared to existing


telemedicine services.

## CHAPTER 6: BUSINESS POTENTIAL

**4.1 Business Model Canvas (BMC)**

```
Figure 28. Business Model Canvas
```
**4.2 Timeline**

```
Figure 29. Timeline
```

**4.3 Risk Mitigation**

```
Figure 30. Risk Mitigation
```

## CHAPTER 7: EXPANSION

**6.1 Geographic Expansion**

Breathy is designed to scale nationwide by leveraging existing digital infrastructure. The
initial pilot will focus on high-prevalence provinces (e.g., Bali, East Java, South
Sulawesi) and 3T areas where healthcare access remains limited. Expansion will follow a
phased approach:

```
Year Strategy
1 Coverage: 3–5 pilot districts in high-prevalence regions (Bali, East Java, South
Sulawesi).
User adoption: 5% of local ISPA cases (±50,000 users).
Hospital & pharmacy integration: 10 partner facilities.
KPI: >70% doctor adoption rate on dashboard during pilot.
```
## 2

```
3 Coverage: 30% of provinces (±10 provinces).
User adoption: 10–15% of national ISPA cases (±2.5–3.5 million users).
Hospital & pharmacy integration: 150+ partner facilities.
KPI: 20% reduction in non-urgent hospital visits in partner regions.
4 Coverage: >80% of provinces (nationwide rollout).
User adoption: 30–40% of national ISPA cases (±8–10 million users).
Hospital & pharmacy integration: 500+ facilities nationwide.
KPI: ≥25% reduction in unnecessary BPJS claims for respiratory diseases.
Figure 31. Geography Expansion Strategy
```
This strategy ensures scalability is aligned with epidemiological needs and health system
readiness.

**6.2 Expansion to Other Diseases**

While Breathy focuses on Acute Respiratory Infections (ISPA) as the most urgent public
health challenge, its core technology which are AI-based image analysis, conversational
triage, and doctor verification, can be extended to other conditions. Potential future
expansions include:

1. Tuberculosis (TB): leveraging sputum/throat analysis to support early screening.
2. Asthma and COPD: continuous monitoring of symptoms and exacerbation risks.
3. Dermatological Conditions: image-based triage of skin infections and rashes.
4. Non-Communicable Diseases (NCDs): structured triage for hypertension and
    diabetes in rural areas.


This modular approach allows Breathy to evolve into a comprehensive digital health
ecosystem.

**6.3 Monitoring and Predictive Analytics**

Breathy will not only serve individual patients but also generate anonymized, aggregated
health data. With appropriate privacy safeguards, this data can be used to:

- Real-time ISPA case mapping in >50% pilot districts by Year 2.
- Predictive outbreak alerts with >80% accuracy by Year 3.
- Policy support: Generate quarterly anonymized epidemiology reports for MoH &
    BPJS starting Year 2.

By transforming raw patient interactions into actionable epidemiological insights,
Breathy positions itself as both a care platform and a national health intelligence tool.


## CHAPTER 8: REGULATION

Scaling Breathy requires strict alignment with Indonesia’s health and data protection
regulations. The key areas are:

**7.1 Health Regulations**

- Ministry of Health (Kementerian Kesehatan): Breathy must comply with the
    Sistem Informasi Rumah Sakit (SIRS) and Sistem Informasi Rujukan Terintegrasi
    (SISRUTE) to ensure seamless hospital and referral integration.
- BPJS Health (JKN): Formal partnerships and approval are required to enable cost
    optimization through claim reduction.

**7.2 Data Protection & Privacy**

- UU Perlindungan Data Pribadi (PDP Act, 2022): Breathy must ensure patient
    consent, secure data storage, and restricted access.
- HIPAA-like safeguards: Encryption, anonymization of patient data for aggregated
    reporting, and audit logs for all clinical actions.
- Data residency: Patient health data must be stored within Indonesia, following
    government regulations.

**7.3 Digital Health Certification**

- Telemedicine compliance: Alignment with Permenkes No. 20/2019 regarding
    telemedicine services.
- AI in healthcare guidelines: Adhering to Ministry of Health pilot frameworks for
    AI-based diagnostic support (with human-in-the-loop requirements).
- Device/software registration: Potential certification with the Indonesian FDA
    (BPOM) for AI as a medical device if classification requires.

**7.4 Risk Management and Ethics**

- Ensure transparency of AI decisions with explainability (e.g., heatmaps on
    sputum images).
- Maintain doctor verification as mandatory to mitigate misclassification risks.
- Establish an ethics advisory board with representatives from MoH, BPJS, and
    medical associations.


## CHAPTER 9: CONCLUSION

Breathy addresses one of Indonesia’s most pressing public health challenges, Acute
Respiratory Infections (ISPA), by combining accessible digital platforms with clinically
validated AI support. Through WhatsApp and web-based services, Breathy empowers
users to detect symptoms early, receive guided triage, and access doctor-verified
recommendations, while hospitals and BPJS benefit from reduced strain on resources and
improved efficiency.

Survey validation shows strong readiness and trust among users, with over 90% willing
to adopt Breathy if affordable and safe. The platform is designed with scalability in mind:
starting from high-prevalence provinces and expanding nationwide, while ensuring
compliance with health regulations and data protection laws.

Ultimately, Breathy is more than a telemedicine tool. It is an inclusive digital health
companion that transforms ISPA care into a pathway of prevention, early detection, and
efficient treatment. By bridging gaps between patients, doctors, and healthcare systems,
In one year, Breathy has the potential to not only reduce ISPA burden but also evolve into
a national health intelligence platform supporting broader disease management and public
health resilience.


## APPENDIX [VALIDATION FORM]






]