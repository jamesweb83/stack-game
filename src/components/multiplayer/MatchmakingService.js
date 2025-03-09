import { ref, onValue, set, remove, get, child, update, push, serverTimestamp, runTransaction } from 'firebase/database';
import { realtimeDB } from '../../firebase';

// Firebase Realtime Database 관련 코드
console.log('Using Realtime Database from firebase.js:', realtimeDB);

// 매칭 대기열에 플레이어 추가
export const joinMatchmaking = async (playerId) => {
  if (!realtimeDB) return { success: false, error: 'Database not initialized' };
  
  try {
    // 현재 타임스탬프 생성
    const timestamp = Date.now();
    const queueRef = ref(realtimeDB, `matchmaking/queue/${playerId}`);
    
    // 대기열에 플레이어 추가
    await set(queueRef, {
      id: playerId,
      joinedAt: timestamp,
      status: 'waiting'
    });
    
    console.log(`Player ${playerId} added to matchmaking queue`);
    return { success: true, timestamp };
  } catch (error) {
    console.error('Error joining matchmaking:', error);
    return { success: false, error: error.message };
  }
};

// 매칭 대기열에서 플레이어 제거
export const leaveMatchmaking = async (playerId) => {
  if (!realtimeDB) return { success: false, error: 'Database not initialized' };
  
  try {
    const queueRef = ref(realtimeDB, `matchmaking/queue/${playerId}`);
    await remove(queueRef);
    
    console.log(`Player ${playerId} removed from matchmaking queue`);
    return { success: true };
  } catch (error) {
    console.error('Error leaving matchmaking:', error);
    return { success: false, error: error.message };
  }
};

// 매칭 대기열 및 게임 상태 변화 감시
export const subscribeToMatchmaking = (playerId, onMatchFound, onWaiting) => {
  if (!realtimeDB) return () => {};
  
  console.log(`Setting up matchmaking subscription for player ${playerId}`);
  
  // 구독 해제 함수들을 저장할 배열
  const unsubscribeFunctions = [];
  
  // 플레이어의 게임 매칭 상태 확인
  const playerMatchRef = ref(realtimeDB, `matchmaking/queue/${playerId}`);
  const playerUnsubscribe = onValue(playerMatchRef, async (snapshot) => {
    const playerData = snapshot.val();
    
    // 플레이어가 대기열에 있는지 확인
    if (!playerData) {
      console.log('Player not in queue or removed from queue');
      return;
    }
    
    // 플레이어가 매칭 상태이면
    if (playerData.status === 'matched' && playerData.gameId) {
      console.log(`Match found! Game ID: ${playerData.gameId}`);
      
      // 게임 데이터 구독
      const gameRef = ref(realtimeDB, `games/${playerData.gameId}`);
      const gameUnsubscribe = onValue(gameRef, (gameSnapshot) => {
        const gameData = gameSnapshot.val();
        if (gameData) {
          // 매칭 성공 콜백 호출
          onMatchFound(gameData);
        }
      });
      
      // 게임 리스너 구독 해제 함수 저장
      unsubscribeFunctions.push(gameUnsubscribe);
    } else if (playerData.status === 'waiting') {
      console.log('Player is waiting for a match');
      
      // 대기 중인 다른 플레이어 찾기
      const queueRef = ref(realtimeDB, 'matchmaking/queue');
      const queueSnapshot = await get(queueRef);
      const queueData = queueSnapshot.val() || {};
      
      // 대기 중인 플레이어 목록
      const waitingPlayers = Object.entries(queueData)
        .filter(([id, data]) => 
          id !== playerId && 
          data.status === 'waiting' && 
          data.joinedAt < playerData.joinedAt // 먼저 대기한 플레이어만
        )
        .sort((a, b) => a[1].joinedAt - b[1].joinedAt);
      
      // 매칭 가능한 플레이어가 있으면 게임 생성
      if (waitingPlayers.length > 0) {
        const [opponentId, opponentData] = waitingPlayers[0];
        console.log(`Found potential match with player ${opponentId}`);
        
        // 게임 ID 생성
        const gameId = push(ref(realtimeDB, 'games')).key;
        
        try {
          // 트랜잭션으로 안전하게 매칭 처리
          const queueRef = ref(realtimeDB, 'matchmaking/queue');
          await runTransaction(queueRef, (currentData) => {
            // 현재 데이터 확인
            if (!currentData) return null;
            
            // 상대방이 여전히 대기 중인지 확인
            const opponent = currentData[opponentId];
            if (!opponent || opponent.status !== 'waiting') {
              // 이미 매칭됐거나 오래된 정보면 트랜잭션 중단
              return;
            }
            
            // 자신이 여전히 대기 중인지 확인
            const self = currentData[playerId];
            if (!self || self.status !== 'waiting') {
              // 자신의 상태가 변경됐으면 트랜잭션 중단
              return;
            }
            
            // 안전하게 매칭 정보 업데이트
            currentData[playerId].status = 'matched';
            currentData[playerId].gameId = gameId;
            currentData[opponentId].status = 'matched';
            currentData[opponentId].gameId = gameId;
            
            return currentData;
          });
          
          // 게임 데이터 생성
          const gameData = {
            id: gameId,
            createdAt: serverTimestamp(),
            status: 'active',
            players: {
              [playerId]: {
                id: playerId,
                status: 'joined',
                joinedAt: serverTimestamp(),
                score: 0
              },
              [opponentId]: {
                id: opponentId,
                status: 'joined',
                joinedAt: serverTimestamp(),
                score: 0
              }
            }
          };
          
          // 게임 데이터 저장
          await set(ref(realtimeDB, `games/${gameId}`), gameData);
          console.log(`Match created with game ID: ${gameId}`);
          
        } catch (error) {
          console.error('Error creating match:', error);
          // 에러 발생 시 대기 상태 유지
          onWaiting();
        }
      } else {
        // 매칭 대기 중 콜백 호출
        onWaiting();
      }
    }
  });
  
  // 플레이어 매칭 리스너 구독 해제 함수 저장
  unsubscribeFunctions.push(playerUnsubscribe);
  
  // 모든 리스너를 정리하는 함수 반환
  return () => {
    unsubscribeFunctions.forEach(unsubscribe => unsubscribe());
  };
};

// 게임 상태 업데이트
export const updateGameStatus = async (gameId, playerId, data) => {
  if (!realtimeDB) return { success: false, error: 'Database not initialized' };
  
  try {
    const updates = {};
    for (const [key, value] of Object.entries(data)) {
      updates[`games/${gameId}/players/${playerId}/${key}`] = value;
    }
    
    await update(ref(realtimeDB), updates);
    return { success: true };
  } catch (error) {
    console.error('Error updating game status:', error);
    return { success: false, error: error.message };
  }
}; 