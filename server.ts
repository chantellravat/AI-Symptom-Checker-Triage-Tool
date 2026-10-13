/**
 * AI Symptom Checker and Triage Tool - Backend Server
 * 
 * This server handles:
 * 1. Serving the React Vite frontend application.
 * 2. An API endpoint (/api/analyze-symptoms) that uses Google's Gemini AI
 *    to analyze user-entered symptoms and suggest an appropriate care triage level.
 * 3. A fallback clinical triage rule engine to ensure reliable, safe operation
 *    even if an API key is missing or network connectivity is interrupted.
 */

import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';

// Load environment variables from .env file (if present)
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Enable JSON body parsing for incoming API requests
app.use(express.json());

// Initialize Google Gemini AI client
// Note: Telemetry header 'aistudio-build' is required by system guidelines
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

/**
 * Data structure representing the analysis result returned to the frontend.
 */
export interface TriageResult {
  symptomsIdentified: string[];
  summary: string;
  preliminaryAssessment: string;
  suggestedCareLevel: 'emergency' | 'urgent' | 'routine';
  urgencyReasoning: string;
  careCategories: {
    emergency: {
      recommended: boolean;
      definition: string;
      typicalWaitTime: string;
      signsToWatch: string[];
      actionAdvice: string;
    };
    urgent: {
      recommended: boolean;
      definition: string;
      typicalWaitTime: string;
      signsToWatch: string[];
      actionAdvice: string;
    };
    routine: {
      recommended: boolean;
      definition: string;
      typicalWaitTime: string;
      signsToWatch: string[];
      actionAdvice: string;
    };
  };
  redFlagWarnings: string[];
  suggestedQuestionsForDoctor: string[];
  selfCareMeasures: string[];
}

/**
 * Fallback Clinical Triage Rule Engine
 * 
 * In beginner programming, it is best practice to have a dependable fallback
 * when external cloud APIs are unavailable. This rule-based function scans for
 * critical red-flag terms and provides a safe, standard clinical triage assessment.
 */
