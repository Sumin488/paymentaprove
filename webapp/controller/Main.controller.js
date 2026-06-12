sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/ui/model/FilterType",
    "sap/ui/model/Sorter",
    "sap/m/MessageBox",
    "sap/m/Token",
    "../model/formatter"
], function (
    Controller,
    JSONModel,
    Filter,
    FilterOperator,
    FilterType,
    Sorter,
    MessageBox,
    Token,
    formatter
) {
    "use strict";

    return Controller.extend("code.t1.paymentaprove.controller.Main", {

        formatter: formatter,

        onInit: function () {
            this._oRouter = this.getOwnerComponent().getRouter();

            this._sBukrs = "1000";
            this._sQuickFilterKey = "ALL";

            this._aCurrentSorters = [
                new Sorter("DueDate", false)
            ];

            this._mStatusFilters = {
                ALL: [],
                REQ: [new Filter("ApvStat", FilterOperator.EQ, "REQ")],
                APR: [new Filter("ApvStat", FilterOperator.EQ, "APR")],
                REJ: [new Filter("ApvStat", FilterOperator.EQ, "REJ")]
            };

            this.getView().setModel(new JSONModel({
                quickFilterKey: "ALL",
                countAll: 0,
                countReq: 0,
                countApr: 0,
                countRej: 0,
                noDataText: "조회 결과가 없습니다."
            }), "worklistView");

            this.getView().setModel(new JSONModel({ items: [] }), "apvNoHelp");
            this.getView().setModel(new JSONModel({ items: [] }), "belnrHelp");
            this.getView().setModel(new JSONModel({ items: [] }), "supplierHelp");
            this.getView().setModel(new JSONModel({ items: [] }), "requesterHelp");

            this.getOwnerComponent().getModel().metadataLoaded().then(function () {
                this._updateTabCounts();
                this._applyFilters({
                    updateCounts: false
                });
            }.bind(this));

            this._oRouter.getRoute("RouteMain").attachPatternMatched(function () {
                this.getView()
                    .getModel("worklistView")
                    .setProperty("/quickFilterKey", this._sQuickFilterKey);

                this._updateTabCounts();
                this._applyFilters({
                    updateCounts: false
                });
            }, this);
        },

        onUpdateFinished: function (oEvent) {
            var iTotalItems = oEvent.getParameter("total");
            var oTable = oEvent.getSource();
            var oBinding = oTable.getBinding("items");
            var sTitle;

            sTitle = oBinding && oBinding.isLengthFinal()
                ? "결재 목록 (" + iTotalItems + ")"
                : "결재 목록";

            this.byId("listTitle").setText(sTitle);
            oTable.setBusy(false);

            this.getView()
                .getModel("worklistView")
                .setProperty("/noDataText", "조회 결과가 없습니다.");
        },

        onQuickFilter: function (oEvent) {
            var oSelectedItem = oEvent.getParameter("item") ||
                                oEvent.getParameter("selectedItem");

            var sKey = oEvent.getParameter("key") ||
                       oEvent.getParameter("selectedKey") ||
                       (oSelectedItem && oSelectedItem.getKey && oSelectedItem.getKey()) ||
                       this.byId("iconTabBar").getSelectedKey();

            this._sQuickFilterKey = sKey || "ALL";

            this.getView()
                .getModel("worklistView")
                .setProperty("/quickFilterKey", this._sQuickFilterKey);

            this._applyFilters({
                updateCounts: false
            });
        },

        onFilterSearch: function () {
            this._normalizeAllMultiInputs();

            this._applyFilters({
                updateCounts: true
            });
        },

        onFilterClear: function () {
            this._clearMultiInput("filterApvNo");
            this._clearMultiInput("filterBelnr");
            this._clearMultiInput("filterLifnr");
            this._clearMultiInput("filterReqId");
            this._clearDateRange("filterDueDate");

            this._applyFilters({
                updateCounts: true
            });
        },

        onMultiInputSubmit: function (oEvent) {
            var oSource = oEvent.getSource();

            this._addCurrentValueAsToken(oSource);

            this._applyFilters({
                updateCounts: true
            });
        },

        onTokenUpdate: function (oEvent) {
            var sType = oEvent.getParameter("type");

            if (sType === "removed" || sType === "removedAll") {
                this._applyFilters({
                    updateCounts: true
                });
            }
        },

        onDateRangeChange: function (oEvent) {
            var oSource = oEvent.getSource();
            var bValid = oEvent.getParameter("valid");

            if (bValid === false) {
                oSource.setValueState("Error");
                oSource.setValueStateText("날짜 형식은 yyyy.MM.dd 입니다.");
                return;
            }

            oSource.setValueState("None");
            oSource.setValueStateText("");
        },

        _normalizeAllMultiInputs: function () {
            this._addCurrentValueAsToken(this.byId("filterApvNo"));
            this._addCurrentValueAsToken(this.byId("filterBelnr"));
            this._addCurrentValueAsToken(this.byId("filterLifnr"));
            this._addCurrentValueAsToken(this.byId("filterReqId"));
        },

        _addCurrentValueAsToken: function (oMultiInput) {
            var sValue;
            var aValues;

            if (!oMultiInput) {
                return;
            }

            sValue = String(oMultiInput.getValue() || "").trim();

            if (!sValue) {
                return;
            }

            aValues = sValue.split(/[,\n;\s]+/).filter(function (sItem) {
                return !!String(sItem || "").trim();
            });

            this._addTokensToMultiInput(oMultiInput, aValues);
            oMultiInput.setValue("");
        },

        _addTokensToMultiInput: function (oMultiInput, aValues) {
            var that = this;

            if (!oMultiInput || !aValues || aValues.length === 0) {
                return;
            }

            aValues.forEach(function (sValue) {
                var sKey = String(sValue || "").trim();

                if (!sKey) {
                    return;
                }

                if (that._hasToken(oMultiInput, sKey)) {
                    return;
                }

                oMultiInput.addToken(new Token({
                    key: sKey,
                    text: sKey
                }));
            });
        },

        _hasToken: function (oMultiInput, sKey) {
            var aTokens;

            if (!oMultiInput) {
                return false;
            }

            aTokens = oMultiInput.getTokens();

            return aTokens.some(function (oToken) {
                var sTokenKey = oToken.getKey() || oToken.getText();

                return String(sTokenKey || "").trim() === sKey;
            });
        },

        _getTokenValues: function (sId) {
            var oControl = this.byId(sId);

            if (!oControl) {
                return [];
            }

            return oControl.getTokens().map(function (oToken) {
                return String(oToken.getKey() || oToken.getText() || "").trim();
            }).filter(function (sValue, iIndex, aValues) {
                return sValue && aValues.indexOf(sValue) === iIndex;
            });
        },

        _clearMultiInput: function (sId) {
            var oControl = this.byId(sId);

            if (!oControl) {
                return;
            }

            oControl.setValue("");
            oControl.removeAllTokens();
            oControl.setValueState("None");
            oControl.setValueStateText("");
        },

        _clearDateRange: function (sId) {
            var oControl = this.byId(sId);

            if (!oControl) {
                return;
            }

            oControl.setValue("");
            oControl.setDateValue(null);
            oControl.setSecondDateValue(null);
            oControl.setValueState("None");
            oControl.setValueStateText("");
        },

        _applyFilters: function (mOptions) {
            var oTable = this.byId("listTable");
            var oBinding;
            var aFilters;

            mOptions = mOptions || {};

            if (!oTable) {
                return;
            }

            oBinding = oTable.getBinding("items");

            if (!oBinding) {
                return;
            }

            aFilters = this._getCombinedFilters();

            oTable.setBusy(true);

            this.getView()
                .getModel("worklistView")
                .setProperty("/noDataText", "조회 중입니다.");

            oBinding.filter(aFilters, FilterType.Application);

            if (this._aCurrentSorters && this._aCurrentSorters.length > 0) {
                oBinding.sort(this._aCurrentSorters);
            }

            if (mOptions.updateCounts) {
                this._updateTabCounts();
            }
        },

        _getCombinedFilters: function () {
            var aStatusFilters = this._getStatusFilters(this._sQuickFilterKey);
            var aSearchFilters = this._getSearchFilters();

            return aStatusFilters.concat(aSearchFilters);
        },

        _getStatusFilters: function (sKey) {
            return [].concat(this._mStatusFilters[sKey] || []);
        },

        _getSearchFilters: function () {
            var aFilters = [];
            var aApvNo = this._getTokenValues("filterApvNo");
            var aBelnr = this._getTokenValues("filterBelnr");
            var aLifnr = this._getTokenValues("filterLifnr");
            var aReqId = this._getTokenValues("filterReqId");

            aFilters.push(new Filter("Bukrs", FilterOperator.EQ, this._sBukrs));

            this._pushMultiValueFilter(aFilters, "ApvNo", aApvNo, FilterOperator.EQ);
            this._pushMultiValueFilter(aFilters, "Belnr", aBelnr, FilterOperator.EQ);
            this._pushMultiValueFilter(aFilters, "Lifnr", aLifnr, FilterOperator.EQ);
            this._pushMultiValueFilter(aFilters, "ReqId", aReqId, FilterOperator.EQ);

            aFilters = aFilters.concat(this._getDateRangeFilters("filterDueDate", "DueDate"));

            return aFilters;
        },

        _pushMultiValueFilter: function (aFilters, sProperty, aValues, sOperator) {
            var aOrFilters;

            if (!aValues || aValues.length === 0) {
                return;
            }

            sOperator = sOperator || FilterOperator.EQ;

            aOrFilters = aValues.map(function (sValue) {
                return new Filter(sProperty, sOperator, sValue);
            });

            if (aOrFilters.length === 1) {
                aFilters.push(aOrFilters[0]);
                return;
            }

            aFilters.push(new Filter({
                filters: aOrFilters,
                and: false
            }));
        },

        _getDateRangeFilters: function (sId, sProperty) {
            var oControl = this.byId(sId);
            var aFilters = [];
            var oFrom;
            var oTo;

            if (!oControl) {
                return aFilters;
            }

            oFrom = oControl.getDateValue();
            oTo = oControl.getSecondDateValue();

            if (!oFrom && !oTo) {
                return aFilters;
            }

            if (oFrom && !oTo) {
                oTo = new Date(oFrom.getTime());
            }

            if (!oFrom && oTo) {
                oFrom = new Date(oTo.getTime());
            }

            oFrom = new Date(
                oFrom.getFullYear(),
                oFrom.getMonth(),
                oFrom.getDate(),
                0,
                0,
                0,
                0
            );

            oTo = new Date(
                oTo.getFullYear(),
                oTo.getMonth(),
                oTo.getDate(),
                23,
                59,
                59,
                999
            );

            aFilters.push(new Filter(sProperty, FilterOperator.GE, oFrom));
            aFilters.push(new Filter(sProperty, FilterOperator.LE, oTo));

            return aFilters;
        },

        _updateTabCounts: function () {
            var oViewModel = this.getView().getModel("worklistView");
            var aSearchFilters = this._getSearchFilters();

            this._readCount(aSearchFilters, function (iCount) {
                oViewModel.setProperty("/countAll", iCount);
            });

            this._readCount(
                this._getStatusFilters("REQ").concat(aSearchFilters),
                function (iCount) {
                    oViewModel.setProperty("/countReq", iCount);
                }
            );

            this._readCount(
                this._getStatusFilters("APR").concat(aSearchFilters),
                function (iCount) {
                    oViewModel.setProperty("/countApr", iCount);
                }
            );

            this._readCount(
                this._getStatusFilters("REJ").concat(aSearchFilters),
                function (iCount) {
                    oViewModel.setProperty("/countRej", iCount);
                }
            );
        },

        _readCount: function (aFilters, fnSuccess) {
            var oModel = this.getView().getModel();

            oModel.read("/PayApvListSet/$count", {
                filters: aFilters,

                success: function (oData) {
                    fnSuccess(Number(oData) || 0);
                },

                error: function () {
                    fnSuccess(0);
                }
            });
        },

        onSearch: function () {
            this.onFilterSearch();
        },

        onRefresh: function () {
            this._normalizeAllMultiInputs();

            this._applyFilters({
                updateCounts: true
            });
        },

        onOpenViewSettings: function () {
            this.byId("viewSettingsDialog").open();
        },

        onConfirmViewSettings: function (oEvent) {
            var oSortItem = oEvent.getParameter("sortItem");
            var bDescending = oEvent.getParameter("sortDescending");
            var oBinding = this.byId("listTable").getBinding("items");

            if (!oSortItem || !oBinding) {
                return;
            }

            this._aCurrentSorters = [
                new Sorter(oSortItem.getKey(), bDescending)
            ];

            oBinding.sort(this._aCurrentSorters);
        },

        onApvNoValueHelp: function () {
            this._loadApvNoHelpDialog().then(function (oDialog) {
                oDialog.open();
                oDialog.setBusy(true);
                this._loadApvNoHelpData();
            }.bind(this));
        },

        _loadApvNoHelpDialog: function () {
            if (!this._pApvNoHelpDialog) {
                this._pApvNoHelpDialog = this.loadFragment({
                    name: "code.t1.paymentaprove.view.ApvNoHelpDialog"
                }).then(function (oDialog) {
                    this._oApvNoHelpDialog = oDialog;
                    return oDialog;
                }.bind(this));
            }

            return this._pApvNoHelpDialog;
        },

        _loadApvNoHelpData: function () {
            var oModel = this.getView().getModel();
            var oHelpModel = this.getView().getModel("apvNoHelp");

            oModel.read("/PayApvListSet", {
                filters: [
                    new Filter("Bukrs", FilterOperator.EQ, this._sBukrs)
                ],
                urlParameters: {
                    "$select": "ApvNo,Belnr,Lifnr,Name1,ApvStat",
                    "$top": "5000"
                },

                success: function (oData) {
                    this._fillUniqueHelpItems(
                        oData,
                        oHelpModel,
                        "ApvNo",
                        function (oRow) {
                            return {
                                ApvNo: oRow.ApvNo || "",
                                Belnr: oRow.Belnr || "",
                                Lifnr: oRow.Lifnr || "",
                                Name1: oRow.Name1 || "",
                                ApvStat: oRow.ApvStat || ""
                            };
                        }
                    );

                    if (this._oApvNoHelpDialog) {
                        this._oApvNoHelpDialog.setBusy(false);
                    }
                }.bind(this),

                error: function () {
                    oHelpModel.setProperty("/items", []);

                    if (this._oApvNoHelpDialog) {
                        this._oApvNoHelpDialog.setBusy(false);
                    }

                    MessageBox.error("결재번호 Search Help 조회 중 오류가 발생했습니다.");
                }.bind(this)
            });
        },

        onApvNoHelpSearch: function (oEvent) {
            this._filterHelpDialogItems(oEvent, [
                "ApvNo",
                "Belnr",
                "Lifnr",
                "Name1"
            ]);
        },

        onApvNoHelpConfirm: function (oEvent) {
            var aObjects = this._getSelectedDialogObjects(oEvent, "apvNoHelp");
            var aValues = [];

            aObjects.forEach(function (oData) {
                if (oData && oData.ApvNo) {
                    aValues.push(oData.ApvNo);
                }
            });

            this._addTokensToMultiInput(this.byId("filterApvNo"), aValues);
            this._clearDialogSelections(oEvent);

            this._applyFilters({
                updateCounts: true
            });
        },

        onApvNoHelpCancel: function (oEvent) {
            this._clearDialogSelections(oEvent);
        },

        onBelnrValueHelp: function () {
            this._loadBelnrHelpDialog().then(function (oDialog) {
                oDialog.open();
                oDialog.setBusy(true);
                this._loadBelnrHelpData();
            }.bind(this));
        },

        _loadBelnrHelpDialog: function () {
            if (!this._pBelnrHelpDialog) {
                this._pBelnrHelpDialog = this.loadFragment({
                    name: "code.t1.paymentaprove.view.BelnrHelpDialog"
                }).then(function (oDialog) {
                    this._oBelnrHelpDialog = oDialog;
                    return oDialog;
                }.bind(this));
            }

            return this._pBelnrHelpDialog;
        },

        _loadBelnrHelpData: function () {
            var oModel = this.getView().getModel();
            var oHelpModel = this.getView().getModel("belnrHelp");

            oModel.read("/PayApvListSet", {
                filters: [
                    new Filter("Bukrs", FilterOperator.EQ, this._sBukrs)
                ],
                urlParameters: {
                    "$select": "Belnr,Gjahr,ApvNo,Lifnr,Name1,ApvStat",
                    "$top": "5000"
                },

                success: function (oData) {
                    this._fillUniqueHelpItems(
                        oData,
                        oHelpModel,
                        "Belnr",
                        function (oRow) {
                            return {
                                Belnr: oRow.Belnr || "",
                                Gjahr: oRow.Gjahr || "",
                                ApvNo: oRow.ApvNo || "",
                                Lifnr: oRow.Lifnr || "",
                                Name1: oRow.Name1 || "",
                                ApvStat: oRow.ApvStat || ""
                            };
                        }
                    );

                    if (this._oBelnrHelpDialog) {
                        this._oBelnrHelpDialog.setBusy(false);
                    }
                }.bind(this),

                error: function () {
                    oHelpModel.setProperty("/items", []);

                    if (this._oBelnrHelpDialog) {
                        this._oBelnrHelpDialog.setBusy(false);
                    }

                    MessageBox.error("전표번호 Search Help 조회 중 오류가 발생했습니다.");
                }.bind(this)
            });
        },

        onBelnrHelpSearch: function (oEvent) {
            this._filterHelpDialogItems(oEvent, [
                "Belnr",
                "Gjahr",
                "ApvNo",
                "Lifnr",
                "Name1"
            ]);
        },

        onBelnrHelpConfirm: function (oEvent) {
            var aObjects = this._getSelectedDialogObjects(oEvent, "belnrHelp");
            var aValues = [];

            aObjects.forEach(function (oData) {
                if (oData && oData.Belnr) {
                    aValues.push(oData.Belnr);
                }
            });

            this._addTokensToMultiInput(this.byId("filterBelnr"), aValues);
            this._clearDialogSelections(oEvent);

            this._applyFilters({
                updateCounts: true
            });
        },

        onBelnrHelpCancel: function (oEvent) {
            this._clearDialogSelections(oEvent);
        },

        onSupplierValueHelp: function () {
            this._loadSupplierHelpDialog().then(function (oDialog) {
                oDialog.open();
                oDialog.setBusy(true);
                this._loadSupplierHelpData();
            }.bind(this));
        },

        _loadSupplierHelpDialog: function () {
            if (!this._pSupplierHelpDialog) {
                this._pSupplierHelpDialog = this.loadFragment({
                    name: "code.t1.paymentaprove.view.SupplierHelpDialog"
                }).then(function (oDialog) {
                    this._oSupplierHelpDialog = oDialog;
                    return oDialog;
                }.bind(this));
            }

            return this._pSupplierHelpDialog;
        },

        _loadSupplierHelpData: function () {
            var oModel = this.getView().getModel();
            var oHelpModel = this.getView().getModel("supplierHelp");

            oModel.read("/PayApvListSet", {
                filters: [
                    new Filter("Bukrs", FilterOperator.EQ, this._sBukrs)
                ],
                urlParameters: {
                    "$select": "Lifnr,Name1",
                    "$top": "5000"
                },

                success: function (oData) {
                    this._fillUniqueHelpItems(
                        oData,
                        oHelpModel,
                        "Lifnr",
                        function (oRow) {
                            return {
                                Lifnr: oRow.Lifnr || "",
                                Name1: oRow.Name1 || ""
                            };
                        }
                    );

                    if (this._oSupplierHelpDialog) {
                        this._oSupplierHelpDialog.setBusy(false);
                    }
                }.bind(this),

                error: function () {
                    oHelpModel.setProperty("/items", []);

                    if (this._oSupplierHelpDialog) {
                        this._oSupplierHelpDialog.setBusy(false);
                    }

                    MessageBox.error("공급업체 Search Help 조회 중 오류가 발생했습니다.");
                }.bind(this)
            });
        },

        onSupplierHelpSearch: function (oEvent) {
            this._filterHelpDialogItems(oEvent, [
                "Lifnr",
                "Name1"
            ]);
        },

        onSupplierHelpConfirm: function (oEvent) {
            var aObjects = this._getSelectedDialogObjects(oEvent, "supplierHelp");
            var aValues = [];

            aObjects.forEach(function (oData) {
                if (oData && oData.Lifnr) {
                    aValues.push(oData.Lifnr);
                }
            });

            this._addTokensToMultiInput(this.byId("filterLifnr"), aValues);
            this._clearDialogSelections(oEvent);

            this._applyFilters({
                updateCounts: true
            });
        },

        onSupplierHelpCancel: function (oEvent) {
            this._clearDialogSelections(oEvent);
        },

        onRequesterValueHelp: function () {
            this._loadRequesterHelpDialog().then(function (oDialog) {
                oDialog.open();
                oDialog.setBusy(true);
                this._loadRequesterHelpData();
            }.bind(this));
        },

        _loadRequesterHelpDialog: function () {
            if (!this._pRequesterHelpDialog) {
                this._pRequesterHelpDialog = this.loadFragment({
                    name: "code.t1.paymentaprove.view.RequesterHelpDialog"
                }).then(function (oDialog) {
                    this._oRequesterHelpDialog = oDialog;
                    return oDialog;
                }.bind(this));
            }

            return this._pRequesterHelpDialog;
        },

        _loadRequesterHelpData: function () {
            var oModel = this.getView().getModel();
            var oHelpModel = this.getView().getModel("requesterHelp");

            oModel.read("/PayApvListSet", {
                filters: [
                    new Filter("Bukrs", FilterOperator.EQ, this._sBukrs)
                ],
                urlParameters: {
                    "$select": "ReqId",
                    "$top": "5000"
                },

                success: function (oData) {
                    this._fillUniqueHelpItems(
                        oData,
                        oHelpModel,
                        "ReqId",
                        function (oRow) {
                            return {
                                ReqId: oRow.ReqId || ""
                            };
                        }
                    );

                    if (this._oRequesterHelpDialog) {
                        this._oRequesterHelpDialog.setBusy(false);
                    }
                }.bind(this),

                error: function () {
                    oHelpModel.setProperty("/items", []);

                    if (this._oRequesterHelpDialog) {
                        this._oRequesterHelpDialog.setBusy(false);
                    }

                    MessageBox.error("상신자 Search Help 조회 중 오류가 발생했습니다.");
                }.bind(this)
            });
        },

        onRequesterHelpSearch: function (oEvent) {
            this._filterHelpDialogItems(oEvent, [
                "ReqId"
            ]);
        },

        onRequesterHelpConfirm: function (oEvent) {
            var aObjects = this._getSelectedDialogObjects(oEvent, "requesterHelp");
            var aValues = [];

            aObjects.forEach(function (oData) {
                if (oData && oData.ReqId) {
                    aValues.push(oData.ReqId);
                }
            });

            this._addTokensToMultiInput(this.byId("filterReqId"), aValues);
            this._clearDialogSelections(oEvent);

            this._applyFilters({
                updateCounts: true
            });
        },

        onRequesterHelpCancel: function (oEvent) {
            this._clearDialogSelections(oEvent);
        },

        _fillUniqueHelpItems: function (oData, oHelpModel, sKeyField, fnMap) {
            var aRows = oData && oData.results ? oData.results : [];
            var mCheck = {};
            var aItems = [];

            aRows.forEach(function (oRow) {
                var sKey = String(oRow[sKeyField] || "").trim();

                if (!sKey || mCheck[sKey]) {
                    return;
                }

                mCheck[sKey] = true;
                aItems.push(fnMap(oRow));
            });

            aItems.sort(function (a, b) {
                return String(a[sKeyField] || "").localeCompare(String(b[sKeyField] || ""));
            });

            oHelpModel.setProperty("/items", aItems);
        },

        _filterHelpDialogItems: function (oEvent, aProperties) {
            var sValue = oEvent.getParameter("value") || "";
            var oBinding = oEvent.getSource().getBinding("items");
            var aFilters;

            if (!oBinding) {
                return;
            }

            if (!sValue) {
                oBinding.filter([]);
                return;
            }

            aFilters = aProperties.map(function (sProperty) {
                return new Filter(sProperty, FilterOperator.Contains, sValue);
            });

            oBinding.filter([
                new Filter({
                    filters: aFilters,
                    and: false
                })
            ]);
        },

        _getSelectedDialogObjects: function (oEvent, sModelName) {
            var aObjects = [];
            var aSelectedItems = oEvent.getParameter("selectedItems") || [];
            var oSelectedItem = oEvent.getParameter("selectedItem");
            var aSelectedContexts = oEvent.getParameter("selectedContexts") || [];

            aSelectedItems.forEach(function (oItem) {
                var oContext = oItem.getBindingContext(sModelName);
                var oData = oContext && oContext.getObject();

                if (oData) {
                    aObjects.push(oData);
                }
            });

            if (aObjects.length > 0) {
                return aObjects;
            }

            if (oSelectedItem) {
                var oSingleContext = oSelectedItem.getBindingContext(sModelName);
                var oSingleData = oSingleContext && oSingleContext.getObject();

                if (oSingleData) {
                    aObjects.push(oSingleData);
                    return aObjects;
                }
            }

            aSelectedContexts.forEach(function (oContext) {
                var oData = oContext && oContext.getObject();

                if (oData) {
                    aObjects.push(oData);
                }
            });

            return aObjects;
        },

        _clearDialogSelections: function (oEvent) {
            var oDialog = oEvent && oEvent.getSource();

            if (!oDialog) {
                return;
            }

            if (oDialog.clearSelection) {
                oDialog.clearSelection();
                return;
            }

            if (oDialog.removeSelections) {
                oDialog.removeSelections(true);
            }
        },

        onItemPress: function (oEvent) {
            var oItem = oEvent.getParameter("listItem");
            var oContext;
            var oData;

            if (!oItem) {
                return;
            }

            oContext = oItem.getBindingContext();

            if (!oContext) {
                return;
            }

            oData = oContext.getObject();

            this._oRouter.navTo("RouteDetail", {
                ApvNo: encodeURIComponent(oData.ApvNo),
                Bukrs: encodeURIComponent(oData.Bukrs),
                Belnr: encodeURIComponent(oData.Belnr),
                Gjahr: encodeURIComponent(oData.Gjahr),
                Buzei: encodeURIComponent(oData.Buzei)
            });
        }
    });
});