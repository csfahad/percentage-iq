(function initCalculator(globalScope) {
    "use strict";

    var GRADE_POINT_MAP = {
        O: 10,
        "A+": 9,
        A: 8,
        "B+": 7,
        B: 6,
        C: 5,
        D: 4,
        F: 0,
        AB: 0,
    };

    function toNumber(value) {
        if (value === null || value === undefined) return null;
        if (typeof value === "number" && !Number.isNaN(value)) return value;
        var text = String(value).trim();
        if (!text || text === "--" || /^ab$/i.test(text)) return null;
        var parsed = Number(text.replace(/[^\d.-]/g, ""));
        return Number.isFinite(parsed) ? parsed : null;
    }

    function normalizeGrade(rawGrade) {
        if (!rawGrade) return "";
        return String(rawGrade).trim().toUpperCase().replace(/\s+/g, "");
    }

    function calculateDivision(percentage) {
        if (percentage >= 60) return "First Division";
        if (percentage >= 50) return "Second Division";
        if (percentage >= 40) return "Pass";
        return "Fail";
    }

    function calculateCourseWeightedMarks(course) {
        var courseCode = String(course.code || "").toUpperCase();
        var assignmentObtained = toNumber(course.assignmentObtained);
        var assignmentMax = toNumber(course.assignmentMax);
        var teeObtained = toNumber(course.teeObtained);
        var teeMax = toNumber(course.teeMax);
        var practicalObtained = toNumber(course.practicalObtained);
        var practicalMax = toNumber(course.practicalMax);
        var labObtained = toNumber(course.labObtained);
        var labMax = toNumber(course.labMax);
        var assignmentOrLabObtained =
            assignmentObtained !== null ? assignmentObtained : labObtained;
        var assignmentOrLabMax =
            assignmentMax !== null
                ? assignmentMax
                : labMax !== null
                  ? labMax
                  : null;

        if (courseCode === "BCSP064") {
            var projectReportMarks =
                labObtained !== null ? labObtained : assignmentObtained;
            var vivaMarks =
                practicalObtained !== null ? practicalObtained : teeObtained;
            if (projectReportMarks !== null && vivaMarks !== null) {
                return {
                    obtained: projectReportMarks * 0.75 + vivaMarks * 0.25,
                    max: 100,
                };
            }
            if (projectReportMarks !== null) {
                return {
                    obtained: projectReportMarks,
                    max: 100,
                };
            }
            if (vivaMarks !== null) {
                return {
                    obtained: vivaMarks,
                    max: 100,
                };
            }
        }

        if (course.isProjectLike && practicalObtained !== null) {
            return {
                obtained: practicalObtained,
                max: practicalMax || 100,
            };
        }

        if (
            assignmentOrLabObtained === null &&
            teeObtained === null &&
            practicalObtained !== null
        ) {
            return {
                obtained: practicalObtained,
                max: practicalMax || 100,
            };
        }

        if (
            assignmentOrLabObtained === null &&
            teeObtained === null &&
            practicalObtained === null &&
            labObtained !== null
        ) {
            return {
                obtained: labObtained,
                max: labMax || 100,
            };
        }

        if (
            teeObtained === null &&
            practicalObtained !== null &&
            assignmentOrLabObtained !== null
        ) {
            var practicalWeighted =
                assignmentOrLabObtained * 0.3 + practicalObtained * 0.7;
            var practicalWeightedMax = 100;
            if (assignmentOrLabMax !== null && practicalMax !== null) {
                practicalWeightedMax =
                    assignmentOrLabMax * 0.3 + practicalMax * 0.7;
            }
            return {
                obtained: practicalWeighted,
                max: practicalWeightedMax,
            };
        }

        if (teeObtained === null && practicalObtained !== null) {
            return {
                obtained: practicalObtained,
                max: practicalMax || 100,
            };
        }

        var weighted =
            (assignmentOrLabObtained || 0) * 0.3 + (teeObtained || 0) * 0.7;
        var max = 100;
        if (assignmentOrLabMax !== null && teeMax !== null) {
            max = assignmentOrLabMax * 0.3 + teeMax * 0.7;
        }

        return {
            obtained: weighted,
            max: max,
        };
    }

    function hasOnlyLetterGrades(courses) {
        if (!courses.length) return false;
        return courses.every(function everyCourse(course) {
            var grade = normalizeGrade(course.grade);
            var assignment = toNumber(course.assignmentObtained);
            var tee = toNumber(course.teeObtained);
            var practical = toNumber(course.practicalObtained);
            return (
                !!grade &&
                GRADE_POINT_MAP[grade] !== undefined &&
                assignment === null &&
                tee === null &&
                practical === null
            );
        });
    }

    /**
     * @param {Object} input
     * @returns {"BCA_MCA"|"BDP_BA"|"CBCS"|"OTHER"}
     */
    function detectProgrammeType(input) {
        var optionText = ((input && input.dropdownText) || "").toUpperCase();
        var programCode = ((input && input.programmeCode) || "").toUpperCase();
        var url = ((input && input.url) || "").toUpperCase();
        var source = [optionText, programCode, url].join(" ");

        if (/CBCS|BAG|BCOMG|BSCG|BAVTM|BTS|BTSM|BSCANH|BAFHD|BSWG/.test(source))
            return "CBCS";
        if (/BCA|MCA|MCA_NEW|MP|MPB|PGDCA/.test(source)) return "BCA_MCA";
        if (/BDP|BA|B\.?COM|B\.?SC|ASSO/.test(source)) return "BDP_BA";
        return "OTHER";
    }

    /**
     * @param {Object} params
     * @param {Array<Object>} params.courses
     * @param {string} params.programmeType
     * @returns {Object}
     */
    function calculateResult(params) {
        var courses = (params && params.courses) || [];
        var programmeType = (params && params.programmeType) || "OTHER";

        var completedCourses = courses.filter(function filterCompleted(course) {
            return String(course.status || "").toLowerCase() === "completed";
        });
        var pendingCourses = courses.filter(function filterPending(course) {
            return String(course.status || "").toLowerCase() !== "completed";
        });

        if (!completedCourses.length) {
            return {
                state: "NO_DATA",
                programmeType: programmeType,
                overallPercentage: 0,
                division: "N/A",
                cgpa: null,
                subjectBreakdown: [],
                pendingCourses: pendingCourses,
                disclaimer: "",
            };
        }

        var effectiveType = programmeType;
        if (
            programmeType === "OTHER" &&
            hasOnlyLetterGrades(completedCourses)
        ) {
            effectiveType = "CBCS";
        }

        var subjectBreakdown = [];
        var overallPercentage = 0;
        var division = "N/A";
        var cgpa = null;
        var disclaimer = "";

        if (effectiveType === "CBCS") {
            var totalCredits = 0;
            var totalEarnedPoints = 0;

            completedCourses.forEach(function eachCbcs(course) {
                var credits = toNumber(course.credits) || 0;
                var grade = normalizeGrade(course.grade);
                var gp = GRADE_POINT_MAP[grade];

                if (gp === undefined) {
                    var obtained =
                        toNumber(course.teeObtained) ||
                        toNumber(course.assignmentObtained) ||
                        toNumber(course.practicalObtained);
                    var max =
                        toNumber(course.teeMax) ||
                        toNumber(course.assignmentMax) ||
                        toNumber(course.practicalMax) ||
                        100;
                    gp =
                        obtained !== null && max > 0
                            ? (obtained / max) * 10
                            : 0;
                }

                totalCredits += credits;
                totalEarnedPoints += gp * credits;

                subjectBreakdown.push({
                    code: course.code,
                    name: course.name,
                    obtained: gp * 10,
                    max: 100,
                    percentage: gp * 10,
                });
            });

            cgpa = totalCredits > 0 ? totalEarnedPoints / totalCredits : 0;
            overallPercentage = cgpa * 10;
            division = calculateDivision(overallPercentage);
            disclaimer =
                "Percentage is an approximation per UGC/IGNOU guidelines. Refer to official marksheet.";
        } else if (effectiveType === "BDP_BA") {
            var totalObtained = 0;
            var totalMax = 0;

            completedCourses.forEach(function eachBdp(course) {
                var weighted = calculateCourseWeightedMarks(course);
                var courseMax = weighted.max || 100;
                var courseObtained = weighted.obtained || 0;
                totalObtained += courseObtained;
                totalMax += courseMax;
                subjectBreakdown.push({
                    code: course.code,
                    name: course.name,
                    obtained: courseObtained,
                    max: courseMax,
                    percentage:
                        courseMax > 0 ? (courseObtained / courseMax) * 100 : 0,
                });
            });

            overallPercentage =
                totalMax > 0 ? (totalObtained / totalMax) * 100 : 0;
            division = calculateDivision(overallPercentage);
        } else {
            var totalWeighted = 0;
            var totalWeightedMax = 0;

            completedCourses.forEach(function eachWeighted(course) {
                var weightedScore = calculateCourseWeightedMarks(course);
                totalWeighted += weightedScore.obtained;
                totalWeightedMax += weightedScore.max || 100;
                subjectBreakdown.push({
                    code: course.code,
                    name: course.name,
                    obtained: weightedScore.obtained,
                    max: weightedScore.max,
                    percentage:
                        weightedScore.max > 0
                            ? (weightedScore.obtained / weightedScore.max) * 100
                            : 0,
                });
            });

            overallPercentage =
                totalWeightedMax > 0
                    ? (totalWeighted / totalWeightedMax) * 100
                    : 0;
            division = calculateDivision(overallPercentage);
        }

        return {
            state: pendingCourses.length ? "PARTIAL" : "SUCCESS",
            programmeType: effectiveType,
            overallPercentage: Number(overallPercentage.toFixed(2)),
            division: division,
            cgpa: cgpa !== null ? Number(cgpa.toFixed(2)) : null,
            subjectBreakdown: subjectBreakdown.map(
                function mapSubject(subject) {
                    return {
                        code: subject.code,
                        name: subject.name,
                        obtained: Number((subject.obtained || 0).toFixed(2)),
                        max: Number((subject.max || 0).toFixed(2)),
                        percentage: Number(
                            (subject.percentage || 0).toFixed(2),
                        ),
                    };
                },
            ),
            pendingCourses: pendingCourses,
            disclaimer: disclaimer,
        };
    }

    globalScope.IGNOUCalculator = {
        detectProgrammeType: detectProgrammeType,
        calculateResult: calculateResult,
        calculateDivision: calculateDivision,
        gradePointMap: GRADE_POINT_MAP,
    };
})(window);
