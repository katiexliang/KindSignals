"""Pydantic v2 schemas for request/response bodies.

These mirror the ORM models and keep NULL/optional semantics explicit so that
missing data is represented as `None`, never as a default value.
"""

from __future__ import annotations

from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field, computed_field

# --- Users -----------------------------------------------------------------


DIAGNOSIS_CHOICES = ("none", "pcos_pmos")
CONTRACEPTION_CHOICES = (
    "none", "pill", "iud", "implant", "ring", "patch", "injection", "other"
)


def _age_from_birthdate(bd: date | None) -> int | None:
    if bd is None:
        return None
    today = date.today()
    years = today.year - bd.year - ((today.month, today.day) < (bd.month, bd.day))
    return years if years >= 0 else None


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: str | None = None
    name: str
    birthdate: date | None = None
    diagnosis: str | None = None
    contraception_method: str | None = None
    onboarding_complete: bool = False
    is_demo: bool

    @computed_field  # age is always derived from birthdate, never stored
    @property
    def age(self) -> int | None:
        return _age_from_birthdate(self.birthdate)


class UserUpdate(BaseModel):
    """Editable profile fields. Only provided fields are updated (partial).

    Age is not editable directly — it is derived from `birthdate`.
    `diagnosis` must be one of DIAGNOSIS_CHOICES; `contraception_method` one of
    CONTRACEPTION_CHOICES.
    """

    name: str | None = Field(default=None, min_length=1, max_length=120)
    birthdate: date | None = None
    diagnosis: str | None = Field(default=None, max_length=40)
    contraception_method: str | None = Field(default=None, max_length=40)
    onboarding_complete: bool | None = None


class ConnectedSource(BaseModel):
    """A data source/integration surfaced in the profile's Connected apps."""

    key: str
    name: str
    category: str  # "wearable" | "ai"
    status: str  # human-readable connection status
    is_synthetic: bool
    detail: str


class ConnectedSources(BaseModel):
    sources: list[ConnectedSource]


# --- Auth ------------------------------------------------------------------


class SignupRequest(BaseModel):
    email: str = Field(min_length=3, max_length=255)
    password: str = Field(min_length=6, max_length=200)
    name: str | None = Field(default=None, max_length=120)


class LoginRequest(BaseModel):
    email: str = Field(min_length=3, max_length=255)
    password: str = Field(min_length=1, max_length=200)


class OnboardingRequest(BaseModel):
    """Collected right after signup, before the dashboard."""

    name: str | None = Field(default=None, max_length=120)
    birthdate: date | None = None
    diagnosis: str = Field(default="none", max_length=40)
    contraception_method: str = Field(default="none", max_length=40)
    connect_whoop: bool = False
    connect_health: bool = False


class AuthResponse(BaseModel):
    token: str
    user: "UserOut"


# --- Connections (grant-permission data sources) ---------------------------


class ProviderInfo(BaseModel):
    """A data-source provider the user can connect, with its grant status."""

    provider: str  # "whoop" | "apple_health" | "samsung_health"
    name: str
    status: str  # "connected" | "not_connected" | "coming_soon"
    is_synthetic: bool
    connectable: bool  # whether Connect is available in this build
    detail: str


class ProvidersResponse(BaseModel):
    providers: list[ProviderInfo]


# --- Daily metrics ---------------------------------------------------------


class DailyMetricOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    date: date
    recovery_score: float | None = None
    resting_hr: float | None = None
    hrv_ms: float | None = None
    sleep_duration_min: float | None = None
    sleep_efficiency_pct: float | None = None
    strain: float | None = None
    source: str
    is_synthetic: bool


# --- Journal ---------------------------------------------------------------


class JournalEntryBase(BaseModel):
    """Shared journal fields. Every field is optional on purpose.

    An omitted field is stored as NULL (not reported), never as zero.
    """

    date: date
    menstrual_flow: str | None = None
    cycle_notes: str | None = None
    contraception: str | None = Field(default=None, max_length=40)
    fatigue: int | None = Field(default=None, ge=0, le=5)
    mood: int | None = Field(default=None, ge=0, le=5)
    stress: int | None = Field(default=None, ge=0, le=5)
    acne: int | None = Field(default=None, ge=0, le=5)
    sleep_quality: int | None = Field(default=None, ge=0, le=5)
    other_symptoms: str | None = None
    lifestyle_factors: str | None = None
    medication_context: str | None = None


class JournalEntryCreate(JournalEntryBase):
    """Payload for creating a journal entry.

    No-diagnosis users (who may not have a connected wearable) can also enter
    their wearable readings manually here. When present, these are saved as the
    day's DailyMetric so the dashboard, insights, and calendars pick them up.
    Diagnosed users leave these blank — their wearable data is pulled
    automatically from the connected device.
    """

    recovery_score: float | None = Field(default=None, ge=0, le=100)
    resting_hr: float | None = Field(default=None, ge=20, le=220)
    hrv_ms: float | None = Field(default=None, ge=0, le=400)
    sleep_duration_min: float | None = Field(default=None, ge=0, le=1440)
    sleep_efficiency_pct: float | None = Field(default=None, ge=0, le=100)
    strain: float | None = Field(default=None, ge=0, le=21)


