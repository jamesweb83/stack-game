# Getting Started with Create React App

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

## Available Scripts

In the project directory, you can run:

### `npm start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in your browser.

The page will reload when you make changes.\
You may also see any lint errors in the console.

### `npm test`

Launches the test runner in the interactive watch mode.\
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `npm run build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

### `npm run eject`

**Note: this is a one-way operation. Once you `eject`, you can't go back!**

If you aren't satisfied with the build tool and configuration choices, you can `eject` at any time. This command will remove the single build dependency from your project.

Instead, it will copy all the configuration files and the transitive dependencies (webpack, Babel, ESLint, etc) right into your project so you have full control over them. All of the commands except `eject` will still work, but they will point to the copied scripts so you can tweak them. At this point you're on your own.

You don't have to ever use `eject`. The curated feature set is suitable for small and middle deployments, and you shouldn't feel obligated to use this feature. However we understand that this tool wouldn't be useful if you couldn't customize it when you are ready for it.

## Learn More

You can learn more in the [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started).

To learn React, check out the [React documentation](https://reactjs.org/).

### Code Splitting

This section has moved here: [https://facebook.github.io/create-react-app/docs/code-splitting](https://facebook.github.io/create-react-app/docs/code-splitting)

### Analyzing the Bundle Size

This section has moved here: [https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size](https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size)

### Making a Progressive Web App

This section has moved here: [https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app](https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app)

### Advanced Configuration

This section has moved here: [https://facebook.github.io/create-react-app/docs/advanced-configuration](https://facebook.github.io/create-react-app/docs/advanced-configuration)

### Deployment

This section has moved here: [https://facebook.github.io/create-react-app/docs/deployment](https://facebook.github.io/create-react-app/docs/deployment)

### `npm run build` fails to minify

This section has moved here: [https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify](https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify)

## Firebase 권한 문제 해결 방법

프로젝트에서 "Missing or insufficient permissions" 오류가 발생하는 경우 다음 단계를 따라 해결할 수 있습니다:

### 1. Firebase 콘솔에서 보안 규칙 수정

1. [Firebase 콘솔](https://console.firebase.google.com/)에 로그인합니다.
2. 프로젝트 "stack-game-rankings"를 선택합니다.
3. 왼쪽 메뉴에서 "Firestore Database"를 클릭합니다.
4. "Rules" 탭을 선택합니다.
5. 다음과 같이 규칙을 수정합니다:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // 개발 중에만 사용할 임시 규칙 (모든 읽기/쓰기 허용)
    match /{document=**} {
      allow read, write: if true;
    }
    
    // 프로덕션용 규칙 (나중에 적용)
    // match /rankings/{rankingId} {
    //   allow read: if true;  // 모든 사용자가 랭킹을 볼 수 있음
    //   allow write: if request.auth != null;  // 인증된 사용자만 쓰기 가능
    // }
    // match /test/{testId} {
    //   allow read, write: if true;  // 테스트 컬렉션은 모든 접근 허용
    // }
  }
}
```

6. "Publish" 버튼을 클릭하여 규칙을 저장합니다.

### 2. Firebase 프로젝트 설정 확인

1. Firebase 콘솔에서 프로젝트 설정이 올바른지 확인합니다.
2. 프로젝트 ID가 `stack-game-rankings`인지 확인합니다.
3. 웹 앱 설정에서 `firebaseConfig` 객체의 값이 `src/firebase.js` 파일의 값과 일치하는지 확인합니다.

### 3. 인증 설정 (필요한 경우)

프로덕션 환경에서는 인증을 구현하는 것이 좋습니다:

1. Firebase 콘솔에서 "Authentication"을 선택합니다.
2. "Get Started" 버튼을 클릭합니다.
3. 원하는 인증 방법(이메일/비밀번호, Google, 익명 등)을 활성화합니다.
4. 코드에 인증 로직을 추가합니다.

### 4. 네트워크 및 CORS 설정

1. Firebase 콘솔에서 "Firestore Database" > "Rules" 탭에서 "Allow all origins" 옵션이 활성화되어 있는지 확인합니다.
2. 개발 중인 경우 Firebase 에뮬레이터를 사용하는 것도 좋은 방법입니다.

### 5. 문제가 지속되는 경우

1. 브라우저 콘솔에서 자세한 오류 메시지를 확인합니다.
2. Firebase 프로젝트의 결제 상태를 확인합니다 (무료 할당량을 초과했을 수 있음).
3. Firebase 지원 문서를 참조하거나 Firebase 커뮤니티에 도움을 요청합니다.
#   s t a c k - g a m e 
 
 