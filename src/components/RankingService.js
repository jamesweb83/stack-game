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
    console.error('Firebase DB가 초기화되지 않았습니다.');
    throw new Error('Firebase DB가 초기화되지 않았습니다.');
  }
  return collection(db, 'rankings');
};

// 랭킹 저장하기 (새 점수 또는 기존 점수 업데이트)
export const saveRanking = async (playerId, score) => {
  try {
    console.log(`saveRanking 함수 호출됨 - 플레이어 ID: ${playerId}, 점수: ${score}`);
    console.log('Firebase DB 연결 상태:', !!db);
    console.log('Firebase 초기화 상태:', initialized);
    
    if (!initialized || !db) {
      console.error('Firebase DB가 초기화되지 않았습니다.');
      throw new Error('Firebase DB가 초기화되지 않았습니다.');
    }
    
    // 랭킹 컬렉션 참조 가져오기
    let rankingsRefCheck;
    try {
      rankingsRefCheck = getRankingsRef();
      console.log('랭킹 컬렉션 참조 생성됨');
    } catch (refError) {
      console.error('랭킹 컬렉션 참조 생성 실패:', refError);
      throw refError;
    }
    
    // 기존 플레이어 찾기
    let playerQuery;
    try {
      playerQuery = query(rankingsRefCheck, where("playerId", "==", playerId));
      console.log('플레이어 쿼리 생성됨');
    } catch (queryBuildError) {
      console.error('플레이어 쿼리 생성 실패:', queryBuildError);
      throw queryBuildError;
    }
    
    let querySnapshot;
    try {
      querySnapshot = await getDocs(playerQuery);
      console.log('쿼리 실행 완료, 결과:', querySnapshot.empty ? '플레이어 없음' : '플레이어 있음');
    } catch (queryExecuteError) {
      console.error('쿼리 실행 실패:', queryExecuteError);
      throw queryExecuteError;
    }
    
    // 플레이어가 이미 있는지 확인
    if (!querySnapshot.empty) {
      try {
        const playerDoc = querySnapshot.docs[0];
        const playerData = playerDoc.data();
        
        console.log('기존 플레이어 데이터:', playerData);
        console.log('기존 점수:', playerData.score, '새 점수:', score);
        
        // 기존 점수보다 높은 경우에만 업데이트
        if (score > playerData.score) {
          console.log('새 점수가 더 높음, 업데이트 시도...');
          await updateDoc(doc(db, 'rankings', playerDoc.id), {
            score: score,
            updatedAt: serverTimestamp()
          });
          console.log('업데이트 성공!');
          return { updated: true, newHighScore: true };
        }
        
        console.log('기존 점수가 더 높음, 업데이트하지 않음');
        return { updated: false, newHighScore: false };
      } catch (updateError) {
        console.error('기록 업데이트 실패:', updateError);
        throw updateError;
      }
    } 
    // 새 플레이어 추가
    else {
      try {
        console.log('새 플레이어, 추가 시도...');
        const newDoc = await addDoc(rankingsRefCheck, {
          playerId: playerId,
          score: score,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        console.log('새 플레이어 추가 성공! 문서 ID:', newDoc.id);
        return { updated: true, newRecord: true };
      } catch (addError) {
        console.error('새 플레이어 추가 실패:', addError);
        throw addError;
      }
    }
  } catch (error) {
    console.error("랭킹 저장 중 오류 발생:", error);
    console.error("오류 세부 정보:", error.message);
    console.error("오류 스택:", error.stack);
    throw error;
  }
};

// 랭킹 목록 가져오기
export const getRankings = async (limitCount = 30) => {
  try {
    console.log('getRankings 함수 호출됨, 제한 수:', limitCount);
    
    if (!initialized || !db) {
      console.error('Firebase DB가 초기화되지 않았습니다.');
      return [];
    }
    
    const rankingsRefCheck = getRankingsRef();
    
    const rankingsQuery = query(
      rankingsRefCheck,
      orderBy("score", "desc"),
      limit(limitCount)
    );
    
    console.log('랭킹 쿼리 생성됨, 데이터 가져오기 시도...');
    const querySnapshot = await getDocs(rankingsQuery);
    console.log(`랭킹 데이터 ${querySnapshot.size}개 가져옴`);
    
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
    console.error("오류 세부 정보:", error.message);
    return [];
  }
};

// 플레이어의 랭킹 순위 가져오기
export const getPlayerRank = async (playerId) => {
  try {
    console.log(`getPlayerRank 함수 호출됨 - 플레이어 ID: ${playerId}`);
    
    if (!initialized || !db) {
      console.error('Firebase DB가 초기화되지 않았습니다.');
      return null;
    }
    
    const rankings = await getRankings(100); // 충분히 많은 랭킹을 가져옴
    console.log(`총 ${rankings.length}개의 랭킹 데이터를 가져옴`);
    
    const playerIndex = rankings.findIndex(rank => rank.id === playerId);
    console.log(`플레이어 인덱스: ${playerIndex}`);
    
    if (playerIndex !== -1) {
      const rankInfo = {
        rank: playerIndex + 1,
        total: rankings.length
      };
      console.log(`플레이어 순위 정보:`, rankInfo);
      return rankInfo;
    }
    console.log('플레이어를 랭킹에서 찾을 수 없음');
    return null;
  } catch (error) {
    console.error("플레이어 랭킹 가져오기 중 오류 발생:", error);
    console.error("오류 세부 정보:", error.message);
    return null;
  }
};