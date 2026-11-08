export const studentStats = [
  {
    title: "Available Quizzes",
    value: 12,
    icon: "BookOpen",
    color: "purple",
  },
  {
    title: "Completed Quizzes",
    value: 8,
    icon: "CheckCircle",
    color: "green",
  },
  {
    title: "Average Score",
    value: "85%",
    icon: "ChartNoAxesColumnIncreasing",
    color: "blue",
  },
  {
    title: "Upcoming Quizzes",
    value: 3,
    icon: "Clock",
    color: "orange",
  },
];

export const quizzes = [
  {
    id: 1,
    title: "JavaScript Fundamentals",
    subject: "Web Development",
    questions: 20,
    duration: 30,
    difficulty: "Easy",
    status: "Available",
  },
  {
    id: 2,
    title: "Computer Networks",
    subject: "Networking",
    questions: 25,
    duration: 40,
    difficulty: "Medium",
    status: "Available",
  },
  {
    id: 3,
    title: "Database Management",
    subject: "DBMS",
    questions: 15,
    duration: 25,
    difficulty: "Easy",
    status: "Available",
  },
  {
    id: 4,
    title: "Data Structures",
    subject: "Programming",
    questions: 30,
    duration: 45,
    difficulty: "Hard",
    status: "Available",
  },
];

export const recentAttempts = [
  {
    id: 1,
    title: "Python Programming",
    date: "Nov 06, 2026",
    score: "90%",
    status: "Completed",
  },
  {
    id: 2,
    title: "Operating Systems",
    date: "Nov 04, 2026",
    score: "82%",
    status: "Completed",
  },
  {
    id: 3,
    title: "Computer Networks",
    date: "Nov 02, 2026",
    score: "76%",
    status: "Completed",
  },
];

export const quizQuestions = {
  1: [
    {
      id: 1,
      question: "Which keyword is used to declare a variable in JavaScript?",
      options: ["define", "let", "int", "string"],
    },
    {
      id: 2,
      question: "Which method is used to display output in the browser console?",
      options: ["console.log()", "print()", "display()", "echo()"],
    },
    {
      id: 3,
      question: "Which symbol is used for strict equality in JavaScript?",
      options: ["=", "==", "===", "!="],
    },
    {
      id: 4,
      question: "Which HTML tag is used to include JavaScript?",
      options: ["<style>", "<script>", "<js>", "<code>"],
    },
  ],

  2: [
    {
      id: 1,
      question: "What does IP stand for?",
      options: [
        "Internet Protocol",
        "Internal Program",
        "Internet Process",
        "Integrated Port",
      ],
    },
    {
      id: 2,
      question: "Which device forwards packets between networks?",
      options: ["Hub", "Router", "Repeater", "Keyboard"],
    },
    {
      id: 3,
      question: "How many layers are in the OSI model?",
      options: ["4", "5", "6", "7"],
    },
  ],
};

export const mockResults = [
  {
    id: 1,
    quiz: "Python Programming",
    subject: "Programming",
    date: "Nov 06, 2026",
    score: 90,
    totalQuestions: 20,
    attempted: 20,
    status: "Completed",
  },
  {
    id: 2,
    quiz: "Operating Systems",
    subject: "Computer Science",
    date: "Nov 04, 2026",
    score: 82,
    totalQuestions: 25,
    attempted: 23,
    status: "Completed",
  },
  {
    id: 3,
    quiz: "Computer Networks",
    subject: "Networking",
    date: "Nov 02, 2026",
    score: 76,
    totalQuestions: 20,
    attempted: 18,
    status: "Completed",
  },
  {
    id: 4,
    quiz: "Database Management",
    subject: "DBMS",
    date: "Oct 29, 2026",
    score: 88,
    totalQuestions: 15,
    attempted: 15,
    status: "Completed",
  },
];
