// Shared TypeScript types mirroring backend schemas.
// Expanded as feature endpoints are added.

export interface HealthStatus {
  status: string;
  service: string;
  version: string;
  timestamp: string;
  demo_mode: boolean;
}

export const DIAGNOSIS_CHOICES = ["none", "pcos_pmos"] as const;
export type Diagnosis = (typeof DIAGNOSIS_CHOICES)[number];

export const CONTRACEPTION_CHOICES = [
  "none",
  "pill",
  "iud",
  "implant",
  "ring",
  "patch",
  "injection",
  "other",
] as const;
export type Contraception = (typeof CONTRACEPTION_CHOICES)[number];

export interface UserOut {
  id: number;
  email: string | null;
  name: string;
  birthdate: string | null;
  diagnosis: string | null;
  contraception_method: string | null;
  onboarding_complete: boolean;
  age: number | null; // derived server-side from birthdate
  is_demo: boolean;
}

export interface UserUpdate {
  name?: string | null;
  birthdate?: string | null;
  diagnosis?: string | null;
  contraception_method?: string | null;
  onboarding_complete?: boolean | null;
}

export interface ConnectedSource {
  key: string;
  name: string;
  category: "wearable" | "ai" | string;
  status: string;
  is_synthetic: boolean;
  detail: string;
}

export interface ConnectedSources {
  sources: ConnectedSource[];
}

export interface MetricStat {
  key: string;
  label: string;
  unit: string | null;
  latest: number | null;
  latest_date: string | null;
  baseline: number | null;
  min: number | null;
  max: number | null;
  sample_size: number;
  coverage_pct: number;
}

export interface RecentSymptom {
  date: string;
  label: string;
  value: number | null;
  display: string;
}

export interface MetricsSummary {
  user: UserOut;
  source_label: string;
  is_synthetic: boolean;
  window_start: string | null;
  window_end: string | null;
  total_days: number;
  stats: MetricStat[];
  recent_symptoms: RecentSymptom[];
}

export interface TrendPoint {
  date: string;
  value: number | null;
}

export interface TrendSeries {
  key: string;
  label: string;
  unit: string | null;
  baseline: number | null;
  points: TrendPoint[];
}

export interface DayInsight {
  date: string;
  has_metrics: boolean;
  has_journal: boolean;
  headline: string;
  details: string[];
}

export interface DayInsightsResponse {
  source_label: string;
  is_synthetic: boolean;
  days: DayInsight[];
  disclaimer: string;
}

export interface MetricsTrends {
  source_label: string;
  is_synthetic: boolean;
  series: TrendSeries[];
}

export interface JournalEntryInput {
  date: string;
  menstrual_flow?: string | null;
  cycle_notes?: string | null;
  contraception?: string | null;
  // Manual wearable readings (no-diagnosis users without a connected device).
  recovery_score?: number | null;
  resting_hr?: number | null;
  hrv_ms?: number | null;
  sleep_duration_min?: number | null;
  sleep_efficiency_pct?: number | null;
  strain?: number | null;
  fatigue?: number | null;
  mood?: number | null;
  stress?: number | null;
  acne?: number | null;
  sleep_quality?: number | null;
  other_symptoms?: string | null;
  lifestyle_factors?: string | null;
  medication_context?: string | null;
}

export interface JournalEntry extends JournalEntryInput {
  id: number;
  is_synthetic: boolean;
  created_at: string;
}

export interface TrendInsight {
  metric_key: string;
  metric_label: string;
  unit: string | null;
  direction: string;
  change_per_week: number | null;
  baseline: number | null;
  sample_size: number;
  coverage_pct: number;
  window_start: string | null;
  window_end: string | null;
  low_confidence: boolean;
  description: string;
  measures: string;
  relevance: string;
  avg_week: number | null;
  avg_month: number | null;
  avg_year: number | null;
  recommendations: InsightRecommendation[];
}

export interface InsightRecommendation {
  text: string;
  citation_id: string | null;
  citation_label: string | null;
}

export interface AssociationInsight {
  symptom_key: string;
  symptom_label: string;
  metric_key: string;
  metric_label: string;
  correlation: number | null;
  strength: string;
  direction: string;
  sample_size: number;
  coverage_pct: number;
  window_start: string | null;
  window_end: string | null;
  low_confidence: boolean;
  description: string;
  uncertainty_note: string;
}

export interface InsightsResponse {
  source_label: string;
  is_synthetic: boolean;
  disclaimer: string;
  trends: TrendInsight[];
}

export interface BuddyCitation {
  id: string;
  title: string;
  authors: string;
  year: number;
  source: string;
  summary: string;
  url: string;
}

export interface BuddyResponse {
  provider: string;
  question: string;
  greeting: string;
  personal_observations: string[];
  scientific_evidence: string[];
  uncertainty: string[];
  consider_next: string[];
  clinician_questions: string[];
  citations: BuddyCitation[];
  safety_level: string;
  safety_message: string;
  disclaimer: string;
}

// --- Auth ---
export interface SignupRequest {
  email: string;
  password: string;
  name?: string | null;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user: UserOut;
}

export interface OnboardingRequest {
  name?: string | null;
  birthdate?: string | null;
  diagnosis: string;
  contraception_method: string;
  connect_whoop: boolean;
  connect_health: boolean;
}

// --- Connections (grant-permission data sources) ---
export interface ProviderInfo {
  provider: string; // whoop | apple_health | samsung_health
  name: string;
  status: "connected" | "not_connected" | "coming_soon" | string;
  is_synthetic: boolean;
  connectable: boolean;
  detail: string;
}

export interface ProvidersResponse {
  providers: ProviderInfo[];
}

export interface SignalConnection {
  metric_key: string;
  metric_label: string;
  your_trend: string;
  pcos_connection: string;
}

export interface SignalsSummary {
  diagnosis: string;
  intro: string;
  connections: SignalConnection[];
  citations: BuddyCitation[];
  disclaimer: string;
}
