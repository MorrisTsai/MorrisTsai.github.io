(() => {
  const AUTH_KEY = "rewardSchoolAeasAuthV1";
  const toolbar = document.querySelector("[data-teacher-mock-toolbar]");
  const studentSelect = document.querySelector("[data-teacher-student-select]");
  const sessionSelect = document.querySelector("[data-teacher-session-select]");
  const stage = document.querySelector("[data-mock-stage]");
  if (!toolbar || !studentSelect || !sessionSelect || !stage) return;
  let authToken = "";
  let students = [];
  let detail = null;
  let observer;

  async function init() {
    try { authToken = JSON.parse(localStorage.getItem(AUTH_KEY) || "null")?.token || ""; } catch { return; }
    if (!authToken) return;
    try {
      const user = await window.rewardSchoolApi.getCurrentUser({ token: authToken });
      const allowed = user?.admin || (user?.permissions || []).some((p) => String(p).replace(/[_-]/g, "").toLowerCase() === "practicereview");
      if (!allowed) return;
      toolbar.hidden = false;
      students = (await window.rewardSchoolApi.getTeacherStudents({ token: authToken }))?.students || [];
      studentSelect.innerHTML = `<option value="">选择学生</option>${students.map((s) => `<option value="${s.id}">${escapeHTML(s.displayName || s.email)} · ${escapeHTML(s.email)}</option>`).join("")}`;
      studentSelect.addEventListener("change", () => loadStudent(studentSelect.value));
      sessionSelect.addEventListener("change", renderQuestionReview);
      stage.addEventListener("click", playAudio);
      observer = new MutationObserver(() => window.setTimeout(renderQuestionReview, 0));
      observer.observe(stage, { childList: true, subtree: true });
      const params = new URLSearchParams(location.search);
      const requestedStudent = params.get("teacherStudent");
      if (requestedStudent && students.some((s) => s.id === requestedStudent)) {
        studentSelect.value = requestedStudent;
        await loadStudent(requestedStudent, params.get("teacherSession") || "");
      }
    } catch (error) { console.warn("Teacher review mode unavailable:", error); }
  }

  async function loadStudent(studentId, requestedSession = "") {
    detail = null; sessionSelect.disabled = true;
    sessionSelect.innerHTML = `<option value="">正在读取刷次…</option>`;
    document.querySelector("[data-teacher-center-link]").href = studentId ? `teacher-grading.html?student=${encodeURIComponent(studentId)}` : "teacher-grading.html";
    if (!studentId) { sessionSelect.innerHTML = `<option value="">先选学生</option>`; return; }
    try {
      detail = await window.rewardSchoolApi.getTeacherStudentPractice({ token: authToken, studentId, kind: "aeas-mock" });
      const sessions = [...(detail.history?.attemptSessions || [])].sort((a,b)=>new Date(a.startedAt)-new Date(b.startedAt));
      sessionSelect.innerHTML = sessions.length ? sessions.map((item,index)=>`<option value="${escapeHTML(item.sessionId)}">第 ${index+1} 刷 · ${formatDate(item.startedAt)}</option>`).join("") : `<option value="">还没有练习</option>`;
      sessionSelect.disabled = !sessions.length;
      sessionSelect.value = requestedSession && sessions.some((s)=>s.sessionId===requestedSession) ? requestedSession : (sessions.at(-1)?.sessionId || "");
      renderQuestionReview();
    } catch (error) { sessionSelect.innerHTML = `<option value="">读取失败</option>`; }
  }

  function renderQuestionReview() {
    if (observer) observer.disconnect();
    stage.querySelector("[data-teacher-question-review]")?.remove();
    const context = window.rewardSchoolGetMockContext?.();
    if (!detail || !sessionSelect.value || !context?.subjectId || !context?.typeId || !context?.questionIndex) { reconnect(); return; }
    const key = `${context.subjectId}.${context.typeId}.${context.questionIndex}`;
    const sessionId = sessionSelect.value;
    const attempt = (detail.attempts || []).find((item) => item.sessionId === sessionId && item.questionKey === key);
    const progress = (detail.history?.progress || []).find((item) => item.sessionId === sessionId)?.progress;
    const fullRecord = progress?.answers?.[key];
    const audio = (detail.audio || []).filter((item) => item.sessionId === sessionId && item.questionKey === key);
    const box = document.createElement("section"); box.className = "teacher-question-review"; box.dataset.teacherQuestionReview = "";
    box.innerHTML = `<div class="teacher-question-review-header"><div><p class="eyebrow">Student Answer</p><h3>${escapeHTML(detail.student.displayName || detail.student.email)} · 当时的作答</h3></div><small>${escapeHTML(sessionSelect.options[sessionSelect.selectedIndex]?.text || "")}</small></div>
      ${attempt || fullRecord || audio.length ? `<div class="teacher-question-review-grid">
        <div class="teacher-question-review-block"><span>学生填写的答案</span><pre>${escapeHTML(formatValue(attempt?.answer || fullRecord?.answer || "（没有文字答案）"))}</pre></div>
        <div class="teacher-question-review-block"><span>完整记录（含随机追问与批改结果）</span><pre>${escapeHTML(formatValue(fullRecord || attempt?.result || "（没有附加记录）"))}</pre></div>
        ${audio.length ? `<div class="teacher-question-audio"><span>口语录音：</span>${audio.map((item)=>`<button type="button" data-teacher-audio="${item.id}" data-student="${detail.student.id}">${escapeHTML(labelSegment(item.segmentId))}</button>`).join("")}</div>` : ""}
      </div>` : `<div class="teacher-question-review-block" style="margin-top:14px"><span>本题记录</span><pre>这位学生在所选刷次中没有提交这道题。</pre></div>`}`;
    stage.append(box); reconnect();
  }

  function reconnect(){ if(observer) observer.observe(stage,{childList:true,subtree:true}); }
  async function playAudio(event){const button=event.target.closest("[data-teacher-audio]");if(!button)return;button.disabled=true;button.textContent="读取中…";try{const blob=await window.rewardSchoolApi.getTeacherAudioBlob({token:authToken,studentId:button.dataset.student,audioId:button.dataset.teacherAudio});const player=document.createElement("audio");player.controls=true;player.src=URL.createObjectURL(blob);button.parentElement.append(player);button.remove();await player.play().catch(()=>{});}catch(error){button.disabled=false;button.textContent="读取失败，请重试";}}
  function formatValue(value){if(value==null)return"（无）";if(typeof value==="string"){try{return formatValue(JSON.parse(value));}catch{return value||"（空白）";}}if(Array.isArray(value))return value.map((v,i)=>`${i+1}. ${typeof v==="object"?formatValue(v):v}`).join("\n");if(typeof value==="object")return Object.entries(value).map(([k,v])=>`${labelField(k)}：${typeof v==="object"?`\n${formatValue(v)}`:v}`).join("\n");return String(value);}
  function labelField(key){return({essay:"作文",answer:"答案",speakingFollowUps:"随机追问题目",speakingRecordings:"录音记录",speakingReview:"口语评分",aiReview:"AI 批改",graded:"已批改",correct:"是否正确",updatedAt:"保存时间"})[key]||key;}
  function labelSegment(value){if(value==="main")return"主回答";if(String(value).startsWith("followup"))return`追问 ${String(value).replace(/\D/g,"")}`;return value||"录音";}
  function formatDate(value){const d=new Date(value);return Number.isNaN(d)?"":new Intl.DateTimeFormat("zh-CN",{timeZone:"Australia/Sydney",month:"numeric",day:"numeric",hour:"2-digit",minute:"2-digit",hour12:false}).format(d);}
  function escapeHTML(value){return String(value??"").replace(/[&<>'"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"})[c]);}
  init();
})();
