import React, { useEffect, useState } from 'react';
import './MatchmakingScreen.css';
import { joinMatchmaking, leaveMatchmaking, subscribeToMatchmaking } from './MatchmakingService';

const MatchmakingScreen = ({ playerId, onMatchFound, onCancel }) => {
    const [waitingTime, setWaitingTime] = useState(0);
    const [isMatching, setIsMatching] = useState(true);
    const [error, setError] = useState(null);
    
    useEffect(() => {
        let waitingTimer;
        let matchmakingUnsubscribe;
        
        const startMatchmaking = async () => {
            try {
                // 매칭 대기열에 참가
                const joinResult = await joinMatchmaking(playerId);
                
                if (!joinResult.success) {
                    setError(joinResult.error || '매칭 시스템에 참가할 수 없습니다.');
                    return;
                }
                
                // 대기 시간 카운터 시작
                waitingTimer = setInterval(() => {
                    setWaitingTime(prev => prev + 1);
                }, 1000);
                
                // 매칭 상태 구독
                matchmakingUnsubscribe = subscribeToMatchmaking(
                    playerId,
                    // 매칭 성공 콜백
                    (gameData) => {
                        console.log('Match found:', gameData);
                        setIsMatching(false);
                        onMatchFound(gameData);
                    },
                    // 대기 중 콜백
                    () => {
                        console.log('Still waiting for a match...');
                    }
                );
            } catch (err) {
                console.error('Error starting matchmaking:', err);
                setError('매칭 시스템 연결 중 오류가 발생했습니다.');
            }
        };
        
        // 매칭 시작
        startMatchmaking();
        
        // 컴포넌트 언마운트 시 정리
        return () => {
            clearInterval(waitingTimer);
            if (matchmakingUnsubscribe) matchmakingUnsubscribe();
            
            // 대기열에서 제거 (실제 게임으로 이동한 경우는 제외)
            if (isMatching) {
                leaveMatchmaking(playerId)
                    .catch(err => console.error('Error leaving matchmaking:', err));
            }
        };
    }, [playerId, onMatchFound, isMatching]);
    
    // 대기 취소
    const handleCancel = async () => {
        try {
            await leaveMatchmaking(playerId);
            onCancel();
        } catch (err) {
            console.error('Error cancelling matchmaking:', err);
            // 오류가 있어도 사용자는 취소 가능하도록
            onCancel();
        }
    };
    
    // 대기 시간 포맷팅
    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };
    
    return (
        <div className="matchmaking-screen">
            <div className="matchmaking-container">
                {error ? (
                    <>
                        <h2>오류 발생</h2>
                        <p className="error-text">{error}</p>
                        <button 
                            className="cancel-btn"
                            onClick={handleCancel}
                        >
                            취소
                        </button>
                    </>
                ) : (
                    <>
                        <h2>대기 중...</h2>
                        <div className="loading-animation">
                            <div className="spinner"></div>
                        </div>
                        <p className="waiting-text">상대방을 찾고 있습니다</p>
                        <p className="waiting-time">대기 시간: {formatTime(waitingTime)}</p>
                        <button 
                            className="cancel-btn"
                            onClick={handleCancel}
                        >
                            취소
                        </button>
                    </>
                )}
            </div>
        </div>
    );
};

export default MatchmakingScreen; 