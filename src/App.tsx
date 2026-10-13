/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * AI Symptom Checker and Triage Tool
 * 
 * Beginner-Friendly Healthcare Web Application
 * This application allows users to input their symptoms, submit them for analysis,
 * and view a preliminary informational assessment along with recommended care levels
 * (Emergency, Urgent Care, or Routine Care).
 */

import React, { useState } from 'react';
import {
  AlertTriangle,
  ShieldCheck,
  Stethoscope,
  HeartPulse,
  Clock,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Sparkles,
  ArrowRight,
  RotateCcw,
  Printer,
  Copy,
  Check,
  Info,
  PhoneCall,
  ShieldAlert,
  ChevronRight,
  FileQuestion,
  Activity
} from 'lucide-react';

/**
 * TypeScript interface representing the Triage result returned by our backend API.
 */
interface CareCategoryDetail {
  recommended: boolean;
  definition: string;
  typicalWaitTime: string;
  signsToWatch: string[];
  actionAdvice: string;
}

interface TriageData {
  symptomsIdentified: string[];
  summary: string;
  preliminaryAssessment: string;
  suggestedCareLevel: 'emergency' | 'urgent' | 'routine';
  urgencyReasoning: string;
  careCategories: {
    emergency: CareCategoryDetail;
    urgent: CareCategoryDetail;
    routine: CareCategoryDetail;
  };
  redFlagWarnings: string[];
  suggestedQuestionsForDoctor: string[];
  selfCareMeasures: string[];
}

/**
 * Pre-configured beginner sample scenarios that users can click to quickly test the app.
 */
const SAMPLE_SCENARIOS = [
  {
    title: 'Chest Discomfort (Emergency)',
    badge: 'Emergency Example',
    text: 'Sudden tight pressure in my chest that radiates slightly to my left arm, accompanied by shortness of breath and mild sweating that started 20 minutes ago while resting.',
  },
  {
    title: 'Sprained Ankle (Urgent Care)',
    badge: 'Urgent Care Example',
    text: 'I twisted my right ankle stepping off a curb this morning. It has swollen considerably, is bruised, and I am unable to put full weight on it without sharp pain.',
  },
  {
    title: 'Mild Cold Symptoms (Routine Care)',
    badge: 'Routine Care Example',
    text: 'I have had a runny nose, mild scratchy throat, and a low-grade temperature of 99.2°F for the past two days. No shortness of breath or severe pain.',
  },
  {
    title: 'High Persistent Fever (Urgent Care)',
    badge: 'Urgent Care Example',
    text: 'High fever of 102.8°F that has lasted for three days, accompanied by a painful cough producing yellowish mucus and body chills.',
  },
];

