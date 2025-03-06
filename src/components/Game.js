import React, { useEffect, useRef, useState, useCallback, useMemo, useLayoutEffect } from 'react';
import Matter from 'matter-js';
import './Game.css';

const Game = () => {
    const canvasRef = useRef(null);
    const containerRef = useRef(null);
    const [score, setScore] = useState(0);
    const [gameOver, setGameOver] = useState(false);
    const [isInitialized, setIsInitialized] = useState(false);
    const [playerId, setPlayerId] = useState('');
    const [gameStarted, setGameStarted] = useState(false);
    const [rankings, setRankings] = useState([]);
    
    // 게임 엔진과 관련 객체 참조
    const engineRef = useRef(null);
    const renderRef = useRef(null);
    const runnerRef = useRef(null);
    const worldRef = useRef(null);
    const currentObjectRef = useRef(null);
    const dropStartYRef = useRef(80);
    
    // 게임 설정
    const PILLAR_WIDTH = 50;
    const PLATFORM_WIDTH = 240;
    const PLATFORM_HEIGHT = 20;
    const OBJECT_MIN_SIZE = 20;
    const OBJECT_MAX_SIZE = 50;
    const GRAVITY = 1.0;
    
    // useMemo로 objectShapes 메모이제이션 - 사각형만 사용
    const objectShapes = useMemo(() => ['rectangle'], []);
    
    const platformAngleToleranceRef = useRef(0.3); // 균형 허용 각도를 원래 값인 0.3으로 복원
    
    // 표시할 랭킹 목록 메모이제이션
    const displayRankings = useMemo(() => {
        return rankings
            .filter(rank => rank.score > 0)
            .sort((a, b) => b.score - a.score || new Date(b.date) - new Date(a.date))
            .slice(0, 30);
    }, [rankings, playerId]);
    
    // 랭킹 데이터 로드
    useEffect(() => {
        const loadRankings = () => {
            const savedRankings = localStorage.getItem('stackGameRankings');
            
            if (savedRankings) {
                try {
                    const parsedRankings = JSON.parse(savedRankings);
                    // 유효한 랭킹 데이터만 필터링
                    const validRankings = parsedRankings.filter(
                        rank => rank && rank.id && typeof rank.score === 'number' && rank.score > 0
                    );
                    setRankings(validRankings);
                } catch (error) {
                    // 오류 발생 시 빈 배열로 초기화
                    setRankings([]);
                    localStorage.removeItem('stackGameRankings');
                }
            } else {
                // 저장된 랭킹이 없으면 빈 배열로 설정
                setRankings([]);
            }
        };
        
        // 초기 로드
        loadRankings();
        
        // localStorage 변경 감지 (다른 탭/창에서 변경 시)
        const handleStorageChange = (e) => {
            if (e.key === 'stackGameRankings') {
                loadRankings();
            }
        };
        
        window.addEventListener('storage', handleStorageChange);
        
        return () => {
            window.removeEventListener('storage', handleStorageChange);
        };
    }, []);
    
    // 랭킹 업데이트
    const updateRankings = useCallback((newScore) => {
        // 기존 랭킹 데이터 가져오기
        let updatedRankings = [...rankings];
        
        // 플레이어 ID가 비어있으면 처리하지 않음
        if (!playerId.trim()) {
            return updatedRankings;
        }
        
        // 현재 플레이어가 이미 랭킹에 있는지 확인
        const existingIndex = updatedRankings.findIndex(rank => rank.id === playerId);
        
        if (existingIndex !== -1) {
            // 플레이어가 이미 있고 현재 점수가 더 높으면 업데이트
            if (newScore > updatedRankings[existingIndex].score) {
                updatedRankings[existingIndex].score = newScore;
                updatedRankings[existingIndex].date = new Date().toISOString();
            }
        } else {
            // 플레이어가 랭킹에 없으면 추가
            updatedRankings.push({
                id: playerId,
                score: newScore,
                date: new Date().toISOString()
            });
        }
        
        // 점수 기준으로 내림차순 정렬 (동점일 경우 최신 날짜 우선)
        updatedRankings.sort((a, b) => {
            // 점수가 다르면 점수로 정렬
            if (b.score !== a.score) {
                return b.score - a.score;
            }
            // 점수가 같으면 날짜로 정렬 (최신이 위로)
            return new Date(b.date) - new Date(a.date);
        });
        
        // 상위 30명만 유지
        updatedRankings = updatedRankings.slice(0, 30);
        
        // 랭킹 업데이트 및 저장
        setRankings(updatedRankings);
        try {
            const rankingsJson = JSON.stringify(updatedRankings);
            localStorage.setItem('stackGameRankings', rankingsJson);
        } catch (error) {
            // 저장 오류 처리 - 기록만 하고 계속 진행
        }
        
        return updatedRankings;
    }, [rankings, playerId]);
    
    // 게임 정리 함수
    const cleanupGame = useCallback(() => {
        console.log('게임 정리 중...');
        
        // 게임 엔진 정리
        if (runnerRef.current) {
            Matter.Runner.stop(runnerRef.current);
            runnerRef.current = null;
        }
        
        if (renderRef.current) {
            Matter.Render.stop(renderRef.current);
            renderRef.current = null;
        }
        
        if (worldRef.current && engineRef.current) {
            Matter.World.clear(worldRef.current);
            Matter.Engine.clear(engineRef.current);
            worldRef.current = null;
            engineRef.current = null;
        }
        
        currentObjectRef.current = null;
        setIsInitialized(false);
    }, []);
    
    // 무작위 색상 생성
    const getRandomColor = useCallback(() => {
        const colors = [
            '#FF6347', '#4682B4', '#32CD32', '#FFD700', 
            '#9370DB', '#FF69B4', '#20B2AA', '#FFA07A'
        ];
        return colors[Math.floor(Math.random() * colors.length)];
    }, []);
    
    // 점수 업데이트
    const updateScore = useCallback(() => {
        setScore(prevScore => {
            const newScore = prevScore + 1;
            
            // 난이도 점진적 증가
            if (newScore > 5) {
                platformAngleToleranceRef.current = 0.3 - (newScore * 0.01);
                // 최소 허용 각도 제한
                if (platformAngleToleranceRef.current < 0.05) platformAngleToleranceRef.current = 0.05;
            }
            
            return newScore;
        });
    }, []);
    
    // 게임 종료
    const endGame = useCallback(() => {
        if (gameOver) return;
        
        // 게임 오버 설정
        setGameOver(true);
        
    }, [gameOver]);
    
    // 새 물체 생성
    const createNewObject = useCallback(() => {
        if (gameOver || !renderRef.current || !worldRef.current) return;
        
        const width = renderRef.current.options.width;
        
        // 무작위 모양, 크기 및 색상
        const shape = objectShapes[Math.floor(Math.random() * objectShapes.length)];
        const size = Math.random() * (OBJECT_MAX_SIZE - OBJECT_MIN_SIZE) + OBJECT_MIN_SIZE;
        const color = getRandomColor();
        
        // 물체 위치 설정
        const x = width / 2;
        dropStartYRef.current = 80;
        
        // 모양에 따라 물체 생성
        if (shape === 'rectangle') {
            currentObjectRef.current = Matter.Bodies.rectangle(
                x, dropStartYRef.current, size, size * 0.6,
                {
                    label: 'stackable',
                    frictionAir: 0.05,
                    friction: 2.0,
                    frictionStatic: 3.0,
                    restitution: 0.3,
                    density: size / 30,
                    collisionCount: 0,
                    render: { fillStyle: color }
                }
            );
        }
        
        // 처음에는 정적으로 설정
        Matter.Body.setStatic(currentObjectRef.current, true);
        Matter.World.add(worldRef.current, currentObjectRef.current);
    }, [gameOver, getRandomColor, objectShapes, OBJECT_MAX_SIZE, OBJECT_MIN_SIZE]);
    
    // 물체 떨어뜨리기
    const dropObject = useCallback(() => {
        if (!currentObjectRef.current) return;
        
        Matter.Body.setStatic(currentObjectRef.current, false);
        
        // 물체를 안정화하기 위한 처리
        setTimeout(function() {
            if (currentObjectRef.current && !gameOver) {
                // 새 물체 생성
                setTimeout(createNewObject, 800);
            }
        }, 700);
    }, [gameOver, createNewObject]);
    
    // 기둥과 받침대 생성
    const createPillarAndPlatform = useCallback(() => {
        if (!renderRef.current || !worldRef.current) return;
        
        const width = renderRef.current.options.width;
        const height = renderRef.current.options.height;
        
        // 고정된 기둥
        const pillar = Matter.Bodies.rectangle(
            width / 2,
            height - 120,
            PILLAR_WIDTH,
            200,
            {
                isStatic: true,
                collisionFilter: { group: 1 },
                render: { fillStyle: '#4A4A4A' }
            }
        );
        
        // 균형 잡힌 받침대
        const platform = Matter.Bodies.rectangle(
            width / 2,
            height - 220,
            PLATFORM_WIDTH,
            PLATFORM_HEIGHT,
            {
                label: 'platform',
                frictionAir: 0.05,
                friction: 2.0,
                frictionStatic: 3.0,
                restitution: 0,
                density: 0.1,
                render: { fillStyle: '#8B4513' }
            }
        );
        
        Matter.World.add(worldRef.current, [pillar, platform]);
    }, [PILLAR_WIDTH, PLATFORM_WIDTH, PLATFORM_HEIGHT]);
    
    // 경계 생성
    const createBoundaries = useCallback(() => {
        if (!renderRef.current || !worldRef.current) return;
        
        const width = renderRef.current.options.width;
        const height = renderRef.current.options.height;
        
        // 바닥 경계
        Matter.World.add(worldRef.current, [
            Matter.Bodies.rectangle(width / 2, height + 50, width * 2, 100, { 
                isStatic: true,
                render: { fillStyle: '#333333' }
            })
        ]);
    }, []);
    
    // 마우스 컨트롤 설정
    const setupMouseControl = useCallback(() => {
        if (!renderRef.current || !engineRef.current || !worldRef.current) return;
        
        const mouse = Matter.Mouse.create(renderRef.current.canvas);
        const mouseConstraint = Matter.MouseConstraint.create(engineRef.current, {
            mouse: mouse,
            constraint: {
                stiffness: 0.2,
                render: { visible: false }
            }
        });
        
        Matter.World.add(worldRef.current, mouseConstraint);
        
        // 마우스 이동 시 물체 이동
        Matter.Events.on(mouseConstraint, 'mousemove', function(event) {
            if (currentObjectRef.current && currentObjectRef.current.isStatic && !gameOver) {
                const mousePosition = event.mouse.position;
                
                // 좌우로만 이동하도록 제한
                Matter.Body.setPosition(currentObjectRef.current, {
                    x: mousePosition.x,
                    y: dropStartYRef.current
                });
            }
        });
    }, [gameOver]);
    
    // 충돌 감지 설정
    const setupCollisionDetection = useCallback(() => {
        if (!engineRef.current || !renderRef.current || !worldRef.current) return;
        
        Matter.Events.on(engineRef.current, 'collisionStart', function(event) {
            const pairs = event.pairs;
            
            for (let i = 0; i < pairs.length; i++) {
                const pair = pairs[i];
                
                // 물체가 바닥에 닿은 경우 (게임 오버)
                if ((pair.bodyA.label === 'stackable' && pair.bodyB.isStatic && pair.bodyB.position.y > renderRef.current.options.height - 100) ||
                    (pair.bodyB.label === 'stackable' && pair.bodyA.isStatic && pair.bodyA.position.y > renderRef.current.options.height - 100)) {
                    endGame();
                }
                
                // 충돌 횟수에 따른 반발력 조정
                if (pair.bodyA.label === 'stackable') {
                    // 충돌 횟수 증가
                    pair.bodyA.collisionCount = (pair.bodyA.collisionCount || 0) + 1;
                    
                    // 3번 이상 충돌했으면 반발력을 0으로 설정
                    if (pair.bodyA.collisionCount >= 3) {
                        pair.bodyA.restitution = 0;
                    }
                    
                    // 점수 계산
                    if (!pair.bodyA.isStatic && !pair.bodyA.scored &&
                        (pair.bodyB.label === 'platform' || pair.bodyB.label === 'stackable')) {
                        pair.bodyA.scored = true;
                        updateScore();
                    }
                }
                
                if (pair.bodyB.label === 'stackable') {
                    // 충돌 횟수 증가
                    pair.bodyB.collisionCount = (pair.bodyB.collisionCount || 0) + 1;
                    
                    // 3번 이상 충돌했으면 반발력을 0으로 설정
                    if (pair.bodyB.collisionCount >= 3) {
                        pair.bodyB.restitution = 0;
                    }
                    
                    // 점수 계산
                    if (!pair.bodyB.isStatic && !pair.bodyB.scored &&
                        (pair.bodyA.label === 'platform' || pair.bodyA.label === 'stackable')) {
                        pair.bodyB.scored = true;
                        updateScore();
                    }
                }
            }
        });
        
        // 물체가 화면 밖으로 나가면 게임 오버
        Matter.Events.on(engineRef.current, 'afterUpdate', function() {
            if (!worldRef.current || !renderRef.current) return;
            
            const allBodies = Matter.Composite.allBodies(worldRef.current);
            
            for (let i = 0; i < allBodies.length; i++) {
                const body = allBodies[i];
                
                // 물체가 화면 밖으로 나가면 게임 오버
                if ((body.label === 'stackable' || body.label === 'platform') && 
                    body.position.y > renderRef.current.options.height + 100) {
                    endGame();
                    return;
                }
                
                // 받침대 각도 확인
                if (body.label === 'platform') {
                    if (Math.abs(body.angle) > platformAngleToleranceRef.current) {
                        endGame();
                        return;
                    }
                }
            }
        });
    }, [endGame, updateScore]);
    
    // 게임 초기화 함수
    const initGame = useCallback(() => {
        try {
            console.log('게임 초기화 시작...');
            
            // 이미 초기화되었으면 정리 먼저 수행
            if (isInitialized) {
                cleanupGame();
            }
            
            // 캔버스 요소가 없으면 초기화 중단
            if (!canvasRef.current || !containerRef.current) {
                console.log('캔버스 또는 컨테이너 요소가 준비되지 않았습니다. 초기화 연기...');
                return;
            }
            
            // 점수 초기화
            setScore(0);
            setGameOver(false);
            
            // 물리 엔진 생성
            engineRef.current = Matter.Engine.create({
                gravity: { x: 0, y: GRAVITY },
                positionIterations: 12,
                velocityIterations: 12,
                constraintIterations: 4,
                enableSleeping: false,
                timeScale: 0.9
            });
            
            worldRef.current = engineRef.current.world;
            
            // 캔버스 크기 설정
            canvasRef.current.width = containerRef.current.clientWidth;
            canvasRef.current.height = containerRef.current.clientHeight;
            
            // 렌더러 설정 - 안전장치 추가
            try {
                console.log('렌더러 초기화 중...');
                
                renderRef.current = Matter.Render.create({
                    canvas: canvasRef.current,
                    engine: engineRef.current,
                    options: {
                        width: canvasRef.current.width,
                        height: canvasRef.current.height,
                        wireframes: false,
                        background: '#f0f8ff'
                    }
                });
                
                // 렌더러가 제대로 초기화되었는지 확인
                if (!renderRef.current.canvas || !renderRef.current.context) {
                    console.error('렌더러 캔버스 또는 컨텍스트가 초기화되지 않았습니다.');
                    return;
                }
                
                console.log('렌더러가 성공적으로 초기화되었습니다.');
                
                // 게임 실행
                Matter.Render.run(renderRef.current);
                runnerRef.current = Matter.Runner.create();
                Matter.Runner.run(runnerRef.current, engineRef.current);
                
                // 경계 생성
                createBoundaries();
                
                // 기둥과 받침대 생성
                createPillarAndPlatform();
                
                // 새 물체 생성
                createNewObject();
                
                // 마우스 컨트롤 설정
                setupMouseControl();
                
                // 충돌 이벤트 감지
                setupCollisionDetection();
                
                setIsInitialized(true);
                console.log('게임 초기화 완료!');
            } catch (renderError) {
                console.error('렌더러 초기화 오류:', renderError);
                alert('게임 렌더러를 초기화하는 중 오류가 발생했습니다.');
            }
        } catch (error) {
            console.error('Game initialization error:', error);
            alert('게임 초기화 중 오류가 발생했습니다: ' + error.message);
        }
    }, [
        isInitialized, 
        cleanupGame, 
        GRAVITY, 
        createBoundaries, 
        createPillarAndPlatform, 
        createNewObject, 
        setupMouseControl, 
        setupCollisionDetection
    ]);
    
    // 게임 초기화를 위한 layoutEffect (DOM이 완전히 업데이트된 후 실행)
    useLayoutEffect(() => {
        // 게임 오버 상태가 변경되면 초기화 슘
        if (gameOver) return;
        
        // 게임이 시작되지 않았으면 초기화하지 않음
        if (!gameStarted) return;
        
        // 지연 후 초기화 시도
        const initTimer = setTimeout(() => {
            if (canvasRef.current && containerRef.current && !isInitialized) {
                console.log('useLayoutEffect에서 게임 초기화 시도...');
                initGame();
            }
        }, 300); // 300ms 지연으로 늘림
        
        return () => {
            clearTimeout(initTimer);
        };
    }, [gameOver, initGame, isInitialized, gameStarted]);
    
    // 이벤트 리스너 및 게임 정리
    useEffect(() => {
        console.log('이벤트 리스너 설정 중...');
        
        const handleKeyDown = (event) => {
            if (event.code === 'Space' && currentObjectRef.current && currentObjectRef.current.isStatic && !gameOver) {
                dropObject();
            }
        };
        
        const handleTouchMove = (event) => {
            if (currentObjectRef.current && currentObjectRef.current.isStatic && !gameOver) {
                const touch = event.touches[0];
                const rect = canvasRef.current.getBoundingClientRect();
                const x = touch.clientX - rect.left;
                
                // 좌우로만 이동하도록 제한
                Matter.Body.setPosition(currentObjectRef.current, {
                    x: x,
                    y: dropStartYRef.current
                });
            }
            
            // 기본 동작 방지
            event.preventDefault();
        };
        
        // 이벤트 리스너 등록
        document.addEventListener('keydown', handleKeyDown);
        const currentCanvas = canvasRef.current;
        if (currentCanvas) {
            currentCanvas.addEventListener('touchmove', handleTouchMove, { passive: false });
        }
        
        // 화면 크기 변경 이벤트
        const handleResize = () => {
            if (renderRef.current && containerRef.current) {
                renderRef.current.options.width = containerRef.current.clientWidth;
                renderRef.current.options.height = containerRef.current.clientHeight;
                Matter.Render.setPixelRatio(renderRef.current, window.devicePixelRatio);
            }
        };
        
        window.addEventListener('resize', handleResize);
        
        // 클린업 함수
        return () => {
            console.log('이벤트 리스너 및 게임 정리 중...');
            
            document.removeEventListener('keydown', handleKeyDown);
            if (currentCanvas) {
                currentCanvas.removeEventListener('touchmove', handleTouchMove);
            }
            window.removeEventListener('resize', handleResize);
            
            // 게임 엔진 정리
            cleanupGame();
        };
    }, [gameOver, dropObject, cleanupGame]);
    
    // 게임 종료 후 랭킹 업데이트를 위한 효과
    useEffect(() => {
        // 게임이 종료된 경우에만 랭킹 업데이트
        if (gameOver && score > 0 && playerId.trim()) {
            // 현재 랭킹 상태 복제
            let updatedRankings = [...rankings];
            
            // 현재 플레이어가 이미 랭킹에 있는지 확인
            const existingIndex = updatedRankings.findIndex(rank => rank.id === playerId);
            
            let isUpdated = false;
            
            if (existingIndex !== -1) {
                // 플레이어가 있고 현재 점수가 더 높으면 업데이트
                if (score > updatedRankings[existingIndex].score) {
                    updatedRankings[existingIndex].score = score;
                    updatedRankings[existingIndex].date = new Date().toISOString();
                    isUpdated = true;
                }
            } else {
                // 플레이어가 랭킹에 없으면 추가
                updatedRankings.push({
                    id: playerId,
                    score: score,
                    date: new Date().toISOString()
                });
                isUpdated = true;
            }
            
            if (isUpdated) {
                // 점수로 정렬
                updatedRankings.sort((a, b) => {
                    if (b.score !== a.score) {
                        return b.score - a.score;
                    }
                    return new Date(b.date) - new Date(a.date);
                });
                
                // 상위 30명만 유지
                updatedRankings = updatedRankings.slice(0, 30);
                
                // 상태 및 로컬 스토리지 업데이트
                setRankings(updatedRankings);
                localStorage.setItem('stackGameRankings', JSON.stringify(updatedRankings));
            }
        }
    }, [gameOver, score, playerId, rankings]);
    
    // 게임 시작 함수
    const startGame = () => {
        if (!playerId.trim()) {
            alert('아이디를 입력해주세요!');
            return;
        }
        
        setGameStarted(true);
        setScore(0);
        setGameOver(false);
    }
    
    // 게임 재시작 함수
    const restartGame = useCallback(() => {
        // 게임 정리 후 초기화
        cleanupGame();
        
        // 게임 상태 초기화
        setGameStarted(true);
        setScore(0); // 점수 초기화
        setGameOver(false);
        
        // 랭킹 데이터 최신화
        const savedRankings = localStorage.getItem('stackGameRankings');
        if (savedRankings) {
            try {
                const parsedRankings = JSON.parse(savedRankings);
                // 유효한 랭킹 데이터만 필터링
                const validRankings = parsedRankings.filter(
                    rank => rank && rank.id && typeof rank.score === 'number' && rank.score > 0
                );
                setRankings(validRankings);
            } catch (error) {
                // 무시하고 계속 진행
            }
        }
        
        // 약간의 지연 후 초기화
        setTimeout(() => {
            initGame();
        }, 300);
    }, [cleanupGame, initGame]);
    
    return (
        <div className="game-container" ref={containerRef}>
            {!gameStarted ? (
                <div className="start-screen">
                    <h1>높이 쌓기 게임</h1>
                    <div className="input-container">
                        <input 
                            type="text" 
                            placeholder="아이디를 입력하세요" 
                            value={playerId}
                            onChange={(e) => setPlayerId(e.target.value)}
                            maxLength={15}
                        />
                        <button 
                            className="start-btn"
                            onClick={startGame}
                        >
                            시작하기
                        </button>
                    </div>
                </div>
            ) : (
                <>
                    <canvas ref={canvasRef} />
                    <div className="score">점수: {score}</div>
                    <button 
                        className="drop-btn" 
                        onClick={dropObject}
                        disabled={gameOver || !currentObjectRef.current || !currentObjectRef.current.isStatic}
                    >
                        떨어뜨리기
                    </button>
                    
                    {/* 랭킹 보드 */}
                    <div className="ranking-board">
                        <h2>랭킹 TOP 30</h2>
                        {console.log('Rendering ranking board')}
                        <div className="ranking-list">
                            {displayRankings.length === 0 ? (
                                <div className="no-rankings">
                                    아직 랭킹 정보가 없습니다!
                                </div>
                            ) : (
                                displayRankings.map((rank, index) => (
                                    <div 
                                        key={`${rank.id}-${rank.score}-${index}`}
                                        className={`ranking-item ${rank.id === playerId ? 'current-player' : ''}`}
                                    >
                                        <span className="rank-position">{index + 1}.</span>
                                        <span className="rank-id">{rank.id}</span>
                                        <span className="rank-score">{rank.score}</span>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                    
                    {gameOver && (
                        <div className="game-over">
                            <h1>게임 오버!</h1>
                            <p className="player-id">플레이어: {playerId}</p>
                            <p className="final-score">최종 점수: <span className="highlight">{score}</span></p>
                            <button 
                                className="restart-btn" 
                                onClick={restartGame}
                            >
                                다시 시작
                            </button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default Game; 