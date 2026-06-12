sap.ui.define([
    "sap/ui/core/mvc/Controller"
], function (Controller) {
    "use strict";

    return Controller.extend("code.t1.paymentaprove.controller.NotFound", {

        onInit: function () {
            // NotFound 화면 초기화 (특별한 로직 없음)
        },

        onNavBack: function () {
            // 뒤로 가기 버튼을 눌렀을 때 메인 목록 화면으로 이동한다.
            // true: history를 replace해서 뒤로 가기 루프를 방지한다.
            this.getOwnerComponent().getRouter().navTo("RouteMain", {}, true);
        }
    });
});
