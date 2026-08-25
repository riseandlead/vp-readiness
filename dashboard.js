const API_BASE =
  "https://riselead-prospect-api.leadrize.workers.dev";

let prospects = [];
let selectedId = null;


/* =========================================
   INITIALIZE
========================================= */

document.addEventListener("DOMContentLoaded", () => {

  document
    .getElementById("refreshBtn")
    .addEventListener("click", loadProspects);

  document
    .getElementById("apiBtn")
    .addEventListener("click", () => {
      window.open(
        `${API_BASE}/prospects`,
        "_blank",
        "noopener,noreferrer"
      );
    });

  document
    .getElementById("searchInput")
    .addEventListener("input", renderList);

  document
    .getElementById("scoreFilter")
    .addEventListener("change", renderList);

  document
    .getElementById("statusFilter")
    .addEventListener("change", renderList);

  loadProspects();

});


/* =========================================
   LOAD ALL PROSPECTS
========================================= */

async function loadProspects() {

  showError("");

  document.getElementById("prospectList").innerHTML =
    `<div class="loading">Loading prospects...</div>`;

  try {

    const response = await fetch(
      `${API_BASE}/prospects`,
      {
        method: "GET",
        headers: {
          "Accept": "application/json"
        }
      }
    );

    const data = await response.json();

    if (!response.ok || !data.success) {

      throw new Error(
        data.error ||
        `API returned ${response.status}`
      );

    }

    prospects =
      Array.isArray(data.prospects)
        ? data.prospects
        : [];

    updateStats();

    renderList();

    if (prospects.length === 0) {

      renderEmpty(
        "No prospects yet",
        "Complete an assessment and submit it to see the prospect here."
      );

      return;
    }

    if (selectedId) {

      const exists =
        prospects.some(
          prospect =>
            prospect.id === selectedId
        );

      if (exists) {

        selectProspect(
          selectedId,
          false
        );

      } else {

        selectedId = null;

        selectProspect(
          prospects[0].id,
          false
        );

      }

    } else {

      selectProspect(
        prospects[0].id,
        false
      );

    }

  } catch (error) {

    console.error(
      "Dashboard error:",
      error
    );

    showError(
      "Unable to load prospects. " +
      (error.message ||
        "Check the Worker URL and CORS settings.")
    );

    document.getElementById(
      "prospectList"
    ).innerHTML =
      `<div class="loading">
        Unable to load prospects.
      </div>`;

    renderEmpty(
      "Dashboard unavailable",
      "Check your Worker deployment and refresh the page."
    );

  }

}


/* =========================================
   DASHBOARD STATS
========================================= */

function updateStats() {

  const total =
    prospects.length;

  const high =
    prospects.filter(
      p =>
        Number(p.score || 0) >= 80
    ).length;

  const average =
    total
      ? Math.round(
          prospects.reduce(
            (sum, p) =>
              sum +
              Number(p.score || 0),
            0
          ) / total
        )
      : 0;

  const newLeads =
    prospects.filter(
      p =>
        String(
          p.status || ""
        ).toUpperCase() === "NEW"
    ).length;

  document.getElementById(
    "totalStat"
  ).textContent = total;

  document.getElementById(
    "highStat"
  ).textContent = high;

  document.getElementById(
    "averageStat"
  ).textContent =
    total ? average : "—";

  document.getElementById(
    "newStat"
  ).textContent = newLeads;

}


/* =========================================
   FILTER + SEARCH
========================================= */

function renderList() {

  const search =
    document
      .getElementById("searchInput")
      .value
      .trim()
      .toLowerCase();

  const scoreFilter =
    document.getElementById(
      "scoreFilter"
    ).value;

  const statusFilter =
    document.getElementById(
      "statusFilter"
    ).value;


  const filtered =
    prospects.filter(prospect => {

      const score =
        Number(
          prospect.score || 0
        );

      const searchable = [
        prospect.name,
        prospect.email,
        prospect.current_role,
        prospect.target_role,
        prospect.primary_challenge,
        prospect.transition,
        prospect.profile,
        prospect.source,
        prospect.campaign
      ]
        .map(
          value =>
            String(value || "")
              .toLowerCase()
        )
        .join(" ");

      if (
        search &&
        !searchable.includes(search)
      ) {
        return false;
      }

      if (
        scoreFilter === "high" &&
        score < 80
      ) {
        return false;
      }

      if (
        scoreFilter === "medium" &&
        (score < 60 || score >= 80)
      ) {
        return false;
      }

      if (
        scoreFilter === "low" &&
        score >= 60
      ) {
        return false;
      }

      if (
        statusFilter !== "all" &&
        String(
          prospect.status || ""
        ).toUpperCase() !==
          statusFilter
      ) {
        return false;
      }

      return true;

    });


  document.getElementById(
    "listCount"
  ).textContent =
    `${filtered.length} shown`;


  if (!filtered.length) {

    document.getElementById(
      "prospectList"
    ).innerHTML =
      `<div class="loading">
        No prospects match the current filters.
      </div>`;

    return;
  }


  document.getElementById(
    "prospectList"
  ).innerHTML =
    filtered
      .map(
        createProspectCard
      )
      .join("");


  document
    .querySelectorAll(
      "[data-prospect-id]"
    )
    .forEach(card => {

      card.addEventListener(
        "click",
        () => {

          selectProspect(
            card.dataset
              .prospectId
          );

        }
      );

    });

}


