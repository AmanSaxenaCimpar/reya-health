"""Service catalog and questionnaires mapped from the Reya DTC screenshots."""

FAMILY_CONDITIONS = [
    "Heart disease or heart attack",
    "Stroke",
    "Diabetes",
    "High blood pressure",
    "High cholesterol",
    "Thyroid disease",
    "Kidney disease",
    "Cancer",
    "Blood or clotting disorders",
    "Blood disorders or inherited anemia",
    "Aortic aneurysm",
    "Other",
]

LAB_TESTS = [
    {
        "code": "UACOM",
        "name": "COMPLETE URINALYSIS W/ CULTURE REFLEX",
        "cpt": "81002",
        "location": "Reya Labs",
        "price": 32.0,
        "at_home": True,
        "at_service_center": True,
        "questionnaire_key": "uacom",
    },
    {
        "code": "%A1C",
        "name": "HEMOGLOBIN A1C",
        "cpt": "83036",
        "location": "Reya Labs",
        "price": 31.0,
        "at_home": True,
        "at_service_center": True,
        "questionnaire_key": "a1c",
    },
    {
        "code": "MG",
        "name": "MAGNESIUM",
        "cpt": "83735",
        "location": "Reya Labs",
        "price": 31.0,
        "at_home": True,
        "at_service_center": True,
        "questionnaire_key": "magnesium",
    },
    {
        "code": "PHOS",
        "name": "PHOSPHOROUS",
        "cpt": "84100",
        "location": "Reya Labs",
        "price": 9.0,
        "at_home": True,
        "at_service_center": True,
        "questionnaire_key": "phosphorus",
    },
    {
        "code": "TSH",
        "name": "TSH",
        "cpt": "84443",
        "location": "Reya Labs",
        "price": 34.0,
        "at_home": True,
        "at_service_center": True,
        "questionnaire_key": "thyroid",
    },
    {
        "code": "TVITD",
        "name": "VITAMIN D TOTAL",
        "cpt": "0038U",
        "location": "Reya Labs",
        "price": 59.0,
        "at_home": True,
        "at_service_center": True,
        "questionnaire_key": "vitamin_d",
    },
    {
        "code": "BMP",
        "name": "BASIC METABOLIC PANEL",
        "cpt": "80048",
        "location": "Reya Labs",
        "price": 17.0,
        "at_home": True,
        "at_service_center": True,
        "questionnaire_key": "bmp",
    },
    {
        "code": "CBCWA",
        "name": "CBC WITH PLATELET AND AUTO DIFFERENTIAL",
        "cpt": "85025",
        "location": "Reya Labs",
        "price": 23.0,
        "at_home": True,
        "at_service_center": True,
        "questionnaire_key": "cbc",
    },
    {
        "code": "CMP",
        "name": "COMPREHENSIVE METABOLIC PANEL",
        "cpt": "80053",
        "location": "Reya Labs",
        "price": 39.0,
        "at_home": True,
        "at_service_center": True,
        "questionnaire_key": "cmp",
    },
    {
        "code": "LPDP",
        "name": "LIPID PROFILE PANEL",
        "cpt": "80061",
        "location": "Reya Labs",
        "price": 47.0,
        "at_home": True,
        "at_service_center": True,
        "questionnaire_key": "lipid",
    },
]