export default function App() {
  // ---------------------------------------------------------------------------
  // Application State
  // ---------------------------------------------------------------------------
  
  // Stores the text entered by the user in the symptom input box
  const [symptomsInput, setSymptomsInput] = useState<string>('');

  // Stores any validation or network error message to show to the user
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Indicates whether an analysis request is currently in progress
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Stores the resulting triage data once analysis completes
  const [triageResult, setTriageResult] = useState<TriageData | null>(null);

  // UI state for the "Copy Summary" button feedback
  const [copied, setCopied] = useState<boolean>(false);

  // Active filter tab in the care guidance category section
  const [activeCareTab, setActiveCareTab] = useState<'all' | 'emergency' | 'urgent' | 'routine'>('all');

  // ---------------------------------------------------------------------------
  // Helper Functions
  // ---------------------------------------------------------------------------

  /**
   * handleInputChange:
   * Updates the symptom text as the user types and clears any existing error message.
   */
  const handleInputChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setSymptomsInput(event.target.value);
    if (errorMessage) {
      setErrorMessage(null);
    }
  };

  /**
   * handleSelectSample:
   * Populates the symptom text area with a pre-made sample description.
   */
  const handleSelectSample = (sampleText: string) => {
    setSymptomsInput(sampleText);
    setErrorMessage(null);
    // Optional smooth scroll to input area if on mobile
    const inputElement = document.getElementById('symptoms-input');
    if (inputElement) {
      inputElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  /**
   * handleClear:
   * Resets the input box and clears current errors and results.
   */
  const handleClear = () => {
    setSymptomsInput('');
    setErrorMessage(null);
    setTriageResult(null);
  };

  /**
   * validateInput:
   * Checks whether the user has provided a valid, non-empty description.
   * Requirement 8: Basic error handling when the user submits an empty text box.
   */
  const validateInput = (): boolean => {
    const trimmed = symptomsInput.trim();
    if (!trimmed) {
      setErrorMessage('Please enter your symptoms before clicking Analyze. You can describe how you feel or pick an example below.');
      return false;
    }
    if (trimmed.length < 5) {
      setErrorMessage('Please provide a little more detail about what you are experiencing (at least 5 characters).');
      return false;
    }
    return true;
  };

  /**
   * handleAnalyzeSymptoms:
   * Main function triggered when the user clicks the "Analyze Symptoms" button.
   * Sends the input to the server API and updates application state.
   */
  const handleAnalyzeSymptoms = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    // 1. Validate the input box
    if (!validateInput()) {
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      // 2. Call the backend API route
      const response = await fetch('/api/analyze-symptoms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ symptoms: symptomsInput.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Unable to process symptom analysis. Please try again.');
      }

      // 3. Save the successful result to state
      setTriageResult(data as TriageData);

      // Auto-set the active care tab to match the suggested care level
      if (data.suggestedCareLevel) {
        setActiveCareTab(data.suggestedCareLevel);
      }

      // Smooth scroll to the results section for good user experience
      setTimeout(() => {
        const resultsSection = document.getElementById('results-section');
        if (resultsSection) {
          resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'A network error occurred. Please try again.';
      setErrorMessage(message);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * handleCopySummary:
   * Allows the user to copy their symptoms and preliminary results to the clipboard
   * for easy reference during a doctor visit.
   */
  const handleCopySummary = () => {
    if (!triageResult) return;
    const textToCopy = `AI SYMPTOM CHECKER & TRIAGE SUMMARY
----------------------------------------
Symptoms Identified: ${triageResult.symptomsIdentified.join(', ')}
Suggested Care Level: ${triageResult.suggestedCareLevel.toUpperCase()}
Assessment Summary: ${triageResult.preliminaryAssessment}
Urgency Rationale: ${triageResult.urgencyReasoning}

Note: This summary is educational and does not replace medical advice.`;

    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  /**
   * handlePrintReport:
   * Opens the browser print dialog so the user can save or print their report.
   */
  const handlePrintReport = () => {
    window.print();
  };

  // Helper function to get color styling for each care level
  const getLevelStyles = (level: 'emergency' | 'urgent' | 'routine') => {
    switch (level) {
      case 'emergency':
        return {
          title: 'Emergency Care',
          subtitle: 'Immediate danger - Call 911 or visit the nearest ER',
          bgLight: 'bg-rose-50',
          border: 'border-rose-200',
          textDark: 'text-rose-950',
          badgeText: 'text-rose-700',
          badgeBg: 'bg-rose-100',
          accent: 'text-rose-600',
          indicator: 'bg-rose-600',
        };
      case 'urgent':
        return {
          title: 'Urgent Care',
          subtitle: 'Prompt evaluation needed within 12 to 24 hours',
          bgLight: 'bg-amber-50',
          border: 'border-amber-200',
          textDark: 'text-amber-950',
          badgeText: 'text-amber-800',
          badgeBg: 'bg-amber-100',
          accent: 'text-amber-600',
          indicator: 'bg-amber-500',
        };
      case 'routine':
        return {
          title: 'Routine Care',
          subtitle: 'Schedule a primary doctor visit or supportive home care',
          bgLight: 'bg-emerald-50',
          border: 'border-emerald-200',
          textDark: 'text-emerald-950',
          badgeText: 'text-emerald-800',
          badgeBg: 'bg-emerald-100',
          accent: 'text-emerald-600',
          indicator: 'bg-emerald-600',
        };
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans antialiased flex flex-col">
      {/* -------------------------------------------------------------------- */}
      {/* 1. TOP BAR CONTRACT: Brand title, nav links, primary action           */}
      {/* -------------------------------------------------------------------- */}
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200 px-4 sm:px-8 py-3.5 flex items-center justify-between gap-8">
        {/* Zone 1: Single brand wordmark */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="w-9 h-9 rounded-lg bg-teal-600 text-white flex items-center justify-center shadow-xs">
            <HeartPulse className="w-5 h-5" />
          </div>
          <span className="text-base sm:text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap">
            AI Symptom Checker & Triage Tool
          </span>
        </div>

        {/* Zone 2: Navigation Links */}
        <nav className="hidden md:flex items-center gap-6 text-xs sm:text-sm font-medium text-slate-600">
          <a href="#checker-tool" className="hover:text-teal-700 transition-colors whitespace-nowrap">
            Check Symptoms
          </a>
          <a href="#care-levels-guide" className="hover:text-teal-700 transition-colors whitespace-nowrap">
            Triage Levels Guide
          </a>
          <a href="#privacy-disclaimer" className="hover:text-teal-700 transition-colors whitespace-nowrap">
            Safety & Privacy
          </a>
          <a href="#how-it-works" className="hover:text-teal-700 transition-colors whitespace-nowrap">
            How It Works
          </a>
        </nav>

        {/* Zone 3: Primary Action */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => {
              const inputElement = document.getElementById('symptoms-input');
              if (inputElement) inputElement.focus();
            }}
            className="px-3.5 py-1.5 text-xs font-semibold text-white bg-teal-700 rounded-lg hover:bg-teal-800 transition-colors whitespace-nowrap shadow-xs"
          >
            Start Check
          </button>
        </div>
      </header>

      {/* -------------------------------------------------------------------- */}
      {/* 2. PROMINENT MEDICAL DISCLAIMER BANNER (Requirement 7)               */}
      {/* -------------------------------------------------------------------- */}
      <section className="bg-amber-50 border-b border-amber-200 px-4 sm:px-8 py-3">
        <div className="max-w-6xl mx-auto flex items-start sm:items-center gap-3 text-xs sm:text-sm text-amber-900">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5 sm:mt-0" />
          <div className="flex-1">
            <strong className="font-semibold">Educational Purposes Only:</strong> This tool is an informational triage aid for educational learning. It does not provide medical diagnoses or treatment plans. If you believe you are experiencing a life-threatening emergency, call <span className="font-bold underline">911</span> or your local emergency number immediately.
          </div>
        </div>
      </section>

      {/* -------------------------------------------------------------------- */}
      {/* 3. HERO & CONTEXT HEADER                                             */}
      {/* -------------------------------------------------------------------- */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-8 py-8 sm:py-10 space-y-10">
        <div className="space-y-3 max-w-3xl">
          <div className="flex items-center gap-2 text-xs font-medium text-teal-800">
            <span>Clinical Informatics Triage</span>
            <span aria-hidden="true">·</span>
            <span>Educational Decision Support</span>
            <span aria-hidden="true">·</span>
            <span>Non-Diagnostic</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-bold tracking-tight text-slate-900 leading-tight">
            Understand your symptoms and find the right level of medical care
          </h1>
          <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
            Describe what you are experiencing in plain language. Our system identifies key symptoms, prepares a preliminary educational overview, and guides you toward the appropriate care category: <strong>Emergency</strong>, <strong>Urgent Care</strong>, or <strong>Routine Care</strong>.
          </p>
        </div>

        {/* ------------------------------------------------------------------ */}
        {/* 4. SYMPTOM INPUT SECTION                                           */}
        {/* ------------------------------------------------------------------ */}
        <section id="checker-tool" className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 sm:p-8 space-y-6">
          {/* Header of the tool box */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Stethoscope className="w-5 h-5 text-teal-600" />
                Describe Your Symptoms
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                Include details such as when symptoms began, severity (1-10), location, and any accompanying discomfort.
              </p>
            </div>
            {symptomsInput && (
              <button
                type="button"
                onClick={handleClear}
                className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1 self-start sm:self-auto py-1 px-2 rounded-md hover:bg-slate-100 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Clear Box
              </button>
            )}
          </div>

          {/* Privacy Notice Card (Requirement 9) */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-teal-700 shrink-0 mt-0.5" />
            <div className="text-xs sm:text-sm text-slate-700">
              <strong className="font-semibold text-slate-900">Privacy Notice:</strong> For your safety and confidentiality, please do not enter personal identifying information such as full names, dates of birth, phone numbers, or addresses. Only describe the physical sensations and symptoms.
            </div>
          </div>

          {/* Textarea Input Form (Requirements 2, 3, 8) */}
          <form onSubmit={handleAnalyzeSymptoms} className="space-y-4">
            <div className="relative">
              <label htmlFor="symptoms-input" className="sr-only">
                Enter your symptoms
              </label>
              <textarea
                id="symptoms-input"
                rows={5}
                value={symptomsInput}
                onChange={handleInputChange}
                placeholder="Example: I woke up with a sharp throbbing headache on one side of my forehead, sensitivity to bright lights, and mild nausea for the past 4 hours. No fever or numbness."
                className={`w-full rounded-lg border p-4 text-sm sm:text-base text-slate-900 placeholder:text-slate-400 focus:outline-none transition-all resize-y ${
                  errorMessage
                    ? 'border-rose-400 focus:border-rose-500 focus:ring-2 focus:ring-rose-100'
                    : 'border-slate-300 focus:border-teal-600 focus:ring-2 focus:ring-teal-100'
                }`}
              />
              <div className="flex items-center justify-between text-xs text-slate-400 mt-1 px-1">
                <span>Be as descriptive as possible</span>
                <span className="font-mono tabular-nums">{symptomsInput.length} characters</span>
              </div>
            </div>

            {/* Error Message Alert (Requirement 8) */}
            {errorMessage && (
              <div className="rounded-lg bg-rose-50 border border-rose-200 p-3.5 flex items-start gap-3 text-rose-900 animate-in fade-in">
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div className="text-xs sm:text-sm">
                  <strong className="font-semibold">Input Required:</strong> {errorMessage}
                </div>
              </div>
            )}

            {/* Action Row: Analyze Button & Quick Clear */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
              <div className="text-xs text-slate-500 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-teal-600 shrink-0" />
                <span>Powered by clinical triage guidelines & Gemini AI</span>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleClear}
                  disabled={!symptomsInput && !triageResult}
                  className="px-4 py-2.5 text-xs sm:text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Reset
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-6 py-2.5 text-xs sm:text-sm font-semibold text-white bg-teal-700 rounded-lg hover:bg-teal-800 transition-all shadow-xs flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Analyzing Symptoms...</span>
                    </>
                  ) : (
                    <>
                      <span>Analyze Symptoms</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>

          {/* Quick-Test Example Scenarios for Beginners */}
          <div className="border-t border-slate-100 pt-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Or Try an Example Scenario:
              </span>
              <span className="text-xs text-slate-400">Click to load into the text box</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {SAMPLE_SCENARIOS.map((scenario, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => handleSelectSample(scenario.text)}
                  className="text-left p-3 rounded-lg border border-slate-200 hover:border-teal-400 hover:bg-teal-50/40 transition-all group"
                >
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-900 group-hover:text-teal-900">
                    <span>{scenario.title}</span>
                    <span className="text-[11px] font-normal text-slate-500 group-hover:text-teal-700">
                      {scenario.badge}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1 line-clamp-2">
                    {scenario.text}
                  </p>
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------------------ */}
        {/* 5. RESULTS & TRIAGE ASSESSMENT SECTION (Requirements 4, 5)          */}
        {/* ------------------------------------------------------------------ */}
        {triageResult && (
          <section id="results-section" className="space-y-8 animate-in fade-in duration-300">
            {/* Top Results Card */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 sm:p-8 space-y-6">
              {/* Header with Export & Reset Actions */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
                <div>
                  <div className="text-xs font-medium text-teal-800">
                    Assessment Report Generated
                  </div>
                  <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mt-0.5">
                    Preliminary Triage Assessment
                  </h2>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopySummary}
                    className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors flex items-center gap-1.5"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Copied' : 'Copy Summary'}</span>
                  </button>
                  <button
                    onClick={handlePrintReport}
                    className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors flex items-center gap-1.5"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Print Report</span>
                  </button>
                </div>
              </div>

              {/* Suggested Care Level Banner */}
              {(() => {
                const styles = getLevelStyles(triageResult.suggestedCareLevel);
                return (
                  <div className={`rounded-xl border ${styles.border} ${styles.bgLight} p-5 sm:p-6 space-y-3`}>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-3 h-3 rounded-full ${styles.indicator}`} />
                        <span className="text-xs uppercase tracking-wider font-bold text-slate-600">
                          Suggested Care Level:
                        </span>
                        <span className={`text-base sm:text-lg font-bold ${styles.textDark}`}>
                          {styles.title}
                        </span>
                      </div>
                      <span className="text-xs text-slate-600 font-medium">
                        {styles.subtitle}
                      </span>
                    </div>

                    <p className="text-xs sm:text-sm text-slate-800 leading-relaxed pt-1">
                      <strong>Triage Rationale:</strong> {triageResult.urgencyReasoning}
                    </p>

                    {/* Immediate Callout if Emergency */}
                    {triageResult.suggestedCareLevel === 'emergency' && (
                      <div className="bg-rose-600 text-white p-3.5 rounded-lg flex items-center justify-between gap-3 shadow-xs">
                        <div className="flex items-center gap-3">
                          <PhoneCall className="w-5 h-5 shrink-0" />
                          <div className="text-xs sm:text-sm font-semibold">
                            Critical Symptoms Detected: Call 911 or have someone drive you to the nearest ER immediately.
                          </div>
                        </div>
                        <a
                          href="tel:911"
                          className="px-3 py-1 text-xs font-bold text-rose-700 bg-white rounded-md whitespace-nowrap hover:bg-rose-50"
                        >
                          Dial 911
                        </a>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Identified Symptoms (Requirement 4) */}
              <div className="space-y-3">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500">
                  Symptoms Identified in Your Input:
                </h3>
                <div className="flex flex-wrap items-center gap-2">
                  {triageResult.symptomsIdentified.map((symptom, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1 rounded-md bg-slate-100 text-slate-800 text-xs sm:text-sm font-medium border border-slate-200"
                    >
                      {symptom}
                    </span>
                  ))}
                </div>
              </div>

              {/* Preliminary Assessment Content (Requirement 4) */}
              <div className="space-y-2 border-t border-slate-100 pt-5">
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Activity className="w-5 h-5 text-teal-600" />
                  Preliminary Informational Assessment
                </h3>
                <div className="text-xs sm:text-sm text-slate-700 leading-relaxed space-y-3 bg-slate-50/70 p-4 rounded-lg border border-slate-200">
                  <p>{triageResult.preliminaryAssessment}</p>
                  <p className="text-xs text-slate-500 italic">
                    Remember: An online tool can never examine your body, run lab tests, or verify vital signs. Please share these findings with a qualified medical professional.
                  </p>
                </div>
              </div>

              {/* Red Flag Warnings */}
              {triageResult.redFlagWarnings && triageResult.redFlagWarnings.length > 0 && (
                <div className="space-y-2.5 border-t border-slate-100 pt-5">
                  <h3 className="text-sm font-bold text-rose-900 flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-rose-600" />
                    Emergency Red Flags to Watch For
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs sm:text-sm">
                    {triageResult.redFlagWarnings.map((warning, idx) => (
                      <div
                        key={idx}
                        className="flex items-start gap-2 p-2.5 rounded-md bg-rose-50/70 border border-rose-100 text-rose-950"
                      >
                        <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                        <span>{warning}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* ---------------------------------------------------------------- */}
            {/* 6. CARE GUIDANCE SECTION (Requirement 5)                         */}
            {/* Categorized by Emergency, Urgent Care, and Routine Care          */}
            {/* ---------------------------------------------------------------- */}
            <div id="care-levels-guide" className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 sm:p-8 space-y-6">
              <div className="space-y-1">
                <div className="text-xs font-medium text-teal-800">
                  Healthcare Navigation System
                </div>
                <h2 className="text-xl font-bold text-slate-900">
                  Care Guidance & Levels Comparison
                </h2>
                <p className="text-xs sm:text-sm text-slate-500">
                  Understand the distinctions between healthcare settings so you know exactly where to go.
                </p>
              </div>

              {/* Filter Tabs for Care Guidance (Zero-pill discipline: segmented control) */}
              <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg max-w-md">
                <button
                  type="button"
                  onClick={() => setActiveCareTab('all')}
                  className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${
                    activeCareTab === 'all'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  All 3 Levels
                </button>
                <button
                  type="button"
                  onClick={() => setActiveCareTab('emergency')}
                  className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${
                    activeCareTab === 'emergency'
                      ? 'bg-white text-rose-900 shadow-xs font-semibold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Emergency
                </button>
                <button
                  type="button"
                  onClick={() => setActiveCareTab('urgent')}
                  className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${
                    activeCareTab === 'urgent'
                      ? 'bg-white text-amber-900 shadow-xs font-semibold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Urgent Care
                </button>
                <button
                  type="button"
                  onClick={() => setActiveCareTab('routine')}
                  className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${
                    activeCareTab === 'routine'
                      ? 'bg-white text-emerald-900 shadow-xs font-semibold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Routine Care
                </button>
              </div>

              {/* 3-Category Breakdown Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* 1. Emergency Care Category */}
                {(activeCareTab === 'all' || activeCareTab === 'emergency') && (
                  <div
                    className={`rounded-xl border p-5 space-y-4 transition-all ${
                      triageResult.suggestedCareLevel === 'emergency'
                        ? 'border-rose-400 bg-rose-50/50 ring-2 ring-rose-200'
                        : 'border-slate-200 bg-white'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs uppercase tracking-wider font-bold text-rose-700">
                          Level 1
                        </span>
                        {triageResult.suggestedCareLevel === 'emergency' && (
                          <span className="text-[11px] font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded">
                            Recommended
                          </span>
                        )}
                      </div>
                      <h3 className="text-lg font-bold text-slate-900 flex items-center gap-1.5">
                        <PhoneCall className="w-4 h-4 text-rose-600" />
                        Emergency Department
                      </h3>
                      <p className="text-xs text-slate-600">
                        {triageResult.careCategories.emergency.definition}
                      </p>
                    </div>

                    <div className="text-xs text-slate-700 space-y-2 border-t border-slate-100 pt-3">
                      <div>
                        <strong>Wait Time:</strong> {triageResult.careCategories.emergency.typicalWaitTime}
                      </div>
                      <div>
                        <strong>Action Guidance:</strong>
                        <p className="mt-0.5 text-slate-600">
                          {triageResult.careCategories.emergency.actionAdvice}
                        </p>
                      </div>
                      <div>
                        <strong>Hallmark Warning Signs:</strong>
                        <ul className="list-disc pl-4 mt-1 space-y-1 text-slate-600">
                          {triageResult.careCategories.emergency.signsToWatch.slice(0, 3).map((sign, i) => (
                            <li key={i}>{sign}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. Urgent Care Category */}
                {(activeCareTab === 'all' || activeCareTab === 'urgent') && (
                  <div
                    className={`rounded-xl border p-5 space-y-4 transition-all ${
                      triageResult.suggestedCareLevel === 'urgent'
                        ? 'border-amber-400 bg-amber-50/50 ring-2 ring-amber-200'
                        : 'border-slate-200 bg-white'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs uppercase tracking-wider font-bold text-amber-700">
                          Level 2
                        </span>
                        {triageResult.suggestedCareLevel === 'urgent' && (
                          <span className="text-[11px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded">
                            Recommended
                          </span>
                        )}
                      </div>
                      <h3 className="text-lg font-bold text-slate-900 flex items-center gap-1.5">
                        <Clock className="w-4 h-4 text-amber-600" />
                        Urgent Care Clinic
                      </h3>
                      <p className="text-xs text-slate-600">
                        {triageResult.careCategories.urgent.definition}
                      </p>
                    </div>

                    <div className="text-xs text-slate-700 space-y-2 border-t border-slate-100 pt-3">
                      <div>
                        <strong>Wait Time:</strong> {triageResult.careCategories.urgent.typicalWaitTime}
                      </div>
                      <div>
                        <strong>Action Guidance:</strong>
                        <p className="mt-0.5 text-slate-600">
                          {triageResult.careCategories.urgent.actionAdvice}
                        </p>
                      </div>
                      <div>
                        <strong>Common Conditions Treated:</strong>
                        <ul className="list-disc pl-4 mt-1 space-y-1 text-slate-600">
                          {triageResult.careCategories.urgent.signsToWatch.slice(0, 3).map((sign, i) => (
                            <li key={i}>{sign}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}

                {/* 3. Routine Care Category */}
                {(activeCareTab === 'all' || activeCareTab === 'routine') && (
                  <div
                    className={`rounded-xl border p-5 space-y-4 transition-all ${
                      triageResult.suggestedCareLevel === 'routine'
                        ? 'border-emerald-400 bg-emerald-50/50 ring-2 ring-emerald-200'
                        : 'border-slate-200 bg-white'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs uppercase tracking-wider font-bold text-emerald-700">
                          Level 3
                        </span>
                        {triageResult.suggestedCareLevel === 'routine' && (
                          <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
                            Recommended
                          </span>
                        )}
                      </div>
                      <h3 className="text-lg font-bold text-slate-900 flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        Routine Primary Care
                      </h3>
                      <p className="text-xs text-slate-600">
                        {triageResult.careCategories.routine.definition}
                      </p>
                    </div>

                    <div className="text-xs text-slate-700 space-y-2 border-t border-slate-100 pt-3">
                      <div>
                        <strong>Wait Time:</strong> {triageResult.careCategories.routine.typicalWaitTime}
                      </div>
                      <div>
                        <strong>Action Guidance:</strong>
                        <p className="mt-0.5 text-slate-600">
                          {triageResult.careCategories.routine.actionAdvice}
                        </p>
                      </div>
                      <div>
                        <strong>Appropriate Situations:</strong>
                        <ul className="list-disc pl-4 mt-1 space-y-1 text-slate-600">
                          {triageResult.careCategories.routine.signsToWatch.slice(0, 3).map((sign, i) => (
                            <li key={i}>{sign}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Questions for Doctor & Self-Care Guidance */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Doctor Questions Card */}
              <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-3 shadow-xs">
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <FileQuestion className="w-5 h-5 text-teal-600" />
                  Helpful Questions for Your Doctor
                </h3>
                <p className="text-xs text-slate-500">
                  Bring these questions to your consultation to get the most out of your visit:
                </p>
                <ul className="space-y-2 pt-1">
                  {triageResult.suggestedQuestionsForDoctor.map((q, idx) => (
                    <li key={idx} className="text-xs sm:text-sm text-slate-700 flex items-start gap-2">
                      <ChevronRight className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
                      <span>{q}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Supportive Self-Care Card */}
              <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-3 shadow-xs">
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <HeartPulse className="w-5 h-5 text-teal-600" />
                  Supportive Measures & Tracking
                </h3>
                <p className="text-xs text-slate-500">
                  General non-medicinal steps to stay comfortable while awaiting care:
                </p>
                <ul className="space-y-2 pt-1">
                  {triageResult.selfCareMeasures.map((measure, idx) => (
                    <li key={idx} className="text-xs sm:text-sm text-slate-700 flex items-start gap-2">
                      <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <span>{measure}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </section>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* 7. EDUCATIONAL GUIDES & HOW IT WORKS                               */}
        {/* ------------------------------------------------------------------ */}
        <section id="how-it-works" className="bg-white rounded-xl border border-slate-200 p-6 sm:p-8 space-y-6">
          <div className="space-y-1">
            <div className="text-xs font-medium text-teal-800">
              Clinical Knowledge Base
            </div>
            <h2 className="text-xl font-bold text-slate-900">
              How Clinical Triage Works
            </h2>
            <p className="text-xs sm:text-sm text-slate-500">
              In medical practice, triage (from the French verb <em>trier</em>, meaning &ldquo;to sort&rdquo;) is the process of determining the priority of patients&apos; treatments based on the severity of their condition.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
            <div className="space-y-2 p-4 rounded-lg bg-slate-50 border border-slate-200">
              <div className="text-xs font-mono font-bold text-teal-700">01. Extract Symptoms</div>
              <h4 className="text-sm font-bold text-slate-900">Symptom Identification</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Natural language processing scans your description to isolate specific sensations, timing, locations, and aggravating factors.
              </p>
            </div>
            <div className="space-y-2 p-4 rounded-lg bg-slate-50 border border-slate-200">
              <div className="text-xs font-mono font-bold text-teal-700">02. Rule Out Emergencies</div>
              <h4 className="text-sm font-bold text-slate-900">Red Flag Screening</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Critical life-threatening markers (airway compromise, stroke signs, cardiac symptoms) are prioritized above all else.
              </p>
            </div>
            <div className="space-y-2 p-4 rounded-lg bg-slate-50 border border-slate-200">
              <div className="text-xs font-mono font-bold text-teal-700">03. Route to Care</div>
              <h4 className="text-sm font-bold text-slate-900">Appropriate Care Guidance</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Aligns your case with the safest healthcare facility to save you time, reduce emergency room overcrowding, and ensure quick relief.
              </p>
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------------------ */}
        {/* 8. SAFETY, PRIVACY & COMPLIANCE SECTION                            */}
        {/* ------------------------------------------------------------------ */}
        <section id="privacy-disclaimer" className="bg-slate-100 rounded-xl border border-slate-200 p-6 sm:p-8 space-y-4">
          <div className="flex items-center gap-2 text-slate-900 font-bold text-base">
            <Info className="w-5 h-5 text-teal-700" />
            Medical Disclaimer & Educational Purpose
          </div>
          <div className="text-xs sm:text-sm text-slate-700 space-y-2 leading-relaxed">
            <p>
              The <strong>AI Symptom Checker and Triage Tool</strong> is created for educational and informational purposes only. It is intended to help students, developers, and patients understand how healthcare triage protocols categorize urgency.
            </p>
            <p>
              This tool does not provide medical diagnosis, prognosis, treatment advice, or prescriptions. Information provided by this tool must never be used to delay seeking professional medical evaluation from a physician or other licensed healthcare professional.
            </p>
            <p>
              Always consult your doctor or call emergency services (911) if you experience severe pain, difficulty breathing, allergic reactions, chest discomfort, or other serious symptoms.
            </p>
          </div>
        </section>
      </main>

      {/* -------------------------------------------------------------------- */}
      {/* 9. FOOTER                                                            */}
      {/* -------------------------------------------------------------------- */}
      <footer className="bg-white border-t border-slate-200 py-6 px-4 sm:px-8 text-xs text-slate-500">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <HeartPulse className="w-4 h-4 text-teal-600" />
            <span className="font-semibold text-slate-800">AI Symptom Checker and Triage Tool</span>
            <span aria-hidden="true">·</span>
            <span>Educational Edition</span>
          </div>
          <div>
            Educational healthcare tool · Not a substitute for professional medical care
          </div>
        </div>
      </footer>
    </div>
  );
}
