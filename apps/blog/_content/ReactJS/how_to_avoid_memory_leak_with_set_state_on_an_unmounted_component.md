---
title: '如何避免 unmounted component 因非同步執行 setState 導致的 memory leak'
subtitle: 'How to avoid memory leak with setState on an unmounted component'
date: 2021-09-08 17:50:00
category: 'ReactJS'
---

# A. 問題現象

假設於元件中實作了非同步的操作，當元件在 async promise 執行 resolve / reject 前就已經被卸載掉（unmounted），而這樣的 function call 依然會繼續的執行 async action 後的 setState 方法，因此導致 memory leak。（這是真的 memory leak，可透過 chrome devtool 的 profiling tool，take heap snapshot 中可以分析）

<aside>
💡 javascript 是 single-thread base 的，因此我們無法停止（取消）async function 的執行。因此如果講到 promise cancelling，通常講的會是忽略 async function 執行後的結果以及避免影響運行。

</aside>

# B. 如何避免?

<aside>
💡 官方建議：
[https://reactjs.org/docs/hooks-effect.html#effects-with-cleanup](https://reactjs.org/docs/hooks-effect.html#effects-with-cleanup)

hooks 看這邊：
[https://reactjs.org/docs/hooks-effect.html#example-using-hooks-1](https://reactjs.org/docs/hooks-effect.html#example-using-hooks-1)

</aside>

## 1. 從元件的結構切分上劃分明確的職責

---

統一由 container component 來管理 async action，並確保 container component 不會重複 re-render or re-mount，可以避免 component 不會不預警的在 promise 返回前就被觸發 unmount (或者說是整個元件的 re-render)

- 優點：程式碼職責清晰，對生命週期的控制十分完整。
- 缺點：實作上相對有難度，如果是擴充元件功能，可能無法避免的可能要進行重構來掌握流程 ⇒ 難度高。
    
    

## 2. 在元件、hooks 中加入 `isMounted` 的狀態來管理

---

```jsx
function MyComponent() {
    const [loading, setLoading] = useState(false);
    const [someData, setSomeData] = useState({});
    let isMounted = true; 
  
    useEffect(() => {
        const someResponse = await fetchSomeData();
        if (isMounted){
            setSomeData(someResponse);
        }
        return () => {
            isMounted = false;
        }
    }, []);
    return (
        <div>
            {someData}
        </div>
    );
}
```

- 優點：容易實作、沒有需要引用第三方套件
- 缺點：[反模式](https://reactjs.org/blog/2015/12/16/ismounted-antipattern.html)、每個元件、hooks 都需要重複處理類似邏輯

## 3. 自建 promise cancelling function（[ref](https://github.com/facebook/react/issues/5465#issuecomment-157888325)）

---

```jsx
const makeCancelable = (promise) => {
  let hasCanceled_ = false;

  const wrappedPromise = new Promise((resolve, reject) => {
    promise.then((val) =>
      hasCanceled_ ? reject({isCanceled: true}) : resolve(val)
    );
    promise.catch((error) =>
      hasCanceled_ ? reject({isCanceled: true}) : reject(error)
    );
  });

  return {
    promise: wrappedPromise,
    cancel() {
      hasCanceled_ = true;
    },
  };
};

// usage
const somePromise = new Promise(r => setTimeout(r, 1000));
const cancelable = makeCancelable(somePromise);

cancelable
  .promise
  .then(() => console.log('resolved'))
  .catch(({isCanceled, ...error}) => console.log('isCanceled', isCanceled));

// Cancel promise
cancelable.cancel();
```

- 優點：容易實作、沒有需要引用第三方套件，可複用於 react 以外
- 缺點：promise 外部還要多做一層 wrapper，看起來很不直觀，不容易使用

## 4. 引用 react-use（[useMountedState](https://github.com/streamich/react-use/blob/master/docs/useMountedState.md) 、 [useUnmountPromise](https://github.com/streamich/react-use/blob/master/docs/useUnmountPromise.md)）

---

```jsx
import * as React from 'react';
import {useMountedState} from 'react-use';

const Demo = () => {
  const isMounted = useMountedState();

  React.useEffect(() => {
    setTimeout(() => {
      if (isMounted()) {
        // ...
      } else {
        // ...
      }
    }, 1000);
  });
};
```

```jsx
import useUnmountPromise from 'react-use/lib/useUnmountPromise';

const Demo = () => {
  const mounted = useUnmountPromise();
  useEffect(async () => {
    await mounted(someFunction()); // Will not resolve if component un-mounts.
  });
};
```

- 優點：實作容易、廣泛被應用的 library
- 缺點：外部依賴

## 5. 建立 custom hook 解決 hook 使用上的問題（參考 react-use ）

---

### useMountedState hook

- hook：

```tsx
const useMountedState = (): () => boolean => {
    const mountRef = useRef<boolean>(false);
    useEffect(() => {
        mountedRef.current = true;

        return () => {
            mountRef.current = false;
        };
    });

    return useCallback(() => mountRef.current, []);
};

export default useMountedState;
```

- usage：

```tsx
import useMountedState from './useMountedState';
import React, { useCallback, useState } from 'react';

export default () => {
  const isMounted = useMountedState();
  const [state, setState] = useState(null);

  const ajaxFetch = useCallback(async () => {
    const result = await fetchSomeData();
    if (isMounted()) {
      setState(result);
    }
  });

  return (
    // ...
  );
};
```

### useCancelablePromise hook

- hook：
    
    ```jsx
    import useMountedState from './useMountedState';
    import { useCallback } from 'react';
    
    const useCancelablePromise = () => {
        const isMounted = useMountedState();
        return useCallback((promise, onCancel) => new Promise((resolve, reject) => {
            promise
                .then((result) => {
                    if (isMounted()) {
                        resolve(result);
                    }
                })
                .catch((error) => {
                    if (isMounted()) {
                        reject(error);
                    }
                })
                .finally(() => {
                    if (!isMounted() && onCancel) {
                        onCancel();
                    }
                });
        }),
            [isMounted],
        );
    };
    
    export default useCancelablePromise;
    ```
    
- usage：
    
    ```jsx
    import useCancelablePromise from './useCancelablePromise';
    import fetchSomeData from './fetchSomeData';
    import React, { useCallback, useState } from 'react';
    
    export default () => {
        const makeCancelable = useCancelablePromise();
        const [state, setState] = useState(null);
    
        const ajaxFetch = useCallback(async () => {
            const result = await makeCancelable(
                fetchSomeData(),
                () => { console.log("canceled") }
            );
            setState(result);
        }, [makeCancelable]);
    
        return (
        // ...
      );
    };
    ```
    
- 優點：重用性高且容易使用，不需要第三方依賴
- 缺點：需要判別使用情境，以及對於 hook 內部的實作需要花時間理解

# C. 追加說明（透過 AbortController 取消 api 執行）

參考文章

[Using AbortController (with React Hooks and TypeScript) to cancel window.fetch requests](https://dev.to/bil/using-abortcontroller-with-react-hooks-and-typescript-to-cancel-window-fetch-requests-1md4)

- 優點：透過原生 fetch api 取消不必要的 api request，減少請求的連線與不必要的等待時間
- 缺點：瀏覽器支援度問題
- 可參考 library：
    
    [GitHub - jomaxx/make-abortable](https://github.com/jomaxx/make-abortable)