IMAGING_TESTS = [
    {
        "code": "71045",
        "name": "XRAY CHEST (1 VIEW)",
        "cpt": "71045",
        "category": "XRAY",
        "price": 40.0,
        "setup_fee": 70.0,
        "questionnaire_key": "chest_xray",
    },
    {
        "code": "72080",
        "name": "XRAY THORACOLUMBAR (MIN 2 VIEWS)",
        "cpt": "72080",
        "category": "XRAY",
        "price": 55.0,
        "setup_fee": 70.0,
        "questionnaire_key": "msk_xray",
    },
    {
        "code": "72170",
        "name": "XRAY PELVIS (1 VIEW)",
        "cpt": "72170",
        "category": "XRAY",
        "price": 44.0,
        "setup_fee": 70.0,
        "questionnaire_key": "msk_xray",
    },
    {
        "code": "73030",
        "name": "XRAY SHOULDER (2+ VIEWS)",
        "cpt": "73030",
        "category": "XRAY",
        "price": 56.0,
        "setup_fee": 70.0,
        "questionnaire_key": "msk_xray",
    },
    {
        "code": "73090",
        "name": "XRAY FOREARM (2 VIEWS)",
        "cpt": "73090",
        "category": "XRAY",
        "price": 45.0,
        "setup_fee": 70.0,
        "questionnaire_key": "msk_xray",
    },
    {
        "code": "73110",
        "name": "XRAY WRIST (3 VIEWS MIN)",
        "cpt": "73110",
        "category": "XRAY",
        "price": 66.0,
        "setup_fee": 70.0,
        "questionnaire_key": "msk_xray",
    },
    {
        "code": "73523",
        "name": "XRAY HIPS BILATERAL (5+ VIEWS)",
        "cpt": "73523",
        "category": "XRAY",
        "price": 95.0,
        "setup_fee": 70.0,
        "questionnaire_key": "msk_xray",
    },
    {
        "code": "73552",
        "name": "XRAY FEMUR (2 VIEWS)",
        "cpt": "73552",
        "category": "XRAY",
        "price": 56.0,
        "setup_fee": 70.0,
        "questionnaire_key": "msk_xray",
    },
    {
        "code": "73560",
        "name": "XRAY KNEE (1-2 VIEWS)",
        "cpt": "73560",
        "category": "XRAY",
        "price": 54.0,
        "setup_fee": 70.0,
        "questionnaire_key": "msk_xray",
    },
    {
        "code": "73610",
        "name": "XRAY ANKLE (3+ VIEWS)",
        "cpt": "73610",
        "category": "XRAY",
        "price": 58.0,
        "setup_fee": 70.0,
        "questionnaire_key": "msk_xray",
    },
    {
        "code": "73630",
        "name": "XRAY FOOT (3+ VIEWS)",
        "cpt": "73630",
        "category": "XRAY",
        "price": 53.0,
        "setup_fee": 70.0,
        "questionnaire_key": "msk_xray",
    },
    {
        "code": "93000",
        "name": "EKG",
        "cpt": "93000",
        "category": "EKG",
        "price": 24.0,
        "setup_fee": 40.0,
        "questionnaire_key": "ekg",
    },
    {
        "code": "93306",
        "name": "ECHOCARDIOGRAPHY",
        "cpt": "93306",
        "category": "ULTRASOUND",
        "price": 299.0,
        "setup_fee": 40.0,
        "questionnaire_key": "echo",
    },
    {
        "code": "93926",
        "name": "US ARTERIAL DOPPLER LOWER EXTREMITY UNILATERAL W/O ABI (RT/LT)",
        "cpt": "93926",
        "category": "ULTRASOUND",
        "price": 36.0,
        "setup_fee": 40.0,
        "questionnaire_key": "arterial",
    },
    {
        "code": "93931",
        "name": "US ARTERIAL DOPPLER UPPER EXTREMITY UNILATERAL (RT/LT)",
        "cpt": "93931",
        "category": "ULTRASOUND",
        "price": 188.0,
        "setup_fee": 40.0,
        "questionnaire_key": "arterial",
    },
    {
        "code": "93970",
        "name": "US VENOUS DOPPLER UPPER EXTREMITY BILATERAL (DVT)",
        "cpt": "93970",
        "category": "ULTRASOUND",
        "price": 286.0,
        "setup_fee": 40.0,
        "questionnaire_key": "venous",
    },
    {
        "code": "93971",
        "name": "US VENOUS DOPPLER UPPER EXTREMITY UNILATERAL (RT/LT)",
        "cpt": "93971",
        "category": "ULTRASOUND",
        "price": 180.0,
        "setup_fee": 40.0,
        "questionnaire_key": "venous",
    },
    {
        "code": "93975",
        "name": "US ABDOMEN (AORTA ONLY) DOPPLER",
        "cpt": "93975",
        "category": "ULTRASOUND",
        "price": 399.0,
        "setup_fee": 40.0,
        "questionnaire_key": "aorta",
    },
    {
        "code": "93978",
        "name": "US ABDOMEN AORTA, IVC, ILIACS ONLY DOPPLER",
        "cpt": "93978",
        "category": "ULTRASOUND",
        "price": 282.0,
        "setup_fee": 40.0,
        "questionnaire_key": "aorta",
    },
    {
        "code": "93975RA",
        "name": "US RENAL ARTERY DUPLEX",
        "cpt": "93975RA",
        "category": "ULTRASOUND",
        "price": 200.0,
        "setup_fee": 40.0,
        "questionnaire_key": "renal",
    },
    {
        "code": "93970LOW",
        "name": "US VENOUS DOPPLER LOWER EXTREMITY BILATERAL (DVT)",
        "cpt": "93970LOW",
        "category": "ULTRASOUND",
        "price": 240.0,
        "setup_fee": 40.0,
        "questionnaire_key": "venous",
    },
]