/* =========================================
   PROSPECT CARD
========================================= */

function createProspectCard(
  prospect
) {

  const score =
    Number(
      prospect.score || 0
    );

  const scoreClass =
    getScoreClass(score);

  const priority =
    getPriority(score);

  const active =
    prospect.id === selectedId
      ? "active"
      : "";


  return `

    <div
      class="prospect ${active}"
      data-prospect-id="${escapeAttr(
        prospect.id
      )}"
    >

      <div class="prospect-row">

        <div>

          <div class="prospect-name">
            ${escapeHtml(
              prospect.name ||
              "Unnamed Prospect"
            )}
          </div>

          <div class="prospect-email">
            ${escapeHtml(
              prospect.email ||
              "No email"
            )}
          </div>

        </div>


        <div class="score ${scoreClass}">
          ${score}
        </div>

      </div>


      <div class="tags">

        <span class="tag">
          ${escapeHtml(
            prospect.profile ||
            "Assessment"
          )}
        </span>

        <span class="tag">
          ${priority}
        </span>

        <span class="tag">
          ${escapeHtml(
            prospect.status ||
            "NEW"
          )}
        </span>

      </div>

    </div>

  `;

}


/* =========================================
   LOAD SINGLE PROSPECT
========================================= */

async function selectProspect(
  id,
  scroll = true
) {

  selectedId = id;

  renderList();


  const localProspect =
    prospects.find(
      prospect =>
        prospect.id === id
    );


  if (localProspect) {

    renderDetail(
      localProspect,
      true
    );

  }


  try {

    const response =
      await fetch(
        `${API_BASE}/prospects/${encodeURIComponent(
          id
        )}`,
        {
          method: "GET",
          headers: {
            "Accept":
              "application/json"
          }
        }
      );


    const data =
      await response.json();


    if (
      !response.ok ||
      !data.success
    ) {

      throw new Error(
        data.error ||
        "Unable to retrieve prospect."
      );

    }


    renderDetail(
      data.prospect,
      false
    );


    if (
      scroll &&
      window.innerWidth <= 1050
    ) {

      document
        .getElementById(
          "detailPanel"
        )
        .scrollIntoView({
          behavior: "smooth",
          block: "start"
        });

    }

  } catch (error) {

    console.error(
      "Prospect detail error:",
      error
    );

    if (!localProspect) {

      renderEmpty(
        "Prospect unavailable",
        error.message
      );

    }

  }

}


/* =========================================
   DETAIL VIEW
========================================= */

