import React, { useState, useEffect, useRef, useCallback } from 'react';



const GAME_WIDTH = 350;

const GAME_HEIGHT = 550;

const AIM_AREA_HEIGHT = 150; // 조준 영역 높이 (더 넓게)

const SLING_Y = GAME_HEIGHT - 30; // 슬링샷 Y 위치 (더 아래로)

const SLING_X = GAME_WIDTH / 2;

const PLAY_AREA_HEIGHT = GAME_HEIGHT - AIM_AREA_HEIGHT; // 플레이 케이지 공간 (조준 영역과 분리)



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

    // 조준 영역 전체에서 드래그 가능 (PLAY_AREA_HEIGHT 아래 영역)
    if (pos.y > PLAY_AREA_HEIGHT) {

      setIsDragging(true);

      setDragPos(pos);

    }

  };



  const handleMove = (e) => {

    if (!isDragging) return;

    e.preventDefault();

    const pos = getEventPos(e);

    // 조준 영역 내로 제한
    if (pos.y < PLAY_AREA_HEIGHT) {
      pos.y = PLAY_AREA_HEIGHT;
    }

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

    // 발사 최소 거리 조정 (5로 낮춰서 더 쉽게 발사 가능)
    if (dist > 5) {

      // 기본 파워 (깊이에 따라) - 깊이에 비례
      const basePower = Math.min(dist / 8, 12);

      // 각도 계산 (0도 = 오른쪽, 90도 = 위쪽)
      const angle = Math.atan2(-dy, -dx); // -dy인 이유는 화면 좌표계 때문

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

      // 발사 시 햅틱 피드백
      try {
        if (navigator.vibrate) {
          navigator.vibrate(30); // 짧은 발사 진동
        }
      } catch (e) {
        // 햅틱 지원하지 않는 환경에서는 무시
      }

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
          const maxY = PLAY_AREA_HEIGHT - radius; // 플레이 케이지 공간 제한

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

        // 충돌 처리 및 병합
        const collisionBirds = movedBirds.map(bird => ({ ...bird })); // 깊은 복사
        const toRemove = new Set(); // 병합으로 제거될 새들의 인덱스
        const mergedBirds = []; // 병합으로 생성된 새들

        for (let i = 0; i < collisionBirds.length; i++) {
          if (toRemove.has(i)) continue;

          const bird = collisionBirds[i];
          const radius1 = bird.size / 2 + 5;

          for (let j = i + 1; j < collisionBirds.length; j++) {
            if (toRemove.has(j)) continue;

            const otherBird = collisionBirds[j];
            const radius2 = otherBird.size / 2 + 5;

            const dx = otherBird.x - bird.x;
            const dy = otherBird.y - bird.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const minDist = radius1 + radius2;

            // 같은 레벨이면 병합
            if (dist < minDist && bird.level === otherBird.level && bird.level < LEVELS.length - 1) {
              const newLevel = Math.min(bird.level + 1, LEVELS.length - 1);
              const mergeX = (bird.x + otherBird.x) / 2;
              const mergeY = (bird.y + otherBird.y) / 2;
              
              // 병합된 새 생성
              const mergedBird = createBird(newLevel, mergeX, mergeY);
              mergedBird.vx = (bird.vx + otherBird.vx) / 2;
              mergedBird.vy = (bird.vy + otherBird.vy) / 2;
              mergedBirds.push(mergedBird);

              // 병합 이펙트
              setMergeEffect({ x: mergeX, y: mergeY, level: newLevel });
              setTimeout(() => setMergeEffect(null), 500);

              // 점수 추가
              const points = (newLevel + 1) * 100;
              setScore((s) => s + points);
              setCombo((c) => c + 1);
              setShowCombo(true);
              setTimeout(() => setShowCombo(false), 800);

              // 햅틱 피드백
              try {
                if (navigator.vibrate) {
                  navigator.vibrate([50, 30, 50]); // 짧은 진동 패턴
                }
              } catch (e) {
                // 햅틱 지원하지 않는 환경에서는 무시
              }

              toRemove.add(i);
              toRemove.add(j);
              break; // 한 번에 하나씩만 병합
            }
            // 다른 레벨이면 탄성 충돌
            else if (dist < minDist && dist > 0) {
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

                // 위치 분리 (겹침 방지 - 더 강하게)
                const overlap = minDist - dist;
                const separationX = (nx * overlap) * 0.6; // 더 강한 분리
                const separationY = (ny * overlap) * 0.6;

                bird.x -= separationX;
                bird.y -= separationY;
                otherBird.x += separationX;
                otherBird.y += separationY;
              }
            }
          }
        }

        // 병합된 새들과 남은 새들 합치기
        const remainingBirds = collisionBirds.filter((_, idx) => !toRemove.has(idx));
        return [...remainingBirds, ...mergedBirds];

      });



      setBullet((prev) => {

        if (!prev) return null;

        let { x, y, vx, vy, level, size } = prev;

        const radius = size / 2 + 3;

        // 이동 속도 조절 (시각적으로 보이도록 더 느리게)
        const speedMultiplier = 0.5; // 속도를 50%로 줄여서 시각적으로 명확히 보이게
        x += vx * speedMultiplier;
        y += vy * speedMultiplier;
        vy += 0.15 * speedMultiplier; // 중력도 비례해서 줄임

        // 충돌 감지 (gameLoop에서 직접 체크)
        setBirds((prevBirds) => {
          let hit = false;
          let hitBird = null;

          const checkedBirds = prevBirds.filter((bird) => {
            const dx = bird.x - x;
            const dy = bird.y - y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const hitDist = (bird.size + size) / 2 + 12;

            if (dist < hitDist && bird.level === level) {
              hit = true;
              hitBird = bird;
              return false;
            }
            return true;
          });

          if (hit && hitBird) {
            // 충돌 시 약간의 딜레이를 주어 시각적으로 보이도록
            setTimeout(() => {
              const newLevel = Math.min(hitBird.level + 1, LEVELS.length - 1);
              const points = (newLevel + 1) * 100;

              setScore((s) => s + points);
              setCombo((c) => c + 1);
              setShowCombo(true);
              setTimeout(() => setShowCombo(false), 800);

              setMergeEffect({ x: hitBird.x, y: hitBird.y, level: newLevel });
              setTimeout(() => setMergeEffect(null), 500);

              if (newLevel > highestLevel) setHighestLevel(newLevel);

              // 햅틱 피드백
              try {
                if (navigator.vibrate) {
                  navigator.vibrate([100, 50, 100]);
                }
              } catch (e) {}

              setBirds((currentBirds) => {
                const updatedBirds = currentBirds.filter(b => b.id !== hitBird.id);
                
                if (newLevel < LEVELS.length - 1) {
                  updatedBirds.push(createBird(newLevel, hitBird.x, hitBird.y));
                } else {
                  setScore((s) => s + 1000);
                }

                if (updatedBirds.length < 12) {
                  updatedBirds.push(createBird(getRandomLevel(Math.min(3, newLevel + 1))));
                }

                return updatedBirds;
              });

              setBullet(null);
            }, 200); // 200ms 딜레이로 충돌 과정이 명확히 보이도록

            return checkedBirds;
          }

          return checkedBirds;
        });

        // 경계 체크 (발사체의 크기를 고려, 플레이 영역 내로 제한)
        const minX = radius;
        const maxX = GAME_WIDTH - radius;
        const minY = radius;
        const maxY = PLAY_AREA_HEIGHT - radius; // 플레이 영역 내로 제한

        // 플레이 영역 밖으로 나가면 새로 추가
        if (x < minX || x > maxX || y < minY || y > maxY) {
          // 플레이 영역 내로 위치 제한
          x = Math.max(minX, Math.min(maxX, x));
          y = Math.max(minY, Math.min(maxY, y));
          
          setBirds((prevBirds) => {
            // 발사체를 새로 추가
            const newBird = createBird(level, x, y);
            // 경계에 닿았으므로 약간의 랜덤 속도 추가
            newBird.vx = (Math.random() - 0.5) * 2;
            newBird.vy = (Math.random() - 0.5) * 2;
            return [...prevBirds, newBird];
          });
          // 발사체 제거
          return null;
        }

        // 속도가 너무 느려지면 새로 추가하고 발사체 제거
        const speed = Math.sqrt(vx * vx + vy * vy);
        if (speed < 0.3) {
          setBirds((prevBirds) => {
            const newBird = createBird(level, x, y);
            newBird.vx = (Math.random() - 0.5) * 2;
            newBird.vy = (Math.random() - 0.5) * 2;
            return [...prevBirds, newBird];
          });
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

    if (!bullet) {

      setCombo(0);

    }

  }, [bullet]);



  // 공간 가득 참 체크
  useEffect(() => {

    if (gameState !== 'playing') return;

    // 플레이 영역의 총 면적 계산
    const playArea = PLAY_AREA_HEIGHT * GAME_WIDTH;
    
    // 모든 새들이 차지하는 면적 계산
    let totalArea = 0;
    birds.forEach(bird => {
      const radius = bird.size / 2 + 5;
      totalArea += Math.PI * radius * radius;
    });

    // 공간 사용률 계산 (80% 이상이면 게임 오버)
    const usageRatio = totalArea / playArea;
    
    if (usageRatio > 0.8 || birds.length >= 30) {
      setGameState('gameover');
    }

  }, [birds.length, birds, gameState]);



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

    if (isDragging && dist > 5) {
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



          <line x1={0} y1={PLAY_AREA_HEIGHT} x2={GAME_WIDTH} y2={PLAY_AREA_HEIGHT} stroke="rgba(255,0,0,0.5)" strokeWidth={3} strokeDasharray="10,5" />



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

              {/* 발사체 하이라이트 (더 명확하게 보이도록) */}
              <circle 
                cx={bullet.x} 
                cy={bullet.y} 
                r={bullet.size / 2 + 8} 
                fill={LEVELS[bullet.level].color} 
                opacity={0.3}
              >
                <animate attributeName="r" values={`${bullet.size / 2 + 5};${bullet.size / 2 + 12};${bullet.size / 2 + 5}`} dur="0.5s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.2;0.4;0.2" dur="0.5s" repeatCount="indefinite" />
              </circle>
              
              {/* 발사체 본체 */}
              <circle 
                cx={bullet.x} 
                cy={bullet.y} 
                r={bullet.size / 2 + 5} 
                fill={LEVELS[bullet.level].color} 
                opacity={0.8}
                stroke="#FFFFFF"
                strokeWidth={2}
              />
              
              <text 
                x={bullet.x} 
                y={bullet.y + bullet.size / 4} 
                fontSize={bullet.size} 
                textAnchor="middle"
                style={{ filter: 'drop-shadow(0 0 3px rgba(255,255,255,0.8))' }}
              >
                {LEVELS[bullet.level].emoji}
              </text>

              {/* 발사체 궤적 표시 (뒤에 흔적 - 속도에 맞춰 조정) */}
              <circle 
                cx={bullet.x - bullet.vx * 0.5 * 0.5} 
                cy={bullet.y - bullet.vy * 0.5 * 0.5} 
                r={bullet.size / 2 + 2} 
                fill={LEVELS[bullet.level].color} 
                opacity={0.4}
              />
              <circle 
                cx={bullet.x - bullet.vx * 1.0 * 0.5} 
                cy={bullet.y - bullet.vy * 1.0 * 0.5} 
                r={bullet.size / 2} 
                fill={LEVELS[bullet.level].color} 
                opacity={0.3}
              />
              <circle 
                cx={bullet.x - bullet.vx * 1.5 * 0.5} 
                cy={bullet.y - bullet.vy * 1.5 * 0.5} 
                r={bullet.size / 2 - 2} 
                fill={LEVELS[bullet.level].color} 
                opacity={0.2}
              />

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

        {/* 공간 사용률 표시 */}
        {(() => {
          const playArea = PLAY_AREA_HEIGHT * GAME_WIDTH;
          let totalArea = 0;
          birds.forEach(bird => {
            const radius = bird.size / 2 + 5;
            totalArea += Math.PI * radius * radius;
          });
          const usageRatio = totalArea / playArea;
          const usagePercent = Math.min(Math.round(usageRatio * 100), 100);
          return (
            <div className="absolute top-2 right-2 bg-black/60 px-2 py-1 rounded-lg">
              <div className="text-xs text-white mb-1">공간: {usagePercent}%</div>
              <div className="w-20 h-2 bg-gray-700 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all duration-300 ${
                    usagePercent > 70 ? 'bg-red-500' : usagePercent > 50 ? 'bg-yellow-500' : 'bg-green-500'
                  }`}
                  style={{ width: `${usagePercent}%` }}
                />
              </div>
            </div>
          );
        })()}



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

