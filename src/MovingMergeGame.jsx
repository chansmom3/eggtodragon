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

    if (gameState !== 'playing') return;

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

      // 기본 파워 (깊이에 따라)
      const basePower = Math.min(dist / 8, 12);

      // 각도 계산 (0도 = 오른쪽, 90도 = 위쪽)
      const angle = Math.atan2(-dy, -dx); // -dy인 이유는 화면 좌표계 때문
      const angleDeg = (angle * 180) / Math.PI;

      // 각도에 따른 속도 조절
      // 위로 많이 당기면(수직) 수직 속도 증가, 옆으로 많이 당기면(수평) 수평 속도 증가
      const horizontalRatio = Math.abs(Math.cos(angle));
      const verticalRatio = Math.abs(Math.sin(angle));

      // 깊이와 각도를 모두 고려한 속도
      // 깊이가 깊을수록, 해당 방향으로 많이 당길수록 속도 증가
      const horizontalPower = basePower * (1 + horizontalRatio * 0.3);
      const verticalPower = basePower * (1 + verticalRatio * 0.3);

      // 최종 속도 계산
      const vx = (dx / dist) * horizontalPower;
      const vy = (dy / dist) * verticalPower;

      setBullet({

        x: SLING_X,

        y: SLING_Y - 30,

        vx: vx,

        vy: vy,

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

        // 먼저 이동 처리
        const movedBirds = prev.map((bird) => {

          let { x, y, vx, vy, level } = bird;

          const speed = LEVELS[level].speed;
          const radius = bird.size / 2 + 5; // 새의 반지름 (하이라이트 포함)

          // 이동
          x += vx * speed;
          y += vy * speed;

          // 경계 체크 (새의 크기를 고려)
          const minX = radius;
          const maxX = GAME_WIDTH - radius;
          const minY = radius;
          const maxY = GAME_HEIGHT - 150 - radius; // 슬링샷 영역 제외

          // 경계에 닿으면 반대 방향으로 튕김
          if (x < minX) {
            x = minX;
            vx = -vx;
          } else if (x > maxX) {
            x = maxX;
            vx = -vx;
          }

          if (y < minY) {
            y = minY;
            vy = -vy;
          } else if (y > maxY) {
            y = maxY;
            vy = -vy;
          }

          // 속도 제한 (너무 빠르게 움직이지 않도록)
          const maxSpeed = 3;
          if (Math.abs(vx) > maxSpeed) vx = vx > 0 ? maxSpeed : -maxSpeed;
          if (Math.abs(vy) > maxSpeed) vy = vy > 0 ? maxSpeed : -maxSpeed;

          // 랜덤 방향 변화
          if (Math.random() < 0.01) {

            vx += (Math.random() - 0.5) * 0.5;

            vy += (Math.random() - 0.5) * 0.5;

          }

          return { ...bird, x, y, vx, vy };

        });

        // 충돌 처리 (탄성 충돌)
        const collisionBirds = movedBirds.map(bird => ({ ...bird })); // 깊은 복사

        for (let i = 0; i < collisionBirds.length; i++) {

          const bird = collisionBirds[i];

          const radius1 = bird.size / 2 + 5;

          for (let j = i + 1; j < collisionBirds.length; j++) {

            const otherBird = collisionBirds[j];

            const radius2 = otherBird.size / 2 + 5;

            const dx = otherBird.x - bird.x;

            const dy = otherBird.y - bird.y;

            const dist = Math.sqrt(dx * dx + dy * dy);

            const minDist = radius1 + radius2;

            // 충돌 감지
            if (dist < minDist && dist > 0) {

              // 충돌 방향 벡터 정규화
              const nx = dx / dist;

              const ny = dy / dist;

              // 상대 속도
              const dvx = otherBird.vx - bird.vx;

              const dvy = otherBird.vy - bird.vy;

              // 상대 속도와 충돌 방향의 내적
              const dotProduct = dvx * nx + dvy * ny;

              // 탄성 충돌 (반발 계수 0.8)
              const restitution = 0.8;

              if (dotProduct > 0) {

                // 충돌 반응 (질량 비율 고려 - 크기에 따라)
                const mass1 = radius1 * radius1;

                const mass2 = radius2 * radius2;

                const totalMass = mass1 + mass2;

                const impulse = (2 * dotProduct * restitution) / totalMass;

                // 속도 업데이트
                bird.vx += impulse * mass2 * nx;

                bird.vy += impulse * mass2 * ny;

                otherBird.vx -= impulse * mass1 * nx;

                otherBird.vy -= impulse * mass1 * ny;

                // 위치 분리 (겹침 방지)
                const overlap = minDist - dist;

                const separationX = (nx * overlap) / 2;

                const separationY = (ny * overlap) / 2;

                bird.x -= separationX;

                bird.y -= separationY;

                otherBird.x += separationX;

                otherBird.y += separationY;

              }

            }

          }

        }

        return collisionBirds;

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

    if (birds.length >= 30 && gameState === 'playing') {

      setGameState('gameover');

    }

  }, [birds.length, gameState]);



  const calculateTrajectory = (startX, startY, dx, dy, dist, steps = 50) => {
    const points = [];
    
    // handleEnd와 동일한 방식으로 속도 계산
    const basePower = Math.min(dist / 8, 12);
    const angle = Math.atan2(-dy, -dx);
    const horizontalRatio = Math.abs(Math.cos(angle));
    const verticalRatio = Math.abs(Math.sin(angle));
    const horizontalPower = basePower * (1 + horizontalRatio * 0.3);
    const verticalPower = basePower * (1 + verticalRatio * 0.3);
    
    let x = startX;
    let y = startY;
    let currentVx = (dx / dist) * horizontalPower;
    let currentVy = (dy / dist) * verticalPower;
    const gravity = 0.15;

    for (let i = 0; i < steps; i++) {
      points.push({ x, y });
      x += currentVx;
      y += currentVy;
      currentVy += gravity;

      // 화면 밖으로 나가면 중단
      if (x < 0 || x > GAME_WIDTH || y < 0 || y > GAME_HEIGHT) {
        break;
      }
    }

    return points;
  };

  const renderSlingshot = () => {

    const dx = SLING_X - dragPos.x;

    const dy = SLING_Y - dragPos.y;

    const dist = Math.sqrt(dx * dx + dy * dy);

    let trajectoryPoints = [];

    if (isDragging && dist > 15) {
      trajectoryPoints = calculateTrajectory(SLING_X, SLING_Y - 30, dx, dy, dist, 80);
    }

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

            {/* 예상 궤적 라인 */}
            {trajectoryPoints.length > 1 && (
              <>
                <polyline
                  points={trajectoryPoints.map(p => `${p.x},${p.y}`).join(' ')}
                  fill="none"
                  stroke="rgba(255, 200, 50, 0.8)"
                  strokeWidth={2.5}
                  strokeDasharray="4,4"
                  strokeLinecap="round"
                />
                {/* 궤적 점들 */}
                {trajectoryPoints.map((point, i) => {
                  if (i % 8 !== 0) return null; // 일정 간격으로만 표시
                  const opacity = 1 - (i / trajectoryPoints.length) * 0.7;
                  return (
                    <circle
                      key={i}
                      cx={point.x}
                      cy={point.y}
                      r={3}
                      fill="rgba(255, 200, 50, 0.9)"
                      opacity={opacity}
                    />
                  );
                })}
                {/* 예상 충돌 지점 표시 */}
                {trajectoryPoints.length > 10 && (
                  <circle
                    cx={trajectoryPoints[Math.min(30, trajectoryPoints.length - 1)].x}
                    cy={trajectoryPoints[Math.min(30, trajectoryPoints.length - 1)].y}
                    r={8}
                    fill="none"
                    stroke="rgba(255, 100, 100, 0.8)"
                    strokeWidth={2}
                    strokeDasharray="3,3"
                  >
                    <animate attributeName="r" values="6;10;6" dur="1s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0.6;1;0.6" dur="1s" repeatCount="indefinite" />
                  </circle>
                )}
              </>
            )}

            {/* 발사 각도 힌트 */}
            <line
              x1={dragPos.x}
              y1={dragPos.y}
              x2={dragPos.x + dx * 0.3}
              y2={dragPos.y + dy * 0.3}
              stroke="rgba(255, 255, 255, 0.9)"
              strokeWidth={3}
              strokeLinecap="round"
            />

            <text x={dragPos.x} y={dragPos.y + 5} fontSize={LEVELS[currentLevel].size} textAnchor="middle">

              {LEVELS[currentLevel].emoji}

            </text>

            {/* 힘 표시 */}
            {dist > 15 && (
              <text
                x={dragPos.x}
                y={dragPos.y - 25}
                fontSize={12}
                textAnchor="middle"
                fill="white"
                fontWeight="bold"
                style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.8)' }}
              >
                힘: {Math.round((Math.min(dist / 8, 12) / 12) * 100)}%
              </text>
            )}

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



          {birds.map((bird) => {
            const isTarget = isDragging && bird.level === currentLevel;
            return (
              <g key={bird.id}>
                {/* 타겟 하이라이트 */}
                {isTarget && (
                  <>
                    <circle
                      cx={bird.x}
                      cy={bird.y}
                      r={bird.size / 2 + 15}
                      fill="none"
                      stroke="#FFD700"
                      strokeWidth={3}
                      opacity={0.8}
                    >
                      <animate attributeName="r" values={`${bird.size / 2 + 10};${bird.size / 2 + 20};${bird.size / 2 + 10}`} dur="1s" repeatCount="indefinite" />
                      <animate attributeName="opacity" values="0.5;1;0.5" dur="1s" repeatCount="indefinite" />
                    </circle>
                    <circle
                      cx={bird.x}
                      cy={bird.y}
                      r={bird.size / 2 + 8}
                      fill="rgba(255, 215, 0, 0.2)"
                    />
                  </>
                )}
                <circle cx={bird.x} cy={bird.y} r={bird.size / 2 + 5} fill={LEVELS[bird.level].color} opacity={isTarget ? 0.5 : 0.3} />

                <text x={bird.x} y={bird.y + bird.size / 4} fontSize={bird.size} textAnchor="middle">

                  {LEVELS[bird.level].emoji}

                </text>

                {/* 레벨 표시 */}
                {isTarget && (
                  <text
                    x={bird.x}
                    y={bird.y - bird.size / 2 - 8}
                    fontSize={10}
                    textAnchor="middle"
                    fill="#FFD700"
                    fontWeight="bold"
                    style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.8)' }}
                  >
                    타겟!
                  </text>
                )}
              </g>
            );
          })}



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

          <span className="text-xs text-white">🐤 {birds.length}/30</span>

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

