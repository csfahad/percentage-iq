(function initUi(globalScope) {
    "use strict";

    var HOST_ID = "ignou-percentage-iq-host";

    function escapeHtml(text) {
        return String(text || "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function stateMessage(state, pendingCount) {
        if (state === "LOADING") return "Scanning your grade card...";
        if (state === "PARTIAL")
            return pendingCount + " course(s) still incomplete/pending.";
        if (state === "NO_DATA")
            return "No completed courses found. Submit your grade card first.";
        if (state === "ERROR")
            return "Could not read grade card. Please report this.";
        return "";
    }

    function divisionClass(division) {
        if (!division || division === "N/A") {
            return "bg-slate-100 text-slate-600 border border-slate-200";
        }
        return "border";
    }

    function divisionTone(division) {
        if (division === "First Division") {
            return { color: "#15803d", soft: "rgba(21,128,61,0.12)" };
        }
        if (division === "Second Division") {
            return { color: "#125092", soft: "rgba(18,80,146,0.12)" };
        }
        return { color: "#b91c1c", soft: "rgba(185,28,28,0.12)" };
    }

    function ensureHost() {
        var host = document.getElementById(HOST_ID);
        if (host) return host;
        host = document.createElement("div");
        host.id = HOST_ID;
        document.body.appendChild(host);
        return host;
    }

    function buildSummaryText(payload) {
        var lines = [];
        lines.push("IGNOU Percentage IQ");
        lines.push("Name: " + (payload.studentName || "N/A"));
        lines.push("Programme: " + (payload.programmeCode || "N/A"));
        lines.push("Enrollment No: " + (payload.enrolmentNo || "N/A"));
        lines.push(
            "Percentage: " + (payload.result.overallPercentage || 0) + "%",
        );
        if (payload.result.cgpa !== null && payload.result.cgpa !== undefined) {
            lines.push("CGPA: " + payload.result.cgpa);
        }
        lines.push("Division: " + payload.result.division);
        lines.push("");
        payload.result.subjectBreakdown.forEach(function eachSubject(subject) {
            lines.push(subject.code + " - " + subject.percentage + "%");
        });
        return lines.join("\n");
    }

    function renderPanel(payload) {
        var host = ensureHost();
        var shadowRoot = host.shadowRoot || host.attachShadow({ mode: "open" });
        var result = payload.result || {};
        var percentage = Math.max(
            0,
            Math.min(100, Number(result.overallPercentage || 0)),
        );
        var tone = divisionTone(result.division || "");
        var pendingCount = (result.pendingCourses || []).length;
        var isSmall = window.innerWidth < 600;
        var collapsedClass = isSmall
            ? "w-14 h-14 rounded-full p-0 overflow-hidden"
            : "";
        var detailsClass = isSmall ? "hidden" : "block";
        var panelStyle = isSmall ? "" : "width: 400px;";

        shadowRoot.innerHTML = [
            '<link rel="preconnect" href="https://fonts.googleapis.com">',
            '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>',
            '<link href="https://fonts.googleapis.com/css2?family=Geist:wght@100..900&display=swap" rel="stylesheet">',
            '<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">',
            '<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300..700&display=swap" rel="stylesheet">',
            '<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css">',
            "<style>",
            ":host { all: initial; --ignou-primary:#125092; --ignou-primary-soft:#eaf2fb; --ignou-border:#dbe5f1; --ignou-bg:#f8fbff; --result-color:" +
                tone.color +
                "; --result-soft:" +
                tone.soft +
                "; }",
            "#panel, #panel * { box-sizing: border-box; }",
            "#panel { font-family: 'Geist', 'Inter', 'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #0f172a; }",
            ".num { font-variant-numeric: tabular-nums; font-feature-settings: 'tnum' 1; }",
            ".fab-pulse { box-shadow: 0 10px 28px rgba(18,80,146,0.34); }",
            ".table-scroll thead th { position: sticky; top: 0; z-index: 2; background: #f8fafc; }",
            ".table-scroll thead tr { box-shadow: inset 0 -1px 0 #e2e8f0; }",
            ".subject-row:hover { background: #f8fafc; }",
            "@keyframes fillDonut { from { --p: 0; } to { --p: " +
                percentage +
                "; } }",
            ".donut { --p: " +
                percentage +
                "; background: conic-gradient(var(--result-color) calc(var(--p) * 1%), #e2e8f0 0); animation: fillDonut 1s ease forwards; box-shadow: inset 0 0 0 1px var(--result-soft); }",
            ".metric-label { letter-spacing: 0.06em; }",
            "</style>",
            '<div id="panel" style="' +
                panelStyle +
                '" class="fixed right-5 bottom-5 z-[999999] bg-white shadow-xl border transition-all rounded-xl overflow-hidden ' +
                collapsedClass +
                '">',
            '  <button id="fab" aria-label="Open IGNOU Percentage IQ" class="' +
                (isSmall ? "flex" : "hidden") +
                ' fab-pulse w-full h-full items-center justify-center text-white text-xl" style="background: var(--ignou-primary);">%</button>',
            '  <div id="content" class="' + detailsClass + '">',
            '    <div class="text-white px-5 py-3.5 flex items-center justify-between" style="background: var(--ignou-primary);">',
            '      <div class="font-semibold">IGNOU Percentage IQ</div>',
            '      <button id="closeBtn" class="text-white text-lg leading-none">&times;</button>',
            "    </div>",
            '    <div class="px-5 py-3 border-b text-sm bg-slate-50/70" style="border-color: var(--ignou-border);">',
            '      <div class="text-slate-700"><span class="font-semibold">Name:</span> ' +
                escapeHtml(payload.studentName || "N/A") +
                "</div>",
            '      <div class="text-slate-700"><span class="font-semibold">Programme:</span> ' +
                escapeHtml(payload.programmeCode || "N/A") +
                "</div>",
            '      <div class="text-slate-700"><span class="font-semibold">Enrollment No:</span> ' +
                escapeHtml(payload.enrolmentNo || "N/A") +
                "</div>",
            "    </div>",
            '    <div class="px-5 py-4">',
            result.state === "LOADING"
                ? '<div class="flex items-center gap-3 text-sm text-slate-700"><div class="animate-spin rounded-full h-5 w-5 border-2 border-slate-400 border-t-transparent"></div><span>' +
                  stateMessage("LOADING", 0) +
                  "</span></div>"
                : "",
            result.state !== "LOADING"
                ? '<div class="flex items-center gap-4 p-3 rounded-xl border" style="background: var(--ignou-bg); border-color: var(--ignou-border);">' +
                  '<div class="donut w-24 h-24 rounded-full grid place-items-center"><div class="num bg-white w-16 h-16 rounded-full grid place-items-center text-lg font-bold" style="color: var(--result-color);">' +
                  percentage.toFixed(1) +
                  "%</div></div>" +
                  '<div class="flex-1">' +
                  '<div class="metric-label text-[11px] uppercase text-slate-500">Overall Percentage</div>' +
                  '<div class="num text-3xl leading-tight font-semibold" style="color: var(--result-color);">' +
                  percentage.toFixed(2) +
                  "%</div>" +
                  '<span class="inline-flex mt-2 px-2.5 py-1 rounded-md text-xs font-semibold ' +
                  divisionClass(result.division) +
                  '" style="' +
                  (result.division && result.division !== "N/A"
                      ? "background: var(--result-soft); color: var(--result-color); border-color: var(--result-color);"
                      : "") +
                  '">' +
                  escapeHtml(result.division || "N/A") +
                  "</span>" +
                  "</div></div>"
                : "",
            result.state === "PARTIAL" ||
            result.state === "NO_DATA" ||
            result.state === "ERROR"
                ? '<div class="mt-3 text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-md p-2">' +
                  escapeHtml(stateMessage(result.state, pendingCount)) +
                  "</div>"
                : "",
            result.programmeType === "CBCS"
                ? '<div class="mt-3 p-2.5 rounded-md text-xs border" style="background: var(--ignou-primary-soft); color: var(--ignou-primary); border-color: var(--ignou-border);"><strong>CGPA:</strong> ' +
                  escapeHtml(result.cgpa) +
                  " | <strong>Estimated %:</strong> " +
                  percentage.toFixed(2) +
                  '%<div class="mt-1 text-slate-600">' +
                  escapeHtml(result.disclaimer || "") +
                  "</div></div>"
                : "",
            "    </div>",
            '    <div class="px-5 pb-3">',
            '      <details class="text-sm">',
            '        <summary class="cursor-pointer font-medium" style="color: var(--ignou-primary);">Subject-wise Breakdown</summary>',
            '        <div class="table-scroll mt-2 max-h-52 overflow-auto border rounded-lg" style="border-color: var(--ignou-border);">',
            '          <table class="w-full text-xs">',
            '            <thead><tr><th class="p-2 text-left text-slate-600 font-semibold">Course</th><th class="p-2 text-right text-slate-600 font-semibold">Obt.</th><th class="p-2 text-right text-slate-600 font-semibold">Max</th><th class="p-2 text-right text-slate-600 font-semibold">%</th></tr></thead>',
            "            <tbody>",
            (result.subjectBreakdown || [])
                .map(function mapSubject(subject) {
                    return (
                        '<tr class="subject-row border-t border-slate-100"><td class="p-2 text-slate-800 font-medium">' +
                        escapeHtml(subject.code || "") +
                        '</td><td class="num p-2 text-right text-slate-700">' +
                        escapeHtml(subject.obtained) +
                        '</td><td class="num p-2 text-right text-slate-700">' +
                        escapeHtml(subject.max) +
                        '</td><td class="num p-2 text-right text-slate-700">' +
                        escapeHtml(subject.percentage) +
                        "</td></tr>"
                    );
                })
                .join(""),
            "            </tbody>",
            "          </table>",
            "        </div>",
            "      </details>",
            "    </div>",
            '    <div class="px-5 pb-4 flex gap-2">',
            '      <button id="copyBtn" class="flex-1 px-3 py-2.5 rounded-md text-sm font-medium transition-colors inline-flex items-center justify-center gap-1.5 border" style="color: var(--ignou-primary); border-color: var(--ignou-primary); background: #ffffff;"><svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg><span>Copy Summary</span></button>',
            '      <button id="printBtn" class="flex-1 px-3 py-2.5 text-white rounded-md text-sm font-medium transition-colors inline-flex items-center justify-center gap-1.5" style="background: var(--ignou-primary);"><svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9V2h12v7"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><path d="M6 14h12v8H6z"/></svg><span>Print</span></button>',
            "    </div>",
            '    <div class="px-5 pb-6 text-xs text-slate-500 inline-flex items-center gap-1.5"><svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5 text-amber-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3l-8.47-14.14a2 2 0 0 0-3.42 0z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg><span>For reference only. Refer to official IGNOU marksheet.</span></div>',
            "  </div>",
            "</div>",
        ].join("");

        var closeBtn = shadowRoot.getElementById("closeBtn");
        if (closeBtn) {
            closeBtn.onclick = function onClose() {
                host.remove();
            };
        }

        var fab = shadowRoot.getElementById("fab");
        if (fab) {
            fab.onclick = function onFabClick() {
                var panel = shadowRoot.getElementById("panel");
                var content = shadowRoot.getElementById("content");
                panel.classList.remove(
                    "w-14",
                    "h-14",
                    "rounded-full",
                    "p-0",
                    "overflow-hidden",
                );
                panel.style.width = "400px";
                content.classList.remove("hidden");
                fab.classList.add("hidden");
            };
        }

        var copyBtn = shadowRoot.getElementById("copyBtn");
        if (copyBtn) {
            var copyBtnDefaultHtml = copyBtn.innerHTML;
            copyBtn.onclick = function onCopy() {
                var summary = buildSummaryText(payload);
                navigator.clipboard.writeText(summary).then(function ok() {
                    copyBtn.innerHTML =
                        '<svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg><span>Copied!</span>';
                    setTimeout(function restore() {
                        copyBtn.innerHTML = copyBtnDefaultHtml;
                    }, 1200);
                });
            };
        }

        var printBtn = shadowRoot.getElementById("printBtn");
        if (printBtn) {
            printBtn.onclick = function onPrint() {
                var popup = window.open("", "_blank", "width=700,height=900");
                if (!popup) return;
                popup.document.write(
                    '<pre style="font-family: system-ui; white-space: pre-wrap; padding: 20px;">' +
                        escapeHtml(buildSummaryText(payload)) +
                        "</pre>",
                );
                popup.document.close();
                popup.focus();
                popup.print();
            };
        }
    }

    globalScope.IGNOUUI = {
        renderPanel: renderPanel,
    };
})(window);