SHARED_QUESTIONS = [
    {
        "id": "shared_1",
        "prompt": "What is your reason for requesting these services?",
        "type": "single",
        "options": [
            "Routine screening",
            "Symptoms or concerns",
            "Monitoring a known condition",
            "Follow-up of abnormal results",
            "Provider recommendation",
            "Other",
        ],
    },
    {
        "id": "shared_2",
        "prompt": "Are you currently experiencing any symptoms or health concerns?",
        "type": "yes_no_detail",
        "detail_label": "Approximate duration",
    },
    {
        "id": "shared_3",
        "prompt": "Does anyone in your biological family have a history of significant medical conditions?",
        "type": "yes_no_unsure_multi",
        "options": FAMILY_CONDITIONS,
    },
    {
        "id": "shared_4",
        "prompt": "Do you have any diagnosed medical conditions?",
        "type": "yes_no_unsure",
    },
    {
        "id": "shared_5",
        "prompt": "Are you currently taking any prescription medications, over-the-counter medications, or supplements?",
        "type": "yes_no",
    },
    {
        "id": "shared_6",
        "prompt": "Do you have any known allergies, particularly to medications, latex, or adhesives?",
        "type": "yes_no_unsure_detail",
        "detail_label": "List allergies",
    },
    {
        "id": "shared_7",
        "prompt": "Have you had this test or a similar test before?",
        "type": "yes_no_unsure",
    },
    {
        "id": "shared_8",
        "prompt": "Are you currently under the care of a primary care provider or specialist?",
        "type": "yes_no",
    },
    {
        "id": "shared_9",
        "prompt": "Has a healthcare provider already ordered or recommended this service?",
        "type": "yes_no",
    },
    {
        "id": "shared_10",
        "prompt": "Have you recently visited an emergency department or been hospitalized for the condition related to this request?",
        "type": "yes_no",
    },
    {
        "id": "shared_11",
        "prompt": "Are you pregnant, possibly pregnant, or breastfeeding?",
        "type": "single",
        "options": ["Yes", "No", "Unsure", "Not applicable"],
    },
    {
        "id": "shared_12",
        "prompt": "Are you experiencing any severe or rapidly worsening symptoms right now?",
        "type": "yes_no",
        "escalate_if": "Yes",
        "urgent": True,
    },
]

