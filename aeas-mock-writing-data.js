window.aeasMockWritingQuestionsByType = {
  writing: [
    {
      number: 1,
      sourceNumber: 1,
      context: "Writing Task",
      text: "Many schools require students to wear uniforms. Do you think school uniforms are a good idea? Why or why not?",
      timeAllowed: "30 minutes",
      wordRequirement: "You should write at least 200 words.",
      answerType: "input",
      reviewMode: "ai",
      aiProvider: "ai",
      expectedLength: "Write a clear essay with your opinion, reasons, and examples.",
      inputFields: [
        {
          id: "essay",
          label: "Your essay",
          type: "textarea",
          rows: 14,
          placeholder: "Write your essay here...",
        },
      ],
      aiRubric: [
        "Clear opinion and task response",
        "Relevant reasons and examples",
        "Logical paragraph structure",
        "Vocabulary range and accuracy",
        "Grammar control and sentence variety",
      ],
      aiPromptTemplate:
        "You are an AEAS writing tutor. Review the student's essay for the prompt, give a score-style diagnostic, explain strengths and weaknesses, and provide concrete revision advice.",
      explanation:
        "这道写作题已经准备好接入 AI 批改。当前版本会保存学生作文，AI 评分与反馈功能会在提交后显示。",
    },
  ],
};
