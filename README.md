<div align="center">

# SAPUI5 지급결재 승인/반려 프로그램

<img src="./images/project-cover.png" width="850"/>

> 지급결재 데이터를 조회하고 계좌 검토, 승인/반려, 안면인식 검증 흐름을 제공하는 Fiori 스타일 화면

<br/>

<img src="https://img.shields.io/badge/SAPUI5-0FAAFF?style=for-the-badge&logo=sap&logoColor=white"/> <img src="https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black"/> <img src="https://img.shields.io/badge/OData-4B8BBE?style=for-the-badge"/>

</div>

---

## 1. 프로젝트 소개

지급결재 데이터를 조회하고 계좌 검토, 승인/반려, 안면인식 검증 흐름을 제공하는 Fiori 스타일 화면입니다.  
SAP ERP 업무 흐름에서 발생하는 데이터를 조회, 검증, 처리하고 사용자가 결과를 명확하게 확인할 수 있도록 구성했습니다.

- **담당 역할**: SAPUI5 화면 및 OData 연동 개발 담당
- **프로젝트 성격**: SAP 교육 프로젝트 / 포트폴리오 정리용
- **핵심 흐름**: 목록 조회 → 상세 확인 → 검증 → 처리 저장

---

## 2. 주요 기능

- FilterBar 기반 결재 데이터 검색
- 승인/반려/상신중 상태별 목록과 상세 화면 구성
- 계좌 검토 및 지급 정보 확인 Dialog 구현
- 승인 시 안면인식 검증 후 저장 처리
- 반려 사유 표시 및 상태별 UI 제어

---

## 3. 화면 구성

| 지급결재 목록 화면 | 승인/반려 상세 화면 |
|---|---|
| <img src="./images/screen-main.png" width="420"/> | <img src="./images/screen-detail.png" width="420"/> |

> 현재 이미지는 포트폴리오용 예시 이미지입니다. 실제 프로그램 캡처 화면이 있다면 같은 파일명으로 교체하면 README에 바로 반영됩니다.

---

## 4. 처리 흐름

<img src="./images/process-flow.png" width="850"/>

---

## 5. 프로젝트 구조

```text
webapp
├── controller
│   ├── Main.controller.js
│   └── Detail.controller.js
├── view
│   ├── Main.view.xml
│   └── Detail.view.xml
├── fragment
│   └── Dialog.fragment.xml
├── model
│   └── formatter.js
└── manifest.json
```

---

## 6. 기술 스택

| Area | Tech |
|---|---|
| Frontend | SAPUI5 XML View, Controller, Fragment, Dialog, Table |
| Model | JSONModel, ODataModel |
| Integration | SAP Gateway OData, Function Import |
| Language | JavaScript |
| Style | Fiori Style Layout, FilterBar, Responsive Table |

---

## 7. 핵심 구현 내용

### 데이터 조회 및 검증

- 업무 기준에 맞는 필수값을 검증합니다.
- Header/Item 또는 목록/상세 데이터를 분리하여 처리합니다.
- 조회 결과는 화면 표시용 데이터로 가공합니다.

### 사용자 화면 처리

- 목록 화면과 상세 화면을 분리해 사용자가 처리 단계를 이해하기 쉽게 구성했습니다.
- 상태값에 따라 버튼, 입력 필드, 메시지를 다르게 표시합니다.
- 처리 성공/실패 메시지를 명확하게 반환합니다.

### 저장 및 후속 처리

- 저장 전 업무 조건을 검증합니다.
- 처리 결과 번호와 메시지를 사용자에게 표시합니다.
- 오류 발생 시 원인을 확인할 수 있도록 메시지 구조를 구성했습니다.

---

## 8. 개발 중 해결한 문제

### 문제

승인/반려 상태에 따라 화면에 보여야 할 정보와 입력 가능 영역이 달라 사용자 혼동이 발생할 수 있었습니다.

### 해결

상태별 UI 제어 로직을 분리하고, 승인 화면과 반려 화면의 표시 정보를 다르게 구성했습니다.

---

## 9. Repository 정보

### Description

```text
SAPUI5 기반 지급결재 승인/반려 및 안면인식 검증 화면
```

### Topics

```text
sap sapui5 javascript odata fiori approval payment face-recognition frontend gateway
```

---

## 10. 이미지 교체 방법

실제 화면 캡처를 추가할 때는 아래 파일명으로 이미지를 교체하면 됩니다.

```text
images/project-cover.png   # 상단 대표 이미지
images/screen-main.png     # 메인 화면 캡처
images/screen-detail.png   # 상세/처리 화면 캡처
images/process-flow.png    # 처리 흐름 이미지
```

---

## 11. 회고

이 프로젝트를 통해 단순 화면 구현보다 SAP 업무 데이터가 어떤 기준으로 생성되고 후속 처리되는지 이해하는 것이 중요하다는 점을 학습했습니다.  
특히 조회, 검증, 저장, 메시지 처리 흐름을 분리하면서 유지보수 가능한 SAP 프로그램 구조를 고민했습니다.
