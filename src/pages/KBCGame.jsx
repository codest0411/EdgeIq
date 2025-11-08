import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Trophy, Clock, Zap, Star, Award, Home, 
  CheckCircle, XCircle, AlertCircle, ArrowRight,
  Scissors, Users, Database, GraduationCap, Target
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../components/ToastContainer';
import LoadingSpinner from '../components/LoadingSpinner';

// Prize ladder - 15 questions from 50 XP to 5600 XP
const PRIZE_LADDER = [
  { level: 1, xp: 50, difficulty: 'easy' },
  { level: 2, xp: 100, difficulty: 'easy' },
  { level: 3, xp: 200, difficulty: 'easy' },
  { level: 4, xp: 300, difficulty: 'easy' },
  { level: 5, xp: 500, difficulty: 'medium' },
  { level: 6, xp: 700, difficulty: 'medium' },
  { level: 7, xp: 1000, difficulty: 'medium' },
  { level: 8, xp: 1400, difficulty: 'medium' },
  { level: 9, xp: 1800, difficulty: 'medium' },
  { level: 10, xp: 2200, difficulty: 'hard' },
  { level: 11, xp: 2800, difficulty: 'hard' },
  { level: 12, xp: 3500, difficulty: 'hard' },
  { level: 13, xp: 4200, difficulty: 'hard' },
  { level: 14, xp: 4900, difficulty: 'hard' },
  { level: 15, xp: 5600, difficulty: 'hard' }
];

const TIME_PER_QUESTION = 40; // seconds

// Lifelines configuration
const LIFELINES = {
  fifty_fifty: {
    name: '50:50',
    icon: Scissors,
    description: 'Removes 2 wrong options (70% accurate)',
    xpCost: 0,
    accuracy: 0.7
  },
  audience_poll: {
    name: 'Audience Poll',
    icon: Users,
    description: 'Audience guess (60% accurate)',
    xpCost: 0,
    accuracy: 0.6
  },
  stored_answer: {
    name: 'Stored Answer',
    icon: Database,
    description: 'Auto answer (-500 XP)',
    xpCost: 500,
    accuracy: 1.0
  },
  expert_advice: {
    name: 'Expert Advice',
    icon: GraduationCap,
    description: 'Correct but costs -100 XP',
    xpCost: 100,
    accuracy: 1.0
  },
  double_dip: {
    name: 'Double Dip',
    icon: Target,
    description: 'Try 2 answers (no XP loss)',
    xpCost: 0,
    accuracy: 1.0
  }
};

