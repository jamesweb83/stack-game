// src/components/RankingService.js
import { db, initialized } from '../firebase';
import { 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  orderBy, 
  limit, 
  where,
  serverTimestamp,
  updateDoc,
  doc,
  getDoc
} from 'firebase/firestore';

// 랭킹 컬렉션 참조
const getRankingsRef = () => {
  if (!db) {
    console.error('Firebase DB is not initialized.');
    throw new Error('Firebase DB is not initialized.');
  }
  return collection(db, 'rankings');
};

// 랭킹 저장하기 (새 점수 또는 기존 점수 업데이트)
export const saveRanking = async (playerId, score) => {
  try {
    console.log(`saveRanking function called - Player ID: ${playerId}, Score: ${score}`);
    console.log('Firebase DB connection status:', !!db);
    console.log('Firebase initialization status:', initialized);
    
    if (!initialized || !db) {
      console.error('Firebase DB is not initialized.');
      throw new Error('Firebase DB is not initialized.');
    }
    
    // 랭킹 컬렉션 참조 가져오기
    let rankingsRefCheck;
    try {
      rankingsRefCheck = getRankingsRef();
      console.log('Ranking collection reference created');
    } catch (refError) {
      console.error('Failed to create ranking collection reference:', refError);
      throw refError;
    }
    
    // 기존 플레이어 찾기
    let playerQuery;
    try {
      playerQuery = query(rankingsRefCheck, where("playerId", "==", playerId));
      console.log('Player query created');
    } catch (queryBuildError) {
      console.error('Failed to create player query:', queryBuildError);
      throw queryBuildError;
    }
    
    let querySnapshot;
    try {
      querySnapshot = await getDocs(playerQuery);
      console.log('Query execution completed, result:', querySnapshot.empty ? 'Player not found' : 'Player found');
    } catch (queryExecuteError) {
      console.error('Query execution failed:', queryExecuteError);
      throw queryExecuteError;
    }
    
    // 플레이어가 이미 있는지 확인
    if (!querySnapshot.empty) {
      try {
        const playerDoc = querySnapshot.docs[0];
        const playerData = playerDoc.data();
        
        console.log('Existing player data:', playerData);
        console.log('Existing score:', playerData.score, 'New score:', score);
        
        // 기존 점수보다 높은 경우에만 업데이트
        if (score > playerData.score) {
          console.log('New score is higher, attempting update...');
          await updateDoc(doc(db, 'rankings', playerDoc.id), {
            score: score,
            updatedAt: serverTimestamp()
          });
          console.log('Update successful!');
          return { updated: true, newHighScore: true };
        }
        
        console.log('Existing score is higher, no update needed');
        return { updated: false, newHighScore: false };
      } catch (updateError) {
        console.error('Failed to update record:', updateError);
        throw updateError;
      }
    } 
    // 새 플레이어 추가
    else {
      try {
        console.log('New player, attempting to add...');
        const newDoc = await addDoc(rankingsRefCheck, {
          playerId: playerId,
          score: score,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        console.log('New player added successfully! Document ID:', newDoc.id);
        return { updated: true, newRecord: true };
      } catch (addError) {
        console.error('Failed to add new player:', addError);
        throw addError;
      }
    }
  } catch (error) {
    console.error("Error while saving ranking:", error);
    console.error("Error details:", error.message);
    console.error("Error stack:", error.stack);
    throw error;
  }
};

// 랭킹 목록 가져오기
export const getRankings = async (limitCount = 30) => {
  try {
    console.log('getRankings function called, limit count:', limitCount);
    
    if (!initialized || !db) {
      console.error('Firebase DB is not initialized.');
      return [];
    }
    
    const rankingsRefCheck = getRankingsRef();
    
    const rankingsQuery = query(
      rankingsRefCheck,
      orderBy("score", "desc"),
      limit(limitCount)
    );
    
    console.log('Ranking query created, attempting to fetch data...');
    const querySnapshot = await getDocs(rankingsQuery);
    console.log(`Retrieved ${querySnapshot.size} ranking records`);
    
    return querySnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: data.playerId,
        score: data.score,
        date: data.updatedAt ? data.updatedAt.toDate().toISOString() : new Date().toISOString()
      };
    });
  } catch (error) {
    console.error("Error while retrieving rankings:", error);
    console.error("Error details:", error.message);
    return [];
  }
};

// 플레이어의 랭킹 순위 가져오기
export const getPlayerRank = async (playerId) => {
  try {
    console.log(`getPlayerRank function called - Player ID: ${playerId}`);
    
    if (!initialized || !db) {
      console.error('Firebase DB is not initialized.');
      return null;
    }
    
    const rankings = await getRankings(100); // 충분히 많은 랭킹을 가져옴
    console.log(`Retrieved ${rankings.length} ranking records in total`);
    
    const playerIndex = rankings.findIndex(rank => rank.id === playerId);
    console.log(`Player index: ${playerIndex}`);
    
    if (playerIndex !== -1) {
      const rankInfo = {
        rank: playerIndex + 1,
        total: 30 // 항상 30으로 고정
      };
      console.log(`Player ranking info:`, rankInfo);
      return rankInfo;
    }
    console.log('Player not found in rankings');
    return null;
  } catch (error) {
    console.error("Error while retrieving player ranking:", error);
    console.error("Error details:", error.message);
    return null;
  }
};