LAB_QUESTIONNAIRES = {
    "a1c": {
        "title": "A1c",
        "questions": [
            {"id": "a1c_1", "prompt": "Have you been diagnosed with diabetes or prediabetes?", "type": "yes_no"},
            {
                "id": "a1c_2",
                "prompt": "Do you have increased thirst, frequent urination, unexplained weight loss, or unusual fatigue?",
                "type": "yes_no",
            },
            {"id": "a1c_3", "prompt": "Have you previously had abnormal blood sugar results?", "type": "yes_no"},
        ],
    },
    "bmp": {
        "title": "BMP",
        "questions": [
            {
                "id": "bmp_1",
                "prompt": "Have you recently experienced vomiting, diarrhea, dehydration, or a significant change in fluid intake?",
                "type": "yes_no",
            },
            {
                "id": "bmp_2",
                "prompt": "Do you have increased thirst, frequent urination, unexplained weight loss, or unusual fatigue?",
                "type": "yes_no",
            },
            {"id": "bmp_3", "prompt": "Are you taking diuretics or medication that affects kidney function?", "type": "yes_no"},
            {
                "id": "bmp_4",
                "prompt": "Have you previously had abnormal kidney function, or electrolyte results?",
                "type": "yes_no",
            },
            {"id": "bmp_5", "prompt": "Do you have kidney disease or high blood pressure?", "type": "yes_no"},
        ],
    },
    "cmp": {
        "title": "CMP",
        "questions": [
            {
                "id": "cmp_1",
                "prompt": "Have you recently experienced vomiting, diarrhea, dehydration, or a significant change in fluid intake?",
                "type": "yes_no",
            },
            {
                "id": "cmp_2",
                "prompt": "Do you have increased thirst, frequent urination, unexplained weight loss, or unusual fatigue?",
                "type": "yes_no",
            },
            {"id": "cmp_3", "prompt": "Are you taking diuretics or medication that affects kidney function?", "type": "yes_no"},
            {
                "id": "cmp_4",
                "prompt": "Have you previously had abnormal kidney function, or electrolyte results?",
                "type": "yes_no",
            },
            {"id": "cmp_5", "prompt": "Do you have kidney disease or high blood pressure?", "type": "yes_no"},
            {"id": "cmp_6", "prompt": "Do you have liver disease or previous abnormal liver tests?", "type": "yes_no"},
        ],
    },
    "lipid": {
        "title": "Lipid Profile Panel",
        "questions": [
            {
                "id": "lipid_1",
                "prompt": "Have you been diagnosed with high cholesterol, cardiovascular disease, diabetes, or high blood pressure?",
                "type": "yes_no",
            },
            {"id": "lipid_2", "prompt": "Have you previously had abnormal cholesterol or triglyceride results?", "type": "yes_no"},
            {
                "id": "lipid_3",
                "prompt": "Are you taking cholesterol-lowering medication?",
                "type": "yes_no_detail",
                "detail_label": "Medication name",
            },
            {
                "id": "lipid_4",
                "prompt": "Do you have a family history of premature heart disease or high cholesterol?",
                "type": "yes_no",
            },
            {
                "id": "lipid_5",
                "prompt": "Is this test for routine risk assessment, monitoring treatment, or follow-up of an abnormal result?",
                "type": "single",
                "options": ["Routine risk assessment", "Monitoring treatment", "Follow-up of an abnormal result"],
            },
        ],
    },
    "uacom": {
        "title": "Complete Urinalysis with Culture Reflex",
        "questions": [
            {
                "id": "uacom_1",
                "prompt": "Are you experiencing burning with urination, urinary urgency, frequency, blood in urine, or lower abdominal discomfort?",
                "type": "yes_no",
            },
            {"id": "uacom_2", "prompt": "Do you have fever, chills, flank pain, or vomiting?", "type": "yes_no"},
            {"id": "uacom_3", "prompt": "Have you experienced recurrent urinary tract infections?", "type": "yes_no"},
            {
                "id": "uacom_4",
                "prompt": "Have you taken antibiotics in the past 10 days?",
                "type": "yes_no_detail",
                "detail_label": "Which and when",
            },
            {
                "id": "uacom_5",
                "prompt": "Are you pregnant, using a urinary catheter, or preparing for a urologic procedure?",
                "type": "yes_no",
            },
            {
                "id": "uacom_6",
                "prompt": "Are you requesting the test because of symptoms, follow-up, or screening without symptoms?",
                "type": "single",
                "options": ["Symptoms", "Follow-up", "Screening without symptoms"],
            },
        ],
    },
    "cbc": {
        "title": "CBC",
        "questions": [
            {
                "id": "cbc_1",
                "prompt": "Have you experienced unusual bleeding, frequent bruising, recurrent infections, or persistent fever?",
                "type": "yes_no",
            },
            {
                "id": "cbc_2",
                "prompt": "Have you previously been diagnosed with anemia, a blood disorder, or abnormal blood counts?",
                "type": "yes_no",
            },
            {
                "id": "cbc_3",
                "prompt": "Have you recently experienced infection, fever, fatigue or unexplained weight loss?",
                "type": "yes_no",
            },
            {
                "id": "cbc_4",
                "prompt": "Are you receiving treatment or taking medication that requires blood-count monitoring?",
                "type": "yes_no",
            },
        ],
    },
    "thyroid": {
        "title": "Thyroid Panel",
        "questions": [
            {"id": "thyroid_1", "prompt": "Have you been diagnosed with a thyroid condition?", "type": "yes_no"},
            {
                "id": "thyroid_2",
                "prompt": "Have you noticed unexplained weight changes, fatigue, temperature intolerance, palpitations, hair loss, diarrhea or constipation?",
                "type": "yes_no",
            },
            {
                "id": "thyroid_3",
                "prompt": "Are you taking thyroid medication, amiodarone, lithium, or biotin supplements?",
                "type": "yes_no",
            },
            {"id": "thyroid_4", "prompt": "Have you had abnormal thyroid tests in the past?", "type": "yes_no"},
            {
                "id": "thyroid_5",
                "prompt": "Are you pregnant, postpartum, or being evaluated for a fertility concern?",
                "type": "yes_no",
            },
        ],
    },
    "vitamin_d": {
        "title": "Vitamin D Total",
        "questions": [
            {
                "id": "vitd_1",
                "prompt": "Have you been diagnosed with osteoporosis, kidney disease, mineral deficiency or a condition affecting nutrient absorption?",
                "type": "yes_no",
            },
            {
                "id": "vitd_2",
                "prompt": "Have you had any fracture in the past 6 months? Or fragility (stress) fracture anytime?",
                "type": "yes_no",
            },
            {
                "id": "vitd_3",
                "prompt": "Do you take magnesium, phosphorus, calcium, or vitamin D supplements?",
                "type": "yes_no_detail",
                "detail_label": "What dose",
            },
            {"id": "vitd_4", "prompt": "Have you previously had abnormal mineral or vitamin D levels?", "type": "yes_no"},
        ],
    },
    "magnesium": {
        "title": "Magnesium",
        "questions": [
            {
                "id": "mg_1",
                "prompt": "Do you take magnesium, phosphorus, calcium, or vitamin D supplements?",
                "type": "yes_no_detail",
                "detail_label": "What dose",
            },
            {"id": "mg_2", "prompt": "Have you previously had abnormal mineral or vitamin D levels?", "type": "yes_no"},
            {
                "id": "mg_3",
                "prompt": "Have you experienced muscle cramps, tremors, persistent diarrhea, or an abnormal heart rhythm?",
                "type": "yes_no",
            },
        ],
    },
    "phosphorus": {
        "title": "Phosphorus",
        "questions": [
            {
                "id": "phos_1",
                "prompt": "Do you take magnesium, phosphorus, calcium, or vitamin D supplements?",
                "type": "yes_no_detail",
                "detail_label": "What dose",
            },
            {"id": "phos_2", "prompt": "Have you previously had abnormal mineral or vitamin D levels?", "type": "yes_no"},
            {
                "id": "phos_3",
                "prompt": "Do you have kidney disease, malnutrition, or a condition affecting nutrient absorption?",
                "type": "yes_no",
            },
        ],
    },
}