function renderDetail(
  prospect,
  loading = false
) {

  if (!prospect) {

    renderEmpty();

    return;

  }


  const score =
    Number(
      prospect.score || 0
    );


  const dimensions =
    parseDimensions(
      prospect.dimensions
    );


  const intelligence =
    calculateIntelligence(
      prospect,
      dimensions,
      score
    );


  document.getElementById(
    "detailPanel"
  ).innerHTML = `

    <div class="detail-header">

      <div>

        <div class="eyebrow">
          Executive Assessment
        </div>

        <div class="detail-name">
          ${escapeHtml(
            prospect.name ||
            "Unnamed Prospect"
          )}
        </div>

        <div class="detail-email">
          ${escapeHtml(
            prospect.email ||
            "No email"
          )}
        </div>


        <div class="tags">

          <span class="tag">
            ${escapeHtml(
              prospect.profile ||
              "Assessment"
            )}
          </span>

          <span class="tag">
            ${escapeHtml(
              prospect.status ||
              "NEW"
            )}
          </span>

          <span class="tag">
            ${escapeHtml(
              prospect.source ||
              "unknown"
            )}
          </span>

        </div>

      </div>


      <div>

        <div class="score-big">
          ${score}
        </div>

        <div
          style="
            color:#94a3b8;
            font-size:11px;
            text-align:right;
          "
        >
          / 100
        </div>

        <div class="priority">
          ${intelligence.priority}
        </div>

      </div>

    </div>


    <div class="section">

      <div class="section-title">
        Assessment Context
      </div>


      <div class="info-grid">

        ${info(
          "Current Role",
          prospect.current_role
        )}

        ${info(
          "Target Role",
          prospect.target_role
        )}

        ${info(
          "Primary Challenge",
          prospect.primary_challenge
        )}

        ${info(
          "Transition",
          prospect.transition
        )}

        ${info(
          "Campaign",
          prospect.campaign
        )}

        ${info(
          "Captured",
          formatDate(
            prospect.created_at
          )
        )}

      </div>

    </div>


    <div class="section">

      <div class="section-title">
        Executive Intelligence
      </div>


      <div class="insights">

        ${insightCard(
          "Strongest Dimension",
          intelligence.strongest
        )}

        ${insightCard(
          "Biggest Gap",
          intelligence.weakest
        )}

        ${insightCard(
          "Recommended Angle",
          intelligence.angle
        )}

      </div>

    </div>


    <div class="section">

      <div class="section-title">
        Dimension Scores
      </div>


      ${
        dimensions.length

          ? dimensions
              .map(
                createDimension
              )
              .join("")

          : `
            <div class="recommendation">
              No dimension data was saved
              with this assessment.
            </div>
          `
      }

    </div>


    <div class="section">

      <div class="section-title">
        Coaching Opportunity
      </div>


      <div class="recommendation">

        <strong>
          ${escapeHtml(
            intelligence
              .coachingTitle
          )}
        </strong>

        <br /><br />

        ${escapeHtml(
          intelligence
            .coachingText
        )}

      </div>

    </div>


    <div class="section">

      <div class="section-title">
        Contact & Record
      </div>


      <div class="info-grid">

        ${info(
          "Phone",
          prospect.full_phone ||
          prospect.phone
        )}

        ${info(
          "Country",
          prospect.country
        )}

        ${info(
          "Prospect ID",
          prospect.id
        )}

        ${
          prospect.linkedin
            ? `
              <div class="info">

                <div class="info-label">
                  LinkedIn
                </div>

                <div class="info-value">

                  <a
                    class="linkedin-link"
                    href="${escapeAttr(
                      prospect.linkedin
                    )}"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Open LinkedIn Profile →
                  </a>

                </div>

              </div>
            `
            : info(
                "LinkedIn",
                "Not provided"
              )
        }

      </div>

    </div>


    ${
      loading
        ? `
          <div
            style="
              margin-top:15px;
              color:#94a3b8;
              font-size:11px;
            "
          >
            Loading latest assessment...
          </div>
        `
        : ""
    }

  `;

}


/* =========================================
   DIMENSIONS
========================================= */

function parseDimensions(
  raw
) {

  if (!raw) {
    return [];
  }


  try {

    const parsed =
      typeof raw === "string"
        ? JSON.parse(raw)
        : raw;


    if (
      !parsed ||
      typeof parsed !== "object"
    ) {
      return [];
    }


    return Object.entries(
      parsed
    )
      .map(
        ([name, score]) => ({
          name,
          score:
            Number(score) || 0
        })
      )
      .sort(
        (a, b) =>
          b.score -
          a.score
      );

  } catch (error) {

    console.error(
      "Dimension parsing error:",
      error
    );

    return [];

  }

}


function createDimension(
  dimension
) {

  const score =
    Math.max(
      0,
      Math.min(
        100,
        Number(
          dimension.score
        ) || 0
      )
    );


  return `

    <div class="dimension">

      <div class="dimension-name">
        ${escapeHtml(
          dimension.name
        )}
      </div>

      <div class="bar">

        <div
          class="bar-fill"
          style="width:${score}%"
        ></div>

      </div>

      <div class="dimension-score">
        ${score}
      </div>

    </div>

  `;

}


/* =========================================
   INTELLIGENCE ENGINE
========================================= */

function calculateIntelligence(
  prospect,
  dimensions,
  score
) {

  const strongestDimension =
    dimensions.length
      ? dimensions[0]
      : null;


  const weakestDimension =
    dimensions.length
      ? [...dimensions].sort(
          (a, b) =>
            a.score -
            b.score
        )[0]
      : null;


  const priority =
    getPriority(score);


  const strongest =
    strongestDimension
      ? `${strongestDimension.name} (${strongestDimension.score}/100)`
      : "Not enough data";


  const weakest =
    weakestDimension
      ? `${weakestDimension.name} (${weakestDimension.score}/100)`
      : "Not enough data";


  const angle =
    recommendAngle(
      prospect,
      weakestDimension,
      score
    );


  let coachingTitle;

  let coachingText;


  if (score >= 85) {

    coachingTitle =
      "High-value executive coaching opportunity";

    coachingText =
      "The assessment indicates strong executive readiness. " +
      "Lead the conversation around the next leadership transition, " +
      "greater strategic scope and executive positioning. " +
      "Use the lowest-scoring capability as the diagnostic entry point.";

  } else if (score >= 70) {

    coachingTitle =
      "Strong leadership acceleration opportunity";

    coachingText =
      "The prospect demonstrates meaningful next-level leadership potential. " +
      "Explore the gap between current scope and the desired role, " +
      "then position coaching around targeted leadership acceleration.";

  } else if (score >= 55) {

    coachingTitle =
      "Nurture with a diagnostic leadership conversation";

    coachingText =
      "There is a useful leadership signal, but the current assessment " +
      "does not justify a hard coaching pitch. Start by understanding " +
      "the transition, challenge and desired leadership outcome.";

  } else {

    coachingTitle =
      "Low immediate coaching priority";

    coachingText =
      "The current assessment signal is relatively weak. " +
      "Keep the prospect in nurture and look for stronger evidence " +
      "of leadership transition, growth or executive need.";

  }


  return {
    priority,
    strongest,
    weakest,
    angle,
    coachingTitle,
    coachingText
  };

}


