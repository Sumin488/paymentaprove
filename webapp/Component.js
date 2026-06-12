sap.ui.define([
    "sap/ui/core/UIComponent",
    "code/t1/paymentaprove/model/models"
], function (UIComponent, models) {
    "use strict";

    return UIComponent.extend("code.t1.paymentaprove.Component", {

        metadata: {
            manifest: "json",
            interfaces: [
                "sap.ui.core.IAsyncContentCreation"
            ]
        },

        init: function () {
            // 부모 클래스의 init을 먼저 호출한다.
            // manifest.json의 모델, 라우팅 등 기본 설정이 이 시점에 초기화된다.
            UIComponent.prototype.init.apply(this, arguments);

            this.setModel(models.createDeviceModel(), "device");
            this.setModel(models.createCommentsModel(), "productFeedback");

            this.getRouter().initialize();
        }
    });
});
