"""Curated, verifiable research library for PMOS (clinically known as PCOS).

PMOS is the KindSignals product name for the condition clinically referred to as
Polycystic Ovary Syndrome (PCOS). The references below are real, authoritative,
publicly citable sources. PMOS Buddy may ONLY cite entries from this list and
MUST NOT fabricate references or overstate what a source says.

Each entry's `summary` is a conservative, plain-language paraphrase of
well-established points from the cited source. Topics let Buddy retrieve the
most relevant references for a user's question.
"""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class Reference:
    id: str
    title: str
    authors: str
    year: int
    source: str
    summary: str
    url: str
    topics: tuple[str, ...]


RESEARCH_LIBRARY: list[Reference] = [
    Reference(
        id="teede2023",
        title=(
            "Recommendations from the 2023 International Evidence-based Guideline "
            "for the Assessment and Management of Polycystic Ovary Syndrome"
        ),
        authors="Teede HJ, Tay CT, Laven J, et al.",
        year=2023,
        source="Journal of Clinical Endocrinology & Metabolism / Fertility and Sterility",
        summary=(
            "International evidence-based guideline covering diagnosis and "
            "management of PCOS. It emphasizes an individualized approach and the "
            "role of lifestyle, and notes PCOS is associated with metabolic, "
            "reproductive, and psychological features."
        ),
        url="https://doi.org/10.1210/clinem/dgad463",
        topics=("diagnosis", "management", "overview", "lifestyle", "guideline"),
    ),
    Reference(
        id="niche-pcos",
        title="Polycystic Ovary Syndrome (PCOS) — Health Information",
        authors="National Institute of Child Health and Human Development (NICHD)",
        year=2022,
        source="U.S. National Institutes of Health (NICHD)",
        summary=(
            "Consumer-health overview of PCOS describing common features such as "
            "irregular menstrual cycles, signs of elevated androgens, and "
            "polycystic ovaries, and noting associations with insulin resistance."
        ),
        url="https://www.nichd.nih.gov/health/topics/pcos",
        topics=("overview", "symptoms", "menstrual", "androgen", "insulin"),
    ),
    Reference(
        id="cooney2017",
        title=(
            "High prevalence of moderate and severe depressive and anxiety "
            "symptoms in polycystic ovary syndrome: a systematic review and "
            "meta-analysis"
        ),
        authors="Cooney LG, Lee I, Sammel MD, Dokras A",
        year=2017,
        source="Human Reproduction",
        summary=(
            "Systematic review and meta-analysis reporting that depressive and "
            "anxiety symptoms are more common among people with PCOS than without, "
            "supporting attention to mental and emotional wellbeing."
        ),
        url="https://doi.org/10.1093/humrep/dex044",
        topics=("mood", "mental health", "anxiety", "depression", "stress"),
    ),
    Reference(
        id="fernandez2018",
        title=(
            "Sleep disturbances in women with polycystic ovary syndrome: "
            "prevalence, pathophysiology, impact and management strategies"
        ),
        authors="Fernandez RC, Moore VM, Van Ryswyk EM, et al.",
        year=2018,
        source="Nature and Science of Sleep",
        summary=(
            "Review describing that sleep disturbances, including a higher risk of "
            "obstructive sleep apnea, are reported more often in PCOS, and that "
            "sleep is relevant to overall metabolic and emotional health."
        ),
        url="https://doi.org/10.2147/NSS.S127475",
        topics=("sleep", "fatigue", "recovery", "metabolic"),
    ),
    Reference(
        id="patten2020",
        title=(
            "Exercise interventions in polycystic ovary syndrome: a systematic "
            "review and meta-analysis"
        ),
        authors="Patten RK, Boyle RA, Moholdt T, et al.",
        year=2020,
        source="Frontiers in Physiology",
        summary=(
            "Systematic review indicating that structured exercise is associated "
            "with improvements in several cardiometabolic measures in PCOS; "
            "general physical activity is a commonly recommended lifestyle factor."
        ),
        url="https://doi.org/10.3389/fphys.2020.00606",
        topics=("exercise", "strain", "lifestyle", "metabolic", "management"),
    ),
]


def find_references(topics: list[str], limit: int = 3) -> list[Reference]:
    """Return references whose topics best match the requested topics.

    Falls back to the general overview/guideline entries when nothing matches,
    so Buddy always has a real, relevant citation to point to.
    """
    wanted = {t.lower() for t in topics}
    scored: list[tuple[int, Reference]] = []
    for ref in RESEARCH_LIBRARY:
        score = len(wanted.intersection(ref.topics))
        if score:
            scored.append((score, ref))
    scored.sort(key=lambda s: s[0], reverse=True)
    if scored:
        return [ref for _, ref in scored[:limit]]
    # Fallback: the overview guideline first.
    return [RESEARCH_LIBRARY[0]][:limit]


def get_by_id(ref_id: str) -> Reference | None:
    return next((r for r in RESEARCH_LIBRARY if r.id == ref_id), None)