IMAGING_QUESTIONNAIRES = {
    "msk_xray": {
        "title": "Musculoskeletal X-rays",
        "questions": [
            {
                "id": "msk_1",
                "prompt": "What is the primary reason for imaging?",
                "type": "single",
                "options": ["Pain", "Injury", "Swelling", "Limited movement", "Chronic condition", "Other"],
            },
            {
                "id": "msk_2",
                "prompt": "What body part is affected, and which side?",
                "type": "single",
                "options": ["Right", "Left", "Both", "Midline"],
            },
            {"id": "msk_3", "prompt": "When did the problem begin?", "type": "text"},
            {
                "id": "msk_4",
                "prompt": "Was there a fall, accident, or other injury?",
                "type": "yes_no_detail",
                "detail_label": "When and how",
            },
            {"id": "msk_5", "prompt": "Can you move and use the affected body part normally?", "type": "yes_no"},
            {
                "id": "msk_6",
                "prompt": "Do you have severe pain, visible deformity, numbness, weakness, or inability to bear weight where applicable?",
                "type": "yes_no",
            },
            {
                "id": "msk_7",
                "prompt": "Have you had prior fractures, surgery, or imaging of the affected area?",
                "type": "yes_no",
            },
            {"id": "msk_8", "prompt": "Are you experiencing fever or redness around the affected area?", "type": "yes_no"},
        ],
    },
    "chest_xray": {
        "title": "Chest X-ray",
        "questions": [
            {
                "id": "chest_1",
                "prompt": "Why are you requesting a chest X-ray?",
                "type": "single",
                "options": ["Cough", "Fever", "Shortness of breath", "Other"],
            },
            {"id": "chest_2", "prompt": "How long have you had these symptoms?", "type": "text"},
            {"id": "chest_3", "prompt": "Have you previously had an abnormal chest X-ray?", "type": "yes_no"},
            {
                "id": "chest_4",
                "prompt": "Have you recently had pneumonia, a chest injury, or another lung condition?",
                "type": "yes_no",
            },
            {"id": "chest_5", "prompt": "Do you have known heart disease?", "type": "yes_no"},
        ],
    },
    "ekg": {
        "title": "EKG",
        "questions": [
            {
                "id": "ekg_1",
                "prompt": "What is the reason for requesting an EKG?",
                "type": "single",
                "options": ["Heart Palpitations", "Routine evaluation", "Follow-up", "Other"],
            },
            {
                "id": "ekg_2",
                "prompt": "Are you currently experiencing chest pain or discomfort, shortness of breath, dizziness or lightheadedness or fainting, racing heartbeat?",
                "type": "yes_no",
            },
            {"id": "ekg_3", "prompt": "Have you had an abnormal EKG before?", "type": "yes_no"},
            {"id": "ekg_4", "prompt": "Have you been diagnosed with an arrhythmia or other heart condition?", "type": "yes_no"},
            {"id": "ekg_5", "prompt": "Do you have a pacemaker or heart implanted device?", "type": "yes_no"},
            {"id": "ekg_6", "prompt": "Are you taking medications that affect heart rate or rhythm?", "type": "yes_no"},
        ],
    },
    "echo": {
        "title": "EchoCardio",
        "questions": [
            {
                "id": "echo_1",
                "prompt": "Why are you requesting an echocardiogram?",
                "type": "single",
                "options": ["Leg swelling", "Heart murmur", "Known heart disease", "Abnormal test", "Other"],
            },
            {
                "id": "echo_2",
                "prompt": "Are you currently experiencing chest pain or discomfort, shortness of breath, dizziness or lightheadedness or fainting, racing heartbeat?",
                "type": "yes_no",
            },
            {"id": "echo_3", "prompt": "Are you experiencing shortness of breath when lying flat?", "type": "yes_no"},
            {
                "id": "echo_4",
                "prompt": "Have you previously had an echocardiogram?",
                "type": "yes_no_detail",
                "detail_label": "When and was it abnormal",
            },
            {"id": "echo_5", "prompt": "Have you recently had a new heart murmur or abnormal EKG?", "type": "yes_no"},
            {"id": "echo_6", "prompt": "Have you undergone heart surgery or valve replacement?", "type": "yes_no"},
        ],
    },
    "venous": {
        "title": "Venous Doppler / DVT evaluation",
        "questions": [
            {"id": "venous_1", "prompt": "Are you experiencing swelling, pain, warmth, or redness?", "type": "yes_no"},
            {"id": "venous_2", "prompt": "Which limb or limbs are affected?", "type": "text"},
            {
                "id": "venous_3",
                "prompt": "When did the symptoms begin? Was the onset sudden?",
                "type": "text",
            },
            {"id": "venous_4", "prompt": "Have you previously had a DVT or pulmonary embolism?", "type": "yes_no"},
            {
                "id": "venous_5",
                "prompt": "Have you recently had surgery, hospitalization, prolonged immobility, or long-distance travel?",
                "type": "yes_no",
            },
            {
                "id": "venous_6",
                "prompt": "Do you have active cancer, use estrogen-containing medication, or have a clotting disorder?",
                "type": "yes_no",
            },
            {"id": "venous_7", "prompt": "Are you currently taking blood thinners?", "type": "yes_no"},
            {
                "id": "venous_8",
                "prompt": "Are you experiencing chest pain, sudden shortness of breath, coughing blood, or fainting?",
                "type": "yes_no",
                "escalate_if": "Yes",
                "urgent": True,
            },
        ],
    },
    "arterial": {
        "title": "Arterial Doppler of the extremities",
        "questions": [
            {
                "id": "arterial_1",
                "prompt": "Why are you requesting an Arterial Doppler?",
                "type": "single",
                "options": [
                    "Limb coldness",
                    "Color changes",
                    "Numbness",
                    "Previous abnormal results",
                    "Wounds that are not healing",
                    "Other",
                ],
            },
            {
                "id": "arterial_2",
                "prompt": "Which arm or leg needs evaluation?",
                "type": "single",
                "options": ["Right", "Left", "Both", "None"],
            },
            {"id": "arterial_3", "prompt": "Does the pain improve with rest?", "type": "yes_no"},
            {
                "id": "arterial_4",
                "prompt": "Have you been diagnosed with peripheral artery disease, diabetes, or circulation problems?",
                "type": "yes_no",
            },
            {
                "id": "arterial_5",
                "prompt": "Have you previously had vascular surgery, stents, or arterial blockages?",
                "type": "yes_no",
            },
            {
                "id": "arterial_6",
                "prompt": "Are symptoms new, rapidly worsening, or associated with sudden weakness or severe pain?",
                "type": "yes_no",
            },
        ],
    },
    "aorta": {
        "title": "Abdominal aortic and aortoiliac Doppler",
        "questions": [
            {
                "id": "aorta_1",
                "prompt": "Why are you requesting this study?",
                "type": "single",
                "options": ["Known aneurysm", "Abdominal symptoms", "Vascular disease", "Other"],
            },
            {
                "id": "aorta_2",
                "prompt": "Have you been diagnosed with an abdominal aortic aneurysm or another vascular condition?",
                "type": "yes_no",
            },
            {"id": "aorta_3", "prompt": "Do you have abdominal, back, or leg pain?", "type": "yes_no"},
            {"id": "aorta_4", "prompt": "Do you smoke or have a history of smoking?", "type": "yes_no"},
            {"id": "aorta_5", "prompt": "Do you have a family history of an abdominal aortic aneurysm?", "type": "yes_no"},
            {
                "id": "aorta_6",
                "prompt": "Have you had vascular surgery, a stent graft, or previous aortic imaging?",
                "type": "yes_no",
            },
        ],
    },
    "renal": {
        "title": "Renal Artery Duplex",
        "questions": [
            {"id": "renal_1", "prompt": "Have you been diagnosed with high blood pressure or kidney disease?", "type": "yes_no"},
            {
                "id": "renal_2",
                "prompt": "Have you experienced sudden worsening of blood pressure or kidney function?",
                "type": "yes_no",
            },
            {"id": "renal_3", "prompt": "Have you previously been diagnosed with renal artery narrowing?", "type": "yes_no"},
            {"id": "renal_4", "prompt": "Have you had kidney or renal artery surgery?", "type": "yes_no"},
            {
                "id": "renal_5",
                "prompt": "Has a provider recommended this study because of abnormal kidney function, blood pressure, or imaging findings?",
                "type": "yes_no",
            },
            {"id": "renal_6", "prompt": "Are you taking any pain medication?", "type": "yes_no"},
            {"id": "renal_7", "prompt": "Have you had any lower back injury or trauma?", "type": "yes_no"},
        ],
    },
}


