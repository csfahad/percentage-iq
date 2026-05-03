(function initPopup() {
    "use strict";

    var GRADECARD_URL = "https://gradecard.ignou.ac.in/gradecard/login.aspx";
    var STORAGE_KEYS = {
        lastResult: "ignouLastResult",
    };
    var elements = {
        pageStatus: document.getElementById("pageStatus"),
        resultContent: document.getElementById("resultContent"),
        openGradecard: document.getElementById("openGradecard"),
        refreshTab: document.getElementById("refreshTab"),
    };

    function escapeHtml(text) {
        return String(text || "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function getStorage(keys) {
        return new Promise(function resolveStorage(resolve) {
            chrome.storage.local.get(keys, function onGet(items) {
                resolve(items || {});
            });
        });
    }

    function getActiveTab() {
        return new Promise(function resolveTab(resolve) {
            chrome.tabs.query(
                { active: true, currentWindow: true },
                function onTabs(tabs) {
                    resolve((tabs && tabs[0]) || null);
                },
            );
        });
    }

    function isIgnouGradecardTab(tab) {
        return !!(
            tab &&
            tab.url &&
            /^https?:\/\/gradecard\.ignou\.ac\.in\//i.test(tab.url)
        );
    }

    function getDivisionTone(division) {
        if (division === "First Division") {
            return {
                color: "#15803d",
                background: "rgba(21, 128, 61, 0.12)",
            };
        }
        if (division === "Second Division") {
            return {
                color: "#125092",
                background: "rgba(18, 80, 146, 0.12)",
            };
        }
        if (division === "Pass") {
            return {
                color: "#b45309",
                background: "rgba(180, 83, 9, 0.12)",
            };
        }
        return {
            color: "#b91c1c",
            background: "rgba(185, 28, 28, 0.12)",
        };
    }

    function setPageStatus(type, title, body) {
        var statusClass = type === "ready" ? "ready" : type;
        elements.pageStatus.innerHTML = [
            '<div class="status-dot ' + statusClass + '"></div>',
            "<div>",
            "<strong>" + title + "</strong>",
            "<span>" + body + "</span>",
            "</div>",
        ].join("");
    }

    function renderEmptyResult(text) {
        elements.resultContent.className = "empty";
        elements.resultContent.textContent = text;
    }

    function renderResultCard(payload) {
        if (!payload || !payload.result) {
            renderEmptyResult(
                "No scanned grade card yet. Open your IGNOU result page and let the extension read the table.",
            );
            return;
        }

        var result = payload.result;
        var tone = getDivisionTone(result.division || "");
        var cgpaMarkup =
            result.cgpa !== null && result.cgpa !== undefined
                ? '<div class="metric"><span class="label">CGPA</span><strong>' +
                  result.cgpa.toFixed(2) +
                  "</strong></div>"
                : "";

        elements.resultContent.className = "";
        elements.resultContent.innerHTML = [
            '<div class="grid">',
            '<div class="metric"><span class="label">Percentage</span><strong>' +
                Number(result.overallPercentage || 0).toFixed(2) +
                "%</strong></div>",
            cgpaMarkup ||
                '<div class="metric"><span class="label">State</span><strong style="font-size:15px">' +
                    (result.state || "N/A") +
                    "</strong></div>",
            "</div>",
            '<div class="detail-list" style="margin-top:6px;">',
            '<div class="detail"><span class="label">Name</span><span class="value">' +
                escapeHtml(payload.studentName || "N/A") +
                "</span></div>",
            '<div class="detail"><span class="label">Programme</span><span class="value">' +
                escapeHtml(payload.programmeCode || "N/A") +
                "</span></div>",
            '<div class="detail"><span class="label">Enrollment No.</span><span class="value">' +
                escapeHtml(payload.enrolmentNo || "N/A") +
                "</span></div>",
            '<div class="detail"><span class="label">Division</span><span class="value" style="margin-top:6px;"><span class="badge" style="color:' +
                tone.color +
                "; background:" +
                tone.background +
                "; border-color:" +
                tone.color +
                ';">' +
                escapeHtml(result.division || "N/A") +
                "</span></span></div>",
            '<div class="detail full"><span class="label">Completed Courses</span><span class="meta">' +
                ((result.subjectBreakdown && result.subjectBreakdown.length) ||
                    0) +
                " counted</span></div>",
            "</div>",
        ].join("");
    }

    async function refreshCurrentTab() {
        var tab = await getActiveTab();
        if (!isIgnouGradecardTab(tab)) {
            setPageStatus(
                "offsite",
                "Open the IGNOU grade card page",
                "Refresh Scan only works on gradecard.ignou.ac.in.",
            );
            return;
        }

        chrome.tabs.reload(tab.id);
        window.close();
    }

    async function initialize() {
        var activeTab = await getActiveTab();
        var storage = await getStorage([STORAGE_KEYS.lastResult]);

        if (isIgnouGradecardTab(activeTab)) {
            setPageStatus(
                "ready",
                "IGNOU page detected",
                "This tab is supported. Refresh the page if you need the result re-scanned.",
            );
        } else {
            setPageStatus(
                "offsite",
                "Not on the IGNOU result page",
                "Open gradecard.ignou.ac.in to let the extension read your marks.",
            );
        }

        renderResultCard(storage[STORAGE_KEYS.lastResult]);
    }

    elements.openGradecard.addEventListener("click", function onOpen() {
        chrome.tabs.create({ url: GRADECARD_URL });
        window.close();
    });

    elements.refreshTab.addEventListener("click", function onRefresh() {
        refreshCurrentTab();
    });

    initialize();
})();
