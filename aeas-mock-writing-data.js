const aeasWritingPrompts = [
  "Many schools require students to wear uniforms. Do you think school uniforms are a good idea? Why or why not?",
  "Should mobile phones be banned in schools? Give reasons for your answer.",
  "Some people believe homework is necessary for students. Others think students should have less homework. What is your opinion?",
  "Do you think students should be allowed to use artificial intelligence tools for school assignments?",
  "Is online learning as effective as learning in a classroom? Why or why not?",
  "Should students have more choice in the subjects they study at school?",
  "Some people think exams are the best way to measure students’ ability. Do you agree or disagree?",
  "Should schools start later in the morning? Give reasons for your opinion.",
  "Do you think teenagers should have part-time jobs while studying?",
  "Is it better for students to study overseas at a young age or after finishing high school?",
  "Should schools spend more time teaching life skills such as cooking, money management and communication?",
  "Do you think sports are as important as academic subjects at school?",
  "Should students be required to do community service?",
  "Some people believe competition is good for students. Others think it creates too much pressure. What do you think?",
  "Should schools give students more freedom to choose their own rules?",
  "Do the advantages of social media outweigh the disadvantages for teenagers?",
  "Should parents limit the amount of time teenagers spend online?",
  "Is technology making students better learners or more distracted?",
  "Do you think reading books is still important in the age of the internet?",
  "Should students learn a second language at school?",
  "Some people think schools should focus more on creativity. Do you agree or disagree?",
  "Is it better to work in a team or work alone? Give reasons for your answer.",
  "Do you think students should be rewarded for good behaviour and good grades?",
  "Should schools have stricter rules about bullying?",
  "Is it important for teenagers to learn how to manage money?",
  "Do you think travelling is an important part of education?",
  "Should students be allowed to choose whether they study music, art or drama?",
  "Some people believe that success depends more on hard work than talent. What is your opinion?",
  "Should schools teach students more about environmental protection?",
  "What makes a good school? Give reasons and examples.",
];

const aeasWritingQuestionBase = {
  context: "Writing Task",
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
};

window.aeasMockWritingQuestionsByType = {
  writing: aeasWritingPrompts.map((text, index) => ({
    ...aeasWritingQuestionBase,
    number: index + 1,
    sourceNumber: index + 1,
    text,
  })),
};

aeasWritingPrompts.push(
  "Some people think students should spend more time learning outdoors. Do you agree or disagree?",
  "Should schools give students more opportunities to learn about different cultures?",
  "Do you think teenagers should be trusted to organise their own study schedules?",
  "Some people believe that school trips are an important part of education. What is your opinion?",
  "Should students be required to learn basic first aid at school?",
  "Is it better for students to have one close friend or a large group of friends?",
  "Do you think schools should do more to protect the environment?",
  "Should young people spend less time watching short videos online?",
  "Some people think mistakes are the best way to learn. Do you agree or disagree?",
  "Should schools teach students how to speak confidently in public?"
);

window.aeasMockWritingQuestionsByType.writing = aeasWritingPrompts.map((text, index) => ({
  ...aeasWritingQuestionBase,
  number: index + 1,
  sourceNumber: index + 1,
  text,
}));
