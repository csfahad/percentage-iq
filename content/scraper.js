(function initScraper(globalScope) {
    "use strict";

    function normalizeText(text) {
        return String(text || "")
            .replace(/\s+/g, " ")
            .trim();
    }

    function toNumber(value) {
        if (value === null || value === undefined) return null;
        var text = normalizeText(value);
        if (!text || text === "--" || /^ab$/i.test(text)) return null;
        var parsed = Number(text.replace(/[^\d.-]/g, ""));
        return Number.isFinite(parsed) ? parsed : null;
    }

    function isAbsent(text) {
        var normalized = normalizeText(text).toLowerCase();
        return normalized === "ab" || normalized === "--" || normalized === "";
    }

    function parseStatus(statusRaw) {
        var status = normalizeText(statusRaw).toUpperCase();
        if (!status) return "Unknown";
        if (
            status.indexOf("NOT COMPLETED") !== -1 ||
            status.indexOf("INCOMPLETE") !== -1 ||
            status.indexOf("FAIL") !== -1
        ) {
            return "Incomplete";
        }
        if (
            status.indexOf("COMPLETED") !== -1 ||
            status.indexOf("PASS") !== -1
        ) {
            return "Completed";
        }
        return "Unknown";
    }

    function isValidCourseCode(code) {
        var normalized = normalizeText(code).toUpperCase();
        if (!normalized) return false;
        if (normalized.length > 15) return false;
        if (/\s/.test(normalized)) return false;
        return /^[A-Z]{2,6}-?[A-Z0-9]*\d{2,4}[A-Z]*$/.test(normalized);
    }

    function isLikelyGradeTable(table) {
        if (!table) return false;
        var headerText = normalizeText(table.innerText).toLowerCase();
        var hasCourse = /\bcourse\b/.test(headerText);
        var hasStatus = /\bstatus\b/.test(headerText);
        var hasTermEndOrAsgn = /term end|asgn|assignment|theory|practical/.test(
            headerText,
        );
        return hasCourse && hasStatus && hasTermEndOrAsgn;
    }

    function findGradeTable() {
        var strongSelectors = Array.from(
            document.querySelectorAll(
                'table[id*="grid"], table.style1, table[class*="grade"]',
            ),
        );
        var allTables = Array.from(document.querySelectorAll("table"));
        var candidates = strongSelectors.length ? strongSelectors : allTables;
        return candidates.find(isLikelyGradeTable) || null;
    }

    function mapHeaders(table) {
        var headers = Array.from(table.querySelectorAll("tr th"));
        if (!headers.length) {
            var firstRowCells = table.querySelector("tr");
            headers = firstRowCells
                ? Array.from(firstRowCells.querySelectorAll("td"))
                : [];
        }

        var indexMap = {};
        headers.forEach(function eachHeader(cell, idx) {
            var text = normalizeText(cell.textContent).toLowerCase();
            if (
                /course code|course|subject code|code/.test(text) &&
                indexMap.courseCode === undefined
            )
                indexMap.courseCode = idx;
            if (
                /course name|subject name|title/.test(text) &&
                indexMap.courseName === undefined
            )
                indexMap.courseName = idx;
            if (
                /assignment.*max|max.*assign|asgn.*max|tma.*max/.test(text) &&
                indexMap.assignmentMax === undefined
            )
                indexMap.assignmentMax = idx;
            if (
                /assignment|assign|asgn|tma/.test(text) &&
                indexMap.assignmentObtained === undefined
            )
                indexMap.assignmentObtained = idx;
            if (
                /tee.*max|theory.*max|term end.*max|max.*tee/.test(text) &&
                indexMap.teeMax === undefined
            )
                indexMap.teeMax = idx;
            if (
                /tee|theory|term end/.test(text) &&
                indexMap.teeObtained === undefined
            )
                indexMap.teeObtained = idx;
            if (
                /practical.*max|project.*max|dissertation.*max/.test(text) &&
                indexMap.practicalMax === undefined
            )
                indexMap.practicalMax = idx;
            if (
                /practical|project|dissertation/.test(text) &&
                indexMap.practicalObtained === undefined
            )
                indexMap.practicalObtained = idx;
            if (/status|result/.test(text) && indexMap.status === undefined)
                indexMap.status = idx;
            if (/grade/.test(text) && indexMap.grade === undefined)
                indexMap.grade = idx;
            if (/credit/.test(text) && indexMap.credits === undefined)
                indexMap.credits = idx;
        });

        return {
            headers: headers,
            indexMap: indexMap,
        };
    }

    function extractProgrammeCode() {
        var bodyText = document.body ? document.body.innerText : "";
        var codeMatch = bodyText.match(/\b([A-Z]{2,6}[A-Z0-9]{0,4})\b/g);
        if (codeMatch && codeMatch.length) {
            var preferred = codeMatch.find(function findKnown(code) {
                return /^(BCA|MCA|BAG|BCOMG|BSCG|BA|BCOM|BSC|BDP)/.test(code);
            });
            if (preferred) return preferred;
        }
        return "";
    }

    function extractLabelValue(labelPatterns) {
        var bodyText = document.body ? document.body.innerText : "";
        var normalizedText = bodyText.replace(/\r/g, "");
        var patterns = Array.isArray(labelPatterns)
            ? labelPatterns
            : [labelPatterns];

        for (var i = 0; i < patterns.length; i += 1) {
            var regex = new RegExp(
                "(?:^|\\n)\\s*" + patterns[i] + "\\s*[:\\-]?\\s*([^\\n]+)",
                "im",
            );
            var match = normalizedText.match(regex);
            if (match && match[1]) {
                return normalizeText(match[1]);
            }
        }

        return "";
    }

    function extractEnrolmentNo() {
        var labeledValue = extractLabelValue([
            "enrol(?:ment)?\\s*(?:number|no)?",
            "student\\s*id",
        ]);
        if (labeledValue) {
            var labeledMatch = labeledValue.match(/\b\d{9,10}\b/);
            if (labeledMatch) return labeledMatch[0];
        }

        var bodyText = document.body ? document.body.innerText : "";
        var genericMatch = bodyText.match(/\b\d{9,10}\b/);
        return genericMatch ? genericMatch[0] : "";
    }

    function extractStudentName() {
        var bodyText = document.body
            ? normalizeText(document.body.innerText)
            : "";
        var inlineMatch = bodyText.match(
            /Enrol(?:ment)?\s*No\.?\s*:\s*\d{9,10}\s+Name\s*:\s*(.*?)\s+Programme\s*Code\s*:/i,
        );
        if (inlineMatch && inlineMatch[1]) {
            return normalizeText(inlineMatch[1]);
        }

        var labeledValue = extractLabelValue([
            "student\\s*name",
            "name\\s*of\\s*student",
            "name",
        ]);
        if (!labeledValue) return "";

        return labeledValue
            .replace(
                /\b(enrol(?:ment)?|program(?:me)?|course|status|grade)\b.*$/i,
                "",
            )
            .trim();
    }

    function parseGradeTable(table) {
        var headerData = mapHeaders(table);
        var indexMap = headerData.indexMap;
        var rows = Array.from(table.querySelectorAll("tr")).slice(1);
        var groupedByCourseCode = new Map();

        rows.forEach(function eachRow(row) {
            var cells = Array.from(row.querySelectorAll("td"));
            if (!cells.length) return;

            function getCell(idx) {
                if (idx === undefined || idx < 0 || idx >= cells.length)
                    return "";
                return normalizeText(cells[idx].textContent);
            }

            var code = getCell(indexMap.courseCode) || getCell(0);
            if (!code || /course code/i.test(code)) return;
            if (!isValidCourseCode(code)) return;

            var courseName = getCell(indexMap.courseName) || "";
            var assignmentObtainedRaw = getCell(indexMap.assignmentObtained);
            var assignmentMaxRaw = getCell(indexMap.assignmentMax);
            var teeObtainedRaw = getCell(indexMap.teeObtained);
            var teeMaxRaw = getCell(indexMap.teeMax);
            var practicalObtainedRaw = getCell(indexMap.practicalObtained);
            var practicalMaxRaw = getCell(indexMap.practicalMax);
            var grade = getCell(indexMap.grade);
            var credits = toNumber(getCell(indexMap.credits));
            var statusRaw =
                getCell(indexMap.status) || getCell(cells.length - 1);
            var projectHint =
                /P$/.test(code) || /PROJECT|DISSERTATION/i.test(courseName);
            var labMarks = cells
                .map(function mapCell(cell, idx) {
                    var headerText = headerData.headers[idx]
                        ? normalizeText(
                              headerData.headers[idx].textContent,
                          ).toUpperCase()
                        : "";
                    if (!/^LAB\d+/.test(headerText)) return null;
                    return toNumber(cell.textContent);
                })
                .filter(function filterLab(value) {
                    return value !== null;
                });

            var labObtained = labMarks.length
                ? labMarks.reduce(function sum(a, b) {
                      return a + b;
                  }, 0)
                : null;
            var baseStatus = parseStatus(statusRaw);

            var course = {
                code: code,
                name: courseName,
                assignmentObtained: toNumber(assignmentObtainedRaw),
                assignmentMax: toNumber(assignmentMaxRaw),
                teeObtained: toNumber(teeObtainedRaw),
                teeMax: toNumber(teeMaxRaw),
                practicalObtained: toNumber(practicalObtainedRaw),
                practicalMax: toNumber(practicalMaxRaw),
                labObtained: labObtained,
                labMax: labObtained !== null ? 100 : null,
                grade: grade || "",
                credits: credits,
                status: baseStatus,
                isProjectLike: projectHint,
            };

            if (
                course.practicalObtained === null &&
                course.labObtained !== null
            ) {
                course.practicalObtained = course.labObtained;
                course.practicalMax = course.labMax;
            }

            var hasAnyMarks =
                course.assignmentObtained !== null ||
                course.teeObtained !== null ||
                course.practicalObtained !== null ||
                !!course.grade;
            course.status =
                course.status === "Unknown"
                    ? hasAnyMarks
                        ? "Completed"
                        : "Incomplete"
                    : course.status;
            if (!hasAnyMarks) {
                course.status = "Incomplete";
            }

            var normalizedCode = code.toUpperCase();
            course.code = normalizedCode;
            if (!groupedByCourseCode.has(normalizedCode)) {
                groupedByCourseCode.set(normalizedCode, []);
            }
            groupedByCourseCode.get(normalizedCode).push(course);
        });

        var completed = [];
        var pending = [];

        function scoreCourse(course) {
            return (
                (course.teeObtained || 0) +
                (course.practicalObtained || 0) +
                (course.assignmentObtained || 0)
            );
        }

        groupedByCourseCode.forEach(function selectBestAttempt(attempts) {
            var completedAttempts = attempts.filter(
                function filterCompleted(attempt) {
                    return attempt.status === "Completed";
                },
            );

            if (completedAttempts.length) {
                completedAttempts.sort(function sortCompleted(a, b) {
                    return scoreCourse(b) - scoreCourse(a);
                });
                completed.push(completedAttempts[0]);
                return;
            }

            attempts.sort(function sortAttempts(a, b) {
                return scoreCourse(b) - scoreCourse(a);
            });
            pending.push(attempts[0]);
        });

        return {
            programmeCode: extractProgrammeCode(),
            enrolmentNo: extractEnrolmentNo(),
            studentName: extractStudentName(),
            courses: completed.concat(pending),
        };
    }

    function waitForGradeTable(callback, options) {
        var timeoutMs = (options && options.timeoutMs) || 30000;
        var root = (options && options.root) || document.body;
        var resolved = false;

        function finalize(error, table) {
            if (resolved) return;
            resolved = true;
            if (observer) observer.disconnect();
            clearTimeout(timer);
            callback(error, table);
        }

        var existing = findGradeTable();
        if (existing) {
            callback(null, existing);
            return null;
        }

        var observer = new MutationObserver(function onMutations() {
            var table = findGradeTable();
            if (table) finalize(null, table);
        });

        observer.observe(root, {
            childList: true,
            subtree: true,
        });

        var timer = setTimeout(function onTimeout() {
            finalize(new Error("Grade table not found within timeout"), null);
        }, timeoutMs);

        return observer;
    }

    globalScope.IGNOUScraper = {
        waitForGradeTable: waitForGradeTable,
        parseGradeTable: parseGradeTable,
        extractProgrammeCode: extractProgrammeCode,
        extractStudentName: extractStudentName,
        findGradeTable: findGradeTable,
    };
})(window);
