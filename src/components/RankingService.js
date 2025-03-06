// src/components/RankingService.js
import { db } from '../firebase';
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
const rankingsRef = collection(db, 'rankings');

// 랭킹 저장하기 (새 점수 또는 기존 점수 업데이트)
export const saveRanking = async (playerId, score) => {
  try {
    // 기존 플레이어 찾기
    const playerQuery = query(rankingsRef, where("playerId", "==", playerId));
    const querySnapshot = await getDocs(playerQuery);
    
    // 플레이어가 이미 있는지 확인
    if (!querySnapshot.empty) {
      const playerDoc = querySnapshot.docs[0];
      const playerData = playerDoc.data();
      
      // 기존 점수보다 높은 경우에만 업데이트
      if (score > playerData.score) {
        await updateDoc(doc(db, 'rankings', playerDoc.id), {
          score: score,
          updatedAt: serverTimestamp()
        });
        return { updated: true, newHighScore: true };
      }
      return { updated: false, newHighScore: false };
    } 
    // 새 플레이어 추가
    else {
      await addDoc(rankingsRef, {
        playerId: playerId,
        score: score,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      return { updated: true, newRecord: true };
    }
  } catch (error) {
    console.error("랭킹 저장 중 오류 발생:", error);
    throw error;
  }
};

// 랭킹 목록 가져오기
export const getRankings = async (limit = 30) => {
  try {
    const rankingsQuery = query(
      rankingsRef,
      orderBy("score", "desc"),
      limit(limit)
    );
    
    const querySnapshot = await getDocs(rankingsQuery);
    return querySnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: data.playerId,
        score: data.score,
        date: data.updatedAt ? data.updatedAt.toDate().toISOString() : new Date().toISOString()
      };
    });
  } catch (error) {
    console.error("랭킹 가져오기 중 오류 발생:", error);
    return [];
  }
};

// 플레이어의 랭킹 순위 가져오기
export const getPlayerRank = async (playerId) => {
  try {
    const rankings = await getRankings(100); // 충분히 많은 랭킹을 가져옴
    const playerIndex = rankings.findIndex(rank => rank.id === playerId);
    
    if (playerIndex !== -1) {
      return {
        rank: playerIndex + 1,
        total: rankings.length
      };
    }
    return null;
  } catch (error) {
    console.error("플레이어 랭킹 가져오기 중 오류 발생:", error);
    return null;
  }
};