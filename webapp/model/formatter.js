sap.ui.define([], function () {
    "use strict";

    return {

        /**
         * 결재상태 코드를 한글 텍스트로 변환한다.
         * ObjectStatus의 text 속성에 사용한다.
         *   REQ → 상신중
         *   APR → 승인
         *   REJ → 반려
         *   공백/null/undefined → 미상신
         */
        apvStatusText: function (sStatus) {
            switch (sStatus) {
                case "REQ": return "상신중";
                case "APR": return "승인";
                case "REJ": return "반려";
                default:    return "미상신";
            }
        },

        /**
         * 결재상태 코드를 ObjectStatus의 state(색상)로 변환한다.
         *   REQ → Warning  (노란색)
         *   APR → Success  (초록색)
         *   REJ → Error    (빨간색)
         *   공백/null → None (기본색)
         */
        apvStatusState: function (sStatus) {
            switch (sStatus) {
                case "REQ": return "Warning";
                case "APR": return "Success";
                case "REJ": return "Error";
                default:    return "None";
            }
        },

        /**
         * 결재상태가 REQ(상신중)인지 여부를 반환한다.
         * Detail 화면의 승인/반려 버튼 enabled 속성에 사용한다.
         * REQ일 때만 true → 버튼 활성화
         * 그 외에는 false → 버튼 비활성화
         */
        isReq: function (sStatus) {
            return sStatus === "REQ";
        },

        /**
         * 마감여부 코드를 한글 텍스트로 변환한다.
         * 은행 Dialog의 CloseYn 컬럼에 사용한다.
         *   X     → 마감
         *   공백  → 미마감
         */
        closeYnText: function (sCloseYn) {
            return sCloseYn === "X" ? "마감" : "미마감";
        },

        /**
         * 마감여부 코드를 ObjectStatus의 state(색상)로 변환한다.
         *   X     → Error   (빨간색 - 선택 불가)
         *   공백  → Success (초록색 - 선택 가능)
         */
        closeYnState: function (sCloseYn) {
            return sCloseYn === "X" ? "Error" : "Success";
        },

        /**
         * 마감여부가 X가 아닌 경우 은행 선택이 가능하다.
         * true: 선택 가능 / false: 선택 불가
         */
        canSelectBank: function (sCloseYn) {
            return sCloseYn !== "X";
        },

        /**
         * 가용잔액(AvailableAmt)과 지급대상금액(Wrbtr)을 비교해서
         * ObjectNumber 또는 ObjectStatus의 state를 반환한다.
         *   가용잔액 < 지급대상금액 → Warning (노란색 경고)
         *   그 외                  → Success (초록색)
         */
        amountStateByAvailable: function (vAvailable, vPayAmount) {
            var fAvailable = Number(vAvailable) || 0;
            var fPayAmount = Number(vPayAmount) || 0;

            if (fAvailable < fPayAmount) {
                return "Warning";
            }
            return "Success";
        },
        bankAvailableState: function (vAvailable, sCloseYn, vPayAmount) {
            if (sCloseYn === "X") {
                return "Error";
            }

            if ((Number(vAvailable) || 0) < (Number(vPayAmount) || 0)) {
                return "Warning";
            }

            return "Success";
        }

    };
});
