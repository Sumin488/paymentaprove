# sapui5-payment-approval

> SAPUI5 기반 지급결재 승인/반려 및 안면인식 검증 화면

지급결재 데이터를 조회하고, 승인/반려 처리를 수행하는 Fiori 스타일의 SAPUI5 애플리케이션입니다.  
결재 상태별 상세 화면, 계좌 검토, 지급 정보 확인, 안면인식 기반 검증 흐름을 구현했습니다.

<br/>

## Tech Stack

| Area | Skills |
|---|---|
| Frontend | SAPUI5, XML View, Controller, Fragment |
| Model | JSONModel, ODataModel |
| UI | FilterBar, Table, Dialog, Toolbar, Object Page Layout |
| Integration | SAP Gateway OData |
| Additional | JavaScript, Face Recognition Library |

<br/>

## Main Features

- 지급결재 목록 조회
- 결재 상태별 필터링
- 승인/반려 상세 화면 구성
- 계좌 검토 및 지급 정보 확인
- 승인/반려 사유 표시
- Dialog 기반 계좌 선택 화면 구현
- 승인 전 안면인식 검증 흐름 적용
- OData Service 기반 결재 데이터 연동

<br/>

## Process Flow

```text
결재 목록 조회
        ↓
상태 / 조건 기준 필터링
        ↓
결재 건 선택
        ↓
상세 정보 및 계좌 정보 확인
        ↓
승인 또는 반려 처리
        ↓
승인 시 안면인식 검증
        ↓
OData Service를 통한 처리 결과 저장
```

<br/>

## My Role

- SAPUI5 결재 화면 전체 구조 구현
- XML View 및 Controller 이벤트 처리 작성
- 승인/반려 상태별 상세 화면 분기 처리
- 계좌 선택 Dialog 및 Table UI 구현
- ODataModel 기반 Backend Service 연동
- 안면인식 검증 흐름을 결재 저장 로직에 적용

<br/>

## What I Learned

- SAPUI5에서 상태값에 따라 화면을 다르게 구성하는 방법 학습
- ODataModel을 활용한 SAP Backend 연동 경험
- 결재 업무에서 사용자 확인, 검토, 저장 흐름을 화면으로 표현하는 방식 이해
- SAPUI5 Controller 이벤트와 Dialog 제어 경험 향상
