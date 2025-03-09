import React from 'react';
import './StartScreen.css';

const StartScreen = ({ playerId, setPlayerId, onStartSinglePlayer, onStartMultiplayer }) => {
    return (
        <div className="start-screen">
            <h1>스택 타워 게임</h1>
            <div className="input-container">
                <input 
                    type="text" 
                    placeholder="아이디를 입력하세요" 
                    value={playerId}
                    onChange={(e) => setPlayerId(e.target.value)}
                    maxLength={15}
                />
                <div className="button-container">
                    <button 
                        className="start-btn single-player-btn"
                        onClick={onStartSinglePlayer}
                    >
                        싱글 플레이
                    </button>
                    <button 
                        className="start-btn multiplayer-btn"
                        onClick={onStartMultiplayer}
                    >
                        1:1 대결 모드
                    </button>
                </div>
            </div>
        </div>
    );
};

export default StartScreen; 