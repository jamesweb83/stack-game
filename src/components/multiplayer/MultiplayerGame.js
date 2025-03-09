import React, { useState, useEffect, useRef } from 'react';
import './MultiplayerGame.css';

const MultiplayerGame = ({ gameData, playerId, onExit }) => {
    const [showMatchSuccess, setShowMatchSuccess] = useState(true);
    const canvasRef = useRef(null);
    
    // 매칭 성공 메시지 표시 및 3초 후 숨기기
    useEffect(() => {
        const timer = setTimeout(() => {
            setShowMatchSuccess(false);
        }, 3000);
        
        return () => clearTimeout(timer);
    }, []);
    
    // 게임 종료 핸들러
    const handleExitGame = () => {
        if (onExit) onExit();
    };
    
    return (
        <div className="multiplayer-game-container">
            {/* 임시 캔버스 영역 */}
            <canvas ref={canvasRef} className="game-canvas" />
            
            {/* 게임 정보 표시 */}
            <div className="multiplayer-info">
                <span className="player-name">플레이어: {playerId}</span>
                <span className="game-mode">1:1 대결 모드</span>
            </div>
            
            {/* 매칭 성공 메시지 */}
            {showMatchSuccess && (
                <div className="match-success-message">
                    매칭 성공!
                </div>
            )}
            
            {/* 임시 게임 종료 버튼 */}
            <button 
                className="exit-game-btn"
                onClick={handleExitGame}
            >
                게임 종료
            </button>
            
            {/* 게임 ID 및 상대 정보 */}
            <div className="game-details">
                <p>게임 ID: {gameData?.id || '정보 없음'}</p>
                <p>상태: {gameData?.status || '정보 없음'}</p>
                <p>상대방: {
                    gameData?.players 
                        ? Object.keys(gameData.players)
                            .filter(id => id !== playerId)
                            .join(', ')
                        : '정보 없음'
                }</p>
            </div>
        </div>
    );
};

export default MultiplayerGame; 