class JournalEntryOut(JournalEntryBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    is_synthetic: bool
    created_at: datetime


# --- Metrics summary / trends ----------------------------------------------


class MetricStat(BaseModel):
    """Latest value and personal baseline for a single metric.

    `latest` and `baseline` may be None when there is insufficient data.
    All stats exclude missing days (they are never counted as zero).
    """

    key: str
    label: str
    unit: str | None = None
    latest: float | None = None
    latest_date: date | None = None
    baseline: float | None = None  # mean over the available window
    min: float | None = None
    max: float | None = None
    sample_size: int  # number of non-null days used
    coverage_pct: float  # non-null days / total days in window


class RecentSymptom(BaseModel):
    """A recently reported symptom value (only reported values appear)."""

    date: date
    label: str
    value: int | None = None
    display: str


class MetricsSummary(BaseModel):
    user: "UserOut"
    source_label: str
    is_synthetic: bool
    window_start: date | None = None
    window_end: date | None = None
    total_days: int
    stats: list[MetricStat]
    recent_symptoms: list[RecentSymptom]


class TrendPoint(BaseModel):
    """One day of a trend series. `value` is None for a gap (not zero)."""

    date: date
    value: float | None = None


class TrendSeries(BaseModel):
    key: str
    label: str
    unit: str | None = None
    baseline: float | None = None
    points: list[TrendPoint]


class MetricsTrends(BaseModel):
    source_label: str
    is_synthetic: bool
    series: list[TrendSeries]


# --- Insights --------------------------------------------------------------


class TrendInsight(BaseModel):
    """A descriptive longitudinal trend for one metric."""

    metric_key: str
    metric_label: str
    unit: str | None = None
    direction: str  # "rising" | "falling" | "stable" | "insufficient data"
    change_per_week: float | None = None  # slope * 7, in metric units
    baseline: float | None = None
    sample_size: int
    coverage_pct: float
    window_start: date | None = None
    window_end: date | None = None
    low_confidence: bool
    description: str  # plain-language, non-causal
    # --- Richer detail (populated for the expandable insight view) ---
    measures: str = ""  # what this metric measures
    relevance: str = ""  # why it matters for the user's diagnosis / management
    avg_week: float | None = None  # mean over the last 7 covered days
    avg_month: float | None = None  # mean over the last 30 covered days
    avg_year: float | None = None  # mean over the last 365 covered days (all data)
    recommendations: list["InsightRecommendation"] = []


class InsightRecommendation(BaseModel):
    """A general, non-prescriptive suggestion, traceable to curated research."""

    text: str
    citation_id: str | None = None
    citation_label: str | None = None


class AssociationInsight(BaseModel):
    """A descriptive relationship between a symptom and a metric."""

    symptom_key: str
    symptom_label: str
    metric_key: str
    metric_label: str
    correlation: float | None = None  # Pearson r on paired non-null days
    strength: str  # "weak" | "moderate" | "strong" | "none" | "insufficient data"
    direction: str  # "negative" | "positive" | "none"
    sample_size: int  # paired non-null days
    coverage_pct: float
    window_start: date | None = None
    window_end: date | None = None
    low_confidence: bool
    description: str  # plain-language, explicitly non-causal
    uncertainty_note: str


class InsightsResponse(BaseModel):
    source_label: str
    is_synthetic: bool
    disclaimer: str
    trends: list[TrendInsight]


class DayInsight(BaseModel):
    """A short, descriptive insight for a single day, from that day's data."""

    date: date
    has_metrics: bool
    has_journal: bool
    headline: str  # one-line plain-language takeaway
    details: list[str]  # supporting descriptive lines (never causal)


class DayInsightsResponse(BaseModel):
    source_label: str
    is_synthetic: bool
    days: list[DayInsight]
    disclaimer: str


class SignalConnection(BaseModel):
    """How one wearable signal relates to PCOS/PMOS, framed by the user's data."""

    metric_key: str
    metric_label: str
    your_trend: str  # plain description of the user's own trend
    pcos_connection: str  # descriptive link to PCOS/PMOS (non-causal)


class SignalsSummary(BaseModel):
    diagnosis: str  # "pcos_pmos" | "none"
    intro: str
    connections: list[SignalConnection]
    citations: list["BuddyCitation"]
    disclaimer: str


# --- PMOS Buddy ------------------------------------------------------------


class BuddyCitation(BaseModel):
    id: str
    title: str
    authors: str
    year: int
    source: str
    summary: str
    url: str


class BuddyTurn(BaseModel):
    """One prior message in the conversation (for multi-turn memory)."""

    role: str  # "user" | "signals"
    text: str = Field(max_length=4000)


class BuddyAsk(BaseModel):
    question: str = Field(min_length=1, max_length=1000)
    # Recent prior turns (oldest first) so follow-ups have context.
    history: list[BuddyTurn] = Field(default_factory=list, max_length=20)


class BuddyResponse(BaseModel):
    provider: str  # which provider generated the answer
    question: str
    greeting: str = ""  # short, personalized opener
    personal_observations: list[str]  # grounded in the user's own data
    scientific_evidence: list[str]  # each traces to a citation (plain language)
    uncertainty: list[str]  # limitations / what data can't tell us
    consider_next: list[str]  # low-risk things the user could consider next
    clinician_questions: list[str]  # questions to bring to a clinician
    citations: list[BuddyCitation]
    safety_level: str = "ok"  # "ok" | "urgent" | "mental_health" | "clinical"
    safety_message: str = ""  # escalation / caution text when safety_level != ok
    disclaimer: str
