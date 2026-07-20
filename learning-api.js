(function () {
  function tokenHeaders(token, json = false) {
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    if (json) headers["Content-Type"] = "application/json";
    return headers;
  }

  function learningPath(path) {
    return getApiEndpoint(`/learning${path}`);
  }

  function query(path, values) {
    const params = new URLSearchParams();
    Object.entries(values || {}).forEach(([key, value]) => {
      if (value !== undefined && value !== null && String(value).trim()) params.set(key, value);
    });
    const suffix = params.toString();
    return `${learningPath(path)}${suffix ? `?${suffix}` : ""}`;
  }

  window.rewardSchoolLearningApi = {
    getCurrentUser({ token }) {
      return fetchJson(getApiEndpoint("/auth/me"), { headers: tokenHeaders(token) });
    },
    getTeacherStudents({ token }) {
      return fetchJson(getApiEndpoint("/teacher/students"), { headers: tokenHeaders(token) });
    },
    getQuestions({ token, filters = {} }) {
      return fetchJson(query("/questions", filters), { headers: tokenHeaders(token) });
    },
    getPacks({ token }) {
      return fetchJson(learningPath("/packs"), { headers: tokenHeaders(token) });
    },
    getPack({ token, packId }) {
      return fetchJson(learningPath(`/packs/${encodeURIComponent(packId)}`), { headers: tokenHeaders(token) });
    },
    createPack({ token, title, description, questionIds }) {
      return fetchJson(learningPath("/packs"), {
        method: "POST",
        headers: tokenHeaders(token, true),
        body: JSON.stringify({ title, description, questionIds }),
      });
    },
    getTeacherDashboard({ token }) {
      return fetchJson(learningPath("/teacher/dashboard"), { headers: tokenHeaders(token) });
    },
    getTeacherAssignments({ token, studentId = "" }) {
      return fetchJson(query("/teacher/assignments", { studentId }), { headers: tokenHeaders(token) });
    },
    getTeacherAssignment({ token, assignmentId }) {
      return fetchJson(learningPath(`/teacher/assignments/${encodeURIComponent(assignmentId)}`), { headers: tokenHeaders(token) });
    },
    createAssignment({ token, payload }) {
      return fetchJson(learningPath("/teacher/assignments"), {
        method: "POST",
        headers: tokenHeaders(token, true),
        body: JSON.stringify(payload),
      });
    },
    getReviewQueue({ token }) {
      return fetchJson(learningPath("/teacher/review-queue"), { headers: tokenHeaders(token) });
    },
    saveFeedback({ token, responseId, payload }) {
      return fetchJson(learningPath(`/teacher/responses/${encodeURIComponent(responseId)}/feedback`), {
        method: "PUT",
        headers: tokenHeaders(token, true),
        body: JSON.stringify(payload),
      });
    },
    getStudentInsights({ token, studentId }) {
      return fetchJson(learningPath(`/teacher/students/${encodeURIComponent(studentId)}/insights`), { headers: tokenHeaders(token) });
    },
    getStudentAssignments({ token }) {
      return fetchJson(learningPath("/student/assignments"), { headers: tokenHeaders(token) });
    },
    getStudentAssignment({ token, assignmentId }) {
      return fetchJson(learningPath(`/student/assignments/${encodeURIComponent(assignmentId)}`), { headers: tokenHeaders(token) });
    },
    saveStudentResponse({ token, assignmentItemId, answer }) {
      return fetchJson(learningPath("/student/responses"), {
        method: "PUT",
        headers: tokenHeaders(token, true),
        body: JSON.stringify({ assignmentItemId, answer }),
      });
    },
    submitAssignment({ token, assignmentId }) {
      return fetchJson(learningPath(`/student/assignments/${encodeURIComponent(assignmentId)}/submit`), {
        method: "POST",
        headers: tokenHeaders(token),
      });
    },
    createRepractice({ token, assignmentId }) {
      return fetchJson(learningPath(`/student/assignments/${encodeURIComponent(assignmentId)}/repractice`), {
        method: "POST",
        headers: tokenHeaders(token),
      });
    },
    async uploadAssignmentAudio({ token, assignmentId, questionKey, blob }) {
      const body = new FormData();
      body.append("kind", "learning-assignment");
      body.append("sessionId", assignmentId);
      body.append("questionKey", questionKey);
      body.append("segmentId", "main");
      body.append("audio", blob, `assignment-${questionKey}.webm`);
      return fetchJson(getApiEndpoint("/practice/audio"), {
        method: "POST",
        headers: tokenHeaders(token),
        body,
        timeoutMs: 120000,
      });
    },
    getTeacherClassrooms({ token }) {
      return fetchJson(learningPath("/teacher/classrooms"), { headers: tokenHeaders(token) });
    },
    createTeacherClassroom({ token, studentId, title }) {
      return fetchJson(learningPath("/teacher/classrooms"), { method: "POST", headers: tokenHeaders(token, true), body: JSON.stringify({ studentId, title }) });
    },
    getTeacherClassroom({ token, sessionId }) {
      return fetchJson(learningPath(`/teacher/classrooms/${encodeURIComponent(sessionId)}`), { headers: tokenHeaders(token) });
    },
    sendTeacherClassroomCommand({ token, sessionId, type, payload = {} }) {
      return fetchJson(learningPath(`/teacher/classrooms/${encodeURIComponent(sessionId)}/commands`), { method: "POST", headers: tokenHeaders(token, true), body: JSON.stringify({ type, payload }) });
    },
    getStudentClassrooms({ token }) {
      return fetchJson(learningPath("/student/classrooms"), { headers: tokenHeaders(token) });
    },
    getStudentClassroom({ token, sessionId }) {
      return fetchJson(learningPath(`/student/classrooms/${encodeURIComponent(sessionId)}`), { headers: tokenHeaders(token) });
    },
    sendStudentClassroomResponse({ token, sessionId, answer }) {
      return fetchJson(learningPath(`/student/classrooms/${encodeURIComponent(sessionId)}/response`), { method: "POST", headers: tokenHeaders(token, true), body: JSON.stringify({ type: "response.update", payload: { answer } }) });
    },
  };
})();
