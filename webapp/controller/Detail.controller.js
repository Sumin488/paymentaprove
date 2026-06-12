sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/ui/model/Sorter",
    "sap/ui/core/routing/History",
    "sap/m/MessageBox",
    "sap/m/MessageToast",
    "sap/ui/dom/includeScript",
    "../model/formatter"
], function (
    Controller,
    JSONModel,
    Filter,
    FilterOperator,
    Sorter,
    History,
    MessageBox,
    MessageToast,
    includeScript,
    formatter
) {
    "use strict";

    return Controller.extend("code.t1.paymentaprove.controller.Detail", {

        formatter: formatter,

        onInit: function () {
            this._oRouter = this.getOwnerComponent().getRouter();

            this.getView().setModel(
                new JSONModel(this._getInitialDetailViewData()),
                "detailView"
            );

            this.getView().setModel(
                new JSONModel(this._getInitialFaceAuthData()),
                "faceAuth"
            );

            this._oFaceStream = null;
            this._bFaceApiLoaded = false;
            this._bFaceModelsLoaded = false;
            this._pFaceApproveDialog = null;
            this._oFaceApproveDialog = null;
            this._sPendingApproveBankId = "";

            /*
             * manifest.json에 등록한 얼굴 등록 OData Model
             * model name: ZGWD1CM0001_SRV
             */
            this._oFaceODataModel = this.getOwnerComponent().getModel("ZGWD1CM0001_SRV");

            this._oRouter
                .getRoute("RouteDetail")
                .attachPatternMatched(this._onObjectMatched, this);
        },

        _getInitialDetailViewData: function () {
            return {
                SelectedBankId: "",
                SelectedBankNm: "",
                SelectedAccount: "",
                SelectedWaers: "",
                SelectedBalanceAmt: 0,
                SelectedPlanOutAmt: 0,
                SelectedAvailableAmt: 0,
                PayAmount: 0,

                SelectedBankDisplayTitle: "미선택",
                SelectedBankDisplayText: "계좌 선택 필요",
                SelectedBankShortText: "계좌 미선택",

                AvailableText: "상세 정보를 조회하고 있습니다.",
                AvailableState: "None",

                ApprovalPossibleText: "승인 불가",
                ApprovalPossibleState: "None",

                FooterText: "승인 조건 확인 필요",
                FooterState: "Warning",

                IsRequest: false,
                IsApproved: false,
                IsRejected: false,
                ShowPaymentReview: false,
                CanSelectBank: false,
                CanReject: false,
                CanApprove: false,

                RejectReason: "",
                RejectDialogReason: "",
                BankInfoBusy: false
            };
        },

        _getInitialFaceAuthData: function () {
            return {
                ApvNo: "",
                ExpectedUserId: "",
                StatusText: "안면 인증을 준비하고 있습니다.",
                StatusState: "None",
                DistanceText: "-",
                DistanceState: "None",
                Busy: false,
                Saving: false,
                Threshold: 0.42
            };
        },

        _onObjectMatched: function (oEvent) {
            var oArgs = oEvent.getParameter("arguments");

            this._sApvNo = decodeURIComponent(oArgs.ApvNo || "");
            this._sBukrs = decodeURIComponent(oArgs.Bukrs || "");
            this._sBelnr = decodeURIComponent(oArgs.Belnr || "");
            this._sGjahr = decodeURIComponent(oArgs.Gjahr || "");
            this._sBuzei = decodeURIComponent(oArgs.Buzei || "");

            this._resetDetailViewState();
            this._resetFaceAuthState();
            this._bindDetailData();
        },

        _bindDetailData: function () {
            var oView = this.getView();
            var oModel = oView.getModel();

            if (
                !this._sApvNo ||
                !this._sBukrs ||
                !this._sBelnr ||
                !this._sGjahr ||
                !this._sBuzei
            ) {
                MessageBox.error("상세 조회 Key 값이 누락되었습니다.");
                return;
            }

            oView.unbindElement();

            oModel.metadataLoaded().then(function () {
                var sKey = oModel.createKey("PayApvDetailSet", {
                    ApvNo: this._sApvNo,
                    Bukrs: this._sBukrs,
                    Belnr: this._sBelnr,
                    Gjahr: this._sGjahr,
                    Buzei: this._sBuzei
                });

                oView.bindElement({
                    path: "/" + sKey,

                    events: {
                        change: function () {
                            this._applyCurrentDetailContext();
                        }.bind(this),

                        dataReceived: function (oEvent) {
                            var oError = oEvent.getParameter("error");

                            if (oError) {
                                MessageBox.error("상세 데이터를 조회하는 중 오류가 발생했습니다.");
                                this._resetDetailViewState();
                                return;
                            }

                            this._applyCurrentDetailContext();
                        }.bind(this)
                    }
                });
            }.bind(this)).catch(function () {
                MessageBox.error("서비스 메타데이터를 불러오지 못했습니다.");
            });
        },

        _applyCurrentDetailContext: function () {
            var oContext = this._getDetailContext();
            var oData;

            if (!oContext) {
                return;
            }

            oData = oContext.getObject();

            if (!oData || !oData.ApvNo) {
                return;
            }

            this._applyDetailViewState(oData);
        },

        _getDetailContext: function () {
            return this.getView().getBindingContext();
        },

        _getDetailData: function () {
            var oContext = this._getDetailContext();

            if (!oContext) {
                return {};
            }

            return oContext.getObject() || {};
        },

        _resetDetailViewState: function () {
            this.getView()
                .getModel("detailView")
                .setData(this._getInitialDetailViewData());
        },

        _resetFaceAuthState: function () {
            var oFaceAuthModel = this.getView().getModel("faceAuth");

            if (!oFaceAuthModel) {
                return;
            }

            oFaceAuthModel.setData(this._getInitialFaceAuthData());
        },

        _applyDetailViewState: function (oData) {
            var oDetailView = this.getView().getModel("detailView");
            var sApvStat = String(oData.ApvStat || "").trim();
            var sBankId = String(oData.BankId || "").trim();
            var bHasBank = !!sBankId;

            oDetailView.setData({
                SelectedBankId: sBankId,
                SelectedBankNm: oData.BankNm || "",
                SelectedAccount: oData.Account || "",
                SelectedWaers: oData.Waers || "",
                SelectedBalanceAmt: 0,
                SelectedPlanOutAmt: 0,
                SelectedAvailableAmt: 0,
                PayAmount: this._toNumber(oData.Wrbtr),

                SelectedBankDisplayTitle: this._getBankDisplayTitle(sApvStat, {
                    BankId: sBankId,
                    BankNm: oData.BankNm,
                    Account: oData.Account
                }),
                SelectedBankDisplayText: this._getBankDisplayText(sApvStat, {
                    BankId: sBankId,
                    BankNm: oData.BankNm,
                    Account: oData.Account
                }),
                SelectedBankShortText: this._getBankShortText(sApvStat, {
                    BankId: sBankId,
                    BankNm: oData.BankNm,
                    Account: oData.Account
                }),

                AvailableText: this._getInitialAvailableText(sApvStat, bHasBank),
                AvailableState: this._getInitialAvailableState(sApvStat, bHasBank),

                ApprovalPossibleText: this._getApprovalPossibleText(sApvStat, false),
                ApprovalPossibleState: this._getApprovalPossibleState(sApvStat, false),

                FooterText: this._getFooterText(sApvStat, false),
                FooterState: this._getFooterState(sApvStat, false),

                IsRequest: sApvStat === "REQ",
                IsApproved: sApvStat === "APR",
                IsRejected: sApvStat === "REJ",
                ShowPaymentReview: sApvStat === "REQ",
                CanSelectBank: sApvStat === "REQ",
                CanReject: sApvStat === "REQ",
                CanApprove: false,

                RejectReason: oData.RejRsn || "",
                RejectDialogReason: "",
                BankInfoBusy: false
            });

            if (sApvStat === "REJ") {
                return;
            }

            if (bHasBank) {
                this._readSelectedBankInfo(oData);
            }
        },

        _getInitialAvailableText: function (sApvStat, bHasBank) {
            if (sApvStat === "REJ") {
                return "반려 완료 - 지급 검토 제외";
            }

            if (sApvStat === "APR") {
                return bHasBank
                    ? "승인 완료된 지급 계좌입니다."
                    : "승인 완료 건이지만 저장된 계좌 정보가 없습니다.";
            }

            if (!bHasBank) {
                return "은행을 선택하세요.";
            }

            return "선택된 은행 정보를 조회하고 있습니다.";
        },

        _getInitialAvailableState: function (sApvStat, bHasBank) {
            if (sApvStat === "REJ") {
                return "None";
            }

            if (sApvStat === "APR") {
                return "None";
            }

            if (sApvStat === "REQ" && bHasBank) {
                return "Information";
            }

            return "None";
        },

        _getFooterText: function (sApvStat, bCanApprove) {
            if (sApvStat === "APR") {
                return "승인 완료";
            }

            if (sApvStat === "REJ") {
                return "반려 완료";
            }

            return bCanApprove ? "승인 준비 완료" : "승인 조건 확인 필요";
        },

        _getFooterState: function (sApvStat, bCanApprove) {
            if (sApvStat === "APR" || sApvStat === "REJ") {
                return "None";
            }

            return bCanApprove ? "Success" : "Warning";
        },

        _getApprovalPossibleText: function (sApvStat, bCanApprove) {
            if (sApvStat === "APR") {
                return "이미 승인 완료";
            }

            if (sApvStat === "REJ") {
                return "반려 완료";
            }

            return bCanApprove ? "승인 가능" : "승인 불가";
        },

        _getApprovalPossibleState: function (sApvStat, bCanApprove) {
            if (sApvStat === "APR" || sApvStat === "REJ") {
                return "None";
            }

            return bCanApprove ? "Success" : "None";
        },

        _getBankDisplayTitle: function (sApvStat, oBank) {
            if (oBank.BankNm) {
                return oBank.BankNm;
            }

            if (sApvStat === "APR") {
                return "승인 계좌 정보 없음";
            }

            if (sApvStat === "REJ") {
                return "지급 검토 제외";
            }

            return "미선택";
        },

        _getBankDisplayText: function (sApvStat, oBank) {
            if (oBank.BankId && oBank.Account) {
                return oBank.BankId + " / " + oBank.Account;
            }

            if (oBank.BankId) {
                return oBank.BankId;
            }

            if (sApvStat === "APR") {
                return "저장된 승인 계좌 없음";
            }

            if (sApvStat === "REJ") {
                return "반려 완료";
            }

            return "계좌 선택 필요";
        },

        _getBankShortText: function (sApvStat, oBank) {
            if (sApvStat === "REJ") {
                return "반려 완료 - 지급 검토 제외";
            }

            if (oBank.BankNm && oBank.BankId && oBank.Account) {
                return oBank.BankNm + " / " + oBank.BankId + " / " + oBank.Account;
            }

            if (oBank.BankNm && oBank.BankId) {
                return oBank.BankNm + " / " + oBank.BankId;
            }

            if (oBank.BankId) {
                return oBank.BankId;
            }

            if (sApvStat === "APR") {
                return "승인 계좌 정보 없음";
            }

            return "계좌 미선택";
        },

        _readSelectedBankInfo: function (oDetail) {
            var oYearMonth = this._getCurrentYearMonth();

            var aFilters = [
                new Filter("Bukrs", FilterOperator.EQ, oDetail.Bukrs),
                new Filter("BankId", FilterOperator.EQ, oDetail.BankId),
                new Filter("Waers", FilterOperator.EQ, oDetail.Waers),
                new Filter("Gjahr", FilterOperator.EQ, oYearMonth.gjahr),
                new Filter("Monat", FilterOperator.EQ, oYearMonth.monat)
            ];

            this._readSelectedBankInfoByFilters(oDetail, aFilters, function (oBank) {
                if (oBank) {
                    this._applySelectedBankInfo(oBank, oDetail);
                    return;
                }

                this._applySelectedBankNotFound(oDetail, oYearMonth);
            }.bind(this));
        },

        _readSelectedBankInfoByFilters: function (oDetail, aFilters, fnDone) {
            var oModel = this.getView().getModel();
            var oDetailView = this.getView().getModel("detailView");

            oDetailView.setProperty("/BankInfoBusy", true);

            oModel.read("/PayApvBankBalSet", {
                filters: aFilters,
                sorters: [
                    new Sorter("Gjahr", true),
                    new Sorter("Monat", true)
                ],
                urlParameters: {
                    "$top": "1"
                },

                success: function (oData) {
                    var aRows = oData && oData.results ? oData.results : [];
                    var oBank = aRows.length > 0 ? aRows[0] : null;

                    oDetailView.setProperty("/BankInfoBusy", false);
                    fnDone(oBank);
                }.bind(this),

                error: function () {
                    oDetailView.setProperty("/BankInfoBusy", false);
                    oDetailView.setProperty("/AvailableText", "선택된 계좌 정보 조회 중 오류가 발생했습니다.");
                    oDetailView.setProperty("/AvailableState", "None");
                    oDetailView.setProperty("/CanApprove", false);
                    oDetailView.setProperty("/ApprovalPossibleText", "승인 불가");
                    oDetailView.setProperty("/ApprovalPossibleState", "None");
                    oDetailView.setProperty("/FooterText", "승인 조건 확인 필요");
                    oDetailView.setProperty("/FooterState", "Warning");

                    fnDone(null);
                }.bind(this)
            });
        },

        _applySelectedBankInfo: function (oBank, oDetail) {
            var oDetailView = this.getView().getModel("detailView");
            var sApvStat = String(oDetail.ApvStat || "").trim();

            this._setSelectedBank(oBank, oDetail);

            if (sApvStat === "APR") {
                oDetailView.setProperty("/AvailableText", "승인 완료된 지급 계좌입니다.");
                oDetailView.setProperty("/AvailableState", "None");
                oDetailView.setProperty("/CanApprove", false);
                oDetailView.setProperty("/ShowPaymentReview", false);
                oDetailView.setProperty("/ApprovalPossibleText", "이미 승인 완료");
                oDetailView.setProperty("/ApprovalPossibleState", "None");
                oDetailView.setProperty("/FooterText", "승인 완료");
                oDetailView.setProperty("/FooterState", "None");
                return;
            }

            this._checkSelectedBankAvailable(oBank, oDetail);
        },

        _applySelectedBankNotFound: function (oDetail, oYearMonth) {
            var oDetailView = this.getView().getModel("detailView");
            var sApvStat = String(oDetail.ApvStat || "").trim();
            var oBank = {
                BankId: oDetail.BankId || "",
                BankNm: oDetail.BankNm || "",
                Account: oDetail.Account || "",
                Waers: oDetail.Waers || ""
            };

            oDetailView.setProperty("/SelectedBankId", oBank.BankId);
            oDetailView.setProperty("/SelectedBankNm", oBank.BankNm);
            oDetailView.setProperty("/SelectedAccount", oBank.Account);
            oDetailView.setProperty("/SelectedWaers", oBank.Waers);
            oDetailView.setProperty("/SelectedBalanceAmt", 0);
            oDetailView.setProperty("/SelectedPlanOutAmt", 0);
            oDetailView.setProperty("/SelectedAvailableAmt", 0);

            oDetailView.setProperty("/SelectedBankDisplayTitle", this._getBankDisplayTitle(sApvStat, oBank));
            oDetailView.setProperty("/SelectedBankDisplayText", this._getBankDisplayText(sApvStat, oBank));
            oDetailView.setProperty("/SelectedBankShortText", this._getBankShortText(sApvStat, oBank));

            oDetailView.setProperty("/CanApprove", false);

            if (sApvStat === "APR") {
                oDetailView.setProperty(
                    "/AvailableText",
                    "승인 완료된 지급 계좌입니다. 단, " + oYearMonth.gjahr + "." + oYearMonth.monat + " 계좌 잔액 정보는 없습니다."
                );
                oDetailView.setProperty("/AvailableState", "None");
                oDetailView.setProperty("/ShowPaymentReview", false);
                oDetailView.setProperty("/ApprovalPossibleText", "이미 승인 완료");
                oDetailView.setProperty("/ApprovalPossibleState", "None");
                oDetailView.setProperty("/FooterText", "승인 완료");
                oDetailView.setProperty("/FooterState", "None");
                return;
            }

            oDetailView.setProperty(
                "/AvailableText",
                "선택된 은행ID는 있으나 " + oYearMonth.gjahr + "." + oYearMonth.monat + " 계좌 잔액 정보를 찾을 수 없습니다."
            );
            oDetailView.setProperty("/AvailableState", "None");
            oDetailView.setProperty("/ApprovalPossibleText", "승인 불가");
            oDetailView.setProperty("/ApprovalPossibleState", "None");
            oDetailView.setProperty("/FooterText", "승인 조건 확인 필요");
            oDetailView.setProperty("/FooterState", "Warning");
        },

        _checkSelectedBankAvailable: function (oBank, oDetail) {
            var oDetailView = this.getView().getModel("detailView");
            var fAvailable = this._toNumber(oBank.AvailableAmt);
            var fPayAmount = this._toNumber(oDetail.Wrbtr);

            if (oBank.CloseYn === "X") {
                oDetailView.setProperty("/AvailableText", "월마감된 계좌입니다.");
                oDetailView.setProperty("/AvailableState", "None");
                oDetailView.setProperty("/CanApprove", false);
                oDetailView.setProperty("/ApprovalPossibleText", "승인 불가");
                oDetailView.setProperty("/ApprovalPossibleState", "None");
                oDetailView.setProperty("/FooterText", "승인 조건 확인 필요");
                oDetailView.setProperty("/FooterState", "Warning");
                return;
            }

            if (fAvailable < fPayAmount) {
                oDetailView.setProperty("/AvailableText", "가용잔액이 부족합니다.");
                oDetailView.setProperty("/AvailableState", "None");
                oDetailView.setProperty("/CanApprove", false);
                oDetailView.setProperty("/ApprovalPossibleText", "승인 불가");
                oDetailView.setProperty("/ApprovalPossibleState", "None");
                oDetailView.setProperty("/FooterText", "승인 조건 확인 필요");
                oDetailView.setProperty("/FooterState", "Warning");
                return;
            }

            oDetailView.setProperty("/AvailableText", "승인 가능한 계좌입니다.");
            oDetailView.setProperty("/AvailableState", "Success");
            oDetailView.setProperty("/CanApprove", true);
            oDetailView.setProperty("/ShowPaymentReview", true);
            oDetailView.setProperty("/ApprovalPossibleText", "승인 가능");
            oDetailView.setProperty("/ApprovalPossibleState", "Success");
            oDetailView.setProperty("/FooterText", "승인 준비 완료");
            oDetailView.setProperty("/FooterState", "Success");
        },

        onNavBack: function () {
            var oHistory = History.getInstance();
            var sPreviousHash = oHistory.getPreviousHash();

            if (sPreviousHash !== undefined) {
                window.history.go(-1);
            } else {
                this._oRouter.navTo("RouteMain", {}, true);
            }
        },

        onSelectBank: function () {
            var oDetail = this._getDetailData();

            if (!oDetail || !oDetail.ApvNo) {
                MessageBox.error("상세 데이터가 없습니다.");
                return;
            }

            if (String(oDetail.ApvStat || "").trim() !== "REQ") {
                MessageBox.error("상신중 상태의 결재만 은행을 선택할 수 있습니다.");
                return;
            }

            this._loadBankDialog().then(function (oDialog) {
                oDialog.open();
                this._bindBankTable();
            }.bind(this));
        },

        _loadBankDialog: function () {
            if (!this._pBankDialog) {
                this._pBankDialog = this.loadFragment({
                    name: "code.t1.paymentaprove.view.BankDialog"
                }).then(function (oDialog) {
                    this._oBankDialog = oDialog;
                    this._oBankTable = this.byId("bankTable");

                    if (this._oBankTable) {
                        this._oBankTable.setBusyIndicatorDelay(0);
                        this._attachBankTableLoadingEvents();
                    }

                    return oDialog;
                }.bind(this));
            }

            return this._pBankDialog;
        },

        _bindBankTable: function () {
            var oDetail = this._getDetailData();

            if (!oDetail || !oDetail.ApvNo) {
                MessageBox.error("상세 데이터가 없습니다.");
                return;
            }

            if (!this._oBankTable) {
                MessageBox.error("은행 선택 테이블을 찾을 수 없습니다.");
                return;
            }

            var oYearMonth = this._getCurrentYearMonth();

            var aFilters = [
                new Filter("Bukrs", FilterOperator.EQ, oDetail.Bukrs),
                new Filter("Waers", FilterOperator.EQ, oDetail.Waers),
                new Filter("Gjahr", FilterOperator.EQ, oYearMonth.gjahr),
                new Filter("Monat", FilterOperator.EQ, oYearMonth.monat)
            ];

            var oDetailView = this.getView().getModel("detailView");
            var oBinding = this._oBankTable.getBinding("items");

            oDetailView.setProperty("/PayAmount", this._toNumber(oDetail.Wrbtr));

            this._oBankTable.removeSelections(true);
            this._oBankTable.setNoDataText(
                "계좌 정보를 조회하고 있습니다. (" +
                oYearMonth.gjahr + "." + oYearMonth.monat + ")"
            );
            this._setBankTableBusy(true);

            if (oBinding) {
                this._attachBankTableLoadingEvents();
                oBinding.filter(aFilters);
            } else {
                this._setBankTableBusy(false);
                this._oBankTable.setNoDataText("은행 계좌 목록 바인딩을 찾을 수 없습니다.");
                MessageBox.error("은행 계좌 목록 바인딩을 찾을 수 없습니다.");
            }
        },

        _getCurrentYearMonth: function () {
            var oDate = new Date();

            return {
                gjahr: String(oDate.getFullYear()),
                monat: String(oDate.getMonth() + 1).padStart(2, "0")
            };
        },

        _attachBankTableLoadingEvents: function () {
            var oBinding;

            if (!this._oBankTable) {
                return;
            }

            oBinding = this._oBankTable.getBinding("items");

            if (!oBinding || this._bBankTableLoadingAttached) {
                return;
            }

            oBinding.attachDataRequested(function () {
                this._setBankTableBusy(true);

                if (this._oBankTable) {
                    this._oBankTable.setNoDataText("계좌 정보를 조회하고 있습니다...");
                }
            }, this);

            oBinding.attachDataReceived(function (oEvent) {
                this._setBankTableBusy(false);

                if (this._oBankTable) {
                    this._oBankTable.setNoDataText("조회된 계좌가 없습니다.");
                }

                if (oEvent.getParameter("error")) {
                    MessageBox.error("지급 계좌 목록을 조회하는 중 오류가 발생했습니다.");
                }
            }, this);

            oBinding.attachChange(function () {
                this._setBankTableBusy(false);

                if (this._oBankTable) {
                    this._oBankTable.setNoDataText("조회된 계좌가 없습니다.");
                }
            }, this);

            this._bBankTableLoadingAttached = true;
        },

        _setBankTableBusy: function (bBusy) {
            if (this._oBankTable) {
                this._oBankTable.setBusy(bBusy);
            }

            if (this._oBankDialog && this._oBankDialog.getBeginButton()) {
                this._oBankDialog.getBeginButton().setEnabled(!bBusy);
            }
        },

        onConfirmBank: function () {
            var oSelectedItem = this._oBankTable && this._oBankTable.getSelectedItem();

            if (!oSelectedItem) {
                MessageBox.error("지급 계좌를 선택하세요.");
                return;
            }

            var oBank = oSelectedItem.getBindingContext().getObject();
            var oDetail = this._getDetailData();
            var oDetailView = this.getView().getModel("detailView");

            if (!oDetail || !oDetail.ApvNo) {
                MessageBox.error("상세 데이터가 없습니다.");
                return;
            }

            if (String(oDetail.ApvStat || "").trim() !== "REQ") {
                MessageBox.error("상신중 상태의 결재만 은행을 선택할 수 있습니다.");
                return;
            }

            if (oBank.CloseYn === "X") {
                MessageBox.error("월마감된 계좌는 선택할 수 없습니다.");
                return;
            }

            var fAvailable = this._toNumber(oBank.AvailableAmt);
            var fPayAmount = this._toNumber(oDetail.Wrbtr);

            this._setSelectedBank(oBank, oDetail);

            if (fAvailable < fPayAmount) {
                oDetailView.setProperty("/AvailableText", "가용잔액이 부족합니다.");
                oDetailView.setProperty("/AvailableState", "None");
                oDetailView.setProperty("/CanApprove", false);
                oDetailView.setProperty("/ApprovalPossibleText", "승인 불가");
                oDetailView.setProperty("/ApprovalPossibleState", "None");
                oDetailView.setProperty("/FooterText", "승인 조건 확인 필요");
                oDetailView.setProperty("/FooterState", "Warning");

                MessageBox.error("가용잔액이 지급대상금액보다 부족합니다.");
                return;
            }

            oDetailView.setProperty("/AvailableText", "승인 가능한 계좌입니다.");
            oDetailView.setProperty("/AvailableState", "Success");
            oDetailView.setProperty("/CanApprove", true);
            oDetailView.setProperty("/ApprovalPossibleText", "승인 가능");
            oDetailView.setProperty("/ApprovalPossibleState", "Success");
            oDetailView.setProperty("/FooterText", "승인 준비 완료");
            oDetailView.setProperty("/FooterState", "Success");

            this._oBankDialog.close();
        },

        onCancelBankDialog: function () {
            if (this._oBankDialog) {
                this._oBankDialog.close();
            }
        },

        _setSelectedBank: function (oBank, oDetail) {
            var oDetailView = this.getView().getModel("detailView");
            var sApvStat = oDetail ? String(oDetail.ApvStat || "").trim() : "REQ";
            var oDisplayBank = {
                BankId: oBank.BankId || "",
                BankNm: oBank.BankNm || "",
                Account: oBank.Account || "",
                Waers: oBank.Waers || ""
            };

            oDetailView.setProperty("/SelectedBankId", oDisplayBank.BankId);
            oDetailView.setProperty("/SelectedBankNm", oDisplayBank.BankNm);
            oDetailView.setProperty("/SelectedAccount", oDisplayBank.Account);
            oDetailView.setProperty("/SelectedWaers", oDisplayBank.Waers);
            oDetailView.setProperty("/SelectedBalanceAmt", oBank.BalanceAmt || 0);
            oDetailView.setProperty("/SelectedPlanOutAmt", oBank.PlanOutAmt || 0);
            oDetailView.setProperty("/SelectedAvailableAmt", oBank.AvailableAmt || 0);

            oDetailView.setProperty("/SelectedBankDisplayTitle", this._getBankDisplayTitle(sApvStat, oDisplayBank));
            oDetailView.setProperty("/SelectedBankDisplayText", this._getBankDisplayText(sApvStat, oDisplayBank));
            oDetailView.setProperty("/SelectedBankShortText", this._getBankShortText(sApvStat, oDisplayBank));
        },

        /*
         * 지급 승인 버튼
         * 기존: 확인 팝업 후 바로 승인 저장
         * 변경: 안면 인증 Dialog 실행 후 인증 성공 시 자동 승인 저장
         */
        onApprove: function () {
            var oDetail = this._getDetailData();
            var oDetailView = this.getView().getModel("detailView");
            var sBankId = oDetailView.getProperty("/SelectedBankId");

            if (!oDetail || !oDetail.ApvNo) {
                MessageBox.error("상세 데이터가 없습니다.");
                return;
            }

            if (String(oDetail.ApvStat || "").trim() !== "REQ") {
                MessageBox.error("상신중 상태의 결재만 승인할 수 있습니다.");
                return;
            }

            if (!sBankId) {
                MessageBox.error("지급 계좌를 먼저 선택하세요.");
                return;
            }

            if (!oDetailView.getProperty("/CanApprove")) {
                MessageBox.error("가용잔액 체크가 완료되지 않았거나 승인할 수 없는 계좌입니다.");
                return;
            }

            this._sPendingApproveBankId = sBankId;
            this._openFaceApproveDialog(oDetail);
        },

        /*
         * 안면 인증 대상 사용자
         * 1순위: Fiori Launchpad 현재 SAP 로그인 사용자
         * 2순위: oDetail.ApprId
         */
        _getCurrentSapUserId: function () {
            try {
                if (sap.ushell && sap.ushell.Container && sap.ushell.Container.getUser) {
                    return String(sap.ushell.Container.getUser().getId() || "").trim();
                }
            } catch (e) {
                // FLP 환경이 아니면 fallback 사용
            }

            return "";
        },

        _getExpectedApproverId: function (oDetail) {
            var sCurrentUser = this._getCurrentSapUserId();

            if (sCurrentUser) {
                return sCurrentUser;
            }

            if (oDetail && oDetail.ApprId) {
                return String(oDetail.ApprId || "").trim();
            }

            return "";
        },

        _openFaceApproveDialog: function (oDetail) {
            var sExpectedUserId = this._getExpectedApproverId(oDetail);
            var oFaceAuthModel = this.getView().getModel("faceAuth");

            if (!sExpectedUserId) {
                MessageBox.error(
                    "현재 SAP 로그인 사용자 ID를 확인할 수 없습니다.\n" +
                    "Fiori Launchpad에서 실행하거나 얼굴 등록 UserId 기준을 확인하세요."
                );
                return;
            }

            oFaceAuthModel.setData({
                ApvNo: oDetail.ApvNo || "",
                ExpectedUserId: sExpectedUserId,
                StatusText: "안면 인증을 준비하고 있습니다.",
                StatusState: "Information",
                DistanceText: "-",
                DistanceState: "None",
                Busy: true,
                Saving: false,
                Threshold: 0.42
            });

            if (!this._pFaceApproveDialog) {
                this._pFaceApproveDialog = this.loadFragment({
                    name: "code.t1.paymentaprove.view.FaceApproveDialog"
                }).then(function (oDialog) {
                    this._oFaceApproveDialog = oDialog;
                    return oDialog;
                }.bind(this));
            }

            this._pFaceApproveDialog.then(function (oDialog) {
                oDialog.open();
            }.bind(this));
        },

        onFaceApproveDialogAfterOpen: function () {
            this._runHiddenFaceApproval();
        },

        _runHiddenFaceApproval: async function () {
            var oFaceAuthModel = this.getView().getModel("faceAuth");
            var sExpectedUserId = oFaceAuthModel.getProperty("/ExpectedUserId");
            var fThreshold = oFaceAuthModel.getProperty("/Threshold");

            try {
                this._setFaceAuthStatus("안면 인식 모듈을 불러오는 중입니다.", "Information", true);

                await this._loadFaceApi();
                await this._loadFaceModels();

                this._setFaceAuthStatus("카메라 권한을 확인하는 중입니다.", "Information", true);

                await this._startHiddenFaceCamera();

                this._setFaceAuthStatus("등록된 결재자 얼굴 정보를 확인하는 중입니다.", "Information", true);

                var aRegisteredFaces = await this._readFaceDescriptorsByUser(sExpectedUserId);

                if (!aRegisteredFaces.length) {
                    this._setFaceAuthStatus("등록된 얼굴 정보가 없습니다.", "Error", false);

                    this._stopFaceApproveCamera();

                    MessageBox.error(
                        "현재 결재자(" + sExpectedUserId + ")로 등록된 얼굴 정보가 없습니다.\n" +
                        "먼저 얼굴 등록 앱에서 해당 UserId로 얼굴을 등록하세요."
                    );

                    this._closeFaceApproveDialogDelayed();
                    return;
                }

                this._setFaceAuthStatus("얼굴을 확인하는 중입니다.", "Information", true);

                var oCurrentResult = await this._detectFaceFromHiddenVideo();

                if (!oCurrentResult) {
                    this._setFaceAuthStatus("얼굴을 확인하지 못했습니다.", "Error", false);

                    this._stopFaceApproveCamera();

                    MessageBox.error(
                        "안면 인증에 실패했습니다.\n\n" +
                        "얼굴을 확인하지 못해 승인 처리되지 않았습니다."
                    );

                    this._closeFaceApproveDialogDelayed();
                    return;
                }

                var oMatchResult = this._compareFaceWithRegistered(
                    oCurrentResult.descriptor,
                    aRegisteredFaces,
                    fThreshold
                );

                this._setFaceAuthDistance(oMatchResult.distance, oMatchResult.matched);

                if (!oMatchResult.matched) {
                    this._setFaceAuthStatus("안면 인증 실패", "Error", false);

                    this._stopFaceApproveCamera();

                    MessageBox.error(
                        "안면 인증에 실패했습니다.\n\n" +
                        "현재 결재자와 얼굴 정보가 일치하지 않아 승인 처리되지 않았습니다.\n" +
                        "인증 대상: " + sExpectedUserId + "\n" +
                        "거리값: " + (
                            oMatchResult.distance === 999
                                ? "-"
                                : Number(oMatchResult.distance).toFixed(4)
                        )
                    );

                    this._closeFaceApproveDialogDelayed();
                    return;
                }

                this._setFaceAuthStatus("안면 인증 성공. 승인 저장 중입니다.", "Success", true);
                oFaceAuthModel.setProperty("/Saving", true);

                this._stopFaceApproveCamera();

                /*
                 * 인증 성공 시 별도 확인 팝업 없이 바로 승인 저장
                 */
                this._executeApprove(this._sPendingApproveBankId);

                this._closeFaceApproveDialogDelayed();
            } catch (oError) {
                console.error(oError);

                this._setFaceAuthStatus("안면 인증 중 오류가 발생했습니다.", "Error", false);

                this._stopFaceApproveCamera();

                MessageBox.error(
                    "안면 인증 처리 중 오류가 발생했습니다.\n\n" +
                    "승인 처리되지 않았습니다."
                );

                this._closeFaceApproveDialogDelayed();
            }
        },

        _startHiddenFaceCamera: async function () {
            var oVideo = document.getElementById("approveFaceVideo");

            if (!oVideo) {
                throw new Error("안면 인증용 video 태그를 찾을 수 없습니다.");
            }

            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                throw new Error("현재 브라우저에서 카메라 API를 사용할 수 없습니다.");
            }

            this._stopFaceApproveCamera();

            this._oFaceStream = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: 640,
                    height: 480,
                    facingMode: "user"
                },
                audio: false
            });

            oVideo.srcObject = this._oFaceStream;

            await this._waitForVideoReady(oVideo);
        },

        _waitForVideoReady: function (oVideo) {
            return new Promise(function (resolve, reject) {
                var iRetryCount = 0;
                var iMaxRetryCount = 50;

                function checkReady() {
                    if (
                        oVideo.readyState >= 2 &&
                        oVideo.videoWidth > 0 &&
                        oVideo.videoHeight > 0
                    ) {
                        resolve();
                        return;
                    }

                    iRetryCount += 1;

                    if (iRetryCount > iMaxRetryCount) {
                        reject(new Error("카메라 영상 준비 시간이 초과되었습니다."));
                        return;
                    }

                    setTimeout(checkReady, 100);
                }

                oVideo.onloadedmetadata = function () {
                    try {
                        var oPlayPromise = oVideo.play();

                        if (oPlayPromise && oPlayPromise.then) {
                            oPlayPromise.then(checkReady).catch(reject);
                        } else {
                            checkReady();
                        }
                    } catch (e) {
                        reject(e);
                    }
                };

                if (oVideo.readyState >= 2) {
                    checkReady();
                }
            });
        },

        _detectFaceFromHiddenVideo: async function () {
            var oVideo = document.getElementById("approveFaceVideo");
            var iTry;
            var oResult;

            if (!oVideo || !oVideo.srcObject) {
                return null;
            }

            /*
             * 카메라가 켜진 직후에는 첫 프레임이 불안정할 수 있으므로 여러 번 시도
             */
            for (iTry = 0; iTry < 5; iTry += 1) {
                oResult = await faceapi
                    .detectSingleFace(
                        oVideo,
                        new faceapi.TinyFaceDetectorOptions()
                    )
                    .withFaceLandmarks()
                    .withFaceDescriptor();

                if (oResult) {
                    return oResult;
                }

                await new Promise(function (resolve) {
                    setTimeout(resolve, 300);
                });
            }

            return null;
        },

        _stopFaceApproveCamera: function () {
            if (this._oFaceStream) {
                this._oFaceStream.getTracks().forEach(function (oTrack) {
                    oTrack.stop();
                });

                this._oFaceStream = null;
            }

            var oVideo = document.getElementById("approveFaceVideo");

            if (oVideo) {
                oVideo.srcObject = null;
            }
        },

        _loadFaceApi: function () {
            if (this._bFaceApiLoaded && window.faceapi) {
                return Promise.resolve();
            }

            var sScriptUrl = sap.ui.require.toUrl(
                "code/t1/paymentaprove/thirdparty/face-api.min.js"
            );

            return includeScript({
                url: sScriptUrl,
                id: "payment-approve-face-api-js"
            }).then(function () {
                this._bFaceApiLoaded = true;
            }.bind(this));
        },

        _loadFaceModels: async function () {
            if (this._bFaceModelsLoaded) {
                return;
            }

            var sModelPath = sap.ui.require.toUrl(
                "code/t1/paymentaprove/models/faceapi"
            );

            await faceapi.nets.tinyFaceDetector.loadFromUri(sModelPath);
            await faceapi.nets.faceLandmark68Net.loadFromUri(sModelPath);
            await faceapi.nets.faceRecognitionNet.loadFromUri(sModelPath);

            this._bFaceModelsLoaded = true;
        },

        _setFaceAuthStatus: function (sText, sState, bBusy) {
            var oFaceAuthModel = this.getView().getModel("faceAuth");

            oFaceAuthModel.setProperty("/StatusText", sText);
            oFaceAuthModel.setProperty("/StatusState", sState || "None");
            oFaceAuthModel.setProperty("/Busy", !!bBusy);
        },

        _setFaceAuthDistance: function (vDistance, bMatched) {
            var oFaceAuthModel = this.getView().getModel("faceAuth");

            if (vDistance === null || vDistance === undefined || vDistance === 999) {
                oFaceAuthModel.setProperty("/DistanceText", "-");
                oFaceAuthModel.setProperty("/DistanceState", "None");
                return;
            }

            oFaceAuthModel.setProperty("/DistanceText", Number(vDistance).toFixed(4));
            oFaceAuthModel.setProperty("/DistanceState", bMatched ? "Success" : "Error");
        },

        _readFaceDescriptorsByUser: function (sUserId) {
            return new Promise(function (resolve, reject) {
                if (!this._oFaceODataModel) {
                    reject(new Error("얼굴 등록 OData Model을 찾을 수 없습니다."));
                    return;
                }

                /*
                 * FaceRegisterSet metadata에서 filterable=false일 수 있으므로
                 * 전체 조회 후 UI5에서 UserId / Active 필터링
                 */
                this._oFaceODataModel.read("/FaceRegisterSet", {
                    success: function (oData) {
                        var aRows = oData && oData.results ? oData.results : [];

                        aRows = aRows.filter(function (oRow) {
                            return String(oRow.UserId || "").trim() === String(sUserId || "").trim() &&
                                   String(oRow.Active || "").trim() === "X";
                        });

                        resolve(aRows);
                    },
                    error: reject
                });
            }.bind(this));
        },

        _compareFaceWithRegistered: function (oCurrentDescriptor, aRegisteredFaces, fThreshold) {
            var fMinDistance = 999;
            var oBestRow = null;

            aRegisteredFaces.forEach(function (oRow) {
                var aSavedDescriptor;
                var fDistance;

                if (!oRow.FaceDesc) {
                    return;
                }

                try {
                    aSavedDescriptor = JSON.parse(oRow.FaceDesc);
                } catch (e) {
                    console.warn("FaceDesc JSON parse error", oRow);
                    return;
                }

                if (!Array.isArray(aSavedDescriptor) || !aSavedDescriptor.length) {
                    return;
                }

                fDistance = faceapi.euclideanDistance(
                    oCurrentDescriptor,
                    new Float32Array(aSavedDescriptor)
                );

                if (fDistance < fMinDistance) {
                    fMinDistance = fDistance;
                    oBestRow = oRow;
                }
            });

            return {
                matched: fMinDistance <= fThreshold,
                distance: fMinDistance,
                row: oBestRow
            };
        },

        _closeFaceApproveDialogDelayed: function () {
            setTimeout(function () {
                if (this._oFaceApproveDialog) {
                    this._oFaceApproveDialog.close();
                }
            }.bind(this), 600);
        },

        onCancelFaceApprove: function () {
            this._stopFaceApproveCamera();

            if (this._oFaceApproveDialog) {
                this._oFaceApproveDialog.close();
            }
        },

        onFaceApproveDialogAfterClose: function () {
            this._stopFaceApproveCamera();

            if (this.getView().getModel("faceAuth")) {
                this.getView().getModel("faceAuth").setProperty("/Busy", false);
                this.getView().getModel("faceAuth").setProperty("/Saving", false);
            }
        },

        _executeApprove: function (sBankId) {
            var oModel = this.getView().getModel();
            var oContext = this._getDetailContext();

            if (!oContext) {
                MessageBox.error("상세 데이터가 없습니다.");
                return;
            }

            oModel.update(oContext.getPath(), {
                ApvStat: "APR",
                BankId: sBankId
            }, {
                merge: true,

                success: function () {
                    MessageToast.show("지급 결재가 승인되었습니다.");

                    this.getView()
                        .getModel("detailView")
                        .setProperty("/CanApprove", false);

                    this._refreshDetailBinding();
                }.bind(this),

                error: function (oError) {
                    var sMessage = this._getErrorMessage(oError);
                    MessageBox.error(sMessage || "승인 처리 중 오류가 발생했습니다.");
                }.bind(this)
            });
        },

        onReject: function () {
            var oDetail = this._getDetailData();

            if (!oDetail || !oDetail.ApvNo) {
                MessageBox.error("상세 데이터가 없습니다.");
                return;
            }

            if (String(oDetail.ApvStat || "").trim() !== "REQ") {
                MessageBox.error("상신중 상태의 결재만 반려할 수 있습니다.");
                return;
            }

            this.getView()
                .getModel("detailView")
                .setProperty("/RejectDialogReason", "");

            this._loadRejectDialog().then(function (oDialog) {
                oDialog.open();
            });
        },

        _loadRejectDialog: function () {
            if (!this._pRejectDialog) {
                this._pRejectDialog = this.loadFragment({
                    name: "code.t1.paymentaprove.view.RejectDialog"
                }).then(function (oDialog) {
                    this._oRejectDialog = oDialog;
                    return oDialog;
                }.bind(this));
            }

            return this._pRejectDialog;
        },

        onConfirmRejectDialog: function () {
            var oDetailView = this.getView().getModel("detailView");
            var sReason = String(oDetailView.getProperty("/RejectDialogReason") || "").trim();

            if (!sReason) {
                MessageBox.error("반려 사유를 입력하세요.");
                return;
            }

            MessageBox.confirm("입력한 사유로 결재 요청을 반려하시겠습니까?", {
                title: "반려 확인",
                actions: [
                    MessageBox.Action.OK,
                    MessageBox.Action.CANCEL
                ],
                emphasizedAction: MessageBox.Action.OK,

                onClose: function (sAction) {
                    if (sAction === MessageBox.Action.OK) {
                        this._executeReject(sReason);
                    }
                }.bind(this)
            });
        },

        onCancelRejectDialog: function () {
            if (this._oRejectDialog) {
                this._oRejectDialog.close();
            }
        },

        _executeReject: function (sReason) {
            var oModel = this.getView().getModel();
            var oContext = this._getDetailContext();

            if (!oContext) {
                MessageBox.error("상세 데이터가 없습니다.");
                return;
            }

            oModel.update(oContext.getPath(), {
                ApvStat: "REJ",
                RejRsn: sReason
            }, {
                merge: true,

                success: function () {
                    if (this._oRejectDialog) {
                        this._oRejectDialog.close();
                    }

                    MessageToast.show("반려 처리되었습니다.");

                    this.getView()
                        .getModel("detailView")
                        .setProperty("/RejectReason", sReason);

                    this._refreshDetailBinding();
                }.bind(this),

                error: function (oError) {
                    var sMessage = this._getErrorMessage(oError);
                    MessageBox.error(sMessage || "반려 처리 중 오류가 발생했습니다.");
                }.bind(this)
            });
        },

        _refreshDetailBinding: function () {
            var oBinding = this.getView().getElementBinding();

            if (oBinding) {
                oBinding.refresh(true);
            }
        },

        _toNumber: function (vValue) {
            if (vValue === null || vValue === undefined || vValue === "") {
                return 0;
            }

            return Number(String(vValue).replace(/,/g, "")) || 0;
        },

        _getErrorMessage: function (oError) {
            try {
                var oResponse = JSON.parse(oError.responseText);

                if (
                    oResponse &&
                    oResponse.error &&
                    oResponse.error.message &&
                    oResponse.error.message.value
                ) {
                    return oResponse.error.message.value;
                }
            } catch (e) {
                // JSON 파싱 실패 시 기본 메시지 사용
            }

            return "";
        },

        onExit: function () {
            this._stopFaceApproveCamera();
        }

    });
});