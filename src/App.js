import React, { useState } from 'react';
import './App.css';
import Game from './components/Game';
import MultiplayerGameApp from './components/MultiplayerGameApp';

function App() {
  const [currentMode, setCurrentMode] = useState('main'); // 'main', 'single', 'multiplayer'
  
  const handleModeSelect = (mode) => {
    setCurrentMode(mode);
  };
  
  return (
    <div className="App">
      {currentMode === 'main' && (
        <div className="mode-selection">
          <h1>스택 타워 게임</h1>
          <div className="mode-buttons">
            <button onClick={() => handleModeSelect('single')}>싱글 플레이</button>
            <button onClick={() => handleModeSelect('multiplayer')}>1:1 대결 모드</button>
          </div>
        </div>
      )}
      
      {currentMode === 'single' && <Game />}
      {currentMode === 'multiplayer' && <MultiplayerGameApp />}
      
      {currentMode !== 'main' && (
        <button className="back-button" onClick={() => handleModeSelect('main')}>
          메인으로 돌아가기
        </button>
      )}
    </div>
  );
}

export default App;
//푸시테스트트