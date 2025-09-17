import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, RotateCcw, Trophy } from 'lucide-react';
import './App.css';

const GRID_SIZE = 20;
const CANVAS_SIZE = 400;
const TILE_COUNT = CANVAS_SIZE / GRID_SIZE;

const App = () => {
  const canvasRef = useRef(null);
  const gameLoopRef = useRef(null);
  const [gameState, setGameState] = useState('menu'); // menu, playing, paused, gameOver
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [snake, setSnake] = useState([{ x: 10, y: 10 }]);
  const [food, setFood] = useState({ x: 15, y: 15 });
  const [direction, setDirection] = useState({ x: 1, y: 0 });
  const [gameSpeed, setGameSpeed] = useState(150);
  const [particles, setParticles] = useState([]);

  // Load high score from localStorage
  useEffect(() => {
    const savedHighScore = localStorage.getItem('neonSnakeHighScore');
    if (savedHighScore) {
      setHighScore(parseInt(savedHighScore));
    }
  }, []);

  // gotta make sure the food doesn't spawn inside the snake, that would be weird
  const generateFood = useCallback(() => {
    let newFood;
    do {
      newFood = {
        x: Math.floor(Math.random() * TILE_COUNT),
        y: Math.floor(Math.random() * TILE_COUNT)
      };
    } while (snake.some(segment => segment.x === newFood.x && segment.y === newFood.y));
    return newFood;
  }, [snake]);

  // particle explosion when snake eats food - looks pretty cool
  const createParticles = useCallback((x, y) => {
    const centerX = x * GRID_SIZE + GRID_SIZE / 2;
    const centerY = y * GRID_SIZE + GRID_SIZE / 2;
    
    const newParticles = [];
    for (let i = 0; i < 12; i++) {
      newParticles.push({
        id: Date.now() + i,
        x: centerX,
        y: centerY,
        vx: (Math.random() - 0.5) * 10,
        vy: (Math.random() - 0.5) * 10,
        size: Math.random() * 6 + 3,
        alpha: 1,
        color: Math.random() > 0.5 ? '#ff69b4' : '#ffff00',
        life: 40
      });
    }
    setParticles(prev => [...prev, ...newParticles]);
  }, []);

  // move particles around and fade them out over time
  const updateParticles = useCallback(() => {
    setParticles(prev => 
      prev.map(particle => ({
        ...particle,
        x: particle.x + particle.vx,
        y: particle.y + particle.vy,
        alpha: particle.alpha - 1 / particle.life,
        life: particle.life - 1
      })).filter(particle => particle.life > 0)
    );
  }, []);

  // the main drawing function - this is where the magic happens
  const drawGame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    
    // clear the canvas and add some animated background stuff
    const time = Date.now() * 0.001;
    const gradient = ctx.createRadialGradient(
      CANVAS_SIZE / 2 + Math.sin(time) * 50,
      CANVAS_SIZE / 2 + Math.cos(time) * 50,
      0,
      CANVAS_SIZE / 2,
      CANVAS_SIZE / 2,
      CANVAS_SIZE / 2
    );
    gradient.addColorStop(0, 'rgba(0, 20, 40, 0.9)');
    gradient.addColorStop(0.5, 'rgba(0, 10, 20, 0.95)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 1)');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    
    // draw the grid lines - they pulse a bit for effect
    ctx.strokeStyle = `rgba(0, 255, 255, ${0.1 + Math.sin(time * 2) * 0.05})`;
    ctx.lineWidth = 1;
    
    for (let i = 0; i <= TILE_COUNT; i++) {
      ctx.beginPath();
      ctx.moveTo(i * GRID_SIZE, 0);
      ctx.lineTo(i * GRID_SIZE, CANVAS_SIZE);
      ctx.stroke();
      
      ctx.beginPath();
      ctx.moveTo(0, i * GRID_SIZE);
      ctx.lineTo(CANVAS_SIZE, i * GRID_SIZE);
      ctx.stroke();
    }
    
    // draw the snake with some nice gradients
    snake.forEach((segment, index) => {
      const x = segment.x * GRID_SIZE;
      const y = segment.y * GRID_SIZE;
      
      const segmentGradient = ctx.createRadialGradient(
        x + GRID_SIZE / 2, y + GRID_SIZE / 2, 0,
        x + GRID_SIZE / 2, y + GRID_SIZE / 2, GRID_SIZE / 2
      );
      
      if (index === 0) {
        // snake head gets the brightest colors
        segmentGradient.addColorStop(0, '#ff69b4');
        segmentGradient.addColorStop(0.7, '#ff1493');
        segmentGradient.addColorStop(1, '#c71585');
      } else {
        // body segments fade out as they get further from the head
        const intensity = Math.max(0.4, 1 - (index * 0.08));
        segmentGradient.addColorStop(0, `rgba(255, 105, 180, ${intensity})`);
        segmentGradient.addColorStop(0.7, `rgba(255, 20, 147, ${intensity * 0.8})`);
        segmentGradient.addColorStop(1, `rgba(199, 21, 133, ${intensity * 0.6})`);
      }
      
      ctx.fillStyle = segmentGradient;
      ctx.fillRect(x + 2, y + 2, GRID_SIZE - 4, GRID_SIZE - 4);
      
      // add a nice glow around each segment
      ctx.shadowColor = '#ff69b4';
      ctx.shadowBlur = 15;
      ctx.strokeStyle = '#ff69b4';
      ctx.lineWidth = 2;
      ctx.strokeRect(x + 2, y + 2, GRID_SIZE - 4, GRID_SIZE - 4);
      ctx.shadowBlur = 0;
    });
    
    // draw the food with a pulsing effect
    const foodX = food.x * GRID_SIZE;
    const foodY = food.y * GRID_SIZE;
    const pulse = Math.sin(time * 8) * 0.3 + 0.7;
    
    const foodGradient = ctx.createRadialGradient(
      foodX + GRID_SIZE / 2, foodY + GRID_SIZE / 2, 0,
      foodX + GRID_SIZE / 2, foodY + GRID_SIZE / 2, GRID_SIZE / 2
    );
    foodGradient.addColorStop(0, `rgba(255, 255, 0, ${pulse})`);
    foodGradient.addColorStop(0.7, `rgba(255, 215, 0, ${pulse * 0.8})`);
    foodGradient.addColorStop(1, `rgba(255, 165, 0, ${pulse * 0.6})`);
    
    ctx.fillStyle = foodGradient;
    ctx.fillRect(foodX + 3, foodY + 3, GRID_SIZE - 6, GRID_SIZE - 6);
    
    // make the food glow too
    ctx.shadowColor = '#ffff00';
    ctx.shadowBlur = 20 * pulse;
    ctx.strokeStyle = '#ffff00';
    ctx.lineWidth = 3;
    ctx.strokeRect(foodX + 3, foodY + 3, GRID_SIZE - 6, GRID_SIZE - 6);
    ctx.shadowBlur = 0;
    
    // draw all the particles
    particles.forEach(particle => {
      ctx.save();
      ctx.globalAlpha = particle.alpha;
      ctx.fillStyle = particle.color;
      ctx.shadowColor = particle.color;
      ctx.shadowBlur = 10;
      ctx.fillRect(particle.x, particle.y, particle.size, particle.size);
      ctx.restore();
    });
  }, [snake, food, particles]);

  // the main game loop - runs every frame
  const gameLoop = useCallback(() => {
    if (gameState !== 'playing') return;
    
    setSnake(prevSnake => {
      const newSnake = [...prevSnake];
      const head = { 
        x: newSnake[0].x + direction.x, 
        y: newSnake[0].y + direction.y 
      };
      
      // check if snake hit the walls
      if (head.x < 0 || head.x >= TILE_COUNT || head.y < 0 || head.y >= TILE_COUNT) {
        setGameState('gameOver');
        return prevSnake;
      }
      
      // check if snake hit itself
      if (newSnake.some(segment => segment.x === head.x && segment.y === head.y)) {
        setGameState('gameOver');
        return prevSnake;
      }
      
      newSnake.unshift(head);
      
      // check if snake ate the food
      if (head.x === food.x && head.y === food.y) {
        setScore(prev => prev + 10);
        createParticles(head.x, head.y);
        setFood(generateFood());
        
        // make the game a bit faster each time
        setGameSpeed(prev => Math.max(80, prev - 3));
        
      } else {
        newSnake.pop();
      }
      
      return newSnake;
    });
    
    updateParticles();
  }, [gameState, direction, food, generateFood, createParticles, updateParticles]);

  // start/stop the game loop based on game state
  useEffect(() => {
    if (gameState === 'playing') {
      gameLoopRef.current = setInterval(gameLoop, gameSpeed);
    } else {
      clearInterval(gameLoopRef.current);
    }
    
    return () => clearInterval(gameLoopRef.current);
  }, [gameState, gameLoop, gameSpeed]);

  // redraw the game whenever something changes
  useEffect(() => {
    drawGame();
  }, [drawGame]);

  // handle keyboard input
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (gameState === 'menu' && e.code === 'Space') {
        startGame();
        return;
      }
      
      if (gameState !== 'playing') return;
      
      switch(e.code) {
        case 'ArrowUp':
        case 'KeyW':
          if (direction.y !== 1) {
            setDirection({ x: 0, y: -1 });
          }
          break;
        case 'ArrowDown':
        case 'KeyS':
          if (direction.y !== -1) {
            setDirection({ x: 0, y: 1 });
          }
          break;
        case 'ArrowLeft':
        case 'KeyA':
          if (direction.x !== 1) {
            setDirection({ x: -1, y: 0 });
          }
          break;
        case 'ArrowRight':
        case 'KeyD':
          if (direction.x !== -1) {
            setDirection({ x: 1, y: 0 });
          }
          break;
        case 'Space':
          togglePause();
          break;
      }
    };
    
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [gameState, direction]);

  // game control functions
  const startGame = () => {
    setGameState('playing');
    setScore(0);
    setSnake([{ x: 10, y: 10 }]);
    setDirection({ x: 1, y: 0 });
    setFood(generateFood());
    setParticles([]);
    setGameSpeed(150);
  };

  const togglePause = () => {
    setGameState(prev => prev === 'playing' ? 'paused' : 'playing');
  };

  const resetGame = () => {
    setGameState('menu');
    setScore(0);
    setSnake([{ x: 10, y: 10 }]);
    setDirection({ x: 1, y: 0 });
    setFood(generateFood());
    setParticles([]);
    setGameSpeed(150);
  };


  // save high score to localStorage when it changes
  useEffect(() => {
    if (score > highScore) {
      setHighScore(score);
      localStorage.setItem('neonSnakeHighScore', score.toString());
    }
  }, [score, highScore]);

  return (
    <div className="app">
      {/* the animated background with stars and stuff */}
      <div className="background">
        <div className="stars"></div>
        <div className="nebula"></div>
        <div className="particles-bg"></div>
      </div>

      {/* the header with title and score */}
      <motion.header 
        className="header"
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      >
        <motion.h1 
          className="game-title"
          animate={{ 
            textShadow: [
              "0 0 20px #ff69b4, 0 0 40px #ff69b4, 0 0 60px #ff69b4",
              "0 0 30px #ffff00, 0 0 50px #ffff00, 0 0 70px #ffff00",
              "0 0 20px #ff69b4, 0 0 40px #ff69b4, 0 0 60px #ff69b4"
            ]
          }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        >
          🐍 SNAKE HUNT 🐍
        </motion.h1>
        
        <div className="score-board">
          <motion.div 
            className="score-card"
            whileHover={{ scale: 1.05, boxShadow: "0 0 30px rgba(255, 105, 180, 0.5)" }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            <div className="score-label">SCORE</div>
            <div className="score-value">{score}</div>
          </motion.div>
          
          <motion.div 
            className="score-card high-score"
            whileHover={{ scale: 1.05, boxShadow: "0 0 30px rgba(255, 255, 0, 0.5)" }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            <Trophy className="trophy-icon" />
            <div className="score-label">HIGH SCORE</div>
            <div className="score-value">{highScore}</div>
          </motion.div>
        </div>
      </motion.header>

      {/* the main game canvas area */}
      <motion.div 
        className="game-area"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
      >
        <div className="canvas-container">
          <canvas 
            ref={canvasRef}
            width={CANVAS_SIZE}
            height={CANVAS_SIZE}
            className="game-canvas"
          />
          
          {/* overlay for menu, pause, game over screens */}
          <AnimatePresence>
            {gameState === 'menu' && (
              <motion.div 
                className="game-overlay"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                <motion.div 
                  className="overlay-content"
                  initial={{ scale: 0.8, y: 20 }}
                  animate={{ scale: 1, y: 0 }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                >
                  <motion.h2 
                    className="overlay-title"
                    animate={{ 
                      textShadow: [
                        "0 0 20px #ff69b4",
                        "0 0 30px #ffff00",
                        "0 0 20px #ff69b4"
                      ]
                    }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    🐍 Ready to Hunt? 🐍
                  </motion.h2>
                  <p className="overlay-message">
                    Use arrow keys or WASD to move
                  </p>
                  <motion.button 
                    className="neon-button start-button"
                    onClick={startGame}
                    whileHover={{ scale: 1.05, boxShadow: "0 0 40px rgba(255, 105, 180, 0.6)" }}
                    whileTap={{ scale: 0.95 }}
                    transition={{ type: "spring", stiffness: 300 }}
                  >
                    <Play className="button-icon" />
                    🐍 START HUNTING! 🐍
                  </motion.button>
                </motion.div>
              </motion.div>
            )}
            
            {gameState === 'paused' && (
              <motion.div 
                className="game-overlay"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                <motion.div 
                  className="overlay-content"
                  initial={{ scale: 0.8, y: 20 }}
                  animate={{ scale: 1, y: 0 }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                >
                  <h2 className="overlay-title">🐍 Taking a Break? 🐍</h2>
                  <p className="overlay-message">Press SPACE to resume</p>
                  <div className="button-group">
                    <motion.button 
                      className="neon-button"
                      onClick={togglePause}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Play className="button-icon" />
                      RESUME
                    </motion.button>
                    <motion.button 
                      className="neon-button secondary"
                      onClick={resetGame}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <RotateCcw className="button-icon" />
                      RESTART
                    </motion.button>
                  </div>
                </motion.div>
              </motion.div>
            )}
            
            {gameState === 'gameOver' && (
              <motion.div 
                className="game-overlay"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                <motion.div 
                  className="overlay-content"
                  initial={{ scale: 0.8, y: 20 }}
                  animate={{ scale: 1, y: 0 }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                >
                  <motion.h2 
                    className="overlay-title"
                    animate={{ 
                      color: score > highScore - 10 ? "#ffff00" : "#ff6666",
                      textShadow: score > highScore - 10 ? 
                        "0 0 30px #ffff00" : "0 0 20px #ff6666"
                    }}
                  >
                    {score > highScore - 10 ? "🐍 NEW RECORD! 🐍" : "🐍 Game Over! 🐍"}
                  </motion.h2>
                  <p className="overlay-message">
                    Final Score: {score}
                  </p>
                  <div className="button-group">
                    <motion.button 
                      className="neon-button"
                      onClick={startGame}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Play className="button-icon" />
                      🐍 HUNT AGAIN! 🐍
                    </motion.button>
                    <motion.button 
                      className="neon-button secondary"
                      onClick={resetGame}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <RotateCcw className="button-icon" />
                      MENU
                    </motion.button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* control buttons and help */}
      <motion.div 
        className="controls"
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8, delay: 0.4, ease: "easeOut" }}
      >
        <div className="control-buttons">
          <motion.button 
            className="control-button"
            onClick={togglePause}
            disabled={gameState === 'menu'}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            {gameState === 'playing' ? <Pause /> : <Play />}
          </motion.button>
          
          <motion.button 
            className="control-button"
            onClick={resetGame}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <RotateCcw />
          </motion.button>
          
        </div>
        
      </motion.div>
    </div>
  );
};

export default App;