/* =========================================
   RECOMMENDED COACHING ANGLE
========================================= */

function recommendAngle(
  prospect,
  weakest,
  score
) {

  const role =
    String(
      prospect.target_role || ""
    ).toLowerCase();


  const challenge =
    String(
      prospect.primary_challenge || ""
    ).toLowerCase();


  if (weakest) {

    const name =
      weakest.name.toLowerCase();


    if (
      /visibility|positioning|presence/.test(
        name
      )
    ) {

      return "Executive visibility & positioning";

    }


    if (
      /strategic|enterprise|business impact/.test(
        name
      )
    ) {

      return "Strategic leadership & enterprise influence";

    }


    if (
      /stakeholder|influence/.test(
        name
      )
    ) {

      return "Executive influence & stakeholder leadership";

    }


    if (
      /scale|leadership/.test(
        name
      )
    ) {

      return "Leadership scale & organizational impact";

    }

  }


  if (
    role.includes("cxo") ||
    role.includes("ceo") ||
    role.includes("cto") ||
    role.includes("cfo") ||
    role.includes("vp") ||
    role.includes("vice president")
  ) {

    return "Executive transition & positioning";

  }


  if (challenge) {

    return "Leadership challenge diagnosis";

  }


  return score >= 80

    ? "Strategic leadership & executive positioning"

    : "Leadership development & career acceleration";

}


/* =========================================
   PRIORITY
========================================= */

function getPriority(
  score
) {

  if (score >= 85) {
    return "HIGH PRIORITY";
  }

  if (score >= 70) {
    return "QUALIFY";
  }

  if (score >= 55) {
    return "NURTURE";
  }

  return "LOW PRIORITY";

}


function getScoreClass(
  score
) {

  if (score >= 80) {
    return "high";
  }

  if (score >= 60) {
    return "medium";
  }

  return "low";

}


/* =========================================
   UI HELPERS
========================================= */

function info(
  label,
  value
) {

  const clean =
    value === null ||
    value === undefined ||
    String(value).trim() === ""
      ? "Not provided"
      : String(value);


  return `

    <div class="info">

      <div class="info-label">
        ${escapeHtml(label)}
      </div>

      <div class="info-value">
        ${escapeHtml(clean)}
      </div>

    </div>

  `;

}


function insightCard(
  label,
  value
) {

  return `

    <div class="insight">

      <div class="insight-label">
        ${escapeHtml(label)}
      </div>

      <div class="insight-value">
        ${escapeHtml(value)}
      </div>

    </div>

  `;

}


function renderEmpty(
  title = "Select a prospect",
  text =
    "Click a prospect to view the complete assessment."
) {

  document.getElementById(
    "detailPanel"
  ).innerHTML = `

    <div class="empty">

      <div>

        <strong>
          ${escapeHtml(title)}
        </strong>

        <p>
          ${escapeHtml(text)}
        </p>

      </div>

    </div>

  `;

}


function showError(
  message
) {

  const box =
    document.getElementById(
      "errorBox"
    );


  box.textContent =
    message;


  box.style.display =
    message
      ? "block"
      : "none";

}


function formatDate(
  value
) {

  if (!value) {
    return "Not provided";
  }


  const date =
    new Date(value);


  if (
    Number.isNaN(
      date.getTime()
    )
  ) {

    return String(value);

  }


  return date.toLocaleString(
    [],
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    }
  );

}


/* =========================================
   SECURITY / HTML ESCAPING
========================================= */

function escapeHtml(
  value
) {

  return String(
    value ?? ""
  )
    .replaceAll(
      "&",
      "&amp;"
    )
    .replaceAll(
      "<",
      "&lt;"
    )
    .replaceAll(
      ">",
      "&gt;"
    )
    .replaceAll(
      '"',
      "&quot;"
    )
    .replaceAll(
      "'",
      "&#039;"
    );

}


function escapeAttr(
  value
) {

  return escapeHtml(
    value
  )
    .replaceAll(
      "`",
      "&#096;"
    );

}
