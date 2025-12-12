import React, { useState, useEffect, useRef, useCallback } from 'react';



const GAME_WIDTH = 350;

const GAME_HEIGHT = 550;

const SLING_Y = GAME_HEIGHT - 80;

const SLING_X = GAME_WIDTH / 2;



const LEVELS = [

  { emoji: '🐣', color: '#FFE066', size: 28, speed: 0.3, name: '병아리' },

  { emoji: '🐥', color: '#FFD93D', size: 32, speed: 0.5, name: '아기새' },

  { emoji: '🐔', color: '#FF8C42', size: 36, speed: 0.8, name: '닭' },

  { emoji: '🦆', color: '#6BCB77', size: 40, speed: 1.0, name: '오리' },

  { emoji: '🦢', color: '#FFFFFF', size: 44, speed: 1.2, name: '백조' },

  { emoji: '🦅', color: '#8B4513', size: 48, speed: 1.5, name: '독수리' },

  { emoji: '🐉', color: '#9B59B6', size: 52, speed: 0.5, name: '용' },

];



const getRandomLevel = (max = 3) => Math.floor(Math.random() * Math.min(max, 4));



const createBird = (level, x, y) => ({

  id: Math.random().toString(36).substr(2, 9),

  level,

  x: x ?? Math.random() * (GAME_WIDTH - 60) + 30,

  y: y ?? Math.random() * (GAME_HEIGHT - 250) + 50,

  vx: (Math.random() - 0.5) * 2,

  vy: (Math.random() - 0.5) * 2,

  size: LEVELS[level].size,

});



