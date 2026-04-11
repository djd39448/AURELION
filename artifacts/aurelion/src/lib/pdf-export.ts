/**
 * @module lib/pdf-export
 * @description PDF export utility for AURELION itineraries.
 * Generates a beautifully styled HTML document (with a cover page and
 * day-by-day activity cards) and opens it in a new browser window that
 * auto-triggers the browser's print dialog. The user can then choose
 * "Save as PDF" from the print dialog.
 *
 * This approach avoids heavy PDF libraries — it relies entirely on
 * semantic HTML + CSS `@page` rules + `window.print()`.
 */

/**
 * Shape of the data returned by the `exportItinerary` API endpoint.
 * Contains the full itinerary with nested items/activities, plus an export timestamp.
 */
export type ItineraryExportData = {
  itinerary: {
    title: string;
    totalDays: number;
    status: string;
    items: Array<{
      id: number;
      dayNumber: number;
      timeSlot: string;
      activity: {
        title: string;
        category: string;
        difficulty: string;
        durationMinutes: number;
        priceLow: number;
        priceHigh: number;
        location: string;
        description?: string | null;
        whatToBring?: string | null;
        whatToExpect?: string | null;
        reviewSummary?: string | null;
        imageUrl?: string | null;
        tags?: string[];
      } | null;
    }>;
  };
  exportedAt: string;
};

/**
 * Open a new browser window with a styled, print-ready itinerary document.
 *
 * The generated HTML includes:
 *  - A dark cover page with the AURELION brand, itinerary title, and date.
 *  - Content pages with day headers, time-slot labels, and activity cards
 *    showing title, metadata, description, what-to-bring/expect, and tags.
 *  - A footer with the AURELION brand and preparation date.
 *  - Google Fonts (Playfair Display + Lato) loaded via CDN.
 *  - `@page` CSS for A4 sizing.
 *  - A `<script>` that calls `window.print()` after a 600ms delay.
 *
 * @param data - The full itinerary export payload from the API.
 */
