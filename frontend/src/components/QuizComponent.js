import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';

const QuizComponent = () => {
  const location = useLocation();
  const quiz = location.state?.quizData || []; 
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [score, setScore] = useState(0);
  const [isQuizFinished, setIsQuizFinished] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);

  // Handle the selection of an answer
  const handleAnswerSelect = (answer) => {
    setSelectedAnswer(answer);
    const correctAnswer = quiz.questions[currentQuestionIndex].answer;
    const selectedIsCorrect = answer === correctAnswer;
    
    setIsCorrect(selectedIsCorrect);
    setShowFeedback(true);
    
    if (selectedIsCorrect) {
      setScore(prevScore => prevScore + 1);
    }

    // Automatically move to next question after a short delay
    setTimeout(() => {
      handleNextQuestion();
    }, 1500);
  };

  // Handle moving to the next question or finishing the quiz
  const handleNextQuestion = () => {
    setShowFeedback(false);
    setSelectedAnswer(null);

    if (currentQuestionIndex < quiz.questions.length - 1) {
      setCurrentQuestionIndex(prevIndex => prevIndex + 1);
    } else {
      setIsQuizFinished(true);
    }
  };

  // Return loading message if quiz data is not yet available
  if (!quiz.questions || quiz.questions.length === 0) {
    return <p>Loading quiz...</p>;
  }

  // Ensure there are valid questions to display
  const currentQuestion = quiz.questions[currentQuestionIndex];

  if (!currentQuestion) {
    return <p>No questions available</p>;
  }

  return (
    <div className="quiz-container flex flex-col min-h-screen p-6 bg-[#2F4550] text-white rounded-lg shadow-lg justify-between">
      {isQuizFinished ? (
        <div className="result text-center">
          <h2 className="text-3xl mb-4">Quiz Finished!</h2>
          <p className="text-xl mb-4">Your Score: {score} / {quiz.questions.length}</p>
          <p className="text-lg">
            {score === quiz.questions.length 
              ? "Perfect score! Outstanding job!" 
              : score >= quiz.questions.length / 2 
                ? "Good job! You did well." 
                : "Keep practicing to improve your score."}
          </p>
        </div>
      ) : (
        <div className="question-section flex flex-col items-center justify-center flex-grow">
          <div className="score-tracker mb-4 text-xl">
            Score: {score} / {quiz.questions.length}
          </div>
          <h2 className="text-2xl md:text-3xl mb-4 text-center">{currentQuestion.question}</h2>
          <div className="options space-y-4 w-full max-w-md">
            {currentQuestion.options.map((option, index) => (
              <button
                key={index}
                onClick={() => selectedAnswer === null && handleAnswerSelect(option)}
                className={`p-4 w-full rounded-lg shadow-lg transition-all duration-300 text-center
                  ${showFeedback 
                    ? (option === currentQuestion.answer
                        ? 'bg-green-600' 
                        : (selectedAnswer === option 
                            ? 'bg-red-600' 
                            : 'bg-[#CE4760]'))
                    : (selectedAnswer === option
                        ? 'bg-[#2F4550] text-white'
                        : 'bg-[#CE4760] text-white hover:bg-white hover:text-black')}
                  ${selectedAnswer !== null ? 'cursor-not-allowed' : ''}`}
                disabled={selectedAnswer !== null}
              >
                {option}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default QuizComponent;