export default function MovingMergeGame() {

  const [gameState, setGameState] = useState('ready');

  const [score, setScore] = useState(0);

  const [birds, setBirds] = useState([]);

  const [bullet, setBullet] = useState(null);

  const [currentLevel, setCurrentLevel] = useState(0);

  const [nextLevels, setNextLevels] = useState([0, 1, 0]);

  const [isDragging, setIsDragging] = useState(false);

  const [dragPos, setDragPos] = useState({ x: SLING_X, y: SLING_Y });

  const [combo, setCombo] = useState(0);

  const [showCombo, setShowCombo] = useState(false);

  const [mergeEffect, setMergeEffect] = useState(null);

  const [highestLevel, setHighestLevel] = useState(0);

  const gameRef = useRef(null);

  const animationRef = useRef(null);



  const initGame = useCallback(() => {

    const initialBirds = [];

    for (let i = 0; i < 8; i++) {

      initialBirds.push(createBird(getRandomLevel(2)));

    }

    setBirds(initialBirds);

    setBullet(null);

    setScore(0);

    setCombo(0);

    setHighestLevel(0);

    setCurrentLevel(getRandomLevel(2));

    setNextLevels([getRandomLevel(2), getRandomLevel(2), getRandomLevel(2)]);

    setGameState('playing');

  }, []);



  const getEventPos = (e) => {

    const rect = gameRef.current?.getBoundingClientRect();

    if (!rect) return { x: 0, y: 0 };

    const clientX = e.touches ? e.touches[0].clientX : e.clientX;

    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    return {

      x: clientX - rect.left,

      y: clientY - rect.top,

    };

  };



  const handleStart = (e) => {

    if (gameState !== 'playing' || bullet) return;

    e.preventDefault();

    const pos = getEventPos(e);

    if (pos.y > SLING_Y - 60) {

      setIsDragging(true);

      setDragPos(pos);

    }

  };



  const handleMove = (e) => {

    if (!isDragging) return;

    e.preventDefault();

    const pos = getEventPos(e);

    const dx = SLING_X - pos.x;

    const dy = SLING_Y - pos.y;

    const dist = Math.sqrt(dx * dx + dy * dy);

    const maxDist = 80;

    if (dist > maxDist) {

      pos.x = SLING_X - (dx / dist) * maxDist;

      pos.y = SLING_Y - (dy / dist) * maxDist;

    }

    setDragPos(pos);

  };



  const handleEnd = (e) => {

    if (!isDragging) return;

    e.preventDefault();

    setIsDragging(false);

    const dx = SLING_X - dragPos.x;

    const dy = SLING_Y - dragPos.y;

    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > 15) {

      const power = Math.min(dist / 8, 12);

      setBullet({

        x: SLING_X,

        y: SLING_Y - 30,

        vx: (dx / dist) * power,

        vy: (dy / dist) * power,

        level: currentLevel,

        size: LEVELS[currentLevel].size,

      });

      setCurrentLevel(nextLevels[0]);

      setNextLevels([nextLevels[1], nextLevels[2], getRandomLevel(3)]);

    }

    setDragPos({ x: SLING_X, y: SLING_Y });

  };



  useEffect(() => {

    if (gameState !== 'playing') return;



    const gameLoop = () => {

      setBirds((prev) => {

        return prev.map((bird) => {

          let { x, y, vx, vy, level } = bird;

          const speed = LEVELS[level].speed;

          x += vx * speed;

          y += vy * speed;

          if (x < 20 || x > GAME_WIDTH - 20) vx = -vx;

          if (y < 20 || y > GAME_HEIGHT - 150) vy = -vy;

          x = Math.max(20, Math.min(GAME_WIDTH - 20, x));

          y = Math.max(20, Math.min(GAME_HEIGHT - 150, y));

          if (Math.random() < 0.01) {

            vx += (Math.random() - 0.5) * 0.5;

            vy += (Math.random() - 0.5) * 0.5;

          }

          return { ...bird, x, y, vx, vy };

        });

      });



      setBullet((prev) => {

        if (!prev) return null;

        let { x, y, vx, vy } = prev;

        x += vx;

        y += vy;

        vy += 0.15;

        if (x < 0 || x > GAME_WIDTH || y < 0 || y > GAME_HEIGHT) {

          return null;

        }

        return { ...prev, x, y, vx, vy };

      });



      animationRef.current = requestAnimationFrame(gameLoop);

    };



    animationRef.current = requestAnimationFrame(gameLoop);

    return () => {

      if (animationRef.current) cancelAnimationFrame(animationRef.current);

    };

  }, [gameState]);



  useEffect(() => {

    if (!bullet || gameState !== 'playing') return;



    setBirds((prev) => {

      let hit = false;

      let hitBird = null;

      let newBirds = prev.filter((bird) => {

        const dx = bird.x - bullet.x;

        const dy = bird.y - bullet.y;

        const dist = Math.sqrt(dx * dx + dy * dy);

        const hitDist = (bird.size + bullet.size) / 2 + 10;

        if (dist < hitDist && bird.level === bullet.level) {

          hit = true;

          hitBird = bird;

          return false;

        }

        return true;

      });



      if (hit && hitBird) {

        const newLevel = Math.min(hitBird.level + 1, LEVELS.length - 1);

        const points = (newLevel + 1) * 100;

        setScore((s) => s + points);

        setCombo((c) => c + 1);

        setShowCombo(true);

        setTimeout(() => setShowCombo(false), 800);

        setMergeEffect({ x: hitBird.x, y: hitBird.y, level: newLevel });

        setTimeout(() => setMergeEffect(null), 500);

        if (newLevel > highestLevel) setHighestLevel(newLevel);

        

        if (newLevel < LEVELS.length - 1) {

          newBirds.push(createBird(newLevel, hitBird.x, hitBird.y));

        } else {

          setScore((s) => s + 1000);

        }

        setBullet(null);

        

        if (newBirds.length < 12) {

          newBirds.push(createBird(getRandomLevel(Math.min(3, newLevel + 1))));

        }

      }

      return newBirds;

    });

  }, [bullet?.x, bullet?.y, gameState, highestLevel]);



  useEffect(() => {

    if (!bullet) {

      setCombo(0);

    }

  }, [bullet]);



  useEffect(() => {

    if (birds.length >= 15 && gameState === 'playing') {

      setGameState('gameover');

    }

  }, [birds.length, gameState]);



  const renderSlingshot = () => {

    const dx = SLING_X - dragPos.x;

    const dy = SLING_Y - dragPos.y;

    return (

      <g>

        <circle cx={SLING_X - 25} cy={SLING_Y} r={6} fill="#8B4513" />

        <circle cx={SLING_X + 25} cy={SLING_Y} r={6} fill="#8B4513" />

        <rect x={SLING_X - 28} y={SLING_Y} width={8} height={40} fill="#8B4513" rx={3} />

        <rect x={SLING_X + 20} y={SLING_Y} width={8} height={40} fill="#8B4513" rx={3} />

        {isDragging && (

          <>

            <line x1={SLING_X - 25} y1={SLING_Y} x2={dragPos.x} y2={dragPos.y} stroke="#654321" strokeWidth={3} />

            <line x1={SLING_X + 25} y1={SLING_Y} x2={dragPos.x} y2={dragPos.y} stroke="#654321" strokeWidth={3} />

            <line

              x1={dragPos.x}

              y1={dragPos.y}

              x2={dragPos.x + dx * 2}

              y2={dragPos.y + dy * 2}

              stroke="rgba(255,100,100,0.5)"

              strokeWidth={2}

              strokeDasharray="5,5"

            />

            <text x={dragPos.x} y={dragPos.y + 5} fontSize={LEVELS[currentLevel].size} textAnchor="middle">

              {LEVELS[currentLevel].emoji}

            </text>

          </>

        )}

        {!isDragging && !bullet && (

          <text x={SLING_X} y={SLING_Y - 15} fontSize={LEVELS[currentLevel].size} textAnchor="middle">

            {LEVELS[currentLevel].emoji}

          </text>

        )}

      </g>

    );

  };



  return (

    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-sky-300 to-sky-100 p-2">

      <div className="text-center mb-2">

        <h1 className="text-xl font-bold text-white drop-shadow-lg">🎯 무빙 머지 슈터</h1>

        <div className="flex gap-4 justify-center mt-1">

          <span className="bg-white/80 px-3 py-1 rounded-full text-sm font-bold">

            점수: {score}

          </span>

          <span className="bg-yellow-400/80 px-3 py-1 rounded-full text-sm font-bold">

            최고: {LEVELS[highestLevel].emoji}

          </span>

        </div>

      </div>



      <div

        ref={gameRef}

        className="relative bg-gradient-to-b from-green-200 to-green-300 rounded-2xl overflow-hidden shadow-2xl border-4 border-green-400"

        style={{ width: GAME_WIDTH, height: GAME_HEIGHT, touchAction: 'none' }}

        onMouseDown={handleStart}

        onMouseMove={handleMove}

        onMouseUp={handleEnd}

        onMouseLeave={handleEnd}

        onTouchStart={handleStart}

        onTouchMove={handleMove}

        onTouchEnd={handleEnd}

      >

        <svg width={GAME_WIDTH} height={GAME_HEIGHT}>

          <defs>

            <radialGradient id="skyGrad" cx="50%" cy="0%" r="100%">

              <stop offset="0%" stopColor="#87CEEB" />

              <stop offset="100%" stopColor="#98FB98" />

            </radialGradient>

          </defs>

          <rect width={GAME_WIDTH} height={GAME_HEIGHT} fill="url(#skyGrad)" />

          

          {[...Array(5)].map((_, i) => (

            <ellipse

              key={i}

              cx={50 + i * 70}

              cy={30 + (i % 2) * 20}

              rx={30}

              ry={15}

              fill="rgba(255,255,255,0.7)"

            />

          ))}



          <line x1={0} y1={GAME_HEIGHT - 140} x2={GAME_WIDTH} y2={GAME_HEIGHT - 140} stroke="rgba(255,0,0,0.3)" strokeWidth={2} strokeDasharray="10,5" />



          {birds.map((bird) => (

            <g key={bird.id}>

              <circle cx={bird.x} cy={bird.y} r={bird.size / 2 + 5} fill={LEVELS[bird.level].color} opacity={0.3} />

              <text x={bird.x} y={bird.y + bird.size / 4} fontSize={bird.size} textAnchor="middle">

                {LEVELS[bird.level].emoji}

              </text>

            </g>

          ))}



          {bullet && (

            <g>

              <circle cx={bullet.x} cy={bullet.y} r={bullet.size / 2 + 3} fill={LEVELS[bullet.level].color} opacity={0.5} />

              <text x={bullet.x} y={bullet.y + bullet.size / 4} fontSize={bullet.size} textAnchor="middle">

                {LEVELS[bullet.level].emoji}

              </text>

            </g>

          )}



          {mergeEffect && (

            <g>

              <circle cx={mergeEffect.x} cy={mergeEffect.y} r={40} fill="none" stroke="#FFD700" strokeWidth={3} opacity={0.8}>

                <animate attributeName="r" from="20" to="50" dur="0.5s" />

                <animate attributeName="opacity" from="1" to="0" dur="0.5s" />

              </circle>

              <text x={mergeEffect.x} y={mergeEffect.y} fontSize={24} textAnchor="middle" fill="#FFD700" fontWeight="bold">

                +{(mergeEffect.level + 1) * 100}

              </text>

            </g>

          )}



          {renderSlingshot()}

        </svg>



        {showCombo && combo > 1 && (

          <div className="absolute top-1/3 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-4xl font-bold text-yellow-400 drop-shadow-lg animate-bounce">

            {combo} COMBO!

          </div>

        )}



        <div className="absolute bottom-2 left-2 bg-white/80 px-2 py-1 rounded-lg">

          <span className="text-xs text-gray-600">NEXT: </span>

          {nextLevels.map((l, i) => (

            <span key={i} className="text-lg">{LEVELS[l].emoji}</span>

          ))}

        </div>



        <div className="absolute bottom-2 right-2 bg-red-400/80 px-2 py-1 rounded-lg">

          <span className="text-xs text-white">🐤 {birds.length}/15</span>

        </div>



        {gameState === 'ready' && (

          <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center">

            <div className="text-4xl mb-4">🎯🐣</div>

            <h2 className="text-2xl font-bold text-white mb-2">무빙 머지 슈터</h2>

            <p className="text-white text-sm mb-4 text-center px-4">

              슬링샷을 당겨서 같은 새를 맞추면 합체!

            </p>

            <button

              onClick={initGame}

              className="bg-yellow-400 hover:bg-yellow-500 text-gray-800 font-bold py-3 px-8 rounded-full text-lg shadow-lg"

            >

              게임 시작

            </button>

          </div>

        )}



        {gameState === 'gameover' && (

          <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center">

            <div className="text-4xl mb-2">😵</div>

            <h2 className="text-2xl font-bold text-white mb-2">게임 오버!</h2>

            <p className="text-yellow-400 text-xl font-bold mb-1">점수: {score}</p>

            <p className="text-white mb-4">최고 레벨: {LEVELS[highestLevel].emoji} {LEVELS[highestLevel].name}</p>

            <button

              onClick={initGame}

              className="bg-yellow-400 hover:bg-yellow-500 text-gray-800 font-bold py-3 px-8 rounded-full text-lg shadow-lg"

            >

              다시 하기

            </button>

          </div>

        )}

      </div>



      <div className="mt-3 bg-white/80 rounded-xl p-3 max-w-xs">

        <p className="text-xs text-gray-600 text-center">

          💡 <strong>조작법</strong>: 슬링샷을 당겨서 발사!<br/>

          같은 새끼리 맞추면 합체해서 진화해요

        </p>

        <div className="flex justify-center gap-1 mt-2 text-lg">

          {LEVELS.slice(0, 5).map((l, i) => (

            <span key={i} title={l.name}>{l.emoji}</span>

          ))}

          <span>→</span>

          <span>🐉</span>

        </div>

      </div>

    </div>

  );

}