def questionnaires_for(lab_codes=None, imaging_codes=None):
    lab_codes = lab_codes or []
    imaging_codes = imaging_codes or []
    lab_map = {item["code"]: item for item in LAB_TESTS}
    imaging_map = {item["code"]: item for item in IMAGING_TESTS}

    sections = [{"key": "shared", "title": "Questions for all services", "scope": "shared", "questions": SHARED_QUESTIONS}]

    seen_lab = set()
    for code in lab_codes:
        test = lab_map.get(code)
        if not test:
            continue
        key = test["questionnaire_key"]
        if key in seen_lab:
            continue
        seen_lab.add(key)
        block = LAB_QUESTIONNAIRES[key]
        sections.append(
            {
                "key": key,
                "title": f"Lab · {block['title']}",
                "scope": "lab",
                "questions": block["questions"],
            }
        )

    seen_imaging = set()
    for code in imaging_codes:
        test = imaging_map.get(code)
        if not test:
            continue
        key = test["questionnaire_key"]
        if key in seen_imaging:
            continue
        seen_imaging.add(key)
        block = IMAGING_QUESTIONNAIRES[key]
        sections.append(
            {
                "key": key,
                "title": f"Imaging · {block['title']}",
                "scope": "imaging",
                "questions": block["questions"],
            }
        )

    return sections
