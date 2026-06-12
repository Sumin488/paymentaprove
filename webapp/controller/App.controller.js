sap.ui.define([
    "sap/ui/core/mvc/Controller"
], function (Controller) {
    "use strict";

    return Controller.extend("code.t1.paymentaprove.controller.App", {

        onInit: function () {
            // App.view.xml은 sap.m.App을 담는 Root View 역할만 한다.
            // 화면 전환은 라우터가 처리하므로 여기에 별도 로직은 없다.
        }
    });
});