export function printItineraryPDF(data: ItineraryExportData) {
  const { itinerary, exportedAt } = data;
  const gold = "#c8a96e";
  const darkBg = "#0f0f0f";
  const days = Array.from({ length: itinerary.totalDays }, (_, i) => i + 1);
  const timeSlots = ["morning", "afternoon", "evening"];

  const dayHTML = days
    .map((day) => {
      const dayItems = itinerary.items.filter((i) => i.dayNumber === day && i.activity);
      if (dayItems.length === 0) return "";

      const slotsHTML = timeSlots
        .map((slot) => {
          const slotItems = dayItems.filter((i) => i.timeSlot === slot);
          if (slotItems.length === 0) return "";
          return `
            <div class="time-slot">
              <div class="slot-label">${slot.toUpperCase()}</div>
              ${slotItems
                .map(
                  (item) => `
                <div class="activity-card">
                  <div class="activity-header">
                    <div class="activity-title">${item.activity!.title}</div>
                    <div class="activity-meta">
                      <span>${item.activity!.durationMinutes} MIN</span>
                      <span>·</span>
                      <span>${item.activity!.difficulty}</span>
                      <span>·</span>
                      <span>$${item.activity!.priceLow}–$${item.activity!.priceHigh}</span>
                    </div>
                  </div>
                  <div class="activity-category">${item.activity!.category} · ${item.activity!.location}</div>
                  ${item.activity!.description ? `<p class="activity-desc">${item.activity!.description}</p>` : ""}
                  <div class="activity-details">
                    ${item.activity!.whatToBring ? `<div class="detail-block"><div class="detail-label">WHAT TO BRING</div><div class="detail-text">${item.activity!.whatToBring}</div></div>` : ""}
                    ${item.activity!.whatToExpect ? `<div class="detail-block"><div class="detail-label">WHAT TO EXPECT</div><div class="detail-text">${item.activity!.whatToExpect}</div></div>` : ""}
                  </div>
                  ${item.activity!.tags?.length ? `<div class="tags">${item.activity!.tags.map((t) => `<span class="tag">${t}</span>`).join("")}</div>` : ""}
                </div>
              `
                )
                .join("")}
            </div>
          `;
        })
        .filter(Boolean)
        .join("");

      return `
        <div class="day-section">
          <div class="day-header">
            <div class="day-number">DAY ${day}</div>
            <div class="day-line"></div>
          </div>
          ${slotsHTML}
        </div>
      `;
    })
    .filter(Boolean)
    .join("");

  const exportDate = new Date(exportedAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${itinerary.title} — AURELION</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&family=Lato:wght@300;400;700&display=swap" rel="stylesheet" />
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    @page {
      size: A4;
      margin: 0;
    }

    body {
      font-family: 'Lato', sans-serif;
      background: #ffffff;
      color: #1a1a1a;
      font-size: 11pt;
      line-height: 1.6;
    }

    /* ── COVER PAGE ── */
    .cover {
      height: 100vh;
      background: ${darkBg};
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      padding: 80px 60px;
      position: relative;
      page-break-after: always;
    }

    .cover-border {
      position: absolute;
      inset: 24px;
      border: 1px solid ${gold};
      opacity: 0.4;
      pointer-events: none;
    }

    .cover-corner {
      position: absolute;
      width: 40px;
      height: 40px;
      border-color: ${gold};
      border-style: solid;
      opacity: 0.8;
    }
    .corner-tl { top: 32px; left: 32px; border-width: 1px 0 0 1px; }
    .corner-tr { top: 32px; right: 32px; border-width: 1px 1px 0 0; }
    .corner-bl { bottom: 32px; left: 32px; border-width: 0 0 1px 1px; }
    .corner-br { bottom: 32px; right: 32px; border-width: 0 1px 1px 0; }

    .brand-name {
      font-family: 'Playfair Display', serif;
      font-size: 13pt;
      letter-spacing: 0.5em;
      color: ${gold};
      text-transform: uppercase;
      margin-bottom: 60px;
    }

    .cover-divider {
      width: 60px;
      height: 1px;
      background: ${gold};
      margin: 0 auto 36px;
      opacity: 0.6;
    }

    .cover-title {
      font-family: 'Playfair Display', serif;
      font-size: 38pt;
      font-weight: 700;
      color: #ffffff;
      line-height: 1.2;
      margin-bottom: 24px;
      max-width: 600px;
    }

    .cover-subtitle {
      font-size: 10pt;
      letter-spacing: 0.3em;
      text-transform: uppercase;
      color: ${gold};
      margin-bottom: 8px;
    }

    .cover-details {
      font-size: 10pt;
      color: rgba(255,255,255,0.5);
      letter-spacing: 0.15em;
      margin-top: 48px;
    }

    .cover-tagline {
      position: absolute;
      bottom: 60px;
      font-size: 8pt;
      letter-spacing: 0.25em;
      color: rgba(255,255,255,0.3);
      text-transform: uppercase;
    }

    /* ── CONTENT PAGES ── */
    .content {
      padding: 60px 70px;
      max-width: 100%;
    }

    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-bottom: 16px;
      border-bottom: 1px solid #e0d5c5;
      margin-bottom: 40px;
    }

    .page-header-brand {
      font-family: 'Playfair Display', serif;
      font-size: 11pt;
      letter-spacing: 0.3em;
      color: ${gold};
    }

    .page-header-title {
      font-size: 9pt;
      letter-spacing: 0.15em;
      color: #888;
      text-transform: uppercase;
    }

    /* ── DAY SECTIONS ── */
    .day-section {
      margin-bottom: 48px;
      page-break-inside: avoid;
    }

    .day-header {
      display: flex;
      align-items: center;
      gap: 20px;
      margin-bottom: 24px;
    }

    .day-number {
      font-family: 'Playfair Display', serif;
      font-size: 18pt;
      font-weight: 600;
      color: ${gold};
      white-space: nowrap;
      letter-spacing: 0.1em;
    }

    .day-line {
      flex: 1;
      height: 1px;
      background: linear-gradient(to right, #c8a96e44, transparent);
    }

    /* ── TIME SLOTS ── */
    .time-slot {
      margin-bottom: 20px;
    }

    .slot-label {
      font-size: 7pt;
      letter-spacing: 0.35em;
      color: #999;
      text-transform: uppercase;
      margin-bottom: 10px;
      padding-left: 2px;
    }

    /* ── ACTIVITY CARDS ── */
    .activity-card {
      border: 1px solid #e8e0d0;
      border-left: 3px solid ${gold};
      padding: 18px 20px;
      margin-bottom: 12px;
      background: #fdfaf6;
      page-break-inside: avoid;
    }

    .activity-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 16px;
      margin-bottom: 4px;
    }

    .activity-title {
      font-family: 'Playfair Display', serif;
      font-size: 14pt;
      font-weight: 600;
      color: #1a1a1a;
      line-height: 1.3;
    }

    .activity-meta {
      font-size: 8pt;
      letter-spacing: 0.1em;
      color: ${gold};
      white-space: nowrap;
      text-transform: uppercase;
      display: flex;
      gap: 6px;
      align-items: center;
      margin-top: 3px;
    }

    .activity-category {
      font-size: 8pt;
      letter-spacing: 0.2em;
      color: #888;
      text-transform: uppercase;
      margin-bottom: 10px;
    }

    .activity-desc {
      font-size: 10pt;
      color: #444;
      line-height: 1.7;
      margin-bottom: 12px;
      font-weight: 300;
    }

    .activity-details {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      margin-bottom: 12px;
    }

    .detail-block {
      background: #f5f0e8;
      padding: 10px 12px;
    }

    .detail-label {
      font-size: 7pt;
      letter-spacing: 0.25em;
      color: ${gold};
      text-transform: uppercase;
      margin-bottom: 4px;
      font-weight: 700;
    }

    .detail-text {
      font-size: 9pt;
      color: #555;
      line-height: 1.5;
      font-weight: 300;
    }

    .tags {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-top: 8px;
    }

    .tag {
      font-size: 7pt;
      letter-spacing: 0.15em;
      text-transform: uppercase;
      color: #888;
      border: 1px solid #d0c8b8;
      padding: 2px 8px;
    }

    /* ── FOOTER ── */
    .pdf-footer {
      margin-top: 60px;
      padding-top: 24px;
      border-top: 1px solid #e0d5c5;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .footer-brand {
      font-family: 'Playfair Display', serif;
      font-size: 10pt;
      letter-spacing: 0.3em;
      color: ${gold};
    }

    .footer-text {
      font-size: 8pt;
      color: #bbb;
      letter-spacing: 0.1em;
    }

    /* ── PRINT OPTIMIZATIONS ── */
    @media print {
      html, body { height: auto; }
      .cover { height: 100vh; }
      a { text-decoration: none; color: inherit; }
    }
  </style>
</head>
<body>

  <!-- COVER PAGE -->
  <div class="cover">
    <div class="cover-border"></div>
    <div class="cover-corner corner-tl"></div>
    <div class="cover-corner corner-tr"></div>
    <div class="cover-corner corner-bl"></div>
    <div class="cover-corner corner-br"></div>

    <div class="brand-name">AURELION</div>
    <div class="cover-divider"></div>
    <div class="cover-title">${itinerary.title}</div>
    <div class="cover-subtitle">Aruba · ${itinerary.totalDays}-Day Curated Itinerary</div>
    <div class="cover-details">PREPARED ${exportDate.toUpperCase()}</div>
    <div class="cover-tagline">Luxury Adventure Planning · Aruba</div>
  </div>

  <!-- ITINERARY CONTENT -->
  <div class="content">
    <div class="page-header">
      <div class="page-header-brand">AURELION</div>
      <div class="page-header-title">${itinerary.title} · ${itinerary.totalDays} Days</div>
    </div>

    ${dayHTML || `<p style="color:#888;text-align:center;padding:40px 0;font-style:italic;">No activities have been planned yet.</p>`}

    <div class="pdf-footer">
      <div class="footer-brand">AURELION</div>
      <div class="footer-text">Prepared ${exportDate} · Luxury Aruba Adventure Planning</div>
    </div>
  </div>

  <script>
    window.addEventListener('load', function() {
      setTimeout(function() { window.print(); }, 600);
    });
  </script>
</body>
</html>`;

  const printWindow = window.open("", "_blank", "width=900,height=1100");
  if (!printWindow) return;
  printWindow.document.write(html);
  printWindow.document.close();
}
