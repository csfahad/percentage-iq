(function bootstrapIgnouContentScript() {
    "use strict";

    var STORAGE_KEYS = {
        programmeType: "ignouProgrammeType",
        programmeText: "ignouProgrammeText",
        enrolmentNo: "ignouEnrollmentNo",
        programmeCode: "ignouProgrammeCode",
        studentName: "ignouStudentName",
        lastResult: "ignouLastResult",
    };

    function getStorage(keys) {
        return new Promise(function resolveStorage(resolve) {
            chrome.storage.local.get(keys, function onGet(items) {
                resolve(items || {});
            });
        });
    }

    function setStorage(items) {
        return new Promise(function resolveStorage(resolve) {
            chrome.storage.local.set(items, function onSet() {
                resolve();
            });
        });
    }

    function getSelectedProgrammeText() {
        var select = document.querySelector(
            "select[name*='program'], select[id*='program'], select",
        );
        if (!select || !select.selectedOptions || !select.selectedOptions[0])
            return "";
        return select.selectedOptions[0].textContent || "";
    }

    function getEnrollmentInput() {
        var input = document.querySelector(
            "input[name*='enrol'], input[name*='enroll'], input[id*='enrol'], input[id*='enroll'], input[type='text']",
        );
        return input ? String(input.value || "").trim() : "";
    }

    function detectPageType() {
        var gradeTable =
            window.IGNOUScraper && window.IGNOUScraper.findGradeTable
                ? window.IGNOUScraper.findGradeTable()
                : null;
        if (gradeTable) return "RESULT";
        var hasLoginInputs = !!document.querySelector(
            "input[name*='enrol'], input[name*='enroll']",
        );
        return hasLoginInputs ? "LOGIN" : "UNKNOWN";
    }

    function bindLoginCapture() {
        var form = document.querySelector("form");
        if (!form) return;

        form.addEventListener("submit", function onSubmit() {
            var programmeText = getSelectedProgrammeText();
            var enrolmentNo = getEnrollmentInput();
            var programmeType = window.IGNOUCalculator.detectProgrammeType({
                dropdownText: programmeText,
                url: window.location.href,
            });

            setStorage({
                [STORAGE_KEYS.programmeText]: programmeText,
                [STORAGE_KEYS.programmeType]: programmeType,
                [STORAGE_KEYS.enrolmentNo]: enrolmentNo,
            });
        });
    }

    async function handleResultPage() {
        window.IGNOUUI.renderPanel({
            programmeCode: "",
            enrolmentNo: "",
            studentName: "",
            result: {
                state: "LOADING",
                subjectBreakdown: [],
                pendingCourses: [],
            },
        });

        window.IGNOUScraper.waitForGradeTable(
            async function onTable(error, table) {
                if (error || !table) {
                    window.IGNOUUI.renderPanel({
                        programmeCode: "",
                        enrolmentNo: "",
                        studentName: "",
                        result: {
                            state: "ERROR",
                            subjectBreakdown: [],
                            pendingCourses: [],
                        },
                    });
                    return;
                }

                try {
                    var parsed = window.IGNOUScraper.parseGradeTable(table);
                    var stored = await getStorage(Object.values(STORAGE_KEYS));
                    var programmeType =
                        window.IGNOUCalculator.detectProgrammeType({
                            dropdownText:
                                stored[STORAGE_KEYS.programmeText] || "",
                            programmeCode:
                                parsed.programmeCode ||
                                stored[STORAGE_KEYS.programmeCode] ||
                                "",
                            url: window.location.href,
                        });

                    await setStorage({
                        [STORAGE_KEYS.programmeType]: programmeType,
                        [STORAGE_KEYS.programmeCode]:
                            parsed.programmeCode ||
                            stored[STORAGE_KEYS.programmeCode] ||
                            "",
                        [STORAGE_KEYS.enrolmentNo]:
                            parsed.enrolmentNo ||
                            stored[STORAGE_KEYS.enrolmentNo] ||
                            "",
                        [STORAGE_KEYS.studentName]:
                            parsed.studentName ||
                            stored[STORAGE_KEYS.studentName] ||
                            "",
                    });

                    var result = window.IGNOUCalculator.calculateResult({
                        programmeType: programmeType,
                        courses: parsed.courses,
                    });

                    var viewPayload = {
                        programmeCode:
                            parsed.programmeCode ||
                            stored[STORAGE_KEYS.programmeCode] ||
                            "N/A",
                        enrolmentNo:
                            parsed.enrolmentNo ||
                            stored[STORAGE_KEYS.enrolmentNo] ||
                            "N/A",
                        studentName:
                            parsed.studentName ||
                            stored[STORAGE_KEYS.studentName] ||
                            "N/A",
                        result: result,
                    };

                    await setStorage({
                        [STORAGE_KEYS.lastResult]: viewPayload,
                    });

                    setTimeout(function showPanel() {
                        window.IGNOUUI.renderPanel(viewPayload);
                    }, 1000);
                } catch (processingError) {
                    window.IGNOUUI.renderPanel({
                        programmeCode: "",
                        enrolmentNo: "",
                        studentName: "",
                        result: {
                            state: "ERROR",
                            subjectBreakdown: [],
                            pendingCourses: [],
                        },
                    });
                }
            },
        );
    }

    function initialize() {
        var pageType = detectPageType();
        if (pageType === "LOGIN") {
            bindLoginCapture();
            return;
        }
        if (pageType === "RESULT") {
            handleResultPage();
            return;
        }

        bindLoginCapture();
        handleResultPage();
    }

    initialize();
})();
