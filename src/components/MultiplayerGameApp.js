import React, { useState } from 'react';
import StartScreen from './StartScreen';
import MatchmakingScreen from './multiplayer/MatchmakingScreen';
import MultiplayerGame from './multiplayer/MultiplayerGame';
import './MultiplayerGameApp.css';

const MultiplayerGameApp = () => {
    const [playerId, setPlayerId] = useState('');
    const [gameStarted, setGameStarted] = useState(false);
    const [isMatchmaking, setIsMatchmaking] = useState(false);
    const [matchData, setMatchData] = useState(null);
    
    // 게임 시작 핸들러
    const handleStartSinglePlayer = () => {
        // 싱글 플레이 모드는 다른 컴포넌트에서 처리할 예정
        alert('싱글플레이는 Game.js 컴포넌트에서 처리합니다.');
    };
    
    // 매칭 시작 핸들러
    const handleStartMultiplayer = () => {
        if (!playerId.trim()) {
            alert('아이디를 입력해주세요!');
            return;
        }
        
        setIsMatchmaking(true);
    };
    
    // 매칭 취소 핸들러
    const handleCancelMatchmaking = () => {
        setIsMatchmaking(false);
    };
    
    // 매칭 성공 핸들러
    const handleMatchFound = (gameData) => {
        setMatchData(gameData);
        setIsMatchmaking(false);
        setGameStarted(true);
    };
    
    // 게임 종료 핸들러
    const handleExitGame = () => {
        setGameStarted(false);
        setMatchData(null);
    };
    
    return (
        <div className="multiplayer-app-container">
            {!gameStarted ? (
                <>
                    <StartScreen 
                        playerId={playerId}
                        setPlayerId={setPlayerId}
                        onStartSinglePlayer={handleStartSinglePlayer}
                        onStartMultiplayer={handleStartMultiplayer}
                    />
                    
                    {isMatchmaking && (
                        <MatchmakingScreen 
                            playerId={playerId}
                            onMatchFound={handleMatchFound}
                            onCancel={handleCancelMatchmaking}
                        />
                    )}
                </>
            ) : (
                <MultiplayerGame 
                    gameData={matchData}
                    playerId={playerId}
                    onExit={handleExitGame}
                />
            )}
        </div>
    );
};

export default MultiplayerGameApp; 