function runFallbackTriage(inputSymptoms: string): TriageResult {
  const lower = inputSymptoms.toLowerCase();

  // 1. Identify common symptoms mentioned in the user's text
  const possibleSymptoms = [
    { name: 'Chest Pain or Pressure', keywords: ['chest pain', 'chest pressure', 'tightness in chest', 'crushing chest'] },
    { name: 'Shortness of Breath', keywords: ['shortness of breath', 'difficulty breathing', 'gasping', 'cant breathe', "can't breathe", 'wheezing'] },
    { name: 'Sudden Weakness / Numbness', keywords: ['numbness', 'weakness', 'drooping', 'slurred speech', 'confusion'] },
    { name: 'High Fever', keywords: ['high fever', '103', '102', '104', 'chills', 'fever'] },
    { name: 'Severe Headache', keywords: ['severe headache', 'worst headache', 'thunderclap', 'headache', 'migraine'] },
    { name: 'Severe Abdominal Pain', keywords: ['stomach pain', 'abdominal pain', 'belly pain', 'cramps'] },
    { name: 'Sore Throat', keywords: ['sore throat', 'throat hurts', 'swollen glands', 'scratchy throat'] },
    { name: 'Cough', keywords: ['cough', 'coughing', 'phlegm', 'mucus'] },
    { name: 'Runny Nose / Congestion', keywords: ['runny nose', 'congestion', 'sneezing', 'stuffy nose'] },
    { name: 'Joint or Ankle Injury', keywords: ['sprain', 'twisted ankle', 'swelling', 'bruise', 'ankle', 'joint pain'] },
    { name: 'Nausea or Vomiting', keywords: ['nausea', 'vomiting', 'throwing up', 'upset stomach'] },
    { name: 'Dizziness or Lightheadedness', keywords: ['dizziness', 'dizzy', 'lightheaded', 'faint'] },
  ];

  const identified: string[] = [];
  for (const item of possibleSymptoms) {
    if (item.keywords.some((kw) => lower.includes(kw))) {
      identified.push(item.name);
    }
  }

  // If none matched from our keyword list, provide a friendly default based on words
  if (identified.length === 0) {
    identified.push('General reported discomfort / symptoms');
  }

  // 2. Check for Emergency Red Flags
  const emergencyKeywords = [
    'chest pain', 'crushing', 'radiating to arm', 'radiating to jaw',
    'cant breathe', "can't breathe", 'shortness of breath', 'passed out', 'unconscious',
    'slurred speech', 'facial drooping', 'sudden weakness', 'coughing blood',
    'stiff neck with high fever', 'anaphylaxis', 'allergic reaction', 'swollen lips',
    'worst headache of my life', 'blue lips', 'severe blood loss', 'severe burn'
  ];

  const urgentKeywords = [
    'deep cut', 'stitches', 'high fever', 'vomiting for 24 hours',
    'sprain', 'cannot walk', 'twisted ankle', 'swollen ankle', 'burning urination',
    'urinary tract', 'severe ear pain', 'asthma flare', 'persistent dizziness'
  ];

  let level: 'emergency' | 'urgent' | 'routine' = 'routine';
  let reasoning = 'The symptoms described appear consistent with non-acute, self-limiting or routine conditions that can be monitored and evaluated by a primary care doctor.';

  if (emergencyKeywords.some((kw) => lower.includes(kw))) {
    level = 'emergency';
    reasoning = 'The symptoms described include critical red flags (such as acute respiratory distress, severe chest discomfort, or neurological signs) that require immediate evaluation in an Emergency Department.';
  } else if (urgentKeywords.some((kw) => lower.includes(kw))) {
    level = 'urgent';
    reasoning = 'The symptoms described require prompt medical attention within the next 12 to 24 hours at an Urgent Care clinic to prevent complications or receive active relief.';
  }

  return {
    symptomsIdentified: identified,
    summary: `Reported symptoms: ${inputSymptoms.slice(0, 150)}${inputSymptoms.length > 150 ? '...' : ''}`,
    preliminaryAssessment: `Based on your description, the symptoms reported (${identified.join(', ')}) are commonly encountered in medical assessments. This preliminary assessment is educational and not a medical diagnosis. A physical examination, vital signs check, and medical history by a licensed healthcare provider are needed for definitive diagnosis and treatment.`,
    suggestedCareLevel: level,
    urgencyReasoning: reasoning,
    careCategories: {
      emergency: {
        recommended: level === 'emergency',
        definition: 'Hospital Emergency Department (ED) or calling 911 for acute, life-threatening conditions.',
        typicalWaitTime: 'Immediate triage upon arrival',
        signsToWatch: [
          'Sudden chest pain, tightness, or pressure radiating to arm/jaw',
          'Severe difficulty breathing, gasping, or blue-tinted lips',
          'Sudden numbness or weakness in face, arm, or leg (especially one side)',
          'Sudden confusion, difficulty speaking, or loss of consciousness',
          'Severe head injury, continuous vomiting, or unmanageable bleeding',
        ],
        actionAdvice: level === 'emergency'
          ? 'Call 911 or proceed immediately to the nearest Emergency Department. Do not drive yourself if experiencing chest pain, dizziness, or confusion.'
          : 'Seek Emergency Care if your symptoms rapidly worsen or if any of the emergency warning signs develop.',
      },
      urgent: {
        recommended: level === 'urgent',
        definition: 'Urgent Care Center or Same-Day Walk-In Clinic for acute conditions that need care within 12–24 hours.',
        typicalWaitTime: 'Same-day walk-in or reserved appointment',
        signsToWatch: [
          'High fever unresponsive to standard antipyretics or lasting >3 days',
          'Moderate sprains, suspected fractures, or inability to bear weight',
          'Deep cuts requiring stitches or wound sterilization',
          'Painful urination, severe localized earache, or persistent abdominal cramps',
        ],
        actionAdvice: level === 'urgent'
          ? 'Visit an Urgent Care clinic today. They provide rapid diagnostics (X-rays, rapid lab tests) without the full cost or delay of an emergency room.'
          : 'Consider Urgent Care if your primary doctor is unavailable and your symptoms are worsening significantly.',
      },
      routine: {
        recommended: level === 'routine',
        definition: 'Primary Care Physician (PCP), Telehealth appointment, or guided home self-care.',
        typicalWaitTime: 'Scheduled within a few days or telehealth consult',
        signsToWatch: [
          'Mild cold symptoms (runny nose, mild sore throat, occasional cough)',
          'Minor muscle aches, tension headaches, or mild seasonal allergies',
          'Symptoms stable or gradually improving over 48–72 hours',
        ],
        actionAdvice: level === 'routine'
          ? 'Schedule an appointment with your primary care provider or a telehealth clinician. Practice supportive self-care (hydration, rest, tracking symptom progression).'
          : 'After acute resolution, follow up with your routine primary care provider for comprehensive health management.',
      },
    },
    redFlagWarnings: [
      'Difficulty breathing or shortness of breath at rest',
      'Crushing pressure or pain in the chest or upper abdomen',
      'Sudden loss of speech, vision, or movement on one side of the body',
      'Uncontrolled bleeding or severe sudden trauma',
      'Fever accompanied by stiff neck, confusion, or purple spot rash',
    ],
    suggestedQuestionsForDoctor: [
      'What are the most likely causes of these specific symptoms?',
      'Are there specific diagnostic tests (blood tests, imaging, swabs) you recommend?',
      'What signs or changes should prompt me to seek urgent or emergency care?',
      'Are there over-the-counter remedies or lifestyle measures safe for my medical history?',
      'When should I schedule a follow-up if my symptoms do not resolve?',
    ],
    selfCareMeasures: [
      'Stay thoroughly hydrated with water, herbal teas, or electrolyte fluids.',
      'Prioritize sleep and physical rest to support your immune system.',
      'Record your symptoms, temperature, and timing in a log to share with your clinician.',
      'Avoid strenuous physical exertion until your symptoms stabilize.',
    ],
  };
}

