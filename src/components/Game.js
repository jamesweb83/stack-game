import React, { useEffect, useRef, useState, useCallback, useMemo, useLayoutEffect } from 'react';
import Matter from 'matter-js';
import './Game.css';
import { db, initialized } from '../firebase';
import { addDoc, collection } from 'firebase/firestore';
import { saveRanking, getRankings, getPlayerRank } from './RankingService';
import { initOnlineUsers, subscribeToOnlineUsers, unsubscribeFromOnlineUsers } from '../firebase';

const Game = () => {
    const canvasRef = useRef(null);
    const containerRef = useRef(null);
    const [score, setScore] = useState(0);
    const [gameOver, setGameOver] = useState(false);
    const [isInitialized, setIsInitialized] = useState(false);
    const [playerId, setPlayerId] = useState('');
    const [gameStarted, setGameStarted] = useState(false);
    const [rankings, setRankings] = useState([]);
    const [playerRank, setPlayerRank] = useState(null);
    const [topScore, setTopScore] = useState(0);
    const [onlineUsers, setOnlineUsers] = useState(0);
    
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
    
    // 기울기 종료 조건 제거로 인해 불필요
    // const platformAngleToleranceRef = useRef(0.3); // 균형 허용 각도
    
    // 표시할 랭킹 목록 메모이제이션
    const displayRankings = useMemo(() => {
        return rankings
            .filter(rank => rank.score > 0)
            .sort((a, b) => b.score - a.score || new Date(b.date) - new Date(a.date))
            .slice(0, 30);
    }, [rankings, playerId]);
    
    // 컴포넌트 마운트 시 랭킹 데이터 로드
    useEffect(() => {
        console.log('Component mounted');
        
        const loadRankings = async () => {
            try {
                console.log('Loading ranking data from Firebase...');
                const firebaseRankings = await getRankings(30);
                console.log('Rankings from Firebase:', firebaseRankings);
                
                if (firebaseRankings && firebaseRankings.length > 0) {
                    setRankings(firebaseRankings);
                } else {
                    console.log('Could not retrieve rankings from Firebase.');
                }
            } catch (error) {
                console.error('Error loading ranking data:', error);
            }
        };
        
        // 접속자 수 초기화 및 구독 추가
        const initializeOnlineUsers = async () => {
            try {
                await initOnlineUsers();
                subscribeToOnlineUsers((count) => {
                    setOnlineUsers(count);
                });
            } catch (error) {
                console.error('Error initializing online users:', error);
            }
        };
        
        loadRankings();
        initializeOnlineUsers();
        
        // 컴포넌트 언마운트시 접속자 수 구독 해제
        return () => {
            unsubscribeFromOnlineUsers();
        };
    }, []);
    
    // 게임 오버 시 점수 저장
    const saveScore = async (playerId, newScore) => {
        if (playerId.trim() && newScore > 0) {
            try {
                console.log(`Attempting to save ranking to Firebase - Player: ${playerId}, Score: ${newScore}`);
                const result = await saveFirebaseRanking(playerId, newScore);
                console.log('Firebase save result:', result);
                
                if (result && result.updated) {
                    // 파이어베이스에서 최신 랭킹 가져오기
                    const updatedRankings = await getRankings();
                    console.log('Updated rankings from Firebase:', updatedRankings);
                    
                    if (updatedRankings && updatedRankings.length > 0) {
                        setRankings(updatedRankings);
                    }
                    
                    // 플레이어 순위 확인
                    const playerRankInfo = await getPlayerRank(playerId);
                    if (playerRankInfo) {
                        console.log(`Current rank: ${playerRankInfo.rank}/${playerRankInfo.total}`);
                        setPlayerRank(playerRankInfo);
                    }
                }
            } catch (error) {
                console.error('Error saving score:', error);
            }
        }
    };
    
    // 게임 정리 함수
    const cleanupGame = useCallback(() => {
        console.log('Cleaning up game...');
        
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
            }
        });
    }, [endGame, updateScore]);
    
    // 게임 초기화 함수
    const initGame = useCallback(() => {
        try {
            console.log('Starting game initialization...');
            
            // 이미 초기화되어 있다면 재초기화하지 않음
            if (isInitialized) {
                return;
            }

            if (!canvasRef.current || !containerRef.current) {
                console.log('Canvas or container element is not ready. Initialization postponed...');
                return;
            }
            
            // 게임 렌더러
            const containerRect = containerRef.current.getBoundingClientRect();
            const width = containerRect.width;
            const height = containerRect.height;
            
            // 엔진 및 월드 설정
            const engine = Matter.Engine.create({
                enableSleeping: false,
                gravity: { x: 0, y: GRAVITY }
            });
            
            const world = engine.world;
            engineRef.current = engine;
            worldRef.current = world;
            
            try {
                console.log('Initializing renderer...');
                // 렌더러 설정
                const render = Matter.Render.create({
                    canvas: canvasRef.current,
                    engine: engine,
                    options: {
                        width: width,
                        height: height,
                        wireframes: false,
                        background: '#f0f8ff',
                        pixelRatio: window.devicePixelRatio
                    }
                });
                Matter.Render.run(render);
                
                // 러너 설정
                const runner = Matter.Runner.create();
                Matter.Runner.run(runner, engine);
                
                renderRef.current = render;
                runnerRef.current = runner;
                
                console.log('Renderer initialized successfully.');
                
                // 경계 설정
                createBoundaries(world, width, height);
                
                // 초기 플랫폼 및 기둥 생성
                createPillarAndPlatform(world, width, height);
                
                // 첫 번째 객체 생성
                createNewObject(world, width, height);
                
                // 마우스 컨트롤 설정
                setupMouseControl(engine, render);
                
                // 충돌 감지 설정
                setupCollisionDetection(engine);
                
                // 게임 초기화 완료 설정
                setIsInitialized(true);
                
                console.log('Game initialization complete!');
            } catch (renderError) {
                console.error('Renderer initialization error:', renderError);
                alert('Error initializing game renderer.');
            }
        } catch (error) {
            console.error('Game initialization error:', error);
            alert('Error during game initialization: ' + error.message);
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
                console.log('Attempting to initialize game from useLayoutEffect...');
                initGame();
            }
        }, 300); // 300ms 지연으로 늘림
        
        return () => {
            clearTimeout(initTimer);
        };
    }, [gameOver, initGame, isInitialized, gameStarted]);
    
    // 이벤트 리스너 및 게임 정리
    useEffect(() => {
        console.log('Setting up event listeners...');
        
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
            console.log('Cleaning up event listeners and game...');
            
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
            console.log('Game over, starting Firebase ranking update');
            
            // Firebase에 랭킹 저장
            const saveFbRanking = async () => {
                try {
                    const result = await saveFirebaseRanking(playerId, score);
                    console.log('Firebase save result:', result);
                    
                    if (result && result.updated) {
                        console.log('Firebase ranking saved successfully!');
                        
                        // 파이어베이스에서 최신 랭킹 가져오기
                        const updatedRankings = await getRankings();
                        console.log('Updated rankings from Firebase:', updatedRankings);
                        
                        if (updatedRankings && updatedRankings.length > 0) {
                            setRankings(updatedRankings);
                        }
                        
                        // 플레이어 순위 확인
                        const playerRankInfo = await getPlayerRank(playerId);
                        if (playerRankInfo) {
                            console.log(`Current rank: ${playerRankInfo.rank}/${playerRankInfo.total}`);
                            setPlayerRank(playerRankInfo);
                        }
                    } else if (result && result.reason === 'not-in-top-30') {
                        console.log('Score is not high enough to make it to TOP 30.');
                        // TOP 30에 들어가지 못하는 경우 플레이어 랭킹 정보 설정
                        setPlayerRank({
                            rank: 31, // 30위 밖이라는 의미로 31로 설정
                            total: 30
                        });
                    }
                } catch (error) {
                    console.error('Error occurred while saving to Firebase:', error);
                }
            };
            
            saveFbRanking();
        }
    }, [gameOver, score, playerId]);
    
    // 게임 시작 함수
    const startGame = () => {
        if (!playerId.trim()) {
            alert('Please enter your ID!');
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
        
        // 파이어베이스에서 최신 랭킹 가져오기
        const loadFirebaseRankings = async () => {
            try {
                const firebaseRankings = await getRankings(30);
                if (firebaseRankings && firebaseRankings.length > 0) {
                    setRankings(firebaseRankings);
                }
            } catch (error) {
                console.error('랭킹 데이터 로드 중 오류 발생:', error);
            }
        };
        
        loadFirebaseRankings();
        
        // 약간의 지연 후 초기화
        setTimeout(() => {
            initGame();
        }, 300);
    }, [cleanupGame, initGame]);
    
    useEffect(() => {
        console.log('Firestore DB connection status:', !!db);
        
        // 테스트 문서 추가
        const testFirestore = async () => {
            try {
                const docRef = await addDoc(collection(db, 'test'), {
                    message: 'Test message',
                    timestamp: new Date()
                });
                console.log('Test document added successfully:', docRef.id);
                // alert('Firebase 연결 성공! 콘솔을 확인하세요.'); - 디버깅용 알람 제거
            } catch (e) {
                console.error('Failed to add test document:', e);
                console.error('Error code:', e.code);
                console.error('Error details:', e.details);
                alert('Firebase connection failed: ' + e.message + '\n\nCheck console for details.');
            }
        };
        
        testFirestore();
    }, []);
    
    // DB 연결 상태 확인
    useEffect(() => {
        console.log('Firebase initialization status:', initialized);
        console.log('Firebase DB connection status:', !!db);
        
        if (!initialized || !db) {
            console.warn('Firebase is not initialized. Ranking features may not work properly.');
        }
    }, []);
    
    // Firebase에 랭킹 저장하는 함수
    const saveFirebaseRanking = async (playerId, score) => {
        try {
            console.log(`Attempting to save ranking to Firebase - Player: ${playerId}, Score: ${score}`);
            console.log('Firebase initialization status:', initialized);
            console.log('Firebase DB connection status:', !!db);
            
            if (!initialized || !db) {
                console.error('Firebase is not initialized. Cannot save ranking.');
                return { error: 'Initialization error' };
            }
            
            if (!playerId || score <= 0) {
                console.log('Invalid player ID or score');
                return { error: 'Invalid data' };
            }
            
            // 현재 TOP 30 랭킹 데이터 가져오기
            const currentRankings = await getRankings(30);
            
            // TOP 30에 들어갈 수 있는지 확인
            let canEnterTop30 = false;
            
            // 랭킹이 30개 미만이면 무조건 들어갈 수 있음
            if (currentRankings.length < 30) {
                canEnterTop30 = true;
            } else {
                // 현재 플레이어가 이미 랭킹에 있는지 확인
                const existingPlayerRank = currentRankings.find(rank => rank.id === playerId);
                
                if (existingPlayerRank) {
                    // 기존 플레이어의 점수보다 높으면 업데이트 가능
                    canEnterTop30 = score > existingPlayerRank.score;
                } else {
                    // 새 플레이어는 30위 점수보다 높아야 진입 가능
                    const lowestRankScore = currentRankings[currentRankings.length - 1].score;
                    canEnterTop30 = score > lowestRankScore;
                }
            }
            
            // TOP 30에 들어갈 수 없으면 저장하지 않음
            if (!canEnterTop30) {
                console.log('Score is not high enough to make it to TOP 30. Not saving to Firebase.');
                return { updated: false, reason: 'not-in-top-30' };
            }
            
            // TOP 30에 들어갈 수 있으면 저장 진행
            const result = await saveRanking(playerId, score);
            console.log('Firebase save result:', result);
            
            if (result.updated) {
                if (result.newHighScore) {
                    console.log('New high score saved to Firebase!');
                } else if (result.newRecord) {
                    console.log('New player record saved to Firebase!');
                }
                
                // 전체 랭킹 업데이트
                const updatedRankings = await getRankings();
                console.log('Updated rankings from Firebase:', updatedRankings);
                if (updatedRankings && updatedRankings.length > 0) {
                    setRankings(updatedRankings);
                }
                
                // 플레이어 순위 확인
                const playerRankInfo = await getPlayerRank(playerId);
                if (playerRankInfo) {
                    console.log(`Current rank: ${playerRankInfo.rank}/${playerRankInfo.total}`);
                    setPlayerRank(playerRankInfo);
                }
            } else {
                console.log('Existing high score is higher, no update needed.');
                
                // 순위 정보만 업데이트
                const playerRankInfo = await getPlayerRank(playerId);
                if (playerRankInfo) {
                    console.log(`Current rank: ${playerRankInfo.rank}/${playerRankInfo.total}`);
                    setPlayerRank(playerRankInfo);
                }
            }
            
            return result;
        } catch (error) {
            console.error('Error occurred while saving to Firebase:', error);
            console.error('Error details:', error.message);
            // 오류가 발생해도 게임은 계속 진행
            return { error: error.message };
        }
    };
    
    return (
        <div className="game-container" ref={containerRef}>
            {!gameStarted ? (
                <div className="start-screen">
                    <h1>Stack Tower Game</h1>
                    <div className="input-container">
                        <input 
                            type="text" 
                            placeholder="Enter your ID" 
                            value={playerId}
                            onChange={(e) => setPlayerId(e.target.value)}
                            maxLength={15}
                        />
                        <button 
                            className="start-btn"
                            onClick={startGame}
                        >
                            Start Game
                        </button>
                    </div>
                </div>
            ) : (
                <>
                    <canvas ref={canvasRef} />
                    <div className="score">
                        <span>Player: {playerId}</span>
                        <span>Score: {score}</span>
                    </div>
                    <button 
                        className="drop-btn" 
                        onClick={dropObject}
                        disabled={gameOver || !currentObjectRef.current || !currentObjectRef.current.isStatic}
                    >
                        Drop
                    </button>
                    
                    {/* 랭킹 보드 */}
                    <div className="ranking-board">
                        <div className="online-users">
                            <span className="online-icon">👥</span> {onlineUsers} players
                        </div>
                        <h2>TOP 30 Ranking</h2>
                        {console.log('Rendering ranking board')}
                        <div className="ranking-list">
                            {displayRankings.length === 0 ? (
                                <div className="no-rankings">
                                    No ranking data available!
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
                            <h1>Game Over!</h1>
                            <p className="player-id">Player: {playerId}</p>
                            <p className="final-score">Final Score: <span className="highlight">{score}</span></p>
                            {playerRank && playerRank.rank <= 30 && (
                                <p className="player-rank">
                                    Current Rank: <span className="highlight">{playerRank.rank}</span>/{playerRank.total}
                                </p>
                            )}
                            {playerRank && playerRank.rank > 30 && (
                                <p className="player-rank">
                                    You didn't make it to TOP 30.
                                </p>
                            )}
                            <button 
                                className="restart-btn" 
                                onClick={restartGame}
                            >
                                Play Again
                            </button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default Game; 