export default function KBCGame() {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();
  
  const [gameState, setGameState] = useState('start'); // start, playing, won, lost
  const [currentLevel, setCurrentLevel] = useState(0);
  const [questions, setQuestions] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [isAnswerRevealed, setIsAnswerRevealed] = useState(false);
  const [timeLeft, setTimeLeft] = useState(TIME_PER_QUESTION);
  const [loading, setLoading] = useState(false);
  const [earnedXP, setEarnedXP] = useState(0);
  const [gameId, setGameId] = useState(null);
  const [warningCount, setWarningCount] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [lockTimeRemaining, setLockTimeRemaining] = useState(0);
  
  // Lifeline states
  const [usedLifelines, setUsedLifelines] = useState([]);
  const [xpDeductedLifelines, setXpDeductedLifelines] = useState(0);
  const [lifelineEffect, setLifelineEffect] = useState(null); // Current active lifeline effect
  const [removedOptions, setRemovedOptions] = useState([]); // For 50:50
  const [audiencePollData, setAudiencePollData] = useState(null); // For audience poll
  const [doubleDipAttempts, setDoubleDipAttempts] = useState(0); // For double dip
  const [firstDoubleDipAnswer, setFirstDoubleDipAnswer] = useState(null);
  
  const timerRef = useRef(null);
  const gameContainerRef = useRef(null);
  const lockTimerRef = useRef(null);

  const checkLockStatus = useCallback(async () => {
    if (!user) {
      console.log('No user, skipping lock check');
      return false;
    }
    
    console.log('🔍 Checking lock status for user:', user.id);
    
    try {
      // Check if user has an active lock in xp_battle_games table
      const { data: lastGame, error } = await supabase
        .from('xp_battle_games')
        .select('completed_at, status, id')
        .eq('user_id', user.id)
        .eq('status', 'quit_locked')
        .order('completed_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      console.log('📊 Lock check result:', { lastGame, error });

      if (lastGame && lastGame.completed_at) {
        const completedTime = new Date(lastGame.completed_at).getTime();
        const lockUntil = completedTime + (5 * 60 * 1000); // 5 minutes after quit
        const now = Date.now();
        const remainingMs = lockUntil - now;
        const remainingSeconds = Math.ceil(remainingMs / 1000);
        
        console.log('⏰ Lock time check:', {
          completedAt: lastGame.completed_at,
          completedTime: new Date(completedTime).toLocaleString(),
          lockUntil: new Date(lockUntil).toLocaleString(),
          now: new Date(now).toLocaleString(),
          remainingMs,
          remainingSeconds,
          isStillLocked: remainingMs > 0
        });
        
        if (remainingMs > 0) {
          console.log('🔒 GAME IS LOCKED for', remainingSeconds, 'seconds (', Math.floor(remainingSeconds / 60), 'min', remainingSeconds % 60, 'sec )');
          setIsLocked(true);
          setLockTimeRemaining(remainingSeconds);
          return true;
        } else {
          console.log('🔓 Lock expired (', Math.abs(remainingSeconds), 'seconds ago), updating database');
          console.log('Updating game ID:', lastGame.id);
          
          // Lock expired, update status
          const { data: updateData, error: updateError } = await supabase
            .from('xp_battle_games')
            .update({ status: 'failed' })
            .eq('id', lastGame.id)
            .select();
          
          if (updateError) {
            console.error('❌ Error updating expired lock:', updateError);
            console.error('Update details:', { gameId: lastGame.id, error: updateError });
          } else {
            console.log('✅ Lock status updated to failed', updateData);
          }
          
          setIsLocked(false);
          setLockTimeRemaining(0);
          return false;
        }
      } else {
        console.log('✅ No active lock found');
        setIsLocked(false);
        setLockTimeRemaining(0);
        return false;
      }
    } catch (error) {
      console.error('❌ Error checking lock status:', error);
      return false;
    }
  }, [user]);

  useEffect(() => {
    console.log('🎮 KBC Game Component Mounted/Updated', { isAuthenticated, user: user?.id });
    
    if (!isAuthenticated) {
      exitFullscreen(); // Exit fullscreen when redirecting to auth
      navigate('/auth');
      return;
    }
    
    if (user) {
      console.log('✅ User found, checking lock status...');
      checkLockStatus();
    }
  }, [isAuthenticated, user, checkLockStatus, navigate]);

  // Also check lock status when component mounts or becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && user) {
        console.log('👁️ Page became visible, checking lock...');
        checkLockStatus();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [user, checkLockStatus]);

  // Cleanup: Exit fullscreen when component unmounts
  useEffect(() => {
    return () => {
      exitFullscreen();
    };
  }, []);

  // Periodic lock check every 2 seconds to ensure lock persists
  useEffect(() => {
    if (!user) return;

    console.log('⏲️ Starting periodic lock check (every 2 seconds)');
    const lockCheckInterval = setInterval(() => {
      console.log('🔄 Periodic lock check...');
      checkLockStatus();
    }, 2000); // Check every 2 seconds

    return () => {
      console.log('🛑 Stopping periodic lock check');
      clearInterval(lockCheckInterval);
    };
  }, [user, checkLockStatus]);

  // Lock timer countdown
  useEffect(() => {
    if (isLocked && lockTimeRemaining > 0) {
      lockTimerRef.current = setInterval(async () => {
        setLockTimeRemaining(prev => {
          if (prev <= 1) {
            clearInterval(lockTimerRef.current);
            // Re-check database before unlocking
            checkLockStatus();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(lockTimerRef.current);
    }
  }, [isLocked, lockTimeRemaining, checkLockStatus]);

  useEffect(() => {
    if (gameState === 'playing' && !isAnswerRevealed) {
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            handleTimeout();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timerRef.current);
    }
  }, [gameState, isAnswerRevealed, currentLevel]);

  // Security Feature: Monitor tab switching and fullscreen
  useEffect(() => {
    if (gameState !== 'playing') return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        const newWarningCount = warningCount + 1;
        setWarningCount(newWarningCount);

        if (newWarningCount >= 3) {
          showToast('⛔ Game terminated due to tab switching!', 'error');
          endGame('lost', earnedXP);
        } else {
          showToast(`⚠️ Warning ${newWarningCount}/3: Don't switch tabs!`, 'error');
        }
      }
    };

    const handleFullscreenChange = () => {
      if (!document.fullscreenElement && gameState === 'playing') {
        const newWarningCount = warningCount + 1;
        setWarningCount(newWarningCount);

        if (newWarningCount >= 3) {
          showToast('⛔ Game terminated due to exiting fullscreen!', 'error');
          endGame('lost', earnedXP);
        } else {
          showToast(`⚠️ Warning ${newWarningCount}/3: Stay in fullscreen!`, 'error');
          // Try to re-enter fullscreen
          enterFullscreen();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    document.addEventListener('fullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, [gameState, warningCount, earnedXP]);

  const enterFullscreen = async () => {
    try {
      // Only fullscreen the game container when playing
      const elem = gameContainerRef.current;
      if (!elem) return;
      
      if (elem.requestFullscreen) {
        await elem.requestFullscreen();
      } else if (elem.webkitRequestFullscreen) { // Safari
        await elem.webkitRequestFullscreen();
      } else if (elem.msRequestFullscreen) { // IE11
        await elem.msRequestFullscreen();
      }
    } catch (error) {
      console.error('Fullscreen error:', error);
      showToast('⚠️ Please allow fullscreen for secure gameplay', 'error');
    }
  };

  const exitFullscreen = async () => {
    try {
      // Only exit if currently in fullscreen
      if (!document.fullscreenElement && !document.webkitFullscreenElement && !document.msFullscreenElement) {
        console.log('Not in fullscreen, skipping exit');
        return;
      }
      
      if (document.exitFullscreen) {
        await document.exitFullscreen();
      } else if (document.webkitExitFullscreen) {
        await document.webkitExitFullscreen();
      } else if (document.msExitFullscreen) {
        await document.msExitFullscreen();
      }
    } catch (error) {
      console.error('Exit fullscreen error:', error);
    }
  };

  // Lifeline handlers
  const useLifeline = async (lifelineKey) => {
    if (usedLifelines.includes(lifelineKey)) {
      showToast('This lifeline has already been used!', 'error');
      return;
    }

    const lifeline = LIFELINES[lifelineKey];
    setUsedLifelines([...usedLifelines, lifelineKey]);

    switch (lifelineKey) {
      case 'fifty_fifty':
        handleFiftyFifty();
        break;
      case 'audience_poll':
        handleAudiencePoll();
        break;
      case 'stored_answer':
        await handleStoredAnswer();
        break;
      case 'expert_advice':
        await handleExpertAdvice();
        break;
      case 'double_dip':
        handleDoubleDip();
        break;
    }

    // Deduct XP if lifeline has a cost
    if (lifeline.xpCost > 0) {
      setXpDeductedLifelines(prev => prev + lifeline.xpCost);
      showToast(`${lifeline.name} used – ${lifeline.xpCost} XP deducted`, 'info');
    } else {
      showToast(`${lifeline.name} activated!`, 'success');
    }
  };

  const handleFiftyFifty = () => {
    const correctIndex = currentQuestion.correctAnswer;
    const wrongIndices = currentQuestion.options
      .map((_, index) => index)
      .filter(index => index !== correctIndex);

    // 70% chance to keep correct answer visible
    const keepCorrect = Math.random() < 0.7;
    
    let toRemove;
    if (keepCorrect) {
      // Remove 2 wrong answers, keep correct + 1 wrong
      toRemove = wrongIndices.slice(0, 2);
    } else {
      // Remove correct + 1 wrong (making it harder)
      toRemove = [correctIndex, wrongIndices[0]];
    }

    setRemovedOptions(toRemove);
    setLifelineEffect('fifty_fifty');
  };

  const handleAudiencePoll = () => {
    const correctIndex = currentQuestion.correctAnswer;
    const pollResults = currentQuestion.options.map((_, index) => {
      if (index === correctIndex) {
        // 60% chance audience picks correct
        return Math.random() < 0.6 ? Math.random() * 40 + 40 : Math.random() * 20;
      }
      return Math.random() * 30;
    });

    // Normalize to 100%
    const total = pollResults.reduce((a, b) => a + b, 0);
    const normalized = pollResults.map(v => Math.round((v / total) * 100));

    setAudiencePollData(normalized);
    setLifelineEffect('audience_poll');
  };

  const handleStoredAnswer = async () => {
    // Auto-select correct answer
    const correctIndex = currentQuestion.correctAnswer;
    setSelectedAnswer(correctIndex);
    setIsAnswerRevealed(true);
    clearInterval(timerRef.current);
    
    setLifelineEffect('stored_answer');
    
    // Wait 2 seconds then move to next question
    setTimeout(() => {
      handleCorrectAnswer();
    }, 2000);
  };

  const handleExpertAdvice = async () => {
    const correctIndex = currentQuestion.correctAnswer;
    setLifelineEffect({
      type: 'expert_advice',
      correctIndex,
      explanation: `The expert suggests option ${String.fromCharCode(65 + correctIndex)}: "${currentQuestion.options[correctIndex]}"`
    });
  };

  const handleDoubleDip = () => {
    setDoubleDipAttempts(0);
    setLifelineEffect('double_dip');
    showToast('You can now select two answers!', 'info');
  };

  const startGame = async () => {
    // Check if game is locked
    if (isLocked) {
      showToast('⏱️ Game is locked. Please wait for the timer to expire.', 'error');
      return;
    }
    
    setLoading(true);
    try {
      // Fetch ALL questions from XP Battle questions table
      const { data: allQuizData, error: fetchError } = await supabase
        .from('xp_battle_questions')
        .select('id, title, difficulty, questions');

      if (fetchError || !allQuizData || allQuizData.length === 0) {
        showToast('Failed to load questions. Please try again.', 'error');
        setLoading(false);
        return;
      }

      // Combine all questions from all quizzes into one pool
      const questionPool = {
        easy: [],
        medium: [],
        hard: []
      };

      allQuizData.forEach(quiz => {
        if (quiz.questions && Array.isArray(quiz.questions)) {
          quiz.questions.forEach(q => {
            questionPool[quiz.difficulty].push(q);
          });
        }
      });

      console.log('📚 Question Pool:', {
        easy: questionPool.easy.length,
        medium: questionPool.medium.length,
        hard: questionPool.hard.length,
        total: questionPool.easy.length + questionPool.medium.length + questionPool.hard.length
      });

      // Verify we have enough questions
      const easyCount = PRIZE_LADDER.filter(p => p.difficulty === 'easy').length;
      const mediumCount = PRIZE_LADDER.filter(p => p.difficulty === 'medium').length;
      const hardCount = PRIZE_LADDER.filter(p => p.difficulty === 'hard').length;

      if (questionPool.easy.length < easyCount || 
          questionPool.medium.length < mediumCount || 
          questionPool.hard.length < hardCount) {
        showToast('Not enough questions in database. Need at least 60 questions total.', 'error');
        setLoading(false);
        return;
      }

      // Randomly select 15 unique questions based on difficulty
      const selectedQuestions = [];
      const usedIndices = {
        easy: new Set(),
        medium: new Set(),
        hard: new Set()
      };

      for (const prize of PRIZE_LADDER) {
        const pool = questionPool[prize.difficulty];
        const usedSet = usedIndices[prize.difficulty];
        
        // Find a random unused question
        let randomIndex;
        let attempts = 0;
        do {
          randomIndex = Math.floor(Math.random() * pool.length);
          attempts++;
          if (attempts > 100) {
            console.error('Could not find unique question after 100 attempts');
            break;
          }
        } while (usedSet.has(randomIndex));

        usedSet.add(randomIndex);
        const selectedQ = pool[randomIndex];

        selectedQuestions.push({
          ...selectedQ,
          level: prize.level,
          xp: prize.xp,
          difficulty: prize.difficulty
        });
      }

      console.log('✅ Selected 15 unique questions:', selectedQuestions.length);

      setQuestions(selectedQuestions);
      setCurrentLevel(0);
      setEarnedXP(0);
      setWarningCount(0); // Reset warnings
      setCurrentQuestion(selectedQuestions[0]);
      setTimeLeft(TIME_PER_QUESTION);
      
      // Create XP Battle game session
      const { data: gameSession } = await supabase
        .from('xp_battle_games')
        .insert({
          user_id: user.id,
          status: 'in_progress',
          current_level: 1,
          earned_xp: 0
        })
        .select()
        .single();
      
      setGameId(gameSession?.id);
      
      // Set game state to playing FIRST
      setGameState('playing');
      setLoading(false);
      
      // THEN enter fullscreen after a small delay (to ensure DOM is ready)
      setTimeout(async () => {
        await enterFullscreen();
        showToast('⚠️ Game is now in secure mode. Don\'t switch tabs or exit fullscreen!', 'info');
      }, 100);
      
    } catch (error) {
      console.error('Error starting game:', error);
      showToast('Failed to start game', 'error');
      setLoading(false);
    }
  };

  const handleAnswerSelect = (answerIndex) => {
    // Double Dip logic
    if (lifelineEffect === 'double_dip' && doubleDipAttempts === 0) {
      setFirstDoubleDipAnswer(answerIndex);
      setDoubleDipAttempts(1);
      
      const isCorrect = answerIndex === currentQuestion.correctAnswer;
      if (isCorrect) {
        // First answer correct
        clearInterval(timerRef.current);
        setSelectedAnswer(answerIndex);
        setIsAnswerRevealed(true);
        setTimeout(() => handleCorrectAnswer(), 2000);
      } else {
        // First answer wrong, allow second attempt
        showToast('First attempt incorrect. Try again!', 'info');
        return;
      }
      return;
    }
    
    if (isAnswerRevealed || selectedAnswer !== null) return;
    
    clearInterval(timerRef.current);
    setSelectedAnswer(answerIndex);
    setIsAnswerRevealed(true);

    const isCorrect = answerIndex === currentQuestion.correctAnswer;
    
    setTimeout(() => {
      if (isCorrect) {
        handleCorrectAnswer();
      } else {
        handleWrongAnswer();
      }
    }, 2000);
  };

  const handleCorrectAnswer = async () => {
    const newXP = PRIZE_LADDER[currentLevel].xp;
    setEarnedXP(newXP);

    // Update XP Battle game session with lifeline data
    if (gameId) {
      await supabase
        .from('xp_battle_games')
        .update({
          current_level: currentLevel + 2,
          earned_xp: newXP,
          lifelines_used: usedLifelines,
          xp_deducted_lifelines: xpDeductedLifelines
        })
        .eq('id', gameId);
    }

    if (currentLevel === PRIZE_LADDER.length - 1) {
      // Won the game!
      const finalXP = newXP - xpDeductedLifelines;
      await endGame('won', finalXP);
    } else {
      // Next question - reset lifeline effects
      setTimeout(() => {
        const nextLevel = currentLevel + 1;
        setCurrentLevel(nextLevel);
        setCurrentQuestion(questions[nextLevel]);
        setSelectedAnswer(null);
        setIsAnswerRevealed(false);
        setTimeLeft(TIME_PER_QUESTION);
        
        // Reset lifeline effects for new question
        setLifelineEffect(null);
        setRemovedOptions([]);
        setAudiencePollData(null);
        setDoubleDipAttempts(0);
        setFirstDoubleDipAnswer(null);
      }, 1500);
    }
  };

  const handleWrongAnswer = async () => {
    await endGame('lost', earnedXP);
  };

  const handleTimeout = async () => {
    setIsAnswerRevealed(true);
    clearInterval(timerRef.current);
    await endGame('lost', earnedXP);
  };

  const endGame = async (result, finalXP) => {
    setGameState(result);
    // Don't exit fullscreen here - let user choose Play Again or Dashboard
    
    try {
      // Update XP Battle game session
      if (gameId) {
        await supabase
          .from('xp_battle_games')
          .update({
            status: result === 'won' ? 'completed' : 'failed',
            earned_xp: finalXP,
            completed_at: new Date().toISOString()
          })
          .eq('id', gameId);
      }

      // Award XP to user if they earned any
      if (finalXP > 0) {
        // Get current XP
        const { data: currentXP } = await supabase
          .from('xp')
          .select('total_xp, weekly_xp, level')
          .eq('user_id', user.id)
          .maybeSingle();

        const newTotalXP = (currentXP?.total_xp || 0) + finalXP;
        const newWeeklyXP = (currentXP?.weekly_xp || 0) + finalXP;
        const newLevel = Math.floor(newTotalXP / 1000) + 1;

        if (currentXP) {
          // Update existing XP
          await supabase
            .from('xp')
            .update({
              total_xp: newTotalXP,
              weekly_xp: newWeeklyXP,
              level: newLevel
            })
            .eq('user_id', user.id);
        } else {
          // Create new XP record
          await supabase
            .from('xp')
            .insert({
              user_id: user.id,
              total_xp: finalXP,
              weekly_xp: finalXP,
              level: newLevel
            });
        }

        showToast(`You earned ${finalXP} XP!`, 'success');
      }
    } catch (error) {
      console.error('Error ending game:', error);
    }
  };

  const quitGame = async () => {
    await exitFullscreen();
    
    // Set 5-minute lock when user quits - save to database
    if (gameState === 'playing' && gameId) {
      const quitTime = new Date().toISOString();
      console.log('🚪 User quit game at:', quitTime);
      
      const { error } = await supabase
        .from('xp_battle_games')
        .update({
          status: 'quit_locked',
          earned_xp: earnedXP,
          completed_at: quitTime
        })
        .eq('id', gameId);
      
      if (error) {
        console.error('❌ Error saving quit lock:', error);
      } else {
        console.log('✅ Quit lock saved to database');
      }
    }
    
    setIsLocked(true);
    setLockTimeRemaining(300); // 5 minutes in seconds
    showToast('⏱️ Game locked for 5 minutes due to quit', 'info');
    
    setGameState('start');
  };

  const restartGame = async () => {
    // Don't exit fullscreen - stay in fullscreen and restart
    setGameState('start');
    setCurrentLevel(0);
    setQuestions([]);
    setCurrentQuestion(null);
    setSelectedAnswer(null);
    setIsAnswerRevealed(false);
    setTimeLeft(TIME_PER_QUESTION);
    setEarnedXP(0);
    setGameId(null);
    setWarningCount(0);
    
    // Reset lifeline states
    setUsedLifelines([]);
    setXpDeductedLifelines(0);
    setLifelineEffect(null);
    setRemovedOptions([]);
    setAudiencePollData(null);
    setDoubleDipAttempts(0);
    setFirstDoubleDipAnswer(null);
  };

  const goToDashboard = async () => {
    await exitFullscreen(); // Exit fullscreen when going to dashboard
    navigate('/dashboard');
  };

  // Start Screen
  if (gameState === 'start') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4">
        {/* Lock Timer Popup */}
        {isLocked && (
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            className="fixed top-4 right-4 z-50 bg-red-500 text-white px-6 py-4 rounded-lg shadow-2xl"
          >
            <div className="flex items-center space-x-3">
              <Clock className="h-6 w-6 animate-pulse" />
              <div>
                <p className="font-bold">Game Locked</p>
                <p className="text-sm">
                  {Math.floor(lockTimeRemaining / 60)}:{(lockTimeRemaining % 60).toString().padStart(2, '0')} remaining
                </p>
              </div>
            </div>
          </motion.div>
        )}
        
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-2xl w-full bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8"
        >
          <div className="text-center">
            <motion.div
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="inline-block mb-6"
            >
              <Trophy className="h-24 w-24 text-yellow-500 mx-auto" />
            </motion.div>
            
            <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
              Who Will Win XP Battle?
            </h1>
            
            <p className="text-2xl font-bold text-gray-700 dark:text-gray-300 mb-2">
              Learn fast. Think smart.
            </p>
            <p className="text-xl text-gray-600 dark:text-gray-400 mb-8">
              Win the ultimate XP Battle.
            </p>

            <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl p-6 mb-8">
              <h3 className="text-white font-bold text-lg mb-4">Game Rules:</h3>
              <ul className="text-white text-left space-y-2">
                <li className="flex items-start">
                  <CheckCircle className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
                  <span>15 questions from easy to hard difficulty</span>
                </li>
                <li className="flex items-start">
                  <Clock className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
                  <span>40 seconds per question</span>
                </li>
                <li className="flex items-start">
                  <Zap className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
                  <span>XP increases from 50 to 5600</span>
                </li>
                <li className="flex items-start">
                  <XCircle className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
                  <span>One wrong answer and game is over</span>
                </li>
                <li className="flex items-start">
                  <AlertCircle className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
                  <span><strong>Fullscreen mode required</strong> - No cheating!</span>
                </li>
                <li className="flex items-start">
                  <AlertCircle className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
                  <span><strong>No tab switching</strong> - 3 warnings then game over</span>
                </li>
                <li className="flex items-start">
                  <AlertCircle className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
                  <span><strong>Quit = 5 min lock</strong> - Think before you quit!</span>
                </li>
              </ul>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-8">
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                <Star className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                <p className="text-sm text-gray-600 dark:text-gray-400">Start</p>
                <p className="text-2xl font-bold">50 XP</p>
              </div>
              <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4">
                <Zap className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                <p className="text-sm text-gray-600 dark:text-gray-400">Questions</p>
                <p className="text-2xl font-bold">15</p>
              </div>
              <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4">
                <Trophy className="h-8 w-8 text-yellow-600 mx-auto mb-2" />
                <p className="text-sm text-gray-600 dark:text-gray-400">Max Prize</p>
                <p className="text-2xl font-bold">5600 XP</p>
              </div>
            </div>

            {isLocked ? (
              <div className="w-full bg-red-500 text-white font-bold text-xl py-4 rounded-xl text-center">
                <div className="flex items-center justify-center mb-2">
                  <Clock className="h-6 w-6 mr-2" />
                  <span>Game Locked</span>
                </div>
                <p className="text-sm">
                  Time Remaining: {Math.floor(lockTimeRemaining / 60)}:{(lockTimeRemaining % 60).toString().padStart(2, '0')}
                </p>
                <p className="text-xs mt-2 opacity-80">You quit the last game. Wait to play again.</p>
              </div>
            ) : (
              <button
                onClick={startGame}
                disabled={loading}
                className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold text-xl py-4 rounded-xl hover:from-green-600 hover:to-emerald-700 transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Loading Questions...' : 'Start Game'}
              </button>
            )}

            <button
              onClick={goToDashboard}
              className="mt-4 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 flex items-center justify-center mx-auto"
            >
              <Home className="h-4 w-4 mr-2" />
              Back to Dashboard
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  // Game Over Screens
  if (gameState === 'won' || gameState === 'lost') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4 overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-2xl w-full bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 text-center my-8 max-h-[90vh] overflow-y-auto"
        >
          {gameState === 'won' ? (
            <>
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
              >
                <Trophy className="h-32 w-32 text-yellow-500 mx-auto mb-6" />
              </motion.div>
              <h2 className="text-5xl font-bold mb-4 text-green-600">Congratulations!</h2>
              <p className="text-2xl text-gray-600 dark:text-gray-400 mb-8">
                You won the XP Battle!
              </p>
            </>
          ) : (
            <>
              <XCircle className="h-32 w-32 text-red-500 mx-auto mb-6" />
              <h2 className="text-5xl font-bold mb-4 text-red-600">Game Over!</h2>
              <p className="text-2xl text-gray-600 dark:text-gray-400 mb-8">
                Better luck next time!
              </p>
            </>
          )}

          <div className="bg-gradient-to-r from-yellow-400 to-orange-500 rounded-xl p-8 mb-8">
            <p className="text-white text-lg mb-2">You Earned</p>
            <p className="text-6xl font-bold text-white">{earnedXP - xpDeductedLifelines} XP</p>
            {xpDeductedLifelines > 0 && (
              <p className="text-white text-sm mt-2 opacity-90">
                (Base: {earnedXP} XP - Lifeline Cost: {xpDeductedLifelines} XP)
              </p>
            )}
          </div>

          {/* Lifeline Summary */}
          {usedLifelines.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 mb-8">
              <h3 className="text-xl font-bold mb-4 flex items-center">
                <Zap className="h-5 w-5 mr-2 text-purple-600" />
                Lifelines Used
              </h3>
              <div className="space-y-2">
                {usedLifelines.map((key) => {
                  const lifeline = LIFELINES[key];
                  const Icon = lifeline.icon;
                  return (
                    <div key={key} className="flex items-center justify-between p-3 bg-gray-100 dark:bg-gray-700 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <Icon className="h-5 w-5 text-purple-600" />
                        <span className="font-semibold">{lifeline.name}</span>
                      </div>
                      {lifeline.xpCost > 0 && (
                        <span className="text-red-600 font-bold">-{lifeline.xpCost} XP</span>
                      )}
                    </div>
                  );
                })}
              </div>
              {xpDeductedLifelines > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-300 dark:border-gray-600">
                  <div className="flex justify-between font-bold text-lg">
                    <span>Total XP Deducted:</span>
                    <span className="text-red-600">-{xpDeductedLifelines} XP</span>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex gap-4">
            <button
              onClick={restartGame}
              className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-bold py-4 rounded-xl hover:from-blue-600 hover:to-purple-700 transition-all"
            >
              Play Again
            </button>
            <button
              onClick={goToDashboard}
              className="flex-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-bold py-4 rounded-xl hover:bg-gray-300 dark:hover:bg-gray-600 transition-all"
            >
              Dashboard
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  // Playing Screen
  if (!currentQuestion) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div ref={gameContainerRef} className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-4">
      <div className="max-w-7xl mx-auto py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <button
            onClick={quitGame}
            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors flex items-center"
          >
            <Home className="h-4 w-4 mr-2" />
            Quit Game
          </button>
          
          <div className="flex items-center space-x-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg px-6 py-3">
              <p className="text-sm text-gray-600 dark:text-gray-400">Current Prize</p>
              <p className="text-2xl font-bold text-yellow-600">{earnedXP} XP</p>
            </div>
            
            <div className={`bg-white dark:bg-gray-800 rounded-lg px-6 py-3 ${timeLeft <= 10 ? 'animate-pulse bg-red-100' : ''}`}>
              <p className="text-sm text-gray-600 dark:text-gray-400">Time Left</p>
              <p className={`text-2xl font-bold ${timeLeft <= 10 ? 'text-red-600' : 'text-blue-600'}`}>
                {timeLeft}s
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Prize Ladder */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6">
              <h3 className="text-xl font-bold mb-4 flex items-center">
                <Trophy className="h-5 w-5 mr-2 text-yellow-600" />
                Prize Ladder
              </h3>
              <div className="space-y-2">
                {[...PRIZE_LADDER].reverse().map((prize) => (
                  <div
                    key={prize.level}
                    className={`p-3 rounded-lg transition-all ${
                      currentLevel + 1 === prize.level
                        ? 'bg-gradient-to-r from-yellow-400 to-orange-500 text-white font-bold scale-105'
                        : currentLevel + 1 > prize.level
                        ? 'bg-gray-200 dark:bg-gray-700 text-gray-500 line-through'
                        : 'bg-gray-100 dark:bg-gray-900'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Level {prize.level}</span>
                      <span className="font-bold">{prize.xp} XP</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Question Area */}
          <div className="lg:col-span-3">
            <motion.div
              key={currentLevel}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white dark:bg-gray-800 rounded-xl p-8"
            >
              {/* Question Header */}
              <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                  <span className="px-4 py-2 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full font-bold">
                    Question {currentLevel + 1} of 15
                  </span>
                  <span className="px-4 py-2 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 rounded-full font-bold">
                    For {PRIZE_LADDER[currentLevel].xp - xpDeductedLifelines} XP
                  </span>
                </div>
                
                <h2 className="text-3xl font-bold mb-2">
                  {currentQuestion.question}
                </h2>
              </div>

              {/* Lifelines */}
              <div className="mb-6 flex flex-wrap gap-2 justify-center">
                {Object.entries(LIFELINES).map(([key, lifeline]) => {
                  const Icon = lifeline.icon;
                  const isUsed = usedLifelines.includes(key);
                  
                  return (
                    <motion.button
                      key={key}
                      whileHover={{ scale: isUsed ? 1 : 1.05 }}
                      whileTap={{ scale: isUsed ? 1 : 0.95 }}
                      onClick={() => useLifeline(key)}
                      disabled={isUsed || isAnswerRevealed}
                      className={`group relative px-4 py-3 rounded-lg font-semibold transition-all ${
                        isUsed 
                          ? 'bg-gray-300 dark:bg-gray-700 text-gray-500 cursor-not-allowed opacity-50' 
                          : 'bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600'
                      }`}
                      title={lifeline.description}
                    >
                      <div className="flex items-center space-x-2">
                        <Icon className="h-5 w-5" />
                        <span className="text-sm">{lifeline.name}</span>
                        {lifeline.xpCost > 0 && !isUsed && (
                          <span className="text-xs bg-red-500 px-2 py-0.5 rounded-full">-{lifeline.xpCost} XP</span>
                        )}
                      </div>
                      
                      {/* Tooltip */}
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                        {lifeline.description}
                      </div>
                    </motion.button>
                  );
                })}
              </div>

              {/* Lifeline Effects Display */}
              {lifelineEffect && (
                <motion.div
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-6 p-4 bg-blue-100 dark:bg-blue-900/30 rounded-lg"
                >
                  {lifelineEffect === 'fifty_fifty' && (
                    <p className="text-blue-800 dark:text-blue-200 font-semibold">
                      🧩 50:50 Active - Two options removed!
                    </p>
                  )}
                  {lifelineEffect === 'audience_poll' && audiencePollData && (
                    <div>
                      <p className="text-blue-800 dark:text-blue-200 font-semibold mb-2">
                        📊 Audience Poll Results:
                      </p>
                      <div className="space-y-1">
                        {currentQuestion.options.map((option, index) => (
                          <div key={index} className="flex items-center space-x-2">
                            <span className="w-6 font-bold">{String.fromCharCode(65 + index)}:</span>
                            <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-6 overflow-hidden">
                              <div 
                                className="bg-gradient-to-r from-blue-500 to-purple-500 h-full flex items-center justify-end pr-2 text-white text-xs font-bold"
                                style={{ width: `${audiencePollData[index]}%` }}
                              >
                                {audiencePollData[index]}%
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {lifelineEffect === 'stored_answer' && (
                    <p className="text-blue-800 dark:text-blue-200 font-semibold">
                      💾 Stored Answer used – Correct answer locked! (-500 XP)
                    </p>
                  )}
                  {lifelineEffect?.type === 'expert_advice' && (
                    <p className="text-blue-800 dark:text-blue-200 font-semibold">
                      👨‍🏫 Expert Advice: {lifelineEffect.explanation} (-100 XP)
                    </p>
                  )}
                  {lifelineEffect === 'double_dip' && (
                    <p className="text-blue-800 dark:text-blue-200 font-semibold">
                      🎯 Double Dip Active - You can try 2 answers! {doubleDipAttempts > 0 && '(Attempt 2/2)'}
                    </p>
                  )}
                </motion.div>
              )}

              {/* Answer Options */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {currentQuestion.options.map((option, index) => {
                  // Check if option is removed by 50:50
                  const isRemoved = removedOptions.includes(index);
                  const isSelected = selectedAnswer === index;
                  const isCorrect = index === currentQuestion.correctAnswer;
                  const showResult = isAnswerRevealed;
                  const isFirstDoubleDip = firstDoubleDipAnswer === index;

                  // Hide removed options
                  if (isRemoved) {
                    return (
                      <div key={index} className="p-6 rounded-xl bg-gray-200 dark:bg-gray-800 opacity-30 flex items-center justify-center">
                        <span className="text-gray-400">Option Removed</span>
                      </div>
                    );
                  }

                  let bgClass = 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600';
                  
                  if (showResult) {
                    if (isCorrect) {
                      bgClass = 'bg-green-500 text-white';
                    } else if (isSelected && !isCorrect) {
                      bgClass = 'bg-red-500 text-white';
                    }
                  } else if (isSelected) {
                    bgClass = 'bg-blue-500 text-white';
                  } else if (isFirstDoubleDip) {
                    bgClass = 'bg-orange-400 text-white border-2 border-orange-600';
                  }

                  return (
                    <motion.button
                      key={index}
                      whileHover={{ scale: showResult ? 1 : 1.02 }}
                      whileTap={{ scale: showResult ? 1 : 0.98 }}
                      onClick={() => handleAnswerSelect(index)}
                      disabled={isAnswerRevealed}
                      className={`p-6 rounded-xl font-semibold text-lg text-left transition-all ${bgClass} disabled:cursor-not-allowed flex items-center justify-between`}
                    >
                      <span className="flex items-center">
                        <span className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center mr-4 font-bold">
                          {String.fromCharCode(65 + index)}
                        </span>
                        {option}
                      </span>
                      {showResult && isCorrect && (
                        <CheckCircle className="h-6 w-6" />
                      )}
                      {showResult && isSelected && !isCorrect && (
                        <XCircle className="h-6 w-6" />
                      )}
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