/**
 * Main API Route: Analyze Symptoms
 * 
 * Accepts a POST request with { symptoms: string }
 * Returns structured triage advice using Gemini 3.8 Flash,
 * with automatic fallback to rule-based analysis if needed.
 */
app.post('/api/analyze-symptoms', async (req: Request, res: Response) => {
  try {
    const { symptoms } = req.body;

    // Requirement 8: Basic error handling when user submits empty or whitespace input
    if (!symptoms || typeof symptoms !== 'string' || symptoms.trim().length === 0) {
      return res.status(400).json({
        error: 'Please enter your symptoms in the text box before clicking Analyze.',
      });
    }

    const trimmedSymptoms = symptoms.trim();

    // Check minimum length (e.g. at least 3 characters)
    if (trimmedSymptoms.length < 3) {
      return res.status(400).json({
        error: 'Please provide a more descriptive summary of your symptoms (at least 3 characters).',
      });
    }

    // If Gemini API key is available, use Gemini 3.8 Flash for intelligent healthcare assessment
    if (process.env.GEMINI_API_KEY) {
      try {
        const prompt = `Analyze the following user-reported medical symptoms for an educational symptom checker and triage tool.
USER REPORTED SYMPTOMS:
"${trimmedSymptoms}"

CRITICAL INSTRUCTIONS:
1. You are an educational triage assistant. You DO NOT provide a definitive diagnosis. Always state that this is educational information and only a licensed healthcare professional can diagnose conditions.
2. Accurately triage the user into one of three standard healthcare care levels:
   - "emergency": Immediate danger to life, breathing, consciousness, or organ function (e.g., chest pain, shortness of breath, stroke signs, severe hemorrhage, anaphylaxis, severe head trauma).
   - "urgent": Needs prompt medical evaluation within 12-24 hours at an Urgent Care clinic (e.g., deep cuts, persistent fever, significant sprains, asthma flare-up, painful urination).
   - "routine": Non-urgent symptoms suitable for a scheduled primary care doctor appointment, telehealth visit, or supportive home care (e.g., mild cold, mild sore throat, minor tension headache, stable seasonal allergies).
3. Extract the key symptoms identified from the text.
4. Give a clear, neutral preliminary informational assessment explaining what these symptoms often relate to, without claiming certainty.
5. Provide red flag warnings that would warrant immediate 911 / emergency care.
6. Provide constructive questions the user can ask their doctor.
7. Provide safe general self-care measures (rest, hydration, symptom tracking).`;

        const response = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: prompt,
          config: {
            systemInstruction: 'You are a healthcare triage educational assistant. Always prioritize patient safety. Emphasize that your assessment is for educational purposes and is never a confirmed diagnosis. If symptoms could be life-threatening, triage to emergency immediately.',
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                symptomsIdentified: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: 'List of specific symptoms extracted from the user text',
                },
                summary: {
                  type: Type.STRING,
                  description: 'Brief 1-sentence summary of the reported symptoms',
                },
                preliminaryAssessment: {
                  type: Type.STRING,
                  description: 'Educational explanation of potential causes and what these symptoms generally indicate, strictly non-diagnostic',
                },
                suggestedCareLevel: {
                  type: Type.STRING,
                  description: 'Triage recommendation: exactly "emergency", "urgent", or "routine"',
                },
                urgencyReasoning: {
                  type: Type.STRING,
                  description: 'Clear medical explanation for why this care level is suggested',
                },
                careCategories: {
                  type: Type.OBJECT,
                  properties: {
                    emergency: {
                      type: Type.OBJECT,
                      properties: {
                        recommended: { type: Type.BOOLEAN },
                        definition: { type: Type.STRING },
                        typicalWaitTime: { type: Type.STRING },
                        signsToWatch: { type: Type.ARRAY, items: { type: Type.STRING } },
                        actionAdvice: { type: Type.STRING },
                      },
                      required: ['recommended', 'definition', 'typicalWaitTime', 'signsToWatch', 'actionAdvice'],
                    },
                    urgent: {
                      type: Type.OBJECT,
                      properties: {
                        recommended: { type: Type.BOOLEAN },
                        definition: { type: Type.STRING },
                        typicalWaitTime: { type: Type.STRING },
                        signsToWatch: { type: Type.ARRAY, items: { type: Type.STRING } },
                        actionAdvice: { type: Type.STRING },
                      },
                      required: ['recommended', 'definition', 'typicalWaitTime', 'signsToWatch', 'actionAdvice'],
                    },
                    routine: {
                      type: Type.OBJECT,
                      properties: {
                        recommended: { type: Type.BOOLEAN },
                        definition: { type: Type.STRING },
                        typicalWaitTime: { type: Type.STRING },
                        signsToWatch: { type: Type.ARRAY, items: { type: Type.STRING } },
                        actionAdvice: { type: Type.STRING },
                      },
                      required: ['recommended', 'definition', 'typicalWaitTime', 'signsToWatch', 'actionAdvice'],
                    },
                  },
                  required: ['emergency', 'urgent', 'routine'],
                },
                redFlagWarnings: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: 'Warning signs where user must immediately call 911 or go to Emergency Department',
                },
                suggestedQuestionsForDoctor: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: 'Helpful questions the patient should bring to their doctor',
                },
                selfCareMeasures: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: 'Supportive, safe general care tips like rest and hydration',
                },
              },
              required: [
                'symptomsIdentified',
                'summary',
                'preliminaryAssessment',
                'suggestedCareLevel',
                'urgencyReasoning',
                'careCategories',
                'redFlagWarnings',
                'suggestedQuestionsForDoctor',
                'selfCareMeasures',
              ],
            },
          },
        });

        const textOutput = response.text;
        if (textOutput) {
          const parsed = JSON.parse(textOutput) as TriageResult;
          // Normalize suggestedCareLevel to ensure it matches one of the three enums
          const normalizedLevel = (['emergency', 'urgent', 'routine'].includes(parsed.suggestedCareLevel)
            ? parsed.suggestedCareLevel
            : 'routine') as 'emergency' | 'urgent' | 'routine';
          
          parsed.suggestedCareLevel = normalizedLevel;
          return res.json(parsed);
        }
      } catch (geminiError) {
        console.warn('Gemini API call failed or timed out; falling back to clinical rule engine:', geminiError);
        // Fall back gracefully to rule-based engine
        const fallbackResult = runFallbackTriage(trimmedSymptoms);
        return res.json(fallbackResult);
      }
    }

    // If no GEMINI_API_KEY is configured, use the dependable rule-based triage
    const result = runFallbackTriage(trimmedSymptoms);
    return res.json(result);
  } catch (err: unknown) {
    console.error('Error analyzing symptoms:', err);
    return res.status(500).json({
      error: 'An unexpected error occurred while analyzing symptoms. Please try again.',
    });
  }
});

/**
 * Server setup for development (with Vite middleware) and production
 */
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    // In dev mode, mount Vite middleware so HMR and hot assets work seamlessly
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // In production, serve the built static client from dist/
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, () => {
    console.log(`AI Symptom Checker server running at http://localhost:${PORT}`);
  });
}